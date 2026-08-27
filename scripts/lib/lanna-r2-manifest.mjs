import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";

export const LANNA_R2_PREFIX = "projects/waytoagi/26-lanna-museum/v1";

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
};

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function safeRelativePath(value, label) {
  const normalized = value.replaceAll("\\", "/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    normalized.includes("//")
  ) {
    throw new Error(`Unsafe ${label}: ${value}`);
  }
  return normalized;
}

function isWithin(path, root) {
  const difference = relative(resolve(root), resolve(path));
  return difference === "" || (
    difference !== ".." &&
    !difference.startsWith(`..${sep}`)
  );
}

function walkFiles(root, current = root) {
  return readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const path = join(current, entry.name);
    return entry.isDirectory() ? walkFiles(root, path) : [path];
  });
}

function mimeTypeFor(path) {
  const mimeType = MIME_TYPES[extname(path).toLowerCase()];
  if (!mimeType) throw new Error(`Unsupported project asset type: ${path}`);
  return mimeType;
}

function archiveSourcePath(item, storageRoot, siteAssetRoot) {
  const root = item.sourceKind === "supabase-storage" ? storageRoot : siteAssetRoot;
  if (!root) throw new Error(`Missing source root for ${item.sourceKind}`);
  const localPath = resolve(root, ...safeRelativePath(item.sourcePath, "source path").split("/"));
  if (!isWithin(localPath, root)) throw new Error(`Archive source escaped its root: ${item.sourcePath}`);
  return localPath;
}

export function localPathForLannaR2Object(item, { storageRoot, siteAssetRoot }) {
  if (item.sourceKind === "legacy-site-baseline") {
    const localPath = resolve(
      siteAssetRoot,
      ...safeRelativePath(item.sourcePath, "site source path").split("/"),
    );
    if (!isWithin(localPath, siteAssetRoot)) {
      throw new Error(`Site source escaped its root: ${item.sourcePath}`);
    }
    return localPath;
  }
  return archiveSourcePath(item, storageRoot, siteAssetRoot);
}

export function buildLannaR2UploadManifest({
  archiveManifest,
  storageRoot,
  siteAssetRoot,
  baselineCommit,
}) {
  if (archiveManifest?.version !== "cmi-project-archive-import/v1") {
    throw new Error("Unsupported archive import manifest");
  }
  if (!/^[a-f0-9]{40}$/.test(baselineCommit)) {
    throw new Error("baselineCommit must be a full Git commit SHA");
  }

  const archiveObjects = archiveManifest.media.map((item) => {
    const localPath = archiveSourcePath(item, storageRoot, siteAssetRoot);
    const actualBytes = statSync(localPath).size;
    const actualSha256 = sha256(localPath);
    if (actualBytes !== item.byteSize || actualSha256 !== item.checksum) {
      throw new Error(`Archive source verification failed: ${item.sourcePath}`);
    }
    return {
      kind: "archive",
      sourceKind: item.sourceKind,
      sourcePath: item.sourcePath,
      objectKey: safeRelativePath(item.objectKey, "R2 object key"),
      mimeType: item.mimeType,
      byteSize: item.byteSize,
      sha256: item.checksum,
      rightsStatus: item.rightsStatus,
    };
  });

  const siteObjects = walkFiles(siteAssetRoot)
    .map((path) => {
      const sourcePath = safeRelativePath(relative(siteAssetRoot, path), "site asset path");
      return {
        kind: "site",
        sourceKind: "legacy-site-baseline",
        sourcePath,
        objectKey: `${LANNA_R2_PREFIX}/site/${sourcePath}`,
        mimeType: mimeTypeFor(path),
        byteSize: statSync(path).size,
        sha256: sha256(path),
        rightsStatus: "online-baseline",
      };
    })
    .sort((left, right) => left.objectKey.localeCompare(right.objectKey));

  const objects = [...archiveObjects, ...siteObjects]
    .sort((left, right) => left.objectKey.localeCompare(right.objectKey));
  const keys = new Set();
  for (const item of objects) {
    if (!item.objectKey.startsWith(`${LANNA_R2_PREFIX}/`)) {
      throw new Error(`Object is outside the Lanna prefix: ${item.objectKey}`);
    }
    if (keys.has(item.objectKey)) throw new Error(`Duplicate R2 object key: ${item.objectKey}`);
    keys.add(item.objectKey);
  }

  const canonical = JSON.stringify({
    archiveManifestSha256: archiveManifest.manifestSha256,
    baselineCommit,
    objects,
  });
  return {
    version: "cmi-lanna-r2-upload/v1",
    projectPrefix: LANNA_R2_PREFIX,
    archiveManifestSha256: archiveManifest.manifestSha256,
    baselineCommit,
    manifestSha256: createHash("sha256").update(canonical).digest("hex"),
    archiveObjectCount: archiveObjects.length,
    siteObjectCount: siteObjects.length,
    objectCount: objects.length,
    totalBytes: objects.reduce((sum, item) => sum + item.byteSize, 0),
    objects,
  };
}
