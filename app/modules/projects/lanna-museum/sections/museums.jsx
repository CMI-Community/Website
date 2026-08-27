import { useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowLeft, ArrowDown, ArrowRight, Binoculars, Buildings, CalendarBlank,
  Camera, CaretDown, Check, CheckCircle, Clock, Cube, DownloadSimple,
  GameController, GlobeHemisphereWest, IdentificationCard, ImageSquare,
  Images, List, MagicWand, MapPin, NotePencil, Palette, PenNib, Play,
  Shuffle, SpeakerHigh, Sparkle, SquaresFour, Ticket, UploadSimple,
  VideoCamera, X,
} from "@phosphor-icons/react";

import { getMuseums } from "../content/content-i18n";
import { useI18n } from "../content/i18n";
import { Button } from "../components/ui";

export function MuseumSection() {
  const { language, t } = useI18n();
  const [hoveredMuseum, setHoveredMuseum] = useState(null);
  const localizedMuseums = useMemo(() => getMuseums(language), [language]);

  return (
    <section id="museums" className="museum-section">
      <div className="museum-section__heading">
        <div className="section-kicker section-kicker--light">
          {t("museums.kicker")}
        </div>
        <h2>{t("museums.title")}</h2>
        <p>{t("museums.intro")}</p>
      </div>

      <div
        className={`museum-stage ${
          hoveredMuseum ? `museum-stage--${hoveredMuseum}` : ""
        }`}
        onMouseLeave={() => setHoveredMuseum(null)}
      >
        {localizedMuseums.map((museum) => (
            <article
              key={museum.id}
              className={`museum-card museum-card--${museum.id}`}
              tabIndex={0}
              onMouseEnter={() => setHoveredMuseum(museum.id)}
              onFocus={() => setHoveredMuseum(museum.id)}
              onBlur={() => setHoveredMuseum(null)}
            >
              <img
                src={museum.image}
                alt={t("museums.sceneAlt", { name: museum.chineseName })}
                className="museum-card__image"
              />
              <div className="museum-card__wash" />
              <div className="museum-card__index">{museum.index}</div>
              <div className="museum-card__content">
                <div className="museum-card__title">
                  <span>{museum.name}</span>
                  <h3>{museum.chineseName}</h3>
                </div>
                <p>{museum.description}</p>
                <dl>
                  <div>
                    <MapPin size={18} />
                    <span>{museum.address}</span>
                  </div>
                  <div>
                    <Clock size={18} />
                    <span>{museum.hours}</span>
                  </div>
                  <div>
                    <Buildings size={18} />
                    <span>{museum.ticket}</span>
                  </div>
                </dl>
                <div className="museum-card__actions">
                  <a
                    className="button button--light"
                    href={museum.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <GlobeHemisphereWest size={18} />
                    <span>{t("museums.website")}</span>
                  </a>
                  <a
                    className="button button--ghost-light"
                    href={museum.map}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MapPin size={18} />
                    <span>{t("museums.map")}</span>
                  </a>
                </div>
                <small>{t("museums.source", { source: museum.source })}</small>
              </div>
            </article>
          ))}
      </div>

      <div className="museum-mobile-indicator" aria-hidden="true">
        <span>1</span>
        <i />
        <span>2</span>
      </div>
    </section>
  );
}
