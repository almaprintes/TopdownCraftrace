# DEV 1.3.13 — Rectas estables con dirección táctil

## Observación del propietario (24/10/2026)
Tras probar la DEV 1.3.12, la dirección táctil resultaba excesivamente sensible y costaba muchísimo mantener una línea recta.

## Diagnóstico confirmado en código
La 1.3.12 sumaba cambios incrementales del valor de dirección con un factor de contravolante `1/15` por píxel y de entrada en curva `1/45` por píxel. No tenía una zona central robusta; cualquier pequeña desviación podía alterar el rumbo. El neutro no era fácil de localizar.

## Corrección DEV 1.3.13
- `relativeSteeringGesture.js` ahora acumula **desplazamiento físico** del dedo en una posición virtual (conservada mientras el dedo está quieto), en vez de sumar cambios directos de dirección; sin dependencia de FPS ni RAF.
- Recorrido de referencia **60 píxeles** desde neutro a giro máximo, simétrico en los dos sentidos, con sensibilidad e inversión de configuración conservadas.
- **5 píxeles** de zona central inequívoca: movimientos pequeños alrededor del centro producen exactamente `steer=0`, y la curvatura progresiva `1.18` ofrece control fino cerca de recta.
- Indicador de la zona cambia a **verde** cuando la dirección está exactamente neutral; permite reconocer el punto recto sin soltar el pulgar.
- Al levantar el dedo o perder la captura, dirección cero. Tras un cambio de sentido, puede mantener una curva sin mover el dedo.
- `scripts/touch-steering-relative-smoke.mjs` ampliado para cubrir ruido táctil en rectas, variaciones de sensibilidad, inversión, recorrido en ambos sentidos, mantenimiento de curva, eventos lentos de puntero y liberación segura.
- Solo se toca el método `steeringMode=wheel` que ahora se llama `DIRECCIÓN TÁCTIL`; palanca, botones y gamepad no cambian. No se modifican físicas, récords, Supabase, Android publicado ni monetización.

## Validación
- Verificar CI y GitHub Pages DEV 1.3.13.
- Validar en dispositivo, con pistas rectas y chicanes, tanto estabilidad del neutral como facilidad de invertir giro sin levantar el dedo. La comodidad no se puede dar por aprobada solo con un smoke.
- No APK/AAB ni Google Play solicitados.
