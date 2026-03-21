import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  projects: ProjectItem[];
  isProjectsInitialized: boolean;
  selectedProjectId: string | null;
  selectedProjectName: string;
  selectProject: (projectId: string | null) => void;
  setProjectTaskCount: (projectPath: string, taskCount: number) => void;
  reloadProjects: () => Promise<void>;
  openProject: () => Promise<void>;
  openProjectInSeparateWindow: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  clearAllProjects: () => Promise<void>;
  initializeProjectsStore: () => Promise<void>;
  disposeProjectsStore: () => void;
};

const ProjectsContext = createContext<ProjectsContextValue | undefined>(undefined);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isProjectsInitialized, setIsProjectsInitialized] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const unlistenProjectMutationsRef = useRef<(() => void) | undefined>(undefined);
  const initializationPromiseRef = useRef<Promise<void> | undefined>(undefined);
  const isInitializedRef = useRef(false);

  const ensureSelection = useCallback((projectList: ProjectItem[]) => {
    setSelectedProjectId((currentSelection) => {
      if (currentSelection && projectList.some((project) => project.id === currentSelection)) {
        return currentSelection;
      }

      return projectList[0]?.id ?? null;
    });
  }, []);

  const reloadProjects = useCallback(async () => {
    const loadedProjects = await listProjects();

    setProjects((currentProjects) => {
      const taskCountsByPath = new Map(
        currentProjects.map((project) => [project.path, project.tasks] as const),
      );

      const nextProjects = loadedProjects.map((project) => ({
        ...project,
        tasks: taskCountsByPath.get(project.path) ?? project.tasks,
      }));

      ensureSelection(nextProjects);
      return nextProjects;
    });
  }, [ensureSelection]);

  const selectProject = useCallback((projectId: string | null) => {
    setSelectedProjectId(projectId);
  }, []);

  const setProjectTaskCount = useCallback((projectPath: string, taskCount: number) => {
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.path === projectPath ? { ...project, tasks: taskCount } : project,
      ),
    );
  }, []);

  const openProject = useCallback(async () => {
    try {
      await openProjectRequest();
    } catch (error) {
      console.error("Failed to add project", error);
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      await deleteProjectRequest(projectId);
    } catch (error) {
      console.error("Failed to delete project", error);
    }
  }, []);

  const openProjectInSeparateWindow = useCallback(async (projectId: string) => {
    try {
      await openProjectWindowRequest(projectId);
    } catch (error) {
      console.error("Failed to open project in a separate window", error);
    }
  }, []);

  const clearAllProjects = useCallback(async () => {
    try {
      await clearProjectsRequest();
      await reloadProjects();
    } catch (error) {
      console.error("Failed to clear projects", error);
    }
  }, [reloadProjects]);

  const initializeProjectsStore = useCallback(async () => {
    if (isInitializedRef.current) {
      return;
    }

    if (initializationPromiseRef.current) {
      return initializationPromiseRef.current;
    }

    initializationPromiseRef.current = (async () => {
      await reloadProjects();
      unlistenProjectMutationsRef.current = await listenToProjectMutations({
        onProjectAdded: (project) => {
          setProjects((currentProjects) => {
            const existingProject = currentProjects.find(
              (currentProject) =>
                currentProject.id === project.id || currentProject.path === project.path,
            );

            const nextProjects = [
              {
                ...project,
                tasks: existingProject?.tasks ?? project.tasks,
              },
              ...currentProjects.filter(
                (currentProject) =>
                  currentProject.id !== project.id && currentProject.path !== project.path,
              ),
            ];

            ensureSelection(nextProjects);
            return nextProjects;
          });
        },
        onProjectDeleted: (projectId) => {
          setProjects((currentProjects) => {
            const remainingProjects = currentProjects.filter((project) => project.id !== projectId);
            ensureSelection(remainingProjects);
            return remainingProjects;
          });
        },
      });
      isInitializedRef.current = true;
      setIsProjectsInitialized(true);
    })();

    try {
      await initializationPromiseRef.current;
    } finally {
      initializationPromiseRef.current = undefined;
    }
  }, [ensureSelection, reloadProjects]);

  const disposeProjectsStore = useCallback(() => {
    unlistenProjectMutationsRef.current?.();
    unlistenProjectMutationsRef.current = undefined;
    initializationPromiseRef.current = undefined;
    isInitializedRef.current = false;
    setIsProjectsInitialized(false);
  }, []);

  const selectedProjectName = useMemo(
    () =>
      projects.find((project) => project.id === selectedProjectId)?.name ?? "No project selected",
    [projects, selectedProjectId],
  );

  useEffect(() => {
    void initializeProjectsStore().catch((error) => {
      console.error("Failed to initialize projects store", error);
    });

    return () => {
      disposeProjectsStore();
    };
  }, [disposeProjectsStore, initializeProjectsStore]);

  const value = useMemo<ProjectsContextValue>(
    () => ({
      projects,
      isProjectsInitialized,
      selectedProjectId,
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
    }),
    [
      clearAllProjects,
      deleteProject,
      disposeProjectsStore,
      initializeProjectsStore,
      isProjectsInitialized,
      openProject,
      openProjectInSeparateWindow,
      projects,
      reloadProjects,
      selectProject,
      selectedProjectId,
      selectedProjectName,
      setProjectTaskCount,
    ],
  );

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects(): ProjectsContextValue {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }

  return context;
}
