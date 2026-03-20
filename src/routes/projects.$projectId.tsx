import { useEffect, useMemo, useState } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import {
  BoardSummaryRail,
  CreateTaskDialog,
  EmptyProjectBoard,
  KANBAN_COLUMNS,
  KanbanColumn,
  type KanbanColumnKey,
  ProjectBoardHeader,
  ProjectBoardPlaceholder,
  type TaskFilterKey,
  TaskDetailsDialog,
  type CreateTaskFormState,
} from "@/components/project-board";
import { useProjects } from "@/contexts/projects-context";
import { useTasks } from "@/contexts/tasks-context";
import { DexTask, createProjectTask } from "@/lib/tasks-service";

export const Route = createFileRoute("/projects/$projectId")({
  component: RouteComponent,
});

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
  const [taskFilter, setTaskFilter] = useState<TaskFilterKey>("all");
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

  const summary = useMemo(
    () => ({
      total: sortedProjectTasks.length,
      open: sortedProjectTasks.filter((task) => !task.completed).length,
      blocked: groupedTasks.blocked.length,
      done: groupedTasks.done.length,
    }),
    [groupedTasks.blocked.length, groupedTasks.done.length, sortedProjectTasks],
  );

  const filteredGroupedTasks = useMemo(() => {
    const matchesFilter = (task: DexTask) => {
      if (taskFilter === "blocked") {
        return task.blockedBy.length > 0;
      }

      if (taskFilter === "inProgress") {
        return !task.completed && Boolean(task.startedAt) && task.blockedBy.length === 0;
      }

      if (taskFilter === "highPriority") {
        return task.priority !== null && task.priority <= 2;
      }

      return true;
    };

    return {
      todo: groupedTasks.todo.filter(matchesFilter),
      inProgress: groupedTasks.inProgress.filter(matchesFilter),
      blocked: groupedTasks.blocked.filter(matchesFilter),
      done: groupedTasks.done.filter(matchesFilter),
    };
  }, [groupedTasks, taskFilter]);

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

  const getSubtaskProgress = (taskId: string) => subtaskProgressByTaskId.get(taskId);

  const getTaskStatusTone = (task: DexTask): "neutral" | "active" | "warning" | "success" => {
    const status = getColumnKey(task);
    if (status === "inProgress") {
      return "active";
    }
    if (status === "blocked") {
      return "warning";
    }
    if (status === "done") {
      return "success";
    }
    return "neutral";
  };

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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(110,130,104,0.08),transparent_36%),radial-gradient(circle_at_85%_16%,rgba(138,113,77,0.07),transparent_28%)]" />
      <div className="relative mx-auto h-full max-w-[1500px]">
        {routeProject ? (
          <div className="flex h-full flex-col gap-4">
            <ProjectBoardHeader
              onAddTask={openCreateTaskDialog}
              openTasks={summary.open}
              projectName={routeProject.name}
              projectPath={routeProject.path}
              totalTasks={summary.total}
            />

            {projectTasks.length > 0 ? (
              <>
                <BoardSummaryRail
                  activeFilter={taskFilter}
                  blockedTasks={summary.blocked}
                  doneTasks={summary.done}
                  onFilterChange={setTaskFilter}
                  openTasks={summary.open}
                  totalTasks={summary.total}
                />
                <div className="flex flex-1 gap-4 overflow-x-auto overflow-y-hidden pb-2">
                {KANBAN_COLUMNS.map((column) => {
                  const tasksInColumn = filteredGroupedTasks[column.key];
                  return (
                    <KanbanColumn
                      key={column.key}
                      column={column}
                      getSubtaskProgress={getSubtaskProgress}
                      getTaskStatusTone={getTaskStatusTone}
                      isCollapsed={collapsedColumns[column.key]}
                      onOpenTask={openTaskDetails}
                      onToggleCollapsed={() => toggleColumnCollapsed(column.key)}
                      tasks={tasksInColumn}
                    />
                  );
                })}
                </div>
              </>
            ) : (
              <EmptyProjectBoard onAddTask={openCreateTaskDialog} projectName={routeProject.name} />
            )}
          </div>
        ) : (
          <ProjectBoardPlaceholder isProjectsInitialized={isProjectsInitialized} />
        )}
      </div>

      <CreateTaskDialog
        error={createTaskError}
        form={createTaskForm}
        hasTaskRelationOptions={hasTaskRelationOptions}
        isPending={isCreateTaskPending}
        nameError={createTaskNameError}
        onFormChange={updateCreateTaskForm}
        onNameInput={(value) => {
          updateCreateTaskForm("name", value);
          if (createTaskNameError) {
            setCreateTaskNameError(null);
          }
        }}
        onOpenChange={handleCreateTaskOpenChange}
        onSubmit={() => {
          void handleCreateTaskSubmit();
        }}
        onToggleBlockedBy={toggleBlockedByTask}
        open={isCreateTaskOpen}
        projectName={routeProject?.name ?? "this project"}
        relationOptions={taskRelationOptions}
      />

      <TaskDetailsDialog
        formatTaskDate={formatTaskDate}
        getTaskStatusLabel={getTaskStatusLabel}
        getTaskStatusTone={getTaskStatusTone}
        onOpenChange={handleDetailsOpenChange}
        onOpenTask={openTaskDetails}
        open={isDetailsOpen}
        selectedTask={selectedTask}
        selectedTaskParent={selectedTaskParent}
        selectedTaskSubtasks={selectedTaskSubtasks}
      />
    </section>
  );
}
