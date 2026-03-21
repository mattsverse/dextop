export const TMUX_PREFIX_LABEL = "Ctrl+B";
export const SPLIT_SIDE_BY_SIDE_LABEL = `${TMUX_PREFIX_LABEL}, %`;
export const SPLIT_STACKED_LABEL = `${TMUX_PREFIX_LABEL}, "`;
export const CLOSE_PANE_LABEL = `${TMUX_PREFIX_LABEL}, X`;
export const NEXT_PANE_LABEL = `${TMUX_PREFIX_LABEL}, O`;
export const MOVE_LEFT_PANE_LABEL = `${TMUX_PREFIX_LABEL}, Left`;
export const MOVE_RIGHT_PANE_LABEL = `${TMUX_PREFIX_LABEL}, Right`;
export const MOVE_UP_PANE_LABEL = `${TMUX_PREFIX_LABEL}, Up`;
export const MOVE_DOWN_PANE_LABEL = `${TMUX_PREFIX_LABEL}, Down`;

export const WORKSPACE_COMMAND_EVENT = "dextop:workspace-command";

export type WorkspaceCommand =
  | "split-horizontal"
  | "split-vertical"
  | "close-pane"
  | "next-pane"
  | "focus-left"
  | "focus-right"
  | "focus-up"
  | "focus-down";

/**
 * Dispatches a workspace command as a CustomEvent on `window`.
 *
 * @param command - The workspace command to dispatch; the emitted event's `detail` will contain this value.
 */
export function dispatchWorkspaceCommand(command: WorkspaceCommand): void {
  window.dispatchEvent(
    new CustomEvent<WorkspaceCommand>(WORKSPACE_COMMAND_EVENT, {
      detail: command,
    }),
  );
}
