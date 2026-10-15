"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ConfirmAlertDialog } from "@/components/confirm-alert-dialog";
import { useCreationBrand } from "@/components/creation-brand";
import { BrandFilter, CreationFrame, useBrandQuery } from "@/components/creation-screen";
import { FilterPills, type ListFilter } from "@/components/data-table";
import { InstagramPhonePreview } from "@/components/instagram-phone-preview";
import { LinkedInPagePicker } from "@/components/linkedin-page-picker";
import { FacebookIcon, InstagramIcon, LinkedInIcon, socialConnectClass } from "@/components/social-network-icons";
import { useAccount } from "@/components/use-account";
import { PostCreatingWait } from "@/components/post-creating-wait";
import { PostGeneratingCaptionLine, PostGeneratingStudio } from "@/components/post-generating-studio";
import { Button } from "@/components/ui/button";
import { ApiError, api, type CreativeRecipe, type Post, type VisualResponse } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import { startSocialOAuth } from "@/lib/social-connect";
import { usePresetCopy } from "@/lib/preset-i18n";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 6;

export function CreationManualScreen() {
  const t = useTranslations("creation");
  return (
    <AppShell title={t("manualTitle")}>
      <CreationFrame>
        <ManualPostWorkspace />
      </CreationFrame>
    </AppShell>
  );
}

export function CreationManualDraftScreen({ postId }: { postId: string }) {
  const t = useTranslations("wizard");
  return (
    <AppShell title={t("resultTitle")}>
      <CreationFrame>
        <ManualDraftPage postId={postId} />
      </CreationFrame>
    </AppShell>
  );
}

function draftHref(brandId: string, postId: string) {
  return `/posts/${postId}?brand=${brandId}`;
}

function useOriginQuery() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const origin = params.get("origin") ?? "";
  const setOrigin = useCallback(
    (value: string) => {
      const search = new URLSearchParams(params.toString());
      if (value === "manual" || value === "automation") {
        search.set("origin", value);
      } else {
        search.delete("origin");
      }
      const query = search.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );
  return { origin, setOrigin };
}

function usePresetQuery() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const preset = params.get("preset") ?? "";
  const setPreset = useCallback(
    (value: string) => {
      const search = new URLSearchParams(params.toString());
      if (value) {
        search.set("preset", value);
      } else {
        search.delete("preset");
      }
      const query = search.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );
  return { preset, setPreset };
}

function ManualPostWorkspace() {
  const t = useTranslations("creation");
  const lists = useTranslations("lists");
  const presetCopy = usePresetCopy();
  const { brands } = useCreationBrand();
  const { organization } = useAccount();
  const { brandId } = useBrandQuery();
  const { origin, setOrigin } = useOriginQuery();
  const { preset, setPreset } = usePresetQuery();
  const originFilter = origin === "manual" || origin === "automation" ? origin : "";
  const presetFilter = preset.trim();
  const brandNameOf = (id?: string) => brands.find((brand) => brand.id === id)?.name ?? "";
  const visualQueries = useQueries({
    queries: brands.map((brand) => ({
      queryKey: ["visual", brand.id] as const,
      queryFn: () => api<VisualResponse>(`/v1/brands/${brand.id}/visual`),
      enabled: Boolean(brand.id),
      staleTime: 5 * 60_000,
    })),
  });
  const logoOf = (id?: string) => {
    const index = brands.findIndex((brand) => brand.id === id);
    if (index < 0) {
      return undefined;
    }
    const identity = visualQueries[index]?.data?.identity;
    return identity?.logo_url || identity?.logo_inverted_url || identity?.icon_url || undefined;
  };
  const [page, setPage] = useState(0);

  const recipesQuery = useQuery({
    queryKey: ["creative-recipes", organization?.id],
    queryFn: () =>
      api<{ creative_recipes: CreativeRecipe[] }>(`/v1/organizations/${organization?.id}/creative-recipes`),
    enabled: Boolean(organization?.id),
  });
  const recipes = recipesQuery.data?.creative_recipes ?? [];

  const listQuery = useQuery({
    queryKey: ["posts", organization?.id, brandId || "all", originFilter || "all", presetFilter || "all"],
    queryFn: () => {
      const params = new URLSearchParams();
      if (brandId) {
        params.set("brand", brandId);
      }
      if (originFilter) {
        params.set("origin", originFilter);
      }
      if (presetFilter) {
        params.set("preset", presetFilter);
      }
      const query = params.toString();
      return api<{ posts: Post[] }>(`/v1/organizations/${organization?.id}/posts${query ? `?${query}` : ""}`);
    },
    enabled: Boolean(organization?.id),
  });

  const posts = (listQuery.data?.posts ?? []).filter((post) => {
    const postOrigin = post.origin === "automation" ? "automation" : "manual";
    if (originFilter && postOrigin !== originFilter) {
      return false;
    }
    if (presetFilter && post.prompt_preset_id !== presetFilter) {
      return false;
    }
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pagePosts = useMemo(
    () => posts.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [posts, safePage],
  );

  useEffect(() => {
    setPage(0);
  }, [brandId]);

  useEffect(() => {
    setPage(0);
  }, [originFilter]);

  useEffect(() => {
    setPage(0);
  }, [presetFilter]);

  useEffect(() => {
    if (page > pageCount - 1) {
      setPage(Math.max(0, pageCount - 1));
    }
  }, [page, pageCount]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/70">{t("manualLead")}</p>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h2 className="text-sm font-medium">{t("manualRecent")}</h2>
            <BrandFilter />
            <FilterPills
              controlsId="manual-filters"
              filters={[
                {
                  key: "origin",
                  label: t("originFilter"),
                  allLabel: lists("all"),
                  options: [
                    { value: "manual", label: t("originManual") },
                    { value: "automation", label: t("originAutomation") },
                  ],
                } satisfies ListFilter,
                {
                  key: "preset",
                  label: t("presetFilter"),
                  allLabel: lists("all"),
                  options: recipes.map((recipe) => ({
                    value: recipe.id,
                    label: presetCopy.name(recipe),
                  })),
                } satisfies ListFilter,
              ]}
              values={{ origin: originFilter, preset: presetFilter }}
              onChange={(key, value) => {
                if (key === "origin") {
                  setOrigin(value);
                  return;
                }
                setPreset(value);
              }}
            />
          </div>
          {posts.length > 0 ? (
            <p className="text-xs text-ink/55">
              {t("manualPageOf", { page: safePage + 1, pages: pageCount })}
            </p>
          ) : null}
        </div>
        {posts.length === 0 && !listQuery.isLoading ? (
          <p className="text-sm text-ink/70">
            {brandId || originFilter || presetFilter ? t("manualNoResults") : t("manualEmpty")}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pagePosts.map((item) => (
            <DraftFeedCard
              key={item.id}
              post={item}
              brandName={brandNameOf(item.brand_id)}
              logoUrl={logoOf(item.brand_id)}
              href={draftHref(item.brand_id || "", item.id)}
            />
          ))}
        </div>
        {posts.length > PAGE_SIZE ? (
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage <= 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              {t("manualPrevPage")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            >
              {t("manualNextPage")}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function brandInitial(name: string) {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

function DraftFeedCard({
  post,
  brandName,
  logoUrl,
  href,
}: {
  post: Post;
  brandName: string;
  logoUrl?: string;
  href: string;
}) {
  const t = useTranslations("creation");
  const presetCopy = usePresetCopy();
  const image = post.assets?.[0];
  const pending = post.status === "queued" || post.status === "generating";
  const failed = post.status === "failed";
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);
  const showLogo = Boolean(logoUrl) && !logoFailed;

  return (
    <Link
      href={href}
      className="group block w-full rounded-2xl border border-input bg-card text-left shadow-sm transition hover:border-foreground/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-input/70 px-3 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-ink/80">
            {showLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="size-full object-contain p-1"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              brandInitial(brandName)
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{brandName || t("manualUntitled")}</p>
            <p className="truncate text-[11px] text-ink/45">
              {[
                post.preset
                  ? presetCopy.name({
                      name: post.preset.name,
                      style_key: post.preset.style_key,
                    })
                  : "",
                t(post.origin === "automation" ? "originAutomation" : "originManual"),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 text-[10px] font-medium",
              failed
                ? "border-destructive/40 text-destructive"
                : pending
                  ? "border-input text-ink/60"
                  : post.status === "published"
                    ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                    : "border-input text-ink/70",
            )}
          >
            {t(`postStatuses.${post.status}`)}
          </span>
        </div>

        <div
          className={cn(
            "relative bg-muted/40",
            isStoryPost(post) ? "mx-auto aspect-[9/16] max-h-72 w-full max-w-[11rem]" : "aspect-square",
          )}
        >
          {image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt={post.alt_text || ""}
              className="size-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          ) : pending ? (
            <PostGeneratingStudio brandName={brandName} compact />
          ) : (
            <div className="flex size-full items-center justify-center px-4 text-center text-xs text-ink/50">
              {failed ? t("manualFailed") : t("manualNoImage")}
            </div>
          )}
        </div>

        <div className="space-y-1.5 px-3 py-3">
          <p className="line-clamp-3 text-sm leading-relaxed text-ink/85">
            {post.caption ||
              (pending ? <PostGeneratingCaptionLine brandName={brandName} /> : t("manualUntitled"))}
          </p>
          <p className="text-[11px] text-ink/45">{t("manualOpenDraft")}</p>
        </div>
      </div>
    </Link>
  );
}

type IntegrationStatus = {
  network: string;
  configured: boolean;
  page_urn?: string;
  account_label?: string;
  oauth_available?: boolean;
};

function formatWhen(value: string | undefined, format: ReturnType<typeof useFormatter>) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return format.dateTime(date, { dateStyle: "medium", timeStyle: "short" });
}

function ManualDraftPage({ postId }: { postId: string }) {
  const t = useTranslations("creation");
  const phone = useTranslations("wizard");
  const errors = useTranslations("errors");
  const integrations = useTranslations("integrations");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const { organization } = useAccount();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const brandId = searchParams.get("brand") ?? "";
  const { brands } = useCreationBrand();
  const brandName = brands.find((brand) => brand.id === brandId)?.name ?? "";
  const oauthHandled = useRef(false);
  const instagramOAuthHandled = useRef(false);
  const facebookOAuthHandled = useRef(false);
  const [showPicker, setShowPicker] = useState<"linkedin" | "facebook" | null>(null);

  const postQuery = useQuery({
    queryKey: ["post", brandId, postId],
    queryFn: () => api<{ post: Post }>(`/v1/brands/${brandId}/posts/${postId}`),
    enabled: Boolean(brandId),
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.post.status;
      if (status === "queued" || status === "generating" || status === "publishing") {
        return 2000;
      }
      return false;
    },
  });
  const visualQuery = useQuery({
    queryKey: ["visual", brandId],
    queryFn: () => api<VisualResponse>(`/v1/brands/${brandId}/visual`),
    enabled: Boolean(brandId),
  });
  const integrationsQuery = useQuery({
    queryKey: ["integrations", brandId],
    enabled: Boolean(brandId),
    queryFn: () => api<{ integrations: IntegrationStatus[] }>(`/v1/brands/${brandId}/integrations`),
  });

  const post = postQuery.data?.post;
  const status = post?.status ?? "";
  const pending = status === "queued" || status === "generating";
  const imageUrls = (post?.assets ?? []).map((asset) => asset.url).filter(Boolean);
  const carousel = imageUrls.length > 1;
  const phoneAspect = previewPhoneAspect(post);
  const isStory = isStoryPost(post);
  const byNetwork = new Map((integrationsQuery.data?.integrations ?? []).map((item) => [item.network, item]));
  const linkedin = byNetwork.get("linkedin");
  const instagram = byNetwork.get("instagram");
  const facebook = byNetwork.get("facebook");
  const linkedinReady = Boolean(linkedin?.configured && linkedin.page_urn?.trim());
  const instagramReady = Boolean(instagram?.configured && instagram.page_urn?.trim());
  const facebookReady = Boolean(facebook?.configured && facebook.page_urn?.trim());
  const linkedinPublication = (post?.publications ?? []).find((item) => item.network === "linkedin");
  const instagramPublication = (post?.publications ?? []).find((item) => item.network === "instagram");
  const facebookPublication = (post?.publications ?? []).find((item) => item.network === "facebook");
  const linkedinPublished = linkedinPublication?.status === "published";
  const instagramPublished = instagramPublication?.status === "published";
  const facebookPublished = facebookPublication?.status === "published";
  const linkedinFailed = !linkedinPublished && linkedinPublication?.status === "failed";
  const instagramFailed = !instagramPublished && instagramPublication?.status === "failed";
  const facebookFailed = !facebookPublished && facebookPublication?.status === "failed";
  const linkedinPostedAt = formatWhen(linkedinPublication?.updated_at, format);
  const instagramPostedAt = formatWhen(instagramPublication?.updated_at, format);
  const facebookPostedAt = formatWhen(facebookPublication?.updated_at, format);
  const linkedinCanSend = linkedinReady && !linkedinPublished;
  const instagramCanSend = instagramReady && !instagramPublished;
  const facebookCanSend = facebookReady && !facebookPublished;
  const needsConnect = !linkedinPublished && !linkedin?.configured;
  const needsInstagramConnect = !instagramPublished && !instagram?.configured;
  const needsFacebookConnect = !facebookPublished && !facebook?.configured;
  const needsPage = !linkedinPublished && Boolean(linkedin?.configured) && !linkedin?.page_urn?.trim();
  const needsFacebookPage = !facebookPublished && Boolean(facebook?.configured) && !facebook?.page_urn?.trim();
  const returnTo = brandId ? `/posts/${postId}?brand=${brandId}` : `/posts/${postId}`;

  useEffect(() => {
    const statusParam = searchParams.get("linkedin");
    if (!statusParam || oauthHandled.current) {
      return;
    }
    oauthHandled.current = true;
    if (statusParam === "connected") {
      if (searchParams.get("need_page") === "1") {
        appToast.info(integrations("oauthNeedPage"));
        setShowPicker("linkedin");
      } else {
        appToast.success(integrations("oauthConnected", { network: integrations("networks.linkedin") }));
      }
    } else if (statusParam === "pick") {
      appToast.info(integrations("oauthPick"));
      setShowPicker("linkedin");
    } else if (statusParam === "error") {
      const code = searchParams.get("code") ?? "internal_error";
      appToast.error(errors(mapDraftError(new ApiError(code))));
    }
    void queryClient.invalidateQueries({ queryKey: ["integrations", brandId] });
    const next = new URLSearchParams(searchParams.toString());
    next.delete("linkedin");
    next.delete("need_page");
    next.delete("code");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [errors, integrations, organization?.id, pathname, queryClient, router, searchParams]);

  useEffect(() => {
    const statusParam = searchParams.get("instagram");
    if (!statusParam || instagramOAuthHandled.current) {
      return;
    }
    instagramOAuthHandled.current = true;
    if (statusParam === "connected") {
      appToast.success(integrations("oauthConnected", { network: integrations("networks.instagram") }));
    } else if (statusParam === "error") {
      const code = searchParams.get("code") ?? "internal_error";
      appToast.error(errors(mapDraftError(new ApiError(code))));
    }
    void queryClient.invalidateQueries({ queryKey: ["integrations", brandId] });
    const next = new URLSearchParams(searchParams.toString());
    next.delete("instagram");
    next.delete("code");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [errors, integrations, organization?.id, pathname, queryClient, router, searchParams]);

  useEffect(() => {
    const statusParam = searchParams.get("facebook");
    if (!statusParam || facebookOAuthHandled.current) {
      return;
    }
    facebookOAuthHandled.current = true;
    if (statusParam === "connected") {
      if (searchParams.get("need_page") === "1") {
        appToast.info(integrations("oauthNeedFacebookPage"));
        setShowPicker("facebook");
      } else {
        appToast.success(integrations("oauthConnected", { network: integrations("networks.facebook") }));
      }
    } else if (statusParam === "pick") {
      appToast.info(integrations("oauthNeedFacebookPage"));
      setShowPicker("facebook");
    } else if (statusParam === "error") {
      const code = searchParams.get("code") ?? "internal_error";
      appToast.error(errors(mapDraftError(new ApiError(code))));
    }
    void queryClient.invalidateQueries({ queryKey: ["integrations", brandId] });
    const next = new URLSearchParams(searchParams.toString());
    next.delete("facebook");
    next.delete("need_page");
    next.delete("code");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [brandId, errors, integrations, pathname, queryClient, router, searchParams]);

  const connect = useMutation({
    mutationFn: () => {
      if (!brandId) {
        throw new ApiError("invalid_input");
      }
      return startSocialOAuth(brandId, "linkedin", returnTo);
    },
    onError: (error) => appToast.error(errors(mapDraftError(error))),
  });
  const connectInstagram = useMutation({
    mutationFn: () => {
      if (!brandId) {
        throw new ApiError("invalid_input");
      }
      return startSocialOAuth(brandId, "instagram", returnTo);
    },
    onError: (error) => appToast.error(errors(mapDraftError(error))),
  });
  const connectFacebook = useMutation({
    mutationFn: () => {
      if (!brandId) {
        throw new ApiError("invalid_input");
      }
      return startSocialOAuth(brandId, "facebook", returnTo);
    },
    onError: (error) => appToast.error(errors(mapDraftError(error))),
  });

  const regenerate = useMutation({
    mutationFn: () =>
      api<{ post: Post }>(`/v1/brands/${brandId}/posts/${postId}/regenerate`, {
        method: "POST",
        body: "{}",
      }),
    onSuccess: () => postQuery.refetch(),
    onError: (error) => appToast.error(errors(mapDraftError(error))),
  });
  const publish = useMutation({
    mutationFn: () => {
      const networks = [
        ...(linkedinCanSend ? (["linkedin"] as const) : []),
        ...(instagramCanSend ? (["instagram"] as const) : []),
        ...(facebookCanSend ? (["facebook"] as const) : []),
      ];
      return api<{ post: Post }>(`/v1/brands/${brandId}/posts/${postId}/publish`, {
        method: "POST",
        body: JSON.stringify({ networks }),
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["post", brandId, postId] });
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => appToast.error(errors(mapDraftError(error))),
  });
  const canPublish =
    (status === "draft" || status === "published") &&
    !publish.isPending &&
    (linkedinCanSend || instagramCanSend || facebookCanSend);
  const alreadyPosted =
    status === "published" ||
    status === "publishing" ||
    (post?.publications ?? []).some((item) => item.status === "published" || item.status === "publishing");
  const canDelete = Boolean(post) && !alreadyPosted && !publish.isPending;
  const creatingPostId = useRef<string | null>(null);
  const [revealPanel, setRevealPanel] = useState(true);
  const fromCreating = creatingPostId.current === postId;
  const presenting = pending || (fromCreating && !revealPanel);

  useEffect(() => {
    setRevealPanel(true);
  }, [postId]);

  useEffect(() => {
    if (postQuery.isLoading || !post) {
      return;
    }
    if (pending) {
      creatingPostId.current = postId;
      setRevealPanel(false);
      return;
    }
    if (creatingPostId.current !== postId) {
      setRevealPanel(true);
      return;
    }
    const reduceMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hold = reduceMotion ? 0 : 80;
    const timer = window.setTimeout(() => setRevealPanel(true), hold);
    return () => window.clearTimeout(timer);
  }, [pending, postId, post, postQuery.isLoading]);

  const remove = useMutation({
    mutationFn: () => api(`/v1/brands/${brandId}/posts/${postId}`, { method: "DELETE" }),
    onSuccess: async () => {
      appToast.success(t("manualDeleted"));
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      router.push("/posts");
    },
    onError: (error) => appToast.error(errors(mapDraftError(error))),
  });

  if (postQuery.isLoading) {
    return null;
  }

  if (!brandId || postQuery.isError || !post) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/posts">{t("manualBack")}</Link>
        </Button>
        <p className="text-sm text-ink/70">{t("manualNotFound")}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex w-full flex-col md:block",
        presenting ? "min-h-[min(40rem,calc(100svh-9rem))]" : "min-h-[min(36rem,calc(100svh-9rem))] md:pr-[min(24rem,calc((100svh-9rem)*433/882+2.5rem))]",
      )}
    >
      <aside
        className={cn(
          "order-2 w-full space-y-5 md:max-w-sm",
          presenting && "hidden",
          !presenting && fromCreating && "panel-rise-children",
        )}
        aria-hidden={presenting}
        inert={presenting ? true : undefined}
      >
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/posts">{t("manualBack")}</Link>
        </Button>

        {status === "failed" ? (
          <div className="space-y-3 rounded-xl border border-destructive/30 p-4">
            <p className="text-sm text-ink/70">{t("manualFailed")}</p>
            <Button type="button" className="min-h-11 w-full" onClick={() => regenerate.mutate()} disabled={regenerate.isPending}>
              {t("manualRegenerate")}
            </Button>
          </div>
        ) : null}

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-medium">{t("viewNetworksTitle")}</h2>
            <p className="mt-1 text-sm text-ink/70">{t("viewNetworksLead")}</p>
          </div>
          <div className="space-y-2">
            {needsConnect ? (
              <button
                type="button"
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#0A66C2] px-4 text-sm font-medium text-white hover:bg-[#004182] disabled:opacity-50"
                disabled={connect.isPending}
                onClick={() => connect.mutate()}
              >
                <LinkedInIcon className="size-5 shrink-0" />
                {connect.isPending
                  ? t("viewConnecting")
                  : integrations("connect", { network: integrations("networks.linkedin") })}
              </button>
            ) : (
              <div className="flex min-h-11 items-start gap-3 rounded-xl border border-input px-3 py-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium">{t("manualPublishNetworks.linkedin")}</p>
                  {publish.isPending ? (
                    <p className="text-xs text-ink/70">{t("manualPublishPublishing")}</p>
                  ) : linkedinPublished ? (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      {linkedinPostedAt ? t("viewPostedAt", { date: linkedinPostedAt }) : t("viewPosted")}
                    </p>
                  ) : linkedinFailed ? (
                    <p className="text-xs text-red-700 dark:text-red-400">{t("manualPublishNetworkFailed")}</p>
                  ) : needsPage ? (
                    <p className="text-xs text-ink/60">{t("manualPublishNeedPageUrn")}</p>
                  ) : (
                    <p className="text-xs text-ink/60">
                      {isStory ? t("manualPublishLinkedInFeedNote") : t("viewNotPosted")}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium",
                    linkedinPublished
                      ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                      : linkedinFailed
                        ? "border-destructive/40 text-destructive"
                        : "border-input text-ink/60",
                  )}
                >
                  {linkedinPublished ? t("viewPosted") : t("viewNotPosted")}
                </span>
              </div>
            )}
            {needsInstagramConnect ? (
              <button
                type="button"
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#111111] px-4 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
                disabled={connectInstagram.isPending}
                onClick={() => connectInstagram.mutate()}
              >
                <InstagramIcon className="size-5 shrink-0" />
                {connectInstagram.isPending
                  ? t("viewConnectingInstagram")
                  : integrations("connect", { network: integrations("networks.instagram") })}
              </button>
            ) : (
              <div className="flex min-h-11 items-start gap-3 rounded-xl border border-input px-3 py-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium">{t("manualPublishNetworks.instagram")}</p>
                  {publish.isPending && instagramCanSend ? (
                    <p className="text-xs text-ink/70">{t("manualPublishPublishing")}</p>
                  ) : instagramPublished ? (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      {instagramPostedAt ? t("viewPostedAt", { date: instagramPostedAt }) : t("viewPosted")}
                    </p>
                  ) : instagramFailed ? (
                    <p className="text-xs text-red-700 dark:text-red-400">{t("manualPublishNetworkFailed")}</p>
                  ) : (
                    <p className="text-xs text-ink/60">
                      {[
                        instagram?.account_label,
                        isStory ? t("manualPublishAsStory") : t("viewNotPosted"),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium",
                    instagramPublished
                      ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                      : instagramFailed
                        ? "border-destructive/40 text-destructive"
                        : "border-input text-ink/60",
                  )}
                >
                  {instagramPublished ? t("viewPosted") : t("viewNotPosted")}
                </span>
              </div>
            )}
            {needsFacebookConnect ? (
              <button
                type="button"
                className={cn(
                  "flex min-h-12 w-full items-center justify-center gap-3 rounded-xl px-4 text-sm font-medium text-white disabled:opacity-50",
                  socialConnectClass("facebook"),
                )}
                disabled={connectFacebook.isPending}
                onClick={() => connectFacebook.mutate()}
              >
                <FacebookIcon className="size-5 shrink-0" />
                {connectFacebook.isPending
                  ? t("viewConnectingFacebook")
                  : integrations("connect", { network: integrations("networks.facebook") })}
              </button>
            ) : (
              <div className="flex min-h-11 items-start gap-3 rounded-xl border border-input px-3 py-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium">{t("manualPublishNetworks.facebook")}</p>
                  {publish.isPending && facebookCanSend ? (
                    <p className="text-xs text-ink/70">{t("manualPublishPublishing")}</p>
                  ) : facebookPublished ? (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      {facebookPostedAt ? t("viewPostedAt", { date: facebookPostedAt }) : t("viewPosted")}
                    </p>
                  ) : facebookFailed ? (
                    <p className="text-xs text-red-700 dark:text-red-400">{t("manualPublishNetworkFailed")}</p>
                  ) : needsFacebookPage ? (
                    <p className="text-xs text-ink/60">{integrations("oauthNeedFacebookPage")}</p>
                  ) : (
                    <p className="text-xs text-ink/60">
                      {[
                        facebook?.account_label,
                        isStory ? t("manualPublishAsStory") : t("viewNotPosted"),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium",
                    facebookPublished
                      ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                      : facebookFailed
                        ? "border-destructive/40 text-destructive"
                        : "border-input text-ink/60",
                  )}
                >
                  {facebookPublished ? t("viewPosted") : t("viewNotPosted")}
                </span>
              </div>
            )}
          </div>
          {needsPage || showPicker === "linkedin" ? (
            brandId ? (
              <LinkedInPagePicker
                brandID={brandId}
                network="linkedin"
                onSaved={() => {
                  setShowPicker(null);
                  appToast.success(integrations("pageSaved"));
                  void queryClient.invalidateQueries({ queryKey: ["integrations", brandId] });
                }}
                onError={(error) => appToast.error(errors(mapDraftError(error)))}
              />
            ) : null
          ) : null}
          {needsFacebookPage || showPicker === "facebook" ? (
            brandId ? (
              <LinkedInPagePicker
                brandID={brandId}
                network="facebook"
                onSaved={() => {
                  setShowPicker(null);
                  appToast.success(integrations("facebookPageSaved"));
                  void queryClient.invalidateQueries({ queryKey: ["integrations", brandId] });
                }}
                onError={(error) => appToast.error(errors(mapDraftError(error)))}
                onReconnect={() => connectFacebook.mutate()}
              />
            ) : null
          ) : null}
          {canPublish ? (
            <Button type="button" className="min-h-11 w-full" onClick={() => publish.mutate()} disabled={publish.isPending}>
              {t("manualPublish")}
            </Button>
          ) : null}
        </section>

        {canDelete ? (
          <ConfirmAlertDialog
            title={t("manualDelete")}
            description={t("manualDeleteConfirm")}
            cancelLabel={t("manualDeleteCancel")}
            confirmLabel={t("manualDelete")}
            onConfirm={() => remove.mutate()}
            trigger={
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                disabled={remove.isPending}
              >
                {t("manualDelete")}
              </Button>
            }
          />
        ) : null}
      </aside>

      <div
        className={cn(
          "order-1 mx-auto w-full max-w-[min(22rem,calc((100svh-9rem)*433/882))]",
          "transition-[left,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          "md:absolute md:top-0 md:z-10 md:max-w-sm",
          presenting ? "md:left-1/2 md:-translate-x-1/2" : "md:left-full md:-translate-x-full",
        )}
      >
        {pending ? (
          <PostCreatingWait brandName={brandName} aspect={phoneAspect} />
        ) : (
          <div className={cn(fromCreating && revealPanel && "animate-[panel-fade_480ms_ease-out]")}>
            <InstagramPhonePreview
              brandName={brandName}
              logoUrl={visualQuery.data?.identity.logo_url}
              logoInvertedUrl={visualQuery.data?.identity.logo_inverted_url}
              imageUrl={imageUrls[0]}
              imageUrls={carousel ? imageUrls : undefined}
              aspect={phoneAspect}
              caption={post.caption}
              captionPending={pending}
              emptyImageLabel={phone("phoneEmptyImage")}
              emptyCaptionLabel={phone("phoneEmptyCaption")}
              generatingCaptionLabel={phone("phoneGeneratingCaption")}
              likesLabel={phone.raw("phoneLikes")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function isStoryPost(post?: Post): boolean {
  // Same signals the API uses for Stories publish.
  // Prefer format/aspect from user_brief — do not infer from JPEG size
  // (4:5 and 9:16 both generate 1024×1536). Fall back to the art-direction
  // line claim appends when an older row lost aspect in user_brief.
  if (!post) {
    return false;
  }
  if (post.format === "story" || post.aspect === "9:16") {
    return true;
  }
  return /9:16\s+Stories\/Reels/i.test(post.image_prompt ?? "");
}

function previewPhoneAspect(post?: Post): "square" | "portrait" | "story" {
  if (isStoryPost(post)) {
    return "story";
  }
  const first = (post?.assets ?? []).find((item) => item.width > 0 && item.height > 0);
  if (first) {
    return first.height / first.width > 1.1 ? "portrait" : "square";
  }
  if (post?.preset?.output_kind === "market_topic" || (post?.assets?.length ?? 0) > 1) {
    return "portrait";
  }
  return "square";
}

function mapDraftError(error: unknown) {
  const code = typeof error === "string" ? error : error instanceof ApiError ? error.code : "";
  const known = [
    "ai_unconfigured",
    "invalid_input",
    "forbidden",
    "integration_unconfigured",
    "linkedin_failed",
    "linkedin_denied",
    "instagram_failed",
    "instagram_denied",
    "facebook_failed",
    "facebook_denied",
    "invalid_state",
    "network_unavailable",
  ] as const;
  if (known.includes(code as (typeof known)[number])) {
    return code;
  }
  return "internal_error";
}
