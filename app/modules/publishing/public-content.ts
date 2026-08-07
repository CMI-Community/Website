export interface ContentRow {
  id: string;
  type: string;
  locale: string;
  slug: string;
  title: string;
  summary: string | null;
  body_md: string;
  metadata_json: string;
  status: string;
  published_at: string | null;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  published_by?: string | null;
}

export function publicContent(row: ContentRow) {
  return {
    id: row.id,
    type: row.type,
    locale: row.locale,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: row.body_md,
    metadata: safeMetadata(row.metadata_json),
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

export function editorContent(row: ContentRow) {
  return {
    ...publicContent(row),
    status: row.status,
  };
}

function safeMetadata(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
