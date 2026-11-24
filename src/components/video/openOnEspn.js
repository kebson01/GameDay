// Opens an ESPN video page over the app. Always call from a tap/click handler
// (browsers only allow new windows from a user action).
// - Installed on the home screen (PWA): iOS shows ESPN in a Safari sheet with
//   "Done", Android in a Chrome custom tab with "X"; closing returns to GameDay.
// - In a browser tab: opens a new tab, leaving the GameDay tab where it was.
export function openOnEspn(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}
