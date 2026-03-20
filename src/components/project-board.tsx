import type { ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FolderSearch,
  KanbanSquare,
  ListTodo,
  LoaderCircle,
  OctagonAlert,
  PartyPopper,
  Plus,
  type LucideIcon,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { DexTask } from "@/lib/tasks-service";

export type KanbanColumnKey = "todo" | "inProgress" | "blocked" | "done";
export type TaskFilterKey = "all" | "blocked" | "inProgress" | "highPriority";

export const KANBAN_COLUMNS: Array<{
  key: KanbanColumnKey;
  label: string;
  compactLabel: string;
  icon: LucideIcon;
}> = [
  { key: "todo", label: "Todo", compactLabel: "Todo", icon: ListTodo },
  { key: "inProgress", label: "In Progress", compactLabel: "Doing", icon: LoaderCircle },
  { key: "blocked", label: "Blocked", compactLabel: "Blocked", icon: OctagonAlert },
  { key: "done", label: "Done", compactLabel: "Done", icon: PartyPopper },
];

export type CreateTaskFormState = {
  name: string;
  description: string;
  priority: string;
  parentId: string;
  blockedBy: string[];
};

type ProjectBoardHeaderProps = {
  projectName: string;
  projectPath: string;
  totalTasks: number;
  openTasks: number;
  onAddTask: () => void;
};

type BoardSummaryRailProps = {
  totalTasks: number;
  openTasks: number;
  blockedTasks: number;
  doneTasks: number;
  activeFilter: TaskFilterKey;
  onFilterChange: (value: TaskFilterKey) => void;
};

type KanbanColumnProps = {
  column: (typeof KANBAN_COLUMNS)[number];
  tasks: DexTask[];
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenTask: (taskId: string) => void;
  getSubtaskProgress: (taskId: string) => { completed: number; total: number } | undefined;
  getTaskStatusTone: (task: DexTask) => "neutral" | "active" | "warning" | "success";
};

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

type TaskDetailsDialogProps = {
  open: boolean;
  selectedTask: DexTask | null;
  selectedTaskParent: DexTask | null;
  selectedTaskSubtasks: DexTask[];
  onOpenChange: (open: boolean) => void;
  onOpenTask: (taskId: string) => void;
  formatTaskDate: (value: string | null) => string;
  getTaskStatusLabel: (task: Pick<DexTask, "completed" | "startedAt" | "blockedBy">) => string;
  getTaskStatusTone: (task: DexTask) => "neutral" | "active" | "warning" | "success";
};

function formatShortPath(path: string): string {
  const segments = path.split("/").filter(Boolean);
  if (segments.length <= 3) {
    return path;
  }

  return `…/${segments.slice(-3).join("/")}`;
}

function statusToneClasses(tone: "neutral" | "active" | "warning" | "success") {
  if (tone === "active") {
    return "border-[color:var(--status-active-border)] bg-[color:var(--status-active-bg)] text-[color:var(--status-active-fg)]";
  }

  if (tone === "warning") {
    return "border-[color:var(--status-warning-border)] bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning-fg)]";
  }

  if (tone === "success") {
    return "border-[color:var(--status-success-border)] bg-[color:var(--status-success-bg)] text-[color:var(--status-success-fg)]";
  }

  return "border-border/70 bg-muted/70 text-muted-foreground";
}

function statusTextClasses(tone: "neutral" | "active" | "warning" | "success") {
  if (tone === "active") {
    return "text-[color:var(--status-active-fg)]";
  }

  if (tone === "warning") {
    return "text-[color:var(--status-warning-fg)]";
  }

  if (tone === "success") {
    return "text-[color:var(--status-success-fg)]";
  }

  return "text-muted-foreground";
}

function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "active" | "warning" | "success";
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-semibold tracking-tight text-foreground", statusTextClasses(tone))}>
        {value}
      </p>
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
  headerClassName,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  headerClassName?: string;
}) {
  return (
    <section className="space-y-3">
      <div className={cn("space-y-1", headerClassName)}>
        <p className="text-[11px] font-medium text-muted-foreground">{eyebrow}</p>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

export function ProjectBoardHeader({
  projectName,
  projectPath,
  totalTasks,
  openTasks,
  onAddTask,
}: ProjectBoardHeaderProps) {
  return (
    <section className="border-b border-border/70 pb-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
            <KanbanSquare className="size-3.5" />
            <span>Board</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">
              {projectName}
            </h1>
            <p className="truncate text-sm text-muted-foreground">{formatShortPath(projectPath)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{openTasks} open</span>
            <span>{totalTasks} total</span>
          </div>
        </div>

        <Button
          className="h-10 rounded-full px-5"
          onClick={onAddTask}
        >
          <Plus className="size-4" />
          <span>Add Task</span>
        </Button>
      </div>
    </section>
  );
}

export function BoardSummaryRail({
  totalTasks,
  openTasks,
  blockedTasks,
  doneTasks,
  activeFilter,
  onFilterChange,
}: BoardSummaryRailProps) {
  const filters: Array<{ key: TaskFilterKey; label: string }> = [
    { key: "all", label: "All" },
    { key: "blocked", label: "Blocked" },
    { key: "inProgress", label: "In Progress" },
    { key: "highPriority", label: "High Priority" },
  ];

  return (
    <section className="flex flex-col gap-3 border-b border-border/70 pb-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = filter.key === activeFilter;

          return (
            <button
              key={filter.key}
              type="button"
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={() => onFilterChange(filter.key)}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <StatTile label="Open" tone="active" value={String(openTasks)} />
        <StatTile label="Blocked" tone="warning" value={String(blockedTasks)} />
        <StatTile label="Done" tone="success" value={String(doneTasks)} />
        <StatTile label="Total" tone="neutral" value={String(totalTasks)} />
      </div>
    </section>
  );
}

export function KanbanColumn({
  column,
  tasks,
  isCollapsed,
  onToggleCollapsed,
  onOpenTask,
  getSubtaskProgress,
  getTaskStatusTone,
}: KanbanColumnProps) {
  const Icon = column.icon;

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background/40",
        isCollapsed ? "w-[88px] shrink-0" : "min-w-[292px] flex-1 basis-0",
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          {!isCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{column.label}</p>
              <p className="text-[11px] text-muted-foreground">{tasks.length}</p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={onToggleCollapsed}
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${column.label} column`}
        >
          {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </header>

      {isCollapsed ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 py-4 text-center">
          <Icon className="size-5 text-muted-foreground" />
          <p className="text-[11px] font-medium text-muted-foreground">{column.compactLabel}</p>
          <p className="text-xs font-semibold text-foreground">{tasks.length}</p>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                getSubtaskProgress={getSubtaskProgress}
                onOpen={() => onOpenTask(task.id)}
                statusTone={getTaskStatusTone(task)}
                task={task}
              />
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center">
              <p className="text-sm font-medium text-foreground">Nothing here</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Tasks move here as work changes.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function TaskCard({
  task,
  statusTone,
  onOpen,
  getSubtaskProgress,
}: {
  task: DexTask;
  statusTone: "neutral" | "active" | "warning" | "success";
  onOpen: () => void;
  getSubtaskProgress: (taskId: string) => { completed: number; total: number } | undefined;
}) {
  const progress = getSubtaskProgress(task.id);
  const statusLabel = task.completed
    ? "Done"
    : task.blockedBy.length > 0
      ? "Blocked"
      : task.startedAt
        ? "In Progress"
        : "Todo";

  return (
    <button
      type="button"
      className="w-full rounded-lg border border-border/70 bg-background px-3 py-3 text-left transition-colors hover:border-foreground/15 hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <span className={cn("font-medium", statusTextClasses(statusTone))}>{statusLabel}</span>
            {task.priority !== null ? <span className="text-muted-foreground">P{task.priority}</span> : null}
            {progress ? (
              <span className="text-muted-foreground">
                {progress.completed}/{progress.total} subtasks
              </span>
            ) : null}
          </div>
          <h4 className="mt-1 min-w-0 text-sm font-semibold leading-snug text-foreground">{task.name}</h4>
        </div>
      </div>

      {task.description ? (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{task.description}</p>
      ) : null}
    </button>
  );
}

export function EmptyProjectBoard({
  projectName,
  onAddTask,
}: {
  projectName: string;
  onAddTask: () => void;
}) {
  return (
    <section className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/75 p-8 text-center">
      <div className="max-w-lg">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted/60">
          <FolderSearch className="size-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">No tasks yet in {projectName}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Add the first task to start tracking work in this project.
        </p>
        <Button className="mt-6 rounded-full px-5" onClick={onAddTask}>
          <Plus className="size-4" />
          <span>Add First Task</span>
        </Button>
      </div>
    </section>
  );
}

export function ProjectBoardPlaceholder({
  isProjectsInitialized,
}: {
  isProjectsInitialized: boolean;
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <section className="w-full max-w-2xl px-8 py-10 text-center sm:px-12 sm:py-12">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted/60">
          <FolderSearch className="size-7 text-muted-foreground" />
        </div>
        {isProjectsInitialized ? (
          <>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Choose a project</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Pick one from the sidebar to scan its tasks at a glance and open details when you need more context.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Loading projects</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Loading your saved projects and dex watchers.
            </p>
          </>
        )}
      </section>
    </div>
  );
}

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
    status: task.completed ? "Done" : task.blockedBy.length > 0 ? "Blocked" : task.startedAt ? "In Progress" : "Todo",
  }));
  const selectedParentItem = relationItems.find((item) => item.value === form.parentId) ?? null;
  const selectedBlockedItems = relationItems.filter((item) => form.blockedBy.includes(item.value));
  const blockersAnchorRef = useComboboxAnchor();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="!flex !max-h-[min(88vh,48rem)] !w-[min(92vw,38rem)] !max-w-[38rem] !min-h-0 !flex-col !overflow-hidden !rounded-[1.25rem] !border !border-border/80 !bg-panel !p-0 !text-foreground shadow-[0_24px_72px_rgba(15,23,42,0.16)] dark:shadow-[0_24px_72px_rgba(2,6,23,0.42)]">
        <DialogHeader className="gap-2 border-b border-border/75 px-6 py-5">
          <p className="text-[11px] font-medium text-muted-foreground">Add task</p>
          <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">Add a task to {projectName}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">Start with the task itself. Add relationships only when they help.</DialogDescription>
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
                  {nameError ? <p className="text-xs font-medium text-destructive">{nameError}</p> : null}
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

            <SectionCard description="Add scope, context, or a definition of done if the title is not enough." eyebrow="Context" title="Description">
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
                        ref={blockersAnchorRef}
                        className="min-h-11 rounded-[1rem] bg-background/80"
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

export function TaskDetailsDialog({
  open,
  selectedTask,
  selectedTaskParent,
  selectedTaskSubtasks,
  onOpenChange,
  onOpenTask,
  formatTaskDate,
  getTaskStatusLabel,
  getTaskStatusTone,
}: TaskDetailsDialogProps) {
  const detailsTone = selectedTask ? getTaskStatusTone(selectedTask) : "neutral";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="!flex !max-h-[82vh] !min-h-0 !w-[min(92vw,46rem)] !max-w-[46rem] !flex-col !overflow-hidden !rounded-[1.35rem] !border !border-border/80 !bg-panel !p-0 !text-foreground shadow-[0_28px_84px_rgba(15,23,42,0.18)] dark:shadow-[0_28px_84px_rgba(2,6,23,0.46)]">
        <DialogHeader className="gap-3 border-b border-border/75 px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-medium text-muted-foreground">Task details</p>
            {selectedTask ? (
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                  statusToneClasses(detailsTone),
                )}
              >
                {getTaskStatusLabel(selectedTask)}
              </span>
            ) : null}
          </div>
          <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
            {selectedTask?.name ?? "Unknown task"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Review the details without leaving the board.
          </DialogDescription>
        </DialogHeader>

        {selectedTask ? (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile label="Status" tone={detailsTone} value={getTaskStatusLabel(selectedTask)} />
              <StatTile
                label="Priority"
                value={selectedTask.priority === null ? "Unset" : `P${selectedTask.priority}`}
              />
              <StatTile label="Task ID" value={selectedTask.id} />
            </div>

            <SectionCard description="Use this to understand the task before looking at relationships." eyebrow="Description" title="Task context">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {selectedTask.description ?? "No description yet."}
              </p>
            </SectionCard>

            <div className="grid gap-4">
              <SectionCard description="Open parent and child tasks directly from here." eyebrow="Structure" title="Relationships">
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Parent
                    </p>
                    <div className="mt-2">
                      {selectedTask.parentId ? (
                        selectedTaskParent ? (
                          <button
                            type="button"
                            className="rounded-full border border-border/70 bg-background px-3 py-1.5 font-medium text-foreground transition-colors hover:border-primary/25 hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                            onClick={() => onOpenTask(selectedTaskParent.id)}
                          >
                            {selectedTaskParent.name}
                          </button>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">
                            {selectedTask.parentId}
                          </span>
                        )
                      ) : (
                        <p className="text-muted-foreground">This task has no parent.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Subtasks
                    </p>
                    {selectedTaskSubtasks.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedTaskSubtasks.map((subtask) => (
                          <button
                            key={subtask.id}
                            type="button"
                            className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/25 hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                            onClick={() => onOpenTask(subtask.id)}
                          >
                            {subtask.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-muted-foreground">No subtasks yet.</p>
                    )}
                  </div>
                </div>
              </SectionCard>

              <SectionCard description="Use blockers to understand what is holding work up." eyebrow="Dependencies" title="Blockers">
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Blocked By
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedTask.blockedBy.length > 0 ? (
                        selectedTask.blockedBy.map((taskId) => (
                          <span
                            key={taskId}
                            className="rounded-full border border-border/70 bg-background px-2.5 py-1 font-mono text-xs text-muted-foreground"
                          >
                            {taskId}
                          </span>
                        ))
                      ) : (
                        <p className="text-muted-foreground">Nothing is blocking this task.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Blocks
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedTask.blocks.length > 0 ? (
                        selectedTask.blocks.map((taskId) => (
                          <span
                            key={taskId}
                            className="rounded-full border border-border/70 bg-background px-2.5 py-1 font-mono text-xs text-muted-foreground"
                          >
                            {taskId}
                          </span>
                        ))
                      ) : (
                        <p className="text-muted-foreground">This task is not blocking anything.</p>
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard
              description="Use these timestamps to see when the task moved or changed."
              eyebrow="Timeline"
              title="Timeline"
            >
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                  ["Started", formatTaskDate(selectedTask.startedAt)],
                  ["Completed", formatTaskDate(selectedTask.completedAt)],
                  ["Created", formatTaskDate(selectedTask.createdAt)],
                  ["Updated", formatTaskDate(selectedTask.updatedAt)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1rem] border border-border/75 bg-background/80 px-4 py-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>
          </div>
        ) : (
          <p className="m-6 rounded-[1rem] border border-[color:var(--status-warning-border)] bg-[color:var(--status-warning-bg)] px-4 py-3 text-sm text-[color:var(--status-warning-fg)]">
            This task is no longer available.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
