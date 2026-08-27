import { lazy, Suspense, useCallback, useMemo } from "react";
import type { ProjectModuleProps, ProjectView } from "../project-module-registry";
import { getProjectIssuePath, type ProjectLocale } from "../project-catalog";
import { Footer } from "./components/footer";
import { Header } from "./components/header";
import { I18nProvider } from "./content/i18n";
import type { LannaLanguage } from "./content/messages";
import { toLannaPatternViewModel } from "./pattern-archive/public-pattern-adapter";
import "./styles/foundation.css";

const ProjectExperience = lazy(() => import("./LannaProjectPage"));
const RecapExperience = lazy(() => import("./LannaRecapProjectPage"));

function localeForLanguage(language: LannaLanguage): ProjectLocale {
  return language === "zh" ? "zh-CN" : language;
}

export default function LannaMuseumProject({
  archive,
  locale,
  view,
  series,
  issue,
}: ProjectModuleProps) {
  const patterns = useMemo(
    () => archive.map(toLannaPatternViewModel),
    [archive],
  );
  const hrefFor = useCallback(
    (language: LannaLanguage, nextView: ProjectView) =>
      getProjectIssuePath(series, issue, localeForLanguage(language), nextView),
    [issue, series],
  );
  const language = locale === "zh-CN" ? "zh" : locale;

  return (
    <I18nProvider locale={locale} view={view} hrefFor={hrefFor}>
      <div className="lanna-project" data-language={language}>
        <Header />
        <Suspense fallback={<main className="archive-state"><p>项目内容正在打开…</p></main>}>
          {view === "recap" ? (
            <RecapExperience />
          ) : (
            <ProjectExperience patterns={patterns} />
          )}
        </Suspense>
        <Footer />
      </div>
    </I18nProvider>
  );
}
