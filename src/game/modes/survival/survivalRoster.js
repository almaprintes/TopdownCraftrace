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

  // Survival is a race, so intrinsic pace must be driven mainly by speed and
  // acceleration. Handling still matters, but it must never make a heavy/slow
  // vehicle rate like an elite speed car.
  const design =
    Number(ds.VEL || 0) * 0.45 +
    Number(ds.ACC || 0) * 0.30 +
    Number(ds.GIR || 0) * 0.10 +
    Number(ds.EST || 0) * 0.05 +
    Number(ds.FRN || 0) * 0.10;

  // Homologated physical values provide a meaningful cross-check so the order
  // reflects the cars players actually drive, not only their presentation stats.
  const physical =
    clamp((Number(spec.maxFwd || 0) - 500) / 1.5, 0, 100) * 0.55 +
    clamp((Number(spec.accel || 0) - 650) / 2.5, 0, 100) * 0.30 +
    clamp((Number(spec.turnRate || 0) - 2.5) * 45, 0, 100) * 0.10 +
    clamp(Number(spec.gripDrive || 0) * 500, 0, 100) * 0.05;

  return design * 0.70 + physical * 0.30;
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
 * ~3% above the player's estimated pace. This makes winning demanding rather
 * than mathematically impossible, and avoids hidden rubber-band boosts.
 */
export function buildSurvivalRoster(playerCarId, cpuCount = 5) {
  const playerSpec = CAR_SPECS[playerCarId] || OFFICIAL_CARS[0];
  if (!playerSpec) return [];

  const wanted = Math.max(1, Math.min(cpuCount, Math.max(1, OFFICIAL_CARS.length - 1)));
  const cpuSpecs = nearestDistinctCars(playerSpec, wanted)
    .slice()
    .sort((a, b) => survivalCarScore(a) - survivalCarScore(b) || String(a.id).localeCompare(String(b.id)));
  const playerScore = Math.max(1, survivalCarScore(playerSpec));

  // Assign AI skill only AFTER the cars are ordered by intrinsic performance.
  // This prevents a slow car from receiving the strongest AI slot while a fast
  // car receives the weakest one.
  const skillLadder = [0.94, 0.965, 0.985, 1.005, 1.03];
  const cpu = cpuSpecs.map((spec, index) => {
    const carScore = survivalCarScore(spec);
    const rawCarRatio = carScore / playerScore;
    const carRatio = clamp(rawCarRatio, 0.94, 1.045);
    const skill = skillLadder[Math.min(index, skillLadder.length - 1)];
    const targetPace = clamp(carRatio * skill, 0.90, 1.03);
    return {
      type: 'cpu',
      id: `cpu-${index + 1}`,
      label: `CPU ${index + 1}`,
      carId: spec.id,
      spec,
      carScore,
      targetPace
    };
  });

  // Enforce a strictly increasing pace ladder in the same slow-to-fast order.
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

  // Slowest intrinsic car starts at the front; fastest starts at the back.
  const grid = [player, ...cpu].sort((a, b) =>
    a.carScore - b.carScore || (a.type === 'player' ? -1 : 1)
  );

  return grid.map((entry, gridIndex) => ({ ...entry, gridIndex }));
}
