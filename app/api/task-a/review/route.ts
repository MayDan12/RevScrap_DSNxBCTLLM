import { NextResponse } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { buildItemFromBusiness, buildPersonaFromUser } from "@/lib/yelp-mini";

const personaSchema = z.object({
  id: z.string().min(1).optional(),
  handle: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  personaText: z.string().min(1).optional(),
  pastReviews: z
    .array(
      z.object({
        rating: z.number().int().min(1).max(5),
        text: z.string().min(1),
        itemId: z.string().min(1).optional(),
        itemTitle: z.string().min(1).optional(),
      }),
    )
    .optional(),
});

const itemSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const taskARequestSchema = z.object({
  persona: personaSchema,
  item: itemSchema,
  context: z
    .object({
      scenario: z.string().min(1).optional(),
      locale: z.string().min(1).optional(),
    })
    .optional(),
});

const taskAYelpRequestSchema = z.object({
  mode: z.literal("yelp"),
  userId: z.string().min(1),
  businessId: z.string().min(1),
  context: z
    .object({
      scenario: z.string().min(1).optional(),
      locale: z.string().min(1).optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const yelpParsed = taskAYelpRequestSchema.safeParse(body);
  let directData: z.infer<typeof taskARequestSchema> | null = null;
  if (!yelpParsed.success) {
    const directParsed = taskARequestSchema.safeParse(body);
    if (!directParsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", issues: directParsed.error.issues },
        { status: 400 },
      );
    }
    directData = directParsed.data;
  }

  try {
    const payload = yelpParsed.success
      ? await (async () => {
          const persona = await buildPersonaFromUser(yelpParsed.data.userId);
          const item = await buildItemFromBusiness(yelpParsed.data.businessId);
          if (!item) {
            return null;
          }
          return {
            persona: {
              personaText: persona.personaText,
              pastReviews: persona.pastReviews,
            },
            item,
            context: yelpParsed.data.context,
          };
        })()
      : directData;

    if (!payload) {
      return NextResponse.json(
        { error: "Unknown userId/businessId for Yelp subset" },
        { status: 404 },
      );
    }

    const result = await generateObject({
      model: google("gemini-2.5-flash"),
      system: [
        "You are an LLM agent that simulates a user's review behavior on an online review platform.",
        "Given a user persona (and optionally their past reviews) plus a target item, you must generate:",
        "(1) a realistic star rating from 1 to 5 and (2) a written review in the user's voice.",
        "Prioritize behavioral fidelity: match the user's typical tone, level of detail, and rating tendencies.",
        "If locale is Nigeria or the persona suggests Nigerian context, write naturally like a Nigerian reviewer without stereotypes.",
        "Do not invent concrete facts not implied by the inputs. If needed, stay general.",
      ].join(" "),
      schema: z.object({
        rating: z.number().int().min(1).max(5),
        reviewText: z.string().min(20),
      }),
      messages: [
        {
          role: "user",
          content: JSON.stringify(payload),
        },
      ],
    });

    return NextResponse.json(
      {
        rating: result.object.rating,
        reviewText: result.object.reviewText,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Failed to generate review. Please ensure your AI provider/API key is configured.",
      },
      { status: 500 },
    );
  }
}
