import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProjects } from "@/contexts/projects-context";
import { useTasks } from "@/contexts/tasks-context";
import { createFileRoute } from "@tanstack/solid-router";
import {
  ChevronLeft,
  ChevronRight,
  KanbanSquare,
  ListTodo,
  LoaderCircle,
  OctagonAlert,
  PartyPopper,
} from "lucide-solid";
import { createMemo, createSignal, For, Show } from "solid-js";
import { DexTask } from "@/lib/tasks-service";

export const Route = createFileRoute("/projects/$projectId")({
  component: RouteComponent,
});

type KanbanColumnKey = "todo" | "inProgress" | "blocked" | "done";

const KANBAN_COLUMNS: Array<{
  key: KanbanColumnKey;
  label: string;
  compactLabel: string;
  icon: typeof ListTodo;
}> = [
  { key: "todo", label: "Todo", compactLabel: "Todo", icon: ListTodo },
  { key: "inProgress", label: "In Progress", compactLabel: "Doing", icon: LoaderCircle },
  { key: "blocked", label: "Blocked", compactLabel: "Block", icon: OctagonAlert },
  { key: "done", label: "Done", compactLabel: "Done", icon: PartyPopper },
];

function getColumnKey(task: {
  completed: boolean;
  startedAt: string | null;
  blockedBy: string[];
}): KanbanColumnKey {
  if (task.completed) {
    return "done";
  }

  if (task.blockedBy.length > 0) {
    return "blocked";
  }

  if (task.startedAt) {
    return "inProgress";
  }

  return "todo";
}

function getTaskStatusLabel(task: Pick<DexTask, "completed" | "startedAt" | "blockedBy">): string {
  const status = getColumnKey(task);
  if (status === "todo") {
    return "Todo";
  }
  if (status === "inProgress") {
    return "In Progress";
  }
  if (status === "blocked") {
    return "Blocked";
  }
  return "Done";
}

function formatTaskDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Date(timestamp).toLocaleString();
}

function toTimestamp(value: string | null): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function RouteComponent() {
  const params = Route.useParams()();
  const { selectProject, selectedProjectId } = useProjects();
  const { projectTasks } = useTasks();
  const [isDetailsOpen, setIsDetailsOpen] = createSignal(false);
  const [selectedTaskId, setSelectedTaskId] = createSignal<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = createSignal<Record<KanbanColumnKey, boolean>>({
    todo: false,
    inProgress: false,
    blocked: false,
    done: false,
  });

  const sortedProjectTasks = createMemo(() => {
    return [...projectTasks()].sort((left, right) => {
      const updatedAtDiff = toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
      if (updatedAtDiff !== 0) {
        return updatedAtDiff;
      }

      const createdAtDiff = toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
      if (createdAtDiff !== 0) {
        return createdAtDiff;
      }

      return left.id.localeCompare(right.id);
    });
  });

  const groupedTasks = createMemo(() => {
    const columns: Record<KanbanColumnKey, ReturnType<typeof projectTasks>> = {
      todo: [],
      inProgress: [],
      blocked: [],
      done: [],
    };

    for (const task of sortedProjectTasks()) {
      columns[getColumnKey(task)].push(task);
    }

    return columns;
  });

  const taskById = createMemo(() => {
    const tasks = sortedProjectTasks();
    const byId = new Map<string, DexTask>();
    for (const task of tasks) {
      byId.set(task.id, task);
    }
    return byId;
  });

  const subtasksByParentId = createMemo(() => {
    const tasks = sortedProjectTasks();
    const byParentId = new Map<string, DexTask[]>();
    for (const task of tasks) {
      if (!task.parentId) {
        continue;
      }

      const existing = byParentId.get(task.parentId);
      if (existing) {
        existing.push(task);
        continue;
      }

      byParentId.set(task.parentId, [task]);
    }
    return byParentId;
  });

  const subtaskProgressByTaskId = createMemo(() => {
    const progressByTaskId = new Map<string, { completed: number; total: number }>();
    for (const [parentId, subtasks] of subtasksByParentId()) {
      const completed = subtasks.filter((task) => task.completed).length;
      progressByTaskId.set(parentId, { completed, total: subtasks.length });
    }
    return progressByTaskId;
  });

  const selectedTask = createMemo(() => {
    const taskId = selectedTaskId();
    if (!taskId) {
      return null;
    }

    return sortedProjectTasks().find((task) => task.id === taskId) ?? null;
  });

  const selectedTaskParent = createMemo(() => {
    const task = selectedTask();
    if (!task?.parentId) {
      return null;
    }
    return taskById().get(task.parentId) ?? null;
  });

  const selectedTaskSubtasks = createMemo(() => {
    const task = selectedTask();
    if (!task) {
      return [];
    }
    return subtasksByParentId().get(task.id) ?? [];
  });

  const openTaskDetails = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDetailsOpen(true);
  };

  const handleDetailsOpenChange = (open: boolean) => {
    setIsDetailsOpen(open);
    if (!open) {
      setSelectedTaskId(null);
    }
  };

  const toggleColumnCollapsed = (columnKey: KanbanColumnKey) => {
    setCollapsedColumns((current) => ({
      ...current,
      [columnKey]: !current[columnKey],
    }));
  };

  selectProject(params.projectId);
  return (
    <section class="relative h-[calc(100%-56px)] overflow-hidden p-4 sm:p-6">
      <div class="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div class="relative mx-auto h-full max-w-7xl">
        <Show
          when={selectedProjectId()}
          fallback={
            <div class="flex h-full items-center justify-center">
              <div class="w-full max-w-3xl rounded-sm border border-slate-300/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(241,245,249,0.75))] p-8 text-center shadow-[0_24px_70px_rgba(148,163,184,0.3)] backdrop-blur-xl dark:border-white/15 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.75),rgba(2,6,23,0.6))] dark:shadow-[0_24px_70px_rgba(2,6,23,0.55)] sm:p-12">
                <h2 class="text-3xl font-semibold text-slate-900 dark:text-white sm:text-4xl">
                  Choose a project to load your board
                </h2>
                <p class="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                  Open a project from the sidebar to start watching{" "}
                  <code class="rounded-sm bg-slate-200/70 px-1.5 py-0.5 text-xs dark:bg-white/10">
                    .dex/tasks.jsonl
                  </code>
                  .
                </p>
              </div>
            </div>
          }
        >
          <div class="flex h-full flex-col gap-4">
            <div class="inline-flex w-fit items-center gap-2 rounded-sm border border-cyan-300/45 bg-cyan-300/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-800 dark:border-cyan-300/30 dark:bg-cyan-400/10 dark:text-cyan-200">
              <KanbanSquare class="size-3.5" />
              Live Kanban
            </div>

            <Show
              when={projectTasks().length > 0}
              fallback={
                <div class="flex flex-1 items-center justify-center rounded-sm border border-slate-300/70 bg-white/75 p-8 text-center dark:border-white/10 dark:bg-slate-900/60">
                  <div class="max-w-md">
                    <h3 class="text-xl font-semibold text-slate-900 dark:text-white">
                      No tasks found
                    </h3>
                    <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      Waiting for entries in{" "}
                      <code class="rounded-sm bg-slate-200/70 px-1.5 py-0.5 text-xs dark:bg-white/10">
                        .dex/tasks.jsonl
                      </code>
                      .
                    </p>
                  </div>
                </div>
              }
            >
              <div class="flex flex-1 gap-4 overflow-x-auto overflow-y-hidden pb-2">
                <For each={KANBAN_COLUMNS}>
                  {(column) => {
                    const Icon = column.icon;
                    const tasksInColumn = () => groupedTasks()[column.key];
                    const isCollapsed = () => collapsedColumns()[column.key];

                    return (
                      <section
                        class={`flex min-h-0 flex-col overflow-hidden rounded-sm border border-slate-300/70 bg-white/80 transition-[width] duration-200 dark:border-white/10 dark:bg-slate-900/70 ${
                          isCollapsed() ? "w-[88px] shrink-0" : "min-w-[270px] flex-1 basis-0"
                        }`}
                      >
                        <header class="flex items-center justify-between border-b border-slate-300/60 px-3 py-2.5 dark:border-white/10">
                          <div class="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                            <Icon class="size-4 text-cyan-700 dark:text-cyan-200" />
                            <Show when={!isCollapsed()}>
                              <span>{column.label}</span>
                            </Show>
                          </div>
                          <div class="flex items-center gap-1.5">
                            <span class="rounded-sm bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                              {tasksInColumn().length}
                            </span>
                            <button
                              type="button"
                              class="inline-flex size-6 items-center justify-center rounded-sm border border-slate-300/80 bg-white/70 text-slate-600 transition-colors hover:border-cyan-300/40 hover:text-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:border-cyan-300/35 dark:hover:text-cyan-100 dark:focus-visible:ring-cyan-300 dark:focus-visible:ring-offset-slate-900"
                              onClick={() => toggleColumnCollapsed(column.key)}
                              aria-expanded={!isCollapsed()}
                              aria-label={`${isCollapsed() ? "Expand" : "Collapse"} ${column.label} column`}
                            >
                              <Show
                                when={isCollapsed()}
                                fallback={<ChevronLeft class="size-3.5" />}
                              >
                                <ChevronRight class="size-3.5" />
                              </Show>
                            </button>
                          </div>
                        </header>

                        <Show
                          when={!isCollapsed()}
                          fallback={
                            <div class="flex flex-1 flex-col items-center justify-center gap-3 px-2 py-3 text-center">
                              <Icon class="size-5 text-cyan-700 dark:text-cyan-200" />
                              <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                                {column.compactLabel}
                              </p>
                              <p class="rounded-sm border border-slate-300/80 bg-slate-100/70 px-2 py-1 text-[10px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                                {tasksInColumn().length} tasks
                              </p>
                            </div>
                          }
                        >
                          <div class="flex-1 space-y-2 overflow-y-auto p-2.5">
                            <For each={tasksInColumn()}>
                              {(task) => (
                                <button
                                  type="button"
                                  class="w-full rounded-sm border border-slate-300/80 bg-white/85 p-3 text-left transition-colors hover:border-cyan-300/40 hover:bg-cyan-100/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 dark:border-white/10 dark:bg-slate-950/80 dark:hover:border-cyan-300/35 dark:hover:bg-slate-900/90 dark:focus-visible:ring-cyan-300/70 dark:focus-visible:ring-offset-slate-900"
                                  onClick={() => openTaskDetails(task.id)}
                                >
                                  <h4 class="line-clamp-2 text-sm font-medium text-slate-900 dark:text-white">
                                    {task.name}
                                  </h4>
                                  <Show when={task.description}>
                                    <p class="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300/90">
                                      {task.description}
                                    </p>
                                  </Show>
                                  <div class="mt-3 flex items-center justify-between gap-2">
                                    <span class="truncate font-mono text-[10px] text-slate-500 dark:text-slate-500">
                                      {task.id}
                                    </span>
                                    <div class="flex items-center gap-1.5">
                                      <Show when={subtaskProgressByTaskId().get(task.id)}>
                                        {(progress) => (
                                          <span class="rounded-sm border border-cyan-300/70 bg-cyan-100/70 px-1.5 py-0.5 text-[10px] text-cyan-800 dark:border-cyan-300/40 dark:bg-cyan-400/10 dark:text-cyan-200">
                                            {progress().completed}/{progress().total} subtasks
                                          </span>
                                        )}
                                      </Show>
                                      <Show when={task.priority !== null}>
                                        <span class="rounded-sm border border-slate-300/80 bg-slate-100/70 px-1.5 py-0.5 text-[10px] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                                          P{task.priority}
                                        </span>
                                      </Show>
                                    </div>
                                  </div>
                                </button>
                              )}
                            </For>
                          </div>
                        </Show>
                      </section>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div>
        </Show>
      </div>

      <Dialog open={isDetailsOpen()} onOpenChange={handleDetailsOpenChange}>
        <DialogContent class="!flex !max-h-[85vh] !min-h-0 !w-[min(92vw,56rem)] !max-w-[56rem] !flex-col !overflow-hidden !rounded-xl !border !border-slate-300/80 !bg-white !p-0 !text-slate-900 shadow-[0_30px_100px_rgba(148,163,184,0.32)] dark:!border-slate-700/70 dark:!bg-slate-950 dark:!text-slate-100 dark:shadow-[0_30px_100px_rgba(2,6,23,0.75)]">
          <DialogHeader class="gap-2 border-b border-slate-300/80 bg-[linear-gradient(145deg,rgba(248,250,252,0.95),rgba(241,245,249,0.9))] px-5 py-4 dark:border-slate-800 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.9),rgba(2,6,23,0.8))] sm:px-6">
            <DialogTitle class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Task Details
            </DialogTitle>
            <p class="text-sm text-slate-700 dark:text-slate-200">
              {selectedTask()?.name ?? "Unknown task"}
            </p>
            <DialogDescription class="text-xs text-slate-500 dark:text-slate-400">
              Full details for the selected kanban card.
            </DialogDescription>
          </DialogHeader>

          <Show
            when={selectedTask()}
            fallback={
              <p class="m-5 rounded-lg border border-amber-300/50 bg-amber-100/70 px-3 py-2 text-sm text-amber-800 dark:border-amber-300/40 dark:bg-amber-400/10 dark:text-amber-100 sm:m-6">
                This task is no longer available.
              </p>
            }
          >
            {(task) => (
              <div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                <section class="rounded-lg border border-slate-300/80 bg-slate-100/70 p-4 dark:border-slate-800/90 dark:bg-slate-900/45">
                  <h3 class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Description
                  </h3>
                  <p class="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {task().description ?? "No description provided."}
                  </p>
                </section>

                <dl class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div class="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                    <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Status
                    </dt>
                    <dd class="mt-1 font-medium text-slate-800 dark:text-slate-100">
                      {getTaskStatusLabel(task())}
                    </dd>
                  </div>
                  <div class="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                    <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Priority
                    </dt>
                    <dd class="mt-1 font-medium text-slate-800 dark:text-slate-100">
                      {task().priority === null ? "Not set" : `P${task().priority}`}
                    </dd>
                  </div>
                  <div class="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                    <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Completed
                    </dt>
                    <dd class="mt-1 font-medium text-slate-800 dark:text-slate-100">
                      {task().completed ? "Yes" : "No"}
                    </dd>
                  </div>
                  <div class="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                    <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Task ID
                    </dt>
                    <dd class="mt-1 font-mono text-xs text-slate-700 dark:text-slate-200">
                      {task().id}
                    </dd>
                  </div>
                  <div class="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                    <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Parent Task
                    </dt>
                    <dd class="mt-1">
                      <Show
                        when={task().parentId}
                        fallback={
                          <span class="text-sm font-medium text-slate-800 dark:text-slate-100">
                            None
                          </span>
                        }
                      >
                        <Show
                          when={selectedTaskParent()}
                          fallback={
                            <span class="font-mono text-xs text-slate-700 dark:text-slate-200">
                              {task().parentId}
                            </span>
                          }
                        >
                          {(parentTask) => (
                            <button
                              type="button"
                              class="text-left text-sm font-medium text-cyan-800 underline decoration-cyan-500/60 underline-offset-2 transition-colors hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 dark:text-cyan-200 dark:decoration-cyan-300/70 dark:hover:text-cyan-100 dark:focus-visible:ring-cyan-300 dark:focus-visible:ring-offset-slate-900"
                              onClick={() => openTaskDetails(parentTask().id)}
                            >
                              {parentTask().name}
                            </button>
                          )}
                        </Show>
                      </Show>
                    </dd>
                  </div>
                  <div class="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                    <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Started At
                    </dt>
                    <dd class="mt-1 text-slate-800 dark:text-slate-100">
                      {formatTaskDate(task().startedAt)}
                    </dd>
                  </div>
                  <div class="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                    <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Completed At
                    </dt>
                    <dd class="mt-1 text-slate-800 dark:text-slate-100">
                      {formatTaskDate(task().completedAt)}
                    </dd>
                  </div>
                  <div class="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                    <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Created At
                    </dt>
                    <dd class="mt-1 text-slate-800 dark:text-slate-100">
                      {formatTaskDate(task().createdAt)}
                    </dd>
                  </div>
                  <div class="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                    <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Updated At
                    </dt>
                    <dd class="mt-1 text-slate-800 dark:text-slate-100">
                      {formatTaskDate(task().updatedAt)}
                    </dd>
                  </div>
                </dl>

                <div class="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                  <p class="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Subtasks
                  </p>
                  <Show
                    when={selectedTaskSubtasks().length > 0}
                    fallback={<p class="mt-2 text-sm text-slate-600 dark:text-slate-300">None</p>}
                  >
                    <ul class="mt-2 space-y-1.5">
                      <For each={selectedTaskSubtasks()}>
                        {(subtask) => (
                          <li>
                            <button
                              type="button"
                              class="text-left text-sm font-medium text-cyan-800 underline decoration-cyan-500/60 underline-offset-2 transition-colors hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 dark:text-cyan-200 dark:decoration-cyan-300/70 dark:hover:text-cyan-100 dark:focus-visible:ring-cyan-300 dark:focus-visible:ring-offset-slate-900"
                              onClick={() => openTaskDetails(subtask.id)}
                            >
                              {subtask.name}
                            </button>
                          </li>
                        )}
                      </For>
                    </ul>
                  </Show>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                    <p class="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Blocked By
                    </p>
                    <Show
                      when={task().blockedBy.length > 0}
                      fallback={<p class="mt-2 text-sm text-slate-600 dark:text-slate-300">None</p>}
                    >
                      <div class="mt-2 flex flex-wrap gap-1.5">
                        <For each={task().blockedBy}>
                          {(taskId) => (
                            <span class="rounded-md border border-slate-300 bg-white/85 px-2 py-1 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                              {taskId}
                            </span>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>

                  <div class="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                    <p class="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Blocks
                    </p>
                    <Show
                      when={task().blocks.length > 0}
                      fallback={<p class="mt-2 text-sm text-slate-600 dark:text-slate-300">None</p>}
                    >
                      <div class="mt-2 flex flex-wrap gap-1.5">
                        <For each={task().blocks}>
                          {(taskId) => (
                            <span class="rounded-md border border-slate-300 bg-white/85 px-2 py-1 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                              {taskId}
                            </span>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                </div>
              </div>
            )}
          </Show>
        </DialogContent>
      </Dialog>
    </section>
  );
}
