import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** One measure for every step so the stepper, copy, and actions stay aligned. */
export function WizardFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("wizard-step-in mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col gap-4 pb-6 md:gap-5 md:pb-8", className)}>
      {children}
    </section>
  );
}

export function WizardStepHeader({ title, lead }: { title: string; lead?: string }) {
  return (
    <header className="space-y-1.5">
      <h2 className="font-display text-[1.35rem] leading-tight font-semibold tracking-tight text-balance md:text-[1.65rem]">
        {title}
      </h2>
      {lead ? <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{lead}</p> : null}
    </header>
  );
}

export function WizardActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-1 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/85 md:static md:mx-0 md:bg-transparent md:px-0 md:pt-4 md:pb-0 md:backdrop-blur-none">
      <div className="flex items-center gap-2 pb-[env(safe-area-inset-bottom)] md:pb-0">{children}</div>
    </div>
  );
}

/** Shared focus and motion for selectable wizard surfaces. */
export const wizardFocusClass =
  "outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-pine/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none";

export function wizardSurfaceState(selected: boolean) {
  return selected
    ? "border-pine/45 bg-wizard-selected"
    : "border-border bg-card hover:border-pine/30 hover:bg-wizard-hover";
}

export const wizardPrimaryClass = "min-h-11 min-w-0 flex-1 shadow-none sm:ml-auto sm:flex-none sm:min-w-40";

export const wizardSecondaryClass = "min-h-11 min-w-24 shrink-0 border-border bg-card shadow-none hover:bg-wizard-hover hover:text-ink";

export const wizardPanelClass = "rounded-lg border border-border bg-card";

export const wizardEmptyClass =
  "rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center text-sm leading-relaxed text-ink/65";

export const wizardHintClass = "text-sm leading-relaxed text-muted-foreground";

/** 16px type on touch devices so iOS does not zoom the field into view. */
export const wizardFieldClass =
  "flex h-11 w-full rounded-md border border-border bg-background px-3 text-base text-ink outline-none transition-colors duration-200 placeholder:text-muted-foreground focus-visible:border-pine/70 focus-visible:ring-2 focus-visible:ring-pine/25 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";

export const wizardControlClass =
  "h-11 rounded-md border-border bg-background text-base shadow-none focus:ring-2 focus:ring-pine/25";

export const wizardChoiceClass = cn(
  "min-h-11 rounded-md border px-2 py-2 text-center text-[13px] leading-tight font-medium transition-colors duration-200",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "motion-reduce:transition-none",
);

export function wizardChoiceState(selected: boolean) {
  return selected
    ? "border-pine bg-pine text-white"
    : "border-border bg-card text-ink hover:border-pine/35 hover:bg-pine/[0.04]";
}
