import { useEffect, useId, useRef, useState } from "react";
import {
  formatProjectDate,
  getProjectIssueHref,
  isExternalProjectIssue,
  orderProjectIssues,
  PROJECT_SERIES,
} from "../project-catalog";
import "./project-menu.css";

interface ProjectMenuProps {
  placement: "hero" | "sticky";
}

export function ProjectMenu({ placement }: ProjectMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const closeAfterSelection = () => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !rootRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
    };

    window.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className={`project-menu project-menu--${placement}`} ref={rootRef}>
      <button
        ref={triggerRef}
        className="project-menu__trigger"
        type="button"
        aria-label="Projects 项目系列"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span>Projects</span>
        <i aria-hidden="true">⌄</i>
      </button>

      {open && (
        <div className="project-menu__panel" id={panelId} role="group" aria-label="CMI 项目系列">
          <p className="project-menu__eyebrow">PROJECT SERIES / 项目系列</p>
          {PROJECT_SERIES.map((series) => (
            <section className="project-menu__series" key={series.id} aria-labelledby={`${panelId}-${series.id}`}>
              <header>
                <span className="project-menu__level">01 / 一级目录 · SERIES</span>
                <h2 id={`${panelId}-${series.id}`}>{series.name}</h2>
                <p>{series.credit}</p>
              </header>
              <p className="project-menu__issues-label">02 / 二级目录 · ISSUES</p>
              <ul>
                {orderProjectIssues(series.issues).map((issue) => (
                  <li key={issue.id}>
                    <a
                      href={getProjectIssueHref(series, issue)}
                      target={isExternalProjectIssue(issue) ? "_blank" : undefined}
                      rel={isExternalProjectIssue(issue) ? "noreferrer" : undefined}
                      onClick={closeAfterSelection}
                    >
                      <span className="project-menu__issue-number">{String(issue.number).padStart(2, "0")}</span>
                      <span className="project-menu__issue-copy">
                        <b>第 {issue.number} 期 · {issue.title}</b>
                        <small>{formatProjectDate(issue.date)}</small>
                      </span>
                      <span className="project-menu__issue-arrow" aria-hidden="true">
                        {isExternalProjectIssue(issue) ? "↗" : "→"}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
