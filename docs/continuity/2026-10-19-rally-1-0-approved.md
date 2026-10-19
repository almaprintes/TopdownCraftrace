# RALLY 1.0 — Conducción APROBADA (Arafo–Los Loros)

- **Fecha de decisión:** 19/10/2026.
- **Versión validada por el propietario:** PWA **DEV 1.2.301**.
- **Commit funcional de referencia:** `e4e5252c64e14583f622e6e9bad014223f6f7a4a` (rama `main`).
- **Estado:** **APROBADO / CONGELAR SENSACIONES**. No es una propuesta ni un experimento pendiente.

## Validación de conducción del propietario

Tras conducir el HÉLIX Spark hacia delante en Arafo–Los Loros con DEV 1.2.301, el propietario dice:

> «Me alucina lo bien que se controla. Lo quiero tal cual. Además con la progresión instalándole piezas a medida que nos hacemos con el trazado vamos aumentando la velocidad mientras aprendemos el tramo está genial».

**Decisión explícita:** mantener las físicas exactamente como están en DEV 1.2.301. **No retocar aceleración, velocidad punta, rampas, dirección, frenada, transferencia de pesos, agarre o respuesta al freno sin nueva autorización del propietario**. Evitar supuestos ajustes de equilibrio o realismo que destruyan esta sensación.

## Parámetros congelados (fuente de verdad: `src/game/tracks/rallyDrivingProfile.js`)

| Parámetro | Valor RALLY 1.0 |
| --- | ---: |
| `acceleration` | `1.00` |
| `forwardSpeed` | `0.22` |
| `reverseSpeed` | `0.60` |
| `brakeForce` | `1.15` |
| `throttleRampSeconds` | `0.22` s |
| `initialThrottleFraction` | `0.75` |
| `steering` | `1.35` |
| `artificialBrakeYaw` | `false` |

La velocidad de avance teórica del Spark de serie es ~164 px/s (su marcha atrás, ~156 px/s). Son **valores calculados**, no mediciones de FPS/velocidad en dispositivo. El sistema conserva la transferencia de pesos, neumáticos, dirección propia de cada coche y la frenada progresiva, cuyo multiplicador se alinea con el perfil RALLY. El giro artificial al frenar está excluido para el perfil RALLY.

## Principio de diseño: aprender primero; mejorar el coche después

El tramo se aprende a una velocidad manejable con el coche de serie. A medida que el jugador memoriza curvas, puntos de frenada y horquillas, instala piezas y aumenta las prestaciones. Así el mismo recorrido plantea un reto progresivo **por mejora real del vehículo y habilidad del jugador**, no por introducir dificultad artificial.

Este principio se considera **un resultado positivo deliberado, que hay que preservar**:

1. El jugador debe poder recorrer las primeras curvas con control y anticipación.
2. Las mejoras y diferencias de coche deben seguir influyendo en su rendimiento: la aplicación del perfil es multiplicativa sobre parámetros resueltos por coche, sin sustituirlos.
3. La mayor velocidad al mejorar piezas no debe compensarse automáticamente reduciendo el rendimiento o cambiando el manejo base de RALLY.
4. Las peculiaridades entre coches, las mejoras adquiridas y el dominio del trazado forman parte de la progresión.

La progresión por piezas es una **apreciación positiva del diseño y del sistema ya existente**, no una petición de nuevas misiones, nueva economía ni rediseño de mejoras.

## Alcance y aislamiento técnico

- Se usa en Arafo (`rally-arafo-los-loros`) por su ID y en futuros **tramos abiertos** solo con opt-in explícito `meta.drivingProfile: "RALLY"` y `meta.closed === false`, `meta.raceType === "stage"`.
- La configuración reside en `src/game/tracks/rallyDrivingProfile.js`; `src/game/tracks/arafoRallyDrivePace.js` es solo puente de compatibilidad.
- La capa base de conducción está en `src/game/scenes/RaceScene.js`; la frenada progresiva posterior está en `src/game/scenes/RaceProgressiveBrakeScene.js`.
- Los circuitos normales **no** reciben este perfil, ni se modifican `CAR_SPECS`, tuning, upgrades o sus relaciones de velocidad/aceleración.
- No se modificaron por esta entrega el ancho de carretera, escala del coche `.35`, foto, geometría Bézier, colisiones, checkpoints, salida, meta o cámara.

## Regla de continuidad para futuras iteraciones

**Este perfil se considera bloqueado por aprobación de producto.** En trabajos posteriores sobre Arafo o nuevos rallies, empezar desde RALLY 1.0 sin alterar sus números ni las capas de física compartidas que afecten a sus sensaciones. Si una corrección técnica pudiera afectar al tacto de la conducción, explicarlo y pedir autorización antes de modificarlo. Para futuras pistas, reutilizar el perfil mediante opt-in y validar que no invade circuitos.

Tests de referencia: `scripts/arafo-rally-drive-pace-smoke.mjs` y pruebas de conducción real del propietario. La aprobación de sensación no sustituye verificaciones de estabilidad, colisiones, checkpoints o rendimiento del resto del juego.

**Publicación:** la DEV 1.2.301 se desplegó con Build y Deploy `completed/success` en la ejecución de GitHub Actions `39315461960`. Esta decisión se documenta **sin cambiar código, versión, APK/AAB ni Google Play**.
