'use client';

import { useCallback, useEffect } from 'react';

// Full-screen image viewer for a listing's gallery. Keyboard-navigable and
// focus-trapped enough to be usable without a mouse: Esc closes, arrows move.
export function Lightbox({
  images,
  index,
  alt,
  onClose,
  onIndex,
}: {
  images: string[];
  index: number;
  alt: string;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const count = images.length;

  const go = useCallback(
    (delta: number) => onIndex((index + delta + count) % count),
    [index, count, onIndex]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    }
    document.addEventListener('keydown', onKey);
    // Stop the page behind scrolling while the viewer is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, go]);

  return (
    <div
      className="pp-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} — image ${index + 1} of ${count}`}
      onClick={onClose}
    >
      <button className="pp-lb-close" onClick={onClose} aria-label="Close gallery">×</button>

      {count > 1 && (
        <button
          className="pp-lb-nav pp-lb-prev"
          aria-label="Previous image"
          onClick={(e) => { e.stopPropagation(); go(-1); }}
        >
          ‹
        </button>
      )}

      {/* stopPropagation so clicking the photo itself doesn't dismiss */}
      <img
        className="pp-lb-img"
        src={images[index]}
        alt={`${alt} — ${index + 1} of ${count}`}
        onClick={(e) => e.stopPropagation()}
      />

      {count > 1 && (
        <button
          className="pp-lb-nav pp-lb-next"
          aria-label="Next image"
          onClick={(e) => { e.stopPropagation(); go(1); }}
        >
          ›
        </button>
      )}

      <div className="pp-lb-count">{index + 1} / {count}</div>
    </div>
  );
}
