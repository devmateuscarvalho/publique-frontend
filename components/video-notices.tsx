"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { api, type User } from "@/lib/api";

type Notice = {
  id: string;
  kind: "video_ready" | "video_still_ready" | "video_failed" | string;
  href: string;
  label: string;
};

export function VideoNotices() {
  const t = useTranslations("notices");
  const messages = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const shown = useRef(new Set<string>());

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: User }>("/v1/auth/me"),
    retry: false,
  });
  const notices = useQuery({
    queryKey: ["notices"],
    queryFn: () => api<{ notices: Notice[] }>("/v1/notices"),
    enabled: me.isSuccess,
    refetchInterval: 8000,
    retry: false,
  });

  useEffect(() => {
    const rows = notices.data?.notices ?? [];
    for (const notice of rows) {
      if (shown.current.has(notice.id)) {
        continue;
      }
      shown.current.add(notice.id);
      const name = noticeLabel(messages, notice.label);
      const title =
        notice.kind === "video_still_ready"
          ? name
            ? t("stillReadyNamed", { name })
            : t("stillReady")
          : notice.kind === "video_failed"
            ? name
              ? t("failedNamed", { name })
              : t("failed")
            : name
              ? t("readyNamed", { name })
              : t("ready");
      const markRead = () => {
        void api(`/v1/notices/${notice.id}/read`, { method: "POST" })
          .then(() => queryClient.invalidateQueries({ queryKey: ["notices"] }))
          .catch(() => {
            shown.current.delete(notice.id);
          });
      };
      toast(title, {
        id: notice.id,
        duration: Infinity,
        action: notice.href
          ? {
              label: t("open"),
              onClick: () => {
                markRead();
                router.push(notice.href);
              },
            }
          : undefined,
        onDismiss: markRead,
      });
    }
  }, [messages, notices.data, queryClient, router, t]);

  return null;
}

function noticeLabel(messages: { has: (key: string) => boolean; (key: string): string }, raw: string) {
  const text = raw.trim();
  if (!text) {
    return "";
  }
  return messages.has(text) ? messages(text) : text;
}
