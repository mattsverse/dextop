import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { FolderKanban, Laptop, Moon, Settings, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type ThemePreference } from "@/contexts/theme-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS: Array<{
  to: string;
  label: string;
  icon: typeof FolderKanban;
}> = [
  {
    to: "/projects",
    label: "Projects",
    icon: FolderKanban,
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

const THEME_OPTIONS: ThemePreference[] = ["light", "dark", "system"];

const THEME_META: Record<
  ThemePreference,
  {
    label: string;
    icon: typeof Sun;
  }
> = {
  light: {
    label: "Light",
    icon: Sun,
  },
  dark: {
    label: "Dark",
    icon: Moon,
  },
  system: {
    label: "System",
    icon: Laptop,
  },
};

function isRouteActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function isThemePreference(value: string): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function TopNavbar() {
  const location = useLocation();
  const { setThemePreference, themePreference } = useTheme();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  const currentThemeMeta = THEME_META[themePreference];
  const themeButtonLabel = `Theme: ${currentThemeMeta.label}`;

  return (
    <header className="relative z-40 shrink-0 border-b border-slate-200/80 bg-white/75 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-cyan-300/40 bg-cyan-300/15 text-cyan-800 dark:border-cyan-300/30 dark:bg-cyan-400/10 dark:text-cyan-200">
            <FolderKanban className="size-4" />
          </div>
          <span className="truncate text-sm font-semibold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-100">
            dextop
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <nav className="flex items-center gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = isRouteActive(location.pathname, item.to);

              return (
                <Button
                  asChild
                  className={cn(
                    "rounded-sm border px-2.5 text-xs sm:text-sm",
                    isActive
                      ? "border-cyan-300/45 bg-cyan-300/18 text-cyan-900 dark:border-cyan-300/35 dark:bg-cyan-400/12 dark:text-cyan-100"
                      : "border-transparent text-slate-600 hover:border-slate-300/80 hover:bg-slate-100/70 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/10",
                  )}
                  size="sm"
                  variant="ghost"
                >
                  <Link to={item.to}>
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </Link>
                </Button>
              );
            })}
          </nav>

          <DropdownMenu onOpenChange={setIsThemeMenuOpen} open={isThemeMenuOpen}>
            <DropdownMenuTrigger className="inline-flex h-8 shrink-0 select-none items-center justify-center gap-2 rounded-sm border border-slate-300/75 bg-white/85 px-2.5 text-xs text-slate-700 outline-none transition-colors hover:bg-slate-100 focus-visible:border-cyan-400/60 focus-visible:ring-1 focus-visible:ring-cyan-400/60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 sm:text-sm">
              <span className="hidden sm:inline">{themeButtonLabel}</span>
              <currentThemeMeta.icon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                onValueChange={(value) => {
                  if (isThemePreference(value)) {
                    setThemePreference(value);
                    setIsThemeMenuOpen(false);
                  }
                }}
                value={themePreference}
              >
                {THEME_OPTIONS.map((themeOption) => {
                  const meta = THEME_META[themeOption];
                  const Icon = meta.icon;

                  return (
                    <DropdownMenuRadioItem key={themeOption} value={themeOption}>
                      <Icon className="size-4" />
                      <span>{meta.label}</span>
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
