import { NextResponse } from "next/server"
import { z } from "zod"
import { getYelpMiniIndex } from "@/lib/yelp-mini"

const querySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 25))
    .pipe(z.number().int().min(1).max(200)),
})

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = querySchema.safeParse({ limit: url.searchParams.get("limit") ?? undefined })
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: parsed.error.issues },
      { status: 400 },
    )
  }

  try {
    const idx = await getYelpMiniIndex()
    const limit = parsed.data.limit
    return NextResponse.json(
      {
        sampleUserIds: idx.viableUserIds.slice(0, limit),
        sampleBusinessIds: idx.viableBusinessIds.slice(0, limit),
      },
      { status: 200 },
    )
  } catch {
    return NextResponse.json(
      {
        error:
          "Yelp mini index not found. Run `pnpm -s yelp:download` then `pnpm -s yelp:build`.",
      },
      { status: 404 },
    )
  }
}

