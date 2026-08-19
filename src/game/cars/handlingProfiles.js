// src/game/cars/handlingProfiles.js
// Perfiles base de conducción (valores “razonables” para arcade top-down)
// Unidades: mismas que tu juego (px/s, px/s^2, rad/s, coeficientes 0..1)

export const HANDLING_PROFILES = {
  DIRECT: {
    steering: {
      yawSpeedMin: 18, steerSat: 0.35, lowSpeedSteer: 0.20, highSpeedLimit: 0.55, lateralGrip: 10,
      inputRiseRate: 10.5, inputReturnRate: 15.0, inputReverseRate: 8.5
    },
    engine: { throttleGamma: 1.25, coastDrag: 0.018, brakeDrag: 0.060 },
    tires:  { gripSpeedGain: 0.00 } // kart: sin “aero”
  },

  F1_DOWNFORCE: {
    steering: {
      yawSpeedMin: 18, steerSat: 0.30, lowSpeedSteer: 0.22, highSpeedLimit: 0.52, lateralGrip: 12,
      inputRiseRate: 9.5, inputReturnRate: 15.0, inputReverseRate: 8.0
    },
    engine: { throttleGamma: 1.20, coastDrag: 0.020, brakeDrag: 0.070 },
    tires:  { gripSpeedGain: 0.12 } // grip aumenta con velocidad (simula downforce)
  },

  ARCADE: {
    steering: {
      yawSpeedMin: 12, steerSat: 0.45, lowSpeedSteer: 0.35, highSpeedLimit: 0.75, lateralGrip: 6,
      inputRiseRate: 9.5, inputReturnRate: 14.0, inputReverseRate: 7.5
    },
    engine: { throttleGamma: 1.35, coastDrag: 0.016, brakeDrag: 0.055 },
    tires:  { gripSpeedGain: 0.04 }
  },

  RALLY_LOOSE: {
    steering: {
      yawSpeedMin: 10, steerSat: 0.50, lowSpeedSteer: 0.40, highSpeedLimit: 0.80, lateralGrip: 3,
      inputRiseRate: 8.5, inputReturnRate: 12.5, inputReverseRate: 7.0
    },
    engine: { throttleGamma: 1.45, coastDrag: 0.014, brakeDrag: 0.050 },
    tires:  { gripSpeedGain: 0.02 }
  },

  DRIFT: {
    steering: {
      yawSpeedMin: 12, steerSat: 0.40, lowSpeedSteer: 0.45, highSpeedLimit: 0.85, lateralGrip: 1.8,
      inputRiseRate: 8.0, inputReturnRate: 11.0, inputReverseRate: 6.5
    },
    engine: { throttleGamma: 1.10, coastDrag: 0.012, brakeDrag: 0.045 },
    tires:  { gripSpeedGain: 0.00 }
  },

  HEAVY_TRUCK: {
    steering: {
      yawSpeedMin: 16, steerSat: 0.55, lowSpeedSteer: 0.25, highSpeedLimit: 0.60, lateralGrip: 5,
      inputRiseRate: 7.0, inputReturnRate: 12.0, inputReverseRate: 6.0
    },
    engine: { throttleGamma: 1.55, coastDrag: 0.022, brakeDrag: 0.070 },
    tires:  { gripSpeedGain: 0.03 }
  }
};
