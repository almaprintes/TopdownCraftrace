# Top Down RACE / TopdownCraftrace — DEVLOG

> Crónica histórica y narrativa del desarrollo. Este documento NO sustituye a `docs/CHATS.md`: CHATS es memoria operativa; DEVLOG conserva la historia del proyecto para un posible making-of, documental, Shipaton, artículo o vídeo.

## Cómo mantener esta crónica
- Registrar decisiones, pruebas, errores, callejones sin salida y descubrimientos, no solo éxitos.
- Conservar frases y sensaciones del piloto cuando expliquen mejor que una cifra qué estaba ocurriendo.
- Vincular commits cuando exista evidencia en GitHub.
- Distinguir hechos verificables de interpretación.
- Mantener referencias a capturas y grabaciones históricas que permitan reconstruir visualmente el proyecto.

---

# ACTO 0 — EL JUEGO ANTES DEL JUEGO

## Archivo histórico recuperado
El 20 de agosto de 2026 se recuperó un archivo personal de **697 piezas** procedentes de los chats y pruebas iniciales del proyecto. Los metadatos cubren **18 de enero → 2 de abril de 2026**. Incluye centenares de capturas y cinco vídeos, entre ellos dos grabaciones de pantalla especialmente valiosas:
- `ScreenRecording_01-21-2026 10-38-27_1.MP4` — 45 s.
- `ScreenRecording_03-10-2026 20-45-33_1.MP4` — 104 s.

Este archivo permite sustituir recuerdos vagos por una cronología visual real.

## 18–20 enero — Las primeras formas
Las primeras capturas muestran un proyecto todavía experimental. Aparecen esquemas de circuito muy simples sobre fondos oscuros, rectángulos y líneas que funcionan más como pruebas geométricas que como pista final. También aparecen pruebas de volante/controles y varias composiciones de trazado.

La prioridad visible no es todavía “hacer un juego bonito”, sino resolver preguntas básicas:
- cómo representar una pista top-down;
- cómo colocar el coche sobre ella;
- cómo moverlo;
- cómo visualizar dirección y límites;
- cómo encajar controles en un móvil.

## 21 enero — El primer TDR2 jugable registrado
La grabación del 21 de enero es una pieza clave del documental. Arranca con una pantalla oscura `TDR2 / Top-Down Race 2` y pasa a una versión de conducción completamente de laboratorio.

La pantalla está dominada por:
- una enorme **rejilla verde de depuración**;
- un coche blanco mínimo;
- lectura técnica `RaceScene`;
- velocidad, zoom y estado del coche;
- una columna `UPGRADES` con Motor, Frenos y Neumáticos;
- botones funcionales antes que estética final.

El contraste con agosto es enorme: el ADN del juego ya existe —coche, pista, mejoras— pero todavía se ve literalmente la estructura con la que se está construyendo.

## 21–25 enero — De la rejilla a una carretera reconocible
En pocos días la rejilla deja paso a una pista gris sobre césped verde. Aparecen:
- joystick virtual inferior izquierdo;
- `GAS` y `FRENO` a la derecha;
- HUD técnico superior;
- carriles y bordes de pista;
- primeras curvas más orgánicas;
- pruebas de zonas de salida, líneas y superficies.

La pantalla sigue teniendo mucho debug visible, pero ya se puede reconocer sin explicación que es un juego de carreras móvil.

---

# ACTO I — NACEN LOS COCHES Y LAS MARCAS

## 25–30 enero — El roster existe antes que la presentación definitiva
El archivo muestra algo sorprendente: muy pronto aparece el concepto de **15 coches agrupados en cinco marcas**, junto con fichas de vehículo mucho más elaboradas que la interfaz de carrera de aquel momento.

Se conservan fichas tempranas de:
- HÉLIX Spark, Comet, Pulse;
- CROWN Axis, Vector, Equinox;
- AVENIR Gripline, Apex, Torque;
- VELOCE Flash, Surge, Photon;
- FORGE Hammer, Anvil, Colossus.

Las fichas incluyen vista superior/lateral o frontal, estadísticas y tratamiento gráfico por marca. La estructura fundamental del roster actual ya estaba definida a finales de enero.

También aparecen emblemas y exploraciones visuales de HÉLIX, CROWN, AVENIR, VELOCE y FORGE. No todo el branding sobrevivió igual, pero la intención sí: **cada familia debía sentirse como una marca, no como tres skins del mismo coche**.

## 30 enero–1 febrero — De fichas a assets jugables
Las capturas muestran una transición clara desde las fichas conceptuales hacia assets superiores aislados sobre fondo negro y posteriormente hacia tarjetas verticales de selección.

Se prueban múltiples representaciones de los mismos coches:
- arte conceptual detallado;
- vista cenital para carrera;
- tarjeta de colección;
- estadísticas compactas;
- variantes visuales de garaje.

Este periodo documenta una decisión importante: el coche debía existir simultáneamente como **objeto jugable**, **objeto de colección** y **objeto aspiracional**.

## 1–3 febrero — Primer salto fuerte de identidad visual
Aparecen iteraciones de logotipo `TDR / TDR2`, escudos, sobres/packs y una interfaz horizontal mucho más cercana a un producto.

La carrera empieza a convivir con pantallas de selección/garaje. Se ven:
- menú horizontal oscuro;
- selección de vehículo;
- botones grandes de acción;
- branding específico de marca;
- packs o sobres de recompensa con distintos colores;
- primeras presentaciones de coche fuera de la pista.

Es uno de los primeros momentos donde el proyecto deja de parecer una demo técnica y empieza a parecer un juego con metajuego.

---

# ACTO II — EL JUEGO QUIERE SER MÁS GRANDE QUE UNA CARRERA

## 5–12 febrero — Física, HUD y escala del coche
El archivo alterna capturas de carrera con paneles llenos de sliders y configuraciones. Se experimenta con valores de conducción mientras la pista mantiene todavía una estética muy simple.

Aparecen también estudios y renders de coches, especialmente AVENIR Gripline, y referencias visuales a instrumentación/velocímetro. La obsesión ya no es únicamente “que se mueva”: comienza la búsqueda de **sensación de coche**.

Se observan pruebas de:
- ajustes de parámetros;
- velocidad máxima;
- comportamiento en curva;
- escalado del coche respecto a pista;
- lectura de datos en tiempo real.

## 12–18 febrero — El salto “espacial”
Aquí aparece una transformación visual enorme: fondos cósmicos, iluminación azul, presentación premium y un nuevo lenguaje de UI.

Se ensayan pantallas de inicio/selección con:
- coche protagonista centrado;
- fondo de nebulosa/espacio;
- botones brillantes;
- eventos activos;
- acceso a `FACTORY`;
- elementos de progreso y recompensa.

El proyecto está buscando una fantasía mayor: no solo conducir, sino **poseer, mejorar, desbloquear y progresar**.

## 18–24 febrero — Garage, Factory, eventos y herramientas internas
Las capturas revelan dos juegos desarrollándose a la vez.

Por un lado, el producto para el jugador:
- garaje con tarjetas;
- selección de coches;
- Factory;
- eventos activos;
- paneles de estadísticas;
- recompensas.

Por otro, un conjunto creciente de herramientas internas:
- `CAR FACTORY`;
- editores de parámetros;
- interfaces para construir/ajustar coches;
- pantallas administrativas.

Esto será una constante del proyecto: muchas mejoras visibles nacen porque antes se construye una herramienta invisible que permite iterar más rápido.

## 24 febrero–2 marzo — Los circuitos reales entran en la historia
Aparecen imágenes aéreas de kartings reales y referencias visuales que se intentan convertir en trazados jugables. El juego deja de depender únicamente de circuitos inventados.

En paralelo nace un **EDITOR DE PISTAS** azul, claramente funcional antes que bonito. Permite dibujar líneas y generar trazados de formas muy diferentes.

Las capturas documentan una etapa de prueba y error feroz:
- bucles simples;
- formas cerradas dibujadas a mano;
- líneas demasiado gruesas;
- trazados deformados;
- importación de una imagen como referencia;
- circuitos que se parecen solo parcialmente al original.

La idea que años después parece obvia —“usar Karting Tenerife”— aquí todavía se está inventando técnicamente.

---

# ACTO III — MARZO: CONSTRUIR UN CIRCUITO SE CONVIERTE EN UN PROYECTO DENTRO DEL PROYECTO

## 2–6 marzo — Del dibujo libre al circuito reconocible
El editor azul gana controles y empieza a trabajar sobre imágenes aéreas. Las capturas muestran intentos de seguir circuitos reales, probar líneas centrales y generar pistas a partir de esas guías.

La carrera ya reproduce trazados más complejos. Algunas pruebas fallan de forma espectacular: curvas imposibles, carretera sobre terreno incorrecto, formas poco naturales y errores visibles en consola.

Pero la dirección ya está fijada: **el mundo real debe convertirse en contenido jugable**.

## 6–10 marzo — Karting Tenerife como laboratorio
Aparecen repetidamente imágenes aéreas de Karting Tenerife, dibujos blancos de su trazado y pruebas de importación en el editor.

El flujo de trabajo se vuelve reconocible:
1. partir de una foto aérea;
2. aislar/dibujar la geometría relevante;
3. importarla al editor;
4. generar una pista;
5. probarla conduciendo;
6. detectar dónde la geometría no se corresponde con la realidad;
7. volver al editor.

Se ven también referencias a herramientas externas de dibujo y ediciones manuales, señal de que todavía no existe una solución automática fiable.

## 10 marzo — Una grabación muestra el editor en funcionamiento
La grabación de 104 segundos del 10 de marzo es otra pieza documental prioritaria. Muestra el juego y el editor trabajando en tiempo real, incluyendo:
- herramientas de edición;
- dibujo y manipulación de pista;
- pruebas directas en carrera;
- pantalla de selección/garaje;
- paneles técnicos/admin.

Es importante porque demuestra que el editor no era un mockup: ya formaba parte del ciclo real de desarrollo.

## 10–12 marzo — El editor aprende geometría de pista
Las capturas muestran una evolución rápida desde una línea central hacia una pista con:
- ancho;
- bordes;
- pianos/zonas laterales;
- puntos/nodos;
- curvas generadas;
- orientación de segmentos.

También aparecen iconos específicos relacionados con circuito, coche, mensajes, anuncios/megáfono y advertencias, evidencia de que el proyecto empieza a pensar en una arquitectura de producto más amplia.

## 12–17 marzo — Nace TRACK STUDIO
El antiguo editor azul da paso a una herramienta oscura llamada **TRACK STUDIO**. El cambio no es solo cosmético: las capturas muestran un enfoque más técnico de edición por nodos/segmentos y propiedades.

Se experimenta con:
- creación de nodos;
- curvas y segmentos;
- edición de ancho;
- referencias aéreas de fondo;
- distintos tipos de trazado;
- carriles y bordes generados;
- zonas de salida y geometría adicional.

TRACK STUDIO convierte la creación de circuitos en una disciplina propia dentro del proyecto.

## 17–21 marzo — La complejidad pasa factura
El archivo contiene muchas capturas de consola y errores alternadas con Track Studio. Es una etapa de expansión rápida donde cada capacidad nueva rompe otra cosa.

Hay intentos de:
- mejorar uniones entre segmentos;
- orientar curvas;
- trabajar con objetos/decoración;
- generar zonas laterales;
- colocar elementos de circuito;
- sincronizar editor y juego.

La historia deja claro algo útil para un documental: el progreso no fue lineal. La interfaz podía parecer más sofisticada mientras internamente aumentaban los fallos y regresiones.

## 21 marzo–2 abril — De dibujar la pista a construir el entorno
Las últimas capturas del archivo muestran carreras con muchos elementos alrededor del trazado: marcas de parrilla, objetos repetidos, zonas de salida y pruebas de decoración.

Aparece también una pantalla `CIRCUITOS`, señal de que el contenido comienza a organizarse como colección de pistas y no como una única demo.

Para el 2 de abril el proyecto ya contiene casi todos los grandes pilares conceptuales que más tarde se refinarán:
- conducción top-down;
- 15 coches/5 marcas;
- garaje;
- mejoras;
- Factory;
- eventos;
- circuitos múltiples;
- editor de circuitos;
- herramientas admin;
- contenido inspirado en lugares reales.

Lo que falta todavía no es ambición: es **cohesión, física madura, UX y acabado**.

---

# ACTO IV — AGOSTO DE 2026: EL JUEGO ENCUENTRA SU IDENTIDAD DE CONDUCCIÓN

## Principios de agosto — Monetización y publicación
Se prepara el proyecto para futura publicación iOS/Android y monetización mediante anuncios recompensados. La pregunta deja de ser únicamente “¿podemos hacerlo?” y pasa a ser “¿podemos lanzarlo?”.

## 17 de agosto — Shipaton entra en escena
Commit verificable:
`1861e491fdab9666e7c81f7dba1ffb7b863faa4e` — `docs: document Shipaton 2026 launch plan`.

A partir de aquí el desarrollo adquiere una segunda narrativa: no solo terminar el juego, sino poder contar cómo se construyó.

## Mediados de agosto — Los circuitos reales vuelven con más rigor
Se retoma el trabajo con imágenes aéreas y capturas de circuitos reales, ahora con requisitos mucho más estrictos. Los problemas de marzo reaparecen en forma más refinada: líneas dobles, bordes confundidos con línea central, discontinuidades y geometría deformada.

La diferencia es que ahora existe suficiente experiencia para describir exactamente qué se necesita: una única línea central continua, cerrada y utilizable.

## 17 de agosto — El fantasma y las iteraciones de UI
La interfaz del fantasma/repetición bajo el minimapa consume muchas más iteraciones de las esperadas. Finalmente se define como un añadido compacto al minimapa, con texto en dos líneas y botón inmediatamente debajo.

Lección documental: cambios visualmente diminutos pueden requerir gran cantidad de iteración cuando deben funcionar de verdad en un móvil.

---

# ACTO V — BASE 1.0

Tras numerosas iteraciones se aprueba y congela una física común denominada **BASE 1.0**. El coche patrón es **VELOCE Flash**.

Commit base:
`433651cf043c9f2312fdc8cd264948c9645608a7` — `Blend chassis load transitions across brake and throttle`.

Flash registra inicialmente 41.751 en Karting Tenerife. La estrategia cambia: dejar de perseguir una física global perfecta y construir personalidad mediante perfiles/overrides por coche.

Regla central: **mejor coche no significa coche más fácil**.

Las cinco marcas recuperan la intención que ya estaba visible en enero:
- HÉLIX — escuela/accesibilidad;
- CROWN — equilibrio/refinamiento;
- AVENIR — precisión/técnica;
- VELOCE — velocidad/exigencia;
- FORGE — masa/fuerza/tolerancia fuera del asfalto.

---

# ACTO VI — HOMOLOGAR 15 COCHES

## Protocolo
Karting Tenerife · contrarreloj · cinco vueltas · completamente stock · telemetría + sensaciones.

### HÉLIX
**Spark — 50.613 / 52 km/h.** «Facilísimo y monótono. Enseguida llegas a la velocidad punta.» Después se descubre que llevaba Frenos T4: carácter útil, crono no estrictamente stock.

**Comet — 47.737 / 56.** «Sumamente divertido de conducir.»

**Pulse — 45.905 / 59.** Muy rápido, muy fácil y con salida de curva excepcional; queda bajo vigilancia porque quizá sea demasiado fácil para el superior de HÉLIX.

### CROWN
**Axis — ~46.034.** Más lento que Pulse pero mucho más fácil. Solo se corrige tamaño visual (`visualScale: 0.92`). Commit `efc5b9e917f24d3d93687ce47e2009c9c58c9172`.

**Vector — 43.877 / 62.** «Sensación fantástica. El coche me permite progresar y arañar más décimas a cada vuelta.»

**Equinox — 41.458 / 65.** Potente y rápido con sensación permanente de peligro.

## El bug de Factory se cruza con la homologación
Gripline aparece demasiado rápido y se descubre que llevaba `Neumático Street T1` y `Transmisión Prototype T4`. También Spark llevaba Frenos T4.

El intento de añadir desequipado toca primero el método equivocado. Finalmente se identifica `_familyDock()` y se activa un wrapper específico.

Commit: `e6b432653a0019d4e541b2d36e176414e1b50b77` — `Activate factory unequip wrapper`.

Al desequipar Gripline las piezas desaparecen. Se corrige y se añade reparación puntual:
`fe2a036c45487ee5d939f6564113681c5ce3f7ea` — `Return factory parts to inventory when unequipping`.

Se descubre después que T4 finales pueden existir y quedar ocultas visualmente por el filtro de recetas. Conclusión: la parte derecha de Fabricación necesita **rediseño UX completo**, no más parches.

### AVENIR
**Gripline — 44.599 / 59.** «Mucho control y bastante velocidad.»

**Apex — 42.366 / 62.** «Muy nervioso al principio pero tras alguna vuelta lo controlé rápidamente.»

**Torque — 41.008 / 65.** «Sublime. Se come los pianos como un poseso. Como si fuera por raíles.»

### VELOCE
**Flash — 41.493 / 68.** Repetido para medir aprendizaje: frente al viejo 41.751, el piloto solo había ganado unas décimas. Trasera muy viva, obliga a frenar.

**Surge — 39.865 / 72.** «Si no orientas bien el coche tras la curva antes de abrir el gas te vas fuera.»

**Photon — 38.849 / 80.** «Potro indomable.» Aceleración «de otro planeta». Solo una vuelta realmente dominada; revisar si la dificultad cruza el límite divertido.

### FORGE
**Hammer — 52.043 / 54.** La hierba no penaliza, pero cuesta muchísimo reorientarlo incluso a poca velocidad.

**Anvil — 52.241 / 54.** Las segundas curvas de chicanes obligan casi a parar; ayuda recuperar gas en pequeños impulsos.

**Colossus — 56.607 / 53.** «Debería sentirse más pesado pero el morro tiembla muchísimo.» El pivote parece demasiado centrado y la trasera baila; paradójicamente resulta más satisfactorio que Hammer/Anvil porque se aprende.

Conclusión FORGE: la dificultad debe proceder de masa, batalla e inercia, no de un pivote/trasera extraño. Mantener la gran tolerancia fuera de asfalto.

---

# ACTO VII — 20 DE AGOSTO DE 2026: PRIMERA FOTO COMPLETA

Se completa la primera homologación de los 15 coches stock y se documenta la tabla maestra en `docs/CHATS.md`.

Commit:
`db6e4ef2e44cf81fe1b2d6ef0f2c2a4f3dce6ce2` — `Document full stock car homologation`.

Quedan tres frentes grandes:
1. **FORGE 1.1** — inspeccionar parámetros reales antes de tocar nada; BASE 1.0 permanece congelada.
2. **Factory UX** — rediseño profundo horizontal para iPhone.
3. **Crafting y máximo potencial** — auditar Motor, Transmisión, Neumáticos, Frenos y Suspensión T1→T4 y decidir cuánto puede crecer cada coche sin perder personalidad.

Principio:
- Gripline maxeado debe seguir siendo Gripline.
- Photon maxeado debe seguir siendo terroríficamente rápido y exigente.
- Colossus maxeado debe ser una apisonadora eficaz en su terreno, no un deportivo gigante.

---

# MATERIAL DOCUMENTAL PRIORITARIO

Para un posible documental/Shipaton, conservar especialmente:
- grabación del 21/01: TDR2 sobre rejilla verde de debug;
- fichas completas de los 15 coches de finales de enero;
- evolución de logos/emblemas y packs del 1–3 febrero;
- transición al UI espacial y Factory de mediados de febrero;
- secuencias del editor azul dibujando trazados reales;
- imágenes aéreas y reconstrucción de Karting Tenerife de marzo;
- grabación del 10/03 mostrando editor + carrera + herramientas reales;
- nacimiento y evolución de TRACK STUDIO;
- errores de consola intercalados con nuevas capacidades;
- comparativas visuales enero → marzo → agosto;
- telemetría y frases de homologación de agosto.

La historia más fuerte no es “hicimos un juego de carreras”. Es: **el juego fue cambiando de forma porque cada intento revelaba cuál debía ser el siguiente problema a resolver**.
