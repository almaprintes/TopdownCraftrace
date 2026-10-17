# DEV 1.2.260 — panel diagnóstico sin tapar la palanca

## Incidencia real
El propietario mostró captura del diagnóstico DEV 1.2.259 abierto en iPhone apaisado: panel de 300 px de ancho y altura suficiente para alcanzar el mando táctil/palanca inferior izquierda. El coche apenas podía conducirse con la medición abierta.

Captura MOTOR OFF disponible: ~1380 frames, 50.8 FPS medios, FRAME 19.7/114 ms, UPDATE y RENDER bajos, contexto `suspended` con seis sources. SAFE NO, TIMER NO, FPS HUD OFF. Sin condición MOTOR ON equiparable dentro de la misma sesión, **no atribuir mejora comprobada al audio**. FPS limit 0. El `RES 1.5` en preset high indica que no se aplicó el límite de render de iPhone compacto en esa captura (ej. pantalla >430 CSS px).

## Ajuste de UX
- Diagnóstico anclado arriba a la izquierda, panel expandido con `max-height:min(39vh,250px)`, scroll para los detalles, tipografía contenida.
- Botones **MEDIR / MINIMIZAR / VER DATOS**. Al minimizar, se oculta únicamente el informe visual; `state.active` continúa **true** y las métricas se acumulan mientras se conduce. Al volver a VER DATOS se recupera el último reporte sin reiniciarlo.
- **MOTOR ON/OFF** y **COPIAR** se trasladan a una barra exterior compacta que continúa visible estando el panel minimizado, para hacer A/B/A conduciendo normalmente. La barra se muestra al iniciar MEDIR.
- Mientras el panel está oculto, la captura de métricas continúa, pero no se reescribe el nodo `pre` cada 1.5 s. Limpieza de listeners en shutdown, sin bucle RAF nuevo.
- Sin cambios de audio funcional, física, circuitos, imágenes ni Google Play. Smoke `scripts/ios-compact-diagnostic-smoke.mjs`.

## Siguiente prueba
Alta o Ultra consistente, Tenerife/Spark, MEDIR -> MINIMIZAR -> conducir 20–30 s con MOTOR ON -> VER DATOS/COPIAR; MOTOR OFF (AudioContext suspended) -> MINIMIZAR -> conducir 20–30 s -> VER DATOS/COPIAR; volver MOTOR ON y repetir. Comparar >33/>50 ms y FPS, mismo coche/circuito, con calidad y temperatura lo más parecidas posible.
