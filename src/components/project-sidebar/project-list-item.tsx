import { cva } from "class-variance-authority";
import { ExternalLink, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import type { ProjectItem } from "@/lib/projects-service";

const projectRowVariants = cva(
  "h-auto flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-sidebar-foreground transition-all hover:bg-background/60",
  {
    variants: {
      active: {
        true: "border-sidebar-border bg-background/80",
        false: "border-transparent",
      },
    },
  },
);

const projectCountVariants = cva("shrink-0 text-[11px] font-medium", {
  variants: {
    active: {
      true: "text-sidebar-foreground",
      false: "text-sidebar-foreground/60",
    },
  },
});

type ProjectListItemProps = {
  project: ProjectItem;
  isSelected: boolean;
  onSelect: () => void;
  onOpenInSeparateWindow: () => void;
  onDelete: () => void;
};

function formatProjectPath(path: string): string {
  return path.split("/").slice(-2).join("/");
}

export function ProjectListItem({
  project,
  isSelected,
  onSelect,
  onOpenInSeparateWindow,
  onDelete,
}: ProjectListItemProps) {
  return (
    <SidebarMenuItem>
      <ContextMenu>
        <ContextMenuTrigger className="block">
          <SidebarMenuButton
            className={projectRowVariants({ active: isSelected })}
            isActive={isSelected}
            onClick={onSelect}
          >
            <div className="flex w-full items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="block truncate text-sm font-semibold text-sidebar-foreground">
                  {project.name}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-sidebar-foreground/58">
                  {formatProjectPath(project.path)}
                </span>
              </div>
              <span className={projectCountVariants({ active: isSelected })}>{project.tasks}</span>
            </div>
          </SidebarMenuButton>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52 rounded-xl border border-border/80 bg-popover/96 p-1.5 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
          <ContextMenuItem
            className="rounded-lg text-foreground"
            onSelect={() => {
              onOpenInSeparateWindow();
            }}
          >
            <ExternalLink className="size-4" />
            <span>Open in separate window</span>
          </ContextMenuItem>
          <ContextMenuSeparator className="my-1" />
          <ContextMenuItem
            className="rounded-lg"
            onSelect={() => {
              onDelete();
            }}
            variant="destructive"
          >
            <Trash2 className="size-4" />
            <span>Delete project</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </SidebarMenuItem>
  );
}
