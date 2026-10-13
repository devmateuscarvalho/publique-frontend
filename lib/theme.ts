export const themeStorageKey = "theme";

/** Stored value. Missing or `"system"` means “follow the device” until the user toggles. */
export type ThemeChoice = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const themeBootScript = `(function(){try{var t=localStorage.getItem("${themeStorageKey}")||"system";var dark=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var root=document.documentElement;root.classList.toggle("dark",dark);root.classList.toggle("light",!dark);root.dataset.theme=t;root.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;

export function readStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") {
    return "system";
  }
  const stored = localStorage.getItem(themeStorageKey);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

/** Effective light/dark for the UI. Device is used only when nothing was chosen yet. */
export function resolveTheme(choice: ThemeChoice = readStoredTheme()): ResolvedTheme {
  if (choice === "dark") {
    return "dark";
  }
  if (choice === "light") {
    return "light";
  }
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(choice: ThemeChoice) {
  const dark =
    choice === "dark" ||
    (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
  root.dataset.theme = choice;
  root.style.colorScheme = dark ? "dark" : "light";
  window.dispatchEvent(new Event("theme-change"));
}

/** Persist an explicit light/dark choice from the one-click toggler. */
export function setResolvedTheme(next: ResolvedTheme) {
  localStorage.setItem(themeStorageKey, next);
  applyTheme(next);
}

export function subscribeTheme(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMedia = () => {
    if (readStoredTheme() === "system") {
      applyTheme("system");
    }
    onStoreChange();
  };
  window.addEventListener("theme-change", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  media.addEventListener("change", onMedia);
  return () => {
    window.removeEventListener("theme-change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
    media.removeEventListener("change", onMedia);
  };
}
