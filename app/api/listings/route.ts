import { NextResponse } from "next/server";
import { z } from "zod";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const listingSchema = z.object({
  category: z.enum(["recyclable", "ewaste"]),
  type: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().finite().positive(),
  quantityUnit: z.enum(["kg", "units", "bags"]),
  priceNGN: z.number().finite().nonnegative(),
  location: z.string().min(1),
  images: z.array(z.string()).max(5),
  ai: z
    .object({
      items: z.array(z.string()).optional(),
      estimatedWeightKg: z.number().optional(),
      suggestedPriceNGN: z.number().optional(),
      reasoning: z.string().optional(),
    })
    .optional(),
});

type StoredListing = z.infer<typeof listingSchema> & {
  id: string;
  createdAt: string;
  status: "active" | "pending" | "completed";
  bids: number;
  views: number;
};

const updateListingSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["active", "pending", "completed"]),
});

function getListingsFilePath() {
  return path.join(
    process.cwd(),
    ".next",
    "cache",
    "ecoscrap",
    "listings.json",
  );
}

async function readListings(): Promise<StoredListing[]> {
  const filePath = getListingsFilePath();
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredListing[];
  } catch {
    return [];
  }
}

async function writeListings(listings: StoredListing[]) {
  const filePath = getListingsFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(listings, null, 2), "utf8");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");

  const listings = await readListings();
  const filtered = listings.filter((listing) => {
    if (category && listing.category !== category) return false;
    if (type && listing.type !== type) return false;
    if (status && listing.status !== status) return false;
    if (q) {
      const query = q.toLowerCase();
      const haystack = [
        listing.title,
        listing.description,
        listing.location,
        listing.type,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return NextResponse.json({ listings: filtered });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = listingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid listing payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const listings = await readListings();
  const listing: StoredListing = {
    ...parsed.data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "active",
    bids: 0,
    views: 0,
  };

  listings.unshift(listing);
  await writeListings(listings);

  return NextResponse.json({ listing }, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = updateListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid update payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const listings = await readListings();
  const index = listings.findIndex((l) => l.id === parsed.data.id);
  if (index === -1) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const updated: StoredListing = {
    ...listings[index],
    status: parsed.data.status,
  };
  listings[index] = updated;
  await writeListings(listings);

  return NextResponse.json({ listing: updated });
}
