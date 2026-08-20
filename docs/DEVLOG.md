# Top Down RACE / TopdownCraftrace — DEVLOG

> Crónica histórica y narrativa del desarrollo. Este documento NO sustituye a `docs/CHATS.md`: CHATS es memoria operativa; DEVLOG conserva la historia del proyecto para un posible making-of, documental, Shipaton, artículo o vídeo.

## Cómo mantener esta crónica
- Registrar decisiones, pruebas, errores, callejones sin salida y descubrimientos, no solo éxitos.
- Conservar frases y sensaciones del piloto cuando expliquen mejor que una cifra qué estaba ocurriendo.
- Vincular commits cuando exista evidencia en GitHub.
- Distinguir hechos verificables de recuerdos/reconstrucciones pendientes.
- Añadir capturas/mockups/vídeos históricos cuando se localicen en los chats antiguos del proyecto `Aplicaciones móvil`.

---

# ACTO 0 — LOS ORÍGENES

## Enero–febrero de 2026 aprox. — La primera versión
**Estado: reconstrucción pendiente de conversaciones históricas.**

Top Down RACE empezó aproximadamente siete meses antes de esta entrada. Las conversaciones originales del proyecto `Aplicaciones móvil` contienen capturas e imágenes de aquellas primeras versiones y permiten reconstruir cómo fue cambiando la estructura del juego.

Objetivo documental: recuperar esas conversaciones cronológicamente y conservar:
- primera idea jugable;
- primeras interfaces y circuitos;
- evolución visual;
- cambios de estructura del juego;
- primeras decisiones sobre física, coches, crafting y progresión;
- capturas que permitan mostrar comparativas «antes / después».

No rellenar estos huecos de memoria a mano: reconstruirlos desde fuentes históricas cuando estén disponibles.

## Marzo–abril de 2026 — El proyecto ya pelea por existir
Hay evidencia histórica de una etapa temprana de infraestructura complicada:
- entre el 17 y el 26 de marzo falló repetidamente el flujo `Deploy to GitHub Pages`; la compilación fallaba y el despliegue quedaba omitido;
- el 5 de abril existían cambios sin confirmar/enviar en un Codespace del proyecto y el entorno tenía eliminación programada para el 12 de abril.

Esta etapa es interesante para el relato porque muestra que antes de discutir décimas, transferencia de masas o identidades de marcas, hubo que conseguir algo mucho más básico: que el juego pudiera construirse, sobrevivir y desplegarse.

---

# ACTO I — DE PROTOTIPO A JUEGO

## 2026 — Evolución estructural
**Estado: pendiente de reconstrucción fina desde chats antiguos.**

A lo largo de los meses el proyecto dejó de ser únicamente un juego de carreras top-down y fue incorporando una capa de crafting/progresión hasta convertirse en TopdownCraftrace. El historial de conversaciones e imágenes debe utilizarse para documentar visualmente esta transformación y fechar cada gran cambio.

Puntos que deben reconstruirse con fuentes:
- cuándo apareció el crafting;
- cuándo se definieron coches/marcas;
- evolución del selector de circuitos y mapas;
- evolución del HUD;
- cambios de controles y física;
- sistema económico/progresión;
- transición hacia una aplicación comercializable y monetizable.

---

# ACTO II — AGOSTO DE 2026: EL JUEGO EMPIEZA A ENCONTRAR SU IDENTIDAD

## Principios de agosto — Monetización y publicación
Se preparó el proyecto para una futura publicación iOS/Android y monetización mediante anuncios recompensados. Esta etapa marca el paso de «proyecto que funciona» a «producto que queremos lanzar».

## 17 de agosto — Shipaton entra en escena
Commit verificable:
`1861e491fdab9666e7c81f7dba1ffb7b863faa4e` — `docs: document Shipaton 2026 launch plan`.

A partir de aquí el desarrollo adquiere una segunda narrativa: no solo terminar el juego, sino poder contar cómo se construyó.

## Mediados de agosto — Circuitos reales y trabajo visual
Se trabaja con capturas/mapas de circuitos para generar vistas previas y assets. Karting Tenerife se convierte además en un escenario especialmente importante por el conocimiento que el piloto tiene de su trazado.

En paralelo se experimenta con extracción/trazado de circuitos desde imágenes aéreas. Los intentos de generar una línea central limpia dejan varios fallos útiles para el making-of: líneas dobles, restos de contorno, discontinuidades y reinterpretaciones incorrectas. La exigencia termina siendo muy concreta: una única línea central continua y cerrada, con geometría comprensible incluso donde los árboles ocultan parcialmente el asfalto.

## 17 de agosto — El fantasma y las iteraciones de UI
La interfaz del fantasma/repetición bajo el minimapa requiere muchas más iteraciones de las esperadas. El objetivo termina siendo un bloque compacto, con el mismo ancho y estilo del minimapa: texto en dos líneas y botón inmediatamente debajo.

Lección documental: cambios aparentemente diminutos pueden consumir muchas iteraciones cuando se trabaja directamente sobre una interfaz móvil real.

---

# ACTO III — BASE 1.0

## La física deja de ser una sensación genérica
Tras numerosas iteraciones se aprueba y congela una física común denominada **BASE 1.0**. El coche patrón es **VELOCE Flash**.

Commit base de chasis:
`433651cf043c9f2312fdc8cd264948c9645608a7` — `Blend chassis load transitions across brake and throttle`.

Flash registra inicialmente 41.751 en Karting Tenerife y la mejora de conducción se considera suficientemente grande como para congelar la física común. Desde ese momento la estrategia cambia: dejar de perseguir una física global perfecta y construir personalidad mediante perfiles/overrides por coche.

Regla que nace aquí: **mejor coche no significa coche más fácil**.

## Las cinco marcas
El roster se organiza en 15 coches, 5 marcas × 3:
- HÉLIX — escuela/accesibilidad;
- CROWN — equilibrio/refinamiento;
- AVENIR — precisión y técnica;
- VELOCE — velocidad y exigencia;
- FORGE — masa, fuerza y tolerancia fuera del asfalto.

---

# ACTO IV — HOMOLOGAR 15 COCHES

## Protocolo
Karting Tenerife · contrarreloj · cinco vueltas · completamente stock · telemetría + sensaciones.

La decisión de usar siempre el mismo circuito reduce el sesgo de aprendizaje y convierte al jugador en una especie de piloto de pruebas. Las sensaciones pasan a ser tan importantes como el cronómetro.

## HÉLIX
### Spark — 50.613 / 52 km/h
«Facilísimo y monótono. Enseguida llegas a la velocidad punta.»

Descubrimiento posterior: llevaba Frenos T4. La tanda sirve para carácter, pero deberá repetirse para homologación stock estricta.

### Comet — 47.737 / 56 km/h
«Sumamente divertido de conducir.»

El salto desde Spark demuestra que más rendimiento también puede aumentar diversión sin destruir accesibilidad.

### Pulse — 45.905 / 59 km/h
Muy rápido, muy fácil y con salida de curva excepcional. Queda bajo vigilancia precisamente porque quizá sea demasiado fácil para el HÉLIX superior.

## CROWN
### Axis — ~46.034
Más lento que Pulse pero mucho más fácil. Se corrige únicamente su tamaño visual (`visualScale: 0.92`), sin tocar física.
Commit: `efc5b9e917f24d3d93687ce47e2009c9c58c9172`.

### Vector — 43.877 / 62 km/h
«Sensación fantástica. El coche me permite progresar y arañar más décimas a cada vuelta.»

### Equinox — 41.458 / 65 km/h
Potente y rápido, pero transmite peligro permanente. Esa amenaza se acepta como parte correcta de su identidad.

## Un bug cambia el protocolo
Al empezar AVENIR Gripline se descubre que no estaba stock: llevaba `Neumático Street T1` y `Transmisión Prototype T4`. Poco después se descubre también que Spark llevaba Frenos T4.

Esto abre un problema de Factory: era posible equipar pero el flujo de desequipado era confuso/incompleto. Un primer arreglo se realiza sobre el método equivocado. Finalmente se identifica que la barra visible usa `_familyDock()` y se activa un wrapper específico.

Commit de activación:
`e6b432653a0019d4e541b2d36e176414e1b50b77` — `Activate factory unequip wrapper`.

Al quitar las piezas de Gripline aparece otro problema: desaparecen del inventario. Se corrige y se añade una reparación puntual.

Commit:
`fe2a036c45487ee5d939f6564113681c5ce3f7ea` — `Return factory parts to inventory when unequipping`.

Más tarde se descubre otra peculiaridad: las piezas T4 finales pueden existir pero quedar ocultas visualmente porque el inventario filtra según si una pieza puede participar en otra receta.

Este episodio desemboca en una conclusión mayor: **la parte derecha de Fabricación necesita un rediseño UX completo**, no más parches. El jugador se pierde entre crafting, autoequipado, inventario y desequipado.

## AVENIR
### Gripline — 44.599 / 59 km/h
Tras dejarlo realmente stock: «mucho control y bastante velocidad». Una vuelta no es registrada correctamente por probablemente saltarse CP1 y queda invalidada.

### Apex — 42.366 / 62 km/h
«Muy nervioso al principio pero tras alguna vuelta lo controlé rápidamente.»

La progresión vuelta a vuelta convierte el nerviosismo en una característica aprendible, no en frustración.

### Torque — 41.008 / 65 km/h
«Sublime. Se come los pianos como un poseso. Como si fuera por raíles.»

La aceleración al volver al gas transmite potencia y la punta tarda un poco en llegar, pero se siente claramente cuando aparece. Torque se convierte en uno de los ejemplos más claros de identidad conseguida.

## VELOCE
### Flash — 41.493 / 68 km/h
Se repite el patrón para medir cuánto había mejorado el piloto. El resultado frente al viejo 41.751 demuestra que el aprendizaje explica solo unas décimas.

Sensación: muy difícil; la trasera se va muchísimo y obliga a frenar donde otros coches permiten simplemente levantar.

### Surge — 39.865 / 72 km/h
«Si no orientas bien el coche tras la curva antes de abrir el gas te vas fuera.»

Más incontrolable que Flash. Exige frenar más. En una vuelta sin frenar queda claro que no basta con confiar en la velocidad.

### Photon — 38.849 / 80 km/h
«Potro indomable.»

Solo una vuelta realmente dominada. Aceleración «de otro planeta». El coche puede mandar al jugador larguísimo si frena mal orientado y obliga incluso a detenerse en algunas situaciones. Su techo es espectacular, pero queda marcado para revisar si su dificultad cruza la frontera entre exigente y excesiva.

## FORGE
### Hammer — 52.043 / 54 km/h
Muy complicado. La hierba no penaliza, lo que confirma una ventaja de familia, pero el coche se va incluso a poca velocidad y cuesta muchísimo reorientarlo. Una vuelta queda contaminada al perder CP2 y tener que volver a buscarlo.

### Anvil — 52.241 / 54 km/h
Las segundas curvas de las chicanes son especialmente problemáticas. Para curvas normales aparece espontáneamente una técnica: recuperar gas mediante pequeños impulsos para evitar que toda la aceleración descoloque el coche.

### Colossus — 56.607 / 53 km/h
«Debería sentirse más pesado pero el morro tiembla muchísimo.»

El piloto identifica una pista de diseño crucial: el pivote parece demasiado centrado y hace que la trasera baile. Paradójicamente, siendo el camión enorme y el que debería ser más torpe, termina siendo más satisfactorio que Hammer y Anvil porque se aprende vuelta a vuelta.

Conclusión: FORGE no necesita simplemente más agarre. Necesita que la dificultad provenga de masa, batalla e inercia, no de un comportamiento de pivote/trasera extraño. Su tolerancia al terreno debe conservarse.

---

# ACTO V — 20 DE AGOSTO DE 2026: PRIMERA FOTO COMPLETA

Se completa la primera homologación de los 15 coches stock. Se crea una tabla maestra en `docs/CHATS.md` y quedan tres grandes frentes:

1. **FORGE 1.1** — inspeccionar parámetros reales antes de tocar nada; BASE 1.0 permanece congelada.
2. **Factory UX** — rediseño profundo de la zona derecha en horizontal para iPhone.
3. **Crafting y máximo potencial** — auditar Motor, Transmisión, Neumáticos, Frenos y Suspensión T1→T4 y decidir cuánto puede crecer cada coche sin perder su personalidad.

Principio para la siguiente etapa:
- Gripline maxeado debe seguir siendo Gripline.
- Photon maxeado debe seguir siendo terroríficamente rápido y exigente.
- Colossus maxeado debe convertirse en una apisonadora eficaz en su terreno, no en un deportivo gigante.

Commit que documenta la homologación completa en `CHATS.md`:
`db6e4ef2e44cf81fe1b2d6ef0f2c2a4f3dce6ce2` — `Document full stock car homologation`.

---

# ARCHIVO DOCUMENTAL PENDIENTE

La siguiente ampliación del DEVLOG debe reconstruir los meses iniciales usando los chats históricos del proyecto `Aplicaciones móvil` y sus imágenes. Prioridad alta para localizar capturas de versiones antiguas y crear una línea temporal visual del mismo juego cambiando de forma con el paso de los meses.

Cuando se recuperen fuentes antiguas, añadirlas cronológicamente en los Actos 0 y I en lugar de inventar recuerdos.
