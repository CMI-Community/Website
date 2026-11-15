import { z } from "zod";

export const publicationStatus = z.enum(["draft", "published", "unpublished"]);
const nullableId = z.string().trim().min(1).max(160).nullable();
export const seriesInputSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9-]{1,79}$/),
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(2000).default(""),
    logoMediaId: nullableId.default(null),
    status: publicationStatus.default("draft"),
    sortOrder: z.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();
export const photoInputSchema = z
  .object({
    mediaId: z.string().trim().min(1).max(160),
    alt: z.string().trim().min(1).max(300),
    status: publicationStatus.default("draft"),
    seriesId: nullableId.default(null),
    eventId: nullableId.default(null),
    sortOrder: z.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();
export const archivePatchSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    summary: z.string().trim().max(2000),
    category: z.string().trim().max(80),
    initiator: z.string().trim().max(160),
    seriesId: nullableId,
    status: publicationStatus,
  })
  .partial()
  .strict();
export type SeriesInput = z.infer<typeof seriesInputSchema>;
export type PhotoInput = z.infer<typeof photoInputSchema>;
export type PublicationStatus = z.infer<typeof publicationStatus>;
export interface CommunitySeries extends SeriesInput {
  id: string;
  version: number;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CommunityPhoto {
  id: string;
  alt: string;
  mediaId: string | null;
  legacyFullPath: string | null;
  legacyThumbnailPath: string | null;
  width: number;
  height: number;
  status: PublicationStatus;
  seriesId: string | null;
  eventId: string | null;
  sortOrder: number;
  version: number;
  url: string;
  thumbnailUrl: string;
  createdAt: string;
  updatedAt: string;
}
export interface EventSeriesMembership {
  eventId: string;
  seriesId: string | null;
  version: number;
}
