import { useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowLeft, ArrowDown, ArrowRight, Binoculars, Buildings, CalendarBlank,
  Camera, CaretDown, Check, CheckCircle, Clock, Cube, DownloadSimple,
  GameController, GlobeHemisphereWest, IdentificationCard, ImageSquare,
  Images, List, MagicWand, MapPin, NotePencil, Palette, PenNib, Play,
  Shuffle, SpeakerHigh, Sparkle, SquaresFour, Ticket, UploadSimple,
  VideoCamera, X,
} from "@phosphor-icons/react";

import { getParticipationSteps } from "../content/content-i18n";
import { useI18n } from "../content/i18n";

const toneColors = {
  purple: "#5c2683",
  orange: "#ec7623",
  green: "#4d9c54",
  cyan: "#1e9fbd",
  pink: "#e34f7d",
};

export function Journey() {
  const { language, t } = useI18n();
  const localizedSteps = useMemo(
    () => getParticipationSteps(language),
    [language],
  );
  return (
    <section id="journey" className="journey section-shell">
      <div className="section-heading section-heading--split">
        <div>
          <div className="section-kicker">{t("journey.kicker")}</div>
          <h2>{t("journey.title")}</h2>
        </div>
        <p>{t("journey.intro")}</p>
      </div>

      <ol className="fishbone">
        {localizedSteps.map((step, index) => (
          <li
            key={step.id}
            className={index % 2 === 0 ? "fishbone__item is-top" : "fishbone__item is-bottom"}
            style={{ "--step-color": toneColors[step.tone] }}
          >
            <div className="fishbone__node">
              <span>{step.id}</span>
              <Check size={13} weight="bold" />
            </div>
            <div className="fishbone__content">
              <span className="fishbone__phase">{step.phase}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="journey__cta">
        <a className="button button--primary" href="#museums">
          <span>{t("journey.choose")}</span>
          <ArrowDown size={19} />
        </a>
      </div>
    </section>
  );
}
