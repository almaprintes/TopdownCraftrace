# Revisión bilingüe previa a QA Android — 19/10/2026

## Auditoría
Se revisaron los catálogos `src/game/i18n/index.js` (123 claves en cada idioma) y `playerUiExtra.js` (centenares de entradas), el puente `canonicalRuntimeText.js` de interfaces antiguas, la pantalla Cuenta y las pantallas recientes: Race Control, lobby, temporada Cuper, Ajustes y progreso.

**Hallazgos concretos:**
1. El catálogo suplementario EN carecía de `replay.lap` y `replay.analysis`, presentes en ES; además ES tenía dos definiciones contradictorias previas. Se corrigen.
2. La pantalla Cuenta/recuperación y mensajes de copia incorporados recientemente usan textos estáticos y dinámicos en español; se añade localización explícita de los principales y pruebas, sin tocar lógica de autenticación ni avance.
3. Crown Cuper ya trae traducciones específicas ES/EN para título, descripción, ayuda y progreso de sus 14 misiones.
4. Existe **deuda legacy** en escenas que construyen texto español directamente en DOM/Phaser. El puente de compatibilidad traduce los textos que conoce, pero **no es garantía de que cada frase sea inglesa**. El objetivo de esta iteración es cerrar los huecos identificados en el área de jugador y documentar lo pendiente, no reescribir hoy toda la interfaz ni certificar una cobertura manual de 100 %.
5. Las etiquetas de insignias pueden aparecer como CREADOR / CREATOR; su valor persistido en el servidor **sigue siendo CREADOR**. Nombres propios de piloto, coche y circuito no se traducen.

## Criterios para actualizar
- Smoke automatizada `scripts/release-language-audit.mjs`: paridad de claves ES/EN y placeholders + textos y render de Cuenta; integrada en Pages y Android QA.
- Comprobar manualmente en español e inglés: lobby, Cuenta, configuración, garaje, tienda, inventario, fábrica, selector, carrera/informe, temporadas/recompensas, Race Control y la restauración de partida.
- Si quedan literales no traducidos en áreas de jugador, anotarlos para corrección antes del despliegue público. **La APK entregada hoy es una candidata de prueba, no equivale a autorización para publicar Play.**
