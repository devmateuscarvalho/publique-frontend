"use client";

import {
  Children,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

type Props = {
  label: string;
  prevLabel: string;
  nextLabel: string;
  children: ReactNode;
  initialIndex?: number;
  className?: string;
  trackClassName?: string;
  slideClassName?: string;
};

export function MarketingCarousel({
  label,
  prevLabel,
  nextLabel,
  children,
  initialIndex = 0,
  className,
  trackClassName,
  slideClassName,
}: Props) {
  const slides = Children.toArray(children).filter(Boolean);
  const count = slides.length;
  const [active, setActive] = useState(() => clamp(initialIndex, 0, Math.max(0, count - 1)));
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; moved: boolean } | null>(null);
  const labelId = useId();

  useEffect(() => {
    setActive(clamp(initialIndex, 0, Math.max(0, count - 1)));
  }, [count, initialIndex]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const update = () => setViewportWidth(viewport.clientWidth);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [count]);

  if (count === 0) return null;

  const atStart = active <= 0;
  const atEnd = active >= count - 1;
  const step = viewportWidth;

  function goTo(index: number) {
    setDragOffset(0);
    setActive(clamp(index, 0, count - 1));
  }

  function goBy(delta: number) {
    setDragOffset(0);
    setActive((current) => clamp(current + delta, 0, count - 1));
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("a, button, input, textarea, select, label")) return;
    dragRef.current = { startX: event.clientX, moved: false };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || step <= 0) return;
    const delta = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(delta) < 8) return;
    if (!drag.moved) {
      drag.moved = true;
      setDragging(true);
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // already released
      }
    }
    const maxPull = step * 0.35;
    const resisted =
      (active <= 0 && delta > 0) || (active >= count - 1 && delta < 0) ? delta * 0.35 : delta;
    setDragOffset(clamp(resisted, -maxPull, maxPull));
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!drag || !drag.moved || step <= 0) {
      setDragOffset(0);
      return;
    }
    const delta = event.clientX - drag.startX;
    const threshold = Math.min(72, step * 0.18);
    if (delta <= -threshold) goBy(1);
    else if (delta >= threshold) goBy(-1);
    else setDragOffset(0);
  }

  const trackStyle = {
    transform: step > 0 ? `translate3d(${-active * step + dragOffset}px, 0, 0)` : undefined,
    transition: dragging || step <= 0 ? "none" : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
  } as const;

  return (
    <div className={`m-carousel${className ? ` ${className}` : ""}`} role="region" aria-labelledby={labelId}>
      <p id={labelId} className="m-carousel-label">
        {label}
      </p>

      <div className="m-carousel-shell">
        <button
          type="button"
          className="m-carousel-arrow m-carousel-arrow-prev"
          aria-label={prevLabel}
          disabled={atStart}
          onClick={() => goBy(-1)}
        >
          <Chevron dir="prev" />
        </button>

        <div
          ref={viewportRef}
          className={`m-carousel-viewport${dragging ? " is-dragging" : ""}`}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              goBy(-1);
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              goBy(1);
            }
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div
            className={`m-carousel-track${trackClassName ? ` ${trackClassName}` : ""}`}
            style={trackStyle}
          >
            {slides.map((slide, index) => {
              const isActive = index === active;
              return (
                <div
                  key={index}
                  className={`m-carousel-slide${slideClassName ? ` ${slideClassName}` : ""}`}
                  style={step > 0 ? { flexBasis: step, width: step } : undefined}
                  data-active={isActive ? "true" : "false"}
                  aria-hidden={isActive ? undefined : true}
                  inert={isActive ? undefined : true}
                >
                  <div className="m-carousel-slide-inner">{slide}</div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="m-carousel-arrow m-carousel-arrow-next"
          aria-label={nextLabel}
          disabled={atEnd}
          onClick={() => goBy(1)}
        >
          <Chevron dir="next" />
        </button>
      </div>

      <div className="m-carousel-dots" role="tablist" aria-label={label}>
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-label={`${index + 1} / ${count}`}
            className="m-carousel-dot"
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      {dir === "prev" ? (
        <path d="M11.5 3.5 6 9l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
      ) : (
        <path d="M6.5 3.5 12 9l-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
      )}
    </svg>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
