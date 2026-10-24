# DEV 1.3.12 — Dirección táctil relativa con contravolante rápido

## Incidencia real
El propietario probó DEV 1.3.11 en iPhone y reportó que tras alcanzar cierto ángulo era incómodo regresar a centro para corregir en sentido contrario.

## Causa
`RaceWheelModeScene.js` calculaba `steer` en función de `clientX - startX` desde el inicio del gesto, con hasta 38% de la anchura física de la banda para llegar al máximo. Al invertir el movimiento el usuario debía recorrer el desplazamiento inicial completo antes de obtener el giro contrario.

## Cambio aplicado
- Función aislada y sin dependencias `src/game/controls/relativeSteeringGesture.js`, que convierte cada delta horizontal entre eventos de puntero en un cambio incremental de dirección.
- La misma posición del dedo mantiene el ángulo solicitado; no existe retorno automático mientras se sostiene una curva.
- Al contragirar aumenta temporalmente la respuesta hacia neutro (15px desde giro máximo con sensibilidad 1); al pasar por neutro progresa hacia el sentido opuesto (45px para llegar a 100%). Sensibilidad 0.5–1.5 e inversión respetadas, control -1..1.
- Sin nuevos bucles RAF ni temporizadores, con id de puntero capturado; soltar/cancelar/perder captura restablece neutro.
- La zona visual se centra de fábrica en x=20% (y=73%) de la pantalla en lugar de x=11.5%, con espejo para zurdos. Los diseños guardados de cada usuario siguen respetándose.
- Compatibilidad de guardados: `steeringMode: wheel` continúa siendo el identificador interno de DIRECCIÓN TÁCTIL; palanca, botones, gamepad y parámetros físicos permanecen intactos.
- Smoke `scripts/touch-steering-relative-smoke.mjs` incluido en el flujo Pages.
- Versión DEV 1.3.12. No APK/AAB, Play ni cambios Supabase.

## Validación requerida
Verificar Actions, publicación Pages y luego conducción REAL en iPhone y Android: curvas encadenadas izquierda-derecha, cambios pequeños de trayectoria a velocidad, mantenerse en curva, acelerador/freno multitáctil, freno de mano, giro inverso, controles zurdos, edición de tamaño/posición, soltar/cancelar. La comodidad es una evaluación del usuario, no se deduce de tests unitarios.
