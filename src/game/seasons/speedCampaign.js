// Permanent post-Induction campaign.
// Deliberately disabled until the required driving telemetry is wired.
// Keep this content timeless: the player-facing UI must not call it "Season 1".

export const SPEED_CAMPAIGN = {
  id: 'speed',
  family: 'speed',
  permanent: true,
  enabled: false,
  premiumEnabled: false,
  title: { es: 'VELOCIDAD', en: 'SPEED' },
  subtitle: {
    es: 'Cada décima cuenta',
    en: 'Every tenth counts'
  },
  stages: [
    {
      id: 'speed-green-light',
      title: { es: 'Semáforo verde', en: 'Green Light' },
      description: { es: 'Completa 3 vueltas.', en: 'Complete 3 laps.' },
      objective: { type: 'laps', target: 3 },
      reward: { coins: 300 }
    },
    {
      id: 'speed-flat-out',
      title: { es: 'Pie a fondo', en: 'Flat Out' },
      description: { es: 'Mantén velocidad alta durante 12 s acumulados.', en: 'Hold high speed for 12 seconds total.' },
      objective: { type: 'highSpeedSeconds', target: 12 },
      reward: { items: { gear: 4 } }
    },
    {
      id: 'speed-no-lift',
      title: { es: 'Sin levantar', en: 'No Lift' },
      description: { es: 'Completa una vuelta sin frenar.', en: 'Complete a lap without braking.' },
      objective: { type: 'noBrakeLaps', target: 1 },
      reward: { coins: 450 }
    },
    {
      id: 'speed-beat-yourself',
      title: { es: 'A contrarreloj', en: 'Against the Clock' },
      description: { es: 'Supera tu mejor tiempo personal.', en: 'Beat your personal best.' },
      objective: { type: 'personalBestImprovements', target: 1 },
      reward: { items: { rubber: 5 } }
    },
    {
      id: 'speed-another-machine',
      title: { es: 'Otra máquina', en: 'Another Machine' },
      description: { es: 'Completa vueltas con 2 coches distintos.', en: 'Complete laps with 2 different cars.' },
      objective: { type: 'carsUsed', target: 2, minLapsPerCar: 1 },
      reward: { coins: 600 }
    },
    {
      id: 'speed-red-zone',
      title: { es: 'Zona roja', en: 'Red Zone' },
      description: { es: 'Alcanza la velocidad objetivo 3 veces.', en: 'Reach the target speed 3 times.' },
      objective: { type: 'topSpeedHits', target: 3 },
      reward: { items: { alloy: 5 } }
    },
    {
      id: 'speed-clean-pb',
      title: { es: 'Vuelta perfecta', en: 'Perfect Lap' },
      description: { es: 'Mejora tu récord en una vuelta limpia.', en: 'Set a personal best on a clean lap.' },
      objective: { type: 'cleanPersonalBest', target: 1 },
      reward: { coins: 750 }
    },
    {
      id: 'speed-away',
      title: { es: 'Fuera de casa', en: 'Away From Home' },
      description: { es: 'Completa una vuelta en 3 circuitos distintos.', en: 'Complete a lap on 3 different tracks.' },
      objective: { type: 'tracks', target: 3, minPerTrack: 1 },
      reward: { items: { disc: 4 } }
    },
    {
      id: 'speed-tenths',
      title: { es: 'Afinando décimas', en: 'Chasing Tenths' },
      description: { es: 'Mejora tu récord personal 2 veces.', en: 'Improve your personal best twice.' },
      objective: { type: 'personalBestImprovements', target: 2 },
      reward: { coins: 900 }
    },
    {
      id: 'speed-race-ready',
      title: { es: 'Preparado para correr', en: 'Race Ready' },
      description: { es: 'Equipa una mejora y completa una vuelta.', en: 'Equip an upgrade and complete a lap.' },
      objective: {
        type: 'combined',
        target: 2,
        parts: [
          { type: 'equippedSinceStart', target: 1 },
          { type: 'laps', target: 1 }
        ]
      },
      reward: { items: { compound: 4 } }
    },
    {
      id: 'speed-consistency',
      title: { es: 'Consistencia', en: 'Consistency' },
      description: { es: 'Encadena 3 vueltas dentro del margen de tiempo.', en: 'Run 3 laps inside the target time window.' },
      objective: { type: 'consistentLaps', target: 3 },
      reward: { coins: 1100 }
    },
    {
      id: 'speed-ghost-hunter',
      title: { es: 'Cazafantasmas', en: 'Ghost Hunter' },
      description: { es: 'Completa un desafío VS Ghost.', en: 'Complete a VS Ghost challenge.' },
      objective: { type: 'ghostCompletions', target: 1 },
      reward: { items: { ecu: 1 } }
    },
    {
      id: 'speed-benchmark',
      title: { es: 'Más rápido que ayer', en: 'Faster Than Yesterday' },
      description: { es: 'Bate el tiempo objetivo de VELOCIDAD.', en: 'Beat the SPEED campaign benchmark.' },
      objective: { type: 'campaignBenchmark', target: 1, benchmarkId: 'speed-main' },
      reward: { coins: 1500 }
    },
    {
      id: 'speed-master',
      title: { es: 'VELOCIDAD', en: 'SPEED' },
      description: { es: 'Domina los 3 desafíos finales de velocidad.', en: 'Master the 3 final speed challenges.' },
      objective: {
        type: 'combined',
        target: 3,
        parts: [
          { type: 'cleanPersonalBest', target: 1 },
          { type: 'ghostCompletions', target: 1 },
          { type: 'campaignBenchmark', target: 1, benchmarkId: 'speed-main' }
        ]
      },
      reward: {
        car: {
          id: 'speed_campaign_reward',
          name: { es: 'Recompensa VELOCIDAD', en: 'SPEED Reward' },
          exclusive: true,
          assetPending: true
        }
      }
    }
  ],
  telemetryRequirements: [
    'highSpeedSeconds',
    'noBrakeLaps',
    'personalBestImprovements',
    'carsUsed',
    'topSpeedHits',
    'cleanPersonalBest',
    'equippedSinceStart',
    'consistentLaps',
    'ghostCompletions',
    'campaignBenchmark'
  ]
};

export default SPEED_CAMPAIGN;
