"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { ThemeSwitch } from "@/components/theme-switch";
import { api } from "@/lib/api";

import "./marketing.css";

export function MarketingShell({
  children,
  mainClassName,
}: {
  children: ReactNode;
  mainClassName?: string;
}) {
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
      <main id="conteudo" className={mainClassName}>
        {children}
      </main>
      <MarketingFooter />
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

export function MarketingNav({
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
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

export function MarketingFooter() {
  const t = useTranslations("marketing.footer");

  return (
    <footer className="m-footer m-footer-simple">
      <div className="m-wrap m-footer-simple-inner">
        <p className="m-footer-mark">Publique</p>
        <nav className="m-footer-nav" aria-label={t("legalNav")}>
          <Link href="/privacy">{t("privacy")}</Link>
        </nav>
        <p className="m-footer-copy">{t("copyright")}</p>
      </div>
    </footer>
  );
}
