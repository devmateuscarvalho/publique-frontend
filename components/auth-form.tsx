"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { z } from "zod";

import { Preferences } from "@/components/preferences";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";

const schema = z.object({
  email: z
    .string()
    .trim()
    .regex(/^[^\s@]+@(localhost|[^\s@]+\.[^\s@]+)$/i),
  password: z.string().min(8),
});

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const t = useTranslations(mode);
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
      const path = mode === "login" ? "/v1/auth/login" : "/v1/auth/register";
      const accountLocale = locale === "en" ? "en-US" : "pt-BR";
      const body =
        mode === "register"
          ? { email: parsed.data.email, password: parsed.data.password, locale: accountLocale }
          : { email: parsed.data.email, password: parsed.data.password };
      return api(path, { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => router.push("/brands"),
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : "internal_error";
      setFormError(errors(code as "invalid_input"));
    },
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-pine text-sm font-semibold text-white">M</span>
          <p className="text-sm font-medium">Marketing Autopilot</p>
        </div>
        <Preferences />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <p className="text-sm text-ink/70">{t("subtitle")}</p>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setFormError("");
              mutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </div>
            {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {t("submit")}
            </Button>
          </form>
          <p className="pt-2 text-sm">
            <Link className="underline" href={mode === "login" ? "/register" : "/login"}>
              {mode === "login" ? t("register") : t("login")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
