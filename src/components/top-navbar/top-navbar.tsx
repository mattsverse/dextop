import { useLocation } from "@tanstack/react-router";
import { FolderKanban, Settings } from "lucide-react";
import { NavLinkItem } from "./nav-link-item";
import { ThemeMenu } from "./theme-menu";

const NAV_ITEMS = [
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
] as const;

function isRouteActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function TopNavbar() {
  const location = useLocation();

  return (
    <header className="relative z-40 shrink-0 border-b border-border/75 bg-background px-4">
      <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <FolderKanban className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <span className="truncate text-base font-semibold tracking-[-0.03em] text-foreground">
              dextop
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLinkItem
                icon={item.icon}
                isActive={isRouteActive(location.pathname, item.to)}
                key={item.to}
                label={item.label}
                to={item.to}
              />
            ))}
          </nav>

          <ThemeMenu />
        </div>
      </div>
    </header>
  );
}
