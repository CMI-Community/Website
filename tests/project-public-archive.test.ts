import { describe, expect, it } from "vitest";
import {
  projectPublicPatternEntry,
  type ProjectArchiveEntryRow,
  type ProjectArchiveMediaRow,
} from "../app/modules/projects/archive/public-pattern-entry";

const entry: ProjectArchiveEntryRow = {
  id: "entry-1",
  project_id: "waytoagi-skills-exchange-chiang-mai-26",
  source_system: "supabase:osqyplgctlzdlpqmzfud",
  source_id: "source-secret-id",
  source_import_id: "internal-import-id",
  archive_number: "CMI-LN-0045",
  museum_id: "fam",
  source_title: "测试纹样",
  source_location: "一层展厅",
  observation: "现场观察",
  verified_information: "VERIFIED：展签信息",
  open_question: "仍待确认的问题",
  carrier_tags_json: '["织物"]',
  position_tags_json: "[]",
  structure_tags_json: '["重复"]',
  material_tags_json: '["丝"]',
  collector_name: "匿名采集者",
  status: "published",
  rights_status: "cleared",
  captured_at: "2026-07-26T08:00:00.000Z",
  source_created_at: "2026-07-26T08:01:00.000Z",
  published_at: "2026-07-26T08:02:00.000Z",
  imported_at: "2026-08-27T00:00:00.000Z",
};

const media: ProjectArchiveMediaRow[] = [
  {
    entry_id: "entry-1",
    media_asset_id: "media-detail",
    role: "detail",
    sort_order: 0,
    object_key: "projects/waytoagi/26-lanna-museum/v1/archive/entry-1/detail/a.webp",
    alt_text: "纹样局部",
    mime_type: "image/webp",
    status: "ready",
    rights_status: "cleared",
  },
  {
    entry_id: "entry-1",
    media_asset_id: "media-context",
    role: "context",
    sort_order: 0,
    object_key: "projects/waytoagi/26-lanna-museum/v1/archive/entry-1/context/b.webp",
    alt_text: "完整载体",
    mime_type: "image/webp",
    status: "ready",
    rights_status: "cleared",
  },
];

describe("project public archive projection", () => {
  it("returns only approved public fields and hides import metadata", () => {
    const result = projectPublicPatternEntry(entry, media);

    expect(result.archiveNumber).toBe("CMI-LN-0045");
    expect(result.media).toHaveLength(2);
    expect(result.media[0].src).toMatch(/^\/media\/projects\/waytoagi\//);
    expect(result).not.toHaveProperty("source_id");
    expect(result).not.toHaveProperty("source_import_id");
    expect(result).not.toHaveProperty("rights_status");
    expect(JSON.stringify(result)).not.toContain("source-secret-id");
  });

  it("rejects hidden, uncleared, or incomplete entries", () => {
    expect(() =>
      projectPublicPatternEntry({ ...entry, status: "hidden" }, media),
    ).toThrow(/Only cleared published/);
    expect(() =>
      projectPublicPatternEntry({ ...entry, rights_status: "unknown" }, media),
    ).toThrow(/Only cleared published/);
    expect(() => projectPublicPatternEntry(entry, media.slice(0, 1))).toThrow(
      /no context image/,
    );
  });
});
