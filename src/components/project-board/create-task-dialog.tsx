import type { DexTask } from "@/lib/tasks-service";
import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import { createProjectTask } from "@/lib/tasks-service";
import { getTaskMutationErrorMessage, getTaskStatusLabel } from "./model";
import { SectionCard, boardDialogSurfaceClass, boardSurfaceVariants } from "./shared";

type CreateTaskFormValues = {
  name: string;
  description: string;
  priority: string;
  parentId: string;
  blockedBy: string[];
};

const INITIAL_CREATE_TASK_FORM: CreateTaskFormValues = {
  name: "",
  description: "",
  priority: "1",
  parentId: "",
  blockedBy: [],
};

type CreateTaskDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  projectName: string;
  projectPath: string | null;
  relationOptions: DexTask[];
};

export function CreateTaskDialog({
  open,
  setOpen,
  projectName,
  projectPath,
  relationOptions,
}: CreateTaskDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const blockersAnchorRef = useComboboxAnchor();
  const relationItems = useMemo(
    () =>
      relationOptions.map((task) => ({
        value: task.id,
        label: task.name,
        status: getTaskStatusLabel(task),
      })),
    [relationOptions],
  );
  const hasTaskRelationOptions = relationItems.length > 0;
  const form = useForm({
    defaultValues: INITIAL_CREATE_TASK_FORM,
    onSubmit: async ({ value }) => {
      if (!projectPath) {
        setError("Choose a project before you add a task.");
        return;
      }

      setError(null);

      const parsedPriority = Number.parseInt(value.priority.trim(), 10);
      await createProjectTask(projectPath, {
        name: value.name.trim(),
        description: value.description.trim() || null,
        priority: Number.isNaN(parsedPriority) ? 1 : parsedPriority,
        parentId: value.parentId || null,
        blockedBy: value.blockedBy,
      });

      form.reset();
      setOpen(false);
    },
  });
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    form.reset();
  }, [form, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) {
      return;
    }

    if (!nextOpen) {
      setError(null);
      form.reset();
    }

    setOpen(nextOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await form.handleSubmit();
    } catch (submitError) {
      setError(getTaskMutationErrorMessage(submitError));
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className={`!flex !max-h-[min(88vh,48rem)] !min-h-0 !w-[min(92vw,38rem)] !max-w-[38rem] !flex-col !overflow-hidden !p-0 !text-foreground ${boardDialogSurfaceClass}`}
      >
        <DialogHeader className="gap-2 border-b border-border/75 px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Add task
          </p>
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
            void handleSubmit(event);
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
              <SectionCard
                description="Write a title that still makes sense in a busy board."
                eyebrow="Core"
                headerClassName="min-h-[5.5rem]"
                surface
                title="Task"
              >
                <form.Field
                  name="name"
                  validators={{
                    onChange: ({ value }) => {
                      if (!value.trim()) {
                        return "Enter a task title.";
                      }

                      return undefined;
                    },
                    onSubmit: ({ value }) => {
                      if (!value.trim()) {
                        return "Enter a task title.";
                      }

                      return undefined;
                    },
                  }}
                >
                  {(field) => {
                    const nameError = getFieldErrorMessage(field.state.meta.errors);

                    return (
                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-foreground">Task Title</span>
                        <Input
                          aria-invalid={nameError ? "true" : undefined}
                          autoFocus
                          disabled={isSubmitting}
                          onBlur={field.handleBlur}
                          onChange={(event) => {
                            field.handleChange(event.currentTarget.value);
                            if (error) {
                              setError(null);
                            }
                          }}
                          placeholder="Tighten board filters"
                          value={field.state.value}
                        />
                        {nameError ? (
                          <p className="text-xs font-medium text-destructive">{nameError}</p>
                        ) : null}
                      </label>
                    );
                  }}
                </form.Field>
              </SectionCard>

              <SectionCard
                description="Lower numbers mean higher priority in dex."
                eyebrow="Priority"
                headerClassName="min-h-[5.5rem]"
                surface
                title="Priority"
              >
                <form.Field name="priority">
                  {(field) => (
                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-foreground">Priority</span>
                      <Input
                        disabled={isSubmitting}
                        min="1"
                        onBlur={field.handleBlur}
                        onChange={(event) => {
                          field.handleChange(event.currentTarget.value);
                          if (error) {
                            setError(null);
                          }
                        }}
                        placeholder="1"
                        type="number"
                        value={field.state.value}
                      />
                    </label>
                  )}
                </form.Field>
              </SectionCard>
            </div>

            <SectionCard
              description="Add scope, context, or a definition of done if the title is not enough."
              eyebrow="Context"
              surface
              title="Description"
            >
              <form.Field name="description">
                {(field) => (
                  <Textarea
                    className="min-h-28 resize-y"
                    disabled={isSubmitting}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.currentTarget.value);
                      if (error) {
                        setError(null);
                      }
                    }}
                    placeholder="What needs to happen, what is in scope, and what done looks like."
                    value={field.state.value}
                  />
                )}
              </form.Field>
            </SectionCard>

            <div className="grid gap-4">
              <SectionCard
                description={
                  hasTaskRelationOptions
                    ? "Link this to a parent task only when it belongs in a larger thread."
                    : "You can add a parent task after this project has tasks."
                }
                eyebrow="Relationships"
                surface
                title="Parent Task"
              >
                <form.Field name="parentId">
                  {(field) => {
                    const selectedParentItem =
                      relationItems.find((item) => item.value === field.state.value) ?? null;

                    return hasTaskRelationOptions ? (
                      <Combobox
                        items={relationItems}
                        onValueChange={(item) => {
                          field.handleChange(item?.value ?? "");
                          if (error) {
                            setError(null);
                          }
                        }}
                        value={selectedParentItem}
                      >
                        <ComboboxInput
                          disabled={isSubmitting}
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
                    );
                  }}
                </form.Field>
              </SectionCard>

              <SectionCard
                description={
                  hasTaskRelationOptions
                    ? "Add blockers when dependencies affect the work."
                    : "Add another task before you set blockers."
                }
                eyebrow="Relationships"
                surface
                title="Blocked By"
              >
                <form.Field name="blockedBy">
                  {(field) => {
                    const selectedBlockedItems = relationItems.filter((item) =>
                      field.state.value.includes(item.value),
                    );

                    return hasTaskRelationOptions ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span>{field.state.value.length} selected</span>
                        </div>
                        <Combobox
                          items={relationItems}
                          multiple
                          onValueChange={(items) => {
                            field.handleChange(items.map((item) => item.value));
                            if (error) {
                              setError(null);
                            }
                          }}
                          value={selectedBlockedItems}
                        >
                          <ComboboxChips
                            className="min-h-9 border-border bg-background"
                            ref={blockersAnchorRef}
                          >
                            <ComboboxChipsInput
                              className="text-sm"
                              disabled={isSubmitting}
                              placeholder={
                                field.state.value.length > 0 ? "" : "Search for blocking tasks"
                              }
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
                    );
                  }}
                </form.Field>
              </SectionCard>
            </div>

            {error ? (
              <div
                className={`${boardSurfaceVariants({
                  tone: "subtle",
                })} border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive shadow-none`}
              >
                {error}
              </div>
            ) : null}
          </div>

          <div className="border-t border-border/75 px-6 py-5">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                disabled={isSubmitting}
                onClick={() => handleOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button className="px-4" disabled={isSubmitting} type="submit">
                <Plus className="size-4" />
                <span>{isSubmitting ? "Adding..." : "Add Task"}</span>
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getFieldErrorMessage(errors: unknown[]): string | null {
  for (const error of errors) {
    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }

  return null;
}
