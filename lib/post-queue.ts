// Queue lanes for /posts. Priority is the next thing a person can act on.
// Published wins. In-flight generation wins over a schedule. Approval, failure,
// a still waiting to be animated, and copy flags come before a calm draft.

export type QueueLane = "attention" | "progress" | "scheduled" | "drafts" | "published";

export type QueueSignal =
  | "failed"
  | "creating"
  | "publishing"
  | "overdue"
  | "rejected"
  | "photoReady"
  | "review"
  | "needsApproval"
  | "scheduled"
  | "due"
  | "published"
  | "draft";

export type QueueAsset = {
  kind?: string;
  mime?: string;
  url?: string;
  origin?: string;
  sort_order?: number;
};

export type QueuePost = {
  id: string;
  status: string;
  caption?: string;
  short_title?: string;
  content_pillar?: string;
  format?: string;
  aspect?: string;
  image_prompt?: string;
  approval_status?: string;
  quality_flags?: string[];
  overdue?: boolean;
  publish_at?: string | null;
  created_at?: string;
  updated_at?: string;
  assets?: QueueAsset[];
};

export type QueueGroup<T extends QueuePost = QueuePost> = {
  dayKey: string;
  at: string;
  posts: T[];
};

export type QueueSection<T extends QueuePost = QueuePost> = {
  lane: QueueLane;
  groups: QueueGroup<T>[];
};

const LANES: QueueLane[] = ["attention", "progress", "scheduled", "drafts", "published"];

export function timeMs(iso?: string | null): number | null {
  if (!iso) {
    return null;
  }
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** A finished AI draft can be regenerated only after the quality gate failed. */
export function canOfferDraftRegenerate(input: {
  status: string;
  isAIGenerated: boolean;
  alreadyPosted: boolean;
  publishing: boolean;
  qualityFlags?: string[];
}): boolean {
  return (
    input.status === "draft" &&
    input.isAIGenerated &&
    !input.alreadyPosted &&
    !input.publishing &&
    (input.qualityFlags?.length ?? 0) > 0
  );
}

export function hasFutureSchedule(post: QueuePost, now = Date.now()): boolean {
  const at = timeMs(post.publish_at);
  return at != null && at > now;
}

export function isPastSchedule(post: QueuePost, now = Date.now()): boolean {
  const at = timeMs(post.publish_at);
  return at != null && at <= now;
}

export function queueLane(post: QueuePost, now = Date.now()): QueueLane {
  if (post.status === "published") {
    return "published";
  }
  if (post.status === "queued" || post.status === "generating" || post.status === "publishing") {
    return "progress";
  }
  if (post.status === "failed" || post.approval_status === "pending" || post.approval_status === "rejected") {
    return "attention";
  }
  if (post.status === "image_ready" || (post.quality_flags?.length ?? 0) > 0 || post.overdue) {
    return "attention";
  }
  if (hasFutureSchedule(post, now)) {
    return "scheduled";
  }
  if (isPastSchedule(post, now)) {
    return "attention";
  }
  return "drafts";
}

export function queueSignal(post: QueuePost, now = Date.now()): QueueSignal {
  if (post.status === "published") {
    return "published";
  }
  if (post.status === "failed") {
    return "failed";
  }
  if (post.status === "queued" || post.status === "generating") {
    return "creating";
  }
  if (post.status === "publishing") {
    return "publishing";
  }
  if (post.overdue || (post.approval_status === "pending" && isPastSchedule(post, now))) {
    return "overdue";
  }
  if (post.approval_status === "rejected") {
    return "rejected";
  }
  if (post.status === "image_ready") {
    return "photoReady";
  }
  if ((post.quality_flags?.length ?? 0) > 0) {
    return "review";
  }
  if (post.approval_status === "pending") {
    return "needsApproval";
  }
  if (hasFutureSchedule(post, now)) {
    return "scheduled";
  }
  if (isPastSchedule(post, now)) {
    return "due";
  }
  return "draft";
}

export function laneCounts(posts: QueuePost[], now = Date.now()): Record<QueueLane | "all", number> {
  const counts: Record<QueueLane | "all", number> = {
    all: posts.length,
    attention: 0,
    progress: 0,
    scheduled: 0,
    drafts: 0,
    published: 0,
  };
  for (const post of posts) {
    counts[queueLane(post, now)] += 1;
  }
  return counts;
}

function attentionRank(post: QueuePost, now: number): number {
  if (post.status === "failed") {
    return 0;
  }
  if (post.overdue || (post.approval_status === "pending" && isPastSchedule(post, now))) {
    return 1;
  }
  if (post.status === "image_ready") {
    return 2;
  }
  if ((post.quality_flags?.length ?? 0) > 0) {
    return 3;
  }
  if (post.approval_status === "pending") {
    return 4;
  }
  if (isPastSchedule(post, now)) {
    return 5;
  }
  if (post.approval_status === "rejected") {
    return 6;
  }
  return 7;
}

function createdMs(post: QueuePost): number {
  return timeMs(post.created_at) ?? 0;
}

function publishedMs(post: QueuePost): number {
  return timeMs(post.publish_at) ?? timeMs(post.updated_at) ?? createdMs(post);
}

function byId(a: QueuePost, b: QueuePost): number {
  return a.id.localeCompare(b.id);
}

export function sortLane<T extends QueuePost>(posts: T[], lane: QueueLane, now = Date.now()): T[] {
  const rows = [...posts];
  rows.sort((a, b) => {
    if (lane === "attention") {
      const rank = attentionRank(a, now) - attentionRank(b, now);
      if (rank !== 0) {
        return rank;
      }
      const ap = timeMs(a.publish_at);
      const bp = timeMs(b.publish_at);
      if (ap != null && bp != null && ap !== bp) {
        return ap - bp;
      }
      if (ap != null && bp == null) {
        return -1;
      }
      if (ap == null && bp != null) {
        return 1;
      }
    }
    if (lane === "scheduled") {
      const ap = timeMs(a.publish_at) ?? Number.MAX_SAFE_INTEGER;
      const bp = timeMs(b.publish_at) ?? Number.MAX_SAFE_INTEGER;
      if (ap !== bp) {
        return ap - bp;
      }
    }
    if (lane === "published") {
      const delta = publishedMs(b) - publishedMs(a);
      if (delta !== 0) {
        return delta;
      }
    }
    if (lane === "progress") {
      const delta = createdMs(a) - createdMs(b);
      if (delta !== 0) {
        return delta;
      }
    }
    if (lane === "drafts" || lane === "attention") {
      const delta = createdMs(b) - createdMs(a);
      if (delta !== 0) {
        return delta;
      }
    }
    return byId(a, b);
  });
  return rows;
}

export function localDayKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function groupStamp(post: QueuePost, lane: QueueLane): string {
  if (lane === "scheduled") {
    return post.publish_at || "";
  }
  if (lane === "published") {
    return post.publish_at || post.updated_at || post.created_at || "";
  }
  return "";
}

function groupLane<T extends QueuePost>(rows: T[], lane: QueueLane, now: number): QueueGroup<T>[] {
  const sorted = sortLane(rows, lane, now);
  if (lane !== "scheduled" && lane !== "published") {
    return [{ dayKey: "", at: "", posts: sorted }];
  }
  const buckets = new Map<string, T[]>();
  const order: string[] = [];
  for (const post of sorted) {
    const at = groupStamp(post, lane);
    const key = at ? localDayKey(at) : "";
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)?.push(post);
  }
  return order.map((key) => {
    const postsInDay = buckets.get(key) ?? [];
    return { dayKey: key, at: postsInDay[0] ? groupStamp(postsInDay[0], lane) : "", posts: postsInDay };
  });
}

export function queueSections<T extends QueuePost>(posts: T[], lane: QueueLane | "all", now = Date.now()): QueueSection<T>[] {
  const lanes = lane === "all" ? LANES : [lane];
  const sections: QueueSection<T>[] = [];
  for (const item of lanes) {
    const rows = posts.filter((post) => queueLane(post, now) === item);
    if (rows.length === 0) {
      continue;
    }
    sections.push({ lane: item, groups: groupLane(rows, item, now) });
  }
  return sections;
}

export function foldText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function postMatchesQuery(post: QueuePost, query: string, extra = ""): boolean {
  const needle = foldText(query).trim();
  if (!needle) {
    return true;
  }
  const hay = foldText([post.caption, post.short_title, post.content_pillar, extra].filter(Boolean).join("\n"));
  return needle.split(/\s+/).every((token) => hay.includes(token));
}

export function queueWhen(post: QueuePost, now = Date.now()): { iso: string; kind: "scheduled" | "created" | "published" } | null {
  if (post.status === "published") {
    const iso = post.publish_at || post.updated_at || post.created_at || "";
    if (!iso) {
      return null;
    }
    return { iso, kind: post.publish_at ? "published" : "created" };
  }
  if (post.publish_at && (hasFutureSchedule(post, now) || isPastSchedule(post, now))) {
    return { iso: post.publish_at, kind: "scheduled" };
  }
  if (!post.created_at) {
    return null;
  }
  return { iso: post.created_at, kind: "created" };
}

export function queueIsStory(post: { format?: string; aspect?: string; image_prompt?: string }): boolean {
  if (!post.format && !post.aspect && !post.image_prompt) {
    return false;
  }
  if (post.format === "story" || post.aspect === "9:16") {
    return true;
  }
  return /9:16\s+Stories\/Reels/i.test(post.image_prompt ?? "");
}

export function queueIsVideo(asset?: QueueAsset): boolean {
  return Boolean(asset && (asset.kind === "video" || asset.mime?.startsWith("video/")));
}

export function queuePreview(post: { assets?: QueueAsset[] }): QueueAsset | undefined {
  const assets = post.assets ?? [];
  const video = assets.find((asset) => queueIsVideo(asset));
  if (video) {
    return video;
  }
  const generated = assets.filter((asset) => asset.origin !== "uploaded");
  if (assets.some((asset) => asset.origin === "uploaded") && generated.length > 0) {
    return generated[generated.length - 1];
  }
  return assets[0];
}

export function queueSlideCount(post: { assets?: QueueAsset[] }): number {
  return (post.assets ?? []).filter((asset) => asset.origin !== "uploaded" && !queueIsVideo(asset)).length;
}

const NETWORKS = ["instagram", "facebook", "linkedin", "tiktok"] as const;

export type QueueNetwork = (typeof NETWORKS)[number];

export function queueNetworks(ids?: string[]): QueueNetwork[] {
  const seen = new Set<string>();
  const out: QueueNetwork[] = [];
  for (const id of ids ?? []) {
    if (seen.has(id) || !(NETWORKS as readonly string[]).includes(id)) {
      continue;
    }
    seen.add(id);
    out.push(id as QueueNetwork);
  }
  return out;
}
