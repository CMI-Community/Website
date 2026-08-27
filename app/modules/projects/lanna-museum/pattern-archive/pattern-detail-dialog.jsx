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
import { formatPatternCapturedAt, renderPatternCardPng } from "./archive-client";
import { PatternCard } from "./pattern-card";

function localizeRuntimeError(message, language, fallback) {
  if (language === "zh" || !message) return message || fallback;
  if (/图片|图像|image/i.test(message)) {
    return language === "th"
      ? "ไม่สามารถอ่านหรือประมวลผลภาพได้ โปรดลองอีกครั้ง"
      : "The image could not be read or processed. Please try again.";
  }
  return fallback;
}

export function PatternDetailDialog({ pattern, onClose, onUseForIdea }) {
  const { language, t } = useI18n();
  const cardRef = useRef(null);
  const [downloadStatus, setDownloadStatus] = useState("idle");
  const [downloadError, setDownloadError] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const allImages = [
    ...(pattern?.detail_image_urls || []),
    ...(pattern?.context_image_urls || []),
    ...(pattern?.label_image_urls || []),
  ];

  useEffect(() => {
    setDownloadStatus("idle");
    setDownloadError("");
    setLightboxIndex(null);
  }, [pattern?.id]);

  useEffect(() => {
    if (lightboxIndex === null) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setLightboxIndex(null);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setLightboxIndex((current) =>
          current === null ? 0 : (current + 1) % allImages.length,
        );
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setLightboxIndex((current) =>
          current === null
            ? 0
            : (current - 1 + allImages.length) % allImages.length,
        );
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [allImages.length, lightboxIndex]);

  if (!pattern) {
    return null;
  }

  const downloadCard = async () => {
    try {
      setDownloadStatus("loading");
      setDownloadError("");
      const blob = await renderPatternCardPng(pattern, language);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const safeNumber = pattern.archive_number.replace(/[^a-zA-Z0-9-]/g, "-");
      anchor.download = `${safeNumber}-lanna-pattern-card.png`;
      anchor.href = objectUrl;
      anchor.style.display = "none";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
      setDownloadStatus("success");
    } catch (error) {
      console.error("Pattern card export failed", error);
      setDownloadError(
        localizeRuntimeError(
          error.message,
          language,
          t("archive.exportFailed"),
        ),
      );
      setDownloadStatus("error");
    }
  };

  return (
    <Dialog
      open={Boolean(pattern)}
      onClose={onClose}
      label={t("archive.details", { number: pattern.archive_number })}
      size="wide"
      disableEscape={lightboxIndex !== null}
    >
      <div className="pattern-detail">
        <div className="pattern-detail__card-column">
          <PatternCard pattern={pattern} cardRef={cardRef} />
          <Button
            onClick={downloadCard}
            disabled={downloadStatus === "loading"}
            icon={<DownloadSimple size={20} />}
          >
            {downloadStatus === "loading"
              ? t("archive.generating")
              : downloadStatus === "success"
                ? t("archive.downloaded")
                : t("archive.download")}
          </Button>
          {downloadStatus === "error" ? (
            <p className="download-error">{downloadError}</p>
          ) : null}
        </div>
        <div className="pattern-detail__info">
          <div className="section-kicker">ARCHIVE DETAIL</div>
          <h2>{pattern.archive_number}</h2>
          <h3>{pattern.source_title}</h3>
          <p className="pattern-detail__collector">
            <IdentificationCard size={19} />
            <span>{t("archive.collector")}</span>
            <strong>
              {pattern.collector_name?.trim() || t("archive.anonymous")}
            </strong>
          </p>
          <p className="pattern-detail__source">
            <MapPin size={17} />
            {pattern.source_location || t("archive.sourceMissing")}
          </p>
          {formatPatternCapturedAt(
            pattern,
            undefined,
            false,
            language === "th"
              ? "th-TH-u-ca-gregory"
              : language === "en"
                ? "en-GB"
                : "zh-CN",
          ) ? (
            <p className="pattern-detail__source">
              <CalendarBlank size={17} />
              {t("archive.actualTime", {
                date: formatPatternCapturedAt(
                  pattern,
                  undefined,
                  false,
                  language === "th"
                    ? "th-TH-u-ca-gregory"
                    : language === "en"
                      ? "en-GB"
                      : "zh-CN",
                ),
              })}
            </p>
          ) : null}
          {pattern.preview ? (
            <div className="preview-label">{t("archive.previewLabel")}</div>
          ) : null}
          <Button
            className="pattern-detail__idea-button"
            variant="outline"
            icon={<MagicWand size={20} />}
            onClick={() => onUseForIdea(pattern)}
          >
            {t("archive.idea")}
          </Button>
          <dl className="pattern-detail__notes">
            <div>
              <dt>{t("archive.observation")}</dt>
              <dd>{pattern.observation || t("archive.emptyObservation")}</dd>
            </div>
            <div>
              <dt>{t("archive.verified")}</dt>
              <dd>{pattern.verified_information || t("archive.emptyVerified")}</dd>
            </div>
            <div>
              <dt>{t("archive.unknown")}</dt>
              <dd>{pattern.open_question || t("archive.emptyUnknown")}</dd>
            </div>
          </dl>
          <div className="pattern-detail__gallery">
            {allImages.map((url, index) => (
              <button
                type="button"
                className="pattern-detail__thumb"
                key={`${url}-${index}`}
                aria-label={t("archive.enlarge", {
                  number: pattern.archive_number,
                  index: index + 1,
                })}
                onClick={() => setLightboxIndex(index)}
              >
                <img
                  src={url}
                  alt={t("archive.imageAlt", {
                    number: pattern.archive_number,
                    index: index + 1,
                  })}
                />
                <span>
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {String(allImages.length).padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {lightboxIndex !== null ? (
        <div
          className="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t("archive.imagePreview", {
            number: pattern.archive_number,
          })}
          onMouseDown={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            className="image-lightbox__close"
            aria-label={t("archive.closePreview")}
            onClick={() => setLightboxIndex(null)}
          >
            <X size={25} weight="bold" />
          </button>
          <div
            className="image-lightbox__stage"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {allImages.length > 1 ? (
              <button
                type="button"
                className="image-lightbox__nav image-lightbox__nav--previous"
                aria-label={t("archive.previousImage")}
                onClick={() =>
                  setLightboxIndex(
                    (lightboxIndex - 1 + allImages.length) % allImages.length,
                  )
                }
              >
                <ArrowLeft size={28} weight="bold" />
              </button>
            ) : null}
            <img
              src={allImages[lightboxIndex]}
              alt={t("archive.enlargedAlt", {
                number: pattern.archive_number,
                index: lightboxIndex + 1,
              })}
            />
            {allImages.length > 1 ? (
              <button
                type="button"
                className="image-lightbox__nav image-lightbox__nav--next"
                aria-label={t("archive.nextImage")}
                onClick={() =>
                  setLightboxIndex(
                    (lightboxIndex + 1) % allImages.length,
                  )
                }
              >
                <ArrowRight size={28} weight="bold" />
              </button>
            ) : null}
          </div>
          <div
            className="image-lightbox__caption"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span>{pattern.archive_number}</span>
            <strong>{pattern.source_title}</strong>
            <em>
              {lightboxIndex + 1} / {allImages.length}
            </em>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
