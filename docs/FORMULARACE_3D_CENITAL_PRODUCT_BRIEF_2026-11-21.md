# Top Down RACE: FormulaRace — visión acordada y evaluación técnica

**Fecha:** 21 de noviembre de 2026.  
**Tipo:** ficha del proyecto futuro de monoplazas dentro de una familia de **cuatro títulos/conceptos**, incluidos RcRace y los dos juegos actuales.  
**Nombre:** **Top Down RACE: FormulaRace**, elegido expresamente por el creador el 21 de noviembre de 2026. Antes llamado «F1Race» (denominación interna histórica). **Pendiente de verificación comercial/registral; no se ha aprobado como marca disponible.**  
**Implementación:** **no iniciada**; este documento registra decisiones y propuestas, no entrega un juego.

## 1. Lo que el creador ha decidido expresamente

**Innegociable: cámara cenital pura.**  
El jugador quiere exactamente la vista top-down tradicional. La aproximación isométrica, incluso con inclinación pequeña, **no convence** y no debe volver a sugerirse como cámara por defecto.

- Cámara a **90° sobre el suelo horizontal**, mirando verticalmente hacia abajo, sin perspectiva isométrica ni ángulo oblicuo.
- **Proyección ortográfica** como elección de diseño para conservar tamaños consistentes y una lectura cenital clara; la ortográfica es decisión técnica propuesta y aceptada en la definición actual.
- **Mundo realmente 3D**: coches tridimensionales, sombras, circuito y entorno con relieve, elevaciones y desniveles.
- 3D al servicio de la vista cenital, **nunca al revés**. El nombre «Top Down RACE» debe seguir describiendo exactamente la experiencia.
- **Objetivo de 60 FPS en iPhone**, a verificar con medidas y sin confundir objetivo con capacidad demostrada.
- **Forma de trabajo preferida:** GitHub → GitHub Actions → GitHub Pages → Safari/iPhone en modo PWA. Debe ser posible probar DEV desde una URL sin recompilar una IPA cada vez.
- Proyecto futuro **independiente de CraftRace, SlotRace y RcRace**. No requiere migrar sus motores gráficos ni sus juegos en producción.
- **PlayCanvas**: primera alternativa técnica para explorar. No se ha ordenado arrancar la programación y **no está elegido definitivamente**.

## 2. Qué permite el 3D sin inclinar la cámara

Una cámara estrictamente vertical puede representar:
- El morro, ruedas descubiertas, alerones, Halo, carrocería y decoraciones desde arriba.
- Volumen y separación vertical gracias a **sombras proyectadas**, materiales, reflejos, iluminación y oclusiones.
- Puentes, pasos elevados, distintos pisos de pista, pianos y escapatorias.
- Zoom ortográfico sin variar el ángulo de la cámara.

**Limitación visual física:** no se ven directamente las caras verticales ni los laterales de los monoplazas desde un eje estrictamente perpendicular; los desniveles necesitan pistas visuales mediante iluminación, sombras, oclusión y diseño del entorno. **No resolver esto inclinando la cámara.**

### Contrato técnico de cámara para el primer prototipo
1. Posición: seguir al coche sobre su coordenada X/Y con un vector vertical de altura controlada.
2. Orientación: mirada exactamente vertical hacia abajo y sin bascular por aceleraciones o desniveles.
3. Proyección: ortográfica.
4. Escala y zoom: configurables para ofrecer visibilidad suficiente de la siguiente curva, sin perspectiva.
5. Dirección de la vista: decidir posteriormente entre norte fijo o rotación cenital de seguimiento; **ambas mantienen 90°**.
6. Modo televisión/repeticiones con otros puntos de vista: **idea opcional, no aprobada** y nunca sustituto del modo principal.

## 3. Diseño jugable — estado de decisiones

**Confirmado como visión:** juego de **monoplazas** y carreras con identidad Top Down RACE, 3D cenital puro, coches con volumen y pistas con relieve.

**Propuestas abiertas, aún sin aprobar una a una:**
- Clasificación, vuelta lanzada y entrenamientos.
- Grandes premios, campeonatos, puntos de pilotos y equipos.
- Gestión de neumáticos, desgaste, combustible y meteorología.
- Boxes, paradas, rebufo, aire sucio y energía de adelantamiento.
- Parrillas más grandes, IA con adelantamientos, defensa, estrategia y errores creíbles.
- Cámara de repeticiones, realizador y retransmisión.
- Coches y escuderías originales si no hay acuerdos de licencia con marcas reales.

El juego no queda comprometido a una simulación profesional ni a un arcade simple hasta diseñar las físicas. Experiencia sugerida: controles accesibles con profundidad estratégica.

## 4. Motor gráfico — evaluación inicial

| Alternativa | Relación con el método GitHub/PWA | Estado de decisión |
|---|---|---|
| **PlayCanvas Engine** | Motor JavaScript/TypeScript web, WebGL2/WebGPU y soporte de Safari/iOS documentado. Adecuado como **primer candidato** para una prueba de concepto PWA. | **Prioridad de investigación**, no selección definitiva |
| **Babylon.js** | Motor 3D web compatible con el enfoque GitHub/Pages/PWA; candidato de comparación. | Alternativa |
| **Fluorite (Toyota Connected)** | Motor 3D ligado a Flutter/Filament. Se puede versionar en GitHub, pero **no se ha verificado un flujo web/Safari/PWA completo**. Flutter web por sí solo no prueba compatibilidad Fluorite web. | Observar evolución; **no** elegir para el prototipo PWA actual |
| **Motor CraftRace actual (Phaser)** | El código actual permite evolución web, pero no debe obligar al nuevo juego a renunciar a un motor 3D específico. | Referencia para controles e infraestructura, no motor elegido |

Documentación consultada:
- [PlayCanvas — navegadores compatibles](https://developer.playcanvas.com/user-manual/engine/supported-browsers/).
- [PlayCanvas Engine — código y enfoque web](https://developer.playcanvas.com/user-manual/engine/).
- [Fluorite — web oficial](https://fluorite.game/).
- [FOSDEM 2026: presentación técnica de Fluorite](https://archive.fosdem.org/2026/schedule/event/7ZJJWW-fluorite-game-engine-flutter/).

**Regla para comparar:** medir en Safari del iPhone real, con fallback WebGL2 cuando WebGPU no sea conveniente. Confirmar compatibilidad offline/PWA, tamaño de descarga, texturas/luces, consumo térmico, batería y estabilidad de FPS. No declarar «compatible con iOS» si solo funciona en escritorio.

## 5. Arquitectura propuesta

- Un único motor de simulación bien delimitado y separado del renderizado tridimensional.
- Timestep de física fijo o equivalente con acumulador y techo controlado, sin convertir bloqueos de fotogramas en diferencias injustificadas de cronometraje.
- Sistema de trayectorias experto apoyado en límites reales del asfalto: **exterior → vértice → exterior**, no simple seguimiento del eje.
- Control de IA independiente de la velocidad humana: nada de perseguir artificialmente el ritmo del jugador salvo mecánica explícita.
- Identidad CraftRace Studio compartida, pero **tablas y progreso propio para FormulaRace**.
- Arquitectura de simulación/objetos preparada para varios coches y repetición determinista cuando resulte viable.
- Materiales, luces, sombras y mallas seleccionados para visibilidad cenital y eficiencia móvil.

**Estado:** son recomendaciones arquitectónicas motivadas por problemas reales observados en CraftRace, **no módulos implementados en FormulaRace**.

## 6. Primera prueba futura («vertical slice»)

No construir aún un campeonato. Cuando se autorice empezar:
1. Nuevo repositorio/proyecto independiente (sin tocar los juegos existentes).
2. Una escena 3D pequeña, **un monoplaza original** y un tramo/circuito reducido con una subida y un puente.
3. Cámara cenital estricta con proyección ortográfica.
4. Sombras, pianos, textura/material de pista y control básico.
5. Cronómetro no homologado y una IA simple para validar el planteamiento.
6. Publicación DEV automática GitHub Actions → GitHub Pages → PWA Safari.
7. Medir en el iPhone real: FPS, p95 de fotogramas, memoria, temperatura, baterías y latencia de control.
8. Comparar con Babylon.js únicamente si PlayCanvas presenta problemas o costes relevantes.

### Condiciones para ampliar
- La vista tiene que parecer **cenital pura** al jugar, no inclinada.
- Las piezas 3D han de aportar valor perceptible desde arriba.
- El rendimiento debe sostener el objetivo de 60 FPS **con evidencia real**; un único fotograma de captura no es prueba suficiente.
- No introducir dependencias que obliguen a distribuir una IPA en cada iteración.
- No mezclar identidad compartida con economía/circuitos/historial de otros juegos.
- Resolver nombre comercial y licencias antes de anunciar o publicar.

## 7. Nomenclatura y derechos

**«Top Down RACE: FormulaRace» es el nombre de proyecto elegido por el creador el 21/11/2026.** Se abandona el anterior nombre interno «F1Race» como candidato público; «OpenWheelRace» queda como alternativa histórica no elegida. FormulaRace todavía **no está verificado registralmente** y tiene cierta proximidad a otros títulos como «Formula Racer». La denominación definitiva de comercialización requiere revisión de marcas, tiendas y dominios. Comparación ampliada en el catálogo maestro.
Formula 1 identifica F1 como marca y limita su incorporación en nombres de productos; además hay proyectos y dominios llamados F1Race. No usar logos oficiales, monoplazas reales con decoraciones registradas ni signos de campeonato sin autorización.

- [Formula 1 — directrices oficiales de marcas y derechos](https://www.formula1.com/en/information/guidelines.4EOKE9RRqevL4niTK9kWyt).
- [EUIPO — búsqueda de marcas (TMview/eSearch)](https://www.euipo.europa.eu/en/search-ip).
- [Catálogo de cuatro juegos y revisión de nombres](./TOP_DOWN_RACE_FAMILY_CATALOG_2026-11-21.md).
- [RcRace: proyecto distinto y VR en estudio](./RCRACE_CONCEPT_BRIEF_2026-11-21.md).

## 8. Registro de decisiones

| Decisión | Autoridad/estado |
|---|---|
| Juego de monoplazas de la familia (cuarto título/concepto) | Confirmada por el creador |
| 3D real, vehículos, sombras, relieves | Confirmada por el creador |
| **Vista cenital estricta; NO isométrica** | Confirmada por el creador |
| Cámara ortográfica a 90° exactos | Especificación técnica aceptada |
| GitHub + Actions + iPhone Safari PWA | Forma de trabajo preferida por el creador |
| 60 FPS iPhone | Objetivo, no verificación |
| PlayCanvas primer candidato | Aceptado para estudiar, no seleccionado tras pruebas |
| Fluorite como interés para futuros juegos | En observación; soporte PWA no demostrado |
| Neumáticos, boxes, ERS, campeonato | Propuestas, no requisitos firmes |
| FormulaRace como nombre de proyecto | **Elegido por el creador el 21/11/2026; pendientes comprobaciones comerciales y de marca** |
| Fecha de inicio, financiación, publicación | No definidos |

**No implementar funcionalidades ni publicar versiones a partir de este documento sin instrucción posterior.**
