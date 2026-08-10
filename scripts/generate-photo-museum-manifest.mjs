import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const SUPPORTED_SOURCE = new Set([".heic", ".jpg", ".jpeg", ".png", ".dng"]);

function imageFiles(directory) {
  return readdirSync(directory)
    .filter((file) => SUPPORTED_SOURCE.has(extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "en"));
}

function fileHash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function parseOptions(args) {
  const [inputArg, outputArg, ...optionArgs] = args;
  if (!inputArg || !outputArg) {
    throw new Error(
      "Usage: node scripts/generate-photo-museum-manifest.mjs INPUT_DIR OUTPUT.json [--start-order 1] [--exclude-source-dir DIR] [--alt-prefix TEXT]",
    );
  }
  const options = {
    inputDirectory: resolve(inputArg),
    outputPath: resolve(outputArg),
    startOrder: 1,
    excludeSourceDirectory: null,
    altPrefix: "CMI 社区过往照片",
  };
  for (let index = 0; index < optionArgs.length; index += 2) {
    const option = optionArgs[index];
    const value = optionArgs[index + 1];
    if (!value) throw new Error(`Missing value for ${option}`);
    if (option === "--start-order") options.startOrder = Number(value);
    else if (option === "--exclude-source-dir") options.excludeSourceDirectory = resolve(value);
    else if (option === "--alt-prefix") options.altPrefix = value;
    else throw new Error(`Unknown option: ${option}`);
  }
  if (!Number.isInteger(options.startOrder) || options.startOrder < 1) {
    throw new Error("--start-order must be a positive integer");
  }
  return options;
}

function run() {
  const options = parseOptions(process.argv.slice(2));
  if (!existsSync(options.inputDirectory)) throw new Error("Input directory is missing");
  if (options.excludeSourceDirectory && !existsSync(options.excludeSourceDirectory)) {
    throw new Error("Exclusion source directory is missing");
  }

  const excludedHashes = new Set(
    options.excludeSourceDirectory
      ? imageFiles(options.excludeSourceDirectory).map((file) =>
          fileHash(join(options.excludeSourceDirectory, file)),
        )
      : [],
  );
  const seenHashes = new Set();
  let exactDuplicates = 0;
  const uniqueFiles = imageFiles(options.inputDirectory).filter((file) => {
    const hash = fileHash(join(options.inputDirectory, file));
    if (excludedHashes.has(hash) || seenHashes.has(hash)) {
      exactDuplicates += 1;
      return false;
    }
    seenHashes.add(hash);
    return true;
  });

  const manifest = uniqueFiles.map((source, index) => {
    const displayOrder = options.startOrder + index;
    return {
      source,
      id: `cmi-photo-${String(displayOrder).padStart(3, "0")}`,
      alt: `${options.altPrefix} ${String(displayOrder).padStart(3, "0")}`,
      displayOrder,
    };
  });
  writeFileSync(options.outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(
    `Generated ${manifest.length} manifest records; excluded ${exactDuplicates} exact duplicates.`,
  );
}

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
