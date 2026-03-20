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
    <header className="relative z-40 shrink-0 border-b border-border/75 bg-background/88 px-4 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border/75 bg-panel text-primary">
            <FolderKanban className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Dex Workspace
            </p>
            <span className="truncate text-base font-semibold tracking-[-0.03em] text-foreground">
              dextop
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 rounded-full border border-border/75 bg-panel/90 p-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = isRouteActive(location.pathname, item.to);

              return (
                <Button
                  asChild
                  className={cn(
                    "rounded-full border px-3 text-xs sm:text-sm",
                    isActive
                      ? "border-border/80 bg-background text-foreground shadow-sm"
                      : "border-transparent text-muted-foreground hover:bg-background/75 hover:text-foreground",
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
            <DropdownMenuTrigger className="inline-flex h-9 shrink-0 select-none items-center justify-center gap-2 rounded-full border border-border/75 bg-panel/90 px-3 text-xs text-muted-foreground outline-none transition-colors hover:bg-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-sm">
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
