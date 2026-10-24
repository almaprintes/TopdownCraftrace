# DEV 1.3.17 — Modo RC de dos palancas de un eje

## Propuesta
El usuario no encuentra intuitivo el control de desplazamiento horizontal acumulado, pero se siente cómodo con mando físico y palanca táctil. Propone probar el modo clásico de emisora de coche RC con dos palancas de un único eje, independientes.

## Diseño e implementación experimental
- **Nuevo modo seleccionable** `steeringMode='rc_twin'`, mostrado «RC · 2 PALANCAS» en Ajustes. La selección existente `stick`, `buttons`, `wheel` (Dirección táctil) y `gamepad` sigue intacta.
- Palanca **vertical izquierda** (normal): hacia arriba, gas; hacia abajo, freno/marcha atrás; centro sin gas ni freno. Palanca **horizontal derecha**: izquierda/derecha, dirección. Con ajuste de zurdos invierte posiciones, no las funciones. Freno de mano separado, como antes.
- Cada eje usa **posición absoluta** del dedo dentro de su palanca (no suma gestos). Zona neutra y retorno a cero al levantar/cancelar/perder captura. Dos dedos con `pointerId` y `setPointerCapture` independientes.
- Ambos ejes quedan limitados a [-1,1] y tienen leve curva progresiva para precisión de centro. Se conserva la inversión de dirección, sensibilidad global y las físicas de cada coche: la dirección usa el giro existente, el gas/fricción longitudinal usa los valores del motor/freno multiplicados por la intensidad pedida. No se añaden bucles, escaneos de pista, nueva física ni temporizadores.
- Ejes colocados para pulgares en horizontal: vertical x≈18% e y≈70%; horizontal x≈73% e y≈72%, esquivando freno de mano. Calibrador estándar permite posicionar y escalar los dos por separado, con perfiles independientes para diestros/zurdos.
- UI del modo RC reemplaza visualmente antiguos pedales y palanca, sin crear sus hitboxes; se conserva freno de mano. Etiquetas español/inglés.
- JS: `src/game/controls/rcTwinAxis.js` (transformación pura), `src/game/scenes/RaceRcTwinAxisScene.js` (integración). Cambio mínimo en `RaceHandbrakeScene.js` para importar el nuevo nivel y omitir pedales antiguos en RC.
- `scripts/rc-twin-axis-controls-smoke.mjs` añadido a CI: neutral, extremos, sensibilidad, inversión, exclusión gas/freno, ciclo táctil y aislamiento de otros métodos.

## Estado y verificación
- Versión objetivo **DEV 1.3.17** en `main` / PWA web, jamás publicación Android ni APK/AAB salvo solicitud expresa.
- CI Pages y verificación de SHA vivo obligatorias antes de anunciar disponibilidad. Posteriormente validación humana iPhone y Android: salida en circuito, gas/freno, transiciones izquierda/derecha, contravolante, sprint de varios giros, dedos simultáneos, freno mano, personalización y vista zurda. La comodidad real del método sigue siendo experimental.
