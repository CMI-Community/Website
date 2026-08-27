import { useEffect, useState } from "react";
import { ArchiveSection } from "./archive/archive-section";
import { PatternDetailDialog } from "./archive/pattern-detail-dialog";
import { PossibilityGenerator } from "./ideas/possibility-generator";
import { CollectionSection } from "./sections/collection";
import { CreationVideo } from "./sections/creation-video";
import { Hero } from "./sections/hero";
import { Journey } from "./sections/journey";
import { Manifesto } from "./sections/manifesto";
import { MuseumSection } from "./sections/museums";
import { WorksShowcase } from "./sections/works";
import "./styles/experience.css";
import "./styles/archive.css";
import "./styles/ideas-media.css";
import "./styles/refinements.css";
import "./styles/responsive.css";

export default function LannaProjectPage({ patterns }) {
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [ideaPattern, setIdeaPattern] = useState(null);

  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleUseForIdea = (pattern) => {
    setIdeaPattern(pattern);
    setSelectedPattern(null);
    window.setTimeout(() => {
      document.getElementById("ideas")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  return (
    <>
      <main id="top">
        <Hero />
        <WorksShowcase />
        <Manifesto />
        <Journey />
        <MuseumSection />
        <CollectionSection patterns={patterns} onOpenPattern={setSelectedPattern} />
        <ArchiveSection patterns={patterns} onOpenPattern={setSelectedPattern} />
        <PossibilityGenerator patterns={patterns} preferredPattern={ideaPattern} />
        <CreationVideo />
      </main>
      <PatternDetailDialog
        pattern={selectedPattern}
        onClose={() => setSelectedPattern(null)}
        onUseForIdea={handleUseForIdea}
      />
    </>
  );
}
