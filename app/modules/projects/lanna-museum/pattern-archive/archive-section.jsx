import { useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowLeft, ArrowDown, ArrowRight, Binoculars, Buildings, CalendarBlank,
  Camera, CaretDown, Check, CheckCircle, Clock, Cube, DownloadSimple,
  GameController, GlobeHemisphereWest, IdentificationCard, ImageSquare,
  Images, List, MagicWand, MapPin, NotePencil, Palette, PenNib, Play,
  Shuffle, SpeakerHigh, Sparkle, SquaresFour, Ticket, UploadSimple,
  VideoCamera, X,
} from "@phosphor-icons/react";

import { getFilterOptions, localizePattern } from "../content/content-i18n";
import { useI18n } from "../content/i18n";
import { formatPatternCapturedAt } from "./archive-client";

export function ArchiveSection({ patterns, onOpenPattern }) {
  const { language, t } = useI18n();
  const [filters, setFilters] = useState({
    museum: "all",
    carrier: "all",
    structure: "all",
  });
  const localizedFilterOptions = useMemo(
    () => getFilterOptions(language),
    [language],
  );

  const localizedPatterns = useMemo(
    () => patterns
      .filter((pattern) => {
        const museumMatch =
          filters.museum === "all" || pattern.museum === filters.museum;
        const carrierMatch =
          filters.carrier === "all" ||
          pattern.carrier_tags?.includes(filters.carrier);
        const structureMatch =
          filters.structure === "all" ||
          pattern.structure_tags?.includes(filters.structure);
        return museumMatch && carrierMatch && structureMatch;
      })
      .map((pattern) => localizePattern(pattern, language)),
    [filters, language, patterns],
  );

  return (
    <section id="archive" className="archive-section">
      <div className="section-shell">
        <div className="section-heading section-heading--split">
          <div>
            <div className="section-kicker">{t("archive.kicker")}</div>
            <h2>{t("archive.title")}</h2>
          </div>
          <p>{t("archive.intro")}</p>
        </div>

        <div className="archive-toolbar">
          <div className="archive-toolbar__filters">
            {Object.entries(localizedFilterOptions).map(([name, options]) => (
              <label key={name}>
                <span className="sr-only">
                  {name === "museum"
                    ? t("archive.museumFilter")
                    : name === "carrier"
                      ? t("archive.carrierFilter")
                      : t("archive.structureFilter")}
                </span>
                <select
                  value={filters[name]}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      [name]: event.target.value,
                    }))
                  }
                >
                  {options.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <CaretDown size={16} />
              </label>
            ))}
          </div>
          <span>{t("archive.count", { count: localizedPatterns.length })}</span>
        </div>

        {localizedPatterns.length ? (
          <div className="archive-grid">
            {localizedPatterns.map((pattern) => (
              <button
                type="button"
                className="archive-tile"
                key={pattern.id}
                onClick={() => onOpenPattern(pattern)}
              >
                <img
                  src={pattern.detail_image_urls?.[0]}
                  alt={pattern.source_title}
                  loading="lazy"
                />
                <span className="archive-tile__number">
                  {pattern.archive_number}
                </span>
                <span className="archive-tile__collector">
                  {t("archive.tileCollector", {
                    name:
                      pattern.collector_name?.trim() || t("archive.anonymous"),
                  })}
                </span>
                <span className="archive-tile__hover">
                  <strong>{pattern.source_title}</strong>
                  <small>
                    {formatPatternCapturedAt(
                      pattern,
                      {
                        month: "2-digit",
                        day: "2-digit",
                      },
                      true,
                      language === "th"
                        ? "th-TH-u-ca-gregory"
                        : language === "en"
                          ? "en-GB"
                          : "zh-CN",
                    )}
                  </small>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="archive-state archive-state--empty">
            <Images size={34} />
            <h3>{t("archive.noMatches")}</h3>
            <p>{t("archive.noMatchesHelp")}</p>
            <a className="button button--primary" href="#collect">
              <span>{t("archive.start")}</span>
              <ArrowRight size={18} />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
