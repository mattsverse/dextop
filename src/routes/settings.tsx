import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Check, ExternalLink, Laptop, Moon, RefreshCcw, Sun, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/contexts/projects-context";
import { useTheme, type ThemePreference } from "@/contexts/theme-context";
import { useUpdater } from "@/contexts/updater-context";

export const Route = createFileRoute("/settings")({
  component: SettingsRouteComponent,
});

const GITHUB_REPO_URL = "https://github.com/matfire/dextop";

const THEME_OPTIONS: Array<{
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

function SettingsRouteComponent() {
  const { clearAllProjects, projects } = useProjects();
  const { setThemePreference, themePreference } = useTheme();
  const {
    availableUpdateVersion,
    currentVersion,
    isCheckingForUpdates,
    isInstalling,
    isManualCheckInProgress,
    isReadyToRestart,
    requestManualUpdateCheck,
  } = useUpdater();
  const [isClearingProjects, setIsClearingProjects] = useState(false);

  const handleClearAllProjects = async () => {
    setIsClearingProjects(true);

    try {
      await clearAllProjects();
    } finally {
      setIsClearingProjects(false);
    }
  };

  const updateSummary = isReadyToRestart
    ? "The update is installed. Restart from the update dialog to use it."
    : availableUpdateVersion
      ? `Version ${availableUpdateVersion} is ready to install from the update dialog.`
      : isCheckingForUpdates
        ? "Checking for updates."
        : "Check for a newer desktop build.";

  return (
    <section className="relative h-full overflow-y-auto p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(110,130,104,0.08),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(138,113,77,0.06),transparent_26%)]" />
      <div className="relative mx-auto w-full max-w-6xl space-y-6 pb-4">
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Settings</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-foreground">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Manage saved projects, theme, and app info.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <section className="rounded-[1.5rem] border border-border/75 bg-panel/88 p-6 shadow-[0_22px_55px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_55px_rgba(2,6,23,0.28)]">
            <div className="flex items-start gap-3">
              <div className="rounded-full border border-destructive/20 bg-destructive/10 p-2 text-destructive">
                <Trash2 className="size-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Saved projects</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Saved projects</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Remove every project saved in dextop on this device.
                </p>
              </div>
            </div>
            <p className="mt-5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {projects.length} saved {projects.length === 1 ? "project" : "projects"}
            </p>
            <Button
              className="mt-4 w-full rounded-full"
              disabled={isClearingProjects || projects.length === 0}
              onClick={() => {
                void handleClearAllProjects();
              }}
              variant="destructive"
            >
              {isClearingProjects ? "Removing..." : "Remove Saved Projects"}
            </Button>
          </section>

          <section className="rounded-[1.5rem] border border-border/75 bg-panel/88 p-6 shadow-[0_22px_55px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_55px_rgba(2,6,23,0.28)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Theme
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Theme</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Choose how dextop should match your theme.
            </p>
            <div className="mt-4 space-y-2.5">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = themePreference === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-[1rem] border px-3 py-3 text-left transition-colors ${
                      isActive
                        ? "border-primary/35 bg-background/90"
                        : "border-border/75 bg-background/72 hover:border-primary/25 hover:bg-background/92"
                    }`}
                    onClick={() => {
                      setThemePreference(option.value);
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <span className="rounded-full border border-border/75 bg-panel p-2 text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-foreground">
                          {option.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                    </span>
                    <span
                      className={`rounded-full border p-1 ${
                        isActive
                          ? "border-primary/35 bg-primary text-primary-foreground"
                          : "border-border/75 text-muted-foreground"
                      }`}
                    >
                      <Check className="size-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <section className="rounded-[1.5rem] border border-border/75 bg-panel/88 p-6 shadow-[0_22px_55px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_55px_rgba(2,6,23,0.28)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Application
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">App info</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InfoTile label="Current Version" value={currentVersion} />
            <InfoTile label="Repository" value="matfire/dextop" />
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {updateSummary}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              className="w-full rounded-full sm:w-auto"
              disabled={isCheckingForUpdates || isInstalling}
              onClick={() => {
                requestManualUpdateCheck();
              }}
              variant="outline"
            >
              <RefreshCcw className={`size-4 ${isManualCheckInProgress ? "animate-spin" : ""}`} />
              {isManualCheckInProgress ? "Checking..." : "Check for updates"}
            </Button>
            <Button
              className="w-full rounded-full sm:w-auto"
              onClick={() => {
                void openUrl(GITHUB_REPO_URL);
              }}
              variant="outline"
            >
              <ExternalLink className="size-4" />
              Open repository
            </Button>
          </div>
        </section>
      </div>
    </section>
  );
}

type InfoTileProps = {
  label: string;
  value: string;
};

function InfoTile({ label, value }: InfoTileProps) {
  return (
    <div className="rounded-[1rem] border border-border/75 bg-background/80 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm text-foreground">{value}</p>
    </div>
  );
}
