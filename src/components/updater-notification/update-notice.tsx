import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateNoticeVariants } from "./styles";

type UpdateNoticeProps = {
  notice: {
    title: string;
    message: string;
    variant: "error" | "info";
  };
  onDismiss: () => void;
};

export function UpdateNotice({ notice, onDismiss }: UpdateNoticeProps) {
  return (
    <aside className={updateNoticeVariants({ variant: notice.variant })}>
      <div className="flex items-start gap-2">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.1em]">{notice.title}</p>
          <p className="text-xs leading-relaxed">{notice.message}</p>
        </div>
      </div>
      <Button className="mt-3" onClick={onDismiss} size="sm" variant="outline">
        Dismiss
      </Button>
    </aside>
  );
}
