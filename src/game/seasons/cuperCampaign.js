// Permanent post-induction Crown campaign. No timer; access via Avenir Gripline 500 km.
export const CUPER_MILEAGE_GATE_METERS=500000;
export const CUPER_STATE_KEY='tdr2:seasonCuper:v1';
export const CUPER_EVENT_DEFS=[
  {
    "id": "cuper-invitation",
    "title": {
      "es": "Bienvenido a Crown",
      "en": "Welcome to Crown"
    },
    "description": {
      "es": "Visita el garaje para empezar la temporada.",
      "en": "Visit your garage to begin the campaign."
    },
    "objective": {
      "type": "garageVisits",
      "target": 1,
      "label": {
        "es": "progreso",
        "en": "progress"
      }
    },
    "reward": {
      "coins": 300
    },
    "help": {
      "es": "En el lobby toca GARAJE o el coche para entrar. Vuelve a Temporadas y reclama el premio.",
      "en": "In the lobby open GARAGE, then return to Seasons."
    }
  },
  {
    "id": "cuper-keys",
    "title": {
      "es": "Las llaves del Cuper",
      "en": "Keys to the Cuper"
    },
    "description": {
      "es": "Completa una vuelta limpia en cualquier circuito cerrado.",
      "en": "Complete a clean lap on any closed circuit."
    },
    "objective": {
      "type": "clean",
      "target": 1,
      "label": {
        "es": "progreso",
        "en": "progress"
      }
    },
    "reward": {
      "car": {
        "id": "crown_cuper",
        "name": {
          "es": "Crown Cuper Original",
          "en": "Crown Cuper Original"
        },
        "image": "assets/skins/skin_crown_cuper_original.webp"
      }
    },
    "help": {
      "es": "En el lobby pulsa JUGAR → CONTRARRELOJ y completa una vuelta sin penalizaciones.",
      "en": "Choose PLAY → TIME TRIAL and complete a clean lap."
    }
  },
  {
    "id": "cuper-first-km",
    "title": {
      "es": "Primer contacto",
      "en": "First Contact"
    },
    "description": {
      "es": "Recorre un kilómetro con el Crown Cuper.",
      "en": "Drive one kilometer in the Crown Cuper."
    },
    "objective": {
      "type": "cuperMeters",
      "target": 1000,
      "label": {
        "es": "metros",
        "en": "meters"
      }
    },
    "reward": {
      "items": {
        "rubber": 6
      }
    },
    "help": {
      "es": "Selecciona Cuper en GARAJE y conduce: el cuentakilómetros suma desde el primer movimiento.",
      "en": "Select Cuper in GARAGE and drive; mileage counts from your first movement."
    }
  },
  {
    "id": "cuper-tune",
    "title": {
      "es": "Ajuste de fábrica",
      "en": "Factory Tune"
    },
    "description": {
      "es": "Equipa una mejora en el Crown Cuper.",
      "en": "Equip an upgrade on the Crown Cuper."
    },
    "objective": {
      "type": "cuperEquipped",
      "target": 1,
      "label": {
        "es": "progreso",
        "en": "progress"
      }
    },
    "reward": {
      "coins": 500
    },
    "help": {
      "es": "GARAJE → FÁBRICA: equipa una pieza que ya tengas o fabrica una nueva.",
      "en": "GARAGE → FACTORY: equip a part you own, or craft one."
    }
  },
  {
    "id": "cuper-loot",
    "title": {
      "es": "Recolección",
      "en": "Material Hunt"
    },
    "description": {
      "es": "Obtén 8 recompensas de materiales tras correr.",
      "en": "Collect 8 material rewards after racing."
    },
    "objective": {
      "type": "lootDraws",
      "target": 8,
      "label": {
        "es": "progreso",
        "en": "progress"
      }
    },
    "reward": {
      "items": {
        "alloy": 5
      }
    },
    "help": {
      "es": "Termina sesiones y recibe el botín de materiales. Cuentan las nuevas recompensas.",
      "en": "Finish race sessions and collect new material rewards."
    }
  },
  {
    "id": "cuper-two-tracks",
    "title": {
      "es": "Cambia de escenario",
      "en": "Change of Scenery"
    },
    "description": {
      "es": "Conduce el Cuper en dos circuitos distintos.",
      "en": "Drive the Cuper on two different tracks."
    },
    "objective": {
      "type": "cuperTracks",
      "target": 2,
      "label": {
        "es": "progreso",
        "en": "progress"
      }
    },
    "reward": {
      "coins": 650
    },
    "help": {
      "es": "Selecciona Crown Cuper y visita CIRCUITOS para cambiar de pista. Conduce por dos pistas.",
      "en": "Select Crown Cuper and use TRACKS to drive on two different tracks."
    }
  },
  {
    "id": "cuper-ghost",
    "title": {
      "es": "Contra tu fantasma",
      "en": "Chase Your Ghost"
    },
    "description": {
      "es": "Inicia una sesión en modo Fantasma.",
      "en": "Start a Ghost mode session."
    },
    "objective": {
      "type": "ghostStarts",
      "target": 1,
      "label": {
        "es": "progreso",
        "en": "progress"
      }
    },
    "reward": {
      "items": {
        "gear": 4
      }
    },
    "help": {
      "es": "Pulsa JUGAR, selecciona FANTASMA e inicia la sesión.",
      "en": "Press PLAY and choose GHOST mode."
    }
  },
  {
    "id": "cuper-clean",
    "title": {
      "es": "Conducción limpia",
      "en": "Clean Driving"
    },
    "description": {
      "es": "Consigue dos vueltas limpias.",
      "en": "Complete two clean laps."
    },
    "objective": {
      "type": "clean",
      "target": 2,
      "label": {
        "es": "progreso",
        "en": "progress"
      }
    },
    "reward": {
      "coins": 750
    },
    "help": {
      "es": "Termina dos vueltas válidas sin penalizaciones en circuitos cerrados.",
      "en": "Complete two valid laps without penalties."
    }
  },
  {
    "id": "cuper-craft",
    "title": {
      "es": "Manos a la obra",
      "en": "Hands On"
    },
    "description": {
      "es": "Fabrica una pieza que todavía no hayas descubierto.",
      "en": "Craft a part you have not discovered yet."
    },
    "objective": {
      "type": "newDiscoveries",
      "target": 1,
      "label": {
        "es": "progreso",
        "en": "progress"
      }
    },
    "reward": {
      "items": {
        "compound": 6
      }
    },
    "help": {
      "es": "GARAJE → FÁBRICA: reúne materiales y fabrica una nueva pieza.",
      "en": "GARAGE → FACTORY: gather materials and craft a new part."
    }
  },
  {
    "id": "cuper-recycle",
    "title": {
      "es": "Nada se desperdicia",
      "en": "Nothing Wasted"
    },
    "description": {
      "es": "Completa una operación en la Recicladora.",
      "en": "Complete a Recycler operation."
    },
    "objective": {
      "type": "recyclerOperations",
      "target": 1,
      "label": {
        "es": "progreso",
        "en": "progress"
      }
    },
    "reward": {
      "coins": 900
    },
    "help": {
      "es": "TIENDA → RECICLADORA: intercambia materiales con un anuncio o desmonta una pieza sobrante sin anuncio. Solo cuenta una operación realizada.",
      "en": "STORE → RECYCLER: exchange materials with an ad, or dismantle a spare part without one. The operation must succeed."
    }
  },
  {
    "id": "cuper-rally",
    "title": {
      "es": "Carreteras de Tenerife",
      "en": "Tenerife Roads"
    },
    "description": {
      "es": "Recorre 2 km con el Cuper en Arafo → Los Loros.",
      "en": "Drive 2 km in the Cuper on Arafo → Los Loros."
    },
    "objective": {
      "type": "cuperRallyMeters",
      "target": 2000,
      "label": {
        "es": "metros",
        "en": "meters"
      }
    },
    "reward": {
      "items": {
        "disc": 5
      }
    },
    "help": {
      "es": "Selecciona Cuper y el rally ARAFO → LOS LOROS. La distancia acumulada allí se guarda en tus estadísticas.",
      "en": "Choose Cuper and the ARAFO → LOS LOROS rally. Distance counts in your car stats."
    }
  },
  {
    "id": "cuper-publish",
    "title": {
      "es": "Deja tu huella",
      "en": "Leave Your Mark"
    },
    "description": {
      "es": "Publica un tiempo del Cuper online en cualquier circuito.",
      "en": "Publish a Cuper lap time online on any circuit."
    },
    "objective": {
      "type": "onlinePublishedCuper",
      "target": 1,
      "label": {
        "es": "progreso",
        "en": "progress"
      }
    },
    "reward": {
      "coins": 1000
    },
    "help": {
      "es": "1. Selecciona CROWN CUPER. 2. JUGAR → CONTRARRELOJ en cualquier circuito cerrado. 3. Consigue una mejor vuelta personal. 4. En el informe final abre RESUMEN y pulsa PUBLICAR · VER ANUNCIO. 5. Mira el anuncio (~30 s) y espera la confirmación del servidor. Solo cuenta una publicación online confirmada del Cuper.",
      "en": "Select CUPER → PLAY → TIME TRIAL, set a personal best, open the report SUMMARY and choose PUBLISH · WATCH AD (~30 s). Wait for online confirmation."
    }
  },
  {
    "id": "cuper-ready",
    "title": {
      "es": "Preparación final",
      "en": "Final Preparation"
    },
    "description": {
      "es": "Equipa al menos dos piezas en el Crown Cuper.",
      "en": "Equip at least two parts on the Crown Cuper."
    },
    "objective": {
      "type": "cuperEquipped",
      "target": 2,
      "label": {
        "es": "progreso",
        "en": "progress"
      }
    },
    "reward": {
      "items": {
        "ecu": 1
      }
    },
    "help": {
      "es": "GARAJE → FÁBRICA: monta dos piezas de familias distintas en el Cuper.",
      "en": "GARAGE → FACTORY: equip two different upgrade families."
    }
  },
  {
    "id": "cuper-coronation",
    "title": {
      "es": "La coronación",
      "en": "The Coronation"
    },
    "description": {
      "es": "Consigue 3 vueltas limpias, conduce el Cuper en 2 circuitos y recoge 8 botines.",
      "en": "Get 3 clean laps, drive the Cuper on 2 tracks and collect 8 rewards."
    },
    "objective": {
      "type": "combined",
      "target": 3,
      "label": {
        "es": "progreso",
        "en": "progress"
      },
      "parts": [
        {
          "type": "clean",
          "target": 3
        },
        {
          "type": "cuperTracks",
          "target": 2
        },
        {
          "type": "lootDraws",
          "target": 8
        }
      ]
    },
    "reward": {
      "skin": {
        "carId": "crown_cuper",
        "skinId": "gold",
        "name": {
          "es": "Crown Cuper Gold",
          "en": "Crown Cuper Gold"
        },
        "image": "assets/skins/skin_crown_cuper_gold.webp"
      }
    },
    "help": {
      "es": "Desde esta misión: tres vueltas limpias, conducir el Cuper en dos circuitos distintos y ocho recompensas de materiales. Reclama GOLD y equípala en GARAJE → PERSONALIZAR · SKINS.",
      "en": "From this mission: 3 clean laps, Cuper on 2 tracks and 8 material rewards. Claim GOLD and equip it in GARAGE → SKINS."
    }
  }
];
export const CUPER_SEASON={id:'crown-cuper-01',family:'cuper',permanent:true,premiumEnabled:false,
 title:{es:'CROWN CUPER · CAMINO AL ORO',en:'CROWN CUPER · ROAD TO GOLD'},
 subtitle:{es:'Del primer kilómetro a la edición dorada',en:'From the first kilometer to Gold Edition'},
 stages:CUPER_EVENT_DEFS.map(d=>({id:d.id,es:d.title.es,en:d.title.en,kind:d.objective.type}))};
