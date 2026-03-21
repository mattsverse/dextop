import { describe, expect, test } from "bun:test";
import {
  assignProjectToPane,
  closeWorkspacePane,
  createWorkspaceState,
  focusWorkspacePane,
  moveWorkspaceFocus,
  normalizeWorkspaceState,
  splitWorkspacePane,
  updateSplitSizes,
} from "./workspace-state";

describe("workspace-state", () => {
  test("splits a focused pane and focuses the new sibling", () => {
    const initialState = createWorkspaceState("alpha");
    const nextState = splitWorkspacePane(initialState, initialState.focusedPaneId, "horizontal");

    expect(nextState.root.kind).toBe("split");
    if (nextState.root.kind !== "split") {
      return;
    }

    expect(nextState.root.axis).toBe("horizontal");
    expect(nextState.root.children[0].kind).toBe("pane");
    expect(nextState.root.children[1].kind).toBe("pane");
    if (nextState.root.children[0].kind !== "pane" || nextState.root.children[1].kind !== "pane") {
      return;
    }
    expect(nextState.root.children[0].projectId).toBe("alpha");
    expect(nextState.root.children[1].projectId).toBeNull();
    expect(nextState.focusedPaneId).toBe(nextState.root.children[1].id);
  });

  test("closing a pane promotes its sibling", () => {
    const initialState = createWorkspaceState("alpha");
    const splitState = splitWorkspacePane(initialState, initialState.focusedPaneId, "horizontal");
    const assignedState = assignProjectToPane(splitState, splitState.focusedPaneId, "beta");
    const nextState = closeWorkspacePane(assignedState, splitState.focusedPaneId);

    expect(nextState.root.kind).toBe("pane");
    if (nextState.root.kind !== "pane") {
      return;
    }

    expect(nextState.root.projectId).toBe("alpha");
    expect(nextState.focusedPaneId).toBe(nextState.root.id);
  });

  test("assigns a project to an explicit pane", () => {
    const initialState = createWorkspaceState();
    const nextState = assignProjectToPane(initialState, initialState.focusedPaneId, "alpha");

    expect(nextState.root.kind).toBe("pane");
    if (nextState.root.kind !== "pane") {
      return;
    }

    expect(nextState.root.projectId).toBe("alpha");
  });

  test("moves focus between adjacent panes using pane geometry", () => {
    const initialState = createWorkspaceState("alpha");
    const splitState = splitWorkspacePane(initialState, initialState.focusedPaneId, "horizontal");
    const leftPaneId =
      splitState.root.kind === "split" && splitState.root.children[0].kind === "pane"
        ? splitState.root.children[0].id
        : "";
    const rightPaneId =
      splitState.root.kind === "split" && splitState.root.children[1].kind === "pane"
        ? splitState.root.children[1].id
        : "";

    const verticalState = splitWorkspacePane(splitState, rightPaneId, "vertical");
    const sizedState =
      verticalState.root.kind === "split" && verticalState.root.children[1].kind === "split"
        ? updateSplitSizes(verticalState, verticalState.root.children[1].id, [55, 45])
        : verticalState;

    const focusedLeft = focusWorkspacePane(sizedState, leftPaneId);
    const movedRight = moveWorkspaceFocus(focusedLeft, "right");
    const movedDown = moveWorkspaceFocus(movedRight, "down");

    expect(movedRight.focusedPaneId).not.toBe(leftPaneId);
    expect(movedDown.focusedPaneId).not.toBe(movedRight.focusedPaneId);
  });

  test("normalizes persisted layouts and clears deleted projects", () => {
    const normalizedState = normalizeWorkspaceState(
      {
        root: {
          kind: "split",
          id: "split-9",
          axis: "horizontal",
          sizes: [80, 20],
          children: [
            {
              kind: "pane",
              id: "pane-2",
              projectId: "missing-project",
            },
            {
              kind: "pane",
              id: "pane-5",
              projectId: "alpha",
            },
          ],
        },
        focusedPaneId: "pane-404",
      },
      new Set(["alpha", "beta"]),
      "beta",
    );

    expect(normalizedState.root.kind).toBe("split");
    if (normalizedState.root.kind !== "split") {
      return;
    }

    expect(normalizedState.root.children[0].kind).toBe("pane");
    expect(normalizedState.root.children[1].kind).toBe("pane");
    if (
      normalizedState.root.children[0].kind !== "pane" ||
      normalizedState.root.children[1].kind !== "pane"
    ) {
      return;
    }

    expect(normalizedState.root.children[0].projectId).toBeNull();
    expect(normalizedState.root.children[1].projectId).toBe("alpha");
    expect(normalizedState.focusedPaneId).toBe("pane-2");
  });

  test("hydrates an empty or invalid persisted state from the fallback project", () => {
    const normalizedState = normalizeWorkspaceState(
      {
        root: {
          kind: "pane",
          id: "pane-1",
          projectId: "deleted-project",
        },
        focusedPaneId: "pane-1",
      },
      new Set(["alpha", "beta"]),
      "beta",
    );

    expect(normalizedState.root.kind).toBe("pane");
    if (normalizedState.root.kind !== "pane") {
      return;
    }

    expect(normalizedState.root.projectId).toBe("beta");
  });
});
