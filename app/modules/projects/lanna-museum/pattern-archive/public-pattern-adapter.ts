import type { PublicPatternEntry } from "../../archive-model/public-pattern-entry";

export interface LannaPatternViewModel {
  id: string;
  archive_number: string;
  museum: string;
  source_title: string;
  source_location: string;
  observation: string;
  verified_information: string;
  open_question: string;
  carrier_tags: string[];
  position_tags: string[];
  structure_tags: string[];
  material_tags: string[];
  collector_name: string;
  captured_at: string | null;
  created_at: string | null;
  published_at: string | null;
  detail_image_urls: string[];
  context_image_urls: string[];
  label_image_urls: string[];
}

export function toLannaPatternViewModel(entry: PublicPatternEntry): LannaPatternViewModel {
  const mediaFor = (role: "detail" | "context" | "label") =>
    entry.media
      .filter((item) => item.role === role)
      .sort((left, right) => left.order - right.order)
      .map((item) => item.src);

  return {
    id: entry.archiveNumber,
    archive_number: entry.archiveNumber,
    museum: entry.museumId,
    source_title: entry.title,
    source_location: entry.location,
    observation: entry.observation,
    verified_information: entry.verifiedInformation,
    open_question: entry.openQuestion,
    carrier_tags: entry.tags.carrier,
    position_tags: entry.tags.position,
    structure_tags: entry.tags.structure,
    material_tags: entry.tags.material,
    collector_name: entry.collectorName,
    captured_at: entry.capturedAt,
    created_at: entry.publishedAt,
    published_at: entry.publishedAt,
    detail_image_urls: mediaFor("detail"),
    context_image_urls: mediaFor("context"),
    label_image_urls: mediaFor("label"),
  };
}
