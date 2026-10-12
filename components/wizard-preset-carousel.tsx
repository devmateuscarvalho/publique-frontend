"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { Button } from "@/components/ui/button";
import type { CreativeRecipe } from "@/lib/api";
import { usePresetCopy } from "@/lib/preset-i18n";
import { cn } from "@/lib/utils";

type Props = {
  recipes: CreativeRecipe[];
  selectedId: string;
  onSelect: (recipe: CreativeRecipe) => void;
  onPreview?: (recipe: CreativeRecipe) => void;
  onConfirm?: (recipe: CreativeRecipe) => void;
  kindLabel: (kind: string) => string;
  prevLabel: string;
  nextLabel: string;
  label: string;
};

export function WizardPresetCarousel({
  recipes,
  selectedId,
  onSelect,
  onPreview,
  onConfirm,
  kindLabel,
  prevLabel,
  nextLabel,
  label,
}: Props) {
  const copy = usePresetCopy();
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pendingRef = useRef<number | null>(null);
  const settleRef = useRef<number | null>(null);
  const dragRef = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const activeIndex = Math.max(
    0,
    recipes.findIndex((recipe) => recipe.id === selectedId),
  );

  const nearestIndex = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) {
      return 0;
    }
    const center = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    slideRefs.current.forEach((slide, index) => {
      if (!slide) {
        return;
      }
      const mid = slide.offsetLeft + slide.offsetWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });
    return best;
  }, []);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    const slide = slideRefs.current[index];
    if (!track || !slide) {
      return;
    }
    const left = slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2;
    pendingRef.current = index;
    track.scrollTo({ left, behavior });
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => scrollToIndex(activeIndex, "auto"));
    return () => window.cancelAnimationFrame(frame);
  }, [activeIndex, recipes.length, scrollToIndex]);

  const commit = (index: number) => {
    const clamped = Math.max(0, Math.min(recipes.length - 1, index));
    const recipe = recipes[clamped];
    if (!recipe) {
      return;
    }
    if (recipe.id !== selectedId) {
      onSelect(recipe);
    }
  };

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    if (pendingRef.current !== null) {
      if (nearestIndex() === pendingRef.current) {
        pendingRef.current = null;
      }
      return;
    }
    if (dragRef.current) {
      return;
    }
    if (settleRef.current !== null) {
      window.clearTimeout(settleRef.current);
    }
    settleRef.current = window.setTimeout(() => {
      settleRef.current = null;
      commit(nearestIndex());
    }, 80);
  };

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(recipes.length - 1, index));
    commit(clamped);
    scrollToIndex(clamped);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }
    const track = trackRef.current;
    if (!track) {
      return;
    }
    dragRef.current = { startX: event.clientX, startScroll: track.scrollLeft, moved: false };
    pendingRef.current = null;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const track = trackRef.current;
    if (!drag || !track) {
      return;
    }
    const delta = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(delta) <= 8) {
      return;
    }
    if (!drag.moved) {
      drag.moved = true;
      track.style.scrollSnapType = "none";
      try {
        track.setPointerCapture(event.pointerId);
      } catch {
        // Pointer already released.
      }
      setDragging(true);
    }
    track.scrollLeft = drag.startScroll - (event.clientX - drag.startX);
  };

  const endDrag = () => {
    const track = trackRef.current;
    const moved = dragRef.current?.moved ?? false;
    dragRef.current = null;
    setDragging(false);
    if (track) {
      track.style.scrollSnapType = "";
    }
    if (!moved) {
      return;
    }
    suppressClickRef.current = true;
    const next = nearestIndex();
    commit(next);
    scrollToIndex(next);
  };

  if (recipes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 md:space-y-4" role="region" aria-roledescription="carousel" aria-label={label}>
      <div className="relative">
        <div
          ref={trackRef}
          className={cn(
            "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-[8%] pb-1 pt-1 scrollbar-none md:mx-0 md:gap-4 md:px-[12%]",
            dragging ? "cursor-grabbing" : "cursor-grab",
          )}
          onScroll={handleScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={(event) => {
            if (!suppressClickRef.current) {
              return;
            }
            suppressClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          {recipes.map((recipe, index) => {
            const active = recipe.id === selectedId;
            const portrait = recipe.output_kind === "market_topic";
            return (
              <button
                key={recipe.id}
                ref={(node) => {
                  slideRefs.current[index] = node;
                }}
                type="button"
                aria-current={active ? "true" : undefined}
                className={cn(
                  "w-[84%] shrink-0 snap-center overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition duration-300 md:w-[70%] md:max-w-[22rem] md:rounded-3xl",
                  active
                    ? "scale-100 border-foreground shadow-md"
                    : "scale-[0.97] border-input opacity-70",
                )}
                onClick={() => {
                  goTo(index);
                  onPreview?.(recipes[index]);
                }}
                onDoubleClick={() => {
                  if (suppressClickRef.current) {
                    return;
                  }
                  const recipe = recipes[index];
                  if (!recipe) {
                    return;
                  }
                  goTo(index);
                  onConfirm?.(recipe);
                }}
              >
                <span className="relative block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={recipe.preview_path}
                    alt=""
                    draggable={false}
                    className={cn(
                      "w-full object-cover aspect-square",
                      portrait ? "md:aspect-[4/5]" : "md:aspect-square",
                    )}
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-3 pt-10 text-white md:p-4 md:pt-12">
                    <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-white/80">
                      {kindLabel(recipe.output_kind)}
                    </span>
                    <span className="mt-0.5 block text-base font-semibold leading-tight md:mt-1 md:text-lg">
                      {copy.name(recipe)}
                    </span>
                  </span>
                </span>
                <span className="block px-3 py-2.5 text-sm leading-snug text-ink/70 line-clamp-2 md:px-4 md:py-3 md:leading-relaxed">
                  {copy.blurb(recipe)}
                </span>
              </button>
            );
          })}
        </div>

        {recipes.length > 1 ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute left-1 top-[34%] z-10 hidden size-11 rounded-full bg-background/90 shadow-sm sm:inline-flex"
              disabled={activeIndex === 0}
              aria-label={prevLabel}
              onClick={() => goTo(activeIndex - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute right-1 top-[34%] z-10 hidden size-11 rounded-full bg-background/90 shadow-sm sm:inline-flex"
              disabled={activeIndex === recipes.length - 1}
              aria-label={nextLabel}
              onClick={() => goTo(activeIndex + 1)}
            >
              <ChevronRight />
            </Button>
          </>
        ) : null}
      </div>

      {recipes.length > 1 ? (
        <div className="flex items-center justify-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 shrink-0 rounded-full sm:hidden"
            disabled={activeIndex === 0}
            aria-label={prevLabel}
            onClick={() => goTo(activeIndex - 1)}
          >
            <ChevronLeft />
          </Button>
          <div className="flex items-center justify-center">
            {recipes.map((recipe, index) => {
              const active = recipe.id === selectedId;
              return (
                <button
                  key={recipe.id}
                  type="button"
                  aria-label={`${index + 1}`}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full",
                    active ? "opacity-100" : "opacity-50",
                  )}
                  onClick={() => goTo(index)}
                >
                  <span
                    className={cn(
                      "block rounded-full transition-all",
                      active ? "h-2.5 w-5 bg-foreground" : "size-2.5 bg-ink/40",
                    )}
                  />
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 shrink-0 rounded-full sm:hidden"
            disabled={activeIndex === recipes.length - 1}
            aria-label={nextLabel}
            onClick={() => goTo(activeIndex + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
