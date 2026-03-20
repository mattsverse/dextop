import { useEffect, useMemo, useState } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  KanbanSquare,
  ListTodo,
  LoaderCircle,
  OctagonAlert,
  PartyPopper,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/contexts/projects-context";
import { useTasks } from "@/contexts/tasks-context";
import { DexTask, createProjectTask } from "@/lib/tasks-service";

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

type CreateTaskFormState = {
  name: string;
  description: string;
  priority: string;
  parentId: string;
  blockedBy: string[];
};

const INITIAL_CREATE_TASK_FORM: CreateTaskFormState = {
  name: "",
  description: "",
  priority: "1",
  parentId: "",
  blockedBy: [],
};

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "Something went wrong while creating the task.";
}

function RouteComponent() {
  const params = Route.useParams();
  const { isProjectsInitialized, projects, selectProject } = useProjects();
  const { projectTasks } = useTasks();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskForm, setCreateTaskForm] = useState<CreateTaskFormState>({
    ...INITIAL_CREATE_TASK_FORM,
  });
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);
  const [createTaskNameError, setCreateTaskNameError] = useState<string | null>(null);
  const [isCreateTaskPending, setIsCreateTaskPending] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Record<KanbanColumnKey, boolean>>({
    todo: false,
    inProgress: false,
    blocked: false,
    done: false,
  });

  const routeProject = useMemo(
    () => projects.find((project) => project.id === params.projectId) ?? null,
    [params.projectId, projects],
  );

  const shouldRedirectToProjects = isProjectsInitialized && routeProject === null;

  useEffect(() => {
    if (!routeProject) {
      return;
    }

    selectProject(routeProject.id);
  }, [routeProject, selectProject]);

  const sortedProjectTasks = useMemo(() => {
    return [...projectTasks].sort((left, right) => {
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
  }, [projectTasks]);

  const groupedTasks = useMemo(() => {
    const columns: Record<KanbanColumnKey, DexTask[]> = {
      todo: [],
      inProgress: [],
      blocked: [],
      done: [],
    };

    for (const task of sortedProjectTasks) {
      columns[getColumnKey(task)].push(task);
    }

    return columns;
  }, [sortedProjectTasks]);

  const taskById = useMemo(() => {
    const byId = new Map<string, DexTask>();
    for (const task of sortedProjectTasks) {
      byId.set(task.id, task);
    }
    return byId;
  }, [sortedProjectTasks]);

  const subtasksByParentId = useMemo(() => {
    const byParentId = new Map<string, DexTask[]>();
    for (const task of sortedProjectTasks) {
      if (!task.parentId) {
        continue;
      }

      const existing = byParentId.get(task.parentId);
      if (existing) {
        existing.push(task);
      } else {
        byParentId.set(task.parentId, [task]);
      }
    }
    return byParentId;
  }, [sortedProjectTasks]);

  const subtaskProgressByTaskId = useMemo(() => {
    const progressByTaskId = new Map<string, { completed: number; total: number }>();
    for (const [parentId, subtasks] of subtasksByParentId) {
      const completed = subtasks.filter((task) => task.completed).length;
      progressByTaskId.set(parentId, { completed, total: subtasks.length });
    }
    return progressByTaskId;
  }, [subtasksByParentId]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) {
      return null;
    }

    return sortedProjectTasks.find((task) => task.id === selectedTaskId) ?? null;
  }, [selectedTaskId, sortedProjectTasks]);

  const selectedTaskParent = useMemo(() => {
    if (!selectedTask?.parentId) {
      return null;
    }

    return taskById.get(selectedTask.parentId) ?? null;
  }, [selectedTask, taskById]);

  const selectedTaskSubtasks = useMemo(() => {
    if (!selectedTask) {
      return [];
    }

    return subtasksByParentId.get(selectedTask.id) ?? [];
  }, [selectedTask, subtasksByParentId]);

  const taskRelationOptions = sortedProjectTasks;
  const hasTaskRelationOptions = taskRelationOptions.length > 0;

  const resetCreateTaskForm = () => {
    setCreateTaskForm({ ...INITIAL_CREATE_TASK_FORM });
    setCreateTaskError(null);
    setCreateTaskNameError(null);
    setIsCreateTaskPending(false);
  };

  const openCreateTaskDialog = () => {
    resetCreateTaskForm();
    setIsCreateTaskOpen(true);
  };

  const handleCreateTaskOpenChange = (open: boolean) => {
    if (!open && isCreateTaskPending) {
      return;
    }

    if (!open) {
      resetCreateTaskForm();
      setIsCreateTaskOpen(false);
      return;
    }

    setIsCreateTaskOpen(true);
  };

  const updateCreateTaskForm = <K extends keyof CreateTaskFormState>(
    field: K,
    value: CreateTaskFormState[K],
  ) => {
    setCreateTaskForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleBlockedByTask = (taskId: string, checked: boolean) => {
    setCreateTaskForm((current) => {
      const nextBlockedBy = checked
        ? [...new Set([...current.blockedBy, taskId])]
        : current.blockedBy.filter((currentTaskId) => currentTaskId !== taskId);

      return {
        ...current,
        blockedBy: nextBlockedBy,
      };
    });
  };

  const handleCreateTaskSubmit = async () => {
    if (isCreateTaskPending) {
      return;
    }

    if (!routeProject) {
      setCreateTaskError("Select a project before creating a task.");
      return;
    }

    const trimmedName = createTaskForm.name.trim();
    if (!trimmedName) {
      setCreateTaskNameError("Task name is required.");
      return;
    }

    setCreateTaskNameError(null);
    setCreateTaskError(null);
    setIsCreateTaskPending(true);

    try {
      const parsedPriority = Number.parseInt(createTaskForm.priority.trim(), 10);
      await createProjectTask(routeProject.path, {
        name: trimmedName,
        description: createTaskForm.description.trim() || null,
        priority: Number.isNaN(parsedPriority) ? 1 : parsedPriority,
        parentId: createTaskForm.parentId || null,
        blockedBy: createTaskForm.blockedBy,
      });
      setIsCreateTaskOpen(false);
      resetCreateTaskForm();
    } catch (error) {
      setCreateTaskError(getErrorMessage(error));
    } finally {
      setIsCreateTaskPending(false);
    }
  };

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

  if (shouldRedirectToProjects) {
    return <Navigate to="/projects" />;
  }

  return (
    <section className="relative h-[calc(100%-56px)] overflow-hidden p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative mx-auto h-full max-w-7xl">
        {routeProject ? (
          <div className="flex h-full flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="inline-flex w-fit items-center gap-2 rounded-sm border border-cyan-300/45 bg-cyan-300/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-800 dark:border-cyan-300/30 dark:bg-cyan-400/10 dark:text-cyan-200">
                  <KanbanSquare className="size-3.5" />
                  Live Kanban
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Add root tasks, subtasks, and blockers without leaving the board.
                </p>
              </div>

              <Button
                className="border-cyan-300/45 bg-cyan-400/90 text-slate-950 hover:bg-cyan-300 dark:border-cyan-300/25 dark:bg-cyan-300 dark:hover:bg-cyan-200"
                onClick={openCreateTaskDialog}
              >
                <Plus className="size-4" />
                <span>Add Task</span>
              </Button>
            </div>

            {projectTasks.length > 0 ? (
              <div className="flex flex-1 gap-4 overflow-x-auto overflow-y-hidden pb-2">
                {KANBAN_COLUMNS.map((column) => {
                  const Icon = column.icon;
                  const tasksInColumn = groupedTasks[column.key];
                  const isCollapsed = collapsedColumns[column.key];

                  return (
                    <section
                      key={column.key}
                      className={`flex min-h-0 flex-col overflow-hidden rounded-sm border border-slate-300/70 bg-white/80 transition-[width] duration-200 dark:border-white/10 dark:bg-slate-900/70 ${
                        isCollapsed ? "w-[88px] shrink-0" : "min-w-[270px] flex-1 basis-0"
                      }`}
                    >
                      <header className="flex items-center justify-between border-b border-slate-300/60 px-3 py-2.5 dark:border-white/10">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          <Icon className="size-4 text-cyan-700 dark:text-cyan-200" />
                          {!isCollapsed ? <span>{column.label}</span> : null}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-sm bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                            {tasksInColumn.length}
                          </span>
                          <button
                            type="button"
                            className="inline-flex size-6 items-center justify-center rounded-sm border border-slate-300/80 bg-white/70 text-slate-600 transition-colors hover:border-cyan-300/40 hover:text-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:border-cyan-300/35 dark:hover:text-cyan-100 dark:focus-visible:ring-cyan-300 dark:focus-visible:ring-offset-slate-900"
                            onClick={() => toggleColumnCollapsed(column.key)}
                            aria-expanded={!isCollapsed}
                            aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${column.label} column`}
                          >
                            {isCollapsed ? (
                              <ChevronRight className="size-3.5" />
                            ) : (
                              <ChevronLeft className="size-3.5" />
                            )}
                          </button>
                        </div>
                      </header>

                      {isCollapsed ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 py-3 text-center">
                          <Icon className="size-5 text-cyan-700 dark:text-cyan-200" />
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                            {column.compactLabel}
                          </p>
                          <p className="rounded-sm border border-slate-300/80 bg-slate-100/70 px-2 py-1 text-[10px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                            {tasksInColumn.length} tasks
                          </p>
                        </div>
                      ) : (
                        <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
                          {tasksInColumn.map((task) => {
                            const progress = subtaskProgressByTaskId.get(task.id);

                            return (
                              <button
                                key={task.id}
                                type="button"
                                className="w-full rounded-sm border border-slate-300/80 bg-white/85 p-3 text-left transition-colors hover:border-cyan-300/40 hover:bg-cyan-100/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 dark:border-white/10 dark:bg-slate-950/80 dark:hover:border-cyan-300/35 dark:hover:bg-slate-900/90 dark:focus-visible:ring-cyan-300/70 dark:focus-visible:ring-offset-slate-900"
                                onClick={() => openTaskDetails(task.id)}
                              >
                                <h4 className="line-clamp-2 text-sm font-medium text-slate-900 dark:text-white">
                                  {task.name}
                                </h4>
                                {task.description ? (
                                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300/90">
                                    {task.description}
                                  </p>
                                ) : null}
                                <div className="mt-3 flex items-center justify-between gap-2">
                                  <span className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-500">
                                    {task.id}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {progress ? (
                                      <span className="rounded-sm border border-cyan-300/70 bg-cyan-100/70 px-1.5 py-0.5 text-[10px] text-cyan-800 dark:border-cyan-300/40 dark:bg-cyan-400/10 dark:text-cyan-200">
                                        {progress.completed}/{progress.total} subtasks
                                      </span>
                                    ) : null}
                                    {task.priority !== null ? (
                                      <span className="rounded-sm border border-slate-300/80 bg-slate-100/70 px-1.5 py-0.5 text-[10px] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                                        P{task.priority}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-sm border border-slate-300/70 bg-white/75 p-8 text-center dark:border-white/10 dark:bg-slate-900/60">
                <div className="max-w-md">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    No tasks found
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Create the first dex task for this project instead of waiting for entries in{" "}
                    <code className="rounded-sm bg-slate-200/70 px-1.5 py-0.5 text-xs dark:bg-white/10">
                      .dex/tasks.jsonl
                    </code>
                    .
                  </p>
                  <Button className="mt-5" onClick={openCreateTaskDialog}>
                    <Plus className="size-4" />
                    <span>Create First Task</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-3xl rounded-sm border border-slate-300/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(241,245,249,0.75))] p-8 text-center shadow-[0_24px_70px_rgba(148,163,184,0.3)] backdrop-blur-xl dark:border-white/15 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.75),rgba(2,6,23,0.6))] dark:shadow-[0_24px_70px_rgba(2,6,23,0.55)] sm:p-12">
              {isProjectsInitialized ? (
                <>
                  <h2 className="text-3xl font-semibold text-slate-900 dark:text-white sm:text-4xl">
                    Choose a project to load your board
                  </h2>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                    Open a project from the sidebar to start watching{" "}
                    <code className="rounded-sm bg-slate-200/70 px-1.5 py-0.5 text-xs dark:bg-white/10">
                      .dex/tasks.jsonl
                    </code>
                    .
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-semibold text-slate-900 dark:text-white sm:text-4xl">
                    Loading project board
                  </h2>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                    Loading your stored projects and watching task files.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog onOpenChange={handleCreateTaskOpenChange} open={isCreateTaskOpen}>
        <DialogContent className="!w-[min(92vw,46rem)] !max-w-[46rem] !rounded-sm !border !border-slate-300/80 !bg-white !p-0 !text-slate-900 shadow-[0_28px_100px_rgba(148,163,184,0.3)] dark:!border-white/10 dark:!bg-slate-950 dark:!text-slate-100 dark:shadow-[0_28px_100px_rgba(2,6,23,0.8)]">
          <DialogHeader className="gap-2 border-b border-slate-300/80 bg-[linear-gradient(145deg,rgba(248,250,252,0.95),rgba(240,249,255,0.92))] px-5 py-4 dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.95),rgba(8,47,73,0.45))]">
            <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Add Task
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-300">
              Create a new dex task for {routeProject?.name ?? "this project"}.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-5 px-5 py-5 sm:px-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreateTaskSubmit();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-100">Task Name</span>
                <Input
                  aria-invalid={createTaskNameError ? "true" : undefined}
                  autoFocus
                  disabled={isCreateTaskPending}
                  onChange={(event) => {
                    updateCreateTaskForm("name", event.currentTarget.value);
                    if (createTaskNameError) {
                      setCreateTaskNameError(null);
                    }
                  }}
                  placeholder="Ship the task composer"
                  value={createTaskForm.name}
                />
                {createTaskNameError ? (
                  <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
                    {createTaskNameError}
                  </p>
                ) : null}
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-100">Priority</span>
                <Input
                  disabled={isCreateTaskPending}
                  min="1"
                  onChange={(event) => updateCreateTaskForm("priority", event.currentTarget.value)}
                  placeholder="1"
                  type="number"
                  value={createTaskForm.priority}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Lower numbers are more urgent in dex.
                </p>
              </label>
            </div>

            <label className="block space-y-2 text-sm">
              <span className="font-medium text-slate-800 dark:text-slate-100">Description</span>
              <textarea
                className="z-textarea min-h-28 w-full resize-y outline-none"
                disabled={isCreateTaskPending}
                onChange={(event) => updateCreateTaskForm("description", event.currentTarget.value)}
                placeholder="Add context, scope, and what done looks like."
                value={createTaskForm.description}
              />
            </label>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-800 dark:text-slate-100">Parent Task</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Optional</span>
                </div>

                <div className="relative">
                  <select
                    className="z-native-select pr-9"
                    disabled={isCreateTaskPending || !hasTaskRelationOptions}
                    onChange={(event) => updateCreateTaskForm("parentId", event.currentTarget.value)}
                    value={createTaskForm.parentId}
                  >
                    <option value="">No parent task</option>
                    {taskRelationOptions.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.name} ({task.id})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {hasTaskRelationOptions
                    ? "Link this task under an existing parent to create a subtask."
                    : "Open relation controls once the project has tasks."}
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-800 dark:text-slate-100">Blocked By</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {createTaskForm.blockedBy.length} selected
                  </span>
                </div>

                <div className="max-h-48 space-y-2 overflow-y-auto rounded-sm border border-slate-300/80 bg-slate-50/80 p-2.5 dark:border-white/10 dark:bg-slate-900/70">
                  {hasTaskRelationOptions ? (
                    taskRelationOptions.map((task) => (
                      <label
                        key={task.id}
                        className="flex cursor-pointer items-start gap-2 rounded-sm border border-transparent px-2 py-1.5 transition-colors hover:border-cyan-300/30 hover:bg-cyan-100/40 dark:hover:border-cyan-300/25 dark:hover:bg-cyan-400/10"
                      >
                        <input
                          checked={createTaskForm.blockedBy.includes(task.id)}
                          className="mt-0.5 size-3.5 rounded-none border border-slate-400 text-cyan-700 focus:ring-2 focus:ring-cyan-500/40 dark:border-slate-500 dark:bg-slate-950 dark:text-cyan-200"
                          disabled={isCreateTaskPending}
                          onChange={(event) => toggleBlockedByTask(task.id, event.currentTarget.checked)}
                          type="checkbox"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                            {task.name}
                          </div>
                          <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {task.id} • {getTaskStatusLabel(task)}
                          </div>
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Add the first task before you can assign blockers.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {createTaskError ? (
              <div className="rounded-sm border border-rose-300/70 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-300/30 dark:bg-rose-400/10 dark:text-rose-100">
                {createTaskError}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-300/80 pt-4 sm:flex-row sm:justify-end dark:border-white/10">
              <Button
                disabled={isCreateTaskPending}
                onClick={() => handleCreateTaskOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 dark:bg-cyan-300 dark:hover:bg-cyan-200"
                disabled={isCreateTaskPending}
                type="submit"
              >
                <Plus className="size-4" />
                <span>{isCreateTaskPending ? "Creating..." : "Create Task"}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={handleDetailsOpenChange} open={isDetailsOpen}>
        <DialogContent className="!flex !max-h-[85vh] !min-h-0 !w-[min(92vw,56rem)] !max-w-[56rem] !flex-col !overflow-hidden !rounded-xl !border !border-slate-300/80 !bg-white !p-0 !text-slate-900 shadow-[0_30px_100px_rgba(148,163,184,0.32)] dark:!border-slate-700/70 dark:!bg-slate-950 dark:!text-slate-100 dark:shadow-[0_30px_100px_rgba(2,6,23,0.75)]">
          <DialogHeader className="gap-2 border-b border-slate-300/80 bg-[linear-gradient(145deg,rgba(248,250,252,0.95),rgba(241,245,249,0.9))] px-5 py-4 dark:border-slate-800 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.9),rgba(2,6,23,0.8))] sm:px-6">
            <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Task Details
            </DialogTitle>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {selectedTask?.name ?? "Unknown task"}
            </p>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Full details for the selected kanban card.
            </DialogDescription>
          </DialogHeader>

          {selectedTask ? (
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              <section className="rounded-lg border border-slate-300/80 bg-slate-100/70 p-4 dark:border-slate-800/90 dark:bg-slate-900/45">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Description
                </h3>
                <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {selectedTask.description ?? "No description provided."}
                </p>
              </section>

              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Status
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800 dark:text-slate-100">
                    {getTaskStatusLabel(selectedTask)}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Priority
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800 dark:text-slate-100">
                    {selectedTask.priority === null ? "Not set" : `P${selectedTask.priority}`}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Completed
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800 dark:text-slate-100">
                    {selectedTask.completed ? "Yes" : "No"}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Task ID
                  </dt>
                  <dd className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-200">
                    {selectedTask.id}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Parent Task
                  </dt>
                  <dd className="mt-1">
                    {selectedTask.parentId ? (
                      selectedTaskParent ? (
                        <button
                          type="button"
                          className="text-left text-sm font-medium text-cyan-800 underline decoration-cyan-500/60 underline-offset-2 transition-colors hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 dark:text-cyan-200 dark:decoration-cyan-300/70 dark:hover:text-cyan-100 dark:focus-visible:ring-cyan-300 dark:focus-visible:ring-offset-slate-900"
                          onClick={() => openTaskDetails(selectedTaskParent.id)}
                        >
                          {selectedTaskParent.name}
                        </button>
                      ) : (
                        <span className="font-mono text-xs text-slate-700 dark:text-slate-200">
                          {selectedTask.parentId}
                        </span>
                      )
                    ) : (
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        None
                      </span>
                    )}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Started At
                  </dt>
                  <dd className="mt-1 text-slate-800 dark:text-slate-100">
                    {formatTaskDate(selectedTask.startedAt)}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Completed At
                  </dt>
                  <dd className="mt-1 text-slate-800 dark:text-slate-100">
                    {formatTaskDate(selectedTask.completedAt)}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Created At
                  </dt>
                  <dd className="mt-1 text-slate-800 dark:text-slate-100">
                    {formatTaskDate(selectedTask.createdAt)}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Updated At
                  </dt>
                  <dd className="mt-1 text-slate-800 dark:text-slate-100">
                    {formatTaskDate(selectedTask.updatedAt)}
                  </dd>
                </div>
              </dl>

              <div className="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Subtasks
                </p>
                {selectedTaskSubtasks.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {selectedTaskSubtasks.map((subtask) => (
                      <li key={subtask.id}>
                        <button
                          type="button"
                          className="text-left text-sm font-medium text-cyan-800 underline decoration-cyan-500/60 underline-offset-2 transition-colors hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 dark:text-cyan-200 dark:decoration-cyan-300/70 dark:hover:text-cyan-100 dark:focus-visible:ring-cyan-300 dark:focus-visible:ring-offset-slate-900"
                          onClick={() => openTaskDetails(subtask.id)}
                        >
                          {subtask.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">None</p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Blocked By
                  </p>
                  {selectedTask.blockedBy.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedTask.blockedBy.map((taskId) => (
                        <span
                          key={taskId}
                          className="rounded-md border border-slate-300 bg-white/85 px-2 py-1 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          {taskId}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">None</p>
                  )}
                </div>

                <div className="rounded-lg border border-slate-300/80 bg-slate-100/70 p-3 dark:border-slate-800/90 dark:bg-slate-900/45">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Blocks
                  </p>
                  {selectedTask.blocks.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedTask.blocks.map((taskId) => (
                        <span
                          key={taskId}
                          className="rounded-md border border-slate-300 bg-white/85 px-2 py-1 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          {taskId}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">None</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="m-5 rounded-lg border border-amber-300/50 bg-amber-100/70 px-3 py-2 text-sm text-amber-800 dark:border-amber-300/40 dark:bg-amber-400/10 dark:text-amber-100 sm:m-6">
              This task is no longer available.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
