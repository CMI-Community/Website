import type { PublicProjectIssue, PublicProjectSeries, ProjectLocale } from "./project-catalog";
import { getProjectIssuePath, PROJECT_LOCALES } from "./project-catalog";
import type { ProjectView } from "./project-path";

interface ProjectMetaData {
  locale: ProjectLocale;
  view: ProjectView;
  series: PublicProjectSeries;
  issue: PublicProjectIssue;
}

const COPY = {
  "zh-CN": {
    projectTitle: "博物馆奇妙日",
    recapLabel: "活动回顾",
    description: "7月26日，WaytoAGI 切磋大会相聚 CMI Studio。走进清迈博物馆采集兰纳纹样，用 AI 把真实观察变成网页、影像、智能体、游戏与更多共创作品。",
    imageAlt: "WaytoAGI 切磋大会第 26 期，博物馆奇妙日清迈场",
  },
  en: {
    projectTitle: "Lanna Museum Day",
    recapLabel: "Event recap",
    description: "On July 26, the WaytoAGI AI Skills Exchange gathered at CMI Studio to collect Lanna patterns in Chiang Mai museums and turn real observations into shared AI creations.",
    imageAlt: "WaytoAGI AI Skills Exchange issue 26, Lanna Museum Day in Chiang Mai",
  },
  th: {
    projectTitle: "วันมหัศจรรย์แห่งพิพิธภัณฑ์ล้านนา",
    recapLabel: "สรุปกิจกรรม",
    description: "วันที่ 26 กรกฎาคม กิจกรรม WaytoAGI ที่ CMI Studio ชวนผู้เข้าร่วมเก็บลวดลายล้านนาจากพิพิธภัณฑ์เชียงใหม่ แล้วต่อยอดสิ่งที่สังเกตจริงเป็นผลงานร่วมสร้างด้วย AI",
    imageAlt: "WaytoAGI ครั้งที่ 26 วันมหัศจรรย์แห่งพิพิธภัณฑ์ล้านนา เชียงใหม่",
  },
} as const;

const OG_IMAGE = "https://cmi.community/media/projects/waytoagi/26-lanna-museum/v1/site/assets/social/lanna-museum-day-og.png";

export function projectRouteMeta(data: ProjectMetaData | undefined) {
  if (!data) return [{ title: "CMI Community｜项目" }];
  const copy = COPY[data.locale];
  const title = data.view === "recap"
    ? `${copy.projectTitle} · ${copy.recapLabel}｜CMI Community`
    : `${copy.projectTitle}｜CMI Community`;
  const canonicalPath = getProjectIssuePath(
    data.series,
    data.issue,
    data.locale,
    data.view,
  );
  const canonical = `https://cmi.community${canonicalPath}`;
  const alternates = PROJECT_LOCALES.map((locale) => ({
    tagName: "link" as const,
    rel: "alternate",
    hrefLang: locale === "zh-CN" ? "zh-CN" : locale,
    href: `https://cmi.community${getProjectIssuePath(
      data.series,
      data.issue,
      locale,
      data.view,
    )}`,
  }));
  const event = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `WaytoAGI #${data.issue.number} · ${copy.projectTitle}`,
    description: copy.description,
    startDate: "2026-07-26T12:30:00+07:00",
    endDate: "2026-07-26T17:30:00+07:00",
    eventStatus: "https://schema.org/EventCompleted",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: canonical,
    image: OG_IMAGE,
    inLanguage: data.locale,
    location: { "@type": "Place", name: "CMI Studio", address: { "@type": "PostalAddress", addressLocality: "Chiang Mai", addressCountry: "TH" } },
    organizer: { "@type": "Organization", name: "CMI Community", url: "https://cmi.community/" },
  };

  return [
    { title },
    { name: "description", content: copy.description },
    { tagName: "link", rel: "canonical", href: canonical },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "CMI Community" },
    { property: "og:title", content: title },
    { property: "og:description", content: copy.description },
    { property: "og:url", content: canonical },
    { property: "og:image", content: OG_IMAGE },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: copy.imageAlt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: copy.description },
    { name: "twitter:image", content: OG_IMAGE },
    ...alternates,
    {
      tagName: "link" as const,
      rel: "alternate",
      hrefLang: "x-default",
      href: `https://cmi.community${getProjectIssuePath(
        data.series,
        data.issue,
        "zh-CN",
        data.view,
      )}`,
    },
    { "script:ld+json": event },
  ];
}
