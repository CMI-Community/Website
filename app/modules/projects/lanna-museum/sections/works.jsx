import { useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowLeft, ArrowDown, ArrowRight, Binoculars, Buildings, CalendarBlank,
  Camera, CaretDown, Check, CheckCircle, Clock, Cube, DownloadSimple,
  GameController, GlobeHemisphereWest, IdentificationCard, ImageSquare,
  Images, List, MagicWand, MapPin, NotePencil, Palette, PenNib, Play,
  Shuffle, SpeakerHigh, Sparkle, SquaresFour, Ticket, UploadSimple,
  VideoCamera, X,
} from "@phosphor-icons/react";

import { useI18n } from "../content/i18n";
import { Dialog } from "../components/ui";

const getFeaturedWorks = (t) => [
  {
    id: "pattern-garden",
    number: "01",
    type: "website",
    medium: t("works.interactiveWebsite"),
    title: t("works.gardenTitle"),
    description: t("works.gardenDescription"),
    creator: t("works.gardenCreator"),
    cover: "/media/projects/waytoagi/26-lanna-museum/v1/site/assets/works/pattern-garden-cover.png",
    coverPosition: "50% 36%",
    href: "https://lanna-pattern-garden.vercel.app/",
  },
  {
    id: "video-work-01",
    number: "02",
    type: "video",
    medium: t("works.videoWork"),
    title: t("works.microTitle1"),
    description: (
      <>
        {t("works.microDescription1")}{" "}
        <strong className="work-description__emphasis">
          {t("works.microEmphasis")}
        </strong>
        {t("works.microDescription2")}
        <br />
        <br />
        {" "}
        {t("works.microDescription3")}
      </>
    ),
    creator: "Shindo Teenager Group",
    cover: "/media/projects/waytoagi/26-lanna-museum/v1/site/assets/works/lanna-video-work-01-cover.jpg",
    coverPosition: "50% 18%",
    videoSrc: "/media/projects/waytoagi/26-lanna-museum/v1/site/assets/works/lanna-video-work-01.mp4",
  },
  {
    id: "video-work-02",
    number: "03",
    type: "video",
    medium: t("works.videoWork"),
    title: t("works.microTitle2"),
    description: (
      <>
        {t("works.microDescription1")}{" "}
        <strong className="work-description__emphasis">
          {t("works.microEmphasis")}
        </strong>
        {t("works.microDescription2")}
        <br />
        <br />
        {" "}
        {t("works.microDescription3")}
      </>
    ),
    creator: "Shindo Teenager Group",
    cover: "/media/projects/waytoagi/26-lanna-museum/v1/site/assets/works/lanna-video-work-02-cover.jpg",
    coverPosition: "50% 45%",
    videoSrc: "/media/projects/waytoagi/26-lanna-museum/v1/site/assets/works/lanna-video-work-02.mp4",
  },
  {
    id: "event-recap",
    number: "04",
    type: "video",
    medium: t("works.eventRecap"),
    title: t("works.recapTitle"),
    description: t("works.recapDescription"),
    creator: t("works.creatorPending"),
    cover: "/media/projects/waytoagi/26-lanna-museum/v1/site/assets/works/lanna-event-recap-cover-v2.jpg",
    coverPosition: "50% 38%",
    videoSrc: "/media/projects/waytoagi/26-lanna-museum/v1/site/assets/works/lanna-event-recap.mp4",
  },
];

export function WorkCard({ work, onOpenVideo }) {
  const { t } = useI18n();
  const isWebsite = work.type === "website";
  const isVideo = Boolean(work.videoSrc);
  const CardTag = work.href ? "a" : "article";
  const cardProps = work.href
    ? {
        href: work.href,
        target: "_blank",
        rel: "noreferrer",
        "aria-label": t("works.open", { title: work.title }),
      }
    : isVideo
      ? {
          role: "button",
          tabIndex: 0,
          "aria-label": t("works.play", { title: work.title }),
          onClick: () => onOpenVideo(work),
          onKeyDown: (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpenVideo(work);
            }
          },
        }
      : {};

  return (
    <CardTag
      className={`work-card ${work.href || isVideo ? "is-interactive" : ""}`}
      {...cardProps}
    >
      <div className={`work-card__cover ${work.cover ? "has-cover" : "is-pending"}`}>
        {work.cover ? (
          <img
            src={work.cover}
            alt={t("works.coverAlt", { title: work.title })}
            style={
              work.coverPosition
                ? { objectPosition: work.coverPosition }
                : undefined
            }
          />
        ) : (
          <div className="work-card__cover-placeholder">
            <span>VIDEO COVER</span>
            <strong>{work.number}</strong>
          </div>
        )}
        <div className="work-card__media">
          {isWebsite ? (
            <GlobeHemisphereWest size={17} weight="bold" />
          ) : (
            <VideoCamera size={17} weight="bold" />
          )}
          {work.medium}
        </div>
        <span className="work-card__number">/ {work.number}</span>
      </div>

      <div className="work-card__body">
        <div className="work-card__title-row">
          <h3>{work.title}</h3>
          {work.href ? (
            <span className="work-card__open" aria-hidden="true">
              <ArrowRight size={21} weight="bold" />
            </span>
          ) : isVideo ? (
            <span className="work-card__play" aria-hidden="true">
              <Play size={17} weight="fill" />
            </span>
          ) : null}
        </div>
        <p>{work.description}</p>
        <div className="work-card__creator">
          <span>{t("works.creator")}</span>
          <strong>{work.creator}</strong>
        </div>
      </div>
    </CardTag>
  );
}

export function WorkVideoDialog({ work, onClose }) {
  const { t } = useI18n();
  if (!work) {
    return null;
  }

  return (
    <Dialog
      open
      onClose={onClose}
      label={t("works.play", { title: work.title })}
      size="wide"
    >
      <div className="work-video-dialog">
        <div className="work-video-dialog__copy">
          <div className="section-kicker section-kicker--light">
            VIDEO / {work.medium}
          </div>
          <h2>{work.title}</h2>
          <p>{work.description}</p>
          <div className="work-video-dialog__creator">
            <span>{t("works.creator")}</span>
            <strong>{work.creator}</strong>
          </div>
        </div>
        <div className="work-video-dialog__player">
          <video
            key={work.videoSrc}
            controls
            playsInline
            preload="metadata"
            poster={work.cover}
          >
            <source src={work.videoSrc} type="video/mp4" />
            {t("works.videoUnsupported")}
          </video>
        </div>
      </div>
    </Dialog>
  );
}

export function WorksShowcase() {
  const { t } = useI18n();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const worksRailRef = useRef(null);
  const featuredWorks = useMemo(() => getFeaturedWorks(t), [t]);

  const scrollWorks = (direction) => {
    const rail = worksRailRef.current;
    const firstCard = rail?.querySelector(".work-card");

    if (!rail || !firstCard) {
      return;
    }

    const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap) || 18;
    rail.scrollBy({
      left: direction * (firstCard.getBoundingClientRect().width + gap),
      behavior: "smooth",
    });
  };

  return (
    <>
      <section id="works" className="works-showcase" aria-labelledby="works-title">
        <div className="works-showcase__header">
          <div>
            <div className="section-kicker">{t("works.kicker")}</div>
            <h2 id="works-title">
              {t("works.titleLine1")}
              <br />
              {t("works.titleLine2")}
            </h2>
          </div>
          <div className="works-showcase__intro">
            <span>JUL 26 · CMI STUDIO</span>
            <p>{t("works.intro")}</p>
          </div>
        </div>

        <div className="works-showcase__rail-shell">
          <div className="works-showcase__rail-toolbar">
            <span>04 WORKS · HORIZONTAL VIEW</span>
            <div className="works-showcase__rail-actions">
              <button
                type="button"
                aria-label={t("works.previous")}
                onClick={() => scrollWorks(-1)}
              >
                <ArrowLeft size={20} weight="bold" />
              </button>
              <button
                type="button"
                aria-label={t("works.next")}
                onClick={() => scrollWorks(1)}
              >
                <ArrowRight size={20} weight="bold" />
              </button>
            </div>
          </div>
          <div
            ref={worksRailRef}
            className="works-showcase__rail"
            aria-label={t("works.railLabel")}
          >
          {featuredWorks.map((work) => (
            <WorkCard
              key={work.id}
              work={work}
              onOpenVideo={setSelectedVideo}
            />
          ))}
          </div>
        </div>

        <div className="works-showcase__footer">
          <span>01—04 / FIRST DROP</span>
          <p>{t("works.footer")}</p>
        </div>
      </section>
      <WorkVideoDialog
        work={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </>
  );
}
