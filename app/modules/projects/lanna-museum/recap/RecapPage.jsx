import * as recapZh from "./content.zh";
import * as recapEn from "./content.en";
import * as recapTh from "./content.th";
import { useI18n } from "../content/i18n";
import { recapUi } from "./ui";

const recapContent = {
  zh: recapZh,
  th: recapTh,
  en: recapEn,
};

function SectionHeading({ kicker, title }) {
  return (
    <header className="section-heading">
      <p className="kicker">{kicker}</p>
      <h2>{title}</h2>
    </header>
  );
}

function Paragraphs({ items }) {
  return (
    <div className="prose">
      {items.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

export function RecapPage() {
  const { language, projectHref } = useI18n();
  const {
    articleMeta,
    museums,
    sections,
    websiteRoles,
  } = recapContent[language] ?? recapZh;
  const ui = recapUi[language] ?? recapUi.zh;
  const activityWebsite = projectHref;
  const activitySection = (id) => `${activityWebsite}#${id}`;

  return (
    <article className="recap-page">
      <section className="hero" id="recap-top">
        <div className="hero-copy">
          <p className="hero-eyebrow">{articleMeta.eyebrow}</p>
          <h1>
            {articleMeta.titleLines[0]}
            <span>{articleMeta.titleLines[1]}</span>
          </h1>
          <p className="hero-subtitle">{articleMeta.subtitle}</p>
          <div className="hero-meta">
            <span>{articleMeta.date}</span>
            <span>{articleMeta.place}</span>
          </div>
        </div>
        <figure className="hero-image">
          <img
            src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/recap/article/textile-pillars.jpg"
            alt={ui.hero.imageAlt}
          />
          <figcaption>
            {ui.hero.imageCaption}
            <span>{ui.hero.sourceNote}</span>
          </figcaption>
        </figure>
        <div className="hero-seal" aria-hidden="true">
          <span>{ui.hero.seal}</span>
          <small>{ui.hero.sealLatin}</small>
        </div>
      </section>

      <section className="standfirst shell">
        <p>{articleMeta.standfirst}</p>
        <div className="fact-strip" aria-label={ui.facts.aria}>
          {ui.facts.items.map(([value, label]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="story-section shell" id="afternoon">
        <SectionHeading
          kicker={sections.opening.kicker}
          title={sections.opening.title}
        />
        <div className="story-grid">
          <Paragraphs items={sections.opening.paragraphs} />
          <figure className="editorial-figure landscape">
            <img
              src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/recap/article/event-cover.jpg"
              alt={ui.opening.imageAlt}
            />
            <figcaption>{ui.opening.caption}</figcaption>
          </figure>
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-inner shell">
          <SectionHeading
            kicker={sections.shindo.kicker}
            title={sections.shindo.title}
          />
          <div className="feature-grid">
            <figure className="tall-image">
              <img
                src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/recap/article/team-making.jpg"
                alt={ui.shindo.imageAlt}
              />
              <figcaption>{ui.shindo.caption}</figcaption>
            </figure>
            <div>
              <Paragraphs items={sections.shindo.paragraphs} />
              <blockquote>
                <span>“</span>
                {sections.shindo.quote}
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      <section className="pattern-section shell">
        <SectionHeading
          kicker={sections.whyPattern.kicker}
          title={sections.whyPattern.title}
        />
        <div className="pattern-layout">
          <Paragraphs items={sections.whyPattern.paragraphs} />
          <ol className="method-line" aria-label={ui.pattern.aria}>
            {ui.pattern.steps.map((item, index) => (
              <li key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item}
              </li>
            ))}
          </ol>
        </div>
        <figure className="pattern-banner">
          <img
            src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/recap/article/procession-pattern.jpg"
            alt={ui.pattern.imageAlt}
          />
          <figcaption>{ui.pattern.caption}</figcaption>
        </figure>
      </section>

      <section className="museum-story">
        <div className="shell">
          <SectionHeading
            kicker={sections.museums.kicker}
            title={sections.museums.title}
          />
          <div className="museum-story-copy">
            <Paragraphs items={sections.museums.paragraphs} />
            <aside className="side-note">
              <span>FIELD NOTE</span>
              {ui.museumStory.note}
            </aside>
          </div>
          <div className="museum-mosaic">
            <figure className="mosaic-main">
              <img
                src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/recap/article/wooden-loom.jpg"
                alt={ui.museumStory.loomAlt}
              />
              <figcaption>{ui.museumStory.loomCaption}</figcaption>
            </figure>
            <figure>
              <img
                src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/recap/article/lanna-roof-pattern.jpg"
                alt={ui.museumStory.roofAlt}
              />
            </figure>
            <figure className="mosaic-wide">
              <img
                src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/recap/article/fam-red-gold-panorama.jpg"
                alt={ui.museumStory.panoramaAlt}
              />
            </figure>
          </div>
        </div>
      </section>

      <section className="capture-section shell">
        <SectionHeading
          kicker={sections.capture.kicker}
          title={sections.capture.title}
        />
        <div className="capture-grid">
          <Paragraphs items={sections.capture.paragraphs} />
          <div className="capture-card">
            <p className="capture-card-title">{ui.capture.title}</p>
            <ol>
              {ui.capture.steps.map(([label, text], index) => (
                <li key={label}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{label}</strong>
                  {text}
                </li>
              ))}
            </ol>
            <p className="capture-card-foot">{ui.capture.foot}</p>
          </div>
        </div>
      </section>

      <section className="website-section" id="website">
        <div className="website-thread" aria-hidden="true" />
        <div className="shell">
          <SectionHeading
            kicker={sections.website.kicker}
            title={sections.website.title}
          />
          <div className="website-intro">
            <Paragraphs items={sections.website.paragraphs} />
            <div className="website-roles">
              {websiteRoles.map((role) => (
                <article key={role.number}>
                  <span>{role.number}</span>
                  <h3>{role.label}</h3>
                  <p>{role.text}</p>
                </article>
              ))}
            </div>
          </div>
          <a
            className="browser-frame"
            href={activityWebsite}
            aria-label={ui.website.aria}
          >
            <div className="browser-bar">
              <span />
              <span />
              <span />
              <p>cmi.community/project/waytoagi/26-lanna-museum</p>
            </div>
            <img
              src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/recap/article/activity-site.jpg"
              alt={ui.website.imageAlt}
            />
            <div className="browser-cta">
              <span>{ui.website.enter}</span>
              <strong>{ui.website.cta}</strong>
            </div>
          </a>
          <div className="website-links">
            <a
              href={activitySection("works")}
            >
              {ui.website.works} <span>↗</span>
            </a>
            <a
              href={activitySection("archive")}
            >
              {ui.website.archive} <span>↗</span>
            </a>
            <a
              href={activitySection("museums")}
            >
              {ui.website.museums} <span>↗</span>
            </a>
          </div>
        </div>
      </section>

      <section className="making-section shell">
        <SectionHeading
          kicker={sections.making.kicker}
          title={sections.making.title}
        />
        <div className="making-grid">
          <Paragraphs items={sections.making.paragraphs} />
          <div className="making-images">
            <figure>
              <img
                src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/recap/article/participants.jpg"
                alt={ui.making.participantsAlt}
              />
            </figure>
            <figure>
              <img
                src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/recap/article/ai-making.jpg"
                alt={ui.making.aiAlt}
              />
              <figcaption>{ui.making.caption}</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="organization-section">
        <div className="organization-grid shell">
          <div>
            <SectionHeading
              kicker={sections.organization.kicker}
              title={sections.organization.title}
            />
            <Paragraphs items={sections.organization.paragraphs} />
          </div>
          <figure>
            <img
              src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/recap/article/remote-opening.jpg"
              alt={ui.organization.imageAlt}
            />
            <figcaption>{ui.organization.caption}</figcaption>
          </figure>
        </div>
      </section>

      <section className="studio-section shell">
        <div className="studio-copy">
          <SectionHeading
            kicker={sections.studio.kicker}
            title={sections.studio.title}
          />
          <Paragraphs items={sections.studio.paragraphs} />
        </div>
        <figure>
          <img
            src="/media/projects/waytoagi/26-lanna-museum/v1/site/assets/recap/article/milan-cat.jpg"
            alt={ui.studio.imageAlt}
          />
          <figcaption>{ui.studio.caption}</figcaption>
        </figure>
      </section>

      <section className="guide-section" id="museum-guide">
        <div className="shell">
          <header className="guide-heading">
            <p className="kicker">{ui.guide.kicker}</p>
            <h2>{ui.guide.title}</h2>
            <p>{ui.guide.intro}</p>
          </header>
          <div className="route-grid">
            {museums.map((museum) => (
              <article className="route-card" key={museum.route}>
                <figure>
                  <img src={museum.image} alt={museum.english} />
                  <span>{museum.route}</span>
                </figure>
                <div className="route-body">
                  <p className="route-english">{museum.english}</p>
                  <h3>{museum.chinese}</h3>
                  <div className="tag-list">
                    {museum.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <dl>
                    <div>
                      <dt>{ui.guide.suitable}</dt>
                      <dd>{museum.suitable}</dd>
                    </div>
                    <div>
                      <dt>{ui.guide.focus}</dt>
                      <dd>{museum.focus}</dd>
                    </div>
                    <div>
                      <dt>{ui.guide.method}</dt>
                      <dd>{museum.method}</dd>
                    </div>
                  </dl>
                  <div className="route-info">
                    <p>{museum.hours}</p>
                    <p>{museum.address}</p>
                  </div>
                  <div className="route-links">
                    <a href={museum.website} target="_blank" rel="noreferrer">
                      {ui.guide.website}
                    </a>
                    <a href={museum.map} target="_blank" rel="noreferrer">
                      {ui.guide.map}
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="guide-note">{ui.guide.note}</p>
        </div>
      </section>

      <section className="closing-section">
        <div className="closing-image" aria-hidden="true" />
        <div className="closing-copy">
          <SectionHeading
            kicker={sections.closing.kicker}
            title={sections.closing.title}
          />
          <Paragraphs items={sections.closing.paragraphs} />
          <a href={activityWebsite}>
            {ui.closing.cta} <span>↗</span>
          </a>
        </div>
      </section>
    </article>
  );
}
