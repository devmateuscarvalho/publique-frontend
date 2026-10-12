"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type LinkedInPage = { urn: string; name: string; vanity: string };

export function LinkedInPagePicker({
  brandID,
  network = "linkedin",
  onSaved,
  onError,
  onReconnect,
}: {
  brandID: string;
  network?: "linkedin" | "facebook";
  onSaved: () => void;
  onError: (error: unknown) => void;
  onReconnect?: () => void;
}) {
  const t = useTranslations("integrations");

  const pagesQuery = useQuery({
    queryKey: [`${network}-pages`, brandID],
    queryFn: () => api<{ pages: LinkedInPage[] }>(`/v1/brands/${brandID}/integrations/${network}/pages`),
    retry: false,
  });

  const selectPage = useMutation({
    mutationFn: (page: LinkedInPage) =>
      api(`/v1/brands/${brandID}/integrations/${network}/page`, {
        method: "PUT",
        body: JSON.stringify({
          page_urn: page.urn,
          account_label: page.name,
        }),
      }),
    onSuccess: onSaved,
    onError,
  });

  const pages = pagesQuery.data?.pages ?? [];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("choosePage")}</p>
      {pagesQuery.isLoading ? <p className="text-sm text-ink/70">{t("loadingPages")}</p> : null}
      {pagesQuery.isError ? <p className="text-sm text-ink/70">{t("pagesFailed")}</p> : null}
      {!pagesQuery.isLoading && !pagesQuery.isError && pages.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-ink/70">{t("pagesEmpty")}</p>
          {onReconnect ? (
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-center rounded-xl border border-input px-3 text-sm font-medium hover:bg-accent"
              onClick={onReconnect}
            >
              {t("reconnect")}
            </button>
          ) : null}
        </div>
      ) : null}
      {pages.map((page) => (
        <button
          key={page.urn}
          type="button"
          disabled={selectPage.isPending}
          className={cn(
            "flex min-h-11 w-full items-center rounded-xl border border-input px-3 text-left text-sm",
            "hover:bg-accent disabled:opacity-50",
          )}
          onClick={() => selectPage.mutate(page)}
        >
          {page.name}
          {page.vanity ? ` (@${page.vanity})` : ""}
        </button>
      ))}
    </div>
  );
}
