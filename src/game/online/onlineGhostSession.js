// Ephemeral handoff for Race Control -> Ghost mode.
// Deliberately memory-only: no localStorage/sessionStorage and no second Supabase read.
let pending=null;
export function setOnlineGhostChallenge(value){pending=value?.ghost?.samples?.length?value:null;return pending;}
export function consumeOnlineGhostChallenge(){const value=pending;pending=null;return value;}
export function peekOnlineGhostChallenge(){return pending;}
