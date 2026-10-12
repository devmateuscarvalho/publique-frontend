"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { appToast } from "@/lib/app-toast";

const DEFAULT_DELAY_MS = 700;

export type AutoSaveMeta = {
  /** Monotonic edit version captured when this save was scheduled. */
  version: number;
  /** True when no newer local edit happened after this save was queued. */
  isCurrent: boolean;
};

type UseAutoSaveOptions<TPayload, TResult> = {
  /** Snapshot to persist. When null/undefined, nothing is saved. */
  payload: TPayload | null | undefined;
  /** Only schedules a save while true. */
  dirty: boolean;
  /** Hard switch (e.g. create mode without an id). Default true. */
  enabled?: boolean;
  /** Soft pause (e.g. analysis running). Default false. */
  pause?: boolean;
  delayMs?: number;
  /** Stable toast id so rapid saves replace instead of stacking. */
  toastId?: string;
  successMessage: string;
  errorMessage: (error: unknown) => string;
  save: (payload: TPayload) => Promise<TResult>;
  onSuccess?: (result: TResult, meta: AutoSaveMeta) => void;
  onError?: (error: unknown) => void;
};

/**
 * Debounced autosave with edit-version protection.
 * Call `touch()` (or bump via returned helpers) whenever the user edits so
 * stale responses do not overwrite newer local state.
 */
export function useAutoSave<TPayload, TResult = unknown>({
  payload,
  dirty,
  enabled = true,
  pause = false,
  delayMs = DEFAULT_DELAY_MS,
  toastId,
  successMessage,
  errorMessage,
  save,
  onSuccess,
  onError,
}: UseAutoSaveOptions<TPayload, TResult>) {
  const editVersion = useRef(0);

  const mutation = useMutation({
    mutationFn: ({ value }: { value: TPayload; version: number }) => save(value),
    onSuccess: (result, variables) => {
      const isCurrent = variables.version === editVersion.current;
      onSuccess?.(result, { version: variables.version, isCurrent });
      appToast.success(successMessage, toastId);
    },
    onError: (error) => {
      appToast.error(errorMessage(error), toastId);
      onError?.(error);
    },
  });

  useEffect(() => {
    if (!enabled || !dirty || pause || payload == null || mutation.isPending) {
      return;
    }
    const snapshot = payload;
    const version = editVersion.current;
    const timer = window.setTimeout(() => {
      mutation.mutate({ value: snapshot, version });
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [enabled, dirty, pause, payload, delayMs, mutation.isPending, mutation.mutate]);

  /** Call on every user edit before updating local state. */
  function touch() {
    editVersion.current += 1;
  }

  return {
    /** Call on every user edit before updating local state. */
    touch,
    /** Current edit counter (for callers that need explicit version checks). */
    editVersion,
    isSaving: mutation.isPending,
    /** Imperative save (e.g. before publish). Does not clear dirty for you. */
    saveNow: (value: TPayload) => {
      const version = editVersion.current;
      return mutation.mutateAsync({ value, version });
    },
  };
}
