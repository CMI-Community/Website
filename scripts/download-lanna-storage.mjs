#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

function usage() {
  return [
    "Usage:",
    "  node scripts/download-lanna-storage.mjs --index <storage_objects.json> --base-url <https://project.supabase.co> --bucket <bucket-name> --output <outside-repo-directory> [--concurrency 6]",
    "",
    "The downloaded source objects and checksum manifest contain production data and must remain outside Git.",
  ].join("\n");
}

function parseArgs(argv) {
  const options = { concurrency: "6" };
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--") || !argv[index + 1]) throw new Error(usage());
    options[current.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = argv[index + 1];
    index += 1;
  }
  for (const required of ["index", "baseUrl", "bucket", "output"]) {
    if (!options[required]) throw new Error(`Missing --${required.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}\n\n${usage()}`);
  }
  const concurrency = Number(options.concurrency);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10) {
    throw new Error("--concurrency must be an integer between 1 and 10");
  }
  return { ...options, concurrency };
}

function gitRootFrom(path) {
  let current = resolve(path);
  while (true) {
    if (existsSync(resolve(current, ".git"))) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function isWithin(path, parent) {
  const child = resolve(path);
  const root = resolve(parent);
  const difference = relative(root, child);
  return difference === "" || (!difference.startsWith(`..${sep}`) && difference !== ".." && !isAbsolute(difference));
}

export function safeObjectName(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Storage object name must be a non-empty string");
  }
  const normalized = value.replaceAll("\\", "/");
  if (
    normalized.startsWith("/") ||
    normalized.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(`Unsafe storage object name: ${value}`);
  }
  return normalized;
}

export function publicObjectUrl(baseUrl, bucket, objectName) {
  const base = new URL(baseUrl);
  if (base.protocol !== "https:") throw new Error("Supabase base URL must use HTTPS");
  const encodedBucket = encodeURIComponent(safeObjectName(bucket));
  const encodedObject = safeObjectName(objectName)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return new URL(`/storage/v1/object/public/${encodedBucket}/${encodedObject}`, base).toString();
}

function normalizeIndex(input) {
  if (!Array.isArray(input)) throw new Error("Storage index must be a JSON array");
  const seen = new Set();
  return input.map((item) => {
    const name = safeObjectName(item?.name);
    if (seen.has(name)) throw new Error(`Duplicate storage object: ${name}`);
    seen.add(name);
    const size = Number(item?.metadata?.size);
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new Error(`Storage object ${name} has an invalid size`);
    }
    const mimeType = typeof item?.metadata?.mimetype === "string"
      ? item.metadata.mimetype
      : "application/octet-stream";
    const sourceEtag = typeof item?.metadata?.eTag === "string"
      ? item.metadata.eTag.replaceAll('"', "").toLowerCase()
      : null;
    return {
      name,
      size,
      mimeType,
      sourceEtag,
      sourceCreatedAt: item.created_at ?? null,
      sourceUpdatedAt: item.updated_at ?? null,
    };
  }).sort((left, right) => left.name.localeCompare(right.name));
}

function checksums(bytes) {
  return {
    md5: createHash("md5").update(bytes).digest("hex"),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function verifiedChecksums(bytes, object) {
  const result = checksums(bytes);
  if (object.sourceEtag && /^[a-f0-9]{32}$/.test(object.sourceEtag) && result.md5 !== object.sourceEtag) {
    throw new Error(`ETag mismatch for ${object.name}`);
  }
  return result;
}

async function downloadObject({ baseUrl, bucket, output, object }) {
  const destination = resolve(output, ...object.name.split("/"));
  if (!isWithin(destination, output)) throw new Error(`Object escaped output root: ${object.name}`);
  mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });

  if (existsSync(destination) && statSync(destination).size === object.size) {
    const existing = readFileSync(destination);
    return { ...object, ...verifiedChecksums(existing, object), resumed: true };
  }

  const partial = `${destination}.partial`;
  const response = await fetch(publicObjectUrl(baseUrl, bucket, object.name));
  if (!response.ok) {
    throw new Error(`Download failed for ${object.name}: HTTP ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength !== object.size) {
    throw new Error(`Size mismatch for ${object.name}: expected ${object.size}, received ${bytes.byteLength}`);
  }
  writeFileSync(partial, bytes, { mode: 0o600 });
  renameSync(partial, destination);
  chmodSync(destination, 0o600);
  return { ...object, ...verifiedChecksums(bytes, object), resumed: false };
}

async function runPool(items, concurrency, task) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const output = resolve(options.output);
  const gitRoot = gitRootFrom(process.cwd());
  if (gitRoot && isWithin(output, gitRoot)) {
    throw new Error("Storage export output must be outside the Git repository");
  }
  mkdirSync(output, { recursive: true, mode: 0o700 });

  const objects = normalizeIndex(JSON.parse(readFileSync(resolve(options.index), "utf8")));
  const downloaded = await runPool(objects, options.concurrency, (object) =>
    downloadObject({
      baseUrl: options.baseUrl,
      bucket: options.bucket,
      output,
      object,
    })
  );
  const manifest = {
    version: "cmi-supabase-storage-export/v1",
    bucket: options.bucket,
    objectCount: downloaded.length,
    totalBytes: downloaded.reduce((sum, item) => sum + item.size, 0),
    objects: downloaded.map(({ resumed: _resumed, ...item }) => item),
  };
  const manifestPath = resolve(output, "storage-export-manifest.json");
  if (existsSync(manifestPath)) unlinkSync(manifestPath);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify({
    objectCount: manifest.objectCount,
    totalBytes: manifest.totalBytes,
    resumedCount: downloaded.filter((item) => item.resumed).length,
    manifestPath,
  }, null, 2)}\n`);
}

const isDirectRun = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;
if (isDirectRun) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
