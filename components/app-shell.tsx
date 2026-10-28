"use client";

import { useMutation } from "@tanstack/react-query";
import {
  Briefcase,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  LayoutTemplate,
  LogOut,
  PenLine,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Stamp,
  Users,
  WandSparkles,
  type LucideIcon,
  Bubbles,
  Cake,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { Preferences } from "@/components/preferences";
import { useAccount } from "@/components/use-account";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { api } from "@/lib/api";

function isCreationItemActive(pathname: string, href: string) {
  if (href === "/posts") {
    return pathname === "/posts" || (pathname.startsWith("/posts/") && !pathname.startsWith("/posts/automate"));
  }
  if (href === "/brands") {
    return pathname === "/brands" || pathname.startsWith("/brands/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isCreationPath(pathname: string) {
  return (
    pathname.startsWith("/create") ||
    pathname.startsWith("/posts") ||
    pathname.startsWith("/brands") ||
    pathname.startsWith("/calendar")
  );
}

export function PageCreateAction({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild size="icon" variant="outline">
      <Link href={href} aria-label={label}>
        <Plus />
      </Link>
    </Button>
  );
}

export function AppShell({
  title,
  action,
  fluid,
  children,
}: {
  title: string;
  action?: ReactNode;
  /** Remove the default max-width so children can use the full inset. */
  fluid?: boolean;
  children: ReactNode;
}) {
  const account = useAccount();

  if (account.loading) {
    return <main className="min-h-dvh bg-background" />;
  }

  return (
    <SidebarProvider>
      <ShellFrame title={title} action={action} role={account.organization?.role} fluid={fluid}>
        {children}
      </ShellFrame>
    </SidebarProvider>
  );
}

function ShellFrame({
  title,
  action,
  role,
  fluid,
  children,
}: {
  title: string;
  action?: ReactNode;
  role?: string;
  fluid?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("nav");
  const appName = useTranslations()("appName");
  const dashboard = useTranslations("dashboard");
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, setOpen, setOpenMobile, state } = useSidebar();
  const [creationOpen, setCreationOpen] = useState(() => isCreationPath(pathname));
  const [settingsOpen, setSettingsOpen] = useState(() => pathname.startsWith("/settings"));
  const [backofficeOpen, setBackofficeOpen] = useState(() => pathname.startsWith("/backoffice"));
  const { me } = useAccount();
  const isSuperAdmin = me.data?.user.platform_role === "super_admin";

  const logout = useMutation({
    mutationFn: () => api("/v1/auth/logout", { method: "POST" }),
    onSuccess: () => router.push("/login"),
  });

  const creationItems: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/brands", label: t("brands"), icon: Layers },
    { href: "/posts", label: t("manualPost"), icon: PenLine },
    { href: "/calendar", label: t("calendar"), icon: CalendarDays },
  ];
  const showCreateFab = !pathname.startsWith("/create") && !pathname.startsWith("/backoffice");
  const settingsItems: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/settings/users", label: t("users"), icon: Users },
    { href: "/settings/organization", label: t("organization"), icon: Briefcase },
  ];
  const backofficeItems: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/backoffice/presets", label: t("promptPresets"), icon: Cake },
    { href: "/backoffice/costs", label: t("aiCosts"), icon: CircleDollarSign },
  ];

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="flex-row items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Link
            href="/create"
            onClick={() => setOpenMobile(false)}
            aria-label={appName}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 truncate px-2 text-sidebar-foreground group-data-[collapsible=icon]:hidden"
          >
            <img src="/symbol.svg" alt="" width={28} height={21} className="h-6 w-auto shrink-0" />
            <span className="font-display truncate text-base font-bold tracking-wide uppercase">
              {appName}
            </span>
          </Link>
          <SidebarTrigger className="shrink-0" aria-label={t("menu")} />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    type="button"
                    isActive={isCreationPath(pathname)}
                    tooltip={t("creation")}
                    aria-expanded={creationOpen}
                    onClick={() => {
                      if (!isMobile && state === "collapsed") {
                        setOpen(true);
                        setCreationOpen(true);
                        return;
                      }
                      setCreationOpen((current) => !current);
                    }}
                  >
                    <Sparkles />
                    <span className="group-data-[collapsible=icon]:hidden">{t("creation")}</span>
                    <ChevronRight
                      className={`ml-auto size-4 transition-transform group-data-[collapsible=icon]:hidden ${creationOpen ? "rotate-90" : ""}`}
                    />
                  </SidebarMenuButton>
                  {creationOpen && (isMobile || state !== "collapsed") ? (
                    <SidebarMenuSub>
                      {creationItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <SidebarMenuSubItem key={item.href}>
                            <SidebarMenuSubButton asChild isActive={isCreationItemActive(pathname, item.href)}>
                              <Link href={item.href} onClick={() => setOpenMobile(false)}>
                                <Icon />
                                <span>{item.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>
                {role === "owner" ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      type="button"
                      isActive={pathname.startsWith("/settings")}
                      tooltip={t("settings")}
                      aria-expanded={settingsOpen}
                      onClick={() => {
                        if (!isMobile && state === "collapsed") {
                          setOpen(true);
                          setSettingsOpen(true);
                          return;
                        }
                        setSettingsOpen((current) => !current);
                      }}
                    >
                      <Settings />
                      <span className="group-data-[collapsible=icon]:hidden">{t("settings")}</span>
                      <ChevronRight
                        className={`ml-auto size-4 transition-transform group-data-[collapsible=icon]:hidden ${settingsOpen ? "rotate-90" : ""}`}
                      />
                    </SidebarMenuButton>
                    {settingsOpen && (isMobile || state !== "collapsed") ? (
                      <SidebarMenuSub>
                        {settingsItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <SidebarMenuSubItem key={item.href}>
                              <SidebarMenuSubButton asChild isActive={pathname.startsWith(item.href)}>
                                <Link href={item.href} onClick={() => setOpenMobile(false)}>
                                  <Icon />
                                  <span>{item.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                ) : null}
                {isSuperAdmin ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      type="button"
                      isActive={pathname.startsWith("/backoffice")}
                      tooltip={t("backoffice")}
                      aria-expanded={backofficeOpen}
                      onClick={() => {
                        if (!isMobile && state === "collapsed") {
                          setOpen(true);
                          setBackofficeOpen(true);
                          return;
                        }
                        setBackofficeOpen((current) => !current);
                      }}
                    >
                      <Shield />
                      <span className="group-data-[collapsible=icon]:hidden">{t("backoffice")}</span>
                      <ChevronRight
                        className={`ml-auto size-4 transition-transform group-data-[collapsible=icon]:hidden ${backofficeOpen ? "rotate-90" : ""}`}
                      />
                    </SidebarMenuButton>
                    {backofficeOpen && (isMobile || state !== "collapsed") ? (
                      <SidebarMenuSub>
                        {backofficeItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <SidebarMenuSubItem key={item.href}>
                              <SidebarMenuSubButton asChild isActive={pathname.startsWith(item.href)}>
                                <Link href={item.href} onClick={() => setOpenMobile(false)}>
                                  <Icon />
                                  <span>{item.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Preferences menu />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={dashboard("logout")} onClick={() => logout.mutate()}>
                <LogOut />
                <span>{dashboard("logout")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div
          className={
            fluid
              ? "flex min-h-svh w-full flex-col px-4 py-4 md:px-6 lg:px-8 md:py-6"
              : "mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 py-4 md:px-8 md:py-6"
          }
        >
          <header className="mb-6 flex min-h-14 items-center gap-3 pb-1">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <SidebarTrigger className="md:hidden" aria-label={t("menu")} />
              <h1 className="font-display min-w-0 flex-1 truncate border-l-2 border-ruby pl-3 text-xl font-bold tracking-tight uppercase">
                {title}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {action}
              {showCreateFab ? (
                <Link
                  href="/create"
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-none border-2 border-blush bg-blush px-4 py-2.5 text-xs font-bold tracking-widest text-[#1f1f1f] uppercase shadow-md transition hover:border-ruby hover:bg-ruby hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-ruby dark:bg-ruby dark:text-white dark:hover:border-blush dark:hover:bg-blush dark:hover:text-[#1f1f1f]"
                  aria-label={t("startCreating")}
                >
                  <WandSparkles className="size-4 shrink-0" aria-hidden />
                  <span className="max-w-[10rem] truncate sm:max-w-none">{t("startCreating")}</span>
                </Link>
              ) : null}
            </div>
          </header>
          {children}
        </div>
      </SidebarInset>
    </>
  );
}
