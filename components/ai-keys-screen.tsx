"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ConfirmAlertDialog } from "@/components/confirm-alert-dialog";
import { useAccount } from "@/components/use-account";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";
import { appToast } from "@/lib/app-toast";

const providers = ["openai", "anthropic", "google"] as const;
const errorKeys = ["invalid_input", "forbidden", "not_found", "encryption_unconfigured", "internal_error"] as const;

type ProviderID = (typeof providers)[number];
type AIProvider = {
  provider: ProviderID;
  configured: boolean;
  hint: string;
  selected: boolean;
  ready: boolean;
};

export function AIKeysScreen() {
  const t = useTranslations("aiKeys");
  return (
    <AppShell title={t("title")}>
      <AIKeysBody />
    </AppShell>
  );
}

function AIKeysBody() {
  const t = useTranslations("aiKeys");
  const errors = useTranslations("errors");
  const { organization, loading } = useAccount();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["ai-credentials", organization?.id],
    enabled: Boolean(organization),
    queryFn: () => api<{ providers: AIProvider[] }>(`/v1/organizations/${organization?.id}/ai-credentials`),
  });

  if (loading || !organization) {
    return null;
  }
  if (organization.role !== "owner") {
    return <p className="text-sm text-ink/70">{errors("forbidden")}</p>;
  }

  const byID = new Map((query.data?.providers ?? []).map((item) => [item.provider, item]));

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/70">{t("lead")}</p>
      {providers.map((id) => (
        <ProviderCard
          key={id}
          id={id}
          item={byID.get(id)}
          organizationID={organization.id}
          onSaved={async () => {
            await queryClient.invalidateQueries({ queryKey: ["ai-credentials", organization.id] });
          }}
          onError={(error) => appToast.error(errorText(errors, error))}
        />
      ))}
    </div>);
}

function ProviderCard({
  id,
  item,
  organizationID,
  onSaved,
  onError,
}: {
  id: ProviderID;
  item?: AIProvider;
  organizationID: string;
  onSaved: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const t = useTranslations("aiKeys");
  const [secret, setSecret] = useState("");
  const save = useMutation({
    mutationFn: () =>
      api(`/v1/organizations/${organizationID}/ai-credentials/${id}`, {
        method: "PUT",
        body: JSON.stringify({ api_key: secret }),
      }),
    onSuccess: async () => {
      setSecret("");
      await onSaved();
    },
    onError,
  });
  const select = useMutation({
    mutationFn: () => api(`/v1/organizations/${organizationID}/ai-credentials/${id}/select`, { method: "POST" }),
    onSuccess: onSaved,
    onError,
  });
  const remove = useMutation({
    mutationFn: () => api(`/v1/organizations/${organizationID}/ai-credentials/${id}`, { method: "DELETE" }),
    onSuccess: onSaved,
    onError,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(`providers.${id}`)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-ink/70">{item?.ready ? t("ready") : t("stored")}</p>
        {item?.configured ? (
          <p className="text-sm">
            {item.hint}
            {item.selected ? ` · ${t("inUse")}` : ""}
          </p>
        ) : (
          <p className="text-sm text-ink/70">{t("empty")}</p>
        )}
        <div className="space-y-2">
          <Label htmlFor={`key-${id}`}>{t("key")}</Label>
          <Input
            id={`key-${id}`}
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" disabled={save.isPending || secret.trim() === ""} onClick={() => save.mutate()}>
            {t("save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!item?.configured || item.selected || select.isPending}
            onClick={() => select.mutate()}
          >
            {item?.selected ? t("inUse") : t("use")}
          </Button>
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
        </div>
      </CardContent>
    </Card>
  );
}

function errorText(errors: (key: (typeof errorKeys)[number]) => string, error: unknown) {
  const code = error instanceof ApiError ? error.code : "internal_error";
  return errors(errorKeys.includes(code as (typeof errorKeys)[number]) ? (code as (typeof errorKeys)[number]) : "internal_error");
}
