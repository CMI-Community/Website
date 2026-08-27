import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowLeft, ArrowDown, ArrowRight, Binoculars, Buildings, CalendarBlank,
  Camera, CaretDown, Check, CheckCircle, Clock, Cube, DownloadSimple,
  GameController, GlobeHemisphereWest, IdentificationCard, ImageSquare,
  Images, List, MagicWand, MapPin, NotePencil, Palette, PenNib, Play,
  Shuffle, SpeakerHigh, Sparkle, SquaresFour, Ticket, UploadSimple,
  VideoCamera, X,
} from "@phosphor-icons/react";

import { archiveSamples } from "../content/base-content";
import { localizePattern } from "../content/content-i18n";
import { useI18n } from "../content/i18n";
import { generateIdea, getIdeaCategories } from "./ideas";

const ideaCategoryIcons = {
  any: Shuffle,
  writing: PenNib,
  image: Palette,
  video: VideoCamera,
  website: GlobeHemisphereWest,
  "3d": Cube,
  game: GameController,
  audio: SpeakerHigh,
  assistant: Sparkle,
  installation: Buildings,
};

export function PossibilityGenerator({ patterns: archivePatterns = [], preferredPattern }) {
  const { language, t } = useI18n();
  const patterns = archivePatterns.length
    ? archivePatterns
    : archiveSamples.slice(0, 18);
  const [currentPattern, setCurrentPattern] = useState(
    preferredPattern || patterns[0],
  );
  const [category, setCategory] = useState("any");
  const [idea, setIdea] = useState(() =>
    generateIdea(
      localizePattern(preferredPattern || patterns[0], language),
      "any",
      "",
      language,
    ),
  );
  const [ideaTurn, setIdeaTurn] = useState(0);
  const generatorRef = useRef(null);
  const localizedCategories = useMemo(
    () => getIdeaCategories(language),
    [language],
  );
  const localizedCurrentPattern = useMemo(
    () => localizePattern(currentPattern, language),
    [currentPattern, language],
  );

  useEffect(() => {
    if (!preferredPattern) {
      return;
    }

    setCurrentPattern(preferredPattern);
    setIdea((current) =>
      generateIdea(
        localizePattern(preferredPattern, language),
        category,
        current?.id,
        language,
      ),
    );
    setIdeaTurn((turn) => turn + 1);
  }, [preferredPattern, language, category]);

  useEffect(() => {
    setIdea((current) =>
      generateIdea(
        localizedCurrentPattern,
        category,
        current?.id,
        language,
      ),
    );
    setIdeaTurn((turn) => turn + 1);
  }, [category, language, localizedCurrentPattern]);

  const nextIdea = useCallback(() => {
    setIdea((current) =>
      generateIdea(
        localizedCurrentPattern,
        category,
        current?.id,
        language,
      ),
    );
    setIdeaTurn((turn) => turn + 1);
  }, [category, language, localizedCurrentPattern]);

  const chooseCategory = (nextCategory) => {
    setCategory(nextCategory);
    setIdea((current) =>
      generateIdea(
        localizedCurrentPattern,
        nextCategory,
        current?.id,
        language,
      ),
    );
    setIdeaTurn((turn) => turn + 1);
  };

  const changePattern = () => {
    if (!patterns.length) {
      return;
    }

    const currentIndex = patterns.findIndex(
      (pattern) => pattern.id === currentPattern?.id,
    );
    const nextPattern = patterns[(currentIndex + 1) % patterns.length];
    setCurrentPattern(nextPattern);
    setIdea((current) =>
      generateIdea(
        localizePattern(nextPattern, language),
        category,
        current?.id,
        language,
      ),
    );
    setIdeaTurn((turn) => turn + 1);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (
        event.code !== "Space" ||
        event.repeat ||
        event.target.closest("button, a, input, select, textarea, video")
      ) {
        return;
      }

      const bounds = generatorRef.current?.getBoundingClientRect();
      if (!bounds || bounds.bottom < 0 || bounds.top > window.innerHeight) {
        return;
      }

      event.preventDefault();
      nextIdea();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nextIdea]);

  const CurrentIcon = ideaCategoryIcons[idea.category] || Sparkle;
  const collectorName =
    localizedCurrentPattern?.collector_name?.trim() || t("archive.anonymous");

  return (
    <section
      id="ideas"
      className="idea-generator"
      ref={generatorRef}
      aria-labelledby="idea-generator-title"
    >
      <div className="idea-generator__header section-shell">
        <div>
          <div className="section-kicker">{t("ideas.kicker")}</div>
          <h2 id="idea-generator-title">{t("ideas.title")}</h2>
        </div>
        <p>{t("ideas.intro")}</p>
      </div>

      <div
        className="idea-generator__categories"
        aria-label={t("ideas.categoriesLabel")}
      >
        <div className="idea-generator__category-track">
          {localizedCategories.map((item) => {
            const CategoryIcon = ideaCategoryIcons[item.value] || Sparkle;
            return (
              <button
                type="button"
                className={category === item.value ? "is-active" : ""}
                aria-pressed={category === item.value}
                onClick={() => chooseCategory(item.value)}
                key={item.value}
              >
                <CategoryIcon size={17} weight="bold" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`idea-stage idea-stage--${idea.tone}`}>
        <div className="idea-stage__number" aria-hidden="true">
          {String(ideaTurn + 1).padStart(2, "0")}
        </div>
        <div className="idea-stage__media">
          <img
            src={localizedCurrentPattern?.detail_image_urls?.[0]}
            alt=""
            key={localizedCurrentPattern?.id}
          />
          <div className="idea-stage__medium">
            <CurrentIcon size={26} weight="fill" />
            <span>{idea.code}</span>
            <strong>{idea.categoryLabel}</strong>
          </div>
        </div>

        <div
          className="idea-stage__content"
          key={`${idea.id}-${ideaTurn}-${localizedCurrentPattern?.id}`}
          aria-live="polite"
        >
          <div className="idea-line idea-line--look">
            <span>{t("ideas.look")}</span>
            <p>{idea.look}</p>
          </div>
          <div className="idea-line idea-line--use">
            <span>{t("ideas.use")}</span>
            <p>{idea.use}</p>
          </div>
          <div className="idea-line idea-line--make">
            <span>{t("ideas.make")}</span>
            <p>{idea.make}</p>
          </div>
          <div className="idea-line idea-line--ai">
            <span>{t("ideas.ai")}</span>
            <p>{idea.ai}</p>
          </div>
        </div>

        <div className="idea-stage__source">
          <img src={localizedCurrentPattern?.detail_image_urls?.[0]} alt="" />
          <div>
            <span>{t("ideas.current")}</span>
            <strong>
              {localizedCurrentPattern?.archive_number} ·{" "}
              {localizedCurrentPattern?.source_title || t("ideas.unnamed")}
            </strong>
            <small>{t("ideas.collector", { name: collectorName })}</small>
          </div>
          <button type="button" onClick={changePattern}>
            {t("ideas.change")}
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="idea-stage__action">
          <button type="button" onClick={nextIdea}>
            <MagicWand size={23} weight="fill" />
            <span>{t("ideas.again")}</span>
            <small>SPACE</small>
          </button>
          <div>
            <Sparkle size={16} weight="fill" />
            {t("ideas.reimagined")}
          </div>
        </div>
      </div>
    </section>
  );
}
