import { useMemo } from "react";
import { Download, RefreshCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdater } from "@/contexts/updater-context";

export function UpdaterNotification() {
  const {
    availableUpdateVersion,
    contentLength,
    currentVersion,
    dismissNotice,
    downloadedBytes,
    installUpdate,
    isDialogOpen,
    isInstalling,
    isReadyToRestart,
    notice,
    restartApp,
    setIsDialogOpen,
  } = useUpdater();

  const downloadPercent = useMemo(() => {
    if (!contentLength || contentLength <= 0) {
      return null;
    }

    return Math.min(100, Math.round((downloadedBytes / contentLength) * 100));
  }, [contentLength, downloadedBytes]);

  return (
    <>
      <Dialog
        onOpenChange={(open) => {
          if (isInstalling) {
            return;
          }

          setIsDialogOpen(open);
        }}
        open={isDialogOpen}
      >
        <DialogContent className="max-w-md rounded-sm border border-slate-300/80 bg-white p-0 text-slate-900 shadow-[0_28px_90px_rgba(148,163,184,0.34)] dark:border-slate-700/70 dark:bg-slate-950 dark:text-slate-100 dark:shadow-[0_28px_90px_rgba(2,6,23,0.75)]">
          <DialogHeader className="gap-2 border-b border-slate-300/80 bg-[linear-gradient(145deg,rgba(248,250,252,0.96),rgba(241,245,249,0.92))] px-5 py-4 dark:border-slate-800 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.92),rgba(2,6,23,0.84))]">
            <DialogTitle className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
              {isReadyToRestart ? "Update installed" : "Update available"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              {isReadyToRestart
                ? "Update installed successfully. Restart now to use the latest version."
                : `Version ${availableUpdateVersion ?? "new"} is ready to install.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 px-5 py-4 text-xs text-slate-600 dark:text-slate-300">
            {!isReadyToRestart ? (
              <p>
                Current version:{" "}
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {currentVersion}
                </span>
              </p>
            ) : null}
            {availableUpdateVersion ? (
              <p>
                New version:{" "}
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {availableUpdateVersion}
                </span>
              </p>
            ) : null}
            {isInstalling ? (
              <div className="rounded-sm border border-cyan-300/45 bg-cyan-300/12 px-2.5 py-2 text-cyan-900 dark:border-cyan-300/35 dark:bg-cyan-300/14 dark:text-cyan-100">
                Downloading and installing update
                {downloadPercent !== null ? ` (${downloadPercent}%)` : ""}
                ...
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 border-t border-slate-300/80 px-5 py-4 dark:border-slate-800">
            <Button
              disabled={isInstalling}
              onClick={() => {
                setIsDialogOpen(false);
              }}
              size="sm"
              variant="outline"
            >
              Later
            </Button>
            {isReadyToRestart ? (
              <Button
                onClick={() => {
                  void restartApp();
                }}
                size="sm"
              >
                <RefreshCcw className="size-4" />
                Restart Now
              </Button>
            ) : (
              <Button
                disabled={isInstalling}
                onClick={() => {
                  void installUpdate();
                }}
                size="sm"
              >
                <Download className="size-4" />
                {isInstalling ? "Installing..." : "Install Update"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {notice ? (
        <aside
          className={
            notice.variant === "error"
              ? "fixed right-4 bottom-4 z-50 w-[min(92vw,24rem)] rounded-sm border border-amber-300/60 bg-amber-100/95 p-3 text-amber-900 shadow-[0_14px_45px_rgba(120,53,15,0.35)] backdrop-blur dark:border-amber-400/40 dark:bg-amber-900/35 dark:text-amber-100"
              : "fixed right-4 bottom-4 z-50 w-[min(92vw,24rem)] rounded-sm border border-cyan-300/50 bg-cyan-100/95 p-3 text-cyan-900 shadow-[0_14px_45px_rgba(14,116,144,0.28)] backdrop-blur dark:border-cyan-300/40 dark:bg-cyan-900/35 dark:text-cyan-100"
          }
        >
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.1em]">{notice.title}</p>
              <p className="text-xs leading-relaxed">{notice.message}</p>
            </div>
          </div>
          <Button
            className="mt-3"
            onClick={() => {
              dismissNotice();
            }}
            size="sm"
            variant="outline"
          >
            Dismiss
          </Button>
        </aside>
      ) : null}
    </>
  );
}
