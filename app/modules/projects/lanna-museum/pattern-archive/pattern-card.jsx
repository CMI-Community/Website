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
import { formatPatternCapturedAt } from "./archive-client";

export function PatternCard({ pattern, cardRef }) {
  const { language, t } = useI18n();
  const tags = [
    ...(pattern.carrier_tags || []),
    ...(pattern.structure_tags || []),
    ...(pattern.material_tags || []),
  ].slice(0, 5);
  const collectorName = pattern.collector_name?.trim() || t("archive.anonymous");
  const capturedAt = formatPatternCapturedAt(pattern, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }, false, language === "th" ? "th-TH-u-ca-gregory" : language === "en" ? "en-GB" : "zh-CN");

  return (
    <article className="pattern-card-export" ref={cardRef}>
      <header>
        <div className="pattern-card-export__brand">
          <img src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/brand/cmi-community.svg" alt="" />
          <span>CMI · LANNA PATTERN ARCHIVE</span>
        </div>
        <strong>{pattern.archive_number}</strong>
      </header>
      <div className="pattern-card-export__visual">
        <img
          src={pattern.detail_image_urls?.[0]}
          alt=""
          crossOrigin="anonymous"
        />
        <div className="pattern-card-export__context">
          <img
            src={pattern.context_image_urls?.[0]}
            alt=""
            crossOrigin="anonymous"
          />
        </div>
      </div>
      <div className="pattern-card-export__body">
        <div className="pattern-card-export__eyebrow">
          {pattern.museumLabel ||
            (pattern.museum === "fam"
              ? "FAM Fahlanna Art Museum"
              : t("taxonomy.lannaMuseum"))}
        </div>
        <div className="pattern-card-export__collector">
          <span>{t("archive.collectedBy")}</span>
          <strong>{collectorName}</strong>
          {capturedAt ? (
            <span className="pattern-card-export__captured-at">
              {t("archive.capturedAt", { date: capturedAt })}
            </span>
          ) : null}
        </div>
        <h3>{pattern.source_title}</h3>
        <div className="pattern-card-export__tags">
          {tags.map((tag, index) => (
            <span key={`${tag}-${index}`}>{tag}</span>
          ))}
        </div>
        <p>{pattern.observation}</p>
      </div>
      <footer>
        <span>{t("archive.footer1")}</span>
        <span>{t("archive.footer2")}</span>
      </footer>
    </article>
  );
}
