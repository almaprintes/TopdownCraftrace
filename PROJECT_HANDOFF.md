# TopdownCraftrace — PROJECT HANDOFF

> Documento vivo para continuar el proyecto en un chat nuevo sin perder decisiones, soluciones técnicas ni el estado de trabajo.
> Actualizar este archivo cuando haya un cambio importante de arquitectura, render, pista, rendimiento, assets, deploy o PWA.

## 1. Repositorio y flujo actual

- Repositorio: `almaprintes/TopdownCraftrace`
- Rama de trabajo actual: `main`
- Existe una rama/checkpoint de seguridad de la pista estable: `checkpoint-track-stable-2026-08-08`. No usarla para trabajo normal; conservarla como salvavidas.
- GitHub es la fuente oficial del código y el destino final previsto.
- Vercel se está usando TEMPORALMENTE como banco de pruebas porque GitHub Pages estaba tardando mucho o dando problemas con los deploys.
- Regla: no convertir decisiones temporales de Vercel en arquitectura permanente si no hace falta.

## 2. Objetivo visual

Objetivo actual: **arcade premium con base semi-realista**, vista cenital/top-down.

La pista debe sentirse como un circuito real estilizado, no como una PWA dibujada con primitivas CSS/Canvas. Dirección visual aceptada:

- asfalto mate, gris oscuro cálido, sin look metalizado;
- desgaste/suciedad longitudinal siguiendo el sentido de marcha;
- borde asfalto → pequeña franja de tierra/suciedad → césped;
- césped orgánico, brizna pequeña, mezcla de verdes y zonas secas/desgastadas;
- pianos rojo/blanco integrados en curvas;
- entorno con assets cenitales semirrealistas con estética de animación;
- HUD, pedales, minimapa, cronos y paneles actuales se consideran una base válida y no deben romperse durante los pases de entorno.

## 3. Pista — lecciones críticas

### 3.1 Retorcimiento de curvas

Se sufrió un problema grave en curvas pronunciadas: los bordes/líneas parecían retorcerse o invertir su orientación en algunos vértices. Añadir más decoración no lo solucionaba y llegó a producir islas y geometrías absurdas.

La pista estable actual se consiguió después de varias iteraciones de muestreo/geometría. NO volver a enfoques que dependan de handles Bezier mal orientados o de offsets ingenuos por nodo.

La línea de arcén fue una prueba deliberada para revelar visualmente cualquier retorcimiento residual. Finalmente se consiguió una línea de arcén continua que seguía correctamente la pista, con pequeñas aberturas corregidas posteriormente.

**Regla para circuitos futuros:** reutilizar el mismo método de construcción de borde/arcén de la pista estable actual; no reinventarlo circuito por circuito.

### 3.2 Rendimiento

Hubo una versión que comenzaba fluida pero aproximadamente a mitad de vuelta acumulaba tirones hasta volverse impracticable. Después se corrigió y se probaron varias vueltas consecutivas con rendimiento excelente (4 vueltas marcando fast lap y posteriormente 8 vueltas seguidas sin ralentizaciones).

Reglas:

- nada de crear geometría/objetos de entorno cada frame;
- entorno estático debe construirse una vez;
- evitar cantidades enormes de segmentos/Graphics que se acumulen;
- cualquier mejora visual debe probarse durante varias vueltas completas, no solo durante los primeros segundos.

## 4. Pianos / kerbs

Los primeros intentos eran incoherentes. La solución visual mejoró al tratar el piano como un elemento ligado a la curva y no como piezas aisladas.

Decisión de diseño:

- pianos automáticos en el exterior/interior apropiado de curvas según geometría;
- posibilidad futura de override manual por tramo para forzar/quitar;
- el ancho puede variar a lo largo del piano: empieza fino, crece hacia la zona central/ápice y vuelve a estrecharse al terminar;
- deben seguir exactamente la trayectoria local de la pista;
- evitar discontinuidades, dientes, inversiones o piezas atravesadas.

Los pianos actuales fueron aceptados después de una prueba de 8 vueltas sin ralentizaciones. Tratar esa implementación como parte de la base estable.

## 5. Entorno — enfoque descartado

Se intentó crear vegetación, guardarraíles, casetas y otros elementos mediante primitivas/procedural Canvas. Resultado rechazado: aspecto barato/casposo.

También se probó una primera tanda de SVG sencillos colocados proceduralmente. Resultado rechazado porque:

- los assets no tenían suficiente calidad visual;
- los guardarraíles parecían barras tiradas por el césped;
- los elementos aparecían sin lógica espacial;
- la colocación aleatoria/procedural rompía la credibilidad del circuito.

**No volver a ese enfoque.**

## 6. Entorno — enfoque actual

El entorno debe construirse con **assets cenitales reales**, preferiblemente WebP transparentes, con volumen, detalle y sombras controladas.

La colocación NO debe ser aleatoria. Debe existir dirección artística por zonas/escenas:

- guardarraíles siguiendo el borde de pista, paralelos y continuos;
- barreras/protecciones en zonas de riesgo;
- puesto de comisarios + protección + acceso como conjunto;
- grupos naturales de vegetación;
- carteles orientados hacia la pista;
- escapatorias y elementos técnicos colocados con intención;
- zonas de exclusión respecto a asfalto y entre objetos.

Pensar en **composiciones reconocibles**, no en dispersar objetos para rellenar huecos.

### 6.1 Assets actuales de prueba

Se generó una lámina transparente de vegetación y se extrajeron assets WebP. Para la primera prueba controlada se subieron a:

`public/assets/environment/`

Archivos:

- `tree_deciduous_01.webp`
- `tree_conifer_01.webp`
- `shrub_round_01.webp`
- `shrub_flowers_01.webp`

La intención de la prueba es SOLO 2 árboles + 2 arbustos, colocados deliberadamente y lejos de pista. Antes de ampliar la biblioteca hay que validar escala, limpieza del alfa, sombra residual y coherencia con el césped real.

Nota: una extracción anterior de ~70 elementos desde una infografía JPEG fue descartada porque los recortes tenían halos, fondo crema, sombras y contaminación entre objetos. No reutilizar esos recortes.

## 7. RaceEnvironmentLayer

`src/game/scenes/RaceEnvironmentLayer.js` es el punto de integración del entorno. Se dejó aislado para poder trabajar el decorado sin tocar el corazón probado del circuito.

Principio arquitectónico: pista/geometría/pianos/física/HUD deben permanecer aislados de los experimentos de entorno.

## 8. Vercel + GitHub Pages

`vite.config.js` originalmente estaba orientado a GitHub Pages y usaba `/<repo>/` como `base` durante build. Esto hacía que Vercel, que sirve desde `/`, pudiera resolver mal los recursos.

Se modificó para detectar Vercel y usar `base: '/'`, conservando la lógica de GitHub Pages. Commit relevante:

- `781ce28` — soporte de base `/` en Vercel sin abandonar GitHub Pages.

Vercel es solo preview temporal. GitHub Pages debe volver a ser el destino oficial cuando el flujo de deploy esté estable.

## 9. PWA en iPhone

El manifest ya usa:

- `display: "standalone"`
- `orientation: "landscape"`
- `start_url: "."`
- `scope: "."`

En `index.html` se añadieron metadatos Apple para mejorar la instalación desde Safari:

- `apple-mobile-web-app-capable=yes`
- `apple-mobile-web-app-status-bar-style=black-translucent`
- `apple-mobile-web-app-title=TDR2`

Commit relevante:

- `22c9621` — soporte iPhone standalone.

### Flujo de prueba PWA temporal con Vercel

1. Esperar al deploy de Vercel correspondiente al último commit.
2. Abrir la URL de Vercel directamente en Safari del iPhone.
3. Compartir → Añadir a pantalla de inicio.
4. Si ya existía una instalación anterior de esa URL, borrar primero el icono y volver a instalar para evitar que iOS conserve metadata/caché antigua.
5. Esta PWA de Vercel es temporal y puede eliminarse cuando GitHub Pages vuelva a ser el destino de pruebas/final.

La instalación antigua desde GitHub Pages llegó a mostrar una versión vieja con el coche/rectángulo magenta. Sospecha principal: deploy/caché/service worker antiguo, no el manifest actual. Cuando se vuelva a GitHub Pages como publicación principal, revisar despliegue y cachés antes de reinstalar la PWA oficial.

## 10. Commits / hitos que conviene recordar

- `4f76115` — eliminación del entorno placeholder/procedural anterior, dejando limpio el punto de integración.
- `1c6cc34` — primera integración modular de assets cenitales (la dirección visual/colocación de esa tanda fue posteriormente rechazada; conservar solo como referencia histórica).
- `781ce28` — Vercel usa base `/`.
- `22c9621` — metadatos iPhone PWA standalone.

## 11. Reglas de trabajo para el siguiente chat

1. Leer este archivo antes de tocar el proyecto.
2. No romper pista, pianos, física, HUD, minimapa ni cronometraje mientras se trabaja el entorno.
3. Hacer cambios pequeños y comprobables.
4. Probar rendimiento durante varias vueltas completas.
5. No llenar el circuito de assets hasta validar primero una muestra pequeña.
6. No usar decoración procedural barata para sustituir assets finales.
7. No colocar elementos de entorno aleatoriamente: diseñar escenas y zonas coherentes.
8. Mantener GitHub como fuente oficial; Vercel es preview temporal.
9. Actualizar este `PROJECT_HANDOFF.md` después de cada solución técnica importante o cambio de flujo.

## 12. Próximo paso inmediato

Validar en Vercel/PWA la prueba de vegetación con los cuatro WebP ya subidos. Revisar:

- si realmente cargan;
- escala respecto al coche/pista;
- sombra bajo árboles;
- halo de transparencia;
- contraste con césped;
- colocación lógica.

Solo si la prueba convence, ampliar la biblioteca de assets y empezar a construir escenas ambientales coherentes alrededor del circuito.
