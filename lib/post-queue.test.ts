import assert from "node:assert/strict";
import test from "node:test";

import {
  canOfferDraftRegenerate,
  laneCounts,
  postMatchesQuery,
  queueLane,
  queueSections,
  queueSignal,
  type QueuePost,
} from "./post-queue";

const now = new Date(2026, 10, 4, 12, 0, 0).getTime();

function post(partial: Partial<QueuePost> & { id: string }): QueuePost {
  return { status: "draft", ...partial };
}

test("lanes follow the next action", () => {
  assert.equal(queueLane(post({ id: "p", status: "published", approval_status: "pending" }), now), "published");
  assert.equal(
    queueSignal(
      post({
        id: "p2",
        status: "published",
        quality_flags: ["low_quality_score"],
        publish_at: new Date(now + 86_400_000).toISOString(),
      }),
      now,
    ),
    "published",
  );
  assert.equal(
    queueLane(post({ id: "g", status: "generating", publish_at: new Date(now + 86_400_000).toISOString() }), now),
    "progress",
  );
  assert.equal(queueLane(post({ id: "f", status: "failed" }), now), "attention");
  assert.equal(
    queueLane(post({ id: "a", approval_status: "pending", publish_at: new Date(now + 3_600_000).toISOString() }), now),
    "attention",
  );
  assert.equal(queueSignal(post({ id: "a", approval_status: "pending", publish_at: new Date(now + 3_600_000).toISOString() }), now), "needsApproval");
  assert.equal(
    queueSignal(post({ id: "o", approval_status: "pending", overdue: true, publish_at: new Date(now - 3_600_000).toISOString() }), now),
    "overdue",
  );
  assert.equal(
    queueLane(post({ id: "s", publish_at: new Date(now + 86_400_000).toISOString() }), now),
    "scheduled",
  );
  assert.equal(queueLane(post({ id: "d", publish_at: new Date(now - 60_000).toISOString() }), now), "attention");
  assert.equal(queueSignal(post({ id: "d", publish_at: new Date(now - 60_000).toISOString() }), now), "due");
  assert.equal(queueSignal(post({ id: "i", status: "image_ready", publish_at: new Date(now + 86_400_000).toISOString() }), now), "photoReady");
  assert.equal(queueSignal(post({ id: "q", approval_status: "pending", quality_flags: ["low_quality_score"] }), now), "review");
  assert.equal(queueLane(post({ id: "r", status: "draft" }), now), "drafts");
  assert.equal(queueSignal(post({ id: "pub", status: "publishing" }), now), "publishing");
});

test("a finished draft regenerates only when the quality gate failed", () => {
  const base = {
    status: "draft",
    isAIGenerated: true,
    alreadyPosted: false,
    publishing: false,
  };
  assert.equal(canOfferDraftRegenerate({ ...base, qualityFlags: ["low_quality_score"] }), true);
  assert.equal(canOfferDraftRegenerate({ ...base, qualityFlags: ["unsupported_figure"] }), true);
  assert.equal(canOfferDraftRegenerate({ ...base, qualityFlags: [] }), false);
  assert.equal(canOfferDraftRegenerate(base), false);
  assert.equal(canOfferDraftRegenerate({ ...base, isAIGenerated: false, qualityFlags: ["low_quality_score"] }), false);
  assert.equal(canOfferDraftRegenerate({ ...base, alreadyPosted: true, qualityFlags: ["low_quality_score"] }), false);
  assert.equal(canOfferDraftRegenerate({ ...base, status: "failed", qualityFlags: ["low_quality_score"] }), false);
});

test("search ignores accents and requires every word", () => {
  const row = post({ id: "1", caption: "Promoção de verão na loja", short_title: "Vitrine" });
  assert.equal(postMatchesQuery(row, "promocao verao"), true);
  assert.equal(postMatchesQuery(row, "promocao inverno"), false);
  assert.equal(postMatchesQuery(row, "  "), true);
  assert.equal(postMatchesQuery(row, "vitrine", "Marca Azul"), true);
});

test("all view orders work ahead of the archive and groups schedule days", () => {
  const posts = [
    post({ id: "pub", status: "published", publish_at: new Date(2026, 10, 3, 9).toISOString() }),
    post({ id: "draft", status: "draft", created_at: new Date(2026, 10, 4, 8).toISOString() }),
    post({ id: "soon", status: "draft", publish_at: new Date(2026, 10, 5, 18).toISOString() }),
    post({ id: "sooner", status: "draft", publish_at: new Date(2026, 10, 4, 18).toISOString() }),
    post({ id: "late", status: "draft", publish_at: new Date(2026, 10, 4, 15).toISOString() }),
    post({ id: "bad", status: "failed", created_at: new Date(2026, 10, 1).toISOString() }),
    post({ id: "gen", status: "generating", created_at: new Date(2026, 10, 4, 11).toISOString() }),
  ];
  const sections = queueSections(posts, "all", now);
  assert.deepEqual(sections.map((section) => section.lane), ["attention", "progress", "scheduled", "drafts", "published"]);
  const scheduled = sections.find((section) => section.lane === "scheduled");
  assert.ok(scheduled);
  assert.equal(scheduled?.groups.length, 2);
  assert.deepEqual(scheduled?.groups[0]?.posts.map((item) => item.id), ["late", "sooner"]);
  assert.deepEqual(scheduled?.groups[1]?.posts.map((item) => item.id), ["soon"]);
  assert.equal(laneCounts(posts, now).attention, 1);
  assert.equal(laneCounts(posts, now).scheduled, 3);
});
