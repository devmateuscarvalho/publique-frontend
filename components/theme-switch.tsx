"use client";

import { Check, Monitor, Moon, Smartphone, Sun, Tablet } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { themeStorageKey } from "@/lib/theme";

export type ThemeChoice = "system" | "light" | "dark";

const choices: ThemeChoice[] = ["system", "light", "dark"];

function DeviceIcon() {
  return (
    <span data-slot="icon" className="relative inline-flex size-4">
      <Smartphone className="size-4 [@media(pointer:fine)]:hidden [@media(pointer:coarse)_and_(min-width:768px)_and_(min-height:501px)]:hidden" />
      <Tablet className="absolute hidden size-4 [@media(pointer:coarse)_and_(min-width:768px)_and_(min-height:501px)]:inline" />
      <Monitor className="absolute hidden size-4 [@media(pointer:fine)]:inline" />
    </span>
  );
}

function ThemeIcon({ choice }: { choice: ThemeChoice }) {
  if (choice === "light") {
    return <Sun />;
  }
  if (choice === "dark") {
    return <Moon />;
  }
  return <DeviceIcon />;
}

function applyTheme(choice: ThemeChoice) {
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

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMedia = () => {
    if ((localStorage.getItem(themeStorageKey) || "system") === "system") {
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

function snapshot(): ThemeChoice {
  const stored = localStorage.getItem(themeStorageKey);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export function ThemeSwitch({ menu = false }: { menu?: boolean }) {
  const t = useTranslations("theme");
  const choice = useSyncExternalStore(subscribe, snapshot, () => "system" as ThemeChoice);

  const menuItems = (
    <DropdownMenuContent side={menu ? "top" : "bottom"} align="start">
      <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
      {choices.map((item) => (
        <DropdownMenuItem
          key={item}
          onSelect={() => {
            localStorage.setItem(themeStorageKey, item);
            applyTheme(item);
          }}
        >
          <ThemeIcon choice={item} />
          <span className="flex-1">{t(item)}</span>
          <Check className={choice === item ? "opacity-100" : "opacity-0"} />
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  );

  if (menu) {
    return (
      <DropdownMenu>
        <SidebarMenuButton asChild tooltip={t(choice)}>
          <DropdownMenuTrigger aria-label={t("label")}>
            <ThemeIcon choice={choice} />
            <span>{t(choice)}</span>
          </DropdownMenuTrigger>
        </SidebarMenuButton>
        {menuItems}
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={t("label")}>
          <ThemeIcon choice={choice} />
        </Button>
      </DropdownMenuTrigger>
      {menuItems}
    </DropdownMenu>
  );
}
