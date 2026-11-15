import { useEffect, useRef, useState, type TouchEvent } from "react";
import type { CommunityPhoto } from "./content-schema";

export function ContentGallery({ photos }: { photos: CommunityPhoto[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const open = selectedIndex !== null;
  const photo = selectedIndex === null ? null : photos[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  function move(step: number) {
    setSelectedIndex(current => current === null || !photos.length ? null
      : (current + step + photos.length) % photos.length);
  }
  function touchStart(event: TouchEvent) {
    const touch = event.touches[0];
    touchRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }
  function touchEnd(event: TouchEvent) {
    const start = touchRef.current;
    const end = event.changedTouches[0];
    touchRef.current = null;
    if (!start || !end) return;
    const dx = end.clientX - start.x;
    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(end.clientY - start.y)) move(dx < 0 ? 1 : -1);
  }

  return <>
    <div className="content-photo-gallery">
      {photos.map((item, index) => <button type="button" className="content-photo-gallery__item" key={item.id} aria-label={`放大查看：${item.alt}`} onClick={event => { triggerRef.current = event.currentTarget; setSelectedIndex(index); }}>
        <img src={item.thumbnailUrl} alt={item.alt} width={item.width} height={item.height} loading="lazy" decoding="async" />
        <span>{item.alt}</span>
      </button>)}
    </div>
    <dialog ref={dialogRef} className="content-gallery__dialog" aria-label="栏目照片浏览" onCancel={event => { event.preventDefault(); setSelectedIndex(null); }} onClose={() => setSelectedIndex(null)} onKeyDown={event => {
      if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
    }}>
      <button className="content-gallery__backdrop" tabIndex={-1} aria-label="关闭照片背景" type="button" onClick={() => setSelectedIndex(null)} />
      <header className="content-gallery__header"><span>{selectedIndex === null ? "" : `${selectedIndex + 1} / ${photos.length}`}</span><button type="button" autoFocus onClick={() => setSelectedIndex(null)}>关闭照片 ×</button></header>
      <figure className="content-gallery__stage" onTouchStart={touchStart} onTouchEnd={touchEnd} onClick={event => { if (event.target === event.currentTarget) setSelectedIndex(null); }}>
        {photo && <img src={photo.url} alt={photo.alt} width={photo.width} height={photo.height} />}
      </figure>
      <footer className="content-gallery__controls"><button type="button" disabled={photos.length < 2} onClick={() => move(-1)} aria-label="上一张照片">←</button><p>{photo?.alt}</p><button type="button" disabled={photos.length < 2} onClick={() => move(1)} aria-label="下一张照片">→</button></footer>
    </dialog>
  </>;
}
