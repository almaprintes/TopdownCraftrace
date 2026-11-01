# iPhone DEV — desglose pasivo de duración de ciclos Phaser

Fecha: 2026-11-01. Experimento de lectura, no optimización. Motivación: en el A/B de FPS 0 vs 60 la media cae 49,3 → 43,0 FPS, el P95 pasa de 41 a 45 ms y el tiempo «OTROS» domina sin identificar la causa. No supone prueba de culpa GPU.

## Qué se añade
- Con MEDIR activo **solo iPhone DEV**, guardar marcas de los eventos Phaser **PRE_STEP** y **POST_RENDER** ya utilizados en el panel, y separar el intervalo entre el POST_RENDER anterior y el PRE_STEP actual (ENTRE CICLOS) del trabajo y bloqueos desde PRE_STEP hasta POST_RENDER (DENTRO CICLO).
- No añadir llamadas a `requestAnimationFrame`, temporizadores, `getParameter`, `readPixels`, `gl.finish`, `PerformanceObserver` ni interceptar métodos. No tomar más lecturas de `performance.now()` de las existentes por fotograma. Histogramas fijos de 251 posiciones y los 4 peores picos sin traza creciente.
- Informar medias, percentiles aproximados, máximos y si los fotogramas >33ms se concentran en ENTRE, DENTRO o mixtos. Se incluye en el botón COPIAR, no se envía ningún registro a un servidor.
- `ENTRE CICLOS` **no significa CPU inactiva ni GPU bloqueada**: puede contener RAF, composición, tareas de navegador/otras funciones JS y planificación; `DENTRO CICLO` tampoco es tiempo GPU. Esta separación sólo localiza en qué lado de los eventos se acumula el tiempo.
- El panel en Android, iPad y producción sigue sin este desglose. Ningún cambio visual en el juego, físicas, mundo, resolución, memoria fotográfica ni sonido. Si no se pulsa MEDIR la nueva medición no se ejecuta.
- Pruebas puras de clasificación, reloj inválido, histogramas fijos y conexión de diagnóstico; ejecutadas en prebuild junto a los controles existentes.

## Protocolo sin castigar el teléfono
1. Volver a **FPS BASE 0** si aún apareciera PRUEBA 60. Abrir la PWA DEV en Safari; no asumir que Xcode recibe automáticamente esta versión.
2. iPhone frío/templado, sin cargas adicionales, mismo coche y Karting Américas. Iniciar MEDIR, minimizar, conducir **30–45 segundos** y copiar una sola muestra.
3. Comprobar en el informe `FASES CICLO`, `ENTRE CICLOS`, `DENTRO CICLO`, `PICOS`, `FPS BASE 0`. Si no aparecen las fases, revisar versión y presencia de PRE_STEP/POST_RENDER antes de sacar conclusiones.
4. No atribuir la batería o temperatura a ninguna fase usando esta medida. Para GPU y composición reales se requerirán instrumentos nativos en Mac, misma build.
