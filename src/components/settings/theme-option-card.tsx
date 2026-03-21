import { cva } from "class-variance-authority";
import { Check, Laptop, Moon, Sun } from "lucide-react";
import type { ThemePreference } from "@/contexts/theme-context";

const themeOptionVariants = cva(
  "flex w-full items-center justify-between rounded-[1rem] border px-3 py-3 text-left transition-colors",
  {
    variants: {
      active: {
        true: "border-primary/35 bg-background/90",
        false: "border-border/75 bg-background/72 hover:border-primary/25 hover:bg-background/92",
      },
    },
  },
);

const themeCheckVariants = cva("rounded-full border p-1", {
  variants: {
    active: {
      true: "border-primary/35 bg-primary text-primary-foreground",
      false: "border-border/75 text-muted-foreground",
    },
  },
});

export const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: "light",
    label: "Light",
    description: "Always use the light theme.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always use the dark theme.",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Follow your system theme.",
    icon: Laptop,
  },
];

type ThemeOptionCardProps = {
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
  isActive: boolean;
  onSelect: () => void;
};

export function ThemeOptionCard({
  value,
  label,
  description,
  icon: Icon,
  isActive,
  onSelect,
}: ThemeOptionCardProps) {
  return (
    <button
      className={themeOptionVariants({ active: isActive })}
      key={value}
      onClick={onSelect}
      type="button"
    >
      <span className="flex items-center gap-3">
        <span className="rounded-full border border-border/75 bg-panel p-2 text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <span>
          <span className="block text-sm font-medium text-foreground">{label}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
      </span>
      <span className={themeCheckVariants({ active: isActive })}>
        <Check className="size-3.5" />
      </span>
    </button>
  );
}
