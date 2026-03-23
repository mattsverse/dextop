import { useEffect, useMemo, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";

type ProjectBoardViewProps = {
  project: ProjectItem;
  projectTasks: DexTask[];
};

export function ProjectBoardView({ project, projectTasks }: ProjectBoardViewProps) {
  const boardRef = useRef<HTMLElement | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<TaskFilterKey>("all");
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
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

    return taskById.get(selectedTaskId) ?? null;
  }, [selectedTaskId, taskById]);

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

  useEffect(() => {
    const node = boardRef.current;

    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.round(entry.contentRect.width);
      const nextHeight = Math.round(entry.contentRect.height);

      setBoardSize((current) => {
        if (current.width === nextWidth && current.height === nextHeight) {
          return current;
        }

        return { width: nextWidth, height: nextHeight };
      });
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const isCompactBoard = boardSize.width > 0 && boardSize.width < 880;
  const isShortBoard = boardSize.height > 0 && boardSize.height < 620;

  return (
    <>
      <section
        ref={boardRef}
        className="relative h-full overflow-x-hidden overflow-y-auto p-3 sm:p-4"
      >
        <div className="flex min-h-full min-w-0 flex-col gap-3">
          <ProjectBoardHeader
            compact={isCompactBoard}
            onAddTask={() => {
              setIsCreateTaskOpen(true);
            }}
            projectName={project.name}
            projectPath={project.path}
          />

          {projectTasks.length > 0 ? (
            <>
              <BoardSummaryRail
                activeFilter={taskFilter}
                blockedTasks={summary.blocked}
                compact={isCompactBoard}
                doneTasks={summary.done}
                onFilterChange={setTaskFilter}
                openTasks={summary.open}
                totalTasks={summary.total}
              />
              <div
                className={cn(
                  "flex gap-3 overflow-x-auto overflow-y-hidden pb-2 pr-1",
                  isCompactBoard && "snap-x snap-mandatory",
                  isCompactBoard || isShortBoard
                    ? "h-[18rem] min-h-[18rem]"
                    : "min-h-[19rem] flex-1",
                )}
                id={`project-board-columns-${project.id}`}
              >
                {KANBAN_COLUMNS.map((column) => (
                  <KanbanColumn
                    compact={isCompactBoard}
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
