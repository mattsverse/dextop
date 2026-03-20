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
    description: "Use the light color theme.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Use the dark color theme.",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Follow the operating system preference.",
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
    ? "The latest update is installed. Restart from the update dialog to start using it."
    : availableUpdateVersion
      ? `Version ${availableUpdateVersion} is available to install from the update dialog.`
      : isCheckingForUpdates
        ? "Checking the release feed for a newer version."
        : "Check whether a newer desktop build is available.";

  return (
    <section className="relative h-full overflow-y-auto p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(to_right,rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:28px_28px] dark:opacity-25" />
      <div className="relative mx-auto w-full max-w-5xl space-y-6 pb-4">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Settings
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            App Preferences
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Manage local projects, appearance, and application metadata.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-sm border border-slate-300/70 bg-white/80 p-5 shadow-[0_20px_45px_rgba(148,163,184,0.18)] backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_20px_45px_rgba(2,6,23,0.45)]">
            <div className="flex items-start gap-3">
              <div className="rounded-sm border border-rose-400/30 bg-rose-500/15 p-2 text-rose-200">
                <Trash2 className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Stored Projects
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Remove every saved project reference from dextop.
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              {projects.length} project(s) currently stored
            </p>
            <Button
              className="mt-3 w-full"
              disabled={isClearingProjects || projects.length === 0}
              onClick={() => {
                void handleClearAllProjects();
              }}
              variant="destructive"
            >
              {isClearingProjects ? "Removing..." : "Remove All Stored Projects"}
            </Button>
          </section>

          <section className="rounded-sm border border-slate-300/70 bg-white/80 p-5 shadow-[0_20px_45px_rgba(148,163,184,0.18)] backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_20px_45px_rgba(2,6,23,0.45)]">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Theme</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Choose how the interface theme should be applied.
            </p>
            <div className="mt-4 space-y-2.5">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = themePreference === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-sm border px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? "border-cyan-400/40 bg-cyan-400/12"
                        : "border-slate-300/80 bg-white/70 hover:border-cyan-300/40 hover:bg-cyan-300/10 dark:border-white/10 dark:bg-slate-950/70 dark:hover:border-cyan-300/35 dark:hover:bg-cyan-300/10"
                    }`}
                    onClick={() => {
                      setThemePreference(option.value);
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <span className="rounded-sm border border-slate-300/70 bg-white p-1.5 text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
                        <Icon className="size-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                          {option.label}
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          {option.description}
                        </span>
                      </span>
                    </span>
                    <span
                      className={`rounded-sm border p-1 ${
                        isActive
                          ? "border-cyan-300/45 bg-cyan-300/20 text-cyan-200"
                          : "border-slate-300/70 text-slate-400 dark:border-white/10 dark:text-slate-500"
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

        <section className="rounded-sm border border-slate-300/70 bg-white/80 p-5 shadow-[0_20px_45px_rgba(148,163,184,0.18)] backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_20px_45px_rgba(2,6,23,0.45)]">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            App Information
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InfoTile label="Current Version" value={currentVersion} />
            <InfoTile label="Repository" value="matfire/dextop" />
          </div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{updateSummary}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              className="w-full sm:w-auto"
              disabled={isCheckingForUpdates || isInstalling}
              onClick={() => {
                requestManualUpdateCheck();
              }}
              variant="outline"
            >
              <RefreshCcw className={`size-4 ${isManualCheckInProgress ? "animate-spin" : ""}`} />
              {isManualCheckInProgress ? "Checking..." : "Check for Updates"}
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                void openUrl(GITHUB_REPO_URL);
              }}
              variant="outline"
            >
              <ExternalLink className="size-4" />
              Open GitHub Repository
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
    <div className="rounded-sm border border-slate-300/80 bg-white/75 px-3 py-2.5 dark:border-white/10 dark:bg-slate-950/70">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm text-slate-700 dark:text-slate-100">{value}</p>
    </div>
  );
}
