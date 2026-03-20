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
    <div
      className={cn(
        "rounded-lg border px-3 py-3",
        tone === "neutral" ? "border-border/80 bg-panel/85 text-foreground" : statusToneClasses(tone),
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/75 bg-panel/88 p-4 shadow-[0_20px_55px_rgba(30,41,59,0.08)] dark:shadow-[0_24px_60px_rgba(2,6,23,0.28)]">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </p>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="mt-4">{children}</div>
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
    <section className="rounded-[1.5rem] border border-border/70 bg-panel/92 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_60px_rgba(2,6,23,0.34)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <KanbanSquare className="size-3.5" />
            Project Board
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground">{projectName}</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Review active work, blockers, and recent changes without leaving the board.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/70 bg-background/90 px-3 py-1">
              {formatShortPath(projectPath)}
            </span>
            <span className="rounded-full border border-border/70 bg-background/90 px-3 py-1">
              {totalTasks} tasks tracked
            </span>
            <span className="rounded-full border border-border/70 bg-background/90 px-3 py-1">
              {openTasks} still open
            </span>
          </div>
        </div>

        <Button
          className="h-10 rounded-full bg-primary px-5 text-primary-foreground shadow-[0_16px_30px_rgba(58,90,64,0.22)] hover:bg-primary/92"
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
    <section className="rounded-[1.35rem] border border-border/70 bg-panel/84 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Total" tone="neutral" value={String(totalTasks)} />
          <StatTile label="Open" tone="active" value={String(openTasks)} />
          <StatTile label="Blocked" tone="warning" value={String(blockedTasks)} />
          <StatTile label="Done" tone="success" value={String(doneTasks)} />
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Quick Filters
          </p>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const isActive = filter.key === activeFilter;

              return (
                <button
                  key={filter.key}
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "border-primary/40 bg-primary text-primary-foreground"
                      : "border-border/70 bg-background/85 text-muted-foreground hover:border-primary/25 hover:bg-panel",
                  )}
                  onClick={() => onFilterChange(filter.key)}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
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
        "flex min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-border/75 bg-panel/88",
        isCollapsed ? "w-[92px] shrink-0" : "min-w-[292px] flex-1 basis-0",
      )}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border/70 bg-panel/95 px-3 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-full border",
              statusToneClasses(
                column.key === "inProgress"
                  ? "active"
                  : column.key === "blocked"
                    ? "warning"
                    : column.key === "done"
                      ? "success"
                      : "neutral",
              ),
            )}
          >
            <Icon className="size-4" />
          </span>
          {!isCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{column.label}</p>
              <p className="text-[11px] text-muted-foreground">{tasks.length} tasks</p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border/75 bg-background/90 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {column.compactLabel}
          </p>
          <p className="rounded-full border border-border/70 bg-background/90 px-2.5 py-1 text-[10px] text-muted-foreground">
            {tasks.length}
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
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
            <div className="rounded-2xl border border-dashed border-border/80 bg-background/70 px-4 py-6 text-center">
              <p className="text-sm font-medium text-foreground">No tasks in this lane</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Work appears here as task state changes.
              </p>
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

  return (
    <button
      type="button"
      className="w-full rounded-[1.1rem] border border-border/75 bg-background/90 p-4 text-left transition-colors hover:border-primary/25 hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      onClick={onOpen}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground">
          {task.name}
        </h4>
        <span
          className={cn(
            "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
            statusToneClasses(statusTone),
          )}
        >
          {task.completed
            ? "Done"
            : task.blockedBy.length > 0
              ? "Blocked"
              : task.startedAt
                ? "In Progress"
                : "Todo"}
        </span>
      </div>

      {task.description ? (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {task.description}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {task.priority !== null ? (
          <span className="rounded-full border border-border/70 bg-panel px-2.5 py-1 text-[10px] font-medium text-foreground">
            P{task.priority}
          </span>
        ) : null}
        {progress ? (
          <span className="rounded-full border border-border/70 bg-panel px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            {progress.completed}/{progress.total} subtasks
          </span>
        ) : null}
        <span className="truncate rounded-full border border-border/70 bg-background px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
          {task.id}
        </span>
      </div>
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
    <section className="flex flex-1 items-center justify-center rounded-[1.5rem] border border-dashed border-border/80 bg-panel/82 p-8 text-center">
      <div className="max-w-xl">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-border/80 bg-background/90">
          <FolderSearch className="size-6 text-muted-foreground" />
        </div>
        <h3 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
          Start the board for {projectName}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Create the first dex task to give this project a live board. You can add structure, assign
          blockers, and start shaping the workflow from here.
        </p>
        <Button className="mt-6 rounded-full px-5" onClick={onAddTask}>
          <Plus className="size-4" />
          <span>Create First Task</span>
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
      <section className="w-full max-w-3xl rounded-[1.75rem] border border-border/75 bg-panel/92 px-8 py-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:shadow-[0_24px_80px_rgba(2,6,23,0.28)] sm:px-12 sm:py-12">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-border/80 bg-background/92">
          <FolderSearch className="size-7 text-muted-foreground" />
        </div>
        {isProjectsInitialized ? (
          <>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Choose a project to open its board
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Pick a project from the sidebar to inspect its current work, review blockers, and create
              new dex tasks without leaving the app shell.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Preparing your workspace
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Loading stored projects and task watchers so the board can reflect local dex activity.
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            New Task
          </p>
          <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
            Add task to {projectName}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Capture the intent clearly first, then link it to existing work only when useful.
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
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
              <SectionCard
                description="Name the work in a way that still makes sense when it appears in a dense board."
                eyebrow="Core"
                title="Task Intent"
              >
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Task Name</span>
                  <Input
                    aria-invalid={nameError ? "true" : undefined}
                    autoFocus
                    disabled={isPending}
                    onChange={(event) => onNameInput(event.currentTarget.value)}
                    placeholder="Refine kanban summary rail"
                    value={form.name}
                  />
                  {nameError ? <p className="text-xs font-medium text-destructive">{nameError}</p> : null}
                </label>
              </SectionCard>

              <SectionCard
                description="Lower numbers are more urgent in dex. Leave the default if you just need standard ordering."
                eyebrow="Priority"
                title="Urgency"
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
              description="Use the description for context, boundaries, and what done should look like."
              eyebrow="Context"
              title="Description"
            >
              <Textarea
                className="min-h-28 resize-y"
                disabled={isPending}
                onChange={(event) => onFormChange("description", event.currentTarget.value)}
                placeholder="Add scope, constraints, and what this task should produce."
                value={form.description}
              />
            </SectionCard>

            <div className="grid gap-4">
              <SectionCard
                description={
                  hasTaskRelationOptions
                    ? "Attach this under an existing parent when it belongs inside a broader thread of work."
                    : "Parent linking becomes available once the project already contains tasks."
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
                      placeholder="No parent task"
                      showClear
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>No matching task found.</ComboboxEmpty>
                      <ComboboxList>
                        <ComboboxItem value={null}>No parent task</ComboboxItem>
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
                  <Input disabled placeholder="No parent task" value="" />
                )}
              </SectionCard>

              <SectionCard
                description={
                  hasTaskRelationOptions
                    ? "Mark blocking work so the board reflects dependency pressure immediately."
                    : "Add the first task before blockers can be assigned."
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
                          placeholder={form.blockedBy.length > 0 ? "" : "Search tasks to add blockers"}
                        />
                      </ComboboxChips>
                      <ComboboxContent anchor={blockersAnchorRef}>
                        <ComboboxEmpty>No matching task found.</ComboboxEmpty>
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
                  <Input disabled placeholder="No blockers available yet" value="" />
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
                <span>{isPending ? "Creating..." : "Create Task"}</span>
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Task Details
            </p>
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
            Review status, relationships, and timestamps without losing board context.
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

            <SectionCard
              description="Use this space to understand the intent and scope before drilling into relationships."
              eyebrow="Description"
              title="Task Context"
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {selectedTask.description ?? "No description provided."}
              </p>
            </SectionCard>

            <div className="grid gap-4">
              <SectionCard
                description="Navigate through parent and child relationships directly from here."
                eyebrow="Structure"
                title="Relationships"
              >
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
                        <p className="text-muted-foreground">No parent task</p>
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
                      <p className="mt-2 text-muted-foreground">No subtasks linked</p>
                    )}
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                description="Read blocker relationships as dependency signals rather than raw metadata."
                eyebrow="Dependencies"
                title="Blockers"
              >
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
                        <p className="text-muted-foreground">No blockers</p>
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
                        <p className="text-muted-foreground">No downstream blockers</p>
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard
              description="These timestamps help explain movement across the board and recent activity."
              eyebrow="Timeline"
              title="Task Lifecycle"
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
