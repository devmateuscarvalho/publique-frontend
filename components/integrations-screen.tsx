"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ConfirmAlertDialog } from "@/components/confirm-alert-dialog";
import { useAccount } from "@/components/use-account";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import { startSocialOAuth } from "@/lib/social-connect";

const networks = ["linkedin", "instagram"] as const;
const errorKeys = [
  "invalid_input",
  "forbidden",
  "not_found",
  "encryption_unconfigured",
  "integration_unconfigured",
  "linkedin_failed",
  "linkedin_denied",
  "instagram_failed",
  "instagram_denied",
  "invalid_state",
  "internal_error",
] as const;

type NetworkID = (typeof networks)[number];
type Integration = {
  network: NetworkID;
  configured: boolean;
  hint: string;
  account_label: string;
  page_urn: string;
  oauth_available?: boolean;
};
type LinkedInPage = { urn: string; name: string; vanity: string };

export function IntegrationsScreen() {
  const t = useTranslations("integrations");
  return (
    <AppShell title={t("title")}>
      <IntegrationsBody />
    </AppShell>
  );
}

function IntegrationsBody() {
  const t = useTranslations("integrations");
  const errors = useTranslations("errors");
  const { organization, loading } = useAccount();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [showPicker, setShowPicker] = useState(false);

  const query = useQuery({
    queryKey: ["integrations", organization?.id],
    enabled: Boolean(organization),
    queryFn: () => api<{ integrations: Integration[] }>(`/v1/organizations/${organization?.id}/integrations`),
  });

  useEffect(() => {
    const linkedin = searchParams.get("linkedin");
    const instagram = searchParams.get("instagram");
    if (linkedin) {
      if (linkedin === "connected") {
        if (searchParams.get("need_page") === "1") {
          appToast.info(t("oauthNeedPage"));
          setShowPicker(true);
        } else {
          appToast.success(t("oauthConnected", { network: t("networks.linkedin") }));
        }
      } else if (linkedin === "pick") {
        appToast.info(t("oauthPick"));
        setShowPicker(true);
      } else if (linkedin === "error") {
        const code = searchParams.get("code") ?? "internal_error";
        appToast.error(errorText(errors, new ApiError(code)));
      }
    }
    if (instagram === "connected") {
      appToast.success(t("oauthConnected", { network: t("networks.instagram") }));
    } else if (instagram === "error") {
      const code = searchParams.get("code") ?? "internal_error";
      appToast.error(errorText(errors, new ApiError(code)));
    }
  }, [searchParams, t, errors]);

  if (loading || !organization) {
    return null;
  }
  if (organization.role !== "owner") {
    return <p className="text-sm text-ink/70">{errors("forbidden")}</p>;
  }

  const byID = new Map((query.data?.integrations ?? []).map((item) => [item.network, item]));

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/70">{t("lead")}</p>
      <p className="text-sm text-ink/70">{t("publishingHint")}</p>
      {networks.map((id) => {
        const item = byID.get(id);
        return (
          <NetworkCard
            key={`${id}-${item?.account_label ?? ""}-${item?.page_urn ?? ""}-${item?.configured ? "on" : "off"}`}
            id={id}
            item={item}
            organizationID={organization.id}
            forcePicker={id === "linkedin" && showPicker}
            onSaved={async () => {
              appToast.success(t("pageSaved"));
              setShowPicker(false);
              await queryClient.invalidateQueries({ queryKey: ["integrations", organization.id] });
            }}
            onError={(error) => appToast.error(errorText(errors, error))}
          />);
      })}
    </div>
  );
}

function NetworkCard({
  id,
  item,
  organizationID,
  forcePicker,
  onSaved,
  onError,
}: {
  id: NetworkID;
  item?: Integration;
  organizationID: string;
  forcePicker?: boolean;
  onSaved: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const t = useTranslations("integrations");
  const [token, setToken] = useState("");
  const [label, setLabel] = useState(item?.account_label ?? "");
  const [pageUrn, setPageUrn] = useState(item?.page_urn ?? "");
  const [manual, setManual] = useState(false);
  const [selectedPage, setSelectedPage] = useState("");

  const needsPage = id === "linkedin" && Boolean(item?.configured) && (!item?.page_urn || forcePicker);
  const pagesQuery = useQuery({
    queryKey: ["linkedin-pages", organizationID],
    enabled: needsPage,
    queryFn: () => api<{ pages: LinkedInPage[] }>(`/v1/organizations/${organizationID}/integrations/linkedin/pages`),
    retry: false,
  });

  const connect = useMutation({
    mutationFn: () => startSocialOAuth(organizationID, id, "/settings/integrations"),
    onError,
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
    onSuccess: async () => {
      await onSaved();
    },
    onError,
  });

  const save = useMutation({
    mutationFn: () =>
      api(`/v1/organizations/${organizationID}/integrations/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          access_token: token,
          account_label: label,
          page_urn: id === "linkedin" ? pageUrn : "",
        }),
      }),
    onSuccess: async () => {
      setToken("");
      await onSaved();
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: () => api(`/v1/organizations/${organizationID}/integrations/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setToken("");
      setLabel("");
      setPageUrn("");
      await onSaved();
    },
    onError,
  });

  const canSave = token.trim() !== "" && (id !== "linkedin" || pageUrn.trim() !== "");
  const oauthAvailable = Boolean(item?.oauth_available);
  const pages = pagesQuery.data?.pages ?? [];
  const pageToSave = selectedPage || pageUrn.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(`networks.${id}`)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {item?.configured ? <p className="text-sm">{item.hint}</p> : <p className="text-sm text-ink/70">{t("empty")}</p>}
        {item?.configured && (item.account_label || item.page_urn) ? (
          <p className="text-sm text-ink/70">
            {id === "instagram" ? t("accountSelected") : t("pageSelected")}: {item.account_label || item.page_urn}
          </p>
        ) : null}

        {oauthAvailable ? (
          <div className="flex flex-col gap-2">
            <Button type="button" disabled={connect.isPending} onClick={() => connect.mutate()}>
              {item?.configured
                ? t("reconnect", { network: t(`networks.${id}`) })
                : t("connect", { network: t(`networks.${id}`) })}
            </Button>
            {!manual ? (
              <Button type="button" variant="outline" onClick={() => setManual(true)}>
                {t("manualFallback")}
              </Button>
            ) : null}
          </div>
        ) : null}

        {needsPage ? (
          <div className="space-y-3 rounded-lg border border-input p-3">
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
              <Label htmlFor={`page-urn-${id}`}>{t("pageUrn")}</Label>
              <Input
                id={`page-urn-${id}`}
                value={pageUrn}
                onChange={(event) => {
                  setPageUrn(event.target.value);
                  setSelectedPage("");
                }}
                placeholder="urn:li:organization:123456"
              />
              <p className="text-xs text-ink/55">{t("pageUrnHint")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`label-page-${id}`}>{t("account")}</Label>
              <Input id={`label-page-${id}`} value={label} onChange={(event) => setLabel(event.target.value)} />
            </div>
            <Button
              type="button"
              disabled={!pageToSave || selectPage.isPending}
              onClick={() => selectPage.mutate(pageToSave)}
            >
              {t("savePage")}
            </Button>
          </div>
        ) : null}

        {(!oauthAvailable || manual) && (
          <>
            <div className="space-y-2">
              <Label htmlFor={`label-${id}`}>{t("account")}</Label>
              <Input id={`label-${id}`} value={label} onChange={(event) => setLabel(event.target.value)} />
            </div>
            {id === "linkedin" ? (
              <div className="space-y-2">
                <Label htmlFor={`page-urn-manual-${id}`}>{t("pageUrn")}</Label>
                <Input
                  id={`page-urn-manual-${id}`}
                  value={pageUrn}
                  onChange={(event) => setPageUrn(event.target.value)}
                  placeholder="urn:li:organization:123456"
                />
                <p className="text-xs text-ink/55">{t("pageUrnHint")}</p>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor={`token-${id}`}>{t("token")}</Label>
              <Input
                id={`token-${id}`}
                type="password"
                autoComplete="off"
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button type="button" disabled={save.isPending || !canSave} onClick={() => save.mutate()}>
                {t("save")}
              </Button>
            </div>
          </>
        )}

        {item?.configured ? (
          <ConfirmAlertDialog
            title={t("remove")}
            description={t("removeConfirm")}
            cancelLabel={t("cancel")}
            confirmLabel={t("remove")}
            onConfirm={() => remove.mutate()}
            trigger={
              <Button type="button" variant="outline" disabled={remove.isPending}>
                {t("remove")}
              </Button>
            }
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function errorText(errors: (key: (typeof errorKeys)[number]) => string, error: unknown) {
  const code = error instanceof ApiError ? error.code : "internal_error";
  return errors(errorKeys.includes(code as (typeof errorKeys)[number]) ? (code as (typeof errorKeys)[number]) : "internal_error");
}
