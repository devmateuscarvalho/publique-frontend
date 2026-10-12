"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

type LinkedInPage = { urn: string; name: string; vanity: string };

export function LinkedInPagePicker({
  organizationID,
  onSaved,
  onError,
}: {
  organizationID: string;
  onSaved: () => void;
  onError: (error: unknown) => void;
}) {
  const t = useTranslations("integrations");
  const [selectedPage, setSelectedPage] = useState("");
  const [pageUrn, setPageUrn] = useState("");
  const [label, setLabel] = useState("");

  const pagesQuery = useQuery({
    queryKey: ["linkedin-pages", organizationID],
    queryFn: () => api<{ pages: LinkedInPage[] }>(`/v1/organizations/${organizationID}/integrations/linkedin/pages`),
    retry: false,
  });

  const selectPage = useMutation({
    mutationFn: (urn: string) =>
      api(`/v1/organizations/${organizationID}/integrations/linkedin/page`, {
        method: "PUT",
        body: JSON.stringify({
          page_urn: urn,
          account_label: label,
        }),
      }),
    onSuccess: onSaved,
    onError,
  });

  const pages = pagesQuery.data?.pages ?? [];
  const pageToSave = selectedPage || pageUrn.trim();

  return (
    <div className="space-y-3 rounded-xl border border-input p-3">
      <p className="text-sm font-medium">{t("choosePage")}</p>
      {pagesQuery.isLoading ? <p className="text-sm text-ink/70">{t("loadingPages")}</p> : null}
      {pagesQuery.isError ? <p className="text-sm text-ink/70">{t("pagesFailed")}</p> : null}
      {pages.length > 0 ? (
        <div className="space-y-2">
          {pages.map((page) => (
            <label key={page.urn} className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="radio"
                name="linkedin-page"
                value={page.urn}
                checked={selectedPage === page.urn}
                onChange={() => {
                  setSelectedPage(page.urn);
                  setPageUrn(page.urn);
                  if (!label) {
                    setLabel(page.name);
                  }
                }}
              />
              <span>
                {page.name}
                {page.vanity ? ` (@${page.vanity})` : ""}
              </span>
            </label>
          ))}
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="linkedin-page-urn">{t("pageUrn")}</Label>
        <Input
          id="linkedin-page-urn"
          value={pageUrn}
          onChange={(event) => {
            setPageUrn(event.target.value);
            setSelectedPage("");
          }}
          placeholder="urn:li:organization:123456"
        />
      </div>
      <Button type="button" className="min-h-11 w-full" disabled={!pageToSave || selectPage.isPending} onClick={() => selectPage.mutate(pageToSave)}>
        {t("savePage")}
      </Button>
    </div>
  );
}
