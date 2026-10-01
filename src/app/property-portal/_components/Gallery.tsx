'use client';

import { useRef, useState } from 'react';
import { Lightbox } from './Lightbox';
import { sizedImage, fallbackToOriginal } from './types';

// The listing gallery. Desktop: one large photograph with up to four smaller
// ones beside it and a "View all photos" button. Phones: a full-width strip
// you swipe through, with a counter. Either way a tap opens the full-screen
// viewer. Only the first photograph loads eagerly; the grid uses resized
// copies and the viewer shows the originals.
export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState(-1);
  const [at, setAt] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const count = images.length;

  if (!count) {
    return <div className="pp-gal pp-gal--empty" aria-hidden="true">&#8962;</div>;
  }

  const tiles = images.slice(0, 5);
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    setAt(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };

  return (
    <>
      {/* Desktop / tablet grid */}
      <div className={`pp-gal pp-gal--n${Math.min(tiles.length, 5)}`}>
        {tiles.map((src, i) => (
          <button
            type="button"
            key={src + i}
            className="pp-gal-tile"
            onClick={() => setOpen(i)}
            aria-label={i === 0 ? `Open photo gallery, ${count} photo${count === 1 ? '' : 's'}` : `Open photo ${i + 1} of ${count}`}
          >
            <img
              src={sizedImage(src, i === 0 ? 1600 : 700) || src}
              alt={i === 0 ? title : ''}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={i === 0 ? 'high' : undefined}
              onError={fallbackToOriginal}
            />
          </button>
        ))}
        {count > 1 && (
          <button type="button" className="pp-gal-all" onClick={() => setOpen(0)}>
            View all {count} photos
          </button>
        )}
      </div>

      {/* Phone strip */}
      <div className="pp-gal-swipe">
        <div className="pp-gal-track" ref={track} onScroll={onScroll} tabIndex={0} role="group" aria-label={`Photos of ${title}`}>
          {images.map((src, i) => (
            <button type="button" key={src + i} onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1} of ${count}`}>
              <img
                src={sizedImage(src, 900) || src}
                alt={i === 0 ? title : ''}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                onError={fallbackToOriginal}
              />
            </button>
          ))}
        </div>
        <span className="pp-gal-counter" aria-hidden="true">{Math.min(at + 1, count)} / {count}</span>
      </div>

      {open >= 0 && (
        <Lightbox images={images} index={open} alt={title} onClose={() => setOpen(-1)} onIndex={setOpen} />
      )}
    </>
  );
}
