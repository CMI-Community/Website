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
import { Button, Dialog } from "../components/ui";

export function RecapBook() {
  const { recapHref, t } = useI18n();

  return (
    <a
      className="hero-recap-book"
      href={recapHref}
      aria-label={t("hero.recapAria")}
    >
      <span className="hero-recap-book__page-edges" aria-hidden="true" />
      <span className="hero-recap-book__cover">
        <img
          src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/recap/lanna-field-notes-cover.jpg"
          alt=""
          aria-hidden="true"
        />
        <span className="hero-recap-book__cover-shade" aria-hidden="true" />
        <span className="hero-recap-book__cover-frame" aria-hidden="true" />
        <span className="hero-recap-book__cover-copy">
          <span className="hero-recap-book__kicker">
            {t("hero.recapKicker")}
          </span>
          <strong>{t("hero.recapTitle")}</strong>
          <span className="hero-recap-book__edition">
            {t("hero.recapEdition")}
          </span>
          <span className="hero-recap-book__mobile-cta">
            {t("hero.recapCta")}
            <ArrowRight size={18} weight="bold" />
          </span>
        </span>
      </span>

      <span className="hero-recap-book__spine" aria-hidden="true" />

      <span className="hero-recap-book__page">
        <span className="hero-recap-book__folio">CMI / FIELD NOTES / 01</span>
        <span className="hero-recap-book__chapter">
          {t("hero.recapChapter")}
        </span>
        <strong>{t("hero.recapPageTitle")}</strong>
        <span className="hero-recap-book__summary">
          {t("hero.recapSummary")}
        </span>
        <span className="hero-recap-book__topics">
          {t("hero.recapTopics")}
        </span>
        <span className="hero-recap-book__cta">
          {t("hero.recapCta")}
          <ArrowRight size={19} weight="bold" />
        </span>
        <span className="hero-recap-book__page-number">01</span>
      </span>
    </a>
  );
}

export function Hero() {
  const { t } = useI18n();
  const scrollToCollect = () => {
    document.getElementById("collect")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="top" className="hero">
      <img
        className="hero__art"
        src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/decor/lanna-history-ribbon.jpg"
        alt=""
        aria-hidden="true"
      />
      <div className="hero__layout">
        <div className="hero__content hero__content--intro">
          <div className="hero__series">
            <span>{t("hero.series")}</span>
            <span>{t("hero.event")}</span>
          </div>
          <h1>
            <span>{t("hero.headlineBefore")}</span>
            <em>Lanna</em>
            <span>{t("hero.headlineAfter")}</span>
          </h1>
          <div className="hero__subtitle">
            <Sparkle size={23} weight="fill" />
            {t("hero.subtitle")}
            <Sparkle size={17} weight="fill" />
          </div>

          <div className="hero__credits">
            <div
              className="initiator"
              aria-label={`WaytoAGI ${t("hero.initiator")}`}
            >
              <img
                src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/brand/waytoagi-logo-transparent.svg"
                alt="WaytoAGI"
              />
              <span>{t("hero.initiator")}</span>
            </div>
            <div className="hero__venue-credit">{t("hero.venue")}</div>
          </div>
        </div>

        <div className="hero-recap-entry">
          <RecapBook />
          <p className="hero-recap-entry__hint">
            <ArrowRight size={18} weight="bold" />
            {t("hero.recapHint")}
          </p>
        </div>

        <div className="hero__content hero__content--details">
          <dl className="hero__facts">
            <div>
              <dt>
                <CalendarBlank size={19} />
                {t("hero.timeLabel")}
              </dt>
              <dd>{t("hero.time")}</dd>
            </div>
            <div>
              <dt>
                <MapPin size={19} />
                {t("hero.placeLabel")}
              </dt>
              <dd>CMI Studio</dd>
            </div>
            <div>
              <dt>
                <Buildings size={19} />
                {t("hero.locationLabel")}
              </dt>
              <dd>{t("hero.location")}</dd>
            </div>
          </dl>

          <div className="hero__actions">
            <Button
              className="ended-button"
              disabled
              icon={<CheckCircle size={21} weight="fill" />}
            >
              {t("signup.action")}
            </Button>
            <Button
              variant="outline"
              className="hero__collect-button"
              onClick={scrollToCollect}
              icon={<Camera size={21} />}
            >
              {t("hero.collect")}
            </Button>
          </div>

          <aside
            className="hero-followup"
            aria-label={t("signup.followupLabel")}
          >
            <div className="hero-followup__qr">
              <img
                src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/registration/cmi-official-account-qr.jpg"
                alt={t("signup.qrAlt")}
              />
            </div>
            <div className="hero-followup__copy">
              <span className="hero-followup__kicker">
                {t("signup.kicker")}
              </span>
              <strong>{t("signup.followupTitle")}</strong>
              <p>{t("signup.description")}</p>
              <small>{t("signup.qrNotice")}</small>
              <div className="hero-followup__contact">
                <span>{t("signup.contactTitle")}</span>
                <strong>
                  {t("signup.wechatLabel")} · LinkLinkGuan
                </strong>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <button
        className="scroll-cue"
        type="button"
        onClick={() =>
          document.getElementById("works")?.scrollIntoView({ behavior: "smooth" })
        }
      >
        {t("hero.worksCue")}
        <ArrowDown size={18} />
      </button>
    </section>
  );
}
