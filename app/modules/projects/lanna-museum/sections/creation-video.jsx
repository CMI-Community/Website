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

export function CreationVideo() {
  const { t } = useI18n();
  return (
    <section className="creation-video" aria-labelledby="creation-video-title">
      <div className="creation-video__copy">
        <div className="section-kicker section-kicker--light">
          FROM IDEA TO WORK
        </div>
        <h2 id="creation-video-title">{t("video.title")}</h2>
        <p>{t("video.intro")}</p>
        <div className="creation-video__credit">
          <span>{t("video.creditLabel")}</span>
          <p>
            {t("video.creditBefore")}{" "}
            <strong>{t("video.creditName")}</strong>
            {t("video.creditAfter")}
          </p>
        </div>
        <div className="creation-video__labels">
          <span>{t("video.example")}</span>
          <span>{t("video.reimagined")}</span>
          <span>{t("video.nonHistorical")}</span>
        </div>
      </div>
      <div className="creation-video__player">
        <video
          controls
          playsInline
          preload="metadata"
          poster="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/video/lanna-ai-creation-poster.webp"
        >
          <source
            src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/video/lanna-ai-creation.mp4"
            type="video/mp4"
          />
          {t("video.unsupported")}
        </video>
        <div className="creation-video__playmark" aria-hidden="true">
          <Play size={26} weight="fill" />
        </div>
      </div>
    </section>
  );
}
