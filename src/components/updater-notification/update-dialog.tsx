import { Download, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateInlineStatusVariants } from "./styles";

type UpdateDialogProps = {
  open: boolean;
  currentVersion: string;
  availableUpdateVersion: string | null;
  isInstalling: boolean;
  isReadyToRestart: boolean;
  downloadPercent: number | null;
  onOpenChange: (open: boolean) => void;
  onInstallUpdate: () => void;
  onRestartApp: () => void;
};

export function UpdateDialog({
  open,
  currentVersion,
  availableUpdateVersion,
  isInstalling,
  isReadyToRestart,
  downloadPercent,
  onOpenChange,
  onInstallUpdate,
  onRestartApp,
}: UpdateDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md border border-border bg-panel p-0 text-foreground">
        <DialogHeader className="gap-2 border-b border-border bg-background px-5 py-4">
          <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
            {isReadyToRestart ? "Update installed" : "Update available"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isReadyToRestart
              ? "Update installed successfully. Restart now to use the latest version."
              : `Version ${availableUpdateVersion ?? "new"} is ready to install.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 px-5 py-4 text-xs text-muted-foreground">
          {!isReadyToRestart ? (
            <p>
              Current version: <span className="font-medium text-foreground">{currentVersion}</span>
            </p>
          ) : null}
          {availableUpdateVersion ? (
            <p>
              New version:{" "}
              <span className="font-medium text-foreground">{availableUpdateVersion}</span>
            </p>
          ) : null}
          {isInstalling ? (
            <div className={updateInlineStatusVariants({ tone: "active" })}>
              Downloading and installing update
              {downloadPercent !== null ? ` (${downloadPercent}%)` : ""}
              ...
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 border-t border-border px-5 py-4">
          <Button
            disabled={isInstalling}
            onClick={() => onOpenChange(false)}
            size="sm"
            variant="outline"
          >
            Later
          </Button>
          {isReadyToRestart ? (
            <Button onClick={onRestartApp} size="sm">
              <RefreshCcw className="size-4" />
              Restart Now
            </Button>
          ) : (
            <Button disabled={isInstalling} onClick={onInstallUpdate} size="sm">
              <Download className="size-4" />
              {isInstalling ? "Installing..." : "Install Update"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
