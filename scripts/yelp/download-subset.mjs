import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULTS = {
  businessLines: Number(process.env.YELP_BUSINESS_LINES ?? "5000"),
  userLines: Number(process.env.YELP_USER_LINES ?? "5000"),
  reviewLines: Number(process.env.YELP_REVIEW_LINES ?? "20000"),
  outDir: process.env.YELP_RAW_DIR
    ? path.resolve(process.env.YELP_RAW_DIR)
    : path.resolve(__dirname, "..", "..", "data", "yelp", "raw"),
};

const SOURCES = {
  business:
    "https://raw.githubusercontent.com/knowitall/yelp-dataset-challenge/master/data/yelp_phoenix_academic_dataset/yelp_academic_dataset_business.json",
  user: "https://raw.githubusercontent.com/knowitall/yelp-dataset-challenge/master/data/yelp_phoenix_academic_dataset/yelp_academic_dataset_user.json",
  review:
    "https://raw.githubusercontent.com/knowitall/yelp-dataset-challenge/master/data/yelp_phoenix_academic_dataset/yelp_academic_dataset_review.json",
};

function isPositiveInt(n) {
  return Number.isFinite(n) && n > 0;
}

function downloadFirstLinesToFile(url, outFile, maxLines) {
  if (!isPositiveInt(maxLines)) {
    throw new Error(`Invalid maxLines: ${maxLines}`);
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outFile, { encoding: "utf8" });
    let linesWritten = 0;
    let buffer = "";
    let settled = false;

    const settle = (fn) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const requestOnce = (currentUrl, redirectsLeft, retriesLeft) => {
      const req = https.get(
        currentUrl,
        {
          headers: {
            "User-Agent": "ecoscrap-hackathon",
            "Accept-Encoding": "identity",
          },
        },
        (res) => {
          if (
            res.statusCode &&
            [301, 302, 303, 307, 308].includes(res.statusCode) &&
            res.headers.location &&
            redirectsLeft > 0
          ) {
            const nextUrl = new URL(
              res.headers.location,
              currentUrl,
            ).toString();
            res.resume();
            req.destroy();
            requestOnce(nextUrl, redirectsLeft - 1, retriesLeft);
            return;
          }

          if (res.statusCode && res.statusCode >= 400) {
            settle(() =>
              reject(new Error(`HTTP ${res.statusCode} for ${currentUrl}`)),
            );
            res.resume();
            return;
          }

          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            buffer += chunk;
            let idx = buffer.indexOf("\n");
            while (idx !== -1) {
              const line = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 1);
              file.write(line + "\n");
              linesWritten += 1;
              if (linesWritten >= maxLines) {
                res.destroy();
                req.destroy();
                file.end(() => settle(() => resolve(linesWritten)));
                return;
              }
              idx = buffer.indexOf("\n");
            }
          });

          res.on("end", () => {
            if (buffer.trim().length > 0 && linesWritten < maxLines) {
              file.write(buffer.trimEnd() + "\n");
              linesWritten += 1;
            }
            file.end(() => settle(() => resolve(linesWritten)));
          });

          res.on("error", (err) => {
            if (linesWritten > 0) {
              file.end(() => settle(() => resolve(linesWritten)));
              return;
            }
            if (retriesLeft > 0) {
              setTimeout(
                () => requestOnce(currentUrl, redirectsLeft, retriesLeft - 1),
                750,
              );
              return;
            }
            file.destroy();
            settle(() => reject(err));
          });
        },
      );

      req.on("error", (err) => {
        if (linesWritten > 0) {
          file.end(() => settle(() => resolve(linesWritten)));
          return;
        }
        if (retriesLeft > 0) {
          setTimeout(
            () => requestOnce(currentUrl, redirectsLeft, retriesLeft - 1),
            750,
          );
          return;
        }
        file.destroy();
        settle(() => reject(err));
      });

      req.setTimeout(30_000, () => {
        req.destroy(new Error("Request timeout"));
      });
    };

    requestOnce(url, 5, 3);
  });
}

async function main() {
  const { outDir, businessLines, userLines, reviewLines } = DEFAULTS;
  await mkdir(outDir, { recursive: true });

  const targets = [
    {
      key: "business",
      url: SOURCES.business,
      out: path.join(outDir, "business.jsonl"),
      lines: businessLines,
    },
    {
      key: "user",
      url: SOURCES.user,
      out: path.join(outDir, "user.jsonl"),
      lines: userLines,
    },
    {
      key: "review",
      url: SOURCES.review,
      out: path.join(outDir, "review.jsonl"),
      lines: reviewLines,
    },
  ];

  for (const t of targets) {
    process.stdout.write(
      `Downloading ${t.key} (${t.lines.toLocaleString()} lines)...\n`,
    );
    const wrote = await downloadFirstLinesToFile(t.url, t.out, t.lines);
    process.stdout.write(`Saved ${wrote.toLocaleString()} lines → ${t.out}\n`);
  }

  process.stdout.write("\nDone.\n");
  process.stdout.write(
    "Next: run `pnpm -s yelp:build` to build a small processed index.\n",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
