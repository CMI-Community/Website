#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { Miniflare } from "miniflare";
import {
  buildLannaR2UploadManifest,
  localPathForLannaR2Object,
} from "./lib/lanna-r2-manifest.mjs";

const execFileAsync = promisify(execFile);
const TARGETS = {
  local: { bucket: "cmi-community-public-assets", args: ["--local"] },
  staging: {
    bucket: "cmi-community-public-assets-staging",
    args: ["--remote", "--env", "staging"],
  },
  production: {
    bucket: "cmi-community-public-assets",
    args: ["--remote", "--env", "production"],
  },
};

function usage() {
  return [
    "Usage:",
    "  node scripts/sync-lanna-r2.mjs --archive-manifest <manifest.json> --storage-root <downloaded-bucket> --site-asset-root <baseline-public> --baseline-commit <full-sha> --output <outside-repo-directory> --target <local|staging|production> [--execute|--verify-only] [--concurrency 3] [--allow-production]",
    "",
    "Without --execute or --verify-only, only a deterministic upload manifest is written.",
  ].join("\n");
}

function parseArgs(argv) {
  const options = { concurrency: "3", execute: false, verifyOnly: false, allowProduction: false };
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (["--execute", "--verify-only", "--allow-production"].includes(current)) {
      options[current.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = true;
      continue;
    }
    if (!current.startsWith("--") || !argv[index + 1]) throw new Error(usage());
    options[current.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = argv[index + 1];
    index += 1;
  }
  for (const required of ["archiveManifest", "storageRoot", "siteAssetRoot", "baselineCommit", "output", "target"]) {
    if (!options[required]) throw new Error(`Missing --${required.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}\n\n${usage()}`);
  }
  if (!TARGETS[options.target]) throw new Error("--target must be local, staging, or production");
  if (options.execute && options.verifyOnly) throw new Error("Choose either --execute or --verify-only");
  const concurrency = Number(options.concurrency);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 6) {
    throw new Error("--concurrency must be an integer between 1 and 6");
  }
  if (options.target === "production" && !options.allowProduction) {
    throw new Error("Production R2 sync requires --allow-production after release approval");
  }
  return {
    ...options,
    concurrency: options.target === "local" ? 1 : concurrency,
  };
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
  const difference = relative(resolve(parent), resolve(path));
  return difference === "" || (difference !== ".." && !difference.startsWith(`..${sep}`));
}

function writePrivateJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

async function wrangler(args) {
  await execFileAsync("npx", ["wrangler", ...args], {
    cwd: process.cwd(),
    env: { ...process.env, NO_COLOR: "1" },
    maxBuffer: 4 * 1024 * 1024,
  });
}

async function verifyObject(item, target) {
  const temporary = mkdtempSync(resolve(tmpdir(), "cmi-lanna-r2-verify-"));
  const destination = resolve(temporary, "object");
  try {
    await wrangler([
      "r2", "object", "get", `${target.bucket}/${item.objectKey}`,
      "--file", destination,
      ...target.args,
    ]);
    if (sha256(destination) !== item.sha256) {
      throw new Error(`R2 checksum mismatch: ${item.objectKey}`);
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

async function runPool(items, concurrency, task) {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      await task(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

async function syncLocalObjects({ manifest, roots, state, statePath, verifyOnly }) {
  const miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('local R2 migration'); } }",
    compatibilityDate: "2026-08-01",
    r2Buckets: { MEDIA: TARGETS.local.bucket },
    resourcePersistencePath: resolve(".wrangler/state/v3"),
    logRequests: false,
  });
  try {
    const bucket = await miniflare.getR2Bucket("MEDIA");
    let completed = 0;
    for (const item of manifest.objects) {
      const alreadyVerified = state.objects[item.objectKey]?.sha256 === item.sha256;
      if (!verifyOnly && !alreadyVerified) {
        const bytes = readFileSync(localPathForLannaR2Object(item, roots));
        await bucket.put(item.objectKey, bytes, {
          httpMetadata: {
            contentType: item.mimeType,
            cacheControl: "public, max-age=31536000, immutable",
          },
        });
      }
      if (verifyOnly || !alreadyVerified) {
        const stored = await bucket.get(item.objectKey);
        if (!stored) throw new Error(`R2 object missing after upload: ${item.objectKey}`);
        const storedBytes = Buffer.from(await stored.arrayBuffer());
        const storedSha256 = createHash("sha256").update(storedBytes).digest("hex");
        if (storedSha256 !== item.sha256 || storedBytes.byteLength !== item.byteSize) {
          throw new Error(`R2 checksum mismatch: ${item.objectKey}`);
        }
      }
      state.objects[item.objectKey] = {
        sha256: item.sha256,
        byteSize: item.byteSize,
        mimeType: item.mimeType,
        verifiedAt: new Date().toISOString(),
      };
      writePrivateJson(statePath, state);
      completed += 1;
      if (completed % 25 === 0 || completed === manifest.objectCount) {
        process.stdout.write(`R2 local: ${completed}/${manifest.objectCount} verified\n`);
      }
    }
  } finally {
    await miniflare.dispose();
  }
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const output = resolve(options.output);
  const gitRoot = gitRootFrom(process.cwd());
  if (gitRoot && isWithin(output, gitRoot)) {
    throw new Error("R2 migration output must be outside the Git repository");
  }
  mkdirSync(output, { recursive: true, mode: 0o700 });

  const roots = {
    storageRoot: resolve(options.storageRoot),
    siteAssetRoot: resolve(options.siteAssetRoot),
  };
  const archiveManifest = JSON.parse(readFileSync(resolve(options.archiveManifest), "utf8"));
  const manifest = buildLannaR2UploadManifest({
    archiveManifest,
    ...roots,
    baselineCommit: options.baselineCommit,
  });
  const manifestPath = resolve(output, "lanna-r2-upload-manifest.json");
  writePrivateJson(manifestPath, manifest);

  if (!options.execute && !options.verifyOnly) {
    process.stdout.write(`${JSON.stringify({ ...manifest, objects: undefined, manifestPath }, null, 2)}\n`);
    return;
  }

  const target = TARGETS[options.target];
  const statePath = resolve(output, `lanna-r2-${options.target}-state.json`);
  const state = existsSync(statePath)
    ? JSON.parse(readFileSync(statePath, "utf8"))
    : { version: "cmi-lanna-r2-state/v1", target: options.target, manifestSha256: manifest.manifestSha256, objects: {} };
  if (state.manifestSha256 !== manifest.manifestSha256) {
    throw new Error("Existing R2 resume state belongs to a different manifest");
  }

  if (options.target === "local") {
    await syncLocalObjects({
      manifest,
      roots,
      state,
      statePath,
      verifyOnly: options.verifyOnly,
    });
    process.stdout.write(`${JSON.stringify({
      target: options.target,
      objectCount: manifest.objectCount,
      totalBytes: manifest.totalBytes,
      manifestSha256: manifest.manifestSha256,
      statePath,
    }, null, 2)}\n`);
    return;
  }

  let completed = 0;
  await runPool(manifest.objects, options.concurrency, async (item) => {
    const alreadyVerified = state.objects[item.objectKey]?.sha256 === item.sha256;
    if (!options.verifyOnly && !alreadyVerified) {
      const localPath = localPathForLannaR2Object(item, roots);
      await wrangler([
        "r2", "object", "put", `${target.bucket}/${item.objectKey}`,
        "--file", localPath,
        "--content-type", item.mimeType,
        "--cache-control", "public, max-age=31536000, immutable",
        ...target.args,
      ]);
    }
    if (options.verifyOnly || !alreadyVerified) await verifyObject(item, target);
    state.objects[item.objectKey] = {
      sha256: item.sha256,
      byteSize: item.byteSize,
      mimeType: item.mimeType,
      verifiedAt: new Date().toISOString(),
    };
    writePrivateJson(statePath, state);
    completed += 1;
    if (completed % 10 === 0 || completed === manifest.objectCount) {
      process.stdout.write(`R2 ${options.target}: ${completed}/${manifest.objectCount} verified\n`);
    }
  });

  process.stdout.write(`${JSON.stringify({
    target: options.target,
    objectCount: manifest.objectCount,
    totalBytes: manifest.totalBytes,
    manifestSha256: manifest.manifestSha256,
    statePath,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
