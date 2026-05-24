import { NextResponse } from "next/server"
import { z } from "zod"
import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { buildCandidatesForUser, buildPersonaFromUser, getTopCategories, getYelpMiniIndex } from "@/lib/yelp-mini"

const personaSchema = z.object({
  id: z.string().min(1).optional(),
  handle: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  personaText: z.string().min(1).optional(),
  likedCategories: z.array(z.string().min(1)).optional(),
  dislikedCategories: z.array(z.string().min(1)).optional(),
  pastInteractions: z
    .array(
      z.object({
        itemId: z.string().min(1),
        itemTitle: z.string().min(1).optional(),
        rating: z.number().int().min(1).max(5).optional(),
        reviewText: z.string().min(1).optional(),
      }),
    )
    .optional(),
})

const candidateItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  categories: z.array(z.string().min(1)).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const taskBRequestSchema = z.object({
  persona: personaSchema,
  candidates: z.array(candidateItemSchema).min(1).max(500),
  k: z.number().int().min(1).max(50).default(10),
})

const taskBYelpRequestSchema = z.object({
  mode: z.literal("yelp"),
  userId: z.string().min(1),
  k: z.number().int().min(1).max(50).default(10),
  candidateLimit: z.number().int().min(10).max(500).default(200),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const yelpParsed = taskBYelpRequestSchema.safeParse(body)
  let persona: z.infer<typeof personaSchema>
  let candidates: z.infer<typeof candidateItemSchema>[]
  let k: number

  if (yelpParsed.success) {
    const idx = await getYelpMiniIndex()
    const personaBuilt = await buildPersonaFromUser(yelpParsed.data.userId)
    const topCats = getTopCategories(
      idx.userCategoryStats[yelpParsed.data.userId],
      8,
    )
    const pastInteractions =
      idx.reviewsByUser[yelpParsed.data.userId]?.slice(0, 30).map((r) => {
        const b = idx.businesses[r.businessId]
        return {
          itemId: r.businessId,
          itemTitle: b?.name ?? r.businessId,
          rating: r.stars,
          reviewText: r.text,
        }
      }) ?? []

    persona = {
      id: yelpParsed.data.userId,
      personaText: personaBuilt.personaText,
      likedCategories: topCats,
      pastInteractions,
    }

    const businesses = await buildCandidatesForUser(
      yelpParsed.data.userId,
      yelpParsed.data.candidateLimit,
    )
    candidates = businesses.map((b) => ({
      id: b.id,
      title: b.name,
      description: [
        b.categories.length > 0 ? `Categories: ${b.categories.join(", ")}.` : "",
        b.city || b.state ? `Location: ${[b.city, b.state].filter(Boolean).join(", ")}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
      categories: b.categories,
      metadata: { city: b.city, state: b.state },
    }))
    k = yelpParsed.data.k
  } else {
    const parsed = taskBRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", issues: parsed.error.issues },
        { status: 400 },
      )
    }
    persona = parsed.data.persona
    candidates = parsed.data.candidates
    k = parsed.data.k
  }

  try {
    const result = await generateObject({
      model: google("gemini-2.5-flash"),
      system: [
        "You are an LLM agent for personalized recommendation.",
        "Given a user persona and a list of candidate items, you must return a ranked top-K list.",
        "Prioritize relevance to the user's preferences and context. Handle cold-start by relying on personaText and likedCategories.",
        "Do not hallucinate items not present in candidates. Output only candidate item ids.",
      ].join(" "),
      schema: z.object({
        recommendations: z
          .array(
            z.object({
              itemId: z.string().min(1),
              score: z.number().finite(),
              reason: z.string().min(1),
            }),
          )
          .min(1),
      }),
      messages: [
        {
          role: "user",
          content: JSON.stringify({ persona, candidates, k }),
        },
      ],
    })

    const allowed = new Set(candidates.map((c) => c.id))
    const deduped: Array<{ itemId: string; score: number; reason: string }> = []
    const seen = new Set<string>()
    for (const rec of result.object.recommendations) {
      if (!allowed.has(rec.itemId)) continue
      if (seen.has(rec.itemId)) continue
      seen.add(rec.itemId)
      deduped.push(rec)
      if (deduped.length >= k) break
    }

    if (deduped.length === 0) {
      return NextResponse.json(
        { error: "No valid recommendations produced" },
        { status: 502 },
      )
    }

    const candidateById = new Map(candidates.map((c) => [c.id, c]))
    const enriched = deduped.map((rec) => {
      const item = candidateById.get(rec.itemId)
      return {
        ...rec,
        title: item?.title,
        categories: item?.categories,
      }
    })

    return NextResponse.json({ recommendations: enriched }, { status: 200 })
  } catch {
    return NextResponse.json(
      {
        error:
          "Failed to generate recommendations. Please ensure your AI provider/API key is configured.",
      },
      { status: 500 },
    )
  }
}
