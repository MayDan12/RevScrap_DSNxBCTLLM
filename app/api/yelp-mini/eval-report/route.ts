import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  const filePath = path.join(
    process.cwd(),
    "data",
    "yelp",
    "processed",
    "eval-report.json",
  );

  try {
    const raw = await readFile(filePath, "utf8");
    const json = JSON.parse(raw) as unknown;
    return NextResponse.json(json, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        error:
          "Evaluation report not found. Run `pnpm -s yelp:eval` then refresh this page.",
      },
      { status: 404 },
    );
  }
}

