export type WorkspaceSplitAxis = "horizontal" | "vertical";
export type WorkspaceMoveDirection = "left" | "right" | "up" | "down";

export type WorkspacePaneNode = {
  kind: "pane";
  id: string;
  projectId: string | null;
};

export type WorkspaceSplitNode = {
  kind: "split";
  id: string;
  axis: WorkspaceSplitAxis;
  sizes: [number, number];
  children: [WorkspaceNode, WorkspaceNode];
};

export type WorkspaceNode = WorkspacePaneNode | WorkspaceSplitNode;

export type WorkspaceState = {
  root: WorkspaceNode;
  focusedPaneId: string;
  nextPaneNumber: number;
  nextSplitNumber: number;
};

type WorkspaceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const DEFAULT_SIZES: [number, number] = [50, 50];

function createPaneId(nextPaneNumber: number): string {
  return `pane-${nextPaneNumber}`;
}

function createSplitId(nextSplitNumber: number): string {
  return `split-${nextSplitNumber}`;
}

function createPane(projectId: string | null, nextPaneNumber: number): WorkspacePaneNode {
  return {
    kind: "pane",
    id: createPaneId(nextPaneNumber),
    projectId,
  };
}

export function createWorkspaceState(projectId: string | null = null): WorkspaceState {
  return {
    root: createPane(projectId, 1),
    focusedPaneId: createPaneId(1),
    nextPaneNumber: 2,
    nextSplitNumber: 1,
  };
}

export function isWorkspacePaneNode(node: WorkspaceNode): node is WorkspacePaneNode {
  return node.kind === "pane";
}

export function listWorkspacePanes(node: WorkspaceNode): WorkspacePaneNode[] {
  if (node.kind === "pane") {
    return [node];
  }

  return [...listWorkspacePanes(node.children[0]), ...listWorkspacePanes(node.children[1])];
}

export function getWorkspacePaneNumber(node: WorkspaceNode, paneId: string): number | null {
  const paneIndex = listWorkspacePanes(node).findIndex((pane) => pane.id === paneId);
  return paneIndex === -1 ? null : paneIndex + 1;
}

export function getWorkspacePaneById(
  node: WorkspaceNode,
  paneId: string,
): WorkspacePaneNode | null {
  if (node.kind === "pane") {
    return node.id === paneId ? node : null;
  }

  return getWorkspacePaneById(node.children[0], paneId) ?? getWorkspacePaneById(node.children[1], paneId);
}

function listWorkspaceNodeIds(node: WorkspaceNode): string[] {
  if (node.kind === "pane") {
    return [node.id];
  }

  return [node.id, ...listWorkspaceNodeIds(node.children[0]), ...listWorkspaceNodeIds(node.children[1])];
}

function clampPanelSize(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return value;
}

export function normalizeSplitSizes(sizes: [number, number] | number[]): [number, number] {
  const left = clampPanelSize(sizes[0] ?? DEFAULT_SIZES[0]);
  const right = clampPanelSize(sizes[1] ?? DEFAULT_SIZES[1]);
  const total = left + right;

  if (total <= 0) {
    return [...DEFAULT_SIZES];
  }

  return [Math.round((left / total) * 1000) / 10, Math.round((right / total) * 1000) / 10];
}

function normalizeSplitAxis(value: unknown): WorkspaceSplitAxis {
  return value === "vertical" ? "vertical" : "horizontal";
}

function replacePaneNode(
  node: WorkspaceNode,
  paneId: string,
  update: (pane: WorkspacePaneNode) => WorkspaceNode,
): WorkspaceNode {
  if (node.kind === "pane") {
    return node.id === paneId ? update(node) : node;
  }

  return {
    ...node,
    children: [
      replacePaneNode(node.children[0], paneId, update),
      replacePaneNode(node.children[1], paneId, update),
    ],
  };
}

export function splitWorkspacePane(
  state: WorkspaceState,
  paneId: string,
  axis: WorkspaceSplitAxis,
): WorkspaceState {
  if (!getWorkspacePaneById(state.root, paneId)) {
    return state;
  }

  const nextPane = createPane(null, state.nextPaneNumber);
  const nextSplitId = createSplitId(state.nextSplitNumber);

  return {
    root: replacePaneNode(state.root, paneId, (pane) => ({
      kind: "split",
      id: nextSplitId,
      axis,
      sizes: [...DEFAULT_SIZES],
      children: [pane, nextPane],
    })),
    focusedPaneId: nextPane.id,
    nextPaneNumber: state.nextPaneNumber + 1,
    nextSplitNumber: state.nextSplitNumber + 1,
  };
}

type ClosePaneResult = {
  node: WorkspaceNode;
  removed: boolean;
};

function closePaneFromNode(node: WorkspaceNode, paneId: string): ClosePaneResult {
  if (node.kind === "pane") {
    return { node, removed: false };
  }

  const [left, right] = node.children;
  if (left.kind === "pane" && left.id === paneId) {
    return { node: right, removed: true };
  }

  if (right.kind === "pane" && right.id === paneId) {
    return { node: left, removed: true };
  }

  const leftResult = closePaneFromNode(left, paneId);
  if (leftResult.removed) {
    return {
      removed: true,
      node: {
        ...node,
        children: [leftResult.node, right],
      },
    };
  }

  const rightResult = closePaneFromNode(right, paneId);
  if (rightResult.removed) {
    return {
      removed: true,
      node: {
        ...node,
        children: [left, rightResult.node],
      },
    };
  }

  return { node, removed: false };
}

function getFirstPaneId(node: WorkspaceNode): string {
  return listWorkspacePanes(node)[0]?.id ?? "";
}

export function closeWorkspacePane(state: WorkspaceState, paneId: string): WorkspaceState {
  const panes = listWorkspacePanes(state.root);
  if (panes.length <= 1) {
    return state;
  }

  const result = closePaneFromNode(state.root, paneId);
  if (!result.removed) {
    return state;
  }

  const nextFocusedPaneId =
    state.focusedPaneId === paneId ? getFirstPaneId(result.node) : state.focusedPaneId;

  return {
    ...state,
    root: result.node,
    focusedPaneId: nextFocusedPaneId,
  };
}

export function focusWorkspacePane(state: WorkspaceState, paneId: string): WorkspaceState {
  return getWorkspacePaneById(state.root, paneId)
    ? { ...state, focusedPaneId: paneId }
    : state;
}

export function assignProjectToPane(
  state: WorkspaceState,
  paneId: string,
  projectId: string | null,
): WorkspaceState {
  if (!getWorkspacePaneById(state.root, paneId)) {
    return state;
  }

  return {
    ...state,
    root: replacePaneNode(state.root, paneId, (pane) => ({
      ...pane,
      projectId,
    })),
  };
}

function replaceSplitNode(
  node: WorkspaceNode,
  splitId: string,
  update: (split: WorkspaceSplitNode) => WorkspaceSplitNode,
): WorkspaceNode {
  if (node.kind === "pane") {
    return node;
  }

  if (node.id === splitId) {
    return update(node);
  }

  return {
    ...node,
    children: [
      replaceSplitNode(node.children[0], splitId, update),
      replaceSplitNode(node.children[1], splitId, update),
    ],
  };
}

export function updateSplitSizes(
  state: WorkspaceState,
  splitId: string,
  sizes: [number, number] | number[],
): WorkspaceState {
  return {
    ...state,
    root: replaceSplitNode(state.root, splitId, (split) => ({
      ...split,
      sizes: normalizeSplitSizes(sizes),
    })),
  };
}

function collectPaneRects(
  node: WorkspaceNode,
  rect: WorkspaceRect,
  byPaneId: Map<string, WorkspaceRect>,
): void {
  if (node.kind === "pane") {
    byPaneId.set(node.id, rect);
    return;
  }

  const [leftSize] = normalizeSplitSizes(node.sizes);
  if (node.axis === "horizontal") {
    const leftWidth = rect.width * (leftSize / 100);
    collectPaneRects(node.children[0], { ...rect, width: leftWidth }, byPaneId);
    collectPaneRects(
      node.children[1],
      {
        ...rect,
        x: rect.x + leftWidth,
        width: rect.width - leftWidth,
      },
      byPaneId,
    );
    return;
  }

  const topHeight = rect.height * (leftSize / 100);
  collectPaneRects(node.children[0], { ...rect, height: topHeight }, byPaneId);
  collectPaneRects(
    node.children[1],
    {
      ...rect,
      y: rect.y + topHeight,
      height: rect.height - topHeight,
    },
    byPaneId,
  );
}

function getPaneRects(node: WorkspaceNode): Map<string, WorkspaceRect> {
  const byPaneId = new Map<string, WorkspaceRect>();
  collectPaneRects(
    node,
    {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
    byPaneId,
  );
  return byPaneId;
}

function overlapAmount(startA: number, endA: number, startB: number, endB: number): number {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

export function moveWorkspaceFocus(
  state: WorkspaceState,
  direction: WorkspaceMoveDirection,
): WorkspaceState {
  const rects = getPaneRects(state.root);
  const currentRect = rects.get(state.focusedPaneId);
  if (!currentRect) {
    return state;
  }

  let nextPaneId: string | null = null;
  let bestGap = Number.POSITIVE_INFINITY;
  let bestOverlap = Number.NEGATIVE_INFINITY;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const [paneId, rect] of rects) {
    if (paneId === state.focusedPaneId) {
      continue;
    }

    let gap = Number.POSITIVE_INFINITY;
    let overlap = 0;
    let distance = Number.POSITIVE_INFINITY;

    if (direction === "left") {
      overlap = overlapAmount(currentRect.y, currentRect.y + currentRect.height, rect.y, rect.y + rect.height);
      gap = currentRect.x - (rect.x + rect.width);
      distance = Math.abs(currentRect.y + currentRect.height / 2 - (rect.y + rect.height / 2));
    } else if (direction === "right") {
      overlap = overlapAmount(currentRect.y, currentRect.y + currentRect.height, rect.y, rect.y + rect.height);
      gap = rect.x - (currentRect.x + currentRect.width);
      distance = Math.abs(currentRect.y + currentRect.height / 2 - (rect.y + rect.height / 2));
    } else if (direction === "up") {
      overlap = overlapAmount(currentRect.x, currentRect.x + currentRect.width, rect.x, rect.x + rect.width);
      gap = currentRect.y - (rect.y + rect.height);
      distance = Math.abs(currentRect.x + currentRect.width / 2 - (rect.x + rect.width / 2));
    } else {
      overlap = overlapAmount(currentRect.x, currentRect.x + currentRect.width, rect.x, rect.x + rect.width);
      gap = rect.y - (currentRect.y + currentRect.height);
      distance = Math.abs(currentRect.x + currentRect.width / 2 - (rect.x + rect.width / 2));
    }

    if (gap < -0.0001 || overlap <= 0) {
      continue;
    }

    if (
      gap < bestGap - 0.0001 ||
      (Math.abs(gap - bestGap) <= 0.0001 && overlap > bestOverlap + 0.0001) ||
      (Math.abs(gap - bestGap) <= 0.0001 &&
        Math.abs(overlap - bestOverlap) <= 0.0001 &&
        distance < bestDistance)
    ) {
      nextPaneId = paneId;
      bestGap = gap;
      bestOverlap = overlap;
      bestDistance = distance;
    }
  }

  return nextPaneId ? { ...state, focusedPaneId: nextPaneId } : state;
}

export function focusNextWorkspacePane(state: WorkspaceState): WorkspaceState {
  const panes = listWorkspacePanes(state.root);
  if (panes.length <= 1) {
    return state;
  }

  const currentIndex = panes.findIndex((pane) => pane.id === state.focusedPaneId);
  if (currentIndex === -1) {
    return {
      ...state,
      focusedPaneId: panes[0]?.id ?? state.focusedPaneId,
    };
  }

  const nextIndex = (currentIndex + 1) % panes.length;
  return {
    ...state,
    focusedPaneId: panes[nextIndex]?.id ?? state.focusedPaneId,
  };
}

function collectProjectIds(node: WorkspaceNode, projectIds: Set<string>): WorkspaceNode {
  if (node.kind === "pane") {
    return {
      ...node,
      projectId: node.projectId && projectIds.has(node.projectId) ? node.projectId : null,
    };
  }

  return {
    ...node,
    axis: normalizeSplitAxis(node.axis),
    sizes: normalizeSplitSizes(node.sizes),
    children: [
      collectProjectIds(node.children[0], projectIds),
      collectProjectIds(node.children[1], projectIds),
    ],
  };
}

function deriveNextNumber(node: WorkspaceNode, prefix: "pane" | "split"): number {
  let max = 0;
  for (const id of listWorkspaceNodeIds(node)) {
    const match = id.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (!match) {
      continue;
    }

    const value = Number(match[1]);
    if (Number.isInteger(value)) {
      max = Math.max(max, value);
    }
  }

  return max + 1;
}

type RawWorkspaceNode = {
  kind?: unknown;
  id?: unknown;
  projectId?: unknown;
  axis?: unknown;
  sizes?: unknown;
  children?: unknown;
};

function parseWorkspaceNode(rawNode: unknown): WorkspaceNode | null {
  if (!rawNode || typeof rawNode !== "object") {
    return null;
  }

  const node = rawNode as RawWorkspaceNode;
  if (node.kind === "pane") {
    return {
      kind: "pane",
      id: typeof node.id === "string" && node.id.trim() ? node.id : createPaneId(1),
      projectId: typeof node.projectId === "string" && node.projectId.trim() ? node.projectId : null,
    };
  }

  if (node.kind === "split" && Array.isArray(node.children) && node.children.length >= 2) {
    const left = parseWorkspaceNode(node.children[0]);
    const right = parseWorkspaceNode(node.children[1]);

    if (!left && !right) {
      return null;
    }

    if (!left) {
      return right;
    }

    if (!right) {
      return left;
    }

    return {
      kind: "split",
      id: typeof node.id === "string" && node.id.trim() ? node.id : createSplitId(1),
      axis: normalizeSplitAxis(node.axis),
      sizes: normalizeSplitSizes(Array.isArray(node.sizes) ? node.sizes : DEFAULT_SIZES),
      children: [left, right],
    };
  }

  return null;
}

function getFallbackPaneProjectId(node: WorkspaceNode): string | null {
  return listWorkspacePanes(node).find((pane) => pane.projectId)?.projectId ?? null;
}

export function normalizeWorkspaceState(
  rawState: unknown,
  validProjectIds: Set<string>,
  fallbackProjectId: string | null = null,
): WorkspaceState {
  if (!rawState || typeof rawState !== "object") {
    return createWorkspaceState(fallbackProjectId);
  }

  const candidate = rawState as Partial<WorkspaceState>;
  const parsedRoot = parseWorkspaceNode(candidate.root);
  const sanitizedRoot = collectProjectIds(
    parsedRoot ?? createWorkspaceState(fallbackProjectId).root,
    validProjectIds,
  );

  const panes = listWorkspacePanes(sanitizedRoot);
  const nextFocusedPaneId =
    typeof candidate.focusedPaneId === "string" &&
    panes.some((pane) => pane.id === candidate.focusedPaneId)
      ? candidate.focusedPaneId
      : panes[0]?.id ?? createPaneId(1);

  const nextState: WorkspaceState = {
    root: sanitizedRoot,
    focusedPaneId: nextFocusedPaneId,
    nextPaneNumber:
      typeof candidate.nextPaneNumber === "number" && candidate.nextPaneNumber > 0
        ? candidate.nextPaneNumber
        : deriveNextNumber(sanitizedRoot, "pane"),
    nextSplitNumber:
      typeof candidate.nextSplitNumber === "number" && candidate.nextSplitNumber > 0
        ? candidate.nextSplitNumber
        : deriveNextNumber(sanitizedRoot, "split"),
  };

  if (fallbackProjectId && !validProjectIds.has(getFallbackPaneProjectId(nextState.root) ?? "")) {
    return assignProjectToPane(nextState, nextState.focusedPaneId, fallbackProjectId);
  }

  return nextState;
}

export function serializeWorkspaceState(state: WorkspaceState): string {
  return JSON.stringify(state);
}
