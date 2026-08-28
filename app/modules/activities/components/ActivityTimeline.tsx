import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  getActivityPosterSrc,
  type ActivityDefinition,
  type ActivityStatus,
} from "../activity-catalog";
import "./activity-timeline.css";

interface ActivityTimelineProps {
  upcoming: readonly ActivityDefinition[];
  ongoing: readonly ActivityDefinition[];
  completed: readonly ActivityDefinition[];
}

interface TimelineEntry {
  activity: ActivityDefinition;
  status: ActivityStatus;
}

type TiltStyle = CSSProperties & {
  "--activity-tilt-x"?: string;
  "--activity-tilt-y"?: string;
  "--activity-shine-x"?: string;
  "--activity-shine-y"?: string;
};

const STATUS_LABELS: Record<ActivityStatus, string> = {
  upcoming: "即将举行",
  ongoing: "进行中",
  completed: "已完成",
};

function resetTilt(target: HTMLElement) {
  target.style.setProperty("--activity-tilt-x", "0deg");
  target.style.setProperty("--activity-tilt-y", "0deg");
  target.style.setProperty("--activity-shine-x", "50%");
  target.style.setProperty("--activity-shine-y", "42%");
}

function updateTilt(event: ReactPointerEvent<HTMLElement>) {
  if (event.pointerType === "touch") return;
  const bounds = event.currentTarget.getBoundingClientRect();
  const horizontal = (event.clientX - bounds.left) / bounds.width;
  const vertical = (event.clientY - bounds.top) / bounds.height;
  event.currentTarget.style.setProperty(
    "--activity-tilt-x",
    `${((0.5 - vertical) * 9).toFixed(2)}deg`,
  );
  event.currentTarget.style.setProperty(
    "--activity-tilt-y",
    `${((horizontal - 0.5) * 12).toFixed(2)}deg`,
  );
  event.currentTarget.style.setProperty("--activity-shine-x", `${(horizontal * 100).toFixed(1)}%`);
  event.currentTarget.style.setProperty("--activity-shine-y", `${(vertical * 100).toFixed(1)}%`);
}

export function ActivityTimeline({ upcoming, ongoing, completed }: ActivityTimelineProps) {
  const [selected, setSelected] = useState<TimelineEntry | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const upcomingGroupRef = useRef<HTMLElement>(null);
  const completedGroupRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogTitleId = useId();
  const activeEntries: TimelineEntry[] = [
    ...ongoing.map((activity) => ({ activity, status: "ongoing" as const })),
    ...upcoming.map((activity) => ({ activity, status: "upcoming" as const })),
  ];
  const completedEntries: TimelineEntry[] = completed.map((activity) => ({
    activity,
    status: "completed",
  }));
  const totalCount = activeEntries.length + completedEntries.length;

  const closeDialog = () => {
    setSelected(null);
    window.requestAnimationFrame(() => lastTriggerRef.current?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    if (!selected) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = closeRef.current?.closest<HTMLElement>("[role='dialog']");
      const focusable = dialog
        ? [...dialog.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")]
        : [];
      if (focusable.length < 2) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  const scrollTrack = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({
      left: direction * Math.max(220, track.clientWidth * 0.72),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  const scrollToGroup = (group: HTMLElement | null) => {
    const track = trackRef.current;
    if (!track || !group) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({
      left: Math.max(0, group.offsetLeft - track.offsetLeft - 8),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  const renderCard = (entry: TimelineEntry, index: number, eager: boolean) => {
    const { activity, status } = entry;
    return (
      <article
        className="activity-timeline__activity"
        data-activity-status={status}
        key={activity.id}
      >
        <button
          className="activity-timeline__poster-button"
          type="button"
          aria-label={`放大海报（${STATUS_LABELS[status]}）：${activity.title}`}
          onClick={(event) => {
            lastTriggerRef.current = event.currentTarget;
            setSelected(entry);
          }}
          onPointerMove={updateTilt}
          onPointerLeave={(event) => resetTilt(event.currentTarget)}
          style={{
            "--activity-tilt-x": "0deg",
            "--activity-tilt-y": "0deg",
            "--activity-shine-x": "50%",
            "--activity-shine-y": "42%",
          } as TiltStyle}
        >
          <span className="activity-timeline__sequence" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="activity-timeline__poster">
            <img
              src={getActivityPosterSrc(activity)}
              alt={activity.poster.alt}
              width={activity.poster.width}
              height={activity.poster.height}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              decoding="async"
              draggable="false"
            />
            <i aria-hidden="true" />
          </span>
          <span className="activity-timeline__zoom" aria-hidden="true">点击放大 ＋</span>
        </button>
        <div className="activity-timeline__copy">
          <span className={`activity-timeline__status activity-timeline__status--${status}`}>
            {STATUS_LABELS[status]}
          </span>
          <p>{activity.dateLabel}<span>{activity.timeLabel}</span></p>
          <h4>{activity.title}</h4>
          <a href={activity.detailUrl} target="_blank" rel="noreferrer">
            查看活动详情 <span aria-hidden="true">↗</span>
          </a>
        </div>
      </article>
    );
  };

  return (
    <section className="activity-timeline" aria-labelledby="activity-timeline-title">
      <header className="activity-timeline__header">
        <div className="activity-timeline__intro">
          <span>NEXT / RECENT · 近期活动</span>
          <h2 id="activity-timeline-title">最近，可以一起做什么</h2>
        </div>
        <nav className="activity-timeline__jumps" aria-label="定位近期活动分组">
          <button
            type="button"
            aria-controls="activity-timeline-active"
            onClick={() => scrollToGroup(upcomingGroupRef.current)}
          >
            即将举行 <b>{String(activeEntries.length).padStart(2, "0")}</b>
          </button>
          <button
            type="button"
            aria-controls="activity-timeline-completed"
            onClick={() => scrollToGroup(completedGroupRef.current)}
          >
            已完成 <b>{String(completedEntries.length).padStart(2, "0")}</b>
          </button>
        </nav>
        {totalCount > 1 && (
          <nav className="activity-timeline__controls" aria-label="横向浏览近期活动">
            <button type="button" onClick={() => scrollTrack(-1)} aria-label="查看前一组活动">←</button>
            <button type="button" onClick={() => scrollTrack(1)} aria-label="查看后一组活动">→</button>
          </nav>
        )}
      </header>

      <div
        className="activity-timeline__track"
        ref={trackRef}
        tabIndex={0}
        aria-label={`即将举行或进行中 ${activeEntries.length} 场，已完成 ${completedEntries.length} 场，可横向滚动`}
      >
        <section
          className="activity-timeline__group"
          id="activity-timeline-active"
          aria-labelledby="activity-timeline-active-title"
          ref={upcomingGroupRef}
        >
          <header className="activity-timeline__group-header">
            <h3 id="activity-timeline-active-title">即将举行</h3>
            <span>{String(activeEntries.length).padStart(2, "0")}</span>
          </header>
          <div className="activity-timeline__group-list">
            {activeEntries.length ? (
              activeEntries.map((entry, index) => renderCard(entry, index, index === 0))
            ) : (
              <p className="activity-timeline__empty">暂无即将举行的活动</p>
            )}
          </div>
        </section>

        <div className="activity-timeline__now" role="separator" aria-label="现在">
          <span>NOW</span>
          <b>现在</b>
        </div>

        <section
          className="activity-timeline__group"
          id="activity-timeline-completed"
          aria-labelledby="activity-timeline-completed-title"
          ref={completedGroupRef}
        >
          <header className="activity-timeline__group-header">
            <h3 id="activity-timeline-completed-title">已完成</h3>
            <span>{String(completedEntries.length).padStart(2, "0")}</span>
          </header>
          <div className="activity-timeline__group-list">
            {completedEntries.length ? (
              completedEntries.map((entry, index) => (
                renderCard(entry, index, activeEntries.length === 0 && index === 0)
              ))
            ) : (
              <p className="activity-timeline__empty">近期还没有已完成活动</p>
            )}
          </div>
        </section>
      </div>

      {selected && (
        <div
          className="activity-timeline-dialog"
          role="presentation"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            className="activity-timeline-dialog__content"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
          >
            <button
              className="activity-timeline-dialog__close"
              type="button"
              onClick={closeDialog}
              ref={closeRef}
              aria-label="关闭活动海报"
            >
              关闭 ×
            </button>
            <figure>
              <img
                src={getActivityPosterSrc(selected.activity)}
                alt={selected.activity.poster.alt}
                width={selected.activity.poster.width}
                height={selected.activity.poster.height}
              />
              <figcaption>
                <span className={`activity-timeline__status activity-timeline__status--${selected.status}`}>
                  {STATUS_LABELS[selected.status]}
                </span>
                <p>{selected.activity.dateLabel}<span>{selected.activity.timeLabel}</span></p>
                <h2 id={dialogTitleId}>{selected.activity.title}</h2>
                <a href={selected.activity.detailUrl} target="_blank" rel="noreferrer">
                  打开活动详情 <span aria-hidden="true">↗</span>
                </a>
              </figcaption>
            </figure>
          </section>
        </div>
      )}
    </section>
  );
}
