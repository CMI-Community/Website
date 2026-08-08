import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HTTPS_URL = /^https:\/\//i;

function text(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function integer(value, fallback = 0) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function safeImageName(value) {
  const source = text(value);
  const name = basename(source);
  if (source !== name) throw new Error(`Public image path must be a filename: ${source}`);
  if (!/^[a-zA-Z0-9._-]+\.webp$/i.test(name)) throw new Error(`Invalid public image name: ${name}`);
  return name;
}

function safeUrl(value) {
  const url = text(value);
  return HTTPS_URL.test(url) ? url : "";
}

export function sanitizePoster(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Poster record must be an object");
  }
  const id = basename(text(record.id));
  if (!id || id !== text(record.id)) throw new Error("Poster id must be a filename-like public id");

  return {
    id,
    imagePath: safeImageName(record.imagePath),
    width: integer(record.width),
    height: integer(record.height),
    title: text(record.title, "CMI 社区活动"),
    publishedAt: text(record.publishedAt),
    publishedDate: text(record.publishedDate),
    eventTime: text(record.eventTime?.value, "时间见活动原文"),
    initiator: text(record.initiator?.value, "CMI Community"),
    summary: text(record.summary),
    articleUrl: safeUrl(record.articleUrl),
    series: {
      name: text(record.series?.name, "CMI 社区活动"),
      issue: Number.isInteger(record.series?.issue) ? record.series.issue : null,
    },
    category: text(record.category, "社区活动"),
  };
}

export function sanitizeCatalog(input) {
  const rows = Array.isArray(input) ? input : input?.posters;
  if (!Array.isArray(rows)) throw new Error("Input catalog must be an array or contain posters[]");
  const posters = rows.map(sanitizePoster);
  const ids = new Set(posters.map((poster) => poster.id));
  const images = new Set(posters.map((poster) => poster.imagePath));
  if (ids.size !== posters.length) throw new Error("Duplicate poster ids found");
  if (images.size !== posters.length) throw new Error("Duplicate poster image names found");
  return { version: "poster-wall/v1", count: posters.length, posters };
}

async function runCli() {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) {
    throw new Error("Usage: node scripts/poster-catalog.mjs INPUT.json OUTPUT.json");
  }
  const source = JSON.parse(await readFile(resolve(inputPath), "utf8"));
  const catalog = sanitizeCatalog(source);
  await writeFile(resolve(outputPath), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(`Wrote ${catalog.count} public poster records to ${resolve(outputPath)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
