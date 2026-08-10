import { execFile as execFileCallback } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { promisify } from "node:util";
import { basename, extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const execFile = promisify(execFileCallback);
const SUPPORTED_SOURCE = new Set([".heic", ".jpg", ".jpeg", ".png", ".dng"]);

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

function integerOption(value, name, minimum = 1) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) throw new Error(`${name} must be an integer >= ${minimum}`);
  return parsed;
}

function parseOptions(args) {
  const [inputArg, outputArg, manifestArg, ...optionArgs] = args;
  if (!inputArg || !outputArg || !manifestArg) {
    throw new Error(
      "Usage: node scripts/prepare-photo-museum-assets.mjs INPUT_DIR OUTPUT_DIR SOURCE_MANIFEST.json [--version photo-museum/vN] [--thumbnail-size 720] [--full-size 2560] [--thumbnail-quality 76] [--full-quality 84] [--concurrency 4] [--allow-subset] [--base-public-dir DIR]",
    );
  }

  const options = {
    inputDirectory: resolve(inputArg),
    outputDirectory: resolve(outputArg),
    manifestPath: resolve(manifestArg),
    version: "photo-museum/v1",
    thumbnailSize: 1280,
    fullSize: 2560,
    thumbnailQuality: 82,
    fullQuality: 88,
    concurrency: 4,
    allowSubset: false,
    basePublicDirectory: null,
  };

  for (let index = 0; index < optionArgs.length; index += 1) {
    const option = optionArgs[index];
    if (option === "--allow-subset") {
      options.allowSubset = true;
      continue;
    }
    const value = optionArgs[index + 1];
    if (!value) throw new Error(`Missing value for ${option}`);
    index += 1;
    if (option === "--version") options.version = value;
    else if (option === "--thumbnail-size") options.thumbnailSize = integerOption(value, option);
    else if (option === "--full-size") options.fullSize = integerOption(value, option);
    else if (option === "--thumbnail-quality") options.thumbnailQuality = integerOption(value, option, 0);
    else if (option === "--full-quality") options.fullQuality = integerOption(value, option, 0);
    else if (option === "--concurrency") options.concurrency = integerOption(value, option);
    else if (option === "--base-public-dir") options.basePublicDirectory = resolve(value);
    else throw new Error(`Unknown option: ${option}`);
  }

  if (!/^photo-museum\/v[1-9][0-9]*$/.test(options.version)) {
    throw new Error("--version must use photo-museum/vN");
  }
  if (options.thumbnailQuality > 100 || options.fullQuality > 100) {
    throw new Error("WebP quality must be between 0 and 100");
  }
  if (options.thumbnailSize > options.fullSize) {
    throw new Error("Thumbnail size cannot exceed full size");
  }
  return options;
}

function assertManifest(manifest, inputDirectory, allowSubset) {
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error("Source manifest must be a non-empty array");
  }
  const sourceFiles = readdirSync(inputDirectory)
    .filter((file) => SUPPORTED_SOURCE.has(extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
  const listedFiles = manifest.map((item) => basename(item.source)).sort((a, b) => a.localeCompare(b));
  if (!allowSubset && JSON.stringify(sourceFiles) !== JSON.stringify(listedFiles)) {
    throw new Error("Source manifest must list every supported image in the input directory exactly once");
  }
  const sourceSet = new Set(sourceFiles);
  const ids = new Set();
  const names = new Set();
  const orders = new Set();
  for (const item of manifest) {
    if (basename(item.source) !== item.source) throw new Error(`Source must be a filename: ${item.source}`);
    if (!sourceSet.has(item.source)) throw new Error(`Manifest source is missing: ${item.source}`);
    if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(item.id)) throw new Error(`Invalid public id: ${item.id}`);
    if (!item.alt?.trim()) throw new Error(`Missing alt text for ${item.id}`);
    if (!Number.isInteger(item.displayOrder) || item.displayOrder < 1) {
      throw new Error(`Invalid display order for ${item.id}`);
    }
    if (ids.has(item.id)) throw new Error(`Duplicate public id: ${item.id}`);
    if (names.has(item.source)) throw new Error(`Duplicate source file: ${item.source}`);
    if (orders.has(item.displayOrder)) throw new Error(`Duplicate display order: ${item.displayOrder}`);
    ids.add(item.id);
    names.add(item.source);
    orders.add(item.displayOrder);
  }
}

function orientationLabel(width, height) {
  if (width / height > 1.08) return "横向画面";
  if (height / width > 1.08) return "纵向画面";
  return "方形画面";
}

async function renderVariants(item, options, temporaryDirectory) {
  const source = join(options.inputDirectory, item.source);
  const itemTemporaryDirectory = join(temporaryDirectory, item.id);
  mkdirSync(itemTemporaryDirectory, { recursive: true });
  const orientedSource = join(itemTemporaryDirectory, "with-orientation.jpg");
  const bakedSource = join(itemTemporaryDirectory, "baked.jpg");
  const thumbnailPath = `thumbs/${item.id}.webp`;
  const fullPath = `full/${item.id}.webp`;
  const thumbnailOutput = join(options.outputDirectory, thumbnailPath);
  const fullOutput = join(options.outputDirectory, fullPath);

  await execFile("sips", [
    "-s", "format", "jpeg",
    "-s", "formatOptions", "95",
    "-Z", String(options.fullSize),
    source,
    "--out", orientedSource,
  ]);
  await execFile("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", orientedSource,
    "-map_metadata", "-1",
    "-q:v", "1",
    bakedSource,
  ]);
  const { width, height } = await imageDimensions(bakedSource);
  const thumbnailScale = Math.min(1, options.thumbnailSize / Math.max(width, height));
  const thumbnailWidth = Math.max(1, Math.round(width * thumbnailScale));
  const thumbnailHeight = Math.max(1, Math.round(height * thumbnailScale));

  await Promise.all([
    execFile("cwebp", [
      "-quiet", "-q", String(options.thumbnailQuality), "-m", "6", "-metadata", "none",
      "-resize", String(thumbnailWidth), String(thumbnailHeight), bakedSource, "-o", thumbnailOutput,
    ]),
    execFile("cwebp", [
      "-quiet", "-q", String(options.fullQuality), "-m", "6", "-metadata", "none",
      bakedSource, "-o", fullOutput,
    ]),
  ]);

  return {
    id: item.id,
    thumbnailPath,
    fullPath,
    width,
    height,
    alt: `${item.alt.trim()}，${orientationLabel(width, height)}`,
    displayOrder: item.displayOrder,
  };
}

async function copyBaseCatalog(basePublicDirectory, outputDirectory, options) {
  if (!basePublicDirectory) return [];
  const catalogPath = join(basePublicDirectory, "catalog.json");
  if (!existsSync(catalogPath)) throw new Error("Base public catalog is missing");
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  if (!Array.isArray(catalog.photos)) throw new Error("Base public catalog has no photos");

  for (const photo of catalog.photos) {
    const thumbnailScale = Math.min(1, options.thumbnailSize / Math.max(photo.width, photo.height));
    const thumbnailWidth = Math.max(1, Math.round(photo.width * thumbnailScale));
    const thumbnailHeight = Math.max(1, Math.round(photo.height * thumbnailScale));
    await execFile("cwebp", [
      "-quiet", "-q", String(options.thumbnailQuality), "-m", "6", "-metadata", "none",
      "-resize", String(thumbnailWidth), String(thumbnailHeight),
      join(basePublicDirectory, photo.thumbnailPath),
      "-o", join(outputDirectory, photo.thumbnailPath),
    ]);
    copyFileSync(join(basePublicDirectory, photo.fullPath), join(outputDirectory, photo.fullPath));
  }
  return catalog.photos;
}

function assertPublicCatalog(photos) {
  const ids = new Set(photos.map((photo) => photo.id));
  const orders = new Set(photos.map((photo) => photo.displayOrder));
  const paths = new Set(photos.flatMap((photo) => [photo.thumbnailPath, photo.fullPath]));
  if (ids.size !== photos.length) throw new Error("Combined catalog contains duplicate ids");
  if (orders.size !== photos.length) throw new Error("Combined catalog contains duplicate display orders");
  if (paths.size !== photos.length * 2) throw new Error("Combined catalog contains duplicate asset paths");
}

async function run() {
  const options = parseOptions(process.argv.slice(2));
  if (!existsSync(options.inputDirectory) || !existsSync(options.manifestPath)) {
    throw new Error("Input directory or manifest is missing");
  }
  if (options.basePublicDirectory && !existsSync(options.basePublicDirectory)) {
    throw new Error("Base public directory is missing");
  }
  if (existsSync(options.outputDirectory) && readdirSync(options.outputDirectory).length) {
    throw new Error("Output directory must be empty");
  }

  const manifest = JSON.parse(readFileSync(options.manifestPath, "utf8"));
  assertManifest(manifest, options.inputDirectory, options.allowSubset);
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "cmi-photo-prep-"));
  mkdirSync(join(options.outputDirectory, "thumbs"), { recursive: true });
  mkdirSync(join(options.outputDirectory, "full"), { recursive: true });

  try {
    const basePhotos = await copyBaseCatalog(
      options.basePublicDirectory,
      options.outputDirectory,
      options,
    );
    const orderedManifest = [...manifest].sort((a, b) => a.displayOrder - b.displayOrder);
    const processedPhotos = new Array(orderedManifest.length);
    let nextIndex = 0;
    let completed = 0;

    async function worker() {
      while (nextIndex < orderedManifest.length) {
        const index = nextIndex;
        nextIndex += 1;
        const item = orderedManifest[index];
        try {
          processedPhotos[index] = await renderVariants(item, options, temporaryDirectory);
        } catch (error) {
          throw new Error(`Failed to process ${item.source} as ${item.id}: ${error instanceof Error ? error.message : error}`);
        }
        completed += 1;
        if (completed % 20 === 0 || completed === orderedManifest.length) {
          console.log(`Prepared ${completed}/${orderedManifest.length} new photos`);
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(options.concurrency, orderedManifest.length) }, worker));
    const photos = [...basePhotos, ...processedPhotos].sort((a, b) => a.displayOrder - b.displayOrder);
    assertPublicCatalog(photos);
    const catalog = { version: options.version, count: photos.length, photos };
    writeFileSync(
      join(options.outputDirectory, "catalog.json"),
      `${JSON.stringify(catalog, null, 2)}\n`,
      "utf8",
    );
    console.log(`Prepared ${photos.length} public ${options.version} records in ${options.outputDirectory}`);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

try {
  await run();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
