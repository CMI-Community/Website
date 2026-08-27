import { useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowLeft, ArrowDown, ArrowRight, Binoculars, Buildings, CalendarBlank,
  Camera, CaretDown, Check, CheckCircle, Clock, Cube, DownloadSimple,
  GameController, GlobeHemisphereWest, IdentificationCard, ImageSquare,
  Images, List, MagicWand, MapPin, NotePencil, Palette, PenNib, Play,
  Shuffle, SpeakerHigh, Sparkle, SquaresFour, Ticket, UploadSimple,
  VideoCamera, X,
} from "@phosphor-icons/react";

import { languageOptions, useI18n } from "../content/i18n";
import { Button } from "./ui";

export function LanguageSwitcher() {
  const { language, languageHref, t } = useI18n();
  const [open, setOpen] = useState(false);
  const switcherRef = useRef(null);
  const currentLanguage =
    languageOptions.find(({ code }) => code === language) || languageOptions[0];

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!switcherRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="language-switcher" ref={switcherRef}>
      <button
        className="language-switcher__trigger"
        type="button"
        aria-label={`${t("language")}: ${currentLanguage.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <GlobeHemisphereWest size={19} weight="bold" />
        <span>{currentLanguage.short}</span>
        <CaretDown size={14} weight="bold" />
      </button>
      {open ? (
        <div
          className="language-switcher__menu"
          role="listbox"
          aria-label={t("languageMenu")}
        >
          <span className="language-switcher__eyebrow">{t("language")}</span>
          {languageOptions.map((option) => (
            <a
              href={languageHref(option.code)}
              role="option"
              aria-selected={language === option.code}
              className={language === option.code ? "is-active" : ""}
              key={option.code}
              onClick={() => {
                setOpen(false);
              }}
            >
              <span>{option.nativeLabel}</span>
              <small>
                {option.code === "zh"
                  ? "Chinese"
                  : option.code === "th"
                    ? "Thai"
                    : "English"}
              </small>
              {language === option.code ? (
                <Check size={16} weight="bold" />
              ) : null}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Header() {
  const { projectHref, recapHref, t, view } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const isRecapPage = view === "recap";

  const links = [
    [t("nav.works"), "works", "section"],
    [t("nav.about"), "about", "section"],
    [t("nav.journey"), "journey", "section"],
    [t("nav.museums"), "museums", "section"],
    [t("nav.collect"), "collect", "section"],
    [t("nav.archive"), "archive", "section"],
    [t("nav.ideas"), "ideas", "section"],
    [t("nav.recap"), "recap", "page"],
  ];

  const handleNavigation = (id, type) => {
    if (type === "page" || isRecapPage) return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const navigationItem = ([label, id, type], mobile = false) => {
    const href = type === "page"
      ? recapHref
      : isRecapPage
        ? `${projectHref}#${id}`
        : null;
    const content = (
      <>
        {label}
        {mobile ? <ArrowRight size={18} /> : null}
      </>
    );
    return href ? (
      <a
        className={`site-nav-link ${type === "page" && isRecapPage ? "is-active" : ""}`}
        href={href}
        key={id}
        aria-current={type === "page" && isRecapPage ? "page" : undefined}
        onClick={() => setMenuOpen(false)}
      >
        {content}
      </a>
    ) : (
      <button
        className="site-nav-link"
        key={id}
        type="button"
        onClick={() => handleNavigation(id, type)}
      >
        {content}
      </button>
    );
  };

  return (
    <header className="site-header">
      <a
        className="brand-lockup"
        href={isRecapPage ? projectHref : "#top"}
        aria-label="CMI Community"
      >
        <img
          src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/brand/cmi-community.svg"
          alt=""
          className="brand-lockup__mark"
        />
        <span>CMI Community</span>
      </a>

      <nav className="desktop-nav" aria-label={t("navLabel")}>
        {links.map((item) => navigationItem(item))}
      </nav>

      <div className="header-actions">
        <LanguageSwitcher />
        <Button className="desktop-signup ended-button" disabled>
          {t("signup.action")}
        </Button>
      </div>

      <button
        type="button"
        className="icon-button mobile-menu-button"
        aria-label={menuOpen ? t("closeNav") : t("openNav")}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
      >
        {menuOpen ? <X size={24} /> : <List size={26} />}
      </button>

      {menuOpen ? (
        <div className="mobile-nav">
          {links.map((item) => navigationItem(item, true))}
          <Button className="ended-button" disabled>
            {t("signup.action")}
          </Button>
        </div>
      ) : null}
    </header>
  );
}
