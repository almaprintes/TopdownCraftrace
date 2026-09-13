# Top Down RACE: CraftRace — registro de mejoras durante prueba cerrada

Documento de trabajo para conservar una trazabilidad clara de los cambios realizados durante la fase de prueba cerrada de Google Play. No es texto final para el formulario de Google; sirve como fuente verificable para redactarlo después sin depender de memoria o conversaciones.

## Contexto

- Beta pública estable: rama `beta-1.0`, congelada salvo autorización explícita.
- Desarrollo y validación: rama `main`, publicada en `/dev` y `/dev-live`.
- Cada cambio visible de DEV incrementa el marcador de versión.
- El objetivo de esta fase es corregir errores detectados por pruebas reales, mejorar estabilidad y usabilidad y validar nuevas funciones antes de promocionarlas a una futura beta.

## Cambios posteriores a DEV 1.0.35

### DEV 1.0.36 — panel de fantasma interactivo
- El panel de estado del fantasma, ya fijado al HUD, pasó a ser interactivo.
- Se mantuvo la solución DOM fija para evitar desplazamientos producidos por zoom/cámara.

### DEV 1.0.37 — coherencia del récord personal y fantasma
- El fantasma de repetición quedó asociado al récord personal oficial del circuito.
- Se corrigió la coherencia entre el tiempo mostrado y la vuelta usada como referencia.

### DEV 1.0.38 — repositorio local de récords
- Se añadió un sistema local-first para almacenar y consultar récords de carrera.
- Se verificó el núcleo de datos antes de integrarlo en nuevas interfaces.

### DEV 1.0.39–1.0.40 — Race Control / registros de circuito
- Se creó la interfaz tipo retransmisión para consultar récords y clasificación local.
- Se adaptó a una sola pantalla horizontal, incluyendo un modo compacto sin comprimir verticalmente el contenido.

### DEV 1.0.41 — monitor de repeticiones
- Race Control incorporó un monitor para visualizar repeticiones asociadas a registros locales.

### DEV 1.0.42 — Top 10 con repetición
- Se empezaron a guardar repeticiones de las vueltas que entran en el Top 10 local de cada circuito.
- Cada registro guardado puede enlazar con su repetición correspondiente.
- Se añadió un botón de reproducción por vuelta cuando existe replay disponible.

### DEV 1.0.43–1.0.47 — fidelidad visual de repeticiones
- Las repeticiones pasaron de una representación simplificada a utilizar circuito y coche reales.
- Se ajustaron escala, cámara y mundo de Phaser para aproximar la reproducción a la experiencia real de conducción.
- Se almacenó también información de cámara para reproducir la vista registrada con mayor fidelidad.

### DEV 1.0.48–1.0.54 — repetición dentro de RaceScene y controles de análisis
- Las vueltas del Top 10 pasaron a reproducirse dentro de la escena real de carrera.
- Se implementó retorno directo al mismo circuito seleccionado en Race Control.
- Se limpiaron del modo replay los controles de conducción, pedales y elementos interactivos que no debían aparecer.
- Se añadieron controles de análisis de repetición y navegación temporal.

### DEV 1.0.55–1.0.61 — replay integrado en Race Control
- La repetición real se integró en el panel central de Race Control.
- Se creó un viewport específico y posteriormente un canvas DOM para mostrar el feed sin interferir con el resto de la interfaz.
- Se corrigieron clipping, scroll, sincronización y actualización después del render de Phaser.
- Se preservó la gráfica de rendimiento y se redujo la altura del panel para mejorar la lectura general.

### DEV 1.0.62 — análisis experimental de trazada
- Se añadió información de análisis de trayectoria y ritmo durante la repetición.
- La función permanece como herramienta de análisis local en desarrollo.

### DEV 1.0.63–1.0.65 — velocidad y suavidad de replay
- La telemetría de velocidad se convirtió a km/h.
- La cámara del replay pasó a seguir correctamente al coche.
- Se interpoló la posición del replay y se suavizó el cálculo de velocidad para eliminar saltos visuales y cambios bruscos en telemetría.

### DEV 1.0.66 — metadatos correctos del coche del récord
- Se preservó la relación entre cada vuelta, su replay y el coche con el que se registró.
- Race Control dejó de mezclar datos del coche seleccionado con los del coche real del récord.

### DEV 1.0.67–1.0.68 — presentación del coche del récord
- Se rediseñó el banner del coche del récord usando exclusivamente logos oficiales existentes en los assets del juego.
- Se mejoró la composición visual aumentando tamaño, posición e inclinación del coche y del logotipo de marca.
- No se alteró la lógica de tiempos ni clasificación.

### DEV 1.0.69 — sincronización de inventario tras usar la recicladora

**Problema detectado en prueba real:** al realizar un intercambio en la recicladora, el inventario persistente se actualizaba correctamente y la propia recicladora mostraba las nuevas cantidades, pero al cerrarla la pantalla de Fabricación seguía mostrando cantidades anteriores en los vasos/requisitos.

**Causa:** Fabricación renderizaba los requisitos a partir de `scene.state`, una copia cargada antes de abrir la recicladora. La operación de reciclaje guardaba correctamente el nuevo estado en `garageStore`, pero esa copia de la escena no se volvía a leer al regresar.

**Corrección:** al cerrar la recicladora desde Fabricación se vuelve a cargar el estado canónico mediante `loadGarage()` y se renderiza de nuevo la pantalla. De esta forma, cantidades, porcentajes, estados `LISTO/FALTAN` y posibilidad de fabricar quedan sincronizados inmediatamente con el inventario real.

**Alcance controlado:** no se modificaron ratios, comisión, límite diario, publicidad recompensada, recetas ni economía de la recicladora. El cambio afecta únicamente a la sincronización visual y funcional del inventario después del intercambio.

## Resumen orientado a futura explicación a Google

Durante la prueba cerrada se han realizado principalmente cuatro tipos de trabajo:

1. **Corrección de errores encontrados durante pruebas reales**, como inconsistencias de HUD, replay, cámara, inventario y sincronización entre pantallas.
2. **Mejoras de estabilidad y presentación móvil**, especialmente en elementos que antes dependían de la cámara de Phaser y ahora permanecen correctamente fijos en pantalla.
3. **Mejoras de Race Control y repeticiones locales**, incluyendo Top 10, almacenamiento local, visualización de vueltas, telemetría y análisis de trazada.
4. **Mejoras de claridad de interfaz**, sin alterar de forma arbitraria la economía ni las reglas centrales del juego.

Este documento debe seguir actualizándose con cada cambio relevante realizado durante la prueba cerrada para poder elaborar posteriormente una respuesta precisa a Google Play sobre qué feedback se recibió, qué problemas se detectaron y qué acciones se tomaron.
