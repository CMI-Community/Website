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
import { Button } from "./ui";

export function Footer() {
  const { projectHref, t, view } = useI18n();
  const homeHref = view === "recap" ? projectHref : "#top";
  return (
    <footer className="site-footer">
      <div className="site-footer__art" aria-hidden="true">
        <img src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/decor/lanna-history-ribbon.jpg" alt="" />
      </div>
      <div className="site-footer__content">
        <div>
          <div className="section-kicker section-kicker--light">
            JULY 26 · CMI STUDIO
          </div>
          <h2>{t("footer.title")}</h2>
          <p>{t("footer.intro")}</p>
        </div>
        <Button variant="accent" className="ended-button" disabled>
          {t("signup.action")}
        </Button>
      </div>
      <div className="site-footer__bottom">
        <a className="brand-lockup brand-lockup--light" href={homeHref}>
          <img src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/brand/cmi-community.svg" alt="" />
          <span>CMI Community</span>
        </a>
        <span>{t("footer.credits")}</span>
        <span>{t("footer.location")}</span>
      </div>
    </footer>
  );
}
