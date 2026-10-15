"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";

import { ThemeSwitch } from "@/components/theme-switch";
import { Iphone } from "@/components/ui/iphone";
import { api } from "@/lib/api";

import { MarketingCarousel } from "./marketing-carousel";
import "./marketing.css";

const DESKTOP_MQ = "(min-width: 900px)";

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_MQ);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useIsDesktopLayout() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_MQ).matches,
    () => false,
  );
}

export function MarketingSite() {
  const t = useTranslations("marketing");
  const { signedIn } = useOptionalSession();
  const accessHref = signedIn ? "/create" : "/login";
  const accessLabel = signedIn ? t("nav.openApp") : t("nav.accessPlatform");

  return (
    <div className="marketing">
      <a className="m-skip" href="#conteudo">
        {t("skip")}
      </a>
      <MarketingNav brandHref={signedIn ? "/create" : "/"} ctaHref={accessHref} ctaLabel={accessLabel} />
      <main id="conteudo">
        <Hero accessHref={accessHref} accessLabel={accessLabel} signedIn={signedIn} />
        <How />
        <Trust />
        <Plans ctaHref={accessHref} ctaLabel={accessLabel} />
        <Close ctaHref={accessHref} ctaLabel={accessLabel} />
      </main>
      <Footer />
    </div>
  );
}

function useOptionalSession() {
  const me = useQuery({
    queryKey: ["marketing-session"],
    queryFn: async () => {
      try {
        return await api<{ user: { id: string } }>("/v1/auth/me");
      } catch {
        return { user: null };
      }
    },
    retry: false,
    staleTime: 30_000,
  });

  return { signedIn: Boolean(me.data?.user) };
}

function MarketingNav({
  brandHref,
  ctaHref,
  ctaLabel,
}: {
  brandHref: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <header className="m-nav">
      <div className="m-wrap m-nav-inner">
        <Link className="m-brand" href={brandHref}>
          <img src="/symbol.svg" alt="" width={160} height={120} />
          <span className="m-brand-name">Publique</span>
        </Link>
        <div className="m-nav-end">
          <div className="m-prefs">
            <ThemeSwitch />
            <MarketingLocale />
          </div>
          <Link className="m-btn m-nav-cta" href={ctaHref}>
            {ctaLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}

function MarketingLocale() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("marketing.nav");

  function choose(next: "pt-BR" | "en") {
    document.cookie = `locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div className="m-locale" role="group" aria-label={t("language")}>
      <button type="button" aria-pressed={locale === "pt-BR"} onClick={() => choose("pt-BR")}>
        PT
      </button>
      <span aria-hidden>/</span>
      <button type="button" aria-pressed={locale === "en"} onClick={() => choose("en")}>
        EN
      </button>
    </div>
  );
}

function Hero({
  accessHref,
  accessLabel,
  signedIn,
}: {
  accessHref: string;
  accessLabel: string;
  signedIn: boolean;
}) {
  const t = useTranslations("marketing.hero");
  const networks = t.raw("networks") as string[];

  return (
    <section className="m-hero" aria-labelledby="m-hero-title">
      <div className="m-wrap m-hero-inner">
        <div className="m-hero-intro">
          <p className="m-hero-eyebrow">{t("eyebrow")}</p>
          <h1 id="m-hero-title" className="m-display m-hero-title">
            {t("line1")}
          </h1>
        </div>
        <HeroVisual />
        <div className="m-hero-copy">
          <p className="m-lead">{t("lead")}</p>
          <p className="m-hero-networks" aria-label={t("networksLabel")}>
            {networks.join(" · ")}
          </p>
          <div className="m-hero-actions">
            <Link className="m-btn m-btn-yellow" href={accessHref}>
              {accessLabel}
            </Link>
            {signedIn ? null : (
              <a className="m-btn m-btn-ghost" href="#planos">
                {t("secondary")}
              </a>
            )}
          </div>
          <p className="m-hero-trust">{t("trust")}</p>
        </div>
      </div>
    </section>
  );
}

/** Naming: /marketing/hero-product.png, hero-product-2.png … hero-product-12.png (png preferred). */
const HERO_SLIDE_INTERVAL_MS = 4500;
const HERO_SLIDE_MAX = 12;

function preloadImage(src: string) {
  return new Promise<string | null>((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function heroSlideSrc(index: number) {
  return index === 1 ? "/marketing/hero-product.png" : `/marketing/hero-product-${index}.png`;
}

/** Invisible fade carousel over images in /public/marketing; CSS mock if none load. */
function HeroVisual() {
  const t = useTranslations("marketing.hero");
  const [slides, setSlides] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found: string[] = [];
      // Probe PNGs in parallel; reveal as soon as the first lands.
      const results = await Promise.all(
        Array.from({ length: HERO_SLIDE_MAX }, (_, i) => preloadImage(heroSlideSrc(i + 1))),
      );
      if (cancelled) return;
      for (const src of results) {
        if (src) found.push(src);
      }
      setSlides(found);
      setDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, HERO_SLIDE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [slides]);

  if (!done && slides.length === 0) {
    return <figure className="m-hero-visual m-hero-visual-loading" aria-hidden />;
  }
  if (done && slides.length === 0) return <HeroProductMock />;

  return (
    <figure className="m-hero-visual" aria-label={t("imageAlt")}>
      {slides.map((src, index) => (
        <img
          key={src}
          src={src}
          alt=""
          width={1200}
          height={1500}
          loading={index === 0 ? "eager" : "lazy"}
          fetchPriority={index === 0 ? "high" : "low"}
          className={index === active ? "is-active" : undefined}
          aria-hidden={index === active ? undefined : true}
        />
      ))}
    </figure>
  );
}

function HeroProductMock() {
  const t = useTranslations("marketing.product");
  const th = useTranslations("marketing.hero");

  return (
    <aside className="m-hero-proof" aria-label={th("deviceCaption")}>
      <div className="m-hero-proof-phone">
        <Iphone>
          <div className="m-phone-screen">
            <div className="m-phone-top">
              <span className="m-phone-avatar" />
              {t("draftHandle")}
            </div>
            <div className="m-ad" aria-hidden>
              <img className="m-ad-symbol" src="/symbol.svg" alt="" />
              <p>{th("deviceWord")}</p>
            </div>
            <p className="m-phone-caption">{t("draftCaption")}</p>
          </div>
        </Iphone>
      </div>
      <div className="m-hero-proof-week" aria-hidden>
        <div className="m-window">
          <div className="m-window-bar">
            <span>{t("weekEyebrow")}</span>
            <span>{t("networksShort")}</span>
          </div>
          <div className="m-window-body">
            <p className="m-kicker" style={{ marginBottom: "0.75rem" }}>
              {t("weekTitle")}
            </p>
            <div className="m-week">
              <b />
              {t("days")
                .split(" ")
                .map((day, index) => (
                  <b key={`${day}-${index}`}>{day}</b>
                ))}
              {["09", "10", "11", "12"].map((hour, row) => (
                <WeekRow key={hour} hour={hour} filled={row} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function WeekRow({ hour, filled }: { hour: string; filled: number }) {
  return (
    <>
      <span>{hour}</span>
      {Array.from({ length: 7 }, (_, day) => {
        const isSlot = (filled === 0 && day === 1) || (filled === 1 && day === 3) || (filled === 3 && day === 4);
        const alt = filled === 1 && day === 3;
        return (
          <span key={`${hour}-${day}`} className={isSlot ? (alt ? "m-slot-alt" : "m-slot") : undefined}>
            {isSlot ? "•" : ""}
          </span>
        );
      })}
    </>
  );
}

function HowStep({ step }: { step: "1" | "2" | "3" }) {
  const t = useTranslations("marketing.how");
  return (
    <article className="m-how-item">
      <span className="m-how-num" aria-hidden>
        0{step}
      </span>
      <h3>{t(`steps.${step}.title`)}</h3>
      <p>{t(`steps.${step}.body`)}</p>
    </article>
  );
}

function How() {
  const t = useTranslations("marketing.how");
  const tc = useTranslations("marketing.carousel");
  const desktop = useIsDesktopLayout();
  const steps = ["1", "2", "3"] as const;

  return (
    <section className="m-section m-how" id="como" aria-labelledby="m-how-title">
      <div className="m-wrap">
        <h2 id="m-how-title" className="m-display m-how-title">
          {t("title")}
        </h2>
        <p className="m-lead m-how-lead">{t("lead")}</p>
        {desktop ? (
          <div className="m-how-grid">
            {steps.map((step) => (
              <HowStep key={step} step={step} />
            ))}
          </div>
        ) : (
          <div className="m-how-mobile">
            <MarketingCarousel label={tc("how")} prevLabel={tc("prev")} nextLabel={tc("next")} slideClassName="m-how-slide">
              {steps.map((step) => (
                <HowStep key={step} step={step} />
              ))}
            </MarketingCarousel>
          </div>
        )}
      </div>
    </section>
  );
}

function Trust() {
  const t = useTranslations("marketing.trust");

  return (
    <section className="m-section m-trust" id="confianca" aria-labelledby="m-trust-title">
      <div className="m-wrap m-trust-inner">
        <p className="m-kicker m-trust-kicker">{t("kicker")}</p>
        <h2 id="m-trust-title" className="m-display m-trust-title">
          {t("title")}
        </h2>
        <p className="m-lead m-trust-lead">{t("body")}</p>
      </div>
    </section>
  );
}

type BillingCycle = "monthly" | "annual";
type PlanKey = "starter" | "pro" | "premium";

const PLAN_PRICES: Record<PlanKey, { monthly: number }> = {
  starter: { monthly: 197 },
  pro: { monthly: 397 },
  premium: { monthly: 697 },
};

function PlanCard({
  planKey,
  billing,
  formatPrice,
  ctaHref,
  ctaLabel,
}: {
  planKey: PlanKey;
  billing: BillingCycle;
  formatPrice: (amount: number) => string;
  ctaHref: string;
  ctaLabel: string;
}) {
  const t = useTranslations("marketing.plans");
  const monthly = PLAN_PRICES[planKey].monthly;
  const annualTotal = monthly * 11;
  const features = t.raw(`tiers.${planKey}.features`) as string[];
  const recommended = planKey === "pro";

  return (
    <article className={`m-plan m-plan-${planKey}${recommended ? " m-plan-recommended" : ""}`}>
      <div>
        {recommended ? <p className="m-plan-badge">{t("recommended")}</p> : null}
        <h3 className="m-display m-plan-name">{t(`tiers.${planKey}.name`)}</h3>
        <p className="m-plan-summary">{t(`tiers.${planKey}.summary`)}</p>
        <p className="m-plan-price">
          <span className="m-plan-amount">{formatPrice(monthly)}</span>
          <span className="m-plan-period">{t("perMonth")}</span>
        </p>
        {billing === "annual" ? (
          <p className="m-plan-billed">{t("billedAnnually", { total: formatPrice(annualTotal) })}</p>
        ) : null}
        <ul className="m-plan-features">
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>
      <Link className={`m-btn ${recommended ? "m-btn-ink" : planKey === "premium" ? "m-btn-yellow" : "m-btn-ink"}`} href={ctaHref}>
        {ctaLabel}
      </Link>
    </article>
  );
}

function Plans({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  const t = useTranslations("marketing.plans");
  const tc = useTranslations("marketing.carousel");
  const locale = useLocale();
  const desktop = useIsDesktopLayout();
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const plans: PlanKey[] = ["starter", "pro", "premium"];
  const recommendedIndex = plans.indexOf("pro");

  function formatPrice(amount: number) {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  const cards = plans.map((key) => (
    <PlanCard
      key={key}
      planKey={key}
      billing={billing}
      formatPrice={formatPrice}
      ctaHref={ctaHref}
      ctaLabel={ctaLabel}
    />
  ));

  return (
    <section className="m-section m-plans-section" id="planos" aria-labelledby="m-plans-title">
      <div className="m-wrap">
        <h2 id="m-plans-title" className="m-display m-plans-title">
          {t("title")}
        </h2>
        <p className="m-lead m-plans-lead">{t("lead")}</p>

        <div className="m-billing" role="group" aria-label={t("billingLabel")}>
          <button type="button" aria-pressed={billing === "monthly"} onClick={() => setBilling("monthly")}>
            {t("monthly")}
          </button>
          <button type="button" aria-pressed={billing === "annual"} onClick={() => setBilling("annual")}>
            {t("annual")}
            <span className="m-billing-save">{t("save")}</span>
          </button>
        </div>

        {desktop ? (
          <div className="m-plans-grid">{cards}</div>
        ) : (
          <div className="m-plans-mobile">
            <MarketingCarousel
              label={tc("plans")}
              prevLabel={tc("prev")}
              nextLabel={tc("next")}
              initialIndex={recommendedIndex}
              className="m-plans-carousel"
              slideClassName="m-plan-slide"
            >
              {cards}
            </MarketingCarousel>
          </div>
        )}
        <p className="m-plans-note">{t("note")}</p>
      </div>
    </section>
  );
}

function Close({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  const t = useTranslations("marketing.close");

  return (
    <section className="m-section m-close" aria-labelledby="m-close-title">
      <div className="m-wrap">
        <h2 id="m-close-title" className="m-display m-close-title">
          {t("line1")}
          <br />
          {t("line2")}
        </h2>
        <Link className="m-btn m-btn-yellow" href={ctaHref}>
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  const t = useTranslations("marketing.footer");

  return (
    <footer className="m-footer m-footer-simple">
      <div className="m-wrap m-footer-simple-inner">
        <p className="m-footer-mark">Publique</p>
        <p className="m-footer-copy">{t("copyright")}</p>
      </div>
    </footer>
  );
}
