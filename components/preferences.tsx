import { LocaleSwitch } from "@/components/locale-switch";
import { ThemeSwitch } from "@/components/theme-switch";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";

export function Preferences({ menu = false }: { menu?: boolean }) {
  if (menu) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <ThemeSwitch menu />
        </SidebarMenuItem>
        <SidebarMenuItem>
          <LocaleSwitch menu />
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <ThemeSwitch />
      <LocaleSwitch />
    </div>
  );
}
