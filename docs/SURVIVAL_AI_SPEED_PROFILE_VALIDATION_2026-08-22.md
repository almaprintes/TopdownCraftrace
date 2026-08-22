# Validación del perfil anticipativo de velocidad — 22/08/2026

## Alcance

Fase 2 en modo observación. El módulo `src/game/ai/trackSpeedProfilePlanner.js` recibe la trazada geométrica calculada en Fase 1 y produce:

- límite local de velocidad según curvatura;
- pase de frenada hacia atrás;
- pase de aceleración hacia delante;
- continuidad en el cierre de vuelta;
- solicitud longitudinal y estado `brake` / `accelerate` / `hold` por muestra.

Todavía no controla coches. Los valores están expresados en unidades internas de mundo por segundo y sirven para comparar el perfil; deberán calibrarse con el controlador físico de Fase 3.

## Resultado estructural

| Circuito | Muestras | Vel. mín. | Vel. media | Vel. máx. | Vuelta teórica s | Zona frenada | Estado |
|---|---:|---:|---:|---:|---:|---:|---|
| chicane-vale | 1519 | 223.7 | 507.2 | 520 | 34.91 | 5.6% | VÁLIDO |
| f1-baku | 951 | 210 | 484.1 | 520 | 23.77 | 16% | VÁLIDO |
| f1-imola | 835 | 193.9 | 494.3 | 520 | 20.38 | 12.1% | VÁLIDO |
| f1-jeddah | 890 | 183 | 482.1 | 520 | 22.98 | 12.1% | VÁLIDO |
| f1-melbourne | 851 | 314 | 485.7 | 520 | 21.28 | 19.5% | VÁLIDO |
| f1-miami | 764 | 219.5 | 486.3 | 520 | 19.22 | 16.5% | VÁLIDO |
| f1-monte-carlo | 921 | 200.8 | 477.2 | 520 | 22.54 | 19.4% | VÁLIDO |
| f1-sakhir | 1072 | 159.6 | 470.6 | 520 | 28.54 | 16% | VÁLIDO |
| f1-shanghai | 1101 | 150.6 | 455.9 | 520 | 30.41 | 20.2% | VÁLIDO |
| forest-endurance | 1473 | 363.3 | 518.1 | 520 | 34.57 | 1% | VÁLIDO |
| karting-canarias | 1157 | 362.6 | 501.6 | 520 | 29.6 | 10% | VÁLIDO |
| karting-tenerife | 1465 | 190.7 | 433.2 | 520 | 35.48 | 26.3% | VÁLIDO |
| offroad-raven-hollow | 860 | 220.8 | 463 | 520 | 21.57 | 22.4% | VÁLIDO |
| santa-cruz | 510 | 161.1 | 380.7 | 520 | 16.8 | 34.3% | VÁLIDO |
| switchback-park | 2037 | 204.1 | 510.4 | 520 | 44.68 | 4.1% | VÁLIDO |
| technical-ridge | 1131 | 236.1 | 482.5 | 520 | 27.37 | 14.9% | VÁLIDO |
| track01 | 347 | 210.9 | 426.9 | 520 | 10.41 | 29.1% | VÁLIDO |

Resultado:

- 17/17 perfiles válidos y finitos;
- cero violaciones del límite configurado de frenada;
- cero violaciones del límite configurado de aceleración;
- el cálculo incluye el segmento de cierre, sin salto independiente entre última y primera muestra.

## Lectura específica de Santa Cruz

Santa Cruz produce el perfil más exigente de la lista asfaltada:

- velocidad mínima: 161.1;
- velocidad media: 380.7;
- 34.3 % de muestras en fase de frenada;
- vuelta geométrica estimada: 16.80 s.

Esto confirma que su sucesión de curvas necesita mucha anticipación longitudinal. No demuestra todavía que los parámetros coincidan con la física del coche ni corrige el cabeceo del controlador `legacy`.

## Criterios antes de entregar control

1. Calibrar velocidad máxima, aceleración lateral, aceleración y frenada con un coche patrón.
2. Visualizar puntos de inicio de frenada y vértices.
3. Confirmar que ninguna frenada principal comienza después del vértice.
4. Confirmar que no existe alternancia rápida gas/freno.
5. Comparar vuelta teórica con telemetría real.
6. Mantener `legacy` activo hasta que el controlador físico de Fase 3 complete vueltas sin salidas sistemáticas.

## Circuitos nuevos

Cada circuito nuevo debe ejecutar también este perfil después de superar la homologación geométrica. No necesita un archivo manual: la velocidad se deriva automáticamente de la trazada, la curvatura y los parámetros físicos homologados.
