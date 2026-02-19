export const REQUEST_UPDATE_CHECK_EVENT = "app:request-update-check";

export function requestManualUpdateCheck() {
  window.dispatchEvent(new CustomEvent(REQUEST_UPDATE_CHECK_EVENT));
}
