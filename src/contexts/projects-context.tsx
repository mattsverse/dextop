import type { Accessor, JSX } from "solid-js";
import { createContext, createSignal, useContext } from "solid-js";
import {
  clearProjects as clearProjectsRequest,
  deleteProject as deleteProjectRequest,
  listProjects,
  listenToProjectMutations,
  openProject as openProjectRequest,
  openProjectWindow as openProjectWindowRequest,
  type ProjectItem,
} from "@/lib/projects-service";

type ProjectsContextValue = {
  projects: Accessor<ProjectItem[]>;
  isProjectsInitialized: Accessor<boolean>;
  selectedProjectId: Accessor<string | null>;
  selectedProjectName: () => string;
  selectProject: (projectId: string) => void;
  setProjectTaskCount: (projectPath: string, taskCount: number) => void;
  reloadProjects: () => Promise<void>;
  openProject: () => Promise<void>;
  openProjectInSeparateWindow: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  clearAllProjects: () => Promise<void>;
  initializeProjectsStore: () => Promise<void>;
  disposeProjectsStore: () => void;
};

const ProjectsContext = createContext<ProjectsContextValue>();

export function ProjectsProvider(props: { children: JSX.Element }) {
  const [projectsState, setProjectsState] = createSignal<ProjectItem[]>([]);
  const [isProjectsInitializedState, setIsProjectsInitializedState] = createSignal(false);
  const [selectedProjectIdState, setSelectedProjectIdState] = createSignal<string | null>(null);

  let unlistenProjectMutations: (() => void) | undefined;
  let initializationPromise: Promise<void> | undefined;
  let isInitialized = false;

  const selectedProjectName = () => {
    const selectedId = selectedProjectIdState();
    return (
      projectsState().find((project) => project.id === selectedId)?.name ?? "No project selected"
    );
  };

  const ensureSelection = (projectList: ProjectItem[]) => {
    setSelectedProjectIdState((currentSelection) => {
      if (currentSelection && projectList.some((project) => project.id === currentSelection)) {
        return currentSelection;
      }

      return projectList[0]?.id ?? null;
    });
  };

  const reloadProjects = async () => {
    const loadedProjects = await listProjects();
    let nextProjects: ProjectItem[] = [];
    setProjectsState((currentProjects) => {
      const taskCountsByPath = new Map(
        currentProjects.map((project) => [project.path, project.tasks] as const),
      );
      nextProjects = loadedProjects.map((project) => ({
        ...project,
        tasks: taskCountsByPath.get(project.path) ?? project.tasks,
      }));
      return nextProjects;
    });
    ensureSelection(nextProjects);
  };

  const selectProject = (projectId: string) => {
    setSelectedProjectIdState(projectId);
  };

  const setProjectTaskCount = (projectPath: string, taskCount: number) => {
    setProjectsState((currentProjects) =>
      currentProjects.map((project) =>
        project.path === projectPath ? { ...project, tasks: taskCount } : project,
      ),
    );
  };

  const openProject = async () => {
    try {
      await openProjectRequest();
    } catch (error) {
      console.error("Failed to add project", error);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      await deleteProjectRequest(projectId);
    } catch (error) {
      console.error("Failed to delete project", error);
    }
  };

  const openProjectInSeparateWindow = async (projectId: string) => {
    try {
      await openProjectWindowRequest(projectId);
    } catch (error) {
      console.error("Failed to open project in a separate window", error);
    }
  };

  const clearAllProjects = async () => {
    try {
      await clearProjectsRequest();
      await reloadProjects();
    } catch (error) {
      console.error("Failed to clear projects", error);
    }
  };

  const initializeProjectsStore = async () => {
    if (isInitialized) {
      return;
    }

    if (initializationPromise) {
      return initializationPromise;
    }

    initializationPromise = (async () => {
      await reloadProjects();
      unlistenProjectMutations = await listenToProjectMutations({
        onProjectAdded: (project) => {
          setProjectsState((currentProjects) => {
            const existingProject = currentProjects.find(
              (currentProject) =>
                currentProject.id === project.id || currentProject.path === project.path,
            );

            return [
              {
                ...project,
                tasks: existingProject?.tasks ?? project.tasks,
              },
              ...currentProjects.filter(
                (currentProject) =>
                  currentProject.id !== project.id && currentProject.path !== project.path,
              ),
            ];
          });
        },
        onProjectDeleted: (projectId) => {
          let remainingProjects: ProjectItem[] = [];
          setProjectsState((currentProjects) => {
            remainingProjects = currentProjects.filter((project) => project.id !== projectId);
            return remainingProjects;
          });
          ensureSelection(remainingProjects);
        },
      });
      isInitialized = true;
      setIsProjectsInitializedState(true);
    })();

    try {
      await initializationPromise;
    } finally {
      initializationPromise = undefined;
    }
  };

  const disposeProjectsStore = () => {
    unlistenProjectMutations?.();
    unlistenProjectMutations = undefined;
    initializationPromise = undefined;
    isInitialized = false;
    setIsProjectsInitializedState(false);
  };

  return (
    <ProjectsContext.Provider
      value={{
        projects: projectsState,
        isProjectsInitialized: isProjectsInitializedState,
        selectedProjectId: selectedProjectIdState,
        selectedProjectName,
        selectProject,
        setProjectTaskCount,
        reloadProjects,
        openProject,
        openProjectInSeparateWindow,
        deleteProject,
        clearAllProjects,
        initializeProjectsStore,
        disposeProjectsStore,
      }}
    >
      {props.children}
    </ProjectsContext.Provider>
  );
}

export function useProjects(): ProjectsContextValue {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }

  return context;
}
