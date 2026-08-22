// Shared physical race AI controller.
// Duel, Survival and future race modes should import this module instead of
// depending on a mode-specific controller name.
import { updateSurvivalPhysicalBot } from './survivalPhysicalBotController.js';

export function updateRacePhysicalBot(bot,profile,options={}){
  return updateSurvivalPhysicalBot(bot,profile,options);
}
