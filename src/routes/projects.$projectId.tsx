import { useEffect, useMemo, useState } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import {
  BoardSummaryRail,
  compareTasksByRecentActivity,
  CreateTaskDialog,
  EmptyProjectBoard,
  filterBoardTasks,
  getTaskMutationErrorMessage,
  groupSubtasksByParentId,
  groupTasksByColumn,
  indexTasksById,
  INITIAL_CREATE_TASK_FORM,
  KANBAN_COLUMNS,
  KanbanColumn,
  ProjectBoardHeader,
  ProjectBoardPlaceholder,
  summarizeBoardTasks,
  summarizeSubtaskProgress,
  TaskDetailsDialog,
  type CreateTaskFormState,
  type KanbanColumnKey,
  type TaskFilterKey,
} from "@/components/project-board";
import { useProjects } from "@/contexts/projects-context";
import { useTasks } from "@/contexts/tasks-context";
import { createProjectTask } from "@/lib/tasks-service";

export const Route = createFileRoute("/projects/$projectId")({
  component: RouteComponent,
});

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

  const sortedProjectTasks = useMemo(
    () => [...projectTasks].sort(compareTasksByRecentActivity),
    [projectTasks],
  );

  const groupedTasks = useMemo(() => groupTasksByColumn(sortedProjectTasks), [sortedProjectTasks]);

  const summary = useMemo(
    () => summarizeBoardTasks(sortedProjectTasks, groupedTasks),
    [groupedTasks, sortedProjectTasks],
  );

  const filteredGroupedTasks = useMemo(
    () => filterBoardTasks(groupedTasks, taskFilter),
    [groupedTasks, taskFilter],
  );

  const taskById = useMemo(() => indexTasksById(sortedProjectTasks), [sortedProjectTasks]);

  const subtasksByParentId = useMemo(
    () => groupSubtasksByParentId(sortedProjectTasks),
    [sortedProjectTasks],
  );

  const subtaskProgressByTaskId = useMemo(
    () => summarizeSubtaskProgress(subtasksByParentId),
    [subtasksByParentId],
  );

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
      setCreateTaskError("Choose a project before you add a task.");
      return;
    }

    const trimmedName = createTaskForm.name.trim();
    if (!trimmedName) {
      setCreateTaskNameError("Enter a task title.");
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
      setCreateTaskError(getTaskMutationErrorMessage(error));
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
    <section className="h-[calc(100%-56px)] overflow-hidden p-4 sm:p-5">
      <div className="mx-auto h-full max-w-[1500px]">
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
