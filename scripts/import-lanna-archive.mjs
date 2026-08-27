#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildLannaArchiveImport } from "./lib/lanna-archive-import.mjs";

function usage() {
  return [
    "Usage:",
    "  node scripts/import-lanna-archive.mjs --input <rows.json> --storage-root <downloaded-bucket> --created-by <admin-user-id> --snapshot-at <ISO timestamp> --output <outside-repo-directory> [--dry-run]",
    "",
    "The input, generated SQL, manifest, and downloaded media contain production data and must remain outside Git.",
  ].join("\n");
}

function parseArgs(argv) {
  const options = { dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (!current.startsWith("--") || !argv[index + 1]) throw new Error(usage());
    options[current.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = argv[index + 1];
    index += 1;
  }
  for (const required of ["input", "storageRoot", "createdBy", "snapshotAt", "output"]) {
    if (!options[required]) throw new Error(`Missing --${required.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}\n\n${usage()}`);
  }
  return options;
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const input = JSON.parse(readFileSync(resolve(options.input), "utf8"));
  const result = buildLannaArchiveImport({
    input,
    storageRoot: resolve(options.storageRoot),
    createdBy: options.createdBy,
    snapshotAt: options.snapshotAt,
  });

  const summary = {
    manifestSha256: result.manifest.manifestSha256,
    recordCount: result.manifest.recordCount,
    objectCount: result.manifest.objectCount,
    totalBytes: result.manifest.totalBytes,
    outputWritten: !options.dryRun,
  };
  if (!options.dryRun) {
    const output = resolve(options.output);
    mkdirSync(output, { recursive: true });
    writeFileSync(resolve(output, "lanna-archive-import.sql"), result.sql, { mode: 0o600 });
    writeFileSync(
      resolve(output, "lanna-archive-r2-manifest.json"),
      `${JSON.stringify(result.manifest, null, 2)}\n`,
      { mode: 0o600 },
    );
  }
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

const isDirectRun = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;
if (isDirectRun) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
