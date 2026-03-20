import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";

type UpdateNotice = {
  variant: "error" | "info";
  title: string;
  message: string;
};

type UpdateCheckSource = "startup" | "manual";

type UpdaterContextValue = {
  availableUpdateVersion: string | null;
  contentLength: number | null;
  currentVersion: string;
  dismissNotice: () => void;
  downloadedBytes: number;
  installUpdate: () => Promise<void>;
  isCheckingForUpdates: boolean;
  isDialogOpen: boolean;
  isInstalling: boolean;
  isManualCheckInProgress: boolean;
  isReadyToRestart: boolean;
  notice: UpdateNotice | null;
  requestManualUpdateCheck: () => void;
  restartApp: () => Promise<void>;
  setIsDialogOpen: (open: boolean) => void;
};

const UpdaterContext = createContext<UpdaterContextValue | null>(null);

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return "Unexpected error";
}

export function UpdaterProvider({ children }: { children: ReactNode }) {
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [currentVersion, setCurrentVersion] = useState(__APP_VERSION__);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  const [isManualCheckInProgress, setIsManualCheckInProgress] = useState(false);
  const [isReadyToRestart, setIsReadyToRestart] = useState(false);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [contentLength, setContentLength] = useState<number | null>(null);
  const [notice, setNotice] = useState<UpdateNotice | null>(null);
  const availableUpdateRef = useRef<Update | null>(null);
  const isCheckingForUpdatesRef = useRef(false);
  const isInstallingRef = useRef(false);
  const isReadyToRestartRef = useRef(false);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    availableUpdateRef.current = availableUpdate;
  }, [availableUpdate]);

  useEffect(() => {
    isCheckingForUpdatesRef.current = isCheckingForUpdates;
  }, [isCheckingForUpdates]);

  useEffect(() => {
    isInstallingRef.current = isInstalling;
  }, [isInstalling]);

  useEffect(() => {
    isReadyToRestartRef.current = isReadyToRestart;
  }, [isReadyToRestart]);

  const handleDownloadEvent = (event: DownloadEvent) => {
    if (event.event === "Started") {
      setContentLength(event.data.contentLength ?? null);
      setDownloadedBytes(0);
      return;
    }

    if (event.event === "Progress") {
      setDownloadedBytes((current) => current + event.data.chunkLength);
    }
  };

  const installUpdate = async () => {
    const update = availableUpdateRef.current;
    if (!update || isInstallingRef.current) {
      return;
    }

    setIsInstalling(true);
    setContentLength(null);
    setDownloadedBytes(0);

    try {
      await update.downloadAndInstall(handleDownloadEvent);
      await update.close();
      if (isUnmountedRef.current) {
        return;
      }

      availableUpdateRef.current = null;
      setAvailableUpdate(null);
      setIsReadyToRestart(true);
      setIsDialogOpen(true);
    } catch (error) {
      if (!isUnmountedRef.current) {
        setNotice({
          variant: "error",
          title: "Update installation failed",
          message: toErrorMessage(error),
        });
      }
    } finally {
      if (!isUnmountedRef.current) {
        setIsInstalling(false);
      }
    }
  };

  const restartApp = async () => {
    try {
      await relaunch();
    } catch (error) {
      if (!isUnmountedRef.current) {
        setNotice({
          variant: "error",
          title: "Unable to restart app",
          message: toErrorMessage(error),
        });
      }
    }
  };

  const runUpdateCheck = async (source: UpdateCheckSource) => {
    if (!isTauri() || isCheckingForUpdatesRef.current || isInstallingRef.current) {
      return;
    }

    if (isReadyToRestartRef.current || availableUpdateRef.current) {
      setIsDialogOpen(true);
      return;
    }

    setIsCheckingForUpdates(true);
    setIsManualCheckInProgress(source === "manual");

    try {
      const update = await check();
      if (isUnmountedRef.current) {
        await update?.close();
        return;
      }

      if (update) {
        availableUpdateRef.current = update;
        setAvailableUpdate(update);
        setIsDialogOpen(true);
        return;
      }

      if (source === "manual") {
        setNotice({
          variant: "info",
          title: "No updates available",
          message: "You are already using the latest version.",
        });
      }
    } catch (error) {
      if (!isUnmountedRef.current) {
        setNotice({
          variant: "error",
          title: "Update check failed",
          message: toErrorMessage(error),
        });
      }
    } finally {
      if (!isUnmountedRef.current) {
        setIsCheckingForUpdates(false);
        setIsManualCheckInProgress(false);
      }
    }
  };

  const requestManualUpdateCheck = () => {
    void runUpdateCheck("manual");
  };

  useEffect(() => {
    let isCancelled = false;

    const loadCurrentVersion = async () => {
      if (!isTauri()) {
        return;
      }

      try {
        const version = await getVersion();
        if (!isCancelled) {
          setCurrentVersion(version);
        }
      } catch {
        if (!isCancelled) {
          setCurrentVersion(__APP_VERSION__);
        }
      }
    };

    void loadCurrentVersion();

    if (isTauri()) {
      void runUpdateCheck("startup");
    }

    return () => {
      isCancelled = true;
      isUnmountedRef.current = true;
      const update = availableUpdateRef.current;
      if (!update) {
        return;
      }

      void update.close().catch(() => {
        // no-op
      });
    };
  }, []);

  return (
    <UpdaterContext.Provider
      value={{
        availableUpdateVersion: availableUpdate?.version ?? null,
        contentLength,
        currentVersion,
        dismissNotice: () => {
          setNotice(null);
        },
        downloadedBytes,
        installUpdate,
        isCheckingForUpdates,
        isDialogOpen,
        isInstalling,
        isManualCheckInProgress,
        isReadyToRestart,
        notice,
        requestManualUpdateCheck,
        restartApp,
        setIsDialogOpen,
      }}
    >
      {children}
    </UpdaterContext.Provider>
  );
}

export function useUpdater() {
  const context = useContext(UpdaterContext);

  if (!context) {
    throw new Error("useUpdater must be used within an UpdaterProvider");
  }

  return context;
}
