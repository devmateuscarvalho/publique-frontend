"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronLeft, MoreHorizontal, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { ConfirmAlertDialog } from "@/components/confirm-alert-dialog";
import { useCreationBrand } from "@/components/creation-brand";
import { BrandFilter, CreationFrame, useBrandQuery } from "@/components/creation-screen";
import { FilterPills, type ListFilter } from "@/components/data-table";
import { InstagramPhonePreview } from "@/components/instagram-phone-preview";
import { LinkedInPagePicker } from "@/components/linkedin-page-picker";
import { PostAnalytics } from "@/components/post-analytics";
import { PostCreatingWait } from "@/components/post-creating-wait";
import { PostFeedbackPicker, type PostFeedback } from "@/components/post-feedback-picker";
import { PostFeed } from "@/components/post-feed";
import { SocialNetworkIcon, socialMarkClass, type SocialNetworkID } from "@/components/social-network-icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccount } from "@/components/use-account";
import { ApiError, api, type CreativeRecipe, type LatestAnalyticsItem, type Post, type PostAsset, type VisualResponse } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import { queueIsStory } from "@/lib/post-queue";
import { usePresetCopy } from "@/lib/preset-i18n";
import { startSocialOAuth } from "@/lib/social-connect";
import { cn } from "@/lib/utils";
import { modelsForAspect, normalizeVideoModel, videoModelById, videoModels, type VideoModelId } from "@/lib/video-models";

const studioLabel = "text-[11px] font-medium uppercase tracking-[0.16em] text-ink/45";

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
  const searchParams = useSearchParams();
  const brandId = searchParams.get("brand") ?? "";
  const { brands } = useCreationBrand();
  const brandName = brands.find((item) => item.id === brandId)?.name?.trim();
  return (
    <AppShell title={brandName || t("resultTitle")}>
      <CreationFrame>
        <ManualDraftPage postId={postId} />
      </CreationFrame>
    </AppShell>
  );
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

function useApprovalQuery() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const approval = params.get("approval") ?? "";
  const setApproval = useCallback(
    (value: string) => {
      const search = new URLSearchParams(params.toString());
      if (value === "pending" || value === "approved" || value === "rejected") {
        search.set("approval", value);
      } else {
        search.delete("approval");
      }
      const query = search.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );
  return { approval, setApproval };
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
  const { approval, setApproval } = useApprovalQuery();
  const originFilter = origin === "manual" || origin === "automation" ? origin : "";
  const presetFilter = preset.trim();
  const approvalFilter =
    approval === "pending" || approval === "approved" || approval === "rejected" ? approval : "";
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
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const clearFilters = useCallback(() => {
    const search = new URLSearchParams(params.toString());
    for (const key of ["brand", "origin", "preset", "approval", "q", "lane"]) {
      search.delete(key);
    }
    const query = search.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  const recipesQuery = useQuery({
    queryKey: ["creative-recipes", organization?.id],
    queryFn: () =>
      api<{ creative_recipes: CreativeRecipe[] }>(`/v1/organizations/${organization?.id}/creative-recipes`),
    enabled: Boolean(organization?.id),
  });
  const recipes = recipesQuery.data?.creative_recipes ?? [];

  const listQuery = useQuery({
    queryKey: ["posts", organization?.id, brandId || "all", originFilter || "all", presetFilter || "all", approvalFilter || "all"],
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
      if (approvalFilter) {
        params.set("approval", approvalFilter);
      }
      const query = params.toString();
      return api<{ posts: Post[] }>(`/v1/organizations/${organization?.id}/posts${query ? `?${query}` : ""}`);
    },
    enabled: Boolean(organization?.id),
    refetchInterval: (query) => {
      const items = query.state.data?.posts ?? [];
      const live = items.some((post) => post.status === "queued" || post.status === "generating" || post.status === "publishing");
      return live ? 5_000 : 30_000;
    },
  });
  const latestQuery = useQuery({
    queryKey: ["analytics-latest", organization?.id, brandId || "all"],
    queryFn: () => {
      const params = new URLSearchParams();
      if (brandId) {
        params.set("brand", brandId);
      }
      const query = params.toString();
      return api<{ items: LatestAnalyticsItem[] }>(
        `/v1/organizations/${organization?.id}/analytics/latest${query ? `?${query}` : ""}`,
      );
    },
    enabled: Boolean(organization?.id),
  });
  const latestByPost = new Map<string, LatestAnalyticsItem[]>();
  for (const item of latestQuery.data?.items ?? []) {
    const list = latestByPost.get(item.post_id) ?? [];
    list.push(item);
    latestByPost.set(item.post_id, list);
  }

  const posts = listQuery.data?.posts ?? [];

  return (
    <PostFeed
      posts={posts}
      pending={Boolean(organization?.id) && listQuery.isPending && !listQuery.isError}
      fetching={listQuery.isFetching && Boolean(listQuery.data)}
      error={listQuery.isError}
      capped={posts.length >= 50}
      asOf={listQuery.dataUpdatedAt}
      serverFiltering={Boolean(brandId || originFilter || presetFilter || approvalFilter)}
      onRetry={() => void listQuery.refetch()}
      onClear={clearFilters}
      brandNameOf={brandNameOf}
      logoOf={logoOf}
      performanceOf={(id) => latestByPost.get(id)}
      filters={
        <>
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
              {
                key: "approval",
                label: t("approvalFilter"),
                allLabel: lists("all"),
                options: [
                  { value: "pending", label: t("approvalPending") },
                  { value: "approved", label: t("approvalApproved") },
                  { value: "rejected", label: t("approvalRejected") },
                ],
              } satisfies ListFilter,
            ]}
            values={{ origin: originFilter, preset: presetFilter, approval: approvalFilter }}
            onChange={(key, value) => {
              if (key === "origin") {
                setOrigin(value);
                return;
              }
              if (key === "approval") {
                setApproval(value);
                return;
              }
              setPreset(value);
            }}
          />
        </>
      }
    />
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
  const plan = useTranslations("contentPlan");
  const videoCopy = useTranslations("backoffice");
  const phone = useTranslations("wizard");
  const errors = useTranslations("errors");
  const integrations = useTranslations("integrations");
  const presetCopy = usePresetCopy();
  const format = useFormatter();
  const queryClient = useQueryClient();
  const { organization } = useAccount();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const brandId = searchParams.get("brand") ?? "";
  const { brands } = useCreationBrand();
  const brand = brands.find((item) => item.id === brandId);
  const brandName = brand?.name ?? "";
  const oauthHandled = useRef(false);
  const instagramOAuthHandled = useRef(false);
  const facebookOAuthHandled = useRef(false);
  const tiktokOAuthHandled = useRef(false);
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
  const videoAsset = (post?.assets ?? []).find((asset) => asset.kind === "video" || asset.mime?.startsWith("video/"));
  const videoLook = Boolean(post?.generation_stage) || status === "image_ready";
  const generatedStill = videoLook ? latestGeneratedStill(post) : undefined;
  const referenceAsset = videoLook ? (post?.assets ?? []).find((asset) => asset.origin === "uploaded") : undefined;
  const imageUrls = videoAsset
    ? []
    : generatedStill?.url
      ? [generatedStill.url]
      : (post?.assets ?? []).map((asset) => asset.url).filter(Boolean);
  const carousel = imageUrls.length > 1;
  const phoneAspect = previewPhoneAspect(post);
  const isStory = isStoryPost(post);
  const byNetwork = new Map((integrationsQuery.data?.integrations ?? []).map((item) => [item.network, item]));
  const linkedin = byNetwork.get("linkedin");
  const instagram = byNetwork.get("instagram");
  const facebook = byNetwork.get("facebook");
  const tiktok = byNetwork.get("tiktok");
  const linkedinReady = Boolean(linkedin?.configured && linkedin.page_urn?.trim());
  const instagramReady = Boolean(instagram?.configured && instagram.page_urn?.trim());
  const facebookReady = Boolean(facebook?.configured && facebook.page_urn?.trim());
  const tiktokReady = Boolean(tiktok?.configured && tiktok.page_urn?.trim());
  const linkedinPublication = (post?.publications ?? []).find((item) => item.network === "linkedin");
  const instagramPublication = (post?.publications ?? []).find((item) => item.network === "instagram");
  const facebookPublication = (post?.publications ?? []).find((item) => item.network === "facebook");
  const tiktokPublication = (post?.publications ?? []).find((item) => item.network === "tiktok");
  const linkedinPublished = linkedinPublication?.status === "published";
  const instagramPublished = instagramPublication?.status === "published";
  const facebookPublished = facebookPublication?.status === "published";
  const tiktokPublished = tiktokPublication?.status === "published";
  const linkedinFailed = !linkedinPublished && linkedinPublication?.status === "failed";
  const instagramFailed = !instagramPublished && instagramPublication?.status === "failed";
  const facebookFailed = !facebookPublished && facebookPublication?.status === "failed";
  const tiktokFailed = !tiktokPublished && tiktokPublication?.status === "failed";
  const linkedinPostedAt = formatWhen(linkedinPublication?.updated_at, format);
  const instagramPostedAt = formatWhen(instagramPublication?.updated_at, format);
  const facebookPostedAt = formatWhen(facebookPublication?.updated_at, format);
  const tiktokPostedAt = formatWhen(tiktokPublication?.updated_at, format);
  const linkedinCanSend = linkedinReady && !linkedinPublished;
  const instagramCanSend = instagramReady && !instagramPublished;
  const facebookCanSend = facebookReady && !facebookPublished;
  const tiktokCanSend = tiktokReady && !tiktokPublished;
  const needsConnect = !linkedinPublished && !linkedin?.configured;
  const needsInstagramConnect = !instagramPublished && !instagram?.configured;
  const needsFacebookConnect = !facebookPublished && !facebook?.configured;
  const needsTikTokConnect = !tiktokPublished && !tiktok?.configured;
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

  useEffect(() => {
    const statusParam = searchParams.get("tiktok");
    if (!statusParam || tiktokOAuthHandled.current) {
      return;
    }
    tiktokOAuthHandled.current = true;
    if (statusParam === "connected") {
      appToast.success(integrations("oauthConnected", { network: integrations("networks.tiktok") }));
    } else if (statusParam === "error") {
      const code = searchParams.get("code") ?? "internal_error";
      appToast.error(errors(mapDraftError(new ApiError(code))));
    }
    void queryClient.invalidateQueries({ queryKey: ["integrations", brandId] });
    const next = new URLSearchParams(searchParams.toString());
    next.delete("tiktok");
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
  const connectTikTok = useMutation({
    mutationFn: () => {
      if (!brandId) {
        throw new ApiError("invalid_input");
      }
      return startSocialOAuth(brandId, "tiktok", returnTo);
    },
    onError: (error) => appToast.error(errors(mapDraftError(error))),
  });

  const [feedbackMode, setFeedbackMode] = useState<"" | "reject" | "regenerate">("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [chosenVideoModel, setChosenVideoModel] = useState<VideoModelId>(videoModels[0].id);
  useEffect(() => {
    const allowed = modelsForAspect(post?.video_aspect);
    const preferred = post?.video_model ? normalizeVideoModel(post.video_model) : allowed[0].id;
    setChosenVideoModel(allowed.some((item) => item.id === preferred) ? preferred : allowed[0].id);
  }, [post?.video_model, post?.video_aspect]);
  const regenerate = useMutation({
    mutationFn: (feedback?: PostFeedback) =>
      api<{ post: Post }>(`/v1/brands/${brandId}/posts/${postId}/regenerate`, {
        method: "POST",
        body: JSON.stringify(feedback ?? {}),
      }),
    onSuccess: () => {
      setFeedbackMode("");
      return postQuery.refetch();
    },
    onError: (error) => appToast.error(errors(mapDraftError(error))),
  });
  const animate = useMutation({
    mutationFn: () =>
      api<{ post: Post }>(`/v1/brands/${brandId}/posts/${postId}/animate`, {
        method: "POST",
        body: JSON.stringify({ video_model: chosenVideoModel }),
      }),
    onSuccess: () => postQuery.refetch(),
    onError: (error) => appToast.error(errors(mapDraftError(error))),
  });
  const approvalStatus = post?.approval_status ?? "not_required";
  const qualityFlags = post?.quality_flags ?? [];
  const qualityReview = post?.quality_review;
  const approvalUnlocked = approvalStatus === "not_required" || approvalStatus === "approved";
  const approvePost = useMutation({
    mutationFn: () =>
      api<{ post: Post }>(`/v1/brands/${brandId}/posts/${postId}/approve`, {
        method: "POST",
        body: "{}",
      }),
    onSuccess: async () => {
      appToast.success(t("approvalApprovedToast"));
      await postQuery.refetch();
    },
    onError: (error) => appToast.error(errors(mapDraftError(error))),
  });
  const rejectPost = useMutation({
    mutationFn: (feedback: PostFeedback) =>
      api<{ post: Post }>(`/v1/brands/${brandId}/posts/${postId}/reject`, {
        method: "POST",
        body: JSON.stringify(feedback),
      }),
    onSuccess: async () => {
      setFeedbackMode("");
      appToast.success(t("approvalRejectedToast"));
      await postQuery.refetch();
    },
    onError: (error) => appToast.error(errors(mapDraftError(error))),
  });
  const publish = useMutation({
    mutationFn: () => {
      const networks = [
        ...(linkedinCanSend ? (["linkedin"] as const) : []),
        ...(instagramCanSend ? (["instagram"] as const) : []),
        ...(facebookCanSend ? (["facebook"] as const) : []),
        ...(tiktokCanSend ? (["tiktok"] as const) : []),
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
  const cancelSchedule = useMutation({
    mutationFn: () => api<{ post: Post }>(`/v1/brands/${brandId}/posts/${postId}/cancel-schedule`, { method: "POST", body: "{}" }),
    onSuccess: () => postQuery.refetch(),
    onError: (error) => appToast.error(errors(mapDraftError(error))),
  });
  const publishTargets = linkedinCanSend || instagramCanSend || facebookCanSend || tiktokCanSend;
  const canPublish =
    approvalUnlocked &&
    (status === "draft" || status === "published") &&
    !publish.isPending &&
    publishTargets;
  const showPublish =
    approvalUnlocked && (status === "draft" || status === "published") && (publishTargets || publish.isPending);
  const showApprovalActions = status === "draft" && approvalStatus === "pending";
  const showRejectedHint = status === "draft" && approvalStatus === "rejected";
  const alreadyPosted =
    status === "published" ||
    status === "publishing" ||
    (post?.publications ?? []).some((item) => item.status === "published" || item.status === "publishing");
  const canDelete = Boolean(post) && !alreadyPosted && !publish.isPending;
  const canRegenerateDraft = status === "draft" && Boolean(post?.is_ai_generated) && !alreadyPosted && !publish.isPending;
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
        <Button asChild variant="ghost" className="-ml-2 min-h-11 px-2">
          <Link href="/posts">
            <ChevronLeft />
            {t("manualBack")}
          </Link>
        </Button>
        <p className="text-sm text-ink/70">{t("manualNotFound")}</p>
      </div>
    );
  }

  const statusLabel = t.has(`postStatuses.${status}`) ? t(`postStatuses.${status}`) : status;
  const approvalLabel =
    approvalStatus === "pending"
      ? t(post.overdue ? "approvalOverdue" : "approvalPending")
      : approvalStatus === "approved"
        ? t("approvalApproved")
        : approvalStatus === "rejected"
          ? t("approvalRejected")
          : "";
  const presetLabel = post.preset
    ? `${presetCopy.name({ name: post.preset.name, style_key: post.preset.style_key })}${post.preset.version ? ` v${post.preset.version}` : ""}`
    : "";
  const kindLabel =
    post.preset?.output_kind && t.has(`outputKinds.${post.preset.output_kind}`)
      ? t(`outputKinds.${post.preset.output_kind}`)
      : "";
  const formatLabel =
    post.preset?.content_format && t.has(`viewFormats.${post.preset.content_format}`)
      ? t(`viewFormats.${post.preset.content_format}`)
      : "";
  const mold = post.mold;
  const subject = moldSubject(mold, t);
  const placeLabel = mold?.place?.trim() ?? "";
  const themeLabel = moldChoice(phone, mold?.theme, {
    light: "carouselThemeLight",
    dark: "carouselThemeDark",
    random: "carouselThemeRandom",
  });
  const moodLabel = moldChoice(phone, mold?.mood, {
    warm: "moodWarm",
    bold: "moodBold",
    calm: "moodCalm",
    casual: "moodCasual",
  });
  const aspectLabel = moldChoice(phone, mold?.aspect, {
    "1:1": "aspectSquare",
    "4:5": "aspectPortrait",
    "9:16": "aspectStory",
  });
  const whenLabel = moldWhenLabel(post, t, format, brand?.timezone || "UTC");
  const createdLabel = post.created_at
    ? format.dateTime(new Date(post.created_at), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: brand?.timezone || "UTC",
    })
    : "";
  const scheduledLabel =
    post.publish_at && !alreadyPosted
      ? t("scheduledFor", {
        when: format.dateTime(new Date(post.publish_at), {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: brand?.timezone || "UTC",
        }),
      })
      : "";
  const needsAnyConnect = needsConnect || needsInstagramConnect || needsFacebookConnect || needsTikTokConnect;
  const networkLead = videoAsset && !alreadyPosted ? t("videoPublishLead") : needsAnyConnect ? t("viewNetworksLead") : "";
  const showMenu = canRegenerateDraft || canDelete;
  const showApprovalButtons = showApprovalActions && feedbackMode !== "reject";
  const showToolbarActions = showApprovalButtons || showPublish || status === "failed" || showMenu;
  const showQuality = (qualityFlags.length > 0 || Boolean(qualityReview)) && !alreadyPosted;
  const showApprovalPanel =
    showRejectedHint || Boolean(post.overdue && approvalStatus === "pending") || feedbackMode === "reject";
  const failedCopy = post.error_code && errors.has(post.error_code) ? errors(post.error_code) : t("manualFailed");
  const detailCopy = {
    publishingLabel: t("manualPublishPublishing"),
    failedLabel: t("manualPublishNetworkFailed"),
    posted: t("viewPosted"),
    postedAt: (date: string) => t("viewPostedAt", { date }),
  };
  const rows: PublishRow[] = [
    {
      id: "linkedin",
      title: t("manualPublishNetworks.linkedin"),
      state: networkState(linkedinPublished, linkedinFailed, publish.isPending && linkedinCanSend),
      detail: publishDetail({
        ...detailCopy,
        published: linkedinPublished,
        publishedAt: linkedinPostedAt,
        failed: linkedinFailed,
        publishing: publish.isPending && linkedinCanSend,
        idle: needsPage
          ? t("manualPublishNeedPageUrn")
          : videoAsset
            ? t("videoAsFeed")
            : isStory
              ? t("manualPublishLinkedInFeedNote")
              : t("viewNotPosted"),
      }),
      connect: needsConnect
        ? {
          pending: connect.isPending,
          label: connect.isPending
            ? t("viewConnecting")
            : integrations("connect", { network: integrations("networks.linkedin") }),
          onClick: () => connect.mutate(),
        }
        : undefined,
    },
    {
      id: "instagram",
      title: t("manualPublishNetworks.instagram"),
      state: networkState(instagramPublished, instagramFailed, publish.isPending && instagramCanSend),
      detail: publishDetail({
        ...detailCopy,
        published: instagramPublished,
        publishedAt: instagramPostedAt,
        failed: instagramFailed,
        publishing: publish.isPending && instagramCanSend,
        idle: [instagram?.account_label, videoAsset ? t("videoAsReel") : isStory ? t("manualPublishAsStory") : t("viewNotPosted")]
          .filter(Boolean)
          .join(" · "),
      }),
      connect: needsInstagramConnect
        ? {
          pending: connectInstagram.isPending,
          label: connectInstagram.isPending
            ? t("viewConnectingInstagram")
            : integrations("connect", { network: integrations("networks.instagram") }),
          onClick: () => connectInstagram.mutate(),
        }
        : undefined,
    },
    {
      id: "facebook",
      title: t("manualPublishNetworks.facebook"),
      state: networkState(facebookPublished, facebookFailed, publish.isPending && facebookCanSend),
      detail: publishDetail({
        ...detailCopy,
        published: facebookPublished,
        publishedAt: facebookPostedAt,
        failed: facebookFailed,
        publishing: publish.isPending && facebookCanSend,
        idle: needsFacebookPage
          ? integrations("oauthNeedFacebookPage")
          : [
            facebook?.account_label,
            videoAsset
              ? videoAsset.height > videoAsset.width
                ? t("videoAsReel")
                : t("videoAsPage")
              : isStory
                ? t("manualPublishAsStory")
                : t("viewNotPosted"),
          ]
            .filter(Boolean)
            .join(" · "),
      }),
      connect: needsFacebookConnect
        ? {
          pending: connectFacebook.isPending,
          label: connectFacebook.isPending
            ? t("viewConnectingFacebook")
            : integrations("connect", { network: integrations("networks.facebook") }),
          onClick: () => connectFacebook.mutate(),
        }
        : undefined,
    },
    {
      id: "tiktok",
      title: t("manualPublishNetworks.tiktok"),
      state: networkState(tiktokPublished, tiktokFailed, publish.isPending && tiktokCanSend),
      detail: publishDetail({
        ...detailCopy,
        published: tiktokPublished,
        publishedAt: tiktokPostedAt,
        failed: tiktokFailed,
        publishing: publish.isPending && tiktokCanSend,
        idle: [tiktok?.account_label, videoAsset ? t("videoAsTikTok") : t("viewNotPosted")].filter(Boolean).join(" · "),
      }),
      connect: needsTikTokConnect
        ? {
          pending: connectTikTok.isPending,
          label: connectTikTok.isPending
            ? t("viewConnectingTikTok")
            : integrations("connect", { network: integrations("networks.tiktok") }),
          onClick: () => connectTikTok.mutate(),
        }
        : undefined,
    },
  ];

  return (
    <>
      <div className={cn("flex flex-col gap-8", presenting && "min-h-[min(40rem,calc(100svh-9rem))]")}>
        {presenting ? null : (
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <Button asChild variant="ghost" className="-ml-2 min-h-11 px-2">
                <Link href="/posts">
                  <ChevronLeft />
                  {t("manualBack")}
                </Link>
              </Button>
              <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", statusTone(status))}>
                <span className="size-1.5 rounded-full bg-current" aria-hidden />
                {statusLabel}
              </span>
              {approvalLabel ? <span className="text-xs text-ink/55">· {approvalLabel}</span> : null}
            </div>
            {showToolbarActions ? (
              <div className="flex w-full items-center gap-2 sm:w-auto">
                {showApprovalButtons ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 flex-1 sm:flex-none"
                    onClick={() => setFeedbackMode("reject")}
                    disabled={approvePost.isPending || rejectPost.isPending}
                  >
                    {t("approvalRejectAction")}
                  </Button>
                ) : null}
                {showApprovalButtons ? (
                  <Button
                    type="button"
                    className="min-h-11 flex-1 sm:flex-none"
                    onClick={() => approvePost.mutate()}
                    disabled={approvePost.isPending || rejectPost.isPending}
                  >
                    {t("approvalApproveAction")}
                  </Button>
                ) : null}
                {showPublish ? (
                  <Button
                    type="button"
                    className="min-h-11 flex-1 sm:flex-none"
                    onClick={() => publish.mutate()}
                    disabled={!canPublish}
                    aria-busy={publish.isPending}
                  >
                    {publish.isPending ? t("manualPublishPublishing") : t("manualPublish")}
                  </Button>
                ) : null}
                {status === "failed" ? (
                  <Button
                    type="button"
                    className="min-h-11 flex-1 sm:flex-none"
                    onClick={() => regenerate.mutate(undefined)}
                    disabled={regenerate.isPending || animate.isPending}
                  >
                    {t("manualRegenerate")}
                  </Button>
                ) : null}
                {showMenu ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="icon" className="shrink-0" aria-label={t("columns.actions")}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-48">
                      {canRegenerateDraft && feedbackMode !== "regenerate" ? (
                        <DropdownMenuItem className="min-h-11" onSelect={() => setFeedbackMode("regenerate")}>
                          {t("feedbackRegenerateAction")}
                        </DropdownMenuItem>
                      ) : null}
                      {canDelete ? (
                        <DropdownMenuItem
                          className="min-h-11 text-destructive focus:text-destructive"
                          onSelect={() => setConfirmDelete(true)}
                        >
                          {t("manualDelete")}
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            ) : null}
          </header>
        )}

        <div
          className={cn(
            presenting
              ? "flex flex-1 items-center justify-center"
              : "grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22.5rem]",
          )}
        >
          <div className="min-w-0">
            {status === "failed" && !presenting ? (
              <p className="mb-6 text-sm leading-relaxed text-destructive" role="alert">
                {failedCopy}
              </p>
            ) : null}
            <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8">
              <div
                className={cn(
                  "w-full max-w-96 shrink-0",
                  fromCreating && revealPanel && "animate-[panel-fade_480ms_ease-out]",
                )}
              >
                {pending ? (
                  <PostCreatingWait
                    brandName={brandName}
                    aspect={phoneAspect}
                    phase={post.generation_stage === "video" ? "motion" : post.generation_stage === "image" ? "still" : undefined}
                  />
                ) : (
                  <InstagramPhonePreview
                    className="max-w-96 lg:max-w-96 xl:max-w-96"
                    brandName={brandName}
                    logoUrl={visualQuery.data?.identity.logo_url}
                    logoInvertedUrl={visualQuery.data?.identity.logo_inverted_url}
                    imageUrl={videoAsset ? undefined : imageUrls[0]}
                    imageUrls={carousel ? imageUrls : undefined}
                    videoUrl={videoAsset?.url}
                    aspect={videoAsset ? videoPhoneAspect(videoAsset) : phoneAspect}
                    caption={post.caption}
                    captionPending={pending}
                    emptyImageLabel={phone("phoneEmptyImage")}
                    emptyCaptionLabel={phone("phoneEmptyCaption")}
                    generatingCaptionLabel={phone("phoneGeneratingCaption")}
                    likesLabel={phone.raw("phoneLikes")}
                  />
                )}
                {!presenting && videoAsset && generatedStill?.url ? (
                  <figure className="mx-auto mt-5 flex w-full max-w-[18rem] items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={generatedStill.url} alt="" className="size-14 rounded-md object-cover" />
                    <figcaption className="text-xs leading-relaxed text-ink/55">{t("stillKept")}</figcaption>
                  </figure>
                ) : null}
              </div>
            </div>
          </div>

          {presenting ? null : (
            <aside
              className={cn(
                "divide-y divide-input overflow-hidden rounded-2xl border border-input bg-card",
                fromCreating && revealPanel && "panel-rise-children",
              )}
            >
              <StudioSection title={t("viewAboutTitle")}>
                <dl className="space-y-2.5 text-sm">
                  <Fact label={t("viewKind")} value={kindLabel} />
                  <Fact label={t("viewFormat")} value={formatLabel} />
                  <Fact label={t("automationPreset")} value={presetLabel} />
                  {subject ? <Fact label={subject.label} value={subject.value} /> : null}
                  <Fact label={t("viewPlace")} value={placeLabel} />
                  <Fact label={t("viewTheme")} value={themeLabel} />
                  <Fact label={t("viewAspect")} value={aspectLabel} />
                  <Fact label={t("viewMood")} value={moodLabel} />
                  <Fact label={t("viewWhen")} value={whenLabel} />
                  <Fact label={t("viewOrigin")} value={t(post.origin === "automation" ? "originAutomation" : "originManual")} />
                  <Fact label={plan("pillars")} value={post.content_pillar ?? ""} />
                  <Fact label={t("viewCreated")} value={createdLabel} tabular />
                </dl>
              </StudioSection>

              {status === "image_ready" ? (
                <StudioSection title={t("stillReadyTitle")}>
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-ink/70">{t("stillReadyLead")}</p>
                    {referenceAsset?.url ? (
                      <figure className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={referenceAsset.url} alt="" className="size-16 rounded-md object-cover" />
                        <figcaption className="text-xs text-ink/55">{t("stillReference")}</figcaption>
                      </figure>
                    ) : null}
                    <div className="space-y-2">
                      <Label htmlFor="draft-video-model">{t("videoModel")}</Label>
                      <Select value={chosenVideoModel} onValueChange={(value) => setChosenVideoModel(normalizeVideoModel(value))}>
                        <SelectTrigger id="draft-video-model" className="min-h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {modelsForAspect(post?.video_aspect).map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {videoCopy(`videoLab.models.${item.labelKey}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs leading-relaxed text-ink/70">{videoCopy(`videoLab.blurbs.${videoModelById(chosenVideoModel).blurbKey}`)}</p>
                      <p className="text-xs leading-relaxed text-ink/55">{t("videoModelHint")}</p>
                    </div>
                    <Button
                      type="button"
                      className="min-h-11 w-full"
                      onClick={() => animate.mutate()}
                      disabled={animate.isPending || regenerate.isPending}
                    >
                      {t("animate")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11 w-full"
                      onClick={() => regenerate.mutate(undefined)}
                      disabled={regenerate.isPending || animate.isPending}
                    >
                      {t("regenerateStill")}
                    </Button>
                  </div>
                </StudioSection>
              ) : null}

              {showQuality ? (
                <StudioSection
                  title={qualityFlags.length > 0 ? t("qualityFlagsTitle") : t("qualityReviewTitle", { score: qualityReview?.score ?? 0 })}
                  className={qualityFlags.length > 0 ? "bg-amber-500/[0.07]" : undefined}
                >
                  <div className="space-y-3">
                    {qualityFlags.length > 0 ? (
                      <div className="space-y-2" role="status">
                        <ul className="space-y-1.5 text-sm leading-relaxed text-ink/75">
                          {qualityFlags.map((flag) => (
                            <li key={flag}>{t.has(`qualityFlags.${flag}`) ? t(`qualityFlags.${flag}`) : flag}</li>
                          ))}
                        </ul>
                        {post.origin === "automation" && approvalStatus === "pending" ? (
                          <p className="text-xs leading-relaxed text-ink/55">{t("qualityFlagsHeld")}</p>
                        ) : null}
                      </div>
                    ) : null}
                    {qualityReview ? (
                      <div className="space-y-2">
                        <h2 className="text-sm font-medium">{t("qualityReviewTitle", { score: qualityReview.score })}</h2>
                        {qualityReview.issues.length > 0 ? (
                          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink/75">
                            {qualityReview.issues.map((issue) => (
                              <li key={issue}>{issue}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </StudioSection>
              ) : null}

              {showApprovalPanel ? (
                <StudioSection title={t("approvalFilter")}>
                  <div className="space-y-3">
                    {post.overdue && approvalStatus === "pending" ? (
                      <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-300">{t("approvalOverdueHint")}</p>
                    ) : null}
                    {showRejectedHint ? <p className="text-sm leading-relaxed text-ink/70">{t("approvalRejectedHint")}</p> : null}
                    {feedbackMode === "reject" ? (
                      <PostFeedbackPicker
                        title={t("feedbackRejectTitle")}
                        confirmLabel={t("approvalRejectAction")}
                        pending={rejectPost.isPending}
                        onConfirm={(feedback) => rejectPost.mutate(feedback)}
                        onCancel={() => setFeedbackMode("")}
                      />
                    ) : null}
                  </div>
                </StudioSection>
              ) : null}

              {scheduledLabel ? (
                <StudioSection title={scheduledLabel} plain>
                  <ConfirmAlertDialog
                    title={t("cancelSchedule")}
                    description={t("cancelScheduleConfirm")}
                    cancelLabel={t("manualDeleteCancel")}
                    confirmLabel={t("cancelSchedule")}
                    onConfirm={() => cancelSchedule.mutate()}
                    trigger={
                      <Button type="button" variant="ghost" className="min-h-11 shrink-0 px-3" disabled={cancelSchedule.isPending}>
                        {t("cancelSchedule")}
                      </Button>
                    }
                  />
                </StudioSection>
              ) : null}

              <StudioSection
                title={t("viewNetworksTitle")}
                forceOpen={Boolean(showPicker) || needsPage || needsFacebookPage}
                summary={rows.map((row) => (
                  <NetworkPublishMark
                    key={row.id}
                    id={row.id}
                    state={row.state}
                    label={`${row.title}. ${row.state === "published" ? t("viewPosted") : t("viewNotPosted")}`}
                  />
                ))}
              >
                <div className="-mx-2">
                  {networkLead ? <p className="px-2 pb-1 text-xs leading-relaxed text-ink/55">{networkLead}</p> : null}
                  <div>
                    {rows.map((row) => (
                      <PublishNetworkRow key={row.id} {...row} />
                    ))}
                  </div>
                  {needsPage || showPicker === "linkedin" ? (
                    <div className="px-2 pb-2 pt-2">
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
                    </div>
                  ) : null}
                  {needsFacebookPage || showPicker === "facebook" ? (
                    <div className="px-2 pb-2 pt-2">
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
                    </div>
                  ) : null}
                </div>
              </StudioSection>

              {canRegenerateDraft && feedbackMode === "regenerate" ? (
                <section className="px-4 py-4">
                  <PostFeedbackPicker
                    title={t("feedbackRegenerateTitle")}
                    confirmLabel={t("feedbackRegenerateConfirm")}
                    pending={regenerate.isPending}
                    onConfirm={(feedback) => regenerate.mutate(feedback)}
                    onCancel={() => setFeedbackMode("")}
                  />
                </section>
              ) : null}

              {alreadyPosted && brandId ? (
                <PostAnalytics
                  brandId={brandId}
                  postId={postId}
                  onReconnect={(network) => {
                    if (network === "linkedin") {
                      connect.mutate();
                      return;
                    }
                    if (network === "instagram") {
                      connectInstagram.mutate();
                      return;
                    }
                    if (network === "facebook") {
                      connectFacebook.mutate();
                      return;
                    }
                    connectTikTok.mutate();
                  }}
                />
              ) : null}

            </aside>
          )}
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("manualDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("manualDeleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("manualDeleteCancel")}</AlertDialogCancel>
            <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={() => remove.mutate()}>
              {t("manualDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type PublishTone = "published" | "failed" | "publishing" | "idle";

type PublishRow = {
  id: SocialNetworkID;
  title: string;
  detail: string;
  state: PublishTone;
  connect?: { pending: boolean; label: string; onClick: () => void };
};

function networkState(published: boolean, failed: boolean, publishing: boolean): PublishTone {
  if (publishing) {
    return "publishing";
  }
  if (published) {
    return "published";
  }
  if (failed) {
    return "failed";
  }
  return "idle";
}

function publishDetail(input: {
  published: boolean;
  publishedAt: string;
  failed: boolean;
  publishing: boolean;
  idle: string;
  publishingLabel: string;
  failedLabel: string;
  postedAt: (date: string) => string;
  posted: string;
}) {
  if (input.publishing) {
    return input.publishingLabel;
  }
  if (input.published) {
    return input.publishedAt ? input.postedAt(input.publishedAt) : input.posted;
  }
  if (input.failed) {
    return input.failedLabel;
  }
  return input.idle;
}

function StudioSection({
  title,
  summary,
  children,
  defaultOpen = false,
  forceOpen = false,
  plain = false,
  className,
}: {
  title: string;
  summary?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  plain?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const shown = forceOpen || open;
  return (
    <details
      open={shown}
      onToggle={(event) => {
        if (forceOpen) {
          event.currentTarget.open = true;
          return;
        }
        setOpen(event.currentTarget.open);
      }}
      className={cn("group", className)}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
        <span className={cn("min-w-0", plain ? "text-sm leading-snug text-ink/80" : studioLabel)}>{title}</span>
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {summary ? <span className="flex items-center gap-2 group-open:hidden">{summary}</span> : null}
          <ChevronDown className="size-4 text-ink/45 transition-transform group-open:rotate-180" aria-hidden />
        </span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function NetworkPublishMark({ id, state, label }: { id: SocialNetworkID; state: PublishTone; label: string }) {
  const published = state === "published";
  return (
    <span className="relative inline-flex size-8" title={label}>
      <span className={cn("flex size-8 items-center justify-center rounded-full text-white", socialMarkClass(id))} aria-hidden>
        <SocialNetworkIcon id={id} className="size-4" />
      </span>
      <span
        className={cn(
          "absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full text-white ring-2 ring-card",
          published ? "bg-emerald-600" : state === "failed" ? "bg-destructive" : "bg-zinc-600",
        )}
        aria-hidden
      >
        {published ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function statusTone(status: string) {
  if (status === "published") {
    return "text-emerald-700 dark:text-emerald-400";
  }
  if (status === "failed") {
    return "text-destructive";
  }
  if (status === "image_ready" || status === "publishing" || status === "generating" || status === "queued") {
    return "text-amber-800 dark:text-amber-300";
  }
  return "text-ink/70";
}

function PublishNetworkRow({ id, title, detail, state, connect }: PublishRow) {
  const tone =
    state === "published"
      ? "text-emerald-700 dark:text-emerald-400"
      : state === "failed"
        ? "text-red-700 dark:text-red-400"
        : "text-ink/55";
  const line = connect ? connect.label : detail;
  const content = (
    <>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-white", socialMarkClass(id))}>
        <SocialNetworkIcon id={id} className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-tight">{title}</span>
        <span className={cn("mt-0.5 block truncate text-xs", connect ? "text-ink/55" : tone)} title={line}>
          {line}
        </span>
      </span>
      {connect ? null : (
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            state === "published" && "bg-emerald-500",
            state === "failed" && "bg-destructive",
            state === "publishing" && "animate-pulse bg-amber-500",
            state === "idle" && "bg-ink/25",
          )}
          aria-hidden
        />
      )}
    </>
  );
  if (connect) {
    return (
      <button
        type="button"
        onClick={connect.onClick}
        disabled={connect.pending}
        className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-muted/70 disabled:opacity-50"
      >
        {content}
      </button>
    );
  }
  return <div className="flex min-h-12 items-center gap-3 rounded-lg px-2">{content}</div>;
}

function Fact({ label, value, tabular = false }: { label: string; value: string; tabular?: boolean }) {
  if (!value) {
    return null;
  }
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-ink/50">{label}</dt>
      <dd className={cn("min-w-0 text-right", tabular && "tabular-nums")}>{value}</dd>
    </div>
  );
}

function moldSubject(
  mold: Post["mold"],
  t: ReturnType<typeof useTranslations<"creation">>,
): { label: string; value: string } | null {
  const name = mold?.subject?.name?.trim() ?? "";
  if (!name) {
    return null;
  }
  const category = mold?.subject?.category ?? "";
  const label =
    category === "character"
      ? t("viewSubjectPerson")
      : category === "service"
        ? t("viewSubjectService")
        : category === "product"
          ? t("viewSubjectProduct")
          : t("viewSubject");
  const price = mold?.price?.trim() ?? "";
  return { label, value: price ? `${name} · ${price}` : name };
}

function moldChoice(
  t: ReturnType<typeof useTranslations<"wizard">>,
  value: string | undefined,
  keys: Record<string, string>,
) {
  const key = value ? keys[value] : "";
  if (!key || !t.has(key)) {
    return "";
  }
  return t(key);
}

function moldWhenLabel(
  post: Post,
  t: ReturnType<typeof useTranslations<"creation">>,
  format: ReturnType<typeof useFormatter>,
  timeZone: string,
) {
  const mode = post.mold?.when || (post.origin === "automation" ? "weekly" : post.publish_at ? "once" : "now");
  if (mode === "weekly") {
    const weekday = post.mold?.weekday;
    if (weekday && t.has(`weekdays.${weekday}`)) {
      const time = `${String(post.mold?.hour ?? 0).padStart(2, "0")}:${String(post.mold?.minute ?? 0).padStart(2, "0")}`;
      return t("viewWhenWeeklyAt", { day: t(`weekdays.${weekday}`), time });
    }
    return t("viewWhenWeekly");
  }
  if (mode === "once" && post.publish_at) {
    const when = format.dateTime(new Date(post.publish_at), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    });
    return t("viewWhenOnce", { when });
  }
  return t("viewWhenNow");
}

function latestGeneratedStill(post?: Post): PostAsset | undefined {
  return [...(post?.assets ?? [])]
    .filter((asset) => asset.origin !== "uploaded" && asset.kind !== "video" && !asset.mime?.startsWith("video/"))
    .sort((a, b) => a.sort_order - b.sort_order)
    .at(-1);
}

function isStoryPost(post?: Post): boolean {
  if (!post) {
    return false;
  }
  return queueIsStory(post);
}

function videoPhoneAspect(asset: { width: number; height: number }): "reel" | "wide" | "square" {
  if (asset.width > 0 && asset.height > 0) {
    const ratio = asset.width / asset.height;
    if (ratio > 1.2) {
      return "wide";
    }
    if (ratio < 0.9) {
      return "reel";
    }
    return "square";
  }
  return "reel";
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
    "tiktok_failed",
    "tiktok_denied",
    "invalid_state",
    "network_unavailable",
    "approval_required",
    "approval_rejected",
    "approval_stale",
    "rate_limited",
    "video_model_image_unsupported",
    "video_aspect_unsupported",
  ] as const;
  if (known.includes(code as (typeof known)[number])) {
    return code;
  }
  return "internal_error";
}
