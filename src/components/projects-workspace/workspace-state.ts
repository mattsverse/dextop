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

/**
 * Create a pane node identifier from a sequential pane number.
 *
 * @param nextPaneNumber - The sequential number used to form the pane id
 * @returns The pane id string in the form `pane-N` where `N` is `nextPaneNumber`
 */
function createPaneId(nextPaneNumber: number): string {
  return `pane-${nextPaneNumber}`;
}

/**
 * Create a split node identifier from the provided split counter.
 *
 * @param nextSplitNumber - Monotonic counter used to construct the identifier
 * @returns The split id in the form `split-{n}`, where `{n}` is `nextSplitNumber`
 */
function createSplitId(nextSplitNumber: number): string {
  return `split-${nextSplitNumber}`;
}

/**
 * Creates a workspace pane node with a generated id and an optional project assignment.
 *
 * @param projectId - The project id to assign to the pane, or `null` for none.
 * @param nextPaneNumber - Numeric suffix used to generate the pane's `id`.
 * @returns A `WorkspacePaneNode` whose `id` is `pane-${nextPaneNumber}` and `projectId` set as provided.
 */
function createPane(projectId: string | null, nextPaneNumber: number): WorkspacePaneNode {
  return {
    kind: "pane",
    id: createPaneId(nextPaneNumber),
    projectId,
  };
}

/**
 * Create an initial workspace state containing a single pane.
 *
 * @param projectId - The project id to assign to the initial pane, or `null` for an empty pane
 * @returns A WorkspaceState whose root is a single pane assigned the provided `projectId` (or `null`), `focusedPaneId` set to that pane, `nextPaneNumber` set to `2`, and `nextSplitNumber` set to `1`
 */
export function createWorkspaceState(projectId: string | null = null): WorkspaceState {
  return {
    root: createPane(projectId, 1),
    focusedPaneId: createPaneId(1),
    nextPaneNumber: 2,
    nextSplitNumber: 1,
  };
}

/**
 * Type guard that checks whether a workspace node represents a pane.
 *
 * @returns `true` if the node is a pane node (narrows to `WorkspacePaneNode`), `false` otherwise.
 */
export function isWorkspacePaneNode(node: WorkspaceNode): node is WorkspacePaneNode {
  return node.kind === "pane";
}

/**
 * Collects all pane nodes contained in the given subtree in left-to-right order.
 *
 * @param node - The workspace node to traverse (pane or split)
 * @returns An array of `WorkspacePaneNode` instances found in the subtree, ordered by traversal (left child before right child)
 */
export function listWorkspacePanes(node: WorkspaceNode): WorkspacePaneNode[] {
  if (node.kind === "pane") {
    return [node];
  }

  return [...listWorkspacePanes(node.children[0]), ...listWorkspacePanes(node.children[1])];
}

/**
 * Locate a pane node with the given id within the subtree.
 *
 * @returns The matching `WorkspacePaneNode` if found, `null` otherwise.
 */
export function getWorkspacePaneById(
  node: WorkspaceNode,
  paneId: string,
): WorkspacePaneNode | null {
  if (node.kind === "pane") {
    return node.id === paneId ? node : null;
  }

  return getWorkspacePaneById(node.children[0], paneId) ?? getWorkspacePaneById(node.children[1], paneId);
}

/**
 * Collects all node IDs in the subtree rooted at `node` using a left-to-right traversal.
 *
 * @returns An array of all node IDs (both pane and split) in traversal order (parent before children for splits, left subtree then right subtree).
 */
function listWorkspaceNodeIds(node: WorkspaceNode): string[] {
  if (node.kind === "pane") {
    return [node.id];
  }

  return [node.id, ...listWorkspaceNodeIds(node.children[0]), ...listWorkspaceNodeIds(node.children[1])];
}

/**
 * Ensure a panel size is a positive finite number.
 *
 * @param value - The size value to validate and clamp
 * @returns `0` if `value` is not finite or is less than or equal to 0, otherwise returns `value`
 */
function clampPanelSize(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return value;
}

/**
 * Convert a pair of raw panel sizes into normalized percentage sizes that sum to 100.
 *
 * Missing or invalid entries default to the module's DEFAULT_SIZES. If the provided sizes sum to
 * zero or less after clamping, the default sizes are returned. Returned values are percentages
 * for the left and right panels rounded to one decimal place.
 *
 * @param sizes - A two-element tuple or array representing raw sizes for left and right panels
 * @returns The normalized `[leftPercent, rightPercent]` pair, each rounded to one decimal place
 */
export function normalizeSplitSizes(sizes: [number, number] | number[]): [number, number] {
  const left = clampPanelSize(sizes[0] ?? DEFAULT_SIZES[0]);
  const right = clampPanelSize(sizes[1] ?? DEFAULT_SIZES[1]);
  const total = left + right;

  if (total <= 0) {
    return [...DEFAULT_SIZES];
  }

  return [Math.round((left / total) * 1000) / 10, Math.round((right / total) * 1000) / 10];
}

/**
 * Ensure a value yields a valid workspace split axis.
 *
 * @param value - Input to normalize; only the exact string `"vertical"` is preserved
 * @returns `'vertical'` if `value` strictly equals `"vertical"`, `'horizontal'` otherwise
 */
function normalizeSplitAxis(value: unknown): WorkspaceSplitAxis {
  return value === "vertical" ? "vertical" : "horizontal";
}

/**
 * Replace a pane node with the given `paneId` in a workspace subtree by applying an updater function.
 *
 * @param node - The workspace node to search and update
 * @param paneId - The id of the pane to replace
 * @param update - Function that receives the matching `WorkspacePaneNode` and returns the replacement `WorkspaceNode`
 * @returns The updated workspace node subtree; returns the original subtree if no pane with `paneId` is found
 */
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

/**
 * Split the specified pane into two along the given axis and focus the newly created pane.
 *
 * @param state - The current workspace state
 * @param paneId - ID of the pane to split
 * @param axis - Split orientation (`"horizontal"` or `"vertical"`)
 * @returns The updated workspace state where the target pane is replaced by a split node containing the original pane and a new empty pane, the focus is set to the new pane, and pane/split counters are incremented
 */
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

/**
 * Removes the pane with the specified `paneId` from the given subtree, collapsing its parent split when the sibling replaces the removed pane.
 *
 * @param node - The subtree to operate on (a pane or split node)
 * @param paneId - The id of the pane to remove
 * @returns A `ClosePaneResult` containing the updated subtree as `node` and `removed` set to `true` if a pane was removed, `false` otherwise
 */
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

/**
 * Get the first pane ID found in the given subtree.
 *
 * @param node - Root workspace node to search
 * @returns The first pane's `id` in traversal order, or an empty string if no pane exists
 */
function getFirstPaneId(node: WorkspaceNode): string {
  return listWorkspacePanes(node)[0]?.id ?? "";
}

/**
 * Remove a pane from the workspace tree, collapsing any redundant split node and updating focus.
 *
 * @param state - The current workspace state
 * @param paneId - The id of the pane to remove
 * @returns The updated workspace state with the specified pane removed and the focused pane adjusted when necessary; if the pane was not removed (because it doesn't exist or the workspace contains only one pane), returns the original `state`
 */
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

/**
 * Set focus to the pane with the given pane id if that pane exists in the workspace.
 *
 * @param state - The current workspace state
 * @param paneId - The id of the pane to focus
 * @returns The updated workspace state with `focusedPaneId` set to `paneId` if the pane exists, otherwise the original state unchanged
 */
export function focusWorkspacePane(state: WorkspaceState, paneId: string): WorkspaceState {
  return getWorkspacePaneById(state.root, paneId)
    ? { ...state, focusedPaneId: paneId }
    : state;
}

/**
 * Set the project assignment for a specific pane in the workspace state.
 *
 * @param paneId - The id of the pane to update
 * @param projectId - The project id to assign to the pane, or `null` to clear it
 * @returns The workspace state with the pane's `projectId` updated; returns the original state unchanged if the pane was not found
 */
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

/**
 * Recursively traverses a workspace node tree and applies `update` to the split node with `id === splitId`.
 *
 * @param node - The current workspace node to process (pane or split)
 * @param splitId - The identifier of the split node to replace
 * @param update - A function that receives the matching `WorkspaceSplitNode` and returns its replacement
 * @returns The resulting `WorkspaceNode` with the matching split replaced; if no matching split is found, returns the original subtree unchanged
 */
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

/**
 * Update the sizes for a split node in the workspace tree.
 *
 * @param state - The current workspace state
 * @param splitId - The id of the split node to update
 * @param sizes - Two numeric proportions (or an array of numbers) for the split; values will be normalized and clamped
 * @returns The updated WorkspaceState with the specified split node's `sizes` replaced by normalized values
 */
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

/**
 * Populate a map with normalized rectangles for every pane in the given subtree.
 *
 * @param node - The workspace node to traverse (pane or split).
 * @param rect - The bounding rectangle for `node` using normalized coordinates `{ x, y, width, height }`.
 * @param byPaneId - Map to populate with entries mapping each pane's `id` to its computed rectangle.
 */
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

/**
 * Computes normalized layout rectangles for every pane in the workspace tree.
 *
 * Traverses `node` and assigns each pane a `WorkspaceRect` with `x`, `y`, `width`, and `height` normalized to the unit rectangle [0,1]×[0,1].
 *
 * @param node - Root workspace node to compute pane rectangles from
 * @returns A map from pane id to its normalized `WorkspaceRect`
 */
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

/**
 * Compute the length of the intersection between two one-dimensional intervals.
 *
 * @param startA - Start coordinate of the first interval (order relative to `endA` is not required)
 * @param endA - End coordinate of the first interval (order relative to `startA` is not required)
 * @param startB - Start coordinate of the second interval (order relative to `endB` is not required)
 * @param endB - End coordinate of the second interval (order relative to `startB` is not required)
 * @returns The overlapping length of the two intervals, or `0` if they do not overlap
 */
function overlapAmount(startA: number, endA: number, startB: number, endB: number): number {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

/**
 * Move the workspace focus to the best candidate pane in the specified direction.
 *
 * Searches panes spatially and selects the adjacent pane in `direction` using
 * a prioritized heuristic: smallest gap in the movement axis, then largest
 * overlap on the orthogonal axis, then smallest center-to-center distance.
 *
 * @param state - The current workspace state
 * @param direction - Direction to move focus (`left`, `right`, `up`, or `down`)
 * @returns A workspace state with `focusedPaneId` set to the chosen adjacent pane, or the original `state` if no suitable pane exists
 */
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

/**
 * Advance focus to the next pane in traversal order, wrapping to the first pane.
 *
 * @returns The workspace state with `focusedPaneId` set to the next pane in traversal order; if the current focused pane is missing, sets focus to the first pane; returns the original state unchanged when the workspace has one or zero panes.
 */
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

/**
 * Return a sanitized copy of a workspace node tree where pane `projectId`s are restricted to a given set and split nodes are normalized.
 *
 * @param node - The workspace node subtree to sanitize
 * @param projectIds - Set of allowed project IDs; pane `projectId` values not contained in this set will be replaced with `null`
 * @returns A new `WorkspaceNode` with pane `projectId`s filtered, split `axis` and `sizes` normalized, and children recursively processed
 */
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

/**
 * Compute the next numeric suffix for node IDs using the given prefix.
 *
 * @param node - The workspace subtree to scan for existing node IDs
 * @param prefix - The ID prefix to search for (`"pane"` or `"split"`)
 * @returns The next integer to use for an ID of the form `<prefix>-<n>`, i.e. one greater than the highest numeric suffix found (returns `1` if no matching IDs exist)
 */
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

/**
 * Parse an unknown value into a sanitized WorkspaceNode or return `null` if invalid.
 *
 * Attempts to interpret `rawNode` as either a `pane` or a `split`. For pane nodes, trims and
 * accepts string `id` and `projectId`, substituting a generated pane id or `null` project when
 * missing or empty. For split nodes, parses the first two children recursively and:
 * - returns `null` if neither child is valid,
 * - returns the single valid child if the other is absent (eliminating the split wrapper),
 * - otherwise returns a split node with a normalized `axis`, normalized `sizes`, and a generated
 *   split id when necessary.
 *
 * @param rawNode - Raw input (e.g., parsed JSON) representing a workspace node
 * @returns A sanitized `WorkspaceNode` when `rawNode` represents a valid pane or split, or `null` when it cannot be parsed
 */
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

/**
 * Get the first pane's projectId found in the subtree rooted at `node`, or `null` if none exists.
 *
 * @param node - Root workspace node to search for pane project IDs
 * @returns The first `projectId` string encountered among panes, or `null` when no pane has a projectId
 */
function getFallbackPaneProjectId(node: WorkspaceNode): string | null {
  return listWorkspacePanes(node).find((pane) => pane.projectId)?.projectId ?? null;
}

/**
 * Convert and sanitize an arbitrary value into a valid WorkspaceState.
 *
 * Parses a raw, potentially malformed workspace representation, repairs or replaces the root tree as needed,
 * strips pane `projectId`s that are not in `validProjectIds`, ensures the focused pane exists (or selects a fallback),
 * and computes valid `nextPaneNumber` and `nextSplitNumber` counters. If the input is not an object a fresh workspace
 * is created. If `fallbackProjectId` is provided and no pane in the sanitized tree has an allowed project, the
 * fallback project is assigned to the focused pane.
 *
 * @param rawState - The untrusted input to normalize (may be any value).
 * @param validProjectIds - Set of allowed project IDs; pane `projectId`s not in this set are removed (set to `null`).
 * @param fallbackProjectId - Optional project ID to assign to the focused pane when no pane has an allowed project.
 * @returns A well-formed WorkspaceState with a sanitized root, a valid `focusedPaneId`, and derived `next*Number` counters.
 */
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

/**
 * Serializes a workspace state to a JSON string.
 *
 * @param state - The workspace state to serialize
 * @returns A JSON string representation of `state`
 */
export function serializeWorkspaceState(state: WorkspaceState): string {
  return JSON.stringify(state);
}
