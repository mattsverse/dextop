import { useEffect, useMemo, useState } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import {
  BoardSummaryRail,
  compareTasksByRecentActivity,
  CreateTaskDialog,
  EmptyProjectBoard,
  filterBoardTasks,
  groupSubtasksByParentId,
  groupTasksByColumn,
  indexTasksById,
  KANBAN_COLUMNS,
  KanbanColumn,
  ProjectBoardHeader,
  ProjectBoardPlaceholder,
  summarizeBoardTasks,
  summarizeSubtaskProgress,
  TaskDetailsDialog,
  type KanbanColumnKey,
  type TaskFilterKey,
} from "@/components/project-board";
import { useProjects } from "@/contexts/projects-context";
import { useTasks } from "@/contexts/tasks-context";

export const Route = createFileRoute("/projects/$projectId")({
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useParams();
  const { isProjectsInitialized, projects, selectProject } = useProjects();
  const { projectTasks } = useTasks();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
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

  const getSubtaskProgress = (taskId: string) => subtaskProgressByTaskId.get(taskId);

  const openCreateTaskDialog = () => {
    setIsCreateTaskOpen(true);
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
        open={isCreateTaskOpen}
        projectName={routeProject?.name ?? "this project"}
        projectPath={routeProject?.path ?? null}
        relationOptions={taskRelationOptions}
        setOpen={setIsCreateTaskOpen}
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
