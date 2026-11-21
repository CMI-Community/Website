import { useEffect, useRef, useState } from "react";
import type { CommunitySeries } from "./content-schema";

export type HomeSeriesEntry = Pick<CommunitySeries, "slug" | "name" | "description" | "logoUrl">;

export function HomeSeries({ series }: { series: HomeSeriesEntry[] | null }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ previous: false, next: false });
  const count = series?.length ?? 0;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const updateEdges = () => {
      const previous = track.scrollLeft > 1;
      const next = track.scrollLeft + track.clientWidth < track.scrollWidth - 1;
      setEdges(current => current.previous === previous && current.next === next
        ? current
        : { previous, next });
    };

    const observer = new ResizeObserver(updateEdges);
    observer.observe(track);
    track.addEventListener("scroll", updateEdges, { passive: true });
    updateEdges();
    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", updateEdges);
    };
  }, [count]);

  function scrollSeries(direction: -1 | 1) {
    const track = trackRef.current;
    if (track) track.scrollBy({ left: direction * track.clientWidth * 0.8 });
  }

  return (
    <section className="home-series" aria-labelledby="home-series-title">
      <header className="home-series__header">
        <h2 id="home-series-title">社区系列活动</h2>
        <div className="home-series__actions">
          {count > 1 && (
            <div className="home-series__arrows" hidden={!edges.previous && !edges.next}>
              <button type="button" aria-label="向左浏览系列" aria-controls="home-series-track" disabled={!edges.previous} onClick={() => scrollSeries(-1)}>
                <span aria-hidden="true">←</span>
              </button>
              <button type="button" aria-label="向右浏览系列" aria-controls="home-series-track" disabled={!edges.next} onClick={() => scrollSeries(1)}>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
          <a className="home-series__all" href="/series">查看全部系列 <span aria-hidden="true">→</span></a>
        </div>
      </header>

      {series?.length ? (
        <ul className="home-series__track" id="home-series-track" ref={trackRef}>
          {series.map((entry) => (
            <li key={entry.slug}>
              <a className="home-series__card" href={`/series/${encodeURIComponent(entry.slug)}`}>
                <span className="home-series__logo" aria-hidden="true">
                  {Array.from(entry.name)[0]}
                  {entry.logoUrl && (
                    <img src={entry.logoUrl} alt="" width={64} height={64} loading="lazy" decoding="async"
                      onError={event => { event.currentTarget.hidden = true; }} />
                  )}
                </span>
                <div className="home-series__copy">
                  <h3>{entry.name}</h3>
                  {entry.description && <p>{entry.description}</p>}
                </div>
                <span className="home-series__arrow" aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="home-series__message" role="status">
          {series === null ? "系列暂时无法加载，请稍后再试。" : "系列栏目正在整理。"}
        </p>
      )}
    </section>
  );
}
