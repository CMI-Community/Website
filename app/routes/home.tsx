import { useEffect, useRef, useState } from "react";
import type { Route } from "./+types/home";
import {
  partitionActivities,
} from "../modules/activities/activity-catalog";
import { listPublicActivities, loadPublicPosterCatalog } from "../modules/activities/event-public";
import { ActivityTimeline } from "../modules/activities/components/ActivityTimeline";
import { CmiPosterWall } from "../modules/poster-wall/components/CmiPosterWall.jsx";
import { PhotoMuseum } from "../modules/photo-museum/components/PhotoMuseum";
import { ProjectMenu } from "../modules/projects/components/ProjectMenu";
import { listSeries, loadMuseumPhotoCatalog } from "../modules/community-content/content-repository.server";
import { HomeSeries, type HomeSeriesEntry } from "../modules/community-content/HomeSeries";
import { cloudflareContext } from "../shared/cloudflare-context";
import { COMMUNITY_LINKS, COMMUNITY_SOCIALS, type CommunitySocial } from "../shared/community-socials";
import "../modules/poster-wall/components/cmi-poster-wall.css";
import "./home.css";

type SectionId = "home" | "photo-museum" | "event-museum";

const SECTION_IDS: SectionId[] = ["home", "photo-museum", "event-museum"];

export function meta() {
  const title = "CMI Community｜清迈华人数字游民社区";
  const description = "CMI Community（2023—2026），一个在清迈的华人数字游民社区。Connect, Make, Impact。";
  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: "https://cmi.community/" },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "CMI Community" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: "https://cmi.community/" },
    { property: "og:image", content: "https://cmi.community/social/cmi-home-og.png" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: "https://cmi.community/social/cmi-home-og.png" },
  ];
}

export const headers = () => ({ "Cache-Control": "no-store, max-age=0" });

export async function loader({ context, request }: Route.LoaderArgs) {
  const { env } = context.get(cloudflareContext);
  const requestedActivityTime = new URL(request.url).searchParams.get("__activityNow");
  const activityReferenceTime = env.APP_ENV === "development"
    && requestedActivityTime
    && Number.isFinite(Date.parse(requestedActivityTime))
    ? new Date(requestedActivityTime)
    : new Date();
  const activities = await listPublicActivities(env.DB);
  const activityLifecycle = partitionActivities(activities, activityReferenceTime);
  const [photoResult, posterResult, seriesResult] = await Promise.allSettled([
    loadMuseumPhotoCatalog(env),
    loadPublicPosterCatalog(env),
    listSeries(env.DB, true),
  ]);
  // Event Museum assets are already public, versioned, and shared across
  // environments. Keeping this projection stable also makes local homepage
  // review useful without copying the complete poster archive into local R2.
  const posterAssetBase = "https://assets.cmi.community";
  const mergedEventPosters = posterResult.status === "fulfilled" ? posterResult.value.posters : [];

  return {
    activityTimeline: {
      upcoming: activityLifecycle.upcoming,
      ongoing: activityLifecycle.ongoing,
      completed: activityLifecycle.completed,
    },
    series: seriesResult.status === "fulfilled"
      ? seriesResult.value.map(({ slug, name, description, logoUrl }): HomeSeriesEntry => ({ slug, name, description, logoUrl }))
      : null,
    photoMuseum:
      photoResult.status === "fulfilled" && photoResult.value.length > 0
        ? {
            available: true as const,
            photos: photoResult.value,
            assetBase: "",
          }
        : { available: false as const, photos: [], assetBase: "" },
    eventMuseum:
      mergedEventPosters.length > 0
        ? {
            available: true as const,
            posters: mergedEventPosters,
            assetBase: `${posterAssetBase}/poster-wall/v1/posters/`,
          }
        : { available: false as const, posters: [], assetBase: "" },
  };
}

const socialLogos: Record<CommunitySocial["id"], string> = {
  official: "official.png",
  xiaohongshu: "xiaohongshu.jpg",
  bilibili: "bilibili.png",
  wechat: "wechat.jpg",
  github: "github.svg",
  reddit: "reddit.png",
  discord: "discord.svg",
};

function CommunityContacts() {
  const [qrOpen, setQrOpen] = useState(false);
  const [copyState, setCopyState] = useState("");

  useEffect(() => {
    if (!copyState) return undefined;
    const timer = window.setTimeout(() => setCopyState(""), 2200);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const copyWechat = async () => {
    try {
      await navigator.clipboard.writeText(COMMUNITY_LINKS.wechat);
      setCopyState("微信号已复制");
    } catch {
      setCopyState(`微信号：${COMMUNITY_LINKS.wechat}`);
    }
  };

  return (
    <aside className="home-social" aria-labelledby="home-social-title">
      <h2 className="home-social__heading" id="home-social-title">社区联系方式</h2>
      <div className="home-social__grid">
        {COMMUNITY_SOCIALS.map((social) => {
          const body = (
            <>
              <img className="home-social__logo" src={`/social/platforms/${socialLogos[social.id]}`} alt="" width={36} height={36} />
              <span className="home-social__copy">
                <b>{social.label}</b>
                <small>{social.detail}</small>
              </span>
              {"href" in social && <span className="home-social__arrow" aria-hidden="true">↗</span>}
            </>
          );

          if ("href" in social) {
            return (
              <a
                className="home-social__item"
                href={social.href}
                target="_blank"
                rel="noreferrer"
                key={social.id}
              >
                {body}
              </a>
            );
          }

          return (
            <button
              className="home-social__item"
              type="button"
              key={social.id}
              onClick={social.action === "qr" ? () => setQrOpen((value) => !value) : copyWechat}
              aria-expanded={social.action === "qr" ? qrOpen : undefined}
              aria-controls={social.action === "qr" && qrOpen ? "home-social-qr" : undefined}
            >
              {body}
            </button>
          );
        })}
      </div>

      {qrOpen && (
        <div className="home-social__qr" id="home-social-qr" role="dialog" aria-label="CMI 公众号二维码">
          <img src="/social/cmi-official-account-qr.jpg" alt="CMI 公众号关注二维码" />
          <div><b>微信扫码关注</b><span>公众号 · C M I</span></div>
          <button type="button" onClick={() => setQrOpen(false)} aria-label="关闭二维码">×</button>
        </div>
      )}
      {copyState && <p className="home-social__toast" role="status">{copyState}</p>}
    </aside>
  );
}

function MuseumUnavailable({ kind }: { kind: "photo" | "event" }) {
  return (
    <div className="home-museum-unavailable" role="status">
      <p>{kind === "photo" ? "PHOTO MUSEUM" : "EVENT MUSEUM"}</p>
      <h2>{kind === "photo" ? "照片档案正在连接" : "海报档案正在连接"}</h2>
      <span>这一座 Museum 暂时不可用，社区首页和另一座 Museum 不受影响。</span>
      <button type="button" onClick={() => window.location.reload()}>重新连接</button>
    </div>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const [navVisible, setNavVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("home");
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setNavVisible(entry.boundingClientRect.bottom <= 64 || !entry.isIntersecting),
      { threshold: 0, rootMargin: "-64px 0px 0px 0px" },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (section): section is HTMLElement => Boolean(section),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible && SECTION_IDS.includes(visible.target.id as SectionId)) {
          setActiveSection(visible.target.id as SectionId);
        }
      },
      { threshold: [0.2, 0.45, 0.7], rootMargin: "-12% 0px -46% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="cmi-home-page">
      <nav
        className="home-sticky-nav"
        data-visible={navVisible ? "true" : "false"}
        aria-label="首页区域导航"
        aria-hidden={!navVisible}
      >
        <a className="home-sticky-nav__brand" href="#home" tabIndex={navVisible ? 0 : -1} aria-current={activeSection === "home" ? "page" : undefined}>
          <img src="/brand/cmi-community-logo.png" alt="" />
          <span>CMI</span>
        </a>
        <div className="home-sticky-nav__sections">
          <a href="#photo-museum" tabIndex={navVisible ? 0 : -1} aria-current={activeSection === "photo-museum" ? "page" : undefined}>Photo Museum</a>
          <a href="#event-museum" tabIndex={navVisible ? 0 : -1} aria-current={activeSection === "event-museum" ? "page" : undefined}>Event Museum</a>
          <a href="https://tool.cmi.community/" tabIndex={navVisible ? 0 : -1}>工具</a>
          <a href="/cooperation" tabIndex={navVisible ? 0 : -1}>活动合作须知</a>
          {navVisible && <ProjectMenu placement="sticky" />}
        </div>
      </nav>

      <section className="home-hero" id="home" ref={heroRef} aria-labelledby="home-title">
        <div className="home-hero__grain" aria-hidden="true" />
        <header className="home-hero__topline">
          <a href="#home" className="home-hero__brand">
            <img src="/brand/cmi-community-logo.png" alt="CMI Community Logo" />
            <span>CMI COMMUNITY</span>
          </a>
          <nav className="home-hero__navigation" aria-label="首页顶部导航">
            <p className="home-hero__location"><span>CHIANG MAI</span><b>18.7883° N · 98.9853° E</b></p>
            <a className="home-hero__cooperation" href="/cooperation">活动合作须知</a>
            <a className="home-hero__cooperation" href="https://tool.cmi.community/">工具</a>
            <ProjectMenu placement="hero" />
          </nav>
        </header>

        <div className="home-hero__statement">
          <div className="home-hero__years"><span>2023</span><i /> <span>2026</span></div>
          <h1 id="home-title"><span>CMI</span> <em>Community</em></h1>
          <p className="home-hero__identity">一个在清迈的华人数字游民社区</p>
          <div className="home-hero__meaning" aria-label="CMI 的含义是 Connect、Make、Impact">
            <p><b>C</b><span>Connect</span><small>连接彼此</small></p>
            <p><b>M</b><span>Make</span><small>一起创造</small></p>
            <p><b>I</b><span>Impact</span><small>让影响发生</small></p>
          </div>
          <p className="home-hero__manifesto">连接彼此，一起创造，让影响发生。</p>
        </div>

        <ActivityTimeline {...loaderData.activityTimeline} />

        <HomeSeries series={loaderData.series} />

        <p className="home-cooperation-entry">
          <span>希望在 CMI 发起一场交流？</span>
          <a href="/cooperation">活动合作须知 <span aria-hidden="true">↗</span></a>
        </p>

        <nav className="home-museum-entries" aria-label="进入 CMI Museums">
          <a href="#photo-museum">
            <span className="home-museum-entry__index">01 / COMMUNITY MEMORY</span>
            <div><b>Photo</b><em>Museum</em></div>
            <p>看见一起生活、创造与相遇的现场</p>
            <span className="home-museum-entry__arrow" aria-hidden="true">↓</span>
          </a>
          <a href="#event-museum">
            <span className="home-museum-entry__index">02 / LIVING ARCHIVE</span>
            <div><b>Event</b><em>Museum</em></div>
            <p>进入 2023—2026 活动海报档案</p>
            <span className="home-museum-entry__arrow" aria-hidden="true">↓</span>
          </a>
        </nav>

        <CommunityContacts />
        <a className="home-hero__scroll-cue" href="#photo-museum"><span>向下进入社区记忆</span><b aria-hidden="true">↓</b></a>
      </section>

      <section className="home-photo-section" id="photo-museum" aria-label="Photo Museum">
        {loaderData.photoMuseum.available ? (
          <PhotoMuseum photos={loaderData.photoMuseum.photos} assetBase={loaderData.photoMuseum.assetBase} />
        ) : (
          <MuseumUnavailable kind="photo" />
        )}
      </section>

      <section className="home-event-section" id="event-museum" aria-label="Event Museum">
        {loaderData.eventMuseum.available ? (
          <CmiPosterWall
            posters={loaderData.eventMuseum.posters}
            assetBase={loaderData.eventMuseum.assetBase}
            height="100svh"
            showCommunityLinks={false}
            className="cmi-poster-wall--homepage"
          />
        ) : (
          <MuseumUnavailable kind="event" />
        )}
      </section>
    </main>
  );
}
