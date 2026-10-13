"use client";

import { useTranslations } from "next-intl";

import { Iphone } from "@/components/ui/iphone";

export function MarketingStage() {
  const t = useTranslations("marketing.product");

  return (
    <div className="m-stage">
      <figure className="m-figure m-figure-create">
        <figcaption>
          <span>FIG. 01</span>
          <span>/create</span>
        </figcaption>
        <div className="m-window">
          <div className="m-window-bar">
            <span>{t("createEyebrow")}</span>
            <span>Publique</span>
          </div>
          <div className="m-window-body">
            <p className="m-kicker" style={{ marginBottom: "0.7rem" }}>
              {t("createTitle")}
            </p>
            <div className="m-marks" aria-hidden>
              <span className="m-mark" />
              <span className="m-mark" />
              <span className="m-mark">+</span>
            </div>
            <div className="m-kind">
              <span className="m-kind-mark">A</span>
              <p>
                <strong>{t("lookAvatar")}</strong>
                <span>{t("lookAvatarLead")}</span>
              </p>
            </div>
            <div className="m-kind">
              <span className="m-kind-mark">P</span>
              <p>
                <strong>{t("lookProduct")}</strong>
                <span>{t("lookProductLead")}</span>
              </p>
            </div>
            <div className="m-kind">
              <span className="m-kind-mark">T</span>
              <p>
                <strong>{t("lookTopic")}</strong>
                <span>{t("lookTopicLead")}</span>
              </p>
            </div>
          </div>
        </div>
      </figure>

      <figure className="m-figure m-figure-phone">
        <figcaption>
          <span>FIG. 02</span>
          <span>/posts</span>
        </figcaption>
        <div className="m-hero-device" style={{ width: "min(100%, 20rem)", justifySelf: "center" }}>
          <Iphone>
            <div className="m-phone-screen">
              <div className="m-phone-top">
                <span className="m-phone-avatar" />
                {t("draftHandle")}
              </div>
              <div className="m-ad" aria-hidden>
                <img className="m-ad-symbol" src="/symbol.svg" alt="" />
                <p>Publicar.</p>
              </div>
              <p className="m-phone-caption">{t("draftCaption")}</p>
            </div>
          </Iphone>
        </div>
      </figure>

      <figure className="m-figure m-figure-week">
        <figcaption>
          <span>FIG. 03</span>
          <span>/posts/automate</span>
        </figcaption>
        <div className="m-window">
          <div className="m-window-bar">
            <span>{t("weekEyebrow")}</span>
            <span>{t("networks")}</span>
          </div>
          <div className="m-window-body">
            <p className="m-kicker" style={{ marginBottom: "0.75rem" }}>
              {t("weekTitle")}
            </p>
            <div className="m-week" aria-hidden>
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
      </figure>
    </div>
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
