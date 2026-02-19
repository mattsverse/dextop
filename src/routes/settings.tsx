import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For } from "solid-js";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Check, ExternalLink, Laptop, Moon, RefreshCcw, Sun, Trash2 } from "lucide-solid";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/contexts/projects-context";
import { requestManualUpdateCheck } from "@/lib/updater-events";
import {
  useTheme,
  type ThemePreference,
} from "@/contexts/theme-context";

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
  const [isClearingProjects, setIsClearingProjects] = createSignal(false);

  const handleClearAllProjects = async () => {
    setIsClearingProjects(true);

    try {
      await clearAllProjects();
    } finally {
      setIsClearingProjects(false);
    }
  };

  return (
    <section class="relative h-full overflow-y-auto p-4 sm:p-6">
      <div class="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(to_right,rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:28px_28px] dark:opacity-25" />
      <div class="relative mx-auto w-full max-w-5xl space-y-6 pb-4">
        <header>
          <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Settings
          </p>
          <h1 class="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            App Preferences
          </h1>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Manage local projects, appearance, and application metadata.
          </p>
        </header>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section class="rounded-sm border border-slate-300/70 bg-white/80 p-5 shadow-[0_20px_45px_rgba(148,163,184,0.18)] backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_20px_45px_rgba(2,6,23,0.45)]">
            <div class="flex items-start gap-3">
              <div class="rounded-sm border border-rose-400/30 bg-rose-500/15 p-2 text-rose-200">
                <Trash2 class="size-4" />
              </div>
              <div>
                <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Stored Projects
                </h2>
                <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Remove every saved project reference from Dex UI.
                </p>
              </div>
            </div>
            <p class="mt-4 text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              {projects().length} project(s) currently stored
            </p>
            <Button
              class="mt-3 w-full"
              disabled={isClearingProjects() || projects().length === 0}
              onClick={() => {
                void handleClearAllProjects();
              }}
              variant="destructive"
            >
              {isClearingProjects()
                ? "Removing..."
                : "Remove All Stored Projects"}
            </Button>
          </section>

          <section class="rounded-sm border border-slate-300/70 bg-white/80 p-5 shadow-[0_20px_45px_rgba(148,163,184,0.18)] backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_20px_45px_rgba(2,6,23,0.45)]">
            <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">
              Theme
            </h2>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Choose how the interface theme should be applied.
            </p>
            <div class="mt-4 space-y-2.5">
              <For each={THEME_OPTIONS}>
                {(option) => {
                  const Icon = option.icon;
                  const isActive = () => themePreference() === option.value;

                  return (
                    <button
                      type="button"
                      class={`flex w-full items-center justify-between rounded-sm border px-3 py-2.5 text-left transition-colors ${
                        isActive()
                          ? "border-cyan-400/40 bg-cyan-400/12"
                          : "border-slate-300/80 bg-white/70 hover:border-cyan-300/40 hover:bg-cyan-300/10 dark:border-white/10 dark:bg-slate-950/70 dark:hover:border-cyan-300/35 dark:hover:bg-cyan-300/10"
                      }`}
                      onClick={() => {
                        setThemePreference(option.value);
                      }}
                    >
                      <span class="flex items-center gap-3">
                        <span class="rounded-sm border border-slate-300/70 bg-white p-1.5 text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
                          <Icon class="size-4" />
                        </span>
                        <span>
                          <span class="block text-sm font-medium text-slate-800 dark:text-slate-100">
                            {option.label}
                          </span>
                          <span class="block text-xs text-slate-500 dark:text-slate-400">
                            {option.description}
                          </span>
                        </span>
                      </span>
                      <span
                        class={`rounded-sm border p-1 ${
                          isActive()
                            ? "border-cyan-300/45 bg-cyan-300/20 text-cyan-200"
                            : "border-slate-300/70 text-slate-400 dark:border-white/10 dark:text-slate-500"
                        }`}
                      >
                        <Check class="size-3.5" />
                      </span>
                    </button>
                  );
                }}
              </For>
            </div>
          </section>
        </div>

        <section class="rounded-sm border border-slate-300/70 bg-white/80 p-5 shadow-[0_20px_45px_rgba(148,163,184,0.18)] backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_20px_45px_rgba(2,6,23,0.45)]">
          <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">
            App Information
          </h2>
          <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InfoTile label="Repository" value="matfire/dextop" />
          </div>
          <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              class="w-full sm:w-auto"
              onClick={() => {
                requestManualUpdateCheck();
              }}
              variant="outline"
            >
              <RefreshCcw class="size-4" />
              Check for Updates
            </Button>
            <Button
              class="w-full sm:w-auto"
              onClick={() => {
                void openUrl(GITHUB_REPO_URL);
              }}
              variant="outline"
            >
              <ExternalLink class="size-4" />
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

function InfoTile(props: InfoTileProps) {
  return (
    <div class="rounded-sm border border-slate-300/80 bg-white/75 px-3 py-2.5 dark:border-white/10 dark:bg-slate-950/70">
      <p class="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {props.label}
      </p>
      <p class="mt-1 font-mono text-sm text-slate-700 dark:text-slate-100">
        {props.value}
      </p>
    </div>
  );
}
