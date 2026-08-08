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

Hubo una versión que comenzaba fluida pero aproximadamente a mitad de vuelta acumulaba tirones hasta volverse impracticable. Después se corrigió y se probaron varias vueltas consecutivas con rendimiento excelente.

Hitos confirmados:

- pista/pianos: 8 vueltas seguidas sin ralentizaciones;
- vegetación: prueba posterior con hasta ~28 sprites estáticos reutilizando solo 4 WebP y 5 composiciones alrededor del circuito;
- resultado de esa prueba: **8 vueltas completas con rendimiento absoluto**, sin degradación progresiva ni tirones.

Reglas:

- nada de crear geometría/objetos de entorno cada frame;
- entorno estático debe construirse una vez;
- evitar cantidades enormes de segmentos/Graphics que se acumulen;
- reutilizar texturas siempre que sea posible;
- subir densidad por escalones y validar 6–8 vueltas completas antes de seguir.

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

### 6.1 Assets actuales

Ruta:

`public/assets/environment/`

Archivos base validados:

- `tree_deciduous_01.webp`
- `tree_conifer_01.webp`
- `shrub_round_01.webp`
- `shrub_flowers_01.webp`

Visualmente fueron aprobados: encajan con el estilo del juego y tienen suficiente calidad. La sombra de suelo es visible pero funciona sobre el césped actual.

Nota: una extracción anterior de ~70 elementos desde una infografía JPEG fue descartada porque los recortes tenían halos, fondo crema, sombras y contaminación entre objetos. No reutilizar esos recortes.

### 6.2 Integración actual

`RaceEnvironmentLayer.js` carga los cuatro WebP reales desde `public/assets/environment/` usando `import.meta.env.BASE_URL`.

Después de la prueba inicial con 4 piezas se escaló a una prueba forestal con unas 28 colocaciones máximas en 5 zonas diseñadas alrededor del circuito. Los árboles se solapan hacia el fondo y los arbustos suavizan el borde. No hay colisiones, aleatoriedad ni trabajo por frame.

Commits relevantes:

- `90750a2` — usar WebP subidos y retirar entorno legacy de esta capa.
- `129ea6c` — prueba de 12 elementos.
- `cd20adf` — prueba de bosque más denso (~28 sprites / 5 zonas).

Resultado confirmado por el usuario tras 8 vueltas: rendimiento absoluto. Esto habilita seguir aumentando densidad y empezar a añadir nuevas familias de assets de forma gradual.

## 7. RaceEnvironmentLayer

`src/game/scenes/RaceEnvironmentLayer.js` es el punto de integración del entorno. Se dejó aislado para poder trabajar el decorado sin tocar el corazón probado del circuito.

Principio arquitectónico: pista/geometría/pianos/física/HUD deben permanecer aislados de los experimentos de entorno.

## 8. Cámara / zoom

Se creó una escena temporal `RaceWideCameraPreviewScene.js` para probar más contexto visual sin tocar física ni HUD.

Valores de prueba actuales aproximados:

- zoom min: `0.62`
- zoom max: `1.06`
- referencia de velocidad: `110 km/h`
- zoom inicial: `0.96`

El objetivo es ver más entorno y leer mejor las curvas. La primera prueba suave casi no se notaba, así que se abrió más. No tocar de golpe junto con cambios de física.

## 9. Vercel + GitHub Pages

`vite.config.js` detecta Vercel/Netlify y usa `base: '/'`; GitHub Pages mantiene `/<repo>/`.

Vercel es solo preview temporal. GitHub Pages debe volver a ser el destino oficial cuando el flujo de deploy esté estable.

Commit relevante:

- `781ce28` — soporte de base `/` en Vercel sin abandonar GitHub Pages.

## 10. PWA en iPhone

Metadatos Apple presentes en `index.html`:

- `apple-mobile-web-app-capable=yes`
- `apple-mobile-web-app-status-bar-style=black-translucent`
- `apple-mobile-web-app-title=TDR2`

### 10.1 Service worker

Existe `public/sw.js` y `src/main.js` lo registra. Se cambió a estrategia network-first durante desarrollo para evitar quedarse atrapado en versiones antiguas.

Commit relevante:

- `dc4efb0` — service worker v14 network-first.

### 10.2 Bug específico `/assets/` al instalar desde Vercel

Síntoma observado en iPhone:

1. En Safari, al abrir Compartir, la ficha superior muestra correctamente el dominio raíz `https://topdown-craftrace-two.vercel.app`.
2. Al pulsar **Añadir a pantalla de inicio**, la pantalla final cambia misteriosamente la URL a `https://topdown-craftrace-two.vercel.app/assets/`.
3. La PWA resultante abre en blanco.

Hallazgo en código: el manifest todavía usaba URLs relativas (`./`) en `id`, `start_url`, `scope` e iconos, y `index.html` enlazaba el manifest de forma relativa. Esto permite que iOS resuelva el contexto de instalación de forma no deseada.

Corrección aplicada el 08/08:

- manifest con `id: "/"`;
- `start_url: "/?source=pwa"`;
- `scope: "/"`;
- iconos con rutas absolutas `/icons/...`;
- `index.html` enlaza `/manifest.webmanifest?v=20260808-3`;
- iconos Apple/favicon también absolutos;
- imagen de orientación también absoluta para evitar herencia accidental de rutas.

Commits relevantes:

- `4cd5b72` — manifest absoluto para forzar instalación desde raíz.
- `d3ecc4e` — URLs absolutas del manifest/iconos en `index.html`.

Después de desplegar esos commits en Vercel, probar de nuevo desde una pestaña nueva de Safari. Si la pantalla final sigue inyectando `/assets/`, el siguiente paso será limpiar datos del sitio/PWA en iOS y revisar exactamente qué manifest está sirviendo Vercel en producción antes de tocar más código.

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

1. Esperar a Vercel con `d3ecc4e` o posterior y repetir instalación PWA desde la raíz.
2. Si la URL final deja de añadir `/assets/`, comprobar que la PWA abre correctamente.
3. En paralelo, continuar escalando entorno desde la prueba estable de ~28 sprites hacia un bosque más frondoso, introduciendo nuevas especies/objetos poco a poco y validando rendimiento tras cada escalón.
