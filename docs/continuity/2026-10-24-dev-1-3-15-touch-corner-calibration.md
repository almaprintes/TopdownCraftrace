# DEV 1.3.15 — Curvas más suaves, rectas intactas

## Feedback del propietario (24/10/2026)
Tras probar DEV 1.3.14, confirma que la salida de curva es mucho mejor, pero el control sigue demasiado sensible EN la curva y el coche acaba saliendo por el interior. Prioridad: bajar solo un poco la respuesta de giro en curva y mantener la precisión en rectas ya aprobada.

## Cambio controlado
- `src/game/controls/relativeSteeringGesture.js`: se mantiene la zona neutra física de 5px y la curva exponencial 1.8; el movimiento pequeño hasta 22px conserva exactamente la fórmula de la DEV 1.3.14 (normalización con recorrido de 60px).
- A partir de 22px, el tramo final de la respuesta se distribuye sobre 44px (en vez de 38px). El giro máximo requiere 66px en lugar de 60px: aproximadamente 10% de recorrido adicional solo en la parte de curva.
- Entre 22 y 66px el mismo movimiento produce menos giro; a 45px cae aproximadamente de 0.56 a 0.49 (14% menos), sin perder el giro máximo de 100% cuando se necesitan horquillas.
- No se consulta posición del coche, geometría ni situación recta/curva; es una curva por magnitud de gesto en `pointermove`. Sin timers, RAF, trabajo por frame adicional o cambios de la física. Inversión y sensibilidad global existentes intactas.
- El indicador y la dirección real continúan sincronizados. Soltar conserva retorno inmediato a cero.
- `scripts/touch-steering-relative-smoke.mjs` ampliado para verificar nuevo giro moderado a 45/60px y giro máximo a 66px, sin romper zona neutra, sensibilidad, inversión y cambios de dirección.
- Metaversión DEV 1.3.15. Sin APK/AAB, Google Play, Supabase, colisiones, anuncios, palanca ni botones.

## Criterio de validación física
Comprobar en el mismo coche y curva de Karting Tenerife la entrada a curva sin cortar por el interior y la misma facilidad de transición a recta de la DEV 1.3.14. Si falta giro en una horquilla, el pulgar puede seguir desplazándose hasta 66px.
