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

export function Manifesto() {
  const { t } = useI18n();
  return (
    <section id="about" className="manifesto">
      <img
        className="manifesto__ribbon"
        src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/decor/lanna-history-ribbon.jpg"
        alt=""
        aria-hidden="true"
      />
      <div className="manifesto__content">
        <div className="section-kicker">{t("manifesto.kicker")}</div>
        <h2>
          {t("manifesto.title1")}
          <br />
          {t("manifesto.title2")}{" "}
          <strong>{t("manifesto.pattern")}</strong>
          {t("manifesto.title3")}
        </h2>
        <p className="manifesto__intro">{t("manifesto.intro")}</p>
        <p className="manifesto__creative">
          <Sparkle size={24} weight="fill" />
          {t("manifesto.creative1")}
          <span>{t("manifesto.creative2")}</span>
        </p>
        <h3>{t("manifesto.outcomeTitle")}</h3>
        <p className="manifesto__outcome">{t("manifesto.outcome")}</p>
        <div className="manifesto__credits">{t("manifesto.credits")}</div>
        <a className="manifesto__next" href="#journey">
          {t("manifesto.next")}
          <ArrowDown size={18} />
        </a>
      </div>
    </section>
  );
}
