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
    tires: {
      gripSpeedGain: 0.00,
      slipStartDeg: 4.5, slipFullDeg: 13.0, cornerGripFloor: 0.62,
      throttleGripLoss: 0.08, brakeGripLoss: 0.10
    }
  },

  F1_DOWNFORCE: {
    steering: {
      yawSpeedMin: 18, steerSat: 0.30, lowSpeedSteer: 0.22, highSpeedLimit: 0.52, lateralGrip: 12,
      inputRiseRate: 9.5, inputReturnRate: 15.0, inputReverseRate: 8.0
    },
    engine: { throttleGamma: 1.20, coastDrag: 0.020, brakeDrag: 0.070 },
    tires: {
      gripSpeedGain: 0.12,
      slipStartDeg: 4.0, slipFullDeg: 11.5, cornerGripFloor: 0.68,
      throttleGripLoss: 0.07, brakeGripLoss: 0.09
    }
  },

  ARCADE: {
    steering: {
      yawSpeedMin: 12, steerSat: 0.45, lowSpeedSteer: 0.35, highSpeedLimit: 0.75, lateralGrip: 6,
      inputRiseRate: 9.5, inputReturnRate: 14.0, inputReverseRate: 7.5
    },
    engine: { throttleGamma: 1.35, coastDrag: 0.016, brakeDrag: 0.055 },
    tires: {
      gripSpeedGain: 0.04,
      slipStartDeg: 5.0, slipFullDeg: 14.0, cornerGripFloor: 0.58,
      throttleGripLoss: 0.10, brakeGripLoss: 0.12
    }
  },

  RALLY_LOOSE: {
    steering: {
      yawSpeedMin: 10, steerSat: 0.50, lowSpeedSteer: 0.40, highSpeedLimit: 0.80, lateralGrip: 3,
      inputRiseRate: 8.5, inputReturnRate: 12.5, inputReverseRate: 7.0
    },
    engine: { throttleGamma: 1.45, coastDrag: 0.014, brakeDrag: 0.050 },
    tires: {
      gripSpeedGain: 0.02,
      slipStartDeg: 4.0, slipFullDeg: 10.0, cornerGripFloor: 0.42,
      throttleGripLoss: 0.13, brakeGripLoss: 0.16
    }
  },

  DRIFT: {
    steering: {
      yawSpeedMin: 12, steerSat: 0.40, lowSpeedSteer: 0.45, highSpeedLimit: 0.85, lateralGrip: 1.8,
      inputRiseRate: 8.0, inputReturnRate: 11.0, inputReverseRate: 6.5
    },
    engine: { throttleGamma: 1.10, coastDrag: 0.012, brakeDrag: 0.045 },
    tires: {
      gripSpeedGain: 0.00,
      slipStartDeg: 3.0, slipFullDeg: 8.0, cornerGripFloor: 0.30,
      throttleGripLoss: 0.18, brakeGripLoss: 0.14
    }
  },

  HEAVY_TRUCK: {
    steering: {
      yawSpeedMin: 16, steerSat: 0.55, lowSpeedSteer: 0.25, highSpeedLimit: 0.60, lateralGrip: 5,
      inputRiseRate: 7.0, inputReturnRate: 12.0, inputReverseRate: 6.0
    },
    engine: { throttleGamma: 1.55, coastDrag: 0.022, brakeDrag: 0.070 },
    tires: {
      gripSpeedGain: 0.03,
      slipStartDeg: 5.5, slipFullDeg: 15.0, cornerGripFloor: 0.65,
      throttleGripLoss: 0.08, brakeGripLoss: 0.10
    }
  },

  // ---------------------------------------------------------
  // HÉLIX — school cars: forgiving first, progressively faster
  // and more demanding inside the same neutral family character.
  // ---------------------------------------------------------
  HELIX_SPARK: {
    steering: {
      yawSpeedMin: 13, steerSat: 0.48, lowSpeedSteer: 0.31, highSpeedLimit: 0.72, lateralGrip: 7.4,
      inputRiseRate: 8.2, inputReturnRate: 14.5, inputReverseRate: 6.8
    },
    engine: { throttleGamma: 1.48, coastDrag: 0.018, brakeDrag: 0.060 },
    tires: {
      gripSpeedGain: 0.03,
      slipStartDeg: 6.4, slipFullDeg: 17.5, cornerGripFloor: 0.72,
      throttleGripLoss: 0.06, brakeGripLoss: 0.08
    }
  },

  HELIX_COMET: {
    steering: {
      yawSpeedMin: 13, steerSat: 0.45, lowSpeedSteer: 0.33, highSpeedLimit: 0.74, lateralGrip: 6.8,
      inputRiseRate: 9.0, inputReturnRate: 14.5, inputReverseRate: 7.3
    },
    engine: { throttleGamma: 1.40, coastDrag: 0.017, brakeDrag: 0.058 },
    tires: {
      gripSpeedGain: 0.035,
      slipStartDeg: 5.7, slipFullDeg: 15.5, cornerGripFloor: 0.65,
      throttleGripLoss: 0.08, brakeGripLoss: 0.10
    }
  },

  HELIX_PULSE: {
    steering: {
      yawSpeedMin: 13, steerSat: 0.42, lowSpeedSteer: 0.35, highSpeedLimit: 0.76, lateralGrip: 6.2,
      inputRiseRate: 9.8, inputReturnRate: 14.3, inputReverseRate: 7.8
    },
    engine: { throttleGamma: 1.32, coastDrag: 0.016, brakeDrag: 0.057 },
    tires: {
      gripSpeedGain: 0.04,
      slipStartDeg: 5.0, slipFullDeg: 13.6, cornerGripFloor: 0.58,
      throttleGripLoss: 0.10, brakeGripLoss: 0.12
    }
  },

  // ---------------------------------------------------------
  // CROWN — polished all-rounders. More performance than HÉLIX,
  // same readable balance, but progressively less forgiving.
  // ---------------------------------------------------------
  CROWN_AXIS: {
    steering: {
      yawSpeedMin: 14, steerSat: 0.43, lowSpeedSteer: 0.32, highSpeedLimit: 0.70, lateralGrip: 7.8,
      inputRiseRate: 9.1, inputReturnRate: 14.7, inputReverseRate: 7.4
    },
    engine: { throttleGamma: 1.34, coastDrag: 0.017, brakeDrag: 0.061 },
    tires: {
      gripSpeedGain: 0.045,
      slipStartDeg: 5.9, slipFullDeg: 15.4, cornerGripFloor: 0.69,
      throttleGripLoss: 0.07, brakeGripLoss: 0.09
    }
  },

  CROWN_VECTOR: {
    steering: {
      yawSpeedMin: 15, steerSat: 0.39, lowSpeedSteer: 0.31, highSpeedLimit: 0.67, lateralGrip: 8.3,
      inputRiseRate: 9.8, inputReturnRate: 15.0, inputReverseRate: 7.9
    },
    engine: { throttleGamma: 1.28, coastDrag: 0.016, brakeDrag: 0.063 },
    tires: {
      gripSpeedGain: 0.06,
      slipStartDeg: 5.2, slipFullDeg: 13.8, cornerGripFloor: 0.63,
      throttleGripLoss: 0.09, brakeGripLoss: 0.10
    }
  },

  CROWN_EQUINOX: {
    steering: {
      yawSpeedMin: 15, steerSat: 0.37, lowSpeedSteer: 0.30, highSpeedLimit: 0.64, lateralGrip: 8.7,
      inputRiseRate: 10.3, inputReturnRate: 15.2, inputReverseRate: 8.4
    },
    engine: { throttleGamma: 1.23, coastDrag: 0.015, brakeDrag: 0.065 },
    tires: {
      gripSpeedGain: 0.07,
      slipStartDeg: 4.7, slipFullDeg: 12.4, cornerGripFloor: 0.57,
      throttleGripLoss: 0.11, brakeGripLoss: 0.12
    }
  },

  // ---------------------------------------------------------
  // AVENIR — front-end precision. Fast turn-in and high corner
  // potential, but steering mistakes and weight transfer cost more.
  // ---------------------------------------------------------
  AVENIR_GRIPLINE: {
    steering: {
      yawSpeedMin: 14, steerSat: 0.36, lowSpeedSteer: 0.37, highSpeedLimit: 0.74, lateralGrip: 9.4,
      inputRiseRate: 10.0, inputReturnRate: 15.5, inputReverseRate: 8.2
    },
    engine: { throttleGamma: 1.32, coastDrag: 0.016, brakeDrag: 0.065 },
    tires: {
      gripSpeedGain: 0.07,
      slipStartDeg: 5.4, slipFullDeg: 13.9, cornerGripFloor: 0.66,
      throttleGripLoss: 0.08, brakeGripLoss: 0.10
    }
  },

  AVENIR_APEX: {
    steering: {
      yawSpeedMin: 15, steerSat: 0.32, lowSpeedSteer: 0.39, highSpeedLimit: 0.72, lateralGrip: 10.1,
      inputRiseRate: 10.8, inputReturnRate: 15.8, inputReverseRate: 8.9
    },
    engine: { throttleGamma: 1.24, coastDrag: 0.015, brakeDrag: 0.067 },
    tires: {
      gripSpeedGain: 0.085,
      slipStartDeg: 4.7, slipFullDeg: 12.0, cornerGripFloor: 0.58,
      throttleGripLoss: 0.10, brakeGripLoss: 0.12
    }
  },

  AVENIR_TORQUE: {
    steering: {
      yawSpeedMin: 16, steerSat: 0.29, lowSpeedSteer: 0.40, highSpeedLimit: 0.70, lateralGrip: 10.7,
      inputRiseRate: 11.4, inputReturnRate: 16.0, inputReverseRate: 9.5
    },
    engine: { throttleGamma: 1.18, coastDrag: 0.014, brakeDrag: 0.069 },
    tires: {
      gripSpeedGain: 0.10,
      slipStartDeg: 4.1, slipFullDeg: 10.7, cornerGripFloor: 0.50,
      throttleGripLoss: 0.12, brakeGripLoss: 0.14
    }
  },

  // ---------------------------------------------------------
  // VELOCE — high-speed family. Flash intentionally stays ARCADE
  // as Physics Base 1.0 reference. Surge and Photon amplify speed
  // while reducing the margin for steering/throttle mistakes.
  // ---------------------------------------------------------
  VELOCE_SURGE: {
    steering: {
      yawSpeedMin: 17, steerSat: 0.42, lowSpeedSteer: 0.31, highSpeedLimit: 0.61, lateralGrip: 6.4,
      inputRiseRate: 9.2, inputReturnRate: 14.8, inputReverseRate: 7.5
    },
    engine: { throttleGamma: 1.18, coastDrag: 0.013, brakeDrag: 0.058 },
    tires: {
      gripSpeedGain: 0.05,
      slipStartDeg: 4.6, slipFullDeg: 12.2, cornerGripFloor: 0.52,
      throttleGripLoss: 0.13, brakeGripLoss: 0.12
    }
  },

  VELOCE_PHOTON: {
    steering: {
      yawSpeedMin: 18, steerSat: 0.40, lowSpeedSteer: 0.29, highSpeedLimit: 0.56, lateralGrip: 6.1,
      inputRiseRate: 9.0, inputReturnRate: 15.2, inputReverseRate: 7.3
    },
    engine: { throttleGamma: 1.10, coastDrag: 0.012, brakeDrag: 0.060 },
    tires: {
      gripSpeedGain: 0.06,
      slipStartDeg: 3.9, slipFullDeg: 10.3, cornerGripFloor: 0.43,
      throttleGripLoss: 0.16, brakeGripLoss: 0.14
    }
  },

  // ---------------------------------------------------------
  // FORGE — parallel off-road family. Heavy, slow steering and
  // lower road speed, but huge traction reserve and predictable
  // breakaway. Surface hardware provides the adverse-condition edge.
  // ---------------------------------------------------------
  FORGE_HAMMER: {
    steering: {
      yawSpeedMin: 15, steerSat: 0.56, lowSpeedSteer: 0.27, highSpeedLimit: 0.61, lateralGrip: 5.8,
      inputRiseRate: 7.2, inputReturnRate: 11.8, inputReverseRate: 5.9
    },
    engine: { throttleGamma: 1.38, coastDrag: 0.023, brakeDrag: 0.072 },
    tires: {
      gripSpeedGain: 0.025,
      slipStartDeg: 6.0, slipFullDeg: 16.5, cornerGripFloor: 0.70,
      throttleGripLoss: 0.06, brakeGripLoss: 0.09
    }
  },

  FORGE_ANVIL: {
    steering: {
      yawSpeedMin: 16, steerSat: 0.59, lowSpeedSteer: 0.25, highSpeedLimit: 0.58, lateralGrip: 5.5,
      inputRiseRate: 6.7, inputReturnRate: 11.3, inputReverseRate: 5.5
    },
    engine: { throttleGamma: 1.30, coastDrag: 0.024, brakeDrag: 0.074 },
    tires: {
      gripSpeedGain: 0.03,
      slipStartDeg: 6.2, slipFullDeg: 17.0, cornerGripFloor: 0.72,
      throttleGripLoss: 0.055, brakeGripLoss: 0.09
    }
  },

  FORGE_COLOSSUS: {
    steering: {
      yawSpeedMin: 17, steerSat: 0.63, lowSpeedSteer: 0.22, highSpeedLimit: 0.54, lateralGrip: 5.2,
      inputRiseRate: 6.1, inputReturnRate: 10.8, inputReverseRate: 5.0
    },
    engine: { throttleGamma: 1.24, coastDrag: 0.026, brakeDrag: 0.078 },
    tires: {
      gripSpeedGain: 0.035,
      slipStartDeg: 6.5, slipFullDeg: 18.0, cornerGripFloor: 0.75,
      throttleGripLoss: 0.05, brakeGripLoss: 0.08
    }
  }
};
