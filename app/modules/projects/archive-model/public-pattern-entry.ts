export type PatternMediaRole = "detail" | "context" | "label";

export interface ProjectArchiveEntryRow {
  id: string;
  project_id: string;
  source_system: string;
  source_id: string | null;
  source_import_id: string | null;
  archive_number: string;
  museum_id: string;
  source_title: string;
  source_location: string;
  observation: string;
  verified_information: string;
  open_question: string;
  carrier_tags_json: string;
  position_tags_json: string;
  structure_tags_json: string;
  material_tags_json: string;
  collector_name: string;
  status: "published" | "hidden" | "archived";
  rights_status: "unknown" | "research_only" | "cleared";
  captured_at: string | null;
  source_created_at: string | null;
  published_at: string | null;
  imported_at: string;
}

export interface ProjectArchiveMediaRow {
  entry_id: string;
  media_asset_id: string;
  role: PatternMediaRole;
  sort_order: number;
  object_key: string;
  alt_text: string;
  mime_type: string;
  status: string;
  rights_status: "unknown" | "research_only" | "cleared";
}

export interface PublicPatternMedia {
  role: PatternMediaRole;
  order: number;
  src: string;
  alt: string;
}

export interface PublicPatternEntry {
  archiveNumber: string;
  museumId: string;
  title: string;
  location: string;
  observation: string;
  verifiedInformation: string;
  openQuestion: string;
  tags: {
    carrier: string[];
    position: string[];
    structure: string[];
    material: string[];
  };
  collectorName: string;
  capturedAt: string | null;
  publishedAt: string | null;
  media: PublicPatternMedia[];
}

function publicText(value: string, field: string, maximum: number): string {
  const normalized = value.trim();
  if (!normalized && field !== "verifiedInformation" && field !== "openQuestion") {
    throw new Error(`Project archive ${field} must not be empty`);
  }
  if (normalized.length > maximum) {
    throw new Error(`Project archive ${field} exceeds ${maximum} characters`);
  }
  return normalized;
}

function publicTags(value: string, field: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Project archive ${field} must be valid JSON`);
  }
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new Error(`Project archive ${field} must be a string array`);
  }
  return parsed.map((item) => item.trim()).filter(Boolean).slice(0, 12);
}

function publicMediaPath(objectKey: string): string {
  const prefix = "projects/waytoagi/26-lanna-museum/v1/";
  if (!objectKey.startsWith(prefix) || objectKey.includes("..")) {
    throw new Error("Project media object key is outside the public project prefix");
  }
  return `/media/${objectKey}`;
}

export function projectPublicPatternEntry(
  row: ProjectArchiveEntryRow,
  mediaRows: readonly ProjectArchiveMediaRow[],
): PublicPatternEntry {
  if (row.status !== "published" || row.rights_status !== "cleared") {
    throw new Error("Only cleared published project archive entries are public");
  }

  const media = mediaRows
    .filter((item) => item.entry_id === row.id)
    .map((item): PublicPatternMedia => {
      if (item.status !== "ready" || item.rights_status !== "cleared") {
        throw new Error(`Project media ${item.media_asset_id} is not public`);
      }
      return {
        role: item.role,
        order: item.sort_order,
        src: publicMediaPath(item.object_key),
        alt: publicText(item.alt_text, "media alt", 300),
      };
    })
    .sort((left, right) => left.role.localeCompare(right.role) || left.order - right.order);

  if (!media.some((item) => item.role === "detail")) {
    throw new Error(`Project archive ${row.archive_number} has no detail image`);
  }
  if (!media.some((item) => item.role === "context")) {
    throw new Error(`Project archive ${row.archive_number} has no context image`);
  }

  return {
    archiveNumber: publicText(row.archive_number, "archiveNumber", 40),
    museumId: publicText(row.museum_id, "museumId", 80),
    title: publicText(row.source_title, "title", 160),
    location: publicText(row.source_location, "location", 160),
    observation: publicText(row.observation, "observation", 1_200),
    verifiedInformation: publicText(
      row.verified_information,
      "verifiedInformation",
      1_200,
    ),
    openQuestion: publicText(row.open_question, "openQuestion", 1_200),
    tags: {
      carrier: publicTags(row.carrier_tags_json, "carrierTags"),
      position: publicTags(row.position_tags_json, "positionTags"),
      structure: publicTags(row.structure_tags_json, "structureTags"),
      material: publicTags(row.material_tags_json, "materialTags"),
    },
    collectorName: publicText(row.collector_name || "匿名采集者", "collectorName", 80),
    capturedAt: row.captured_at,
    publishedAt: row.published_at,
    media,
  };
}
