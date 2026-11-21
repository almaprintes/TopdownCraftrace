# Top Down RACE — Catálogo maestro de la familia y revisión de títulos

**Fecha de decisión:** 21 de noviembre de 2026.  
**Estado:** documento de producto y marca; no autoriza cambios en código, publicación de apps ni nuevas infraestructuras.  
**Ámbito:** juegos propios de CraftRace Studio discutidos hasta esta fecha.

> **Regla central:** Top Down RACE es una **familia de juegos cenitales**. Cada título debe ser reconocible como miembro de esa familia, conservar su personalidad y no comprometer por defecto las decisiones técnicas de los demás.

## 1. Estructura de nombres

| Elemento | Nombre recomendado | Función | Estado |
|---|---|---|---|
| Sello o estudio | **CraftRace Studio** | Estudio e identidad común de cuenta | En uso |
| Marca de familia | **Top Down RACE** | Identidad transversal de juegos vistos desde arriba | En uso |
| Juego 1 | **Top Down RACE: CraftRace** | Carreras arcade, progresión y creación | Nombre comercial ya publicado |
| Juego 2 | **Top Down RACE: SlotRace** | Slot/Scalextric virtual, construcción y colección | Nombre de proyecto adoptado; en desarrollo |
| Juego 3 | **Top Down RACE: RcRace** | Coches radiocontrolados; exploración VR/realidad mixta | Idea de juego reconocida en septiembre de 2026; diseño abierto |
| Juego 4 | **Top Down RACE: F1Race** | Monoplazas con 3D cenital puro | **Nombre interno temporal; NO aprobado para comercialización** |

**Hay cuatro títulos o conceptos identificados** en las conversaciones recuperadas hasta esta fecha. RcRace fue omitido por error en la primera edición del catálogo. Las familias de vehículos ROAD/CROSS, el Realizador, LIVE 4 y los estudios de circuitos son categorías, modos o herramientas, no nuevos juegos. Hairpin Legends es una referencia competitiva ajena, no un título de CraftRace Studio.

### Ortografía y consistencia
- **Top Down RACE** con «RACE» en mayúsculas; usar «Top Down RACE: [Nombre]» para títulos.
- **CraftRace** con «t». Algunas rutas, variables y documentos históricos usan «CrafRace»; no renombrar claves técnicas o identificadores sin migración, pero usar **CraftRace** en el producto y documentación nueva. Comprobación pública: [ficha de Google Play](https://play.google.com/store/apps/details?id=com.craftracestudio.topdownrace).
- **SlotRace**, con S y R mayúsculas como nombre del segundo juego; «SLOTRACE» aparece como escritura heredada en apuntes, no debe crear una segunda marca.
- **RcRace** es la grafía actual aportada por el creador. En conversaciones del 25/09/2026 también figura como «RCrace»; ambos identifican el mismo concepto, no dos juegos distintos.
- **F1Race** identifica el proyecto en las conversaciones, **no** un nombre comercial despejado.
- Mantener nombres de juego, estudio, cuenta global y submodos conceptualmente separados.

## 2. Qué es cada título

### Top Down RACE: CraftRace — producto existente
- Arcade de carreras con vista cenital, controles de conducción, coches diferenciados, garaje/progresión, circuitos, contrarreloj, récords y multijugador.
- Tecnología y publicación actuales: JavaScript/Phaser/Vite; web/PWA DEV desplegada por **GitHub Actions → GitHub Pages**; empaquetado móvil Android mediante Capacitor, con publicación en Google Play gestionada aparte.
- Desarrollo activo y prioridades observadas en noviembre: rendimiento móvil, multijugador de 2–4 humanos con IA opcional, reconexiones, claridad de resultados y **IA experta capaz de usar vértices reales**, todavía pendiente de homologar.
- No dar por concluida la trazada experta: se ha observado un seguimiento excesivo del eje central y variación entre tiempos de prueba.
- El nuevo proyecto de monoplazas **no** sustituye CraftRace ni obliga a migrar su motor gráfico.

### Top Down RACE: SlotRace — producto en desarrollo
- Recreación de carreras de slot/Scalextric con creación de circuitos a partir de piezas, dos carriles, cambios de carril, puentes/elevaciones, caja inicial, tienda de piezas/coches, colección y clasificación de constructores.
- Carreras por mangas, cronometraje por carril, IA de varios niveles, duelos en directo o diferidos, pista compartida por código, revancha y reconexión.
- Distinción esencial: la construcción y el inventario son parte del juego; no compartir inventarios, circuitos y economía de forma automática con CraftRace.
- Un eventual renderizado 3D de vitrina/mesa es **idea de exploración**, no compromiso de cambiar el motor SlotRace.

### Top Down RACE: RcRace — concepto futuro de radiocontrol
- Nombre mencionado explícitamente por el creador en conversación del **25 de septiembre de 2026**, con la grafía histórica «Top Down RACE: RCrace». El 21/11/2026 confirmó que falta incluirlo en la familia.
- **Concepto:** vehículos radiocontrolados en circuitos y escenarios de escala reducida; independiente de CraftRace y de SlotRace.
- **Exploración acordada:** posibilidad de versión para Meta Quest, con VR. Se conversó sobre **conducir desde fuera de la pista, situado junto a un circuito en miniatura**, y una futura extensión de **realidad mixta/passthrough**. Estos detalles son ideas de concepto presentadas en aquella conversación, no especificación final cerrada por el creador.
- **No se ha confirmado** ni implementado un prototipo, motor 3D, control definitivo, multijugador, publicación, economía ni plataforma obligatoria.
- **Vista cenital:** la familia Top Down RACE tiene identidad desde arriba, pero hay que resolver cómo coexistirá con la propuesta de perspectiva exterior en VR. **No aplicar sin más la cámara cenital estricta de F1Race a RcRace**: son decisiones de proyectos distintos.
- Ver [ficha de RcRace y decisiones pendientes](./RCRACE_CONCEPT_BRIEF_2026-11-21.md).

### Top Down RACE: F1Race — cuarto concepto de juego
- Juego de monoplazas con identidad Top Down RACE, **mundo 3D y cámara cenital pura**, sin vista isométrica.
- Confirmado por decisión del creador: coches 3D, sombras, circuitos con relieve, perspectiva de juego estrictamente superior (vertical) y continuidad del método GitHub + iPhone PWA.
- **No desarrollado todavía**; tecnología PlayCanvas como primera candidata de estudio, sin selección definitiva ni prototipo homologado.
- Clasificación, campeonatos, neumáticos, boxes, ERS/rebufo, carreras de varias plazas y retransmisiones se consideran **ideas de diseño a evaluar**, no requisitos cerrados.
- Ver detalle separado: [F1Race — visión y viabilidad técnica](./F1RACE_3D_CENITAL_PRODUCT_BRIEF_2026-11-21.md).

## 3. Plataforma común y límites entre juegos

Decisión previa documentada en [CraftRace Studio — identidad compartida](./CRAFT_STUDIO_UNIFIED_ACCOUNT.md):
- Una única identidad central de cuenta **CraftRace Studio** (mismo UUID autenticado en Supabase), sin crear usuarios distintos por juego.
- El nick y los elementos de identidad compartida pueden servir a todos los títulos una vez confirmada la asociación con la misma cuenta.
- **Progreso, récords, monedas, inventarios, coches y circuitos específicos permanecen separados por juego.** No mezclar datos o migrarlos silenciosamente.
- No unir dos identidades por coincidencia de nombre o correo; respetar las vinculaciones verificadas Apple/Google.
- Tanto RcRace como F1Race deberían evaluar este contrato cuando se diseñe su cuenta, sin alterar los datos de CraftRace/SlotRace.
- Mantener la posibilidad futura de migración a servidor propio; documentación portable y contratos explícitos.

## 4. Principios comunes de diseño

**Decisiones confirmadas**
1. Vista top-down/cenital es rasgo de identidad de la familia.
2. Cada título puede emplear un motor diferente si respeta el enfoque cenital.
3. Priorizar buena respuesta, controles móviles y rendimiento medible.
4. No publicar a tiendas sin decisión expresa; DEV y producción son entornos diferentes.
5. Evitar que prototipos F1Race, RcRace o SlotRace afecten al juego publicado.
6. Mantener identidad compartida y datos separados.

**Prácticas recomendadas, pendientes de validación**
- Para juegos con IA: simulación independiente de los FPS, trazadas físicas reales, aceleración/agarre comparables y telemetría verificable.
- Instrumentación A/B y pruebas con dispositivos reales antes de activar funciones competitivas.
- Estilo visual propio y siluetas legibles desde arriba, incluso con gráficos 3D.

## 5. Revisión comercial y riesgos de los títulos (21/11/2026)

| Nombre | Juicio de producto | Situación de publicación |
|---|---|---|
| **Top Down RACE: CraftRace** | Identidad comprobable, consistente con juego y marca | **Mantener.** Ya utilizado comercialmente. |
| **Top Down RACE: SlotRace** | Explica inmediatamente la mecánica de slot; consistente en la familia | **Mantener como título de trabajo/adoptado.** Comprobar disponibilidad registral antes de comercializar. |
| **Top Down RACE: RcRace** | Denominación coherente con radiocontrol, aunque «RC» es genérico y existen otros usos | **Mantener como nombre de concepto.** Comprobar marcas y tiendas antes de anunciarlo. |
| **Top Down RACE: F1Race** | Es comprensible, pero incorpora **F1**, marca protegida, y hay usos preexistentes de «F1Race» | **No lanzarlo con ese nombre sin una licencia o asesoramiento y autorización adecuados.** Usarlo solo internamente mientras elegimos alternativa. |
| **CraftRace Studio** | Adecuado como identidad transversal del estudio y las cuentas | Mantener y evitar que sustituya el título de cada juego. |

### Evidencia sobre «F1Race» y marcas
- Formula 1 identifica «F1» entre sus marcas y **restringe su incorporación en nombres de productos/servicios**: [directrices oficiales](https://www.formula1.com/en/information/guidelines.4EOKE9RRqevL4niTK9kWyt). Estas normas no sustituyen una valoración jurídica específica.
- Usos públicos identificados del nombre: [f1race.es](https://f1race.es/), [f1race.com](https://f1race.com/) y otros proyectos denominados F1Race. No afirmar exclusividad ni disponibilidad.
- La comprobación de nombres alternativos debe incluir clases aplicables a videojuegos/software, territorios relevantes y similitud fonética/visual; consultar [EUIPO — TMview y búsqueda de marcas](https://www.euipo.europa.eu/en/search-ip). Una búsqueda web **no** equivale a autorización registral.
### Búsqueda inicial de alternativas a «F1Race» (21/11/2026)
El objetivo es **evocar carreras de monoplazas de alto nivel sin usar «F1», «Formula 1», «Formula One» ni «Grand Prix» como marca propia**.

| Candidato interno | A favor | Limitación / comprobación pendiente |
|---|---|---|
| **Top Down RACE: FormulaRace** | Inmediato para el público; conserva el patrón de la familia | Es genérico y se parece a videojuegos preexistentes como **Formula Racer**. No declarar libre |
| **Top Down RACE: OpenWheelRace** | Preciso en automovilismo: coches de ruedas descubiertas; no reclama estar afiliado a una competición específica | Término descriptivo en inglés; verificar marcas, tiendas y similitud con terceros |
| **Top Down RACE: SingleSeaterRace** | Significa competición de monoplazas sin usar nombres de campeonatos | Nombre largo; menos comercial |
| **Top Down RACE: MonoplazaRace** | Fácil de entender en español | Mezcla idiomas y puede limitar alcance |
| **Top Down RACE: ApexFormula** | Sonoridad deportiva | «Formula» y «Apex» aparecen muy usados en videojuegos; revisar conflictos |

**Ninguno está aprobado como nombre final.** La búsqueda pública no equivale a examen registral. Verificación específica de Formula Racer: [MobyGames — Formula Racer (2011)](https://www.mobygames.com/game/269534/formula-racer/). Fuente sobre marcas protegidas: [Formula 1 — Legal Notices](https://www.formula1.com/en/information/legal-notices.7egvZU48hzrypubGBNcQKt).
- Las denominaciones de competiciones, equipos, pilotos, imágenes y logos oficiales requieren análisis de derechos antes de su reproducción. Preferencia conceptual: equipos y monoplazas originales mientras no exista licencia.

## 6. Orden de prioridades acordado

1. **CraftRace:** continuar desarrollo y solucionar problemas conocidos, especialmente IA de carrera y multijugador.
2. **SlotRace:** mantener desarrollo propio, pruebas y arquitectura de cuenta común; no absorberlo en CraftRace.
3. **RcRace:** conservar el concepto de radiocontrol y explorar técnicamente Quest 3/VR o realidad mixta en el futuro, **sin asumir todavía una cámara o motor definitivo**.
4. **F1Race (nombre por decidir):** conservar la especificación como otro proyecto futuro. **No crear todavía nuevo repositorio ni comenzar a programar** por el simple hecho de documentarlo.
5. Cuando se active el juego de monoplazas, empezar con **prototipo pequeño**, verificar 60 FPS objetivo en móvil y comparar motores antes de ampliar el juego.

## 7. Decisiones pendientes y control de cambios
- [ ] Elegir un **título comercial sin conflictos** para el proyecto interno F1Race. Candidatos iniciales: FormulaRace / OpenWheelRace.
- [ ] Precisar el diseño de RcRace y decidir si habrá variante cenital tradicional, VR, realidad mixta o varias, sin confundir ideas preliminares con decisiones aprobadas.
- [ ] Hacer búsqueda formal de marcas para toda la familia si se va a registrar o lanzar nuevos títulos.
- [ ] Aprobar motor definitivo de F1Race tras prueba PWA real en Safari/iPhone.
- [ ] Precisar físicas, reglamento, estrategia, meteorología y profundidad del campeonato de F1Race.
- [ ] Definir requisitos concretos de dispositivos, consumo de batería y límites de coches simultáneos.
- [ ] Confirmar, con pruebas reales, qué servicios serán compartidos por el nuevo juego.

**Regla documental:** distinguir siempre «confirmado por el creador», «propuesta», «en estudio», «implementado» y «verificado en dispositivos». No convertir sugerencias del asistente en decisiones del proyecto.

## Referencias internas
- [Contrato de cuentas CraftRace Studio](./CRAFT_STUDIO_UNIFIED_ACCOUNT.md).
- [LIVE 4: IA, multijugador y estado técnico](./CRAFTRACE_LIVE_4P_AI_ROADMAP.md).
- [Normas de despliegue y DEV](./DEPLOYMENT_POLICY.md).
- [RcRace: concepto y VR en estudio](./RCRACE_CONCEPT_BRIEF_2026-11-21.md).
- [F1Race: visión y viabilidad](./F1RACE_3D_CENITAL_PRODUCT_BRIEF_2026-11-21.md).
