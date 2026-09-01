# Mini tutoriales de primera visita — 2026-09-01

## Objetivo

El onboarding no debe depender de manuales largos. Cada sección principal del juego explica su función una sola vez al entrar por primera vez mediante una modal DOM compacta.

## Sistema común

Archivo fuente: `src/game/ui/FirstVisitTutorial.js`.

- Prefijo de persistencia: `tdr2:onboarding:section:`.
- Cada sección usa una clave independiente con sufijo `:v1`.
- La modal es DOM/CSS, no `Phaser.Text`.
- Solo contiene: `PRIMERA VISITA`, título, una explicación breve y `ENTENDIDO`.
- Al pulsar `ENTENDIDO` se marca esa sección como vista y no vuelve a aparecer.
- `RESETEAR PROGRESO` y `ELIMINAR CUENTA` eliminan las marcas de tutorial al limpiar progreso/datos.

## Secciones cubiertas

1. `garage` — ver la colección, consultar características y seleccionar el coche con el que competir. No menciona fabricación ni equipamiento.
2. `factory` — fabricar piezas con materiales e instalarlas en el coche seleccionado.
3. `inventory` — consultar materiales y piezas poseídas; los materiales sirven para fabricar.
4. `store` — conseguir recursos, recompensas y contenido disponible.
5. `stats` — trayectoria, kilómetros, carreras, récords, rendimiento y maestría por coche.
6. `tracks` — seleccionar circuito y entender que cada uno tiene características/récords/desafíos propios.
7. `season` — completar objetivos para avanzar y obtener recompensas.
8. `settings` — controles, gráficos, sonido, idioma y opciones de cuenta.

## Puntos de integración

- Garaje: `GarageSelectionCenterScene.js`.
- Fábrica: `UpgradeWorkshopCarUnlockScene.js`.
- Estadísticas: `StatsMasteryScene.js`.
- Circuitos: `TrackGarageAndroidTouchScene.js`.
- Pase de temporada: `SeasonSafeDockScene.js`.
- Tienda e Inventario: `MenuStoreCloseFixScene.js`, interceptando `_openStoreModal()` y `_openLobbyInventoryModal()`.
- Configuración: `SettingsGraphicsQualityScene.js`.

## Reiniciar tutorial

Configuración → Cuenta incluye `REINICIAR TUTORIAL`.

- Ejecuta `resetFirstVisitTutorials()`.
- Solo borra las marcas `tdr2:onboarding:section:*`.
- No modifica monedas, coches, piezas, inventario, estadísticas, temporadas, desbloqueos ni ajustes.
- Después de usarlo, cada mini tutorial se mostrará una sola vez de nuevo al volver a visitar su sección.

## Regla de diseño

Cada mini tutorial solo explica la responsabilidad real de esa pantalla. No mezclar funciones entre secciones. Ejemplo importante: Garaje sirve para ver/seleccionar coches; fabricar e instalar piezas pertenece a Fábrica.
