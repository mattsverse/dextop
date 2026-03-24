import { Link } from "@tanstack/react-router";
import { cva } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinkVariants = cva("border border-transparent px-3 text-xs sm:text-sm", {
  variants: {
    active: {
      true: "border-border bg-muted text-foreground",
      false: "text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground",
    },
  },
});

type NavLinkItemProps = {
  to: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
};

export function NavLinkItem({ to, label, icon: Icon, isActive }: NavLinkItemProps) {
  return (
    <Button asChild className={navLinkVariants({ active: isActive })} size="sm" variant="ghost">
      <Link to={to}>
        <Icon className="size-4" />
        <span>{label}</span>
      </Link>
    </Button>
  );
}
