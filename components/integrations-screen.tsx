"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ConfirmAlertDialog } from "@/components/confirm-alert-dialog";
import { LinkedInPagePicker } from "@/components/linkedin-page-picker";
import { SocialNetworkIcon, socialConnectClass, socialMarkClass } from "@/components/social-network-icons";
import { useAccount } from "@/components/use-account";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import { startSocialOAuth } from "@/lib/social-connect";
import { cn } from "@/lib/utils";

const networks = ["linkedin", "instagram", "facebook"] as const;
const pageNetworks = ["linkedin", "facebook"] as const;
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
  "facebook_failed",
  "facebook_denied",
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

export function BrandIntegrations({ brandId }: { brandId: string }) {
  const t = useTranslations("integrations");
  const errors = useTranslations("errors");
  const { organization } = useAccount();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [showPicker, setShowPicker] = useState<NetworkID | null>(null);
  const canManage = organization?.role === "owner";
  const returnTo = `/brands/${brandId}`;

  const query = useQuery({
    queryKey: ["integrations", brandId],
    enabled: Boolean(brandId),
    queryFn: () => api<{ integrations: Integration[] }>(`/v1/brands/${brandId}/integrations`),
  });

  useEffect(() => {
    const linkedin = searchParams.get("linkedin");
    const instagram = searchParams.get("instagram");
    const facebook = searchParams.get("facebook");
    if (!linkedin && !instagram && !facebook) {
      return;
    }
    if (linkedin) {
      if (linkedin === "connected") {
        if (searchParams.get("need_page") === "1") {
          appToast.info(t("oauthNeedPage"));
          setShowPicker("linkedin");
        } else {
          appToast.success(t("oauthConnected", { network: t("networks.linkedin") }));
        }
      } else if (linkedin === "pick") {
        appToast.info(t("oauthPick"));
        setShowPicker("linkedin");
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
    if (facebook) {
      if (facebook === "connected") {
        if (searchParams.get("need_page") === "1") {
          appToast.info(t("oauthNeedFacebookPage"));
          setShowPicker("facebook");
        } else {
          appToast.success(t("oauthConnected", { network: t("networks.facebook") }));
        }
      } else if (facebook === "pick") {
        appToast.info(t("oauthNeedFacebookPage"));
        setShowPicker("facebook");
      } else if (facebook === "error") {
        const code = searchParams.get("code") ?? "internal_error";
        appToast.error(errorText(errors, new ApiError(code)));
      }
    }
    const next = new URLSearchParams(searchParams.toString());
    next.delete("linkedin");
    next.delete("instagram");
    next.delete("facebook");
    next.delete("need_page");
    next.delete("code");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [errors, pathname, router, searchParams, t]);

  const byID = new Map((query.data?.integrations ?? []).map((item) => [item.network, item]));

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/70">{t("lead")}</p>
      {networks.map((id) => {
        const item = byID.get(id);
        return (
          <NetworkRow
            key={`${id}-${item?.account_label ?? ""}-${item?.page_urn ?? ""}-${item?.configured ? "on" : "off"}`}
            id={id}
            item={item}
            brandId={brandId}
            canManage={canManage}
            returnTo={returnTo}
            forcePicker={id === showPicker}
            onChanged={async () => {
              setShowPicker(null);
              await queryClient.invalidateQueries({ queryKey: ["integrations", brandId] });
            }}
            onPageSaved={async () => {
              appToast.success(id === "facebook" ? t("facebookPageSaved") : t("pageSaved"));
              setShowPicker(null);
              await queryClient.invalidateQueries({ queryKey: ["integrations", brandId] });
            }}
            onError={(error) => appToast.error(errorText(errors, error))}
          />
        );
      })}
    </div>
  );
}

function NetworkRow({
  id,
  item,
  brandId,
  canManage,
  returnTo,
  forcePicker,
  onChanged,
  onPageSaved,
  onError,
}: {
  id: NetworkID;
  item?: Integration;
  brandId: string;
  canManage: boolean;
  returnTo: string;
  forcePicker?: boolean;
  onChanged: () => Promise<void>;
  onPageSaved: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const t = useTranslations("integrations");
  const connected = Boolean(item?.configured);
  const account = (item?.account_label || item?.page_urn || "").trim();
  const needsPage =
    pageNetworks.includes(id as (typeof pageNetworks)[number]) && connected && (!item?.page_urn || forcePicker);

  const connect = useMutation({
    mutationFn: () => startSocialOAuth(brandId, id, returnTo),
    onError,
  });
  const remove = useMutation({
    mutationFn: () => api(`/v1/brands/${brandId}/integrations/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await onChanged();
    },
    onError,
  });

  return (
    <div className="space-y-3 rounded-xl border border-input bg-card p-3">
      {connected ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <NetworkMark id={id} />
            <div className="min-w-0">
              <p className="text-sm font-medium">{t(`networks.${id}`)}</p>
              <p className="truncate text-sm text-ink/60">{account || t("connected")}</p>
            </div>
          </div>
          {canManage ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                disabled={connect.isPending}
                onClick={() => connect.mutate()}
              >
                {t("reconnect")}
              </Button>
              <ConfirmAlertDialog
                title={t("remove")}
                description={t("removeConfirm")}
                cancelLabel={t("cancel")}
                confirmLabel={t("remove")}
                onConfirm={() => remove.mutate()}
                trigger={
                  <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" disabled={remove.isPending}>
                    {t("remove")}
                  </Button>
                }
              />
            </div>
          ) : null}
        </div>
      ) : canManage ? (
        <button
          type="button"
          className={cn(
            "flex min-h-12 w-full items-center justify-center gap-3 rounded-xl px-4 text-sm font-medium text-white transition-opacity disabled:opacity-50",
            socialConnectClass(id),
          )}
          disabled={connect.isPending}
          onClick={() => connect.mutate()}
        >
          <SocialNetworkIcon id={id} className="size-5 shrink-0" />
          {connect.isPending ? t("connecting", { network: t(`networks.${id}`) }) : t("connect", { network: t(`networks.${id}`) })}
        </button>
      ) : (
        <div className="flex min-h-11 items-center gap-3">
          <NetworkMark id={id} />
          <div>
            <p className="text-sm font-medium">{t(`networks.${id}`)}</p>
            <p className="text-sm text-ink/60">{t("empty")}</p>
          </div>
        </div>
      )}

      {canManage && needsPage && (id === "linkedin" || id === "facebook") ? (
        <LinkedInPagePicker
          brandID={brandId}
          network={id}
          onSaved={() => void onPageSaved()}
          onError={onError}
          onReconnect={() => connect.mutate()}
        />
      ) : null}
    </div>
  );
}

function NetworkMark({ id }: { id: NetworkID }) {
  return (
    <span
      className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl text-white", socialMarkClass(id))}
      aria-hidden
    >
      <SocialNetworkIcon id={id} className="size-5" />
    </span>
  );
}

function errorText(errors: (key: (typeof errorKeys)[number]) => string, error: unknown) {
  const code = error instanceof ApiError ? error.code : "internal_error";
  return errors(errorKeys.includes(code as (typeof errorKeys)[number]) ? (code as (typeof errorKeys)[number]) : "internal_error");
}
