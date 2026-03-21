import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { useHotkey } from "@tanstack/react-hotkeys";
import {
  Columns2,
  FolderPlus,
  MoveDown,
  MoveHorizontal,
  MoveLeft,
  MoveRight,
  MoveUp,
  Maximize,
  MoonStar,
  MonitorUp,
  PanelLeft,
  Rows2,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  CLOSE_PANE_LABEL,
  dispatchWorkspaceCommand,
  MOVE_DOWN_PANE_LABEL,
  MOVE_LEFT_PANE_LABEL,
  MOVE_RIGHT_PANE_LABEL,
  MOVE_UP_PANE_LABEL,
  NEXT_PANE_LABEL,
  SPLIT_SIDE_BY_SIDE_LABEL,
  SPLIT_STACKED_LABEL,
} from "@/components/projects-workspace/workspace-commands";
import {
  SIDEBAR_KEYBOARD_SHORTCUT_LABEL,
  SIDEBAR_TOGGLE_EVENT,
} from "@/components/ui/sidebar";
import { useProjects } from "@/contexts/projects-context";
import { useTheme } from "@/contexts/theme-context";
import { processLogger } from "@/lib/logger";

type CommandGroupKey = "Projects" | "Workspace" | "Appearance" | "Window";

type PaletteCommand = {
  id: string;
  label: string;
  group: CommandGroupKey;
  icon: LucideIcon;
  onSelect: () => void | Promise<void>;
  disabled?: boolean;
  keywords?: string[];
  shortcutLabel?: string;
};

const GROUP_ORDER: CommandGroupKey[] = ["Projects", "Workspace", "Appearance", "Window"];

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return "Unexpected error";
}

export function CommandPalette() {
  const location = useLocation();
  const { openProject, openProjectInSeparateWindow, selectedProjectId } =
    useProjects();
  const { resolvedTheme, toggleThemePreference } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const isSidebarAvailable = location.pathname.startsWith("/projects");
  const isWorkspaceAvailable = location.pathname.startsWith("/projects");
  const toggleFullscreen = useCallback(async () => {
    if (!isTauri()) {
      return;
    }

    const appWindow = getCurrentWindow();
    const isFullscreen = await appWindow.isFullscreen();
    await appWindow.setFullscreen(!isFullscreen);
  }, []);
  const safeExecute = useCallback(
    async (action: () => void | Promise<void>, errorTitle: string) => {
      try {
        await action();
      } catch (error) {
        processLogger.error(errorTitle, error);
        toast.error(errorTitle, {
          description: toErrorMessage(error),
        });
      }
    },
    [],
  );

  const commands = useMemo<PaletteCommand[]>(
    () => [
      {
        id: "add-project",
        label: "Add project",
        group: "Projects",
        icon: FolderPlus,
        onSelect: () => openProject(),
        keywords: ["project", "folder", "add", "import"],
        shortcutLabel: "Mod+Shift+O",
      },
      {
        id: "open-selected-project-window",
        label: "Open selected project in separate window",
        group: "Projects",
        icon: MonitorUp,
        onSelect: () => openProjectInSeparateWindow(selectedProjectId ?? ""),
        disabled: !selectedProjectId,
        keywords: ["project", "window", "open", "separate"],
        shortcutLabel: "Mod+Shift+Enter",
      },
      {
        id: "toggle-theme",
        label: `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`,
        group: "Appearance",
        icon: MoonStar,
        onSelect: toggleThemePreference,
        keywords: ["theme", "appearance", "dark", "light", "mode"],
        shortcutLabel: "Mod+Shift+T",
      },
      {
        id: "split-pane-side-by-side",
        label: "Split pane side by side",
        group: "Workspace",
        icon: Columns2,
        onSelect: () => {
          dispatchWorkspaceCommand("split-horizontal");
        },
        disabled: !isWorkspaceAvailable,
        keywords: ["workspace", "pane", "split", "horizontal", "vertical", "multiplexer"],
        shortcutLabel: SPLIT_SIDE_BY_SIDE_LABEL,
      },
      {
        id: "split-pane-stacked",
        label: "Split pane stacked",
        group: "Workspace",
        icon: Rows2,
        onSelect: () => {
          dispatchWorkspaceCommand("split-vertical");
        },
        disabled: !isWorkspaceAvailable,
        keywords: ["workspace", "pane", "split", "vertical", "stacked", "multiplexer"],
        shortcutLabel: SPLIT_STACKED_LABEL,
      },
      {
        id: "close-focused-pane",
        label: "Close focused pane",
        group: "Workspace",
        icon: X,
        onSelect: () => {
          dispatchWorkspaceCommand("close-pane");
        },
        disabled: !isWorkspaceAvailable,
        keywords: ["workspace", "pane", "close", "remove", "multiplexer"],
        shortcutLabel: CLOSE_PANE_LABEL,
      },
      {
        id: "focus-next-pane",
        label: "Focus next pane",
        group: "Workspace",
        icon: MoveHorizontal,
        onSelect: () => {
          dispatchWorkspaceCommand("next-pane");
        },
        disabled: !isWorkspaceAvailable,
        keywords: ["workspace", "pane", "focus", "next", "cycle", "multiplexer"],
        shortcutLabel: NEXT_PANE_LABEL,
      },
      {
        id: "focus-pane-left",
        label: "Focus pane left",
        group: "Workspace",
        icon: MoveLeft,
        onSelect: () => {
          dispatchWorkspaceCommand("focus-left");
        },
        disabled: !isWorkspaceAvailable,
        keywords: ["workspace", "pane", "focus", "left", "multiplexer"],
        shortcutLabel: MOVE_LEFT_PANE_LABEL,
      },
      {
        id: "focus-pane-right",
        label: "Focus pane right",
        group: "Workspace",
        icon: MoveRight,
        onSelect: () => {
          dispatchWorkspaceCommand("focus-right");
        },
        disabled: !isWorkspaceAvailable,
        keywords: ["workspace", "pane", "focus", "right", "multiplexer"],
        shortcutLabel: MOVE_RIGHT_PANE_LABEL,
      },
      {
        id: "focus-pane-up",
        label: "Focus pane up",
        group: "Workspace",
        icon: MoveUp,
        onSelect: () => {
          dispatchWorkspaceCommand("focus-up");
        },
        disabled: !isWorkspaceAvailable,
        keywords: ["workspace", "pane", "focus", "up", "multiplexer"],
        shortcutLabel: MOVE_UP_PANE_LABEL,
      },
      {
        id: "focus-pane-down",
        label: "Focus pane down",
        group: "Workspace",
        icon: MoveDown,
        onSelect: () => {
          dispatchWorkspaceCommand("focus-down");
        },
        disabled: !isWorkspaceAvailable,
        keywords: ["workspace", "pane", "focus", "down", "multiplexer"],
        shortcutLabel: MOVE_DOWN_PANE_LABEL,
      },
      {
        id: "toggle-fullscreen",
        label: "Toggle fullscreen",
        group: "Window",
        icon: Maximize,
        onSelect: toggleFullscreen,
        disabled: !isTauri(),
        keywords: ["fullscreen", "window", "screen", "maximize"],
        shortcutLabel: "F11 / Ctrl+Cmd+F",
      },
      {
        id: "toggle-sidebar",
        label: "Toggle sidebar",
        group: "Window",
        icon: PanelLeft,
        onSelect: () => {
          window.dispatchEvent(new CustomEvent(SIDEBAR_TOGGLE_EVENT));
        },
        disabled: !isSidebarAvailable,
        keywords: ["sidebar", "panel", "navigation", "project"],
        shortcutLabel: SIDEBAR_KEYBOARD_SHORTCUT_LABEL,
      },
    ],
    [
      isSidebarAvailable,
      isWorkspaceAvailable,
      openProject,
      openProjectInSeparateWindow,
      resolvedTheme,
      selectedProjectId,
      toggleFullscreen,
      toggleThemePreference,
    ],
  );

  const groupedCommands = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({
        group,
        commands: commands.filter((command) => command.group === group),
      })).filter((entry) => entry.commands.length > 0),
    [commands],
  );

  const runCommand = async (command: PaletteCommand) => {
    if (command.disabled) {
      return;
    }

    setIsOpen(false);
    await safeExecute(
      async () => command.onSelect(),
      `Failed to ${command.label.charAt(0).toLowerCase()}${command.label.slice(1)}`,
    );
  };

  useHotkey(
    "Mod+K",
    () => {
      setIsOpen((current) => !current);
    },
    {
      ignoreInputs: false,
      preventDefault: true,
    },
  );

  useHotkey(
    "Escape",
    () => {
      setIsOpen(false);
    },
    {
      enabled: isOpen,
      ignoreInputs: false,
      preventDefault: true,
    },
  );

  useHotkey(
    "Mod+Shift+O",
    () => {
      void safeExecute(() => openProject(), "Failed to add project");
    },
    {
      enabled: !isOpen,
      ignoreInputs: true,
      preventDefault: true,
    },
  );

  useHotkey(
    "Mod+Shift+Enter",
    () => {
      if (!selectedProjectId) {
        return;
      }

      void safeExecute(
        () => openProjectInSeparateWindow(selectedProjectId),
        "Failed to open selected project in a separate window",
      );
    },
    {
      enabled: !isOpen && Boolean(selectedProjectId),
      ignoreInputs: true,
      preventDefault: true,
    },
  );

  useHotkey(
    "Mod+Shift+T",
    () => {
      void safeExecute(() => toggleThemePreference(), "Failed to toggle theme");
    },
    {
      enabled: !isOpen,
      ignoreInputs: true,
      preventDefault: true,
    },
  );

  useHotkey(
    "F11",
    () => {
      void safeExecute(() => toggleFullscreen(), "Failed to toggle fullscreen");
    },
    {
      enabled: !isOpen && isTauri(),
      ignoreInputs: true,
      preventDefault: true,
    },
  );

  useHotkey(
    "Control+Meta+F",
    () => {
      void safeExecute(() => toggleFullscreen(), "Failed to toggle fullscreen");
    },
    {
      enabled: !isOpen && isTauri(),
      ignoreInputs: true,
      preventDefault: true,
    },
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleWindowBlur = () => {
      setIsOpen(false);
    };

    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isOpen]);

  return (
    <CommandDialog onOpenChange={setIsOpen} open={isOpen}>
      <Command className="border-0 bg-popover/98" loop>
        <CommandInput placeholder="Search commands..." />
        <CommandList>
          <CommandEmpty>No matching commands.</CommandEmpty>
          {groupedCommands.map((entry, index) => (
            <div key={entry.group}>
              {index > 0 ? <CommandSeparator /> : null}
              <CommandGroup heading={entry.group}>
                {entry.commands.map((command) => {
                  const Icon = command.icon;

                  return (
                    <CommandItem
                      disabled={command.disabled}
                      key={command.id}
                      keywords={command.keywords}
                      onSelect={() => {
                        void runCommand(command);
                      }}
                      value={command.label}
                    >
                      <Icon />
                      <span>{command.label}</span>
                      {command.shortcutLabel ? (
                        <CommandShortcut>
                          {command.shortcutLabel}
                        </CommandShortcut>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
