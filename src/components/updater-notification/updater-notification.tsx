import { useMemo } from "react";
import { useUpdater } from "@/contexts/updater-context";
import { UpdateDialog } from "./update-dialog";
import { UpdateNotice } from "./update-notice";

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
      <UpdateDialog
        availableUpdateVersion={availableUpdateVersion}
        currentVersion={currentVersion}
        downloadPercent={downloadPercent}
        isInstalling={isInstalling}
        isReadyToRestart={isReadyToRestart}
        onInstallUpdate={() => {
          void installUpdate();
        }}
        onOpenChange={(open) => {
          if (isInstalling) {
            return;
          }

          setIsDialogOpen(open);
        }}
        onRestartApp={() => {
          void restartApp();
        }}
        open={isDialogOpen}
      />

      {notice ? (
        <UpdateNotice
          notice={notice}
          onDismiss={() => {
            dismissNotice();
          }}
        />
      ) : null}
    </>
  );
}
