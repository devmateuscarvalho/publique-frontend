"use client";

import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
} from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { useTranslations } from "next-intl";

import { Iphone } from "@/components/ui/iphone";
import { cn } from "@/lib/utils";

type HeartBurst = {
  id: number;
  x: number;
  y: number;
  dx: number;
  delay: number;
  size: number;
};

type InstagramPhonePreviewProps = {
  brandName: string;
  logoUrl?: string;
  logoInvertedUrl?: string;
  /** Single image. Ignored when `imageUrls` has 2+ entries. */
  imageUrl?: string;
  /** Carousel slides in order. Swipe/scroll inside the phone; dots + "n/N" badge like Instagram. */
  imageUrls?: string[];
  /** Controlled active slide (optional). */
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  caption: string;
  captionPending?: boolean;
  emptyImageLabel: string;
  emptyCaptionLabel: string;
  generatingCaptionLabel: string;
  /** ICU template with `{count}`, e.g. "{count} likes". */
  likesLabel: string;
  /** Media aspect: feed square, feed portrait 4:5, or full-bleed Stories 9:16. */
  aspect?: "square" | "portrait" | "story";
  className?: string;
};

function randomMillionPlusLikes(): number {
  // 1,000,000 … 999,999,999
  return 1_000_000 + Math.floor(Math.random() * 999_000_000);
}

function formatLikes(likes: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(likes);
}

export function InstagramPhonePreview({
  brandName,
  logoUrl,
  logoInvertedUrl,
  imageUrl,
  imageUrls,
  activeIndex,
  onActiveIndexChange,
  caption,
  captionPending = false,
  emptyImageLabel,
  emptyCaptionLabel,
  generatingCaptionLabel,
  likesLabel,
  aspect = "square",
  className,
}: InstagramPhonePreviewProps) {
  const t = useTranslations("backoffice");
  const [likesCount, setLikesCount] = useState(randomMillionPlusLikes);
  const [liked, setLiked] = useState(false);
  const [bursts, setBursts] = useState<HeartBurst[]>([]);
  const [internalIndex, setInternalIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const likedRef = useRef(false);
  const burstSeq = useRef(0);
  const burstTimers = useRef<number[]>([]);
  const tapStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const lastTapRef = useRef<{ x: number; y: number; t: number } | null>(null);
  // Index we are scrolling to programmatically; scroll events are ignored until we land there.
  const pendingTargetRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const dragRef = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null);
  useEffect(() => {
    return () => {
      for (const timer of burstTimers.current) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  const spawnHearts = (clientX: number, clientY: number) => {
    const box = mediaRef.current?.getBoundingClientRect();
    if (!box) {
      return;
    }
    const x = clientX - box.left;
    const y = clientY - box.top;
    const created: HeartBurst[] = [
      { id: ++burstSeq.current, x, y, dx: 0, delay: 0, size: 56 },
      { id: ++burstSeq.current, x, y, dx: -22, delay: 70, size: 26 },
      { id: ++burstSeq.current, x, y, dx: 20, delay: 120, size: 22 },
    ];
    setBursts((list) => [...list, ...created]);
    const ids = new Set(created.map((item) => item.id));
    const timer = window.setTimeout(() => {
      setBursts((list) => list.filter((item) => !ids.has(item.id)));
    }, 1200);
    burstTimers.current.push(timer);
  };

  const giveLike = (clientX: number, clientY: number) => {
    spawnHearts(clientX, clientY);
    if (likedRef.current) {
      return;
    }
    likedRef.current = true;
    setLiked(true);
    setLikesCount((count) => count + 1);
  };

  const onHeartClick = () => {
    if (likedRef.current) {
      likedRef.current = false;
      setLiked(false);
      setLikesCount((count) => Math.max(0, count - 1));
      return;
    }
    const box = mediaRef.current?.getBoundingClientRect();
    if (!box) {
      return;
    }
    giveLike(box.left + box.width / 2, box.top + box.height * 0.62);
  };

  const onMediaPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }
    tapStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
  };

  const onMediaPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = tapStartRef.current;
    tapStartRef.current = null;
    if (!start || start.pointerId !== event.pointerId) {
      return;
    }
    if ((event.target as HTMLElement).closest("button")) {
      lastTapRef.current = null;
      return;
    }
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) {
      lastTapRef.current = null;
      return;
    }
    const now = performance.now();
    const last = lastTapRef.current;
    if (
      last &&
      now - last.t < 350 &&
      Math.hypot(event.clientX - last.x, event.clientY - last.y) < 40
    ) {
      lastTapRef.current = null;
      giveLike(event.clientX, event.clientY);
      return;
    }
    lastTapRef.current = { x: event.clientX, y: event.clientY, t: now };
  };

  const likesText = likesLabel.replace("{count}", formatLikes(likesCount));
  const initial = (brandName || "?").trim().charAt(0).toUpperCase() || "?";
  const displayName = brandName.trim() || "brand";
  const lightLogo = logoUrl || logoInvertedUrl || "";
  const darkLogo = logoInvertedUrl || logoUrl || "";
  const captionText = captionPending
    ? generatingCaptionLabel
    : caption.trim() || emptyCaptionLabel;

  const slides = (imageUrls ?? []).filter(Boolean);
  const isCarousel = slides.length > 1;
  const current = Math.min(activeIndex ?? internalIndex, Math.max(slides.length - 1, 0));

  const scrollToIndex = (index: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) {
      return;
    }
    const target = index * track.clientWidth;
    if (Math.abs(track.scrollLeft - target) <= 2) {
      pendingTargetRef.current = null;
      return;
    }
    pendingTargetRef.current = index;
    track.scrollTo({ left: target, behavior });
  };

  // Scroll the track when the controlled index changes from outside (arrow buttons).
  useEffect(() => {
    if (!isCarousel) {
      return;
    }
    scrollToIndex(current);
  }, [current, isCarousel]);

  const commitIndex = (next: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, next));
    if (clamped !== current) {
      setInternalIndex(clamped);
      onActiveIndexChange?.(clamped);
    }
  };

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) {
      return;
    }
    const position = track.scrollLeft / track.clientWidth;
    // While a programmatic scroll is in flight, wait until it lands before reading the index.
    if (pendingTargetRef.current !== null) {
      if (Math.abs(position - pendingTargetRef.current) < 0.02) {
        pendingTargetRef.current = null;
      }
      return;
    }
    if (dragRef.current) {
      return;
    }
    // User-driven scroll (touch / wheel): commit once it settles.
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
    }
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      const el = trackRef.current;
      if (!el || el.clientWidth === 0) {
        return;
      }
      commitIndex(Math.round(el.scrollLeft / el.clientWidth));
    }, 80);
  };

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, index));
    commitIndex(clamped);
    scrollToIndex(clamped);
  };

  // Mouse drag (desktop): scroll-snap containers do not drag natively with a mouse.
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) {
      return;
    }
    const track = trackRef.current;
    if (!track) {
      return;
    }
    dragRef.current = { startX: e.clientX, startScroll: track.scrollLeft, moved: false };
    pendingTargetRef.current = null;
    track.style.scrollSnapType = "none";
    track.style.scrollBehavior = "auto";
    try {
      track.setPointerCapture(e.pointerId);
    } catch {
      // Ignore pointers that are not active (for example a synthetic event).
    }
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const track = trackRef.current;
    if (!drag || !track) {
      return;
    }
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 3) {
      drag.moved = true;
    }
    track.scrollLeft = drag.startScroll - dx;
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const track = trackRef.current;
    if (!drag || !track) {
      return;
    }
    dragRef.current = null;
    setDragging(false);
    try {
      if (track.hasPointerCapture(e.pointerId)) {
        track.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore pointers that are not active.
    }
    track.style.scrollSnapType = "";
    track.style.scrollBehavior = "";
    const width = track.clientWidth || 1;
    const dx = e.clientX - drag.startX;
    let next = Math.round(track.scrollLeft / width);
    // A short flick still advances one slide in the flick direction.
    if (Math.abs(dx) > width * 0.12 && next === current) {
      next = dx < 0 ? current + 1 : current - 1;
    }
    goTo(next);
  };

  const storySrc = imageUrl || slides[0] || "";
  const isStory = aspect === "story";

  if (isStory) {
    return (
      <div className={cn("mx-auto w-full max-w-[380px] lg:max-w-[300px] xl:max-w-[320px]", className)}>
        <Iphone>
          <div className="relative flex size-full flex-col overflow-hidden bg-black text-white">
            <div
              ref={mediaRef}
              onPointerDown={onMediaPointerDown}
              onPointerUp={onMediaPointerUp}
              className="absolute inset-0"
            >
              {storySrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={storySrc}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-neutral-900 px-6 text-center text-[12px] leading-snug text-neutral-400">
                  {emptyImageLabel}
                </div>
              )}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/65 to-transparent"
              />
              {bursts.map((burst) => (
                <Heart
                  key={burst.id}
                  aria-hidden
                  className="pointer-events-none absolute z-20 fill-rose-500 text-rose-500 drop-shadow-md"
                  style={{
                    left: burst.x,
                    top: burst.y,
                    width: burst.size,
                    height: burst.size,
                    ["--heart-dx" as string]: `${burst.dx}px`,
                    animation: `heart-rise 900ms ease-out ${burst.delay}ms both`,
                  }}
                />
              ))}
            </div>

            <div className="relative z-10 flex shrink-0 flex-col px-3 pb-2 pt-3">
              <div className="mb-2 h-0.5 overflow-hidden rounded-full bg-white/35">
                <div className="h-full w-[38%] rounded-full bg-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-400 via-rose-500 to-violet-600 p-[1.5px]">
                  <span className="flex size-full items-center justify-center overflow-hidden rounded-full bg-black">
                    {lightLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={darkLogo || lightLogo} alt="" className="size-full object-contain p-0.5" />
                    ) : (
                      <span className="text-[11px] font-semibold">{initial}</span>
                    )}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold leading-tight drop-shadow">{displayName}</p>
                  <p className="text-[10px] text-white/80 drop-shadow">{t("phoneStoryNow")}</p>
                </div>
                <MoreHorizontal className="size-4 shrink-0 text-white drop-shadow" aria-hidden />
              </div>
            </div>

            <div className="relative z-10 mt-auto px-3 pb-4 pt-2">
              {caption.trim() || captionPending ? (
                <p
                  className={cn(
                    "mb-3 line-clamp-3 whitespace-pre-wrap text-[12px] leading-snug drop-shadow",
                    captionPending && "animate-pulse text-white/70",
                  )}
                >
                  {captionText}
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <div className="min-h-10 flex-1 rounded-full border border-white/55 bg-black/25 px-3 py-2 text-[12px] text-white/70 backdrop-blur-sm">
                  {t("phoneStoryReply")}
                </div>
                <Heart className="size-6 shrink-0 text-white drop-shadow" aria-hidden />
                <Send className="size-6 shrink-0 text-white drop-shadow" aria-hidden />
              </div>
            </div>
          </div>
        </Iphone>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto w-full max-w-[380px] lg:max-w-[300px] xl:max-w-[320px]", className)}>
      <Iphone>
        <div className="flex size-full flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
          <div className="flex shrink-0 items-end justify-between px-5 pb-1.5 pt-3 text-[10px] font-semibold">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <span className="h-2 w-4 rounded-sm bg-neutral-900/80 dark:bg-neutral-100/80" />
              <span className="h-2.5 w-5 rounded-sm bg-neutral-900/80 dark:bg-neutral-100/80" />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="flex shrink-0 items-center gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
              <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-400 via-rose-500 to-violet-600 p-[1.5px]">
                <span className="flex size-full items-center justify-center overflow-hidden rounded-full bg-white dark:bg-neutral-950">
                  {lightLogo ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={lightLogo}
                        alt=""
                        className={cn("size-full object-contain p-0.5", darkLogo && "dark:hidden")}
                      />
                      {darkLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={darkLogo}
                          alt=""
                          className="hidden size-full object-contain p-0.5 dark:block"
                        />
                      ) : null}
                    </>
                  ) : (
                    <span className="text-[11px] font-semibold">{initial}</span>
                  )}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold leading-tight">{displayName}</p>
              </div>
              <MoreHorizontal className="size-4 shrink-0 text-neutral-800 dark:text-neutral-200" aria-hidden />
            </header>

            <div
              ref={mediaRef}
              onPointerDown={onMediaPointerDown}
              onPointerUp={onMediaPointerUp}
              className={cn(
                "relative w-full shrink-0 overflow-hidden bg-neutral-100 dark:bg-neutral-900",
                aspect === "portrait" ? "aspect-[4/5]" : "aspect-square",
              )}
            >
              {isCarousel ? (
                <>
                  <div
                    ref={trackRef}
                    onScroll={handleScroll}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    className={cn(
                      "flex size-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                      dragging ? "cursor-grabbing" : "cursor-grab",
                    )}
                    style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x pan-y" }}
                  >
                    {slides.map((src, index) => (
                      <div key={`${index}-${src}`} className="relative size-full shrink-0 snap-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt=""
                          draggable={false}
                          className="pointer-events-none absolute inset-0 size-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                  <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {current + 1}/{slides.length}
                  </span>
                  {current > 0 ? (
                    <button
                      type="button"
                      aria-label="previous"
                      onClick={() => goTo(current - 1)}
                      className="absolute left-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow"
                    >
                      <ChevronLeft className="size-4" aria-hidden />
                    </button>
                  ) : null}
                  {current < slides.length - 1 ? (
                    <button
                      type="button"
                      aria-label="next"
                      onClick={() => goTo(current + 1)}
                      className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow"
                    >
                      <ChevronRight className="size-4" aria-hidden />
                    </button>
                  ) : null}
                </>
              ) : imageUrl || slides[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl || slides[0]} alt="" className="absolute inset-0 size-full object-contain" />
              ) : (
                <div className="flex size-full items-center justify-center px-4 text-center text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
                  {emptyImageLabel}
                </div>
              )}
              {bursts.map((burst) => (
                <Heart
                  key={burst.id}
                  aria-hidden
                  className="pointer-events-none absolute z-20 fill-rose-500 text-rose-500 drop-shadow-md"
                  style={{
                    left: burst.x,
                    top: burst.y,
                    width: burst.size,
                    height: burst.size,
                    ["--heart-dx" as string]: `${burst.dx}px`,
                    animation: `heart-rise 900ms ease-out ${burst.delay}ms both`,
                  }}
                />
              ))}
            </div>

            <div className="relative flex shrink-0 items-center justify-between px-3 py-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-pressed={liked}
                  aria-label={liked ? t("phoneUnlike") : t("phoneLike")}
                  onClick={onHeartClick}
                  className="flex size-11 items-center justify-center"
                >
                  <Heart
                    className={cn(
                      "size-5",
                      liked && "fill-rose-500 text-rose-500",
                    )}
                  />
                </button>
                <MessageCircle className="size-5" aria-hidden />
                <Send className="size-5" aria-hidden />
              </div>
              {isCarousel ? (
                <div className="absolute inset-x-0 flex items-center justify-center gap-1" aria-hidden>
                  {slides.map((_, index) => (
                    <span
                      key={index}
                      className={cn(
                        "size-1.5 rounded-full transition-colors",
                        index === current
                          ? "bg-sky-500"
                          : "bg-neutral-300 dark:bg-neutral-700",
                      )}
                    />
                  ))}
                </div>
              ) : null}
              <Bookmark className="size-5" aria-hidden />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              <p className="text-[11px] font-semibold">{likesText}</p>
              <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed">
                <span className="font-semibold">{displayName}</span>{" "}
                <span
                  className={cn(
                    (!caption.trim() || captionPending) && "text-neutral-400 dark:text-neutral-500",
                    captionPending && "animate-pulse",
                  )}
                >
                  {captionText}
                </span>
              </p>
            </div>
          </div>
        </div>
      </Iphone>
    </div>
  );
}
