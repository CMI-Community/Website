import { describe, expect, it } from "vitest";
import { sanitizePhotoCatalog } from "../app/modules/photo-museum/photo-catalog";

function photo(overrides: Record<string, unknown> = {}) {
  return {
    id: "cmi-photo-001",
    thumbnailPath: "thumbs/cmi-photo-001.webp",
    fullPath: "full/cmi-photo-001.webp",
    width: 2560,
    height: 1920,
    alt: "一群人在室内空间合影",
    displayOrder: 1,
    ...overrides,
  };
}

describe("public Photo Museum catalog", () => {
  it("keeps only explicit public display fields", () => {
    const catalog = sanitizePhotoCatalog({
      version: "photo-museum/v1",
      count: 1,
      photos: [
        photo({
          sourceLocalPath: "/private/photo.heic",
          imageSha256: "private-hash",
          permissionStatus: "INTERNAL",
          personNames: ["private"],
        }),
      ],
    });

    expect(catalog).toEqual({
      version: "photo-museum/v1",
      count: 1,
      photos: [photo()],
    });
    expect(JSON.stringify(catalog)).not.toMatch(
      /sourceLocalPath|imageSha256|permissionStatus|personNames|private/,
    );
  });

  it("sorts display order and rejects duplicate ids or unsafe paths", () => {
    const sorted = sanitizePhotoCatalog({
      version: "photo-museum/v1",
      count: 2,
      photos: [
        photo({
          id: "cmi-photo-002",
          thumbnailPath: "thumbs/cmi-photo-002.webp",
          fullPath: "full/cmi-photo-002.webp",
          displayOrder: 2,
        }),
        photo(),
      ],
    });
    expect(sorted.photos.map((item) => item.id)).toEqual(["cmi-photo-001", "cmi-photo-002"]);

    expect(() =>
      sanitizePhotoCatalog({
        version: "photo-museum/v1",
        count: 1,
        photos: [photo({ thumbnailPath: "../private/photo.webp" })],
      }),
    ).toThrow(/thumbnail path/);

    expect(() =>
      sanitizePhotoCatalog({
        version: "photo-museum/v1",
        count: 2,
        photos: [photo(), photo()],
      }),
    ).toThrow(/Duplicate photo ids/);
  });

  it("accepts immutable versioned catalogs without weakening the public field boundary", () => {
    const catalog = sanitizePhotoCatalog({
      version: "photo-museum/v2",
      count: 1,
      photos: [photo()],
    });
    expect(catalog.version).toBe("photo-museum/v2");
    expect(() =>
      sanitizePhotoCatalog({ version: "photo-museum/latest", count: 1, photos: [photo()] }),
    ).toThrow(/photo-museum\/vN/);
  });

  it("requires the declared count and positive intrinsic dimensions", () => {
    expect(() =>
      sanitizePhotoCatalog({ version: "photo-museum/v1", count: 27, photos: [photo()] }),
    ).toThrow(/count/);
    expect(() =>
      sanitizePhotoCatalog({
        version: "photo-museum/v1",
        count: 1,
        photos: [photo({ width: 0 })],
      }),
    ).toThrow(/width/);
  });
});
