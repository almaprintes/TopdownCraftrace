import { CAR_SPECS } from '../../cars/carSpecs.js';

const OFFICIAL_CARS = Object.values(CAR_SPECS)
  .filter(spec => spec?.id && spec?.skin && Number(spec?.collectionNo) > 0)
  .sort((a, b) => Number(a.collectionNo || 0) - Number(b.collectionNo || 0));

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/**
 * Stable car-performance estimate used only for Survival matchmaking/grid order.
 * It intentionally uses the homologated/design values already owned by carSpecs;
 * Survival must not invent a second physics table.
 */
export function survivalCarScore(spec) {
  if (!spec) return 0;
  const ds = spec.designStats || {};
  const design =
    Number(ds.VEL || 0) * 0.30 +
    Number(ds.ACC || 0) * 0.24 +
    Number(ds.GIR || 0) * 0.20 +
    Number(ds.EST || 0) * 0.14 +
    Number(ds.FRN || 0) * 0.12;

  // Small tie-breaker from the actual homologated physical values.  The design
  // score remains dominant so technical cars are not judged only by top speed.
  const physical =
    clamp((Number(spec.maxFwd || 0) - 500) / 1.5, 0, 100) * 0.45 +
    clamp((Number(spec.accel || 0) - 650) / 2.5, 0, 100) * 0.25 +
    clamp((Number(spec.turnRate || 0) - 2.5) * 45, 0, 100) * 0.20 +
    clamp(Number(spec.gripDrive || 0) * 500, 0, 100) * 0.10;

  return design * 0.88 + physical * 0.12;
}

export function getOfficialSurvivalCars() {
  return OFFICIAL_CARS.slice();
}

function nearestDistinctCars(playerSpec, count) {
  const playerScore = survivalCarScore(playerSpec);
  return OFFICIAL_CARS
    .filter(spec => spec.id !== playerSpec.id)
    .map(spec => ({ spec, score: survivalCarScore(spec) }))
    .sort((a, b) => {
      const da = Math.abs(a.score - playerScore);
      const db = Math.abs(b.score - playerScore);
      return da - db || a.score - b.score || String(a.spec.id).localeCompare(String(b.spec.id));
    })
    .slice(0, count)
    .map(entry => entry.spec);
}

/**
 * Creates the six-car Survival field: player + five different CPU cars.
 *
 * CPU difficulty is deliberately bounded around the selected player's car.
 * Better CPU slots are progressively faster, but the quickest target is only
 * ~3% above the player's estimated pace.  This makes winning demanding rather
 * than mathematically impossible, and avoids hidden rubber-band boosts.
 */
export function buildSurvivalRoster(playerCarId, cpuCount = 5) {
  const playerSpec = CAR_SPECS[playerCarId] || OFFICIAL_CARS[0];
  if (!playerSpec) return [];

  const wanted = Math.max(1, Math.min(cpuCount, Math.max(1, OFFICIAL_CARS.length - 1)));
  const cpuSpecs = nearestDistinctCars(playerSpec, wanted);
  const playerScore = Math.max(1, survivalCarScore(playerSpec));

  // Stable skill ladder.  No per-frame rubber banding: these values are fixed
  // when the race is built.  Last CPU is strong but still inside a beatable cap.
  const skillLadder = [0.94, 0.965, 0.985, 1.005, 1.03];
  const cpu = cpuSpecs
    .map((spec, index) => {
      const rawCarRatio = survivalCarScore(spec) / playerScore;
      // Prevent a very strong/weak catalogue neighbour from making the matchup
      // unfair. Car identity still matters, but effective target pace is capped.
      const carRatio = clamp(rawCarRatio, 0.94, 1.045);
      const skill = skillLadder[Math.min(index, skillLadder.length - 1)];
      const targetPace = clamp(carRatio * skill, 0.90, 1.03);
      return {
        type: 'cpu',
        id: `cpu-${index + 1}`,
        label: `CPU ${index + 1}`,
        carId: spec.id,
        spec,
        carScore: survivalCarScore(spec),
        targetPace
      };
    })
    .sort((a, b) => a.targetPace - b.targetPace || a.carScore - b.carScore);

  // Enforce a strictly increasing pace ladder even if catalogue ratios collapse
  // after clamping.  The final cap remains 1.03 relative to the player.
  let previous = 0.89;
  for (let i = 0; i < cpu.length; i += 1) {
    const maxHere = 1.03 - (cpu.length - 1 - i) * 0.006;
    cpu[i].targetPace = clamp(Math.max(cpu[i].targetPace, previous + 0.006), 0.90, maxHere);
    previous = cpu[i].targetPace;
  }

  const player = {
    type: 'player',
    id: 'player',
    label: 'TÚ',
    carId: playerSpec.id,
    spec: playerSpec,
    carScore: survivalCarScore(playerSpec),
    targetPace: 1
  };

  // Grid order is based on intrinsic car performance, not hidden AI skill:
  // slowest car at the front, fastest car at the back, including the player.
  const grid = [player, ...cpu].sort((a, b) =>
    a.carScore - b.carScore || (a.type === 'player' ? -1 : 1)
  );

  return grid.map((entry, gridIndex) => ({ ...entry, gridIndex }));
}
