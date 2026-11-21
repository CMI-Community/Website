import { listArchiveEvents } from "../community-content/archive-repository.server";
import { getEventSeriesMemberships, listPhotos, listSeries } from "../community-content/content-repository.server";
import { listEvents } from "../activities/event-repository.server";
import { listPublicEvents } from "../activities/event-public";
import { safeBlogLink, walkBlog, type BlogDocument } from "./blog-document";
import type { BlogAuthor, BlogDraft, BlogEventRef, BlogImage, BlogPost, BlogSummary } from "./blog-schema";
import type { CommunityPhoto } from "../community-content/content-schema";

type Environment = Pick<CloudflareEnv, "DB" | "MEDIA">;
type AuthorRow = Omit<BlogAuthor, "active"> & { active: number };
type PostRow = Omit<BlogPost, "draft"> & { draftJson: string };
type ArticleRow = BlogSummary & { id: string; revisionId: string; sourceUrl: string | null; bodyJson: string };
export type BlogPhoto = Pick<CommunityPhoto, "id" | "alt" | "url" | "thumbnailUrl" | "width" | "height">;

const POST_SELECT = "SELECT id,slug,version,draft_json AS draftJson,published_revision_id AS revisionId,updated_at AS updatedAt FROM blog_posts";
const SUMMARY = "p.slug,r.title,r.summary,r.display_date AS displayDate,r.locale,a.display_name AS author";
const PUBLISHED = "FROM blog_posts p JOIN blog_revisions r ON r.id=p.published_revision_id JOIN blog_authors a ON a.id=r.author_id";
const NEWEST = "ORDER BY r.display_date DESC,r.published_at DESC,p.id";
const authorRecord = (row: AuthorRow) => ({ ...row, active: row.active === 1 });
const postRecord = ({ draftJson, ...row }: PostRow): BlogPost => ({ ...row, draft: JSON.parse(draftJson) as BlogDraft });
export const adminBlogImageUrl = (id: string) => "/api/v1/admin/blog/images/" + encodeURIComponent(id);
export const publicBlogImageUrl = (slug: string, id: string) => "/media/blog/" + encodeURIComponent(slug) + "/" + encodeURIComponent(id);

export async function listBlogAuthors(db: D1Database) {
  const rows = await db.prepare("SELECT id,display_name AS displayName,active,version FROM blog_authors ORDER BY active DESC,display_name,id").all<AuthorRow>();
  return rows.results.map(authorRecord);
}

export async function getBlogAuthor(db: D1Database, id: string) {
  const row = await db.prepare("SELECT id,display_name AS displayName,active,version FROM blog_authors WHERE id=?").bind(id).first<AuthorRow>();
  return row ? authorRecord(row) : null;
}

export async function getBlogPost(db: D1Database, id: string) {
  const row = await db.prepare(POST_SELECT + " WHERE id=?").bind(id).first<PostRow>();
  return row ? postRecord(row) : null;
}

export async function findBlogSource(db: D1Database, url: string) {
  return db.prepare(`SELECT p.id FROM blog_posts p LEFT JOIN blog_revisions r ON r.id=p.published_revision_id
    WHERE p.draft_source_url=?1 OR r.source_url=?1 ORDER BY p.updated_at DESC LIMIT 1`).bind(url).first<{ id: string }>();
}

export async function listBlogDrafts(db: D1Database) {
  const rows = await db.prepare(`SELECT p.id,p.slug,p.version,p.published_revision_id AS revisionId,p.updated_at AS updatedAt,
    json_extract(p.draft_json,'$.title') AS title,json_extract(p.draft_json,'$.displayDate') AS displayDate,
    a.display_name AS author,
    EXISTS(SELECT 1 FROM blog_revisions r WHERE r.post_id=p.id) AS hasPublication
    FROM blog_posts p LEFT JOIN blog_authors a ON a.id=json_extract(p.draft_json,'$.authorId')
    ORDER BY p.updated_at DESC,p.id`).all<{
    id: string; slug: string; version: number; revisionId: string | null; updatedAt: string;
    title: string; displayDate: string; author: string | null; hasPublication: number;
  }>();
  return rows.results;
}

export async function listPublicBlogPosts(db: D1Database, limit: number, offset: number) {
  return (await db.prepare(`SELECT ${SUMMARY} ${PUBLISHED} ${NEWEST} LIMIT ? OFFSET ?`)
    .bind(limit, offset).all<BlogSummary>()).results;
}

export async function getPublicBlogRevision(db: D1Database, slug: string) {
  const row = await db.prepare(`SELECT ${SUMMARY},p.id,r.id AS revisionId,r.source_url AS sourceUrl,r.body_json AS bodyJson
    ${PUBLISHED} WHERE p.slug=?`).bind(slug).first<ArticleRow>();
  if (!row) return null;
  const { bodyJson, ...article } = row;
  return { ...article, body: JSON.parse(bodyJson) as BlogDocument };
}

export async function listEventBlogPosts(db: D1Database, event: BlogEventRef) {
  return (await db.prepare(`SELECT ${SUMMARY} ${PUBLISHED}
    JOIN blog_revision_events link ON link.revision_id=r.id WHERE link.kind=? AND link.event_id=? ${NEWEST}`)
    .bind(event.kind, event.id).all<BlogSummary>()).results;
}

export async function listSeriesBlogPosts(db: D1Database, id: string, events: BlogEventRef[]) {
  const rows = await db.prepare(`SELECT ${SUMMARY}, (SELECT json_group_array(link.event_id) FROM blog_revision_events link
    WHERE link.revision_id=r.id AND link.kind='archive' AND link.event_id IN (SELECT value FROM json_each(?3))) AS archiveIds
    ${PUBLISHED}
    WHERE EXISTS (SELECT 1 FROM blog_revision_series link WHERE link.revision_id=r.id AND link.series_id=?1)
       OR EXISTS (SELECT 1 FROM blog_revision_events link WHERE link.revision_id=r.id AND (
         (link.kind='managed' AND link.event_id IN (SELECT value FROM json_each(?2))) OR
         (link.kind='archive' AND link.event_id IN (SELECT value FROM json_each(?3)))))
    ${NEWEST}`).bind(
      id,
      JSON.stringify(events.filter(event => event.kind === "managed").map(event => event.id)),
      JSON.stringify(events.filter(event => event.kind === "archive").map(event => event.id)),
    ).all<BlogSummary & { archiveIds: string }>();
  return rows.results.map(({ archiveIds, ...post }) => ({ ...post, archiveIds: JSON.parse(archiveIds) as string[] }));
}

function publicPhoto({ id, alt, url, thumbnailUrl, width, height }: CommunityPhoto): BlogPhoto {
  return { id, alt, url, thumbnailUrl, width, height };
}

export function blogImageReferences(body: BlogDocument) {
  const uploads = new Set<string>();
  const photos = new Set<string>();
  let pending = false;
  let embedWithoutUrl = false;
  let hasContent = false;
  walkBlog(body, node => {
    if (node.type === "text" && node.text?.trim()) hasContent = true;
    if (node.type === "blogEmbed" && !node.attrs?.href) embedWithoutUrl = true;
    if (node.type !== "blogImage") return;
    const ref = String(node.attrs?.ref);
    const kind = node.attrs?.kind;
    if (kind === "upload") uploads.add(ref);
    if (kind === "photo") photos.add(ref);
    if (kind === "pending") pending = true;
    if (kind !== "pending") hasContent = true;
  });
  return { uploads: [...uploads], photos: [...photos], pending, embedWithoutUrl, hasContent };
}

export async function loadAdminBlogOptions(env: Environment) {
  const [series, events, archive, photos, memberships, authors] = await Promise.all([
    listSeries(env.DB), listEvents(env.DB), listArchiveEvents(env).catch(() => null),
    listPhotos(env.DB), getEventSeriesMemberships(env.DB), listBlogAuthors(env.DB),
  ]);
  const seriesByEvent = new Map(memberships.map(item => [item.eventId, item.seriesId]));
  return {
    series: series.map(({ id, name, status }) => ({ id, name, status })),
    events: [
      ...events.map(({ id, title, status, eventDate }) => ({ id, title, status, date: eventDate, kind: "managed" as const, seriesId: seriesByEvent.get(id) ?? null })),
      ...(archive ?? []).map(({ id, title, status, publishedDate, seriesId }) => ({ id, title, status, date: publishedDate, kind: "archive" as const, seriesId })),
    ],
    photos: photos.map(({ id, alt, status, width, height }) => ({
      id, alt, status, width, height,
      url: "/api/v1/admin/photos/" + encodeURIComponent(id) + "/preview",
    })),
    archiveAvailable: archive !== null,
    authors,
  };
}
export type BlogOptions = Awaited<ReturnType<typeof loadAdminBlogOptions>>;

export async function loadPublicBlog(env: Environment, slug: string) {
  const post = await getPublicBlogRevision(env.DB, slug);
  if (!post) return null;
  const { DB: db } = env;
  const revision = post.revisionId;
  const imageRefs = blogImageReferences(post.body);
  const [seriesRows, eventRows, photoRows, imageRows] = await db.batch([
    db.prepare(`SELECT id,slug,name FROM community_series WHERE status='published' AND id IN
      (SELECT series_id FROM blog_revision_series WHERE revision_id=?) ORDER BY sort_order,name`).bind(revision),
    db.prepare("SELECT kind,event_id AS id FROM blog_revision_events WHERE revision_id=? ORDER BY kind,event_id").bind(revision),
    db.prepare("SELECT photo_id AS id FROM blog_revision_photos WHERE revision_id=? ORDER BY position").bind(revision),
    db.prepare(`SELECT i.id,i.width,i.height FROM blog_images i JOIN blog_revision_images l ON l.image_id=i.id WHERE l.revision_id=?`).bind(revision),
  ]);
  const eventRefs = eventRows.results as BlogEventRef[];
  const neededPhotos = new Set([...(photoRows.results as { id: string }[]).map(row => row.id), ...imageRefs.photos]);
  const [photos, managed, archive, publicSeries] = await Promise.all([
    neededPhotos.size ? listPhotos(db, true) : [],
    eventRefs.some(event => event.kind === "managed") ? listPublicEvents(db) : [],
    eventRefs.some(event => event.kind === "archive") ? listArchiveEvents(env, true).catch(() => []) : [],
    eventRefs.length ? listSeries(db, true) : [],
  ]);
  const series = new Map((seriesRows.results as { id: string; slug: string; name: string }[]).map(item => [item.id, { slug: item.slug, name: item.name }]));
  const publicSeriesByHref = new Map(publicSeries.map(item => ["/series/" + encodeURIComponent(item.slug), item]));
  const publicSeriesById = new Map(publicSeries.map(item => [item.id, item]));
  const managedById = new Map(managed.map(event => [event.id, event]));
  const archiveById = new Map(archive.map(event => [event.id, event]));
  const events = eventRefs.flatMap(ref => {
    if (ref.kind === "managed") {
      const event = managedById.get(ref.id);
      if (!event) return [];
      const linkedSeries = event.seriesUrl && publicSeriesByHref.get(event.seriesUrl);
      if (linkedSeries) series.set(linkedSeries.id, { slug: linkedSeries.slug, name: linkedSeries.name });
      return [{ href: event.publicUrl, title: event.title }];
    }
    const event = archiveById.get(ref.id);
    if (!event) return [];
    const linkedSeries = event.seriesId && publicSeriesById.get(event.seriesId);
    if (linkedSeries) series.set(linkedSeries.id, { slug: linkedSeries.slug, name: linkedSeries.name });
    const href = safeBlogLink(event.articleUrl);
    return href ? [{ href, title: event.title }] : [];
  });

  const photoMap = new Map(photos.filter(photo => neededPhotos.has(photo.id)).map(photo => [photo.id, publicPhoto(photo)]));
  const gallery = (photoRows.results as { id: string }[]).flatMap(({ id }) => {
    const photo = photoMap.get(id);
    return photo ? [photo] : [];
  });
  return {
    slug: post.slug, title: post.title, summary: post.summary, author: post.author, displayDate: post.displayDate,
    locale: post.locale, body: post.body, sourceUrl: post.sourceUrl, revisionId: post.revisionId,
    series: [...series.values()],
    events,
    gallery,
    photos: [...photoMap.values()],
    images: (imageRows.results as Omit<BlogImage, "url">[]).map(image => ({ ...image, url: publicBlogImageUrl(slug, image.id) })),
  };
}
