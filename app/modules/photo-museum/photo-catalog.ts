export interface PhotoRecord {
  id: string;
  thumbnailPath: string;
  fullPath: string;
  width: number;
  height: number;
  alt: string;
  displayOrder: number;
}

export interface PhotoCatalogV1 {
  version: "photo-museum/v1";
  count: number;
  photos: PhotoRecord[];
}

const PUBLIC_ID = /^[a-z0-9][a-z0-9-]{2,63}$/;
const PUBLIC_IMAGE_PATH = /^(?:thumbs|full)\/[a-z0-9][a-z0-9-]{2,63}\.webp$/;

function publicText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Photo ${field} must be a non-empty string`);
  }
  return value.trim();
}

function positiveInteger(value: unknown, field: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`Photo ${field} must be a positive integer`);
  }
  return Number(value);
}

export function sanitizePhotoCatalog(input: unknown): PhotoCatalogV1 {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Photo catalog must be an object");
  }

  const source = input as Record<string, unknown>;
  if (source.version !== "photo-museum/v1") {
    throw new Error("Photo catalog version must be photo-museum/v1");
  }
  if (!Array.isArray(source.photos) || source.photos.length === 0) {
    throw new Error("Photo catalog must contain photos");
  }

  const photos = source.photos.map((record, index): PhotoRecord => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error(`Photo record ${index} must be an object`);
    }
    const row = record as Record<string, unknown>;
    const id = publicText(row.id, "id");
    const thumbnailPath = publicText(row.thumbnailPath, "thumbnailPath");
    const fullPath = publicText(row.fullPath, "fullPath");
    const alt = publicText(row.alt, "alt");

    if (!PUBLIC_ID.test(id)) throw new Error(`Invalid public photo id: ${id}`);
    if (!PUBLIC_IMAGE_PATH.test(thumbnailPath) || !thumbnailPath.startsWith("thumbs/")) {
      throw new Error(`Invalid thumbnail path for ${id}`);
    }
    if (!PUBLIC_IMAGE_PATH.test(fullPath) || !fullPath.startsWith("full/")) {
      throw new Error(`Invalid full image path for ${id}`);
    }
    if (alt.length > 300) throw new Error(`Photo alt exceeds 300 characters for ${id}`);

    return {
      id,
      thumbnailPath,
      fullPath,
      width: positiveInteger(row.width, "width"),
      height: positiveInteger(row.height, "height"),
      alt,
      displayOrder: positiveInteger(row.displayOrder, "displayOrder"),
    };
  });

  const ids = new Set(photos.map((photo) => photo.id));
  const thumbnailPaths = new Set(photos.map((photo) => photo.thumbnailPath));
  const fullPaths = new Set(photos.map((photo) => photo.fullPath));
  const orders = new Set(photos.map((photo) => photo.displayOrder));
  if (ids.size !== photos.length) throw new Error("Duplicate photo ids found");
  if (thumbnailPaths.size !== photos.length) throw new Error("Duplicate photo thumbnails found");
  if (fullPaths.size !== photos.length) throw new Error("Duplicate full photos found");
  if (orders.size !== photos.length) throw new Error("Duplicate photo display order found");
  if (source.count !== photos.length) throw new Error("Photo catalog count does not match photos");

  return {
    version: "photo-museum/v1",
    count: photos.length,
    photos: photos.sort((a, b) => a.displayOrder - b.displayOrder),
  };
}
