"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";

import { ThemeSwitch } from "@/components/theme-switch";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";

import "@/components/marketing/marketing.css";

const schema = z.object({
  email: z
    .string()
    .trim()
    .regex(/^[^\s@]+@(localhost|[^\s@]+\.[^\s@]+)$/i),
  password: z.string().min(8),
});

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const t = useTranslations("login");
  const nav = useTranslations("marketing.nav");
  const errors = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse({ email, password });
      if (!parsed.success) {
        throw new ApiError("invalid_input");
      }
      return api("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: parsed.data.email,
          password: parsed.data.password,
        }),
      });
    },
    onSuccess: () => router.push("/brands"),
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : "internal_error";
      setFormError(errors(code as "invalid_input"));
    },
  });

  function chooseLocale(next: "pt-BR" | "en") {
    document.cookie = `locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div className={cn("marketing m-login", className)} {...props}>
      <header className="m-login-top">
        <Link className="m-brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/symbol.svg" alt="" width={160} height={120} />
          <span className="m-brand-name">Publique</span>
        </Link>
        <div className="m-prefs">
          <ThemeSwitch />
          <div className="m-locale" role="group" aria-label={nav("language")}>
            <button type="button" aria-pressed={locale === "pt-BR"} onClick={() => chooseLocale("pt-BR")}>
              PT
            </button>
            <span aria-hidden>/</span>
            <button type="button" aria-pressed={locale === "en"} onClick={() => chooseLocale("en")}>
              EN
            </button>
          </div>
        </div>
      </header>

      <div className="m-login-panel">
        <form
          className="m-login-form"
          onSubmit={(event) => {
            event.preventDefault();
            setFormError("");
            mutation.mutate();
          }}
        >
          <div className="m-login-heading">
            <p className="m-kicker">{nav("login")}</p>
            <h1 className="m-display m-login-title">{t("title")}</h1>
            <p className="m-lead m-login-lead">{t("subtitle")}</p>
          </div>

          <label className="m-login-field" htmlFor="email">
            <span>{t("email")}</span>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="m-login-field" htmlFor="password">
            <span>{t("password")}</span>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </label>

          {formError ? <p className="m-login-error">{formError}</p> : null}

          <button type="submit" className="m-btn m-btn-yellow m-login-submit" disabled={mutation.isPending}>
            {t("submit")}
          </button>
        </form>

        <div className="m-login-visual" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/login-image.png" alt="" />
        </div>
      </div>
    </div>
  );
}
