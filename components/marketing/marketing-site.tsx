"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";

import { api } from "@/lib/api";

import "./marketing.css";

export function MarketingSite() {
  const t = useTranslations("marketing");
  const { signedIn } = useOptionalSession();
  const loginHref = signedIn ? "/brands" : "/login";
  const loginLabel = signedIn ? t("nav.openApp") : t("nav.login");
  const plansHref = "#planos";
  const plansLabel = t("hero.primary");
  const ctaHref = signedIn ? "/brands" : plansHref;
  const ctaLabel = signedIn ? t("nav.openApp") : plansLabel;

  return (
    <div className="marketing">
      <a className="m-skip" href="#conteudo">
        {t("skip")}
      </a>
      <MarketingNav loginHref={loginHref} loginLabel={loginLabel} ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <main id="conteudo">
        <Hero ctaHref={ctaHref} ctaLabel={ctaLabel} />
        <How />
        <Plans ctaHref={loginHref} ctaLabel={signedIn ? t("nav.openApp") : t("plans.cta")} />
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
  loginHref,
  loginLabel,
  ctaHref,
  ctaLabel,
}: {
  loginHref: string;
  loginLabel: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  const t = useTranslations("marketing.nav");
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const links = [
    { href: "#como", label: t("how") },
    { href: "#planos", label: t("plans") },
  ];

  return (
    <header className="m-nav">
      <div className="m-wrap m-nav-inner">
        <Link className="m-brand" href="/">
          <img src="/symbol.svg" alt="" width={160} height={120} />
          <span className="m-brand-name">Publique</span>
        </Link>
        <nav className="m-nav-links" aria-label={t("sections")}>
          {links.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="m-nav-end">
          <MarketingLocale />
          <Link className="m-btn" href={ctaHref} style={{ minHeight: "2.6rem", padding: "0.4rem 0.8rem" }}>
            {ctaLabel}
          </Link>
          <button
            type="button"
            className="m-btn m-btn-ghost m-menu-btn"
            style={{ width: "2.6rem", minHeight: "2.6rem", padding: 0 }}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? t("close") : t("menu")}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? "×" : "☰"}
          </button>
        </div>
      </div>
      {open ? (
        <div className="m-nav-panel" id={panelId}>
          <div className="m-nav-panel-top">
            <Link className="m-brand" href="/" onClick={() => setOpen(false)}>
              <img src="/symbol.svg" alt="" width={160} height={120} />
              <span className="m-brand-name">Publique</span>
            </Link>
            <button type="button" className="m-btn m-btn-yellow" onClick={() => setOpen(false)} aria-label={t("close")}>
              ×
            </button>
          </div>
          <nav>
            {links.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="m-nav-panel-actions">
            <Link className="m-btn m-btn-yellow" href={ctaHref} onClick={() => setOpen(false)}>
              {ctaLabel}
            </Link>
            {loginHref !== ctaHref ? (
              <Link className="m-btn m-btn-ghost" href={loginHref} onClick={() => setOpen(false)}>
                {loginLabel}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
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

function Hero({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  const t = useTranslations("marketing.hero");

  return (
    <section className="m-hero" aria-labelledby="m-hero-brand">
      <div className="m-hero-copy">
        <p className="m-hero-eyebrow">{t("eyebrow")}</p>
        <h1 id="m-hero-brand" className="m-display m-hero-brand">
          Publique
        </h1>
        <p className="m-display m-hero-title">{t("line1")}</p>
        <p className="m-lead">{t("lead")}</p>
        <div className="m-hero-actions">
          <Link className="m-btn m-btn-yellow" href={ctaHref}>
            {ctaLabel}
          </Link>
        </div>
      </div>
      <div className="m-hero-visual" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-image.png" alt="" />
      </div>
    </section>
  );
}

function How() {
  const t = useTranslations("marketing.how");
  const steps = ["1", "2", "3"] as const;

  return (
    <section className="m-section m-how" id="como" aria-labelledby="m-how-title">
      <div className="m-wrap">
        <h2 id="m-how-title" className="m-display m-how-title">
          {t("title")}
        </h2>
        <ol className="m-how-list">
          {steps.map((step) => (
            <li key={step} className="m-how-item">
              <span className="m-how-num" aria-hidden>
                0{step}
              </span>
              <h3>{t(`steps.${step}.title`)}</h3>
              <p>{t(`steps.${step}.body`)}</p>
            </li>
          ))}
        </ol>
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

function Plans({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  const t = useTranslations("marketing.plans");
  const locale = useLocale();
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const plans: PlanKey[] = ["starter", "pro", "premium"];

  function formatPrice(amount: number) {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(amount);
  }

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

        <div className="m-plans">
          {plans.map((key) => {
            const monthly = PLAN_PRICES[key].monthly;
            const annualTotal = monthly * 11;
            const features = t.raw(`tiers.${key}.features`) as string[];
            const recommended = key === "pro";

            return (
              <article key={key} className={`m-plan m-plan-${key}${recommended ? " m-plan-recommended" : ""}`}>
                <div>
                  {recommended ? <p className="m-plan-badge">{t("recommended")}</p> : null}
                  <h3 className="m-display m-plan-name">{t(`tiers.${key}.name`)}</h3>
                  <p className="m-plan-summary">{t(`tiers.${key}.summary`)}</p>
                  <p className="m-plan-price">
                    <span className="m-plan-amount">{formatPrice(monthly)}</span>
                    <span className="m-plan-period">{t("perMonth")}</span>
                  </p>
                  {billing === "annual" ? (
                    <p className="m-plan-billed">
                      {t("billedAnnually", { total: formatPrice(annualTotal) })}
                    </p>
                  ) : null}
                  <ul className="m-plan-features">
                    {features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
                <Link className={`m-btn ${recommended ? "m-btn-ink" : key === "premium" ? "m-btn-yellow" : "m-btn-ink"}`} href={ctaHref}>
                  {ctaLabel}
                </Link>
              </article>
            );
          })}
        </div>
        <p className="m-plans-note">{t("note")}</p>
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
