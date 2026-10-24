# DEV 1.3.16 — Ajuste fino adicional de dirección táctil en curva

## Feedback del propietario (24/10/2026)
Tras la DEV 1.3.15 solicita «Redúcelo un poco más» sobre la sensibilidad en curva. La precisión de recta y la salida de curva conseguida anteriormente se deben conservar.

## Implementación
- `src/game/controls/relativeSteeringGesture.js`: se amplía únicamente el recorrido desde el umbral de corrección fina a giro máximo, de **66 a 70 px** (un incremento del 6.1% frente a la 1.3.15). Se conservan 5 px de zona neutra, 22 px de límite de ajuste fino y el exponente 1.8.
- La curva de respuesta de 0 a 22 px es matemáticamente idéntica a la DEV 1.3.14 y DEV 1.3.15. No se modifica la entrada a recta, correcciones pequeñas, posición de la barra ni la calibración del resto de métodos.
- El control de giro para 45 px baja de 0.487 a 0.448 (aprox. **8% menos**); para 60 px de 0.837 a 0.756 (aprox. **10% menos**). A 70 px sigue disponible el máximo. Mantiene simetría derecha/izquierda e inversión.
- El algoritmo se ejecuta únicamente en eventos `pointermove`: sin búsqueda de geometría, sin trabajo adicional por frame, sin asistencia automática de rumbo ni modificaciones de física.
- `scripts/touch-steering-relative-smoke.mjs` exige explícitamente nuevos valores intermedios, 100% a 70px, zona neutra, mantener curva, inversión, sensibilidad y reinicio tras levantar.
- DEV 1.3.16, cambio solo web/PWA. Sin APK, AAB, Google Play, Supabase, coches, palanca, botones, circuitos o colisiones.

## Validación pendiente
CI GitHub Pages debe quedar verde y verificar código realmente publicado. En dispositivo: probar misma combinación de coche/curva que en 1.3.15, confirmar que no cierra tanto hacia el interior y que salida de curva/rectas siguen cómodas.
