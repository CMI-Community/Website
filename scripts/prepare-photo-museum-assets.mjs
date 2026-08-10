import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const SUPPORTED_SOURCE = new Set([".heic", ".jpg", ".jpeg"]);

function parseDimension(output, key) {
  const match = output.match(new RegExp(`${key}:\\s*(\\d+)`));
  if (!match) throw new Error(`Unable to read ${key}`);
  return Number(match[1]);
}

function imageDimensions(path) {
  const output = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", path], {
    encoding: "utf8",
  });
  return {
    width: parseDimension(output, "pixelWidth"),
    height: parseDimension(output, "pixelHeight"),
  };
}

function assertManifest(manifest, inputDirectory) {
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error("Source manifest must be a non-empty array");
  }
  const sourceFiles = readdirSync(inputDirectory)
    .filter((file) => SUPPORTED_SOURCE.has(extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
  const listedFiles = manifest.map((item) => basename(item.source)).sort((a, b) => a.localeCompare(b));
  if (JSON.stringify(sourceFiles) !== JSON.stringify(listedFiles)) {
    throw new Error("Source manifest must list every supported image in the input directory exactly once");
  }
  const ids = new Set();
  for (const item of manifest) {
    if (basename(item.source) !== item.source) throw new Error(`Source must be a filename: ${item.source}`);
    if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(item.id)) throw new Error(`Invalid public id: ${item.id}`);
    if (!item.alt?.trim()) throw new Error(`Missing alt text for ${item.id}`);
    if (ids.has(item.id)) throw new Error(`Duplicate public id: ${item.id}`);
    ids.add(item.id);
  }
}

function renderWebp(source, output, maxDimension, quality, temporaryDirectory) {
  const stem = `${basename(output, ".webp")}-${maxDimension}`;
  const orientedSource = join(temporaryDirectory, `${stem}-with-orientation.jpg`);
  const bakedSource = join(temporaryDirectory, `${stem}-baked.jpg`);
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "95", "-Z", String(maxDimension), source, "--out", orientedSource], {
    stdio: "ignore",
  });
  execFileSync(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-y", "-i", orientedSource, "-map_metadata", "-1", "-q:v", "1", bakedSource],
    { stdio: "ignore" },
  );
  execFileSync("cwebp", ["-quiet", "-q", String(quality), "-m", "6", "-metadata", "none", bakedSource, "-o", output]);
  return imageDimensions(output);
}

function run() {
  const [inputArg, outputArg, manifestArg] = process.argv.slice(2);
  if (!inputArg || !outputArg || !manifestArg) {
    throw new Error("Usage: node scripts/prepare-photo-museum-assets.mjs INPUT_DIR OUTPUT_DIR SOURCE_MANIFEST.json");
  }

  const inputDirectory = resolve(inputArg);
  const outputDirectory = resolve(outputArg);
  const manifestPath = resolve(manifestArg);
  if (!existsSync(inputDirectory) || !existsSync(manifestPath)) throw new Error("Input directory or manifest is missing");
  if (existsSync(outputDirectory) && readdirSync(outputDirectory).length) {
    throw new Error("Output directory must be empty");
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assertManifest(manifest, inputDirectory);
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "cmi-photo-prep-"));
  mkdirSync(join(outputDirectory, "thumbs"), { recursive: true });
  mkdirSync(join(outputDirectory, "full"), { recursive: true });

  try {
    const photos = manifest
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((item) => {
        const source = join(inputDirectory, item.source);
        const thumbnailPath = `thumbs/${item.id}.webp`;
        const fullPath = `full/${item.id}.webp`;
        renderWebp(source, join(outputDirectory, thumbnailPath), 1280, 82, temporaryDirectory);
        const { width, height } = renderWebp(
          source,
          join(outputDirectory, fullPath),
          2560,
          88,
          temporaryDirectory,
        );
        return {
          id: item.id,
          thumbnailPath,
          fullPath,
          width,
          height,
          alt: item.alt.trim(),
          displayOrder: item.displayOrder,
        };
      });

    const catalog = { version: "photo-museum/v1", count: photos.length, photos };
    writeFileSync(join(outputDirectory, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
    console.log(`Prepared ${photos.length} public Photo Museum records in ${outputDirectory}`);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
