import { useEffect, useMemo, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { useHotkey } from "@tanstack/react-hotkeys";
import {
  FolderPlus,
  Maximize,
  MoonStar,
  MonitorUp,
  PanelLeft,
  type LucideIcon,
} from "lucide-react";
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
import { SIDEBAR_TOGGLE_EVENT } from "@/components/ui/sidebar";
import { useProjects } from "@/contexts/projects-context";
import { useTheme } from "@/contexts/theme-context";

type CommandGroupKey = "Projects" | "Appearance" | "Window";

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

const GROUP_ORDER: CommandGroupKey[] = ["Projects", "Appearance", "Window"];

export function CommandPalette() {
  const location = useLocation();
  const { openProject, openProjectInSeparateWindow, selectedProjectId } = useProjects();
  const { resolvedTheme, toggleThemePreference } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const isSidebarAvailable = location.pathname.startsWith("/projects");

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
        id: "toggle-fullscreen",
        label: "Toggle fullscreen",
        group: "Window",
        icon: Maximize,
        onSelect: async () => {
          if (!isTauri()) {
            return;
          }

          const appWindow = getCurrentWindow();
          const isFullscreen = await appWindow.isFullscreen();
          await appWindow.setFullscreen(!isFullscreen);
        },
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
        shortcutLabel: "Mod+B",
      },
    ],
    [
      isSidebarAvailable,
      location.pathname,
      openProject,
      openProjectInSeparateWindow,
      resolvedTheme,
      selectedProjectId,
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
    await command.onSelect();
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
      void openProject();
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

      void openProjectInSeparateWindow(selectedProjectId);
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
      toggleThemePreference();
    },
    {
      enabled: !isOpen,
      ignoreInputs: true,
      preventDefault: true,
    },
  );

  const handleToggleFullscreen = async () => {
    if (!isTauri()) {
      return;
    }

    const appWindow = getCurrentWindow();
    const isFullscreen = await appWindow.isFullscreen();
    await appWindow.setFullscreen(!isFullscreen);
  };

  useHotkey(
    "F11",
    () => {
      void handleToggleFullscreen();
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
      void handleToggleFullscreen();
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
                        <CommandShortcut>{command.shortcutLabel}</CommandShortcut>
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
