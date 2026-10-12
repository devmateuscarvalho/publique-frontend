"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { AppShell, PageCreateAction } from "@/components/app-shell";
import { CodeSelect, useCatalog, useCodeLabels } from "@/components/catalog-fields";
import { ConfirmAlertDialog } from "@/components/confirm-alert-dialog";
import { DataTable, formatListDate, useListQuery, type ListColumn } from "@/components/data-table";
import { useAccount } from "@/components/use-account";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError, api, type ListMeta, type Member } from "@/lib/api";
import { appToast } from "@/lib/app-toast";

const errorKeys = ["invalid_input", "forbidden", "already_member", "last_owner", "not_found", "internal_error"] as const;

export function UsersScreen() {
  const t = useTranslations("users");
  const { organization } = useAccount();

  return (
    <AppShell
      title={t("title")}
      action={organization?.role === "owner" ? <PageCreateAction href="/users/new" label={t("add")} /> : null}
    >
      <UsersBody />
    </AppShell>
  );
}

export function NewUserScreen() {
  const t = useTranslations("users");

  return (
    <AppShell title={t("createTitle")}>
      <NewUserBody />
    </AppShell>
  );
}

function UsersBody() {
  const t = useTranslations("users");
  const lists = useTranslations("lists");
  const errors = useTranslations("errors");
  const uiLocale = useLocale();
  const labels = useCodeLabels();
  const queryClient = useQueryClient();
  const { organization, loading } = useAccount();
  const catalog = useCatalog();
  const list = useListQuery({ defaultSort: "created_at", filterKeys: ["role", "locale"] });

  const members = useQuery({
    queryKey: ["members", organization?.id, list.queryString],
    queryFn: () => api<{ members: Member[] } & ListMeta>(`/v1/organizations/${organization?.id}/members?${list.queryString}`),
    enabled: organization?.role === "owner",
  });

  const changeRole = useMutation({
    mutationFn: (input: { id: string; role: string }) =>
      api(`/v1/organizations/${organization?.id}/members/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: input.role }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["members", organization?.id] });
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
    onError: (error) => appToast.error(errorText(errors, error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/v1/organizations/${organization?.id}/members/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["members", organization?.id] });
    },
    onError: (error) => appToast.error(errorText(errors, error)),
  });

  if (loading || !organization) {
    return null;
  }
  if (organization.role !== "owner") {
    return <p className="text-sm text-ink/70">{errors("forbidden")}</p>;
  }

  return (
    <section className="space-y-4">
      <DataTable
        rows={members.data?.members ?? []}
        columns={memberColumns(t, labels, uiLocale, changeRole, remove)}
        total={members.data?.total ?? 0}
        loading={members.isLoading}
        list={list}
        searchLabel={lists("searchEmail")}
        emptyLabel={t("empty")}
        noResultsLabel={t("noResults")}
        filters={[
          {
            key: "role",
            label: t("columns.role"),
            allLabel: lists("all"),
            options: [
              { value: "owner", label: t("owner") },
              { value: "member", label: t("member") },
            ],
          },
          {
            key: "locale",
            label: t("columns.locale"),
            allLabel: lists("all"),
            options: (catalog.data?.locales ?? []).map((code) => ({ value: code, label: labels("locale", code) })),
          },
        ]}
      />
    </section>
  );
}

function NewUserBody() {
  const t = useTranslations("users");
  const errors = useTranslations("errors");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { organization, loading } = useAccount();
  const catalog = useCatalog();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [locale, setLocale] = useState(organization?.default_locale ?? "pt-BR");
  const [role, setRole] = useState("member");

  useEffect(() => {
    if (!loading && (!organization || organization.role !== "owner")) {
      router.replace("/settings/users");
    }
  }, [loading, organization, router]);

  useEffect(() => {
    if (organization?.default_locale) {
      setLocale(organization.default_locale);
    }
  }, [organization?.default_locale]);

  const add = useMutation({
    mutationFn: () =>
      api(`/v1/organizations/${organization?.id}/members`, {
        method: "POST",
        body: JSON.stringify({ email, password, locale, role }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["members", organization?.id] });
      router.push("/settings/users");
    },
    onError: (error) => appToast.error(errorText(errors, error)),
  });

  if (loading || !organization || organization.role !== "owner") {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-lg space-y-4">
      <Button asChild variant="outline">
        <Link href="/settings/users">{t("back")}</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{t("createTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              add.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="member-email">{t("email")}</Label>
              <Input id="member-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-password">{t("password")}</Label>
              <Input
                id="member-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
              <p className="text-sm text-ink/70">{t("passwordHint")}</p>
            </div>
            {catalog.data ? (
              <CodeSelect
                id="member-locale"
                label={t("locale")}
                kind="locale"
                value={locale}
                options={catalog.data.locales}
                onChange={setLocale}
              />
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="member-role">{t("role")}</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="member-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">{t("member")}</SelectItem>
                  <SelectItem value="owner">{t("owner")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={add.isPending}>
              {t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

function memberColumns(
  t: (
    key:
      | "columns.email"
      | "columns.locale"
      | "columns.role"
      | "columns.createdAt"
      | "columns.actions"
      | "owner"
      | "member"
      | "remove"
      | "removeConfirm"
      | "cancel"
      | "role",
  ) => string,
  labels: (kind: "locale", code: string) => string,
  locale: string,
  changeRole: { mutate: (input: { id: string; role: string }) => void },
  remove: { mutate: (id: string) => void },
): ListColumn<Member>[] {
  return [
    { key: "email", header: t("columns.email"), sortable: true, cell: (member) => member.email },
    { key: "locale", header: t("columns.locale"), sortable: true, cell: (member) => labels("locale", member.locale) },
    {
      key: "role",
      header: t("columns.role"),
      sortable: true,
      cell: (member) => (member.role === "owner" ? t("owner") : t("member")),
    },
    {
      key: "created_at",
      header: t("columns.createdAt"),
      sortable: true,
      cell: (member) => formatListDate(locale, member.created_at),
    },
    {
      key: "actions",
      header: t("columns.actions"),
      cell: (member) => (
        <div className="flex min-w-44 flex-col gap-2" onClick={(event) => event.stopPropagation()}>
          <Label htmlFor={`role-${member.id}`} className="sr-only">
            {t("role")}
          </Label>
          <Select value={member.role} onValueChange={(role) => changeRole.mutate({ id: member.id, role })}>
            <SelectTrigger id={`role-${member.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">{t("owner")}</SelectItem>
              <SelectItem value="member">{t("member")}</SelectItem>
            </SelectContent>
          </Select>
          <ConfirmAlertDialog
            title={t("remove")}
            description={t("removeConfirm")}
            cancelLabel={t("cancel")}
            confirmLabel={t("remove")}
            onConfirm={() => remove.mutate(member.id)}
            trigger={
              <Button type="button" variant="outline">
                {t("remove")}
              </Button>
            }
          />
        </div>
      ),
    },
  ];
}

function errorText(errors: (key: (typeof errorKeys)[number]) => string, error: unknown) {
  const code = error instanceof ApiError ? error.code : "internal_error";
  if ((errorKeys as readonly string[]).includes(code)) {
    return errors(code as (typeof errorKeys)[number]);
  }
  return errors("internal_error");
}
