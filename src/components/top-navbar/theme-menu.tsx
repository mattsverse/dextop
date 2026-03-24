import { useState } from "react";
import { Laptop, Moon, Sun } from "lucide-react";
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

function isThemePreference(value: string): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function ThemeMenu() {
  const { setThemePreference, themePreference } = useTheme();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  const currentThemeMeta = THEME_META[themePreference];
  const themeButtonLabel = `Theme: ${currentThemeMeta.label}`;
  const CurrentThemeIcon = currentThemeMeta.icon;

  return (
    <DropdownMenu onOpenChange={setIsThemeMenuOpen} open={isThemeMenuOpen}>
      <DropdownMenuTrigger
        aria-label={themeButtonLabel}
        className="inline-flex size-9 shrink-0 select-none items-center justify-center border border-transparent text-muted-foreground outline-none transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40"
      >
        <CurrentThemeIcon className="size-4" />
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
            const { icon: Icon, label } = THEME_META[themeOption];

            return (
              <DropdownMenuRadioItem key={themeOption} value={themeOption}>
                <Icon className="size-4" />
                <span>{label}</span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
