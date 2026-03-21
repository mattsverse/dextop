import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import { SettingsPage } from "@/components/settings";
import { useProjects } from "@/contexts/projects-context";
import { useTheme } from "@/contexts/theme-context";
import { useUpdater } from "@/contexts/updater-context";

export const Route = createFileRoute("/settings")({
  component: SettingsRouteComponent,
});

const GITHUB_REPO_URL = "https://github.com/matfire/dextop";
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
    <SettingsPage
      currentVersion={currentVersion}
      isCheckingForUpdates={isCheckingForUpdates}
      isClearingProjects={isClearingProjects}
      isInstalling={isInstalling}
      isManualCheckInProgress={isManualCheckInProgress}
      onClearAllProjects={() => {
        void handleClearAllProjects();
      }}
      onOpenRepository={() => {
        void openUrl(GITHUB_REPO_URL);
      }}
      onRequestManualUpdateCheck={() => {
        requestManualUpdateCheck();
      }}
      onThemePreferenceChange={setThemePreference}
      projectsCount={projects.length}
      themePreference={themePreference}
      updateSummary={updateSummary}
    />
  );
}
