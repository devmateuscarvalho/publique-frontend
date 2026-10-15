"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { MarketingShell } from "./marketing-shell";

const SECTION_IDS = [
  "acceptance",
  "provider",
  "service",
  "accounts",
  "acceptableUse",
  "content",
  "social",
  "ip",
  "plans",
  "availability",
  "liability",
  "termination",
  "privacy",
  "law",
  "changes",
  "contact",
] as const;

export function TermsOfService() {
  const t = useTranslations("terms");
  const locale = useLocale();

  return (
    <MarketingShell mainClassName="m-legal">
      <article className="m-legal-doc">
        <header className="m-legal-head">
          <h1 className="m-display m-legal-title">{t("title")}</h1>
          <p className="m-legal-updated">{t("updated")}</p>
          <p className="m-lead m-legal-intro">{t("intro")}</p>
          <p className="m-legal-disclaimer">{t("disclaimer")}</p>
        </header>

        {SECTION_IDS.map((id) => {
          const paragraphs = t.raw(`sections.${id}.body`) as string[];
          return (
            <section key={id} className="m-legal-section" id={id}>
              <h2 className="m-legal-section-title">{t(`sections.${id}.title`)}</h2>
              {paragraphs.map((paragraph, index) => (
                <p key={`${id}-${index}`} className="m-legal-p">
                  {paragraph}
                </p>
              ))}
              {id === "provider" ? <ProviderFacts locale={locale} /> : null}
              {id === "privacy" ? (
                <p className="m-legal-p">
                  <Link href="/privacy">{t("privacyLink")}</Link>
                </p>
              ) : null}
              {id === "contact" ? <ContactFacts /> : null}
            </section>
          );
        })}
      </article>
    </MarketingShell>
  );
}

function ProviderFacts({ locale }: { locale: string }) {
  const t = useTranslations("terms.provider");
  const isEn = locale === "en";

  return (
    <dl className="m-legal-facts">
      <div>
        <dt>{t("legalName")}</dt>
        <dd>MATEUS CARVALHO VIEIRA LTDA - ME</dd>
      </div>
      <div>
        <dt>{t("taxId")}</dt>
        <dd>47.420.462/0001-21</dd>
      </div>
      <div>
        <dt>{t("address")}</dt>
        <dd>
          {isEn
            ? "Av. Leoberto Leal, 790, Suite 101A, Barreiros, São José/SC, Brazil, ZIP 88117-000"
            : "Av. Leoberto Leal, 790, Sala 101A, Barreiros, São José/SC, CEP 88117-000"}
        </dd>
      </div>
      <div>
        <dt>{t("product")}</dt>
        <dd>Publique</dd>
      </div>
    </dl>
  );
}

function ContactFacts() {
  const t = useTranslations("terms.contact");

  return (
    <ul className="m-legal-contact">
      <li>
        <span>{t("email")}</span>{" "}
        <a href="mailto:dev.mateuscarvalho@gmail.com">dev.mateuscarvalho@gmail.com</a>
      </li>
      <li>
        <span>{t("phone")}</span>{" "}
        <a href="tel:+554898009100">(48) 9800-9100</a>
      </li>
    </ul>
  );
}
