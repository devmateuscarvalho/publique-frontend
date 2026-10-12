"use client";

import { Check, Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";

const locales = [
  { id: "pt-BR", label: "ptBR" },
  { id: "en", label: "en" },
] as const;

function writeLocale(next: (typeof locales)[number]["id"]) {
  document.cookie = `locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function LocaleSwitch({ menu = false }: { menu?: boolean }) {
  const locale = useLocale();
  const t = useTranslations();
  const names = useTranslations("locales");
  const router = useRouter();
  const current = locales.find((item) => item.id === locale) ?? locales[0];

  function choose(next: (typeof locales)[number]["id"]) {
    writeLocale(next);
    router.refresh();
  }

  const menuItems = (
    <DropdownMenuContent side={menu ? "top" : "bottom"} align="start">
      <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
      {locales.map((item) => (
        <DropdownMenuItem key={item.id} onSelect={() => choose(item.id)}>
          <span className="flex-1">{names(item.label)}</span>
          <Check className={locale === item.id ? "opacity-100" : "opacity-0"} />
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  );

  if (menu) {
    return (
      <DropdownMenu>
        <SidebarMenuButton asChild tooltip={names(current.label)}>
          <DropdownMenuTrigger aria-label={t("language")}>
            <Languages />
            <span>{names(current.label)}</span>
          </DropdownMenuTrigger>
        </SidebarMenuButton>
        {menuItems}
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={t("language")}>
          <Languages />
        </Button>
      </DropdownMenuTrigger>
      {menuItems}
    </DropdownMenu>
  );
}
