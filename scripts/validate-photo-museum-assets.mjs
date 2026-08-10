import { execFile as execFileCallback } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { promisify } from "node:util";
import { join, resolve } from "node:path";

const execFile = promisify(execFileCallback);
const PUBLIC_FIELDS = ["alt", "displayOrder", "fullPath", "height", "id", "thumbnailPath", "width"];

function parseDimension(output, key) {
  const match = output.match(new RegExp(`${key}:\\s*(\\d+)`));
  if (!match) throw new Error(`Unable to read ${key}`);
  return Number(match[1]);
}

async function imageDimensions(path) {
  const { stdout } = await execFile("sips", ["-g", "pixelWidth", "-g", "pixelHeight", path]);
  return {
    width: parseDimension(stdout, "pixelWidth"),
    height: parseDimension(stdout, "pixelHeight"),
  };
}

function parseOptions(args) {
  const [directoryArg, expectedVersion, expectedCountArg, thumbnailMaxArg, fullMaxArg] = args;
  if (!directoryArg || !expectedVersion || !expectedCountArg || !thumbnailMaxArg || !fullMaxArg) {
    throw new Error(
      "Usage: node scripts/validate-photo-museum-assets.mjs PUBLIC_DIR photo-museum/vN EXPECTED_COUNT THUMBNAIL_MAX FULL_MAX",
    );
  }
  return {
    directory: resolve(directoryArg),
    expectedVersion,
    expectedCount: Number(expectedCountArg),
    thumbnailMax: Number(thumbnailMaxArg),
    fullMax: Number(fullMaxArg),
  };
}

function assertCatalog(catalog, options) {
  if (catalog.version !== options.expectedVersion) throw new Error("Catalog version mismatch");
  if (catalog.count !== options.expectedCount || catalog.photos?.length !== options.expectedCount) {
    throw new Error("Catalog count mismatch");
  }
  const ids = new Set();
  const paths = new Set();
  const orders = new Set();
  for (const photo of catalog.photos) {
    const fields = Object.keys(photo).sort();
    if (JSON.stringify(fields) !== JSON.stringify(PUBLIC_FIELDS)) {
      throw new Error(`Unexpected public fields for ${photo.id}: ${fields.join(",")}`);
    }
    if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(photo.id)) throw new Error(`Unsafe id: ${photo.id}`);
    if (!/^thumbs\/[a-z0-9-]+\.webp$/.test(photo.thumbnailPath)) {
      throw new Error(`Unsafe thumbnail path: ${photo.thumbnailPath}`);
    }
    if (!/^full\/[a-z0-9-]+\.webp$/.test(photo.fullPath)) {
      throw new Error(`Unsafe full path: ${photo.fullPath}`);
    }
    if (ids.has(photo.id) || paths.has(photo.thumbnailPath) || paths.has(photo.fullPath)) {
      throw new Error(`Duplicate public identity or path: ${photo.id}`);
    }
    if (orders.has(photo.displayOrder)) throw new Error(`Duplicate display order: ${photo.displayOrder}`);
    if (!photo.alt?.trim()) throw new Error(`Missing alt: ${photo.id}`);
    ids.add(photo.id);
    paths.add(photo.thumbnailPath);
    paths.add(photo.fullPath);
    orders.add(photo.displayOrder);
  }
}

async function run() {
  const options = parseOptions(process.argv.slice(2));
  const catalogPath = join(options.directory, "catalog.json");
  if (!existsSync(catalogPath)) throw new Error("Catalog is missing");
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  assertCatalog(catalog, options);

  const results = new Array(catalog.photos.length);
  let nextIndex = 0;
  let completed = 0;
  async function worker() {
    while (nextIndex < catalog.photos.length) {
      const index = nextIndex;
      nextIndex += 1;
      const photo = catalog.photos[index];
      const thumbnailFile = join(options.directory, photo.thumbnailPath);
      const fullFile = join(options.directory, photo.fullPath);
      if (!existsSync(thumbnailFile) || !existsSync(fullFile)) throw new Error(`Missing assets for ${photo.id}`);
      const [thumbnail, full] = await Promise.all([
        imageDimensions(thumbnailFile),
        imageDimensions(fullFile),
      ]);
      if (Math.max(thumbnail.width, thumbnail.height) > options.thumbnailMax) {
        throw new Error(`Thumbnail exceeds ${options.thumbnailMax}px for ${photo.id}`);
      }
      if (Math.max(full.width, full.height) > options.fullMax) {
        throw new Error(`Full image exceeds ${options.fullMax}px for ${photo.id}`);
      }
      if (full.width !== photo.width || full.height !== photo.height) {
        throw new Error(`Catalog dimensions mismatch for ${photo.id}`);
      }
      const thumbnailRatio = thumbnail.width / thumbnail.height;
      const fullRatio = full.width / full.height;
      if (Math.abs(thumbnailRatio - fullRatio) > 0.01) {
        throw new Error(`Variant aspect ratio mismatch for ${photo.id}`);
      }
      results[index] = {
        orientation: full.width > full.height ? "landscape" : full.height > full.width ? "portrait" : "square",
        bytes: statSync(thumbnailFile).size + statSync(fullFile).size,
      };
      completed += 1;
      if (completed % 100 === 0 || completed === catalog.photos.length) {
        console.log(`Validated ${completed}/${catalog.photos.length} records`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(12, catalog.photos.length) }, worker));
  const summary = results.reduce(
    (totals, result) => {
      totals[result.orientation] += 1;
      totals.bytes += result.bytes;
      return totals;
    },
    { landscape: 0, portrait: 0, square: 0, bytes: 0 },
  );
  console.log(JSON.stringify({ version: catalog.version, count: catalog.count, ...summary }));
}

try {
  await run();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
