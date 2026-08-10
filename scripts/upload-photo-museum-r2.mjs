import { execFile as execFileCallback } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { promisify } from "node:util";
import { join, resolve } from "node:path";

const execFile = promisify(execFileCallback);

function parseOptions(args) {
  const [directoryArg, bucket, version, ...optionArgs] = args;
  if (!directoryArg || !bucket || !version) {
    throw new Error(
      "Usage: node scripts/upload-photo-museum-r2.mjs PUBLIC_DIR BUCKET photo-museum/vN --remote [--concurrency 8]",
    );
  }
  const options = {
    directory: resolve(directoryArg),
    bucket,
    version,
    storageFlag: null,
    concurrency: 8,
  };
  for (let index = 0; index < optionArgs.length; index += 1) {
    const option = optionArgs[index];
    if (option === "--remote" || option === "--local") {
      options.storageFlag = option;
      continue;
    }
    if (option === "--concurrency") {
      options.concurrency = Number(optionArgs[index + 1]);
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${option}`);
  }
  if (!options.storageFlag) throw new Error("Choose exactly one of --remote or --local");
  if (!/^photo-museum\/v[1-9][0-9]*$/.test(options.version)) {
    throw new Error("Version must use photo-museum/vN");
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 16) {
    throw new Error("Concurrency must be between 1 and 16");
  }
  return options;
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function run() {
  const options = parseOptions(process.argv.slice(2));
  const catalogFile = join(options.directory, "catalog.json");
  if (!existsSync(catalogFile)) throw new Error("Catalog is missing");
  const catalog = JSON.parse(readFileSync(catalogFile, "utf8"));
  if (catalog.version !== options.version || !Array.isArray(catalog.photos)) {
    throw new Error("Catalog version or records do not match the upload target");
  }

  const localWrangler = resolve("node_modules/.bin/wrangler");
  if (!existsSync(localWrangler)) throw new Error("Local Wrangler binary is missing");
  const assets = catalog.photos.flatMap((photo) => [photo.thumbnailPath, photo.fullPath]);
  let nextIndex = 0;
  let completed = 0;

  async function upload(relativePath, contentType, cacheControl) {
    const localFile = join(options.directory, relativePath);
    if (!existsSync(localFile)) throw new Error(`Upload source is missing: ${relativePath}`);
    const objectPath = `${options.bucket}/${options.version}/${relativePath}`;
    let lastError;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        await execFile(localWrangler, [
          "r2", "object", "put", objectPath,
          "--file", localFile,
          "--content-type", contentType,
          "--cache-control", cacheControl,
          options.storageFlag,
          "--force",
        ], { maxBuffer: 1024 * 1024 });
        return;
      } catch (error) {
        lastError = error;
        if (attempt < 4) await sleep(500 * 2 ** (attempt - 1));
      }
    }
    throw new Error(`Failed to upload ${relativePath}: ${lastError instanceof Error ? lastError.message : lastError}`);
  }

  async function worker() {
    while (nextIndex < assets.length) {
      const index = nextIndex;
      nextIndex += 1;
      await upload(assets[index], "image/webp", "public, max-age=31536000, immutable");
      completed += 1;
      if (completed % 50 === 0 || completed === assets.length) {
        console.log(`Uploaded ${completed}/${assets.length} immutable WebP objects`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(options.concurrency, assets.length) }, worker));
  await upload("catalog.json", "application/json; charset=utf-8", "no-cache");
  console.log(`Uploaded catalog last; ${options.version} is complete in ${options.bucket}`);
}

try {
  await run();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
