import { isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { Download, RefreshCcw, TriangleAlert } from "lucide-solid";
import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { REQUEST_UPDATE_CHECK_EVENT } from "@/lib/updater-events";

type UpdateNotice = {
  variant: "error" | "info";
  title: string;
  message: string;
};

type UpdateCheckSource = "startup" | "manual";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return "Unexpected error";
}

export function UpdaterNotification() {
  const [availableUpdate, setAvailableUpdate] = createSignal<Update | null>(null);
  const [isDialogOpen, setIsDialogOpen] = createSignal(false);
  const [isInstalling, setIsInstalling] = createSignal(false);
  const [isCheckingForUpdates, setIsCheckingForUpdates] = createSignal(false);
  const [isReadyToRestart, setIsReadyToRestart] = createSignal(false);
  const [downloadedBytes, setDownloadedBytes] = createSignal(0);
  const [contentLength, setContentLength] = createSignal<number | null>(null);
  const [notice, setNotice] = createSignal<UpdateNotice | null>(null);

  const downloadPercent = createMemo(() => {
    const total = contentLength();
    if (!total || total <= 0) {
      return null;
    }

    return Math.min(100, Math.round((downloadedBytes() / total) * 100));
  });

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
    const update = availableUpdate();
    if (!update || isInstalling()) {
      return;
    }

    setIsInstalling(true);
    setContentLength(null);
    setDownloadedBytes(0);

    try {
      await update.downloadAndInstall(handleDownloadEvent);
      await update.close();
      setAvailableUpdate(null);
      setIsReadyToRestart(true);
      setIsDialogOpen(true);
    } catch (error) {
      setNotice({
        variant: "error",
        title: "Update installation failed",
        message: toErrorMessage(error),
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const restartApp = async () => {
    try {
      await relaunch();
    } catch (error) {
      setNotice({
        variant: "error",
        title: "Unable to restart app",
        message: toErrorMessage(error),
      });
    }
  };

  let isUnmounted = false;

  const runUpdateCheck = async (source: UpdateCheckSource) => {
    if (!isTauri() || isCheckingForUpdates() || isInstalling()) {
      return;
    }

    if (isReadyToRestart() || availableUpdate()) {
      setIsDialogOpen(true);
      return;
    }

    setIsCheckingForUpdates(true);

    try {
      const update = await check();
      if (isUnmounted) {
        await update?.close();
        return;
      }

      if (update) {
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
      if (isUnmounted) {
        return;
      }

      setNotice({
        variant: "error",
        title: "Update check failed",
        message: toErrorMessage(error),
      });
    } finally {
      if (!isUnmounted) {
        setIsCheckingForUpdates(false);
      }
    }
  };

  onMount(() => {
    if (!isTauri()) {
      return;
    }

    const onManualCheckRequested = () => {
      void runUpdateCheck("manual");
    };

    window.addEventListener(REQUEST_UPDATE_CHECK_EVENT, onManualCheckRequested);

    void runUpdateCheck("startup");

    onCleanup(() => {
      window.removeEventListener(REQUEST_UPDATE_CHECK_EVENT, onManualCheckRequested);
      isUnmounted = true;
    });
  });

  onCleanup(() => {
    isUnmounted = true;
    const update = availableUpdate();
    if (!update) {
      return;
    }

    void update.close().catch(() => {
      // no-op
    });
  });

  return (
    <>
      <Dialog
        onOpenChange={(open) => {
          if (isInstalling()) {
            return;
          }

          setIsDialogOpen(open);
        }}
        open={isDialogOpen()}
      >
        <DialogContent class="max-w-md rounded-sm border border-slate-300/80 bg-white p-0 text-slate-900 shadow-[0_28px_90px_rgba(148,163,184,0.34)] dark:border-slate-700/70 dark:bg-slate-950 dark:text-slate-100 dark:shadow-[0_28px_90px_rgba(2,6,23,0.75)]">
          <DialogHeader class="gap-2 border-b border-slate-300/80 bg-[linear-gradient(145deg,rgba(248,250,252,0.96),rgba(241,245,249,0.92))] px-5 py-4 dark:border-slate-800 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.92),rgba(2,6,23,0.84))]">
            <DialogTitle class="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
              {isReadyToRestart() ? "Update installed" : "Update available"}
            </DialogTitle>
            <DialogDescription class="text-xs text-slate-500 dark:text-slate-400">
              <Show
                fallback={`Version ${availableUpdate()?.version ?? "new"} is ready to install.`}
                when={isReadyToRestart()}
              >
                Update installed successfully. Restart now to use the latest version.
              </Show>
            </DialogDescription>
          </DialogHeader>

          <div class="space-y-2 px-5 py-4 text-xs text-slate-600 dark:text-slate-300">
            <Show when={!isReadyToRestart() && availableUpdate()?.currentVersion}>
              <p>
                Current version:{" "}
                <span class="font-medium text-slate-800 dark:text-slate-100">
                  {availableUpdate()?.currentVersion}
                </span>
              </p>
            </Show>
            <Show when={availableUpdate()?.version}>
              <p>
                New version:{" "}
                <span class="font-medium text-slate-800 dark:text-slate-100">
                  {availableUpdate()?.version}
                </span>
              </p>
            </Show>
            <Show when={isInstalling()}>
              <div class="rounded-sm border border-cyan-300/45 bg-cyan-300/12 px-2.5 py-2 text-cyan-900 dark:border-cyan-300/35 dark:bg-cyan-300/14 dark:text-cyan-100">
                Downloading and installing update
                <Show when={downloadPercent() !== null}>
                  {` (${downloadPercent()}%)`}
                </Show>
                ...
              </div>
            </Show>
          </div>

          <DialogFooter class="gap-2 border-t border-slate-300/80 px-5 py-4 dark:border-slate-800">
            <Button
              disabled={isInstalling()}
              onClick={() => {
                setIsDialogOpen(false);
              }}
              size="sm"
              variant="outline"
            >
              Later
            </Button>
            <Show
              fallback={
                <Button
                  disabled={isInstalling()}
                  onClick={() => {
                    void installUpdate();
                  }}
                  size="sm"
                >
                  <Download class="size-4" />
                  {isInstalling() ? "Installing..." : "Install Update"}
                </Button>
              }
              when={isReadyToRestart()}
            >
              <Button
                onClick={() => {
                  void restartApp();
                }}
                size="sm"
              >
                <RefreshCcw class="size-4" />
                Restart Now
              </Button>
            </Show>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Show when={notice()}>
        {(activeNotice) => (
          <aside
            classList={{
              "fixed right-4 bottom-4 z-50 w-[min(92vw,24rem)] rounded-sm p-3 backdrop-blur": true,
              "border border-amber-300/60 bg-amber-100/95 text-amber-900 shadow-[0_14px_45px_rgba(120,53,15,0.35)] dark:border-amber-400/40 dark:bg-amber-900/35 dark:text-amber-100":
                activeNotice().variant === "error",
              "border border-cyan-300/50 bg-cyan-100/95 text-cyan-900 shadow-[0_14px_45px_rgba(14,116,144,0.28)] dark:border-cyan-300/40 dark:bg-cyan-900/35 dark:text-cyan-100":
                activeNotice().variant === "info",
            }}
          >
            <div class="flex items-start gap-2">
              <TriangleAlert class="mt-0.5 size-4 shrink-0" />
              <div class="min-w-0 flex-1 space-y-1">
                <p class="text-xs font-semibold uppercase tracking-[0.1em]">
                  {activeNotice().title}
                </p>
                <p class="text-xs leading-relaxed">{activeNotice().message}</p>
              </div>
            </div>
            <Button
              class="mt-3"
              onClick={() => {
                setNotice(null);
              }}
              size="sm"
              variant="outline"
            >
              Dismiss
            </Button>
          </aside>
        )}
      </Show>
    </>
  );
}
