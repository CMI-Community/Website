import { ArrowDown, CheckCircle, Images } from "@phosphor-icons/react";
import { useMemo } from "react";
import { localizePattern } from "../content/content-i18n";
import { useI18n } from "../content/i18n";

export function CollectionSection({ patterns, onOpenPattern }) {
  const { language, t } = useI18n();
  const recentPatterns = useMemo(
    () => patterns.slice(0, 6).map((pattern) => localizePattern(pattern, language)),
    [language, patterns],
  );

  return (
    <section id="collect" className="collection-section section-shell">
      <div className="section-heading section-heading--split">
        <div>
          <div className="section-kicker">{t("collect.sectionKicker")}</div>
          <h2>{t("collect.sectionTitle")}</h2>
        </div>
        <p>{t("collect.sectionIntro")}</p>
      </div>

      <div className="collection-portal">
        <article className="collection-entry-card collection-entry-card--readonly">
          <img
            className="collection-entry-card__ribbon"
            src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/decor/lanna-history-ribbon.jpg"
            alt=""
            aria-hidden="true"
          />
          <div className="collection-entry-card__top">
            <span>{t("collect.archiveOnlyKicker")}</span>
            <strong>WAYTOAGI · 26</strong>
          </div>
          <div className="collection-entry-card__seal">
            <CheckCircle size={38} weight="fill" />
          </div>
          <div className="collection-entry-card__copy">
            <p>CMI · LANNA PATTERN ARCHIVE</p>
            <h3>{t("collect.archiveOnlyTitle")}</h3>
            <span>{t("collect.archiveOnlyDescription")}</span>
          </div>
          <a className="button button--accent" href="#archive">
            <Images size={20} weight="fill" />
            <span>{t("collect.archiveOnlyAction")}</span>
          </a>
        </article>

        <div className="collection-recent">
          <header>
            <div>
              <span>RECENTLY COLLECTED</span>
              <h3>{t("collect.recentTitle")}</h3>
            </div>
            <a href="#archive">
              {t("collect.viewAll", { count: patterns.length })}
              <ArrowDown size={17} />
            </a>
          </header>
          {recentPatterns.length ? (
            <div className="collection-recent__grid">
              {recentPatterns.map((pattern) => (
                <button
                  type="button"
                  key={pattern.id}
                  onClick={() => onOpenPattern(pattern)}
                  aria-label={t("collect.viewPattern", {
                    number: pattern.archive_number,
                    title: pattern.source_title,
                  })}
                >
                  <img src={pattern.detail_image_urls[0]} alt="" />
                  <span>{pattern.archive_number}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="collection-recent__empty">
              <Images size={30} />
              <p>{t("collect.empty")}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
