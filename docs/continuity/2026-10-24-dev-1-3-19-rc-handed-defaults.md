# DEV 1.3.19 — Disposición RC diestro/zurdo corregida

## Feedback
El propietario, tras probar DEV 1.3.18, señala que «las palancas están en posición de zurdo por defecto».

## Causa
El preset inicial `rc_twin` colocaba la palanca vertical de gas/freno a la **izquierda** y la horizontal de dirección a la **derecha**, pese a estar seleccionado el perfil de diestros. Era la distribución opuesta a la esperada para esta implementación.

## Corrección
- Perfil diestro (ajuste `leftHanded:false`): **dirección horizontal izquierda** (`x=.22,y=.72`) y **gas/freno vertical derecha** (`x=.73,y=.70`).
- Perfil zurdo (`leftHanded:true`): espejo automático: **dirección a la derecha** (`x=.78`) y **gas/freno a la izquierda** (`x=.27`).
- Ejes y funciones se mantienen idénticos; freno de mano independiente y simultaneidad de los dos pulgares sin cambio.
- `controlLayout.js` añade `migrateLegacyRcDefaultLayout`: migra únicamente las coordenadas de RC guardadas que coincidan exactamente con las de fábrica antigua para ese lado. Conserva `scale` y todos los demás controles; **NO modifica disposiciones personalizadas** que se hayan movido manualmente.
- El calibrador avanzado `SettingsWheelModeScene.js` utiliza la misma migración, de modo que muestra la posición corregida cuando se personalizan controles antiguos.
- `scripts/rc-twin-axis-controls-smoke.mjs` exige la distribución correcta de diestros/zurdos, el espejo, la migración de preset antiguo y la conservación de ajustes propios.
- Solo PWA DEV 1.3.19; no se tocan físicas, palanca tradicional, dirección táctil, botones, gamepad, rankings, anuncios ni Android publicado. Sin APK/AAB.

## Validación
Acciones Pages verdes y `Verify the LIVE DEV serves this commit` en verde. En iPhone seleccionar RC · 2 PALANCAS y comprobar dirección horizontal a la izquierda, vertical a la derecha; con Zurdo activado que intercambien posiciones. Probar agarre simultáneo de las dos palancas y freno de mano. Verificar sensibilidad/comodidad en prueba real.
