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
} from "../activity-catalog";
import "./upcoming-activities.css";

interface UpcomingActivitiesProps {
  activities: readonly ActivityDefinition[];
}

type TiltStyle = CSSProperties & {
  "--activity-tilt-x"?: string;
  "--activity-tilt-y"?: string;
  "--activity-shine-x"?: string;
  "--activity-shine-y"?: string;
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

export function UpcomingActivities({ activities }: UpcomingActivitiesProps) {
  const [selected, setSelected] = useState<ActivityDefinition | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogTitleId = useId();

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

  if (!activities.length) return null;

  const scrollTrack = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({
      left: direction * Math.max(220, track.clientWidth * 0.72),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <section className="upcoming-activities" aria-labelledby="upcoming-activities-title">
      <header className="upcoming-activities__header">
        <div>
          <span>NOW / NEXT · 近期活动</span>
          <h2 id="upcoming-activities-title">最近，可以一起做什么</h2>
        </div>
        <p><b>{String(activities.length).padStart(2, "0")}</b> / 05</p>
        {activities.length > 1 && (
          <nav aria-label="横向浏览近期活动">
            <button type="button" onClick={() => scrollTrack(-1)} aria-label="查看前一组活动">←</button>
            <button type="button" onClick={() => scrollTrack(1)} aria-label="查看后一组活动">→</button>
          </nav>
        )}
      </header>

      <div
        className="upcoming-activities__track"
        data-count={activities.length}
        ref={trackRef}
        tabIndex={0}
        aria-label={`共 ${activities.length} 个尚未开始的活动，可横向滚动`}
      >
        {activities.map((activity, index) => (
          <article className="upcoming-activity" key={activity.id}>
            <button
              className="upcoming-activity__poster-button"
              type="button"
              aria-label={`放大海报：${activity.title}`}
              onClick={(event) => {
                lastTriggerRef.current = event.currentTarget;
                setSelected(activity);
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
              <span className="upcoming-activity__sequence" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="upcoming-activity__poster">
                <img
                  src={getActivityPosterSrc(activity)}
                  alt={activity.poster.alt}
                  width={activity.poster.width}
                  height={activity.poster.height}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  draggable="false"
                />
                <i aria-hidden="true" />
              </span>
              <span className="upcoming-activity__zoom" aria-hidden="true">点击放大 ＋</span>
            </button>
            <div className="upcoming-activity__copy">
              <p>{activity.dateLabel}<span>{activity.timeLabel}</span></p>
              <h3>{activity.title}</h3>
              <a href={activity.detailUrl} target="_blank" rel="noreferrer">
                查看详情 <span aria-hidden="true">↗</span>
              </a>
            </div>
          </article>
        ))}
      </div>

      {selected && (
        <div
          className="upcoming-activity-dialog"
          role="presentation"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            className="upcoming-activity-dialog__content"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
          >
            <button
              className="upcoming-activity-dialog__close"
              type="button"
              onClick={closeDialog}
              ref={closeRef}
              aria-label="关闭活动海报"
            >
              关闭 ×
            </button>
            <figure>
              <img
                src={getActivityPosterSrc(selected)}
                alt={selected.poster.alt}
                width={selected.poster.width}
                height={selected.poster.height}
              />
              <figcaption>
                <p>{selected.dateLabel}<span>{selected.timeLabel}</span></p>
                <h2 id={dialogTitleId}>{selected.title}</h2>
                <a href={selected.detailUrl} target="_blank" rel="noreferrer">
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
