// A browser ResizeObserver delivery warning is not a game engine exception.
// Only exact browser messages are benign; never swallow unrelated exceptions.
const BENIGN_RESIZE_WARNINGS=new Set([
  'ResizeObserver loop completed with undelivered notifications.',
  'ResizeObserver loop limit exceeded'
]);
export function isBenignResizeObserverWarning(message){
  const value=String(message??'').trim();
  return BENIGN_RESIZE_WARNINGS.has(value)||BENIGN_RESIZE_WARNINGS.has(value.endsWith('.')?value.slice(0,-1):value);
}
// Once Phaser has mounted its canvas, errors must never wipe out the live
// game DOM. RuntimeCrashDiagnostics retains genuine errors separately.
export function mayReplaceStartupScreen(appRoot){
  return !!appRoot&&typeof appRoot.querySelector==='function'&&!appRoot.querySelector('canvas');
}
