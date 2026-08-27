import {
  projectPublicPatternEntry,
  type ProjectArchiveEntryRow,
  type ProjectArchiveMediaRow,
  type PublicPatternEntry,
} from "../../archive-model/public-pattern-entry";

export const LANNA_PROJECT_ID = "waytoagi-skills-exchange-chiang-mai-26";

export async function readPublicLannaArchive(db: D1Database): Promise<PublicPatternEntry[]> {
  const [entryResult, mediaResult] = await Promise.all([
    db.prepare(
      `SELECT
        id, project_id, source_system, source_id, source_import_id,
        archive_number, museum_id, source_title, source_location, observation,
        verified_information, open_question, carrier_tags_json,
        position_tags_json, structure_tags_json, material_tags_json,
        collector_name, status, rights_status, captured_at, source_created_at,
        published_at, imported_at
      FROM project_archive_entries
      WHERE project_id = ? AND status = 'published' AND rights_status = 'cleared'
      ORDER BY published_at DESC, archive_number DESC`,
    ).bind(LANNA_PROJECT_ID).all<ProjectArchiveEntryRow>(),
    db.prepare(
      `SELECT
        pam.entry_id, pam.media_asset_id, pam.role, pam.sort_order,
        ma.object_key, ma.alt_text, ma.mime_type, ma.status, ma.rights_status
      FROM project_archive_media pam
      JOIN project_archive_entries pae ON pae.id = pam.entry_id
      JOIN media_assets ma ON ma.id = pam.media_asset_id
      WHERE pae.project_id = ?
      ORDER BY pam.entry_id, pam.role, pam.sort_order`,
    ).bind(LANNA_PROJECT_ID).all<ProjectArchiveMediaRow>(),
  ]);

  return entryResult.results.map((entry) =>
    projectPublicPatternEntry(entry, mediaResult.results)
  );
}
