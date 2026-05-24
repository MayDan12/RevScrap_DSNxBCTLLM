import { readFile } from "node:fs/promises"
import path from "node:path"

export type YelpMiniReview = {
  userId: string
  businessId: string
  stars: number
  text: string
  date: string
}

export type YelpMiniBusiness = {
  id: string
  name: string
  city: string
  state: string
  categories: string[]
  stars: number
  reviewCount: number
}

export type YelpMiniUser = {
  id: string
  name: string
  reviewCount: number
  averageStars: number
}

type YelpMiniIndex = {
  meta: {
    source: string
    builtAt: string
    rawDir: string
    limits: {
      maxPastReviewsPerUser: number
      maxReviewsPerBusiness: number
    }
  }
  users: Record<string, YelpMiniUser>
  businesses: Record<string, YelpMiniBusiness>
  viableUserIds: string[]
  viableBusinessIds: string[]
  reviewsByUser: Record<string, YelpMiniReview[]>
  reviewsByBusiness: Record<string, YelpMiniReview[]>
  userCategoryStats: Record<string, Record<string, number>>
}

let cachedIndex: YelpMiniIndex | null = null
let cachedIndexPromise: Promise<YelpMiniIndex> | null = null

function getIndexPath() {
  const envPath = process.env.YELP_MINI_INDEX_PATH
  if (envPath) return envPath
  return path.join(process.cwd(), "data", "yelp", "processed", "index.json")
}

async function loadIndexFromDisk(): Promise<YelpMiniIndex> {
  const filePath = getIndexPath()
  const raw = await readFile(filePath, "utf8")
  return JSON.parse(raw) as YelpMiniIndex
}

export async function getYelpMiniIndex(): Promise<YelpMiniIndex> {
  if (cachedIndex) return cachedIndex
  if (!cachedIndexPromise) {
    cachedIndexPromise = loadIndexFromDisk().then((idx) => {
      cachedIndex = idx
      return idx
    })
  }
  return cachedIndexPromise
}

export async function getYelpMiniSample(limit = 25) {
  const idx = await getYelpMiniIndex()
  return {
    userIds: idx.viableUserIds.slice(0, limit),
    businessIds: idx.viableBusinessIds.slice(0, limit),
  }
}

export function getTopCategories(
  stats: Record<string, number> | undefined,
  limit = 8,
): string[] {
  if (!stats) return []
  return Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k)
}

export async function buildPersonaFromUser(userId: string) {
  const idx = await getYelpMiniIndex()
  const user = idx.users[userId]
  const reviews = idx.reviewsByUser[userId] ?? []
  const topCats = getTopCategories(idx.userCategoryStats[userId], 8)

  const personaTextParts = [
    `User name: ${user?.name ?? "Unknown"}.`,
    `Average stars: ${Number.isFinite(user?.averageStars) ? user.averageStars.toFixed(2) : "unknown"}.`,
    `Review count: ${user?.reviewCount ?? reviews.length}.`,
    topCats.length > 0 ? `Frequently reviewed categories: ${topCats.join(", ")}.` : "",
  ].filter(Boolean)

  const pastReviews = reviews.slice(0, 20).map((r) => {
    const biz = idx.businesses[r.businessId]
    return {
      rating: r.stars,
      text: r.text,
      itemId: r.businessId,
      itemTitle: biz?.name ?? r.businessId,
    }
  })

  return {
    personaText: personaTextParts.join(" "),
    pastReviews,
  }
}

export async function buildItemFromBusiness(businessId: string) {
  const idx = await getYelpMiniIndex()
  const b = idx.businesses[businessId]
  if (!b) return null

  const descriptionParts = [
    b.categories.length > 0 ? `Categories: ${b.categories.join(", ")}.` : "",
    b.city || b.state ? `Location: ${[b.city, b.state].filter(Boolean).join(", ")}.` : "",
    Number.isFinite(b.stars) && b.stars > 0 ? `Overall stars: ${b.stars.toFixed(2)}.` : "",
    Number.isFinite(b.reviewCount) && b.reviewCount > 0 ? `Review count: ${b.reviewCount}.` : "",
  ].filter(Boolean)

  return {
    title: b.name,
    description: descriptionParts.join(" "),
    metadata: {
      businessId: b.id,
      city: b.city,
      state: b.state,
      categories: b.categories,
    },
  }
}

export async function buildCandidatesForUser(userId: string, limit = 200) {
  const idx = await getYelpMiniIndex()
  const reviewed = new Set((idx.reviewsByUser[userId] ?? []).map((r) => r.businessId))

  const topCats = getTopCategories(idx.userCategoryStats[userId], 10)
  const candidates: YelpMiniBusiness[] = []
  const seen = new Set<string>()

  const pushBusiness = (b: YelpMiniBusiness | undefined) => {
    if (!b) return
    if (reviewed.has(b.id)) return
    if (seen.has(b.id)) return
    seen.add(b.id)
    candidates.push(b)
  }

  if (topCats.length > 0) {
    for (const id of idx.viableBusinessIds) {
      const b = idx.businesses[id]
      if (!b) continue
      if (b.categories?.some((c) => topCats.includes(c))) {
        pushBusiness(b)
      }
      if (candidates.length >= limit) break
    }
  }

  if (candidates.length < limit) {
    for (const id of idx.viableBusinessIds) {
      pushBusiness(idx.businesses[id])
      if (candidates.length >= limit) break
    }
  }

  return candidates.slice(0, limit)
}

