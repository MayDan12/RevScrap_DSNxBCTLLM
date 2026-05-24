import fs from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import readline from "node:readline"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const RAW_DIR = process.env.YELP_RAW_DIR
  ? path.resolve(process.env.YELP_RAW_DIR)
  : path.resolve(__dirname, "..", "..", "data", "yelp", "raw")

const OUT_DIR = process.env.YELP_PROCESSED_DIR
  ? path.resolve(process.env.YELP_PROCESSED_DIR)
  : path.resolve(__dirname, "..", "..", "data", "yelp", "processed")

const MAX_PAST_REVIEWS_PER_USER = Number(
  process.env.YELP_MAX_PAST_REVIEWS_PER_USER ?? "40",
)
const MAX_REVIEWS_PER_BUSINESS = Number(
  process.env.YELP_MAX_REVIEWS_PER_BUSINESS ?? "40",
)
const MIN_USERS = Number(process.env.YELP_MIN_USERS ?? "50")
const MIN_BUSINESSES = Number(process.env.YELP_MIN_BUSINESSES ?? "100")

function ensureFinite(n, fallback) {
  return Number.isFinite(n) ? n : fallback
}

function parseJsonLine(line) {
  try {
    return JSON.parse(line)
  } catch {
    return null
  }
}

async function readJsonLines(filePath, onObj) {
  const stream = fs.createReadStream(filePath, { encoding: "utf8" })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const obj = parseJsonLine(trimmed)
    if (!obj) continue
    await onObj(obj)
  }
}

async function main() {
  const businessPath = path.join(RAW_DIR, "business.jsonl")
  const userPath = path.join(RAW_DIR, "user.jsonl")
  const reviewPath = path.join(RAW_DIR, "review.jsonl")

  for (const p of [businessPath, userPath, reviewPath]) {
    if (!fs.existsSync(p)) {
      throw new Error(
        `Missing raw file: ${p}. Run \`pnpm -s yelp:download\` first.`,
      )
    }
  }

  const businessesById = {}
  const businessIds = []

  await readJsonLines(businessPath, async (b) => {
    const id = String(b.business_id ?? "")
    if (!id) return
    const categories = typeof b.categories === "string" ? b.categories : ""
    const categoryList = categories
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20)
    businessesById[id] = {
      id,
      name: typeof b.name === "string" ? b.name : id,
      city: typeof b.city === "string" ? b.city : "",
      state: typeof b.state === "string" ? b.state : "",
      categories: categoryList,
      stars: ensureFinite(Number(b.stars), 0),
      reviewCount: ensureFinite(Number(b.review_count), 0),
    }
    businessIds.push(id)
  })

  const usersById = {}
  const userIds = []

  await readJsonLines(userPath, async (u) => {
    const id = String(u.user_id ?? "")
    if (!id) return
    usersById[id] = {
      id,
      name: typeof u.name === "string" ? u.name : id,
      reviewCount: ensureFinite(Number(u.review_count), 0),
      averageStars: ensureFinite(Number(u.average_stars), 0),
    }
    userIds.push(id)
  })

  const reviewsByUser = {}
  const reviewsByBusiness = {}
  const userCategoryStats = {}
  const userStarSum = {}
  const userStarCount = {}

  await readJsonLines(reviewPath, async (r) => {
    const userId = String(r.user_id ?? "")
    const businessId = String(r.business_id ?? "")
    if (!userId || !businessId) return
    if (!businessesById[businessId]) return

    const stars = ensureFinite(Number(r.stars), 0)
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) return
    const text = typeof r.text === "string" ? r.text : ""
    if (!text) return

    const entry = {
      userId,
      businessId,
      stars,
      text,
      date: typeof r.date === "string" ? r.date : "",
    }

    if (!usersById[userId]) {
      usersById[userId] = {
        id: userId,
        name: userId,
        reviewCount: 0,
        averageStars: 0,
      }
      userIds.push(userId)
    }

    userStarSum[userId] = (userStarSum[userId] ?? 0) + stars
    userStarCount[userId] = (userStarCount[userId] ?? 0) + 1
    usersById[userId].reviewCount = userStarCount[userId]
    usersById[userId].averageStars = userStarSum[userId] / userStarCount[userId]

    const userArr = (reviewsByUser[userId] ??= [])
    if (userArr.length < MAX_PAST_REVIEWS_PER_USER) {
      userArr.push(entry)
    }

    const bizArr = (reviewsByBusiness[businessId] ??= [])
    if (bizArr.length < MAX_REVIEWS_PER_BUSINESS) {
      bizArr.push(entry)
    }

    const cats = businessesById[businessId].categories ?? []
    const stats = (userCategoryStats[userId] ??= {})
    for (const c of cats) {
      stats[c] = (stats[c] ?? 0) + 1
    }
  })

  const viableUserIds = Object.keys(reviewsByUser).filter(
    (id) => reviewsByUser[id]?.length >= 3,
  )
  const viableBusinessIds = Object.keys(reviewsByBusiness).filter(
    (id) => reviewsByBusiness[id]?.length >= 3,
  )

  if (viableUserIds.length < MIN_USERS || viableBusinessIds.length < MIN_BUSINESSES) {
    const msg = [
      "Not enough viable users/businesses in the subset.",
      `users=${viableUserIds.length} businesses=${viableBusinessIds.length}`,
      "Increase YELP_*_LINES and rerun yelp:download, then yelp:build.",
    ].join(" ")
    throw new Error(msg)
  }

  await mkdir(OUT_DIR, { recursive: true })
  const outPath = path.join(OUT_DIR, "index.json")

  const index = {
    meta: {
      source: "knowitall/yelp-dataset-challenge (phoenix academic subset)",
      builtAt: new Date().toISOString(),
      rawDir: RAW_DIR,
      limits: {
        maxPastReviewsPerUser: MAX_PAST_REVIEWS_PER_USER,
        maxReviewsPerBusiness: MAX_REVIEWS_PER_BUSINESS,
      },
    },
    users: usersById,
    businesses: businessesById,
    viableUserIds,
    viableBusinessIds,
    reviewsByUser,
    reviewsByBusiness,
    userCategoryStats,
  }

  await writeFile(outPath, JSON.stringify(index), "utf8")

  const statsPath = path.join(OUT_DIR, "stats.json")
  await writeFile(
    statsPath,
    JSON.stringify(
      {
        users: Object.keys(usersById).length,
        businesses: Object.keys(businessesById).length,
        reviewsByUser: Object.keys(reviewsByUser).length,
        viableUserIds: viableUserIds.length,
        viableBusinessIds: viableBusinessIds.length,
      },
      null,
      2,
    ),
    "utf8",
  )

  const previewPath = path.join(OUT_DIR, "preview.json")
  const sampleUserId = viableUserIds[0]
  const sampleBusinessId = viableBusinessIds[0]
  await writeFile(
    previewPath,
    JSON.stringify(
      {
        sampleUserId,
        sampleBusinessId,
        sampleUser: usersById[sampleUserId],
        sampleBusiness: businessesById[sampleBusinessId],
        sampleUserReviews: reviewsByUser[sampleUserId]?.slice(0, 3) ?? [],
      },
      null,
      2,
    ),
    "utf8",
  )

  const size = Buffer.byteLength(await readFile(outPath))
  process.stdout.write(`Built index → ${outPath} (${(size / 1024).toFixed(1)} KB)\n`)
  process.stdout.write(`Stats → ${statsPath}\n`)
  process.stdout.write(`Preview → ${previewPath}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
