import fs from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const INDEX_PATH =
  process.env.YELP_MINI_INDEX_PATH ??
  path.join(process.cwd(), "data", "yelp", "processed", "index.json")

const OUT_PATH =
  process.env.YELP_EVAL_OUT_PATH ??
  path.join(process.cwd(), "data", "yelp", "processed", "eval-report.json")

const BASE_URL = process.env.YELP_EVAL_BASE_URL ?? "http://localhost:3000"
const MODE = process.env.YELP_EVAL_MODE ?? "baseline" // baseline | llm | both
const USER_LIMIT = Number(process.env.YELP_EVAL_USERS ?? "25")
const K = Number(process.env.YELP_EVAL_K ?? "10")

function clampInt(n, min, max) {
  const x = Math.round(Number(n))
  if (!Number.isFinite(x)) return min
  return Math.max(min, Math.min(max, x))
}

function safeDiv(a, b) {
  if (b === 0) return 0
  return a / b
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

function rouge1F1(pred, ref) {
  const p = tokenize(pred)
  const r = tokenize(ref)
  if (p.length === 0 || r.length === 0) return 0
  const counts = new Map()
  for (const t of r) counts.set(t, (counts.get(t) ?? 0) + 1)
  let overlap = 0
  for (const t of p) {
    const c = counts.get(t) ?? 0
    if (c > 0) {
      overlap += 1
      counts.set(t, c - 1)
    }
  }
  const precision = safeDiv(overlap, p.length)
  const recall = safeDiv(overlap, r.length)
  if (precision + recall === 0) return 0
  return (2 * precision * recall) / (precision + recall)
}

function lcsLength(a, b) {
  const n = a.length
  const m = b.length
  if (n === 0 || m === 0) return 0
  const dp = Array.from({ length: m + 1 }, () => 0)
  for (let i = 1; i <= n; i++) {
    let prev = 0
    for (let j = 1; j <= m; j++) {
      const temp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1])
      prev = temp
    }
  }
  return dp[m]
}

function rougeLF1(pred, ref) {
  const p = tokenize(pred)
  const r = tokenize(ref)
  if (p.length === 0 || r.length === 0) return 0
  const lcs = lcsLength(p, r)
  const precision = safeDiv(lcs, p.length)
  const recall = safeDiv(lcs, r.length)
  if (precision + recall === 0) return 0
  return (2 * precision * recall) / (precision + recall)
}

function rmse(pairs) {
  if (pairs.length === 0) return 0
  const mse = pairs.reduce((acc, [pred, truth]) => acc + (pred - truth) ** 2, 0) / pairs.length
  return Math.sqrt(mse)
}

function hitRateAtK(ranks, k) {
  if (ranks.length === 0) return 0
  const hits = ranks.filter((rank) => rank > 0 && rank <= k).length
  return hits / ranks.length
}

function ndcgAtK(ranks, k) {
  if (ranks.length === 0) return 0
  let sum = 0
  for (const rank of ranks) {
    if (rank > 0 && rank <= k) {
      sum += 1 / Math.log2(rank + 1)
    }
  }
  const idcg = 1 / Math.log2(1 + 1)
  return sum / (ranks.length * idcg)
}

function getTopCategories(stats, limit = 10) {
  if (!stats) return []
  return Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k)
}

function sortReviewsForHoldout(reviews) {
  return [...reviews].sort((a, b) => {
    const da = Date.parse(a.date || "")
    const db = Date.parse(b.date || "")
    if (Number.isFinite(da) && Number.isFinite(db) && da !== db) return da - db
    return 0
  })
}

function buildTaskASplit(index, userId) {
  const reviews = index.reviewsByUser[userId] ?? []
  if (reviews.length < 4) return null
  const sorted = sortReviewsForHoldout(reviews)
  const test = sorted[sorted.length - 1]
  const train = sorted.slice(0, -1)
  return { train, test }
}

function baselinePredictRating(trainReviews) {
  const mean = trainReviews.reduce((acc, r) => acc + r.stars, 0) / trainReviews.length
  return clampInt(mean, 1, 5)
}

function baselineRankBusinesses(index, userId, holdoutBusinessId, k) {
  const reviewed = new Set((index.reviewsByUser[userId] ?? []).map((r) => r.businessId))
  reviewed.delete(holdoutBusinessId)

  const topCats = new Set(getTopCategories(index.userCategoryStats[userId], 12))
  const scored = []
  for (const id of index.viableBusinessIds) {
    if (reviewed.has(id)) continue
    const b = index.businesses[id]
    if (!b) continue
    const overlap = (b.categories ?? []).reduce(
      (acc, c) => acc + (topCats.has(c) ? 1 : 0),
      0,
    )
    const popularity = Number.isFinite(b.reviewCount) ? b.reviewCount : 0
    const avgStars = Number.isFinite(b.stars) ? b.stars : 0
    const score = overlap * 10 + avgStars + popularity * 0.001
    scored.push({ id, score })
  }
  scored.sort((a, b) => b.score - a.score)
  const rankedIds = scored.slice(0, k).map((x) => x.id)
  const rank = rankedIds.indexOf(holdoutBusinessId)
  return { rankedIds, rank: rank === -1 ? 0 : rank + 1 }
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, json }
}

async function evalBaseline(index, userIds) {
  const ratingPairs = []
  const ranks = []

  for (const userId of userIds) {
    const split = buildTaskASplit(index, userId)
    if (!split) continue
    const pred = baselinePredictRating(split.train)
    ratingPairs.push([pred, split.test.stars])
    const r = baselineRankBusinesses(index, userId, split.test.businessId, K)
    ranks.push(r.rank)
  }

  return {
    usersEvaluated: ratingPairs.length,
    taskA: { rmse: rmse(ratingPairs) },
    taskB: {
      k: K,
      hitRate: hitRateAtK(ranks, K),
      ndcg: ndcgAtK(ranks, K),
    },
  }
}

async function evalLlm(index, userIds) {
  const ratingPairs = []
  const rouge1s = []
  const rougeLs = []
  const ranks = []
  const errors = []

  for (const userId of userIds) {
    const split = buildTaskASplit(index, userId)
    if (!split) continue

    const taskARes = await postJson(`${BASE_URL}/api/task-a/review`, {
      mode: "yelp",
      userId,
      businessId: split.test.businessId,
      context: { locale: "Nigeria" },
    })
    if (!taskARes.ok) {
      errors.push({ userId, step: "taskA", status: taskARes.status, body: taskARes.json })
      continue
    }
    const predRating = clampInt(taskARes.json?.rating, 1, 5)
    const predText = String(taskARes.json?.reviewText ?? "")
    ratingPairs.push([predRating, split.test.stars])
    rouge1s.push(rouge1F1(predText, split.test.text))
    rougeLs.push(rougeLF1(predText, split.test.text))

    const taskBRes = await postJson(`${BASE_URL}/api/task-b/recommend`, {
      mode: "yelp",
      userId,
      k: K,
    })
    if (!taskBRes.ok) {
      errors.push({ userId, step: "taskB", status: taskBRes.status, body: taskBRes.json })
      continue
    }
    const recIds = Array.isArray(taskBRes.json?.recommendations)
      ? taskBRes.json.recommendations.map((r) => r.itemId)
      : []
    const rank = recIds.indexOf(split.test.businessId)
    ranks.push(rank === -1 ? 0 : rank + 1)
  }

  const rouge1 = rouge1s.length ? rouge1s.reduce((a, b) => a + b, 0) / rouge1s.length : 0
  const rougeL = rougeLs.length ? rougeLs.reduce((a, b) => a + b, 0) / rougeLs.length : 0

  return {
    usersEvaluated: ratingPairs.length,
    taskA: { rmse: rmse(ratingPairs), rouge1F1: rouge1, rougeLF1: rougeL },
    taskB: {
      k: K,
      hitRate: hitRateAtK(ranks, K),
      ndcg: ndcgAtK(ranks, K),
    },
    errors,
  }
}

async function main() {
  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error(
      `Missing Yelp mini index at ${INDEX_PATH}. Run yelp:download then yelp:build.`,
    )
  }

  const index = JSON.parse(await readFile(INDEX_PATH, "utf8"))
  const userIds = (index.viableUserIds ?? []).slice(0, USER_LIMIT)

  const report = {
    meta: {
      builtAt: new Date().toISOString(),
      indexPath: INDEX_PATH,
      baseUrl: BASE_URL,
      mode: MODE,
      userLimit: USER_LIMIT,
      k: K,
    },
    baseline: null,
    llm: null,
  }

  if (MODE === "baseline" || MODE === "both") {
    report.baseline = await evalBaseline(index, userIds)
  }
  if (MODE === "llm" || MODE === "both") {
    report.llm = await evalLlm(index, userIds)
  }

  await writeFile(OUT_PATH, JSON.stringify(report, null, 2), "utf8")
  process.stdout.write(JSON.stringify(report, null, 2) + "\n")
  process.stdout.write(`Saved → ${OUT_PATH}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

