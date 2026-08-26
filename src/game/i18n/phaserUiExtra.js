import { canonicalRuntimeText } from './canonicalRuntimeText.js';

// Kept as a compatibility facade for existing imports in game.js.
// All actual translation choices are centralized in canonicalRuntimeText.js.
export function localizePlayerPhaserText(value){
  return canonicalRuntimeText(value);
}
