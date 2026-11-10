"use client";

import { ArrowDown, Pause, Play } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { useAccount } from "@/components/use-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, apiBase, type AppLogLine } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE = 400;
const MAX_LINES = 2000;
const RETENTION_MS = 48 * 60 * 60 * 1000;

type Status = "connecting" | "live" | "paused" | "error";

function withinRetention(lines: AppLogLine[]) {
  const cutoff = Date.now() - RETENTION_MS;
  return lines.filter((line) => {
    if (!line.time) return true;
    const at = new Date(line.time).getTime();
    return Number.isNaN(at) || at >= cutoff;
  });
}

function cap(lines: AppLogLine[], side: "start" | "end") {
  const kept = withinRetention(lines);
  if (kept.length <= MAX_LINES) return kept;
  return side === "end" ? kept.slice(kept.length - MAX_LINES) : kept.slice(0, MAX_LINES);
}

function attrText(attrs?: Record<string, unknown>) {
  if (!attrs) return "";
  return Object.entries(attrs)
    .map(([key, value]) => `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join(" ");
}

function levelClass(level: string) {
  switch (level) {
    case "ERROR":
      return "text-red-400";
    case "WARN":
      return "text-amber-300";
    case "INFO":
      return "text-sky-300";
    default:
      return "text-zinc-300";
  }
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

async function readEvents(response: Response, signal: AbortSignal, onEvent: (event: string, data: string) => void) {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buf = "";
  while (!signal.aborted) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += decoder.decode(value, { stream: true });
    let split = buf.indexOf("\n\n");
    while (split >= 0) {
      const frame = buf.slice(0, split);
      buf = buf.slice(split + 2);
      let event = "message";
      const data: string[] = [];
      for (const raw of frame.split("\n")) {
        const line = raw.replace(/\r$/, "");
        if (line.startsWith(":")) continue;
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).trim());
      }
      if (data.length) onEvent(event, data.join("\n"));
      split = buf.indexOf("\n\n");
    }
  }
}

export function BackofficeLogsScreen() {
  const t = useTranslations("appLogs");
  const backoffice = useTranslations("backoffice");
  const locale = useLocale();
  const { me, loading } = useAccount();
  const isSuperAdmin = me.data?.user.platform_role === "super_admin";

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [level, setLevel] = useState("");
  const [lines, setLines] = useState<AppLogLine[]>([]);
  const [status, setStatus] = useState<Status>("connecting");
  const [paused, setPaused] = useState(false);
  const [pending, setPending] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [gap, setGap] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [stuck, setStuck] = useState(true);

  const pausedRef = useRef(false);
  const bufferRef = useRef<AppLogLine[]>([]);
  const stickRef = useRef(true);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<number | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const gen = ++generation.current;
    const ctrl = new AbortController();
    const seen = new Set<string>();
    let after = "";
    let stopped = false;
    setLines([]);
    setExhausted(false);
    setGap(false);
    bufferRef.current = [];
    setPending(0);

    const push = (line: AppLogLine) => {
      if (generation.current !== gen || !line.id || seen.has(line.id)) return;
      seen.add(line.id);
      after = line.id;
      if (pausedRef.current) {
        bufferRef.current = cap([...bufferRef.current, line], "end");
        setPending(bufferRef.current.length);
        return;
      }
      setLines((current) => cap([...current, line], "end"));
    };

    const run = async () => {
      while (!stopped) {
        if (generation.current !== gen) return;
        setStatus(pausedRef.current ? "paused" : "connecting");
        const cursorAtConnect = after;
        const params = new URLSearchParams();
        params.set("limit", String(PAGE));
        if (debounced) params.set("q", debounced);
        if (level) params.set("level", level);
        if (after) params.set("after", after);
        try {
          const response = await fetch(`${apiBase()}/v1/backoffice/logs/stream?${params}`, {
            credentials: "include",
            signal: ctrl.signal,
            headers: { Accept: "text/event-stream" },
          });
          if (response.status === 401 || response.status === 403) {
            setStatus("error");
            return;
          }
          if (!response.ok || !response.body) {
            setStatus("error");
            await wait(1500, ctrl.signal);
            continue;
          }
          setStatus(pausedRef.current ? "paused" : "live");
          await readEvents(response, ctrl.signal, (event, data) => {
            try {
              if (event === "ready") {
                const ready = JSON.parse(data) as { count?: number; truncated?: boolean };
                if (!cursorAtConnect && (ready.count ?? 0) < PAGE) setExhausted(true);
                if (ready.truncated) setGap(true);
                return;
              }
              push(JSON.parse(data) as AppLogLine);
            } catch {
              // Ignore a malformed frame and keep the tail open.
            }
          });
        } catch {
          if (ctrl.signal.aborted || stopped) return;
          setStatus("error");
          await wait(1500, ctrl.signal);
        }
        if (ctrl.signal.aborted || stopped) return;
      }
    };

    void run();
    return () => {
      stopped = true;
      ctrl.abort();
    };
  }, [debounced, isSuperAdmin, level]);

  useLayoutEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    if (restoreRef.current != null) {
      node.scrollTop += node.scrollHeight - restoreRef.current;
      restoreRef.current = null;
      return;
    }
    if (stickRef.current) node.scrollTop = node.scrollHeight;
  }, [lines]);

  if (loading || me.isLoading) return null;

  if (!isSuperAdmin) {
    return (
      <AppShell title={backoffice("title")}>
        <p className="text-sm text-ink/70">{backoffice("forbidden")}</p>
      </AppShell>
    );
  }

  const resume = () => {
    pausedRef.current = false;
    setPaused(false);
    setLines((current) => cap([...current, ...bufferRef.current], "end"));
    bufferRef.current = [];
    setPending(0);
    setStatus("live");
    stickRef.current = true;
    setStuck(true);
  };

  const pause = () => {
    pausedRef.current = true;
    setPaused(true);
    setStatus("paused");
  };

  const loadOlder = async () => {
    const oldest = lines[0]?.id;
    if (!oldest || loadingOlder || exhausted) return;
    const gen = generation.current;
    setLoadingOlder(true);
    try {
      const params = new URLSearchParams();
      params.set("before", oldest);
      params.set("limit", String(PAGE));
      if (debounced) params.set("q", debounced);
      if (level) params.set("level", level);
      const page = await api<{ lines: AppLogLine[] }>(`/v1/backoffice/logs?${params}`);
      if (generation.current !== gen) return;
      if (page.lines.length < PAGE) setExhausted(true);
      const node = scrollerRef.current;
      restoreRef.current = node?.scrollHeight ?? null;
      stickRef.current = false;
      setStuck(false);
      setLines((current) => {
        const ids = new Set(current.map((line) => line.id));
        const older = page.lines.filter((line) => line.id && !ids.has(line.id));
        return cap([...older, ...current], "start");
      });
    } catch {
      if (generation.current === gen) setStatus("error");
    } finally {
      if (generation.current === gen) setLoadingOlder(false);
    }
  };

  const jump = () => {
    stickRef.current = true;
    setStuck(true);
    const node = scrollerRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  };

  const timeOf = (iso?: string) => {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat(locale, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  return (
    <AppShell title={t("title")} fluid>
      <div className="flex h-[calc(100dvh-8rem)] min-h-[24rem] flex-col gap-3">
        <p className="shrink-0 text-sm text-ink/70">{t("lead")}</p>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            maxLength={200}
            className="sm:flex-1"
          />
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            aria-label={t("level")}
            className="h-11 rounded-md border border-input bg-muted px-3 text-base text-foreground"
          >
            <option value="">{t("levels.all")}</option>
            <option value="warn">{t("levels.warn")}</option>
            <option value="error">{t("levels.error")}</option>
          </select>
          <Button type="button" variant="outline" className="shrink-0" onClick={paused ? resume : pause} aria-pressed={paused}>
            {paused ? <Play /> : <Pause />}
            {paused ? t(pending > 0 ? "resumeWith" : "resume", { count: pending }) : t("pause")}
          </Button>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 text-sm" aria-live="polite">
          <span
            className={cn(
              "size-2.5 rounded-full",
              status === "live" && "bg-emerald-500",
              status === "paused" && "bg-amber-400",
              status === "connecting" && "bg-sky-400",
              status === "error" && "bg-red-500",
            )}
          />
          <span>{t(status)}</span>
          {gap ? <span className="text-ink/70">{t("gap")}</span> : null}
        </div>
        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollerRef}
            onScroll={() => {
              const node = scrollerRef.current;
              if (!node) return;
              const atEnd = node.scrollHeight - node.scrollTop - node.clientHeight < 48;
              stickRef.current = atEnd;
              setStuck(atEnd);
            }}
            className="h-full overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950"
            aria-label={t("title")}
          >
            <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950 p-2">
              <Button
                type="button"
                variant="outline"
                className="w-full bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                onClick={() => void loadOlder()}
                disabled={exhausted || loadingOlder || lines.length === 0}
              >
                {exhausted ? t("noneOlder") : loadingOlder ? t("loadingOlder") : t("loadOlder")}
              </Button>
            </div>
            {lines.length === 0 ? (
              <p className="px-3 py-6 text-sm text-zinc-400">{status === "error" ? t("error") : t("empty")}</p>
            ) : (
              <ul>
                {lines.map((line) => {
                  const extra = attrText(line.attrs);
                  const open = expanded === line.id;
                  return (
                    <li key={line.id} className="border-b border-white/5">
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-start gap-2 px-3 py-2 text-left font-mono text-xs hover:bg-white/5"
                        onClick={() => setExpanded(open ? null : line.id)}
                        aria-expanded={open}
                      >
                        <time className="shrink-0 tabular-nums text-zinc-400">{timeOf(line.time)}</time>
                        <span className={cn("w-12 shrink-0", levelClass(line.level))}>{line.level}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-zinc-100">{line.message}</span>
                          {extra ? <span className="mt-0.5 block truncate text-zinc-500">{extra}</span> : null}
                        </span>
                      </button>
                      {open && line.attrs ? (
                        <pre className="overflow-x-auto px-3 pb-3 font-mono text-xs text-zinc-400">
                          {JSON.stringify(line.attrs, null, 2)}
                        </pre>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {!stuck && lines.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="absolute right-3 bottom-3 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
              onClick={jump}
            >
              <ArrowDown />
              {t("jump")}
            </Button>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
