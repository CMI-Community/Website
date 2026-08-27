import { describe, expect, it } from "vitest";
import { PROJECT_SERIES } from "../app/modules/projects/project-catalog";
import { projectRouteMeta } from "../app/modules/projects/project-meta";

describe("project metadata", () => {
  it("emits localized canonical, hreflang, OG, and completed Event data", () => {
    const series = PROJECT_SERIES[0];
    const issue = series.issues[0];
    const meta = projectRouteMeta({ locale: "th", view: "recap", series, issue });
    expect(meta).toContainEqual({
      tagName: "link",
      rel: "canonical",
      href: "https://cmi.community/th/project/waytoagi/26-lanna-museum/recap",
    });
    expect(meta).toContainEqual(expect.objectContaining({
      property: "og:image",
      content: expect.stringContaining("/media/projects/waytoagi/26-lanna-museum/v1/"),
    }));
    expect(meta).toContainEqual(expect.objectContaining({ hrefLang: "x-default" }));
    expect(meta).toContainEqual({
      "script:ld+json": expect.objectContaining({
        "@type": "Event",
        eventStatus: "https://schema.org/EventCompleted",
        inLanguage: "th",
      }),
    });
  });
});
