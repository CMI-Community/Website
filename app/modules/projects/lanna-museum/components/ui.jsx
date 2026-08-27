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

export function Button({
  children,
  variant = "primary",
  icon,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={`button button--${variant} ${className}`}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function Dialog({
  open,
  onClose,
  label,
  children,
  size = "regular",
  disableEscape = false,
}) {
  const { t } = useI18n();
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !disableEscape) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [disableEscape, open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="dialog-layer" role="presentation" onMouseDown={onClose}>
      <section
        className={`dialog dialog--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          className="icon-button dialog__close"
          type="button"
          aria-label={t("close")}
          onClick={onClose}
        >
          <X size={22} weight="bold" />
        </button>
        {children}
      </section>
    </div>
  );
}
