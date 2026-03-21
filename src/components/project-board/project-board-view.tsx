import { useMemo, useState } from "react";
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
  summarizeBoardTasks,
  summarizeSubtaskProgress,
  TaskDetailsDialog,
  type KanbanColumnKey,
  type TaskFilterKey,
} from "@/components/project-board";
import type { DexTask } from "@/lib/tasks-service";
import type { ProjectItem } from "@/lib/projects-service";

type ProjectBoardViewProps = {
  project: ProjectItem;
  projectTasks: DexTask[];
};

/**
 * Render a kanban-style project board for a given project and its tasks.
 *
 * Displays a header with project metadata, a filterable summary rail, four kanban columns
 * populated from `projectTasks` (or an empty-state when there are no tasks), and the
 * CreateTask and TaskDetails dialogs used to add and inspect tasks.
 *
 * @param project - Project metadata (name, path, and other display fields) used in the header and dialogs
 * @param projectTasks - Array of tasks for the project; used to compute sorting, grouping, summaries, relation options, and per-task subtask progress
 * @returns The board UI as JSX: header, optional summary rail and kanban columns (or empty state), plus create-task and task-details dialogs
 */
export function ProjectBoardView({ project, projectTasks }: ProjectBoardViewProps) {
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

  return (
    <>
      <section className="h-full overflow-hidden p-4 sm:p-5">
        <div className="h-full">
          <div className="flex h-full flex-col gap-4">
            <ProjectBoardHeader
              onAddTask={() => {
                setIsCreateTaskOpen(true);
              }}
              openTasks={summary.open}
              projectName={project.name}
              projectPath={project.path}
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
                <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto overflow-y-hidden pb-2">
                  {KANBAN_COLUMNS.map((column) => (
                    <KanbanColumn
                      key={column.key}
                      column={column}
                      getSubtaskProgress={getSubtaskProgress}
                      isCollapsed={collapsedColumns[column.key]}
                      onOpenTask={openTaskDetails}
                      onToggleCollapsed={() => toggleColumnCollapsed(column.key)}
                      tasks={filteredGroupedTasks[column.key]}
                    />
                  ))}
                </div>
              </>
            ) : (
              <EmptyProjectBoard
                onAddTask={() => {
                  setIsCreateTaskOpen(true);
                }}
                projectName={project.name}
              />
            )}
          </div>
        </div>
      </section>

      <CreateTaskDialog
        open={isCreateTaskOpen}
        projectName={project.name}
        projectPath={project.path}
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
    </>
  );
}
