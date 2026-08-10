import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type TouchEvent,
} from "react";
import type { PhotoRecord } from "../photo-catalog";
import "./photo-museum.css";

interface PhotoMuseumProps {
  photos: PhotoRecord[];
  assetBase: string;
}

function assetUrl(assetBase: string, path: string): string {
  return `${assetBase.replace(/\/$/, "")}/${path}`;
}

function PhotoCard({
  photo,
  assetBase,
  onOpen,
  duplicate = false,
}: {
  photo: PhotoRecord;
  assetBase: string;
  onOpen: (photo: PhotoRecord, trigger: HTMLButtonElement) => void;
  duplicate?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <button
      className="photo-museum__card"
      type="button"
      style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
      onClick={(event) => onOpen(photo, event.currentTarget)}
      tabIndex={duplicate ? -1 : 0}
      data-photo-id={photo.id}
      aria-label={`放大查看：${photo.alt}`}
    >
      {failed ? (
        <span className="photo-museum__image-error" role="img" aria-label={photo.alt}>
          <b>影像暂时无法显示</b>
          <small>{photo.id}</small>
        </span>
      ) : (
        <img
          src={assetUrl(assetBase, photo.thumbnailPath)}
          alt={photo.alt}
          loading="lazy"
          decoding="async"
          draggable="false"
          onError={() => setFailed(true)}
        />
      )}
      <span className="photo-museum__card-index" aria-hidden="true">
        {String(photo.displayOrder).padStart(2, "0")}
      </span>
    </button>
  );
}

function PhotoLane({
  photos,
  assetBase,
  direction,
  onOpen,
}: {
  photos: PhotoRecord[];
  assetBase: string;
  direction: "left" | "right";
  onOpen: (photo: PhotoRecord, trigger: HTMLButtonElement) => void;
}) {
  return (
    <div className={`photo-museum__lane photo-museum__lane--${direction}`}>
      <div className="photo-museum__track">
        {[false, true].map((duplicate) => (
          <div
            className="photo-museum__set"
            key={duplicate ? "duplicate" : "primary"}
            aria-hidden={duplicate || undefined}
          >
            {photos.map((photo) => (
              <PhotoCard
                photo={photo}
                assetBase={assetBase}
                onOpen={onOpen}
                duplicate={duplicate}
                key={`${duplicate ? "copy" : "source"}-${photo.id}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PhotoMuseum({ photos, assetBase }: PhotoMuseumProps) {
  const orderedPhotos = useMemo(
    () => [...photos].sort((a, b) => a.displayOrder - b.displayOrder),
    [photos],
  );
  const lanes = useMemo(
    () => [
      orderedPhotos,
      [...orderedPhotos].reverse(),
    ],
    [orderedPhotos],
  );
  const [paused, setPaused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const touchStartRef = useRef<number | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frame = window.requestAnimationFrame(() => {
      if (reducedMotion.matches) setPaused(true);
    });
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setPaused(true);
    };
    reducedMotion.addEventListener("change", onChange);
    return () => {
      window.cancelAnimationFrame(frame);
      reducedMotion.removeEventListener("change", onChange);
    };
  }, []);

  const openPhoto = useCallback(
    (photo: PhotoRecord, trigger: HTMLButtonElement) => {
      const index = orderedPhotos.findIndex((item) => item.id === photo.id);
      if (index < 0) return;
      previousFocusRef.current = trigger;
      setSelectedIndex(index);
    },
    [orderedPhotos],
  );

  const closePhoto = useCallback(() => {
    setSelectedIndex(null);
    window.requestAnimationFrame(() => previousFocusRef.current?.focus());
  }, []);

  const movePhoto = useCallback(
    (step: number) => {
      setSelectedIndex((current) => {
        if (current === null) return null;
        return (current + step + orderedPhotos.length) % orderedPhotos.length;
      });
    },
    [orderedPhotos.length],
  );

  useEffect(() => {
    if (selectedIndex === null) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePhoto();
      if (event.key === "ArrowLeft") movePhoto(-1);
      if (event.key === "ArrowRight") movePhoto(1);
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closePhoto, movePhoto, selectedIndex]);

  const handleTouchStart = (event: TouchEvent) => {
    touchStartRef.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    const start = touchStartRef.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartRef.current = null;
    if (start === null || end === undefined || Math.abs(start - end) < 48) return;
    movePhoto(start > end ? 1 : -1);
  };

  const selectedPhoto = selectedIndex === null ? null : orderedPhotos[selectedIndex];
  const rootStyle = { "--photo-duration": `${Math.max(120, orderedPhotos.length * 6)}s` } as CSSProperties;

  return (
    <div className="photo-museum" data-paused={paused ? "true" : "false"} style={rootStyle}>
      <header className="photo-museum__header">
        <div>
          <p>PHOTO MUSEUM · COMMUNITY MEMORY</p>
          <h2>我们一起留下的现场</h2>
        </div>
        <div className="photo-museum__header-meta">
          <span>{String(orderedPhotos.length).padStart(2, "0")} FRAGMENTS</span>
          <span>CHIANG MAI</span>
          <button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>
            <b aria-hidden="true">{paused ? "▶" : "Ⅱ"}</b>
            {paused ? "继续流动" : "暂停流动"}
          </button>
        </div>
      </header>

      <div className="photo-museum__viewport" aria-label="CMI Community 动态照片墙">
        <PhotoLane photos={lanes[0]} assetBase={assetBase} direction="left" onOpen={openPhoto} />
        <PhotoLane photos={lanes[1]} assetBase={assetBase} direction="right" onOpen={openPhoto} />
      </div>

      <footer className="photo-museum__footer">
        <span>每一张照片保持原始比例</span>
        <span>点击进入全屏浏览</span>
      </footer>

      {selectedPhoto && selectedIndex !== null && (
        <div
          className="photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`照片 ${selectedIndex + 1} / ${orderedPhotos.length}`}
          ref={dialogRef}
        >
          <button className="photo-lightbox__backdrop" type="button" onClick={closePhoto} aria-label="关闭照片" />
          <header className="photo-lightbox__header">
            <div>
              <b>PHOTO MUSEUM</b>
              <span>{String(selectedIndex + 1).padStart(2, "0")} / {String(orderedPhotos.length).padStart(2, "0")}</span>
            </div>
            <button type="button" onClick={closePhoto} ref={closeButtonRef}>
              关闭 <span aria-hidden="true">×</span>
            </button>
          </header>
          <figure onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <img
              src={assetUrl(assetBase, selectedPhoto.fullPath)}
              alt={selectedPhoto.alt}
              width={selectedPhoto.width}
              height={selectedPhoto.height}
            />
          </figure>
          <nav className="photo-lightbox__controls" aria-label="照片切换">
            <button type="button" onClick={() => movePhoto(-1)} aria-label="上一张照片">← <span>上一张</span></button>
            <p>{selectedPhoto.alt}</p>
            <button type="button" onClick={() => movePhoto(1)} aria-label="下一张照片"><span>下一张</span> →</button>
          </nav>
        </div>
      )}
    </div>
  );
}
