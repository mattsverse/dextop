import type { DexTask } from "@/lib/tasks-service";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getTaskStatusLabel, type CreateTaskFormState } from "./model";
import { SectionCard } from "./shared";

type CreateTaskDialogProps = {
  open: boolean;
  projectName: string;
  form: CreateTaskFormState;
  nameError: string | null;
  error: string | null;
  hasTaskRelationOptions: boolean;
  relationOptions: DexTask[];
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: <K extends keyof CreateTaskFormState>(
    field: K,
    value: CreateTaskFormState[K],
  ) => void;
  onToggleBlockedBy: (taskId: string, checked: boolean) => void;
  onNameInput: (value: string) => void;
  onSubmit: () => void;
};

export function CreateTaskDialog({
  open,
  projectName,
  form,
  nameError,
  error,
  hasTaskRelationOptions,
  relationOptions,
  isPending,
  onOpenChange,
  onFormChange,
  onToggleBlockedBy,
  onNameInput,
  onSubmit,
}: CreateTaskDialogProps) {
  const relationItems = relationOptions.map((task) => ({
    value: task.id,
    label: task.name,
    status: getTaskStatusLabel(task),
  }));
  const selectedParentItem = relationItems.find((item) => item.value === form.parentId) ?? null;
  const selectedBlockedItems = relationItems.filter((item) => form.blockedBy.includes(item.value));
  const blockersAnchorRef = useComboboxAnchor();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="!flex !max-h-[min(88vh,48rem)] !min-h-0 !w-[min(92vw,38rem)] !max-w-[38rem] !flex-col !overflow-hidden !rounded-[1.25rem] !border !border-border/80 !bg-panel !p-0 !text-foreground shadow-[0_24px_72px_rgba(15,23,42,0.16)] dark:shadow-[0_24px_72px_rgba(2,6,23,0.42)]">
        <DialogHeader className="gap-2 border-b border-border/75 px-6 py-5">
          <p className="text-[11px] font-medium text-muted-foreground">Add task</p>
          <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
            Add a task to {projectName}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Start with the task itself. Add relationships only when they help.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
              <SectionCard
                description="Write a title that still makes sense in a busy board."
                eyebrow="Core"
                headerClassName="min-h-[5.5rem]"
                title="Task"
              >
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Task Title</span>
                  <Input
                    aria-invalid={nameError ? "true" : undefined}
                    autoFocus
                    disabled={isPending}
                    onChange={(event) => onNameInput(event.currentTarget.value)}
                    placeholder="Tighten board filters"
                    value={form.name}
                  />
                  {nameError ? (
                    <p className="text-xs font-medium text-destructive">{nameError}</p>
                  ) : null}
                </label>
              </SectionCard>

              <SectionCard
                description="Lower numbers mean higher priority in dex."
                eyebrow="Priority"
                headerClassName="min-h-[5.5rem]"
                title="Priority"
              >
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Priority</span>
                  <Input
                    disabled={isPending}
                    min="1"
                    onChange={(event) => onFormChange("priority", event.currentTarget.value)}
                    placeholder="1"
                    type="number"
                    value={form.priority}
                  />
                </label>
              </SectionCard>
            </div>

            <SectionCard
              description="Add scope, context, or a definition of done if the title is not enough."
              eyebrow="Context"
              title="Description"
            >
              <Textarea
                className="min-h-28 resize-y"
                disabled={isPending}
                onChange={(event) => onFormChange("description", event.currentTarget.value)}
                placeholder="What needs to happen, what is in scope, and what done looks like."
                value={form.description}
              />
            </SectionCard>

            <div className="grid gap-4">
              <SectionCard
                description={
                  hasTaskRelationOptions
                    ? "Link this to a parent task only when it belongs in a larger thread."
                    : "You can add a parent task after this project has tasks."
                }
                eyebrow="Relationships"
                title="Parent Task"
              >
                {hasTaskRelationOptions ? (
                  <Combobox
                    items={relationItems}
                    onValueChange={(item) => {
                      onFormChange("parentId", item?.value ?? "");
                    }}
                    value={selectedParentItem}
                  >
                    <ComboboxInput
                      disabled={isPending}
                      placeholder="Search for a parent task"
                      showClear
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>No tasks match that search.</ComboboxEmpty>
                      <ComboboxList>
                        <ComboboxItem value={null}>No parent</ComboboxItem>
                        <ComboboxCollection>
                          {(item: (typeof relationItems)[number]) => (
                            <ComboboxItem key={item.value} value={item}>
                              <div className="min-w-0">
                                <div className="truncate font-medium">{item.label}</div>
                                <div className="truncate text-[11px] text-muted-foreground">
                                  {item.value} • {item.status}
                                </div>
                              </div>
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                ) : (
                  <Input disabled placeholder="Add a task first" value="" />
                )}
              </SectionCard>

              <SectionCard
                description={
                  hasTaskRelationOptions
                    ? "Add blockers when dependencies affect the work."
                    : "Add another task before you set blockers."
                }
                eyebrow="Relationships"
                title="Blocked By"
              >
                {hasTaskRelationOptions ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{form.blockedBy.length} selected</span>
                    </div>
                    <Combobox
                      items={relationItems}
                      multiple
                      onValueChange={(items) => {
                        const nextIds = items.map((item) => item.value);
                        const currentIds = new Set(form.blockedBy);

                        for (const currentId of form.blockedBy) {
                          if (!nextIds.includes(currentId)) {
                            onToggleBlockedBy(currentId, false);
                          }
                        }

                        for (const nextId of nextIds) {
                          if (!currentIds.has(nextId)) {
                            onToggleBlockedBy(nextId, true);
                          }
                        }
                      }}
                      value={selectedBlockedItems}
                    >
                      <ComboboxChips
                        className="min-h-11 rounded-[1rem] bg-background/80"
                        ref={blockersAnchorRef}
                      >
                        <ComboboxChipsInput
                          className="text-sm"
                          disabled={isPending}
                          placeholder={form.blockedBy.length > 0 ? "" : "Search for blocking tasks"}
                        />
                      </ComboboxChips>
                      <ComboboxContent anchor={blockersAnchorRef}>
                        <ComboboxEmpty>No tasks match that search.</ComboboxEmpty>
                        <ComboboxList>
                          <ComboboxCollection>
                            {(item: (typeof relationItems)[number]) => (
                              <ComboboxItem key={item.value} value={item}>
                                <div className="min-w-0">
                                  <div className="truncate font-medium">{item.label}</div>
                                  <div className="truncate text-[11px] text-muted-foreground">
                                    {item.value} • {item.status}
                                  </div>
                                </div>
                              </ComboboxItem>
                            )}
                          </ComboboxCollection>
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  </div>
                ) : (
                  <Input disabled placeholder="Add another task first" value="" />
                )}
              </SectionCard>
            </div>

            {error ? (
              <div className="rounded-[1rem] border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </div>

          <div className="border-t border-border/75 px-6 py-5">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                disabled={isPending}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button className="rounded-full px-5" disabled={isPending} type="submit">
                <Plus className="size-4" />
                <span>{isPending ? "Adding..." : "Add Task"}</span>
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
