import { ExternalLink, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ThemePreference } from "@/contexts/theme-context";
import { InfoTile } from "./info-tile";
import { THEME_OPTIONS, ThemeOptionCard } from "./theme-option-card";

type SettingsPageProps = {
  projectsCount: number;
  isClearingProjects: boolean;
  onClearAllProjects: () => void;
  themePreference: ThemePreference;
  onThemePreferenceChange: (theme: ThemePreference) => void;
  currentVersion: string;
  updateSummary: string;
  isCheckingForUpdates: boolean;
  isInstalling: boolean;
  isManualCheckInProgress: boolean;
  onRequestManualUpdateCheck: () => void;
  onOpenRepository: () => void;
};

export function SettingsPage({
  projectsCount,
  isClearingProjects,
  onClearAllProjects,
  themePreference,
  onThemePreferenceChange,
  currentVersion,
  updateSummary,
  isCheckingForUpdates,
  isInstalling,
  isManualCheckInProgress,
  onRequestManualUpdateCheck,
  onOpenRepository,
}: SettingsPageProps) {
  return (
    <section className="relative h-full overflow-y-auto p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(110,130,104,0.08),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(138,113,77,0.06),transparent_26%)]" />
      <div className="relative mx-auto w-full max-w-6xl space-y-6 pb-4">
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Settings
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-foreground">
            Settings
          </h1>
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Saved projects
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                  Saved projects
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Remove every project saved in dextop on this device.
                </p>
              </div>
            </div>
            <p className="mt-5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {projectsCount} saved {projectsCount === 1 ? "project" : "projects"}
            </p>
            <Button
              className="mt-4 w-full rounded-full"
              disabled={isClearingProjects || projectsCount === 0}
              onClick={onClearAllProjects}
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
              {THEME_OPTIONS.map((option) => (
                <ThemeOptionCard
                  description={option.description}
                  icon={option.icon}
                  isActive={themePreference === option.value}
                  key={option.value}
                  label={option.label}
                  onSelect={() => onThemePreferenceChange(option.value)}
                  value={option.value}
                />
              ))}
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
              onClick={onRequestManualUpdateCheck}
              variant="outline"
            >
              <RefreshCcw className={isManualCheckInProgress ? "size-4 animate-spin" : "size-4"} />
              {isManualCheckInProgress ? "Checking..." : "Check for updates"}
            </Button>
            <Button
              className="w-full rounded-full sm:w-auto"
              onClick={onOpenRepository}
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
