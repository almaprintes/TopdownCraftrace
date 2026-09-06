# Top Down RACE / TopdownCraftrace

Estado real del proyecto a **17 de agosto de 2026**.

Este README se mantiene como documento de seguridad y continuidad: debe reflejar el estado funcional real del juego, las decisiones ya tomadas, los sistemas implantados, los problemas conocidos y los siguientes pasos. No debe describir funciones como terminadas si todavía están pendientes de probar o pulir.

# 🚢 SHIPATON 2026 — OBJETIVO OFICIAL DE LANZAMIENTO

> **Prioridad del proyecto desde el 17 de agosto de 2026:** convertir Top Down RACE en una versión 1.0 comercial, publicarla en una tienda móvil válida y presentar el juego a **RevenueCat Shipaton 2026**.
>
> Toda instancia, agente o colaborador que trabaje sobre este repositorio debe conocer este objetivo y evitar cambios que pongan en riesgo el lanzamiento.

## Fuente de verdad y enlaces oficiales

- Sitio oficial: https://www.shipaton.com/
- Reglas / concurso: https://revenuecat-shipaton-2026.devpost.com/
- Recursos RevenueCat: https://www.shipaton.com/resources

Si existe cualquier contradicción entre este README y unas reglas oficiales posteriores, **mandan las reglas oficiales vigentes** y este documento deberá actualizarse.

## Ventana oficial del concurso

- Inicio de publicaciones elegibles: **1 de agosto de 2026**.
- Cierre oficial: **30 de septiembre de 2026 a las 23:45, hora del Pacífico**.
- La primera versión pública en una tienda elegible debe publicarse dentro de esa ventana.
- Haber desarrollado el juego antes del 1 de agosto **no lo invalida**; lo importante es que no se hubiera lanzado públicamente antes en una tienda elegible.
- Tiendas/plataformas válidas indicadas por Shipaton: **App Store, Google Play y Samsung Galaxy Store** para apps iOS/iPadOS/macOS/Android según corresponda.
- La aplicación debe poder ser evaluada públicamente; nuestra build comercial debe estar disponible también para los jueces/mercado requerido por el concurso.

### Deadline interno de Top Down RACE

**NO usar el 30 de septiembre como fecha objetivo de publicación.**

Nuestro objetivo es:

- **10 de septiembre:** build de tienda lista.
- **15 de septiembre como máximo:** Top Down RACE 1.0 publicado o enviado con margen suficiente para revisión.
- **29 de septiembre:** candidatura Shipaton completamente enviada.
- **30 de septiembre:** solo colchón de emergencia.

## Vía de cumplimiento RevenueCat elegida

Para evitar cualquier ambigüedad de elegibilidad, Top Down RACE debe integrar:

**RevenueCat SDK + al menos una compra real dentro de la app (IAP) gestionada mediante RevenueCat.**

No considerar el requisito de Shipaton cumplido hasta que:

1. RevenueCat esté integrado en la build nativa.
2. Exista al menos un producto real configurado en la tienda.
3. La compra pueda realizarse/restaurarse correctamente en pruebas.
4. RevenueCat registre correctamente el entitlement/compra.
5. El flujo esté probado en dispositivo real.

AdMob puede seguir formando parte de la monetización del juego, pero **AdMob por sí solo no satisface nuestro camino de cumplimiento Shipaton**.

## Monetización objetivo

El diseño debe ser compatible con un juego gratuito y evitar pay-to-win agresivo.

Arquitectura prevista:

- juego base gratuito;
- anuncios recompensados para obtener recursos/monedas o acelerar progresión de forma opcional;
- compra mediante RevenueCat;
- posibilidad de producto tipo `Eliminar anuncios` / versión PRO;
- posibles packs de moneda o contenido, solo si quedan bien integrados y no comprometen el calendario;
- restauración de compras obligatoria donde corresponda;
- consentimiento, privacidad y reglamentos europeos terminados antes del lanzamiento.

### Catvertising Award

**No asumir que Top Down RACE compite en Catvertising únicamente por usar AdMob.**

Esta categoría está específicamente orientada al uso creativo de **RevenueCat Ads**. Solo se añadirá como categoría objetivo si RevenueCat Ads se integra de verdad y tiene sentido para el producto. No cambiar la arquitectura estable únicamente por perseguir esta categoría sin una decisión explícita.

## Categorías Shipaton objetivo

### 1. 🏁 Best Game Award — PRIORIDAD PRINCIPAL

Top Down RACE debe presentarse principalmente como juego móvil de carreras.

Áreas a maximizar:

- diversión inmediata al conducir;
- controles sólidos en móvil;
- personalidad/diferenciación;
- progresión y rejugabilidad;
- circuitos variados;
- dirección artística coherente;
- sonido, feedback y sensación de velocidad;
- monetización apropiada para el género;
- estabilidad y pulido general.

### 2. 🎨 RevenueCat Design Award — OBJETIVO SECUNDARIO

El acabado visual cuenta. Dar especial importancia a:

- selector de circuitos;
- previews de pista;
- HUD;
- garaje;
- Factory;
- estadísticas y resultados;
- jerarquía visual;
- animaciones y transiciones;
- consistencia gráfica en móvil horizontal;
- legibilidad en dispositivo real.

### 3. 💰 HAMM Award — OBJETIVO SECUNDARIO

Debe existir una estrategia de monetización coherente, no anuncios/compras colocados al azar.

El loop deseado es:

`CORRER → GANAR RECURSOS → MEJORAR/FUSIONAR → PROGRESAR → CORRER MEJOR`

La monetización debe complementar este loop sin romperlo.

### 4. 📣 #BuildInPublic Award — OBJETIVO SECUNDARIO

Documentar públicamente decisiones y evolución reales del proyecto cuando sea conveniente:

- problemas de físicas y cómo se solucionaron;
- construcción/importación de circuitos;
- evolución visual;
- IA de rivales;
- sistemas de drop/crafting;
- diseño de monetización;
- errores encontrados en pruebas reales;
- feedback recibido y cambios derivados de ese feedback.

No fabricar una historia artificial: usar el desarrollo real como material.

## Entregables obligatorios de la candidatura

Antes de considerar Shipaton terminado, comprobar uno por uno:

- [ ] Descripción textual clara de características y funcionamiento.
- [ ] Demo pública en **YouTube o Vimeo**.
- [ ] Vídeo con el juego funcionando en el dispositivo/plataforma para el que se creó.
- [ ] **Máximo 2 minutos de metraje esencial**; los jueces no están obligados a ver más.
- [ ] No usar música, marcas o material de terceros sin los derechos necesarios.
- [ ] URL de la app completamente publicada en una tienda válida.
- [ ] Icono de aplicación **1024 × 1024 px**.
- [ ] Al menos una captura **1179 × 2556 px**, sin marco de dispositivo, conforme al requisito de Shipaton.
- [ ] Acceso para jueces a las funciones premium mediante prueba gratuita o código promocional cuando proceda.
- [ ] RevenueCat integrado y compra real comprobada.
- [ ] Bundle/package ID definitivo y consistente entre build, store y RevenueCat.
- [ ] Información de candidatura y material principal preparados también en inglés para una evaluación internacional clara.

## Estrategia del vídeo de 2 minutos

El vídeo no será una grabación improvisada. Debe vender Top Down RACE como producto terminado.

Orden recomendado:

1. **0–10 s:** identidad del juego y gancho inmediato.
2. **10–50 s:** conducción real y sensación de juego.
3. **50–80 s:** circuitos/modos/progresión.
4. **80–105 s:** garaje, crafting, estadísticas y economía.
5. **105–120 s:** monetización/RevenueCat + cierre memorable.

El vídeo debe mostrar gameplay real en dispositivo. El jurado debe comprender el juego aunque no lo descargue inmediatamente.

## Hitos internos Shipaton

### 17–23 agosto — GAMEPLAY

Objetivo: congelar y pulir la mecánica fundamental.

- conducción;
- controles;
- físicas;
- colisiones;
- vueltas/checkpoints;
- cronometraje;
- Supervivencia/CPU;
- estabilidad.

**23 agosto: gameplay base cerrado.**

### 24–30 agosto — PRODUCTO / UI

- selector de circuitos;
- previews;
- progresión;
- resultados;
- récords;
- estadísticas;
- garaje/Factory;
- economía básica;
- tutorial/ayuda;
- sonido y feedback;
- ajustes;
- eliminación de debug visual.

**30 agosto: experiencia de producto cerrada.**

### 31 agosto–6 septiembre — MONETIZACIÓN

- RevenueCat;
- producto IAP real;
- compra/restauración;
- AdMob/rewarded;
- economía final;
- consentimiento europeo/RGPD;
- privacidad;
- QA de monetización.

**6 septiembre: monetización cerrada.**

### 7–10 septiembre — STORE BUILD

- build nativa;
- icono;
- splash;
- orientación;
- permisos;
- package/bundle ID;
- versionado;
- pruebas en dispositivo real;
- crash testing;
- assets de store.

**10 septiembre: build candidata a tienda.**

### 10–15 septiembre — PUBLICACIÓN 1.0

Objetivo máximo: **Top Down RACE 1.0 publicado/en revisión con margen real de aprobación**.

No introducir features grandes durante esta fase.

### 15–25 septiembre — FEEDBACK Y CRECIMIENTO

- corregir bugs reales;
- sacar updates pequeños y seguros;
- recopilar feedback;
- observar retención y comportamiento;
- documentar #BuildInPublic;
- mejorar onboarding/pulido si los datos lo justifican.

### 25–28 septiembre — PITCH FINAL

- vídeo de ≤2 min;
- capturas definitivas;
- icono definitivo;
- descripción;
- texto de categorías;
- datos reales de lanzamiento;
- revisión de requisitos.

### 29 septiembre — SUBMIT

**Candidatura enviada y verificada.**

### 30 septiembre — EMERGENCIA

No reservar trabajo normal para este día.

## Regla de alcance hasta Shipaton

Hasta haber enviado la candidatura:

> **PRIMERO TERMINAR Y PULIR. DESPUÉS AMPLIAR.**

Una nueva idea solo entra en la 1.0 si cumple al menos una de estas condiciones:

- arregla un bug;
- mejora claramente el gameplay principal;
- es necesaria para publicar;
- es necesaria para cumplir Shipaton;
- mejora sustancialmente una categoría objetivo sin poner en peligro el calendario.

Todo lo demás se mueve a **v1.1 / post-Shipaton**.

Evitar especialmente:

- reescrituras completas de sistemas que ya funcionan;
- cambios simultáneos de física + UI + economía;
- añadir modos grandes nuevos;
- experimentar en `main` con cambios destructivos;
- romper persistencia/localStorage;
- dejar debug/overlays internos visibles;
- introducir assets o dependencias con derechos dudosos;
- esperar al último día para Store Review, RevenueCat o la candidatura.

## Estado Shipaton a 17 de agosto de 2026

- [x] Proyecto seleccionado: **Top Down RACE**.
- [x] Repositorio identificado: `almaprintes/TopdownCraftrace`.
- [x] Categoría principal decidida: **Best Game Award**.
- [x] Categorías secundarias previstas: **RevenueCat Design Award, HAMM y #BuildInPublic**.
- [x] Hitos internos definidos.
- [ ] Registro/candidatura final completada en Devpost.
- [ ] RevenueCat integrado.
- [ ] IAP real configurado y probado.
- [ ] AdMob/rewarded validado en build comercial.
- [ ] Consentimiento europeo/RGPD terminado.
- [ ] Build nativa iOS/Android lista.
- [ ] Store listing preparada.
- [ ] 1.0 publicada.
- [ ] Vídeo final de ≤2 minutos.
- [ ] Capturas/icono definitivos.
- [ ] Candidatura enviada.

## Stack y ejecución

- **Vite 6**
- **Phaser 3.90**
- JavaScript ES Modules
- PWA preparada para GitHub Pages
- Service Worker para funcionamiento offline tras la primera carga
- Rama estable actual: `main`

Requisitos y comandos:

```bash
npm i
npm run dev
npm run build
npm run preview
```

El `prebuild` ejecuta `npm run gen:icons` antes del build.

## Dirección actual del juego

Top Down RACE está evolucionando desde un juego de vueltas contrarreloj hacia un juego móvil de carreras con progresión persistente, garaje, crafting/fusión de piezas, distintos coches y superficies, circuitos propios, modos de juego diferenciados y economía basada en materiales obtenidos al correr.

El objetivo actual no es solo mejorar tiempos: **correr alimenta el garaje**. Las vueltas válidas generan materiales que se usan en el sistema de piezas y progresión.

## Modos de juego

Actualmente existen tres modos principales accesibles desde la pantalla principal mediante un selector modal tras pulsar **ARRANCAR MOTOR**:

### Contrarreloj

- El jugador compite contra sus propios tiempos.
- Registra mejor vuelta del coche y récord del circuito.
- Las vueltas válidas generan botín.

### Fantasma

- Carga un fantasma basado en un récord registrado.
- Permite competir contra ese tiempo y visualizar repetición.
- Las vueltas válidas generan botín.
- **Problema visual conocido:** el rótulo `FANTASMA · RÉCORD CARGADO` y el botón `VER REPETICIÓN` ocupan actualmente la zona central superior y pueden tapar el cronómetro/HUD. Pendiente recolocar o compactar este bloque.

### Supervivencia

Modo implementado con **6 coches en total**.

Reglas actuales:

- Sale el jugador más 5 CPU.
- La parrilla usa disposición escalonada tipo F1 ocupando el ancho de pista.
- Los rivales arrancan tras el semáforo.
- Los CPU tienen evitación de colisiones y ya no deben atravesarse unos a otros como fantasmas.
- La eliminación se produce al final de cada ronda.
- El último queda eliminado **cuando el penúltimo coche todavía activo cruza la línea de meta real**.
- La línea de meta real manda; la posición de parrilla no define el paso por meta.
- La carrera termina cuando solo queda un coche.
- Ganar una supervivencia completa implica 5 rondas / 5 eliminaciones.

Se corrigió el informe de sesión para que las estadísticas de Supervivencia usen exclusivamente las vueltas reales del jugador. Una victoria completa muestra ahora un máximo de **5 vueltas**, no registros internos de CPU ni tiempos contaminados de otros modos.

Los CPU incluyen variación de ritmo y trazada para evitar que repitan exactamente el mismo tiempo y trayectoria vuelta tras vuelta. Sigue siendo un área abierta a pulido fino de conducción, errores, salidas de pista y comportamiento competitivo.

## Física, superficies y conducción

El sistema de superficies está separado del coche. La pista define las condiciones físicas y el coche define el hardware que puede aprovecharlas.

Superficies actuales:

- `ASPHALT`
- `DIRT`
- `GRASS`

Se corrigieron zonas del circuito Karting Canarias/Tenerife que se detectaban erróneamente como césped pese a ser asfalto, porque provocaban caídas de velocidad falsas.

Los coches especializados en asfalto, tierra o uso mixto reaccionan de forma distinta a las superficies mediante parámetros de neumático, suspensión, altura, tracción y estabilidad.

## Circuitos

El sistema de circuitos usa trazados JSON y genera geometría desde líneas centrales.

El registro de pistas:

- genera línea de meta;
- genera checkpoints;
- mantiene `raceCenterline`;
- soporta dirección de carrera;
- calcula ancho y geometría de superficie;
- permite circuitos importados.

### Circuito con penalización antiatajo +2 s

El circuito `Imported Track 1773617484759` / `track01` tiene una penalización especial de **+2,000 s** en el interior de una horquilla central justo antes del segundo checkpoint.

Estado actual:

- La zona fue recolocada manualmente a partir de una captura marcada por el usuario.
- La penalización se aplica una sola vez por vuelta.
- Ya no debe activarse simplemente por aproximarse sobre el asfalto.
- Tras el último ajuste, la detección exige estar claramente fuera del ancho legal de pista dentro de la zona marcada.
- **Última prueba del usuario: comportamiento correcto.**

Switch reversible de prueba:

```js
localStorage.setItem('tdr2:track01AntiCutPenalty','0') // OFF
localStorage.setItem('tdr2:track01AntiCutPenalty','1') // ON
```

## Sistema de botín por vueltas

El sistema actual de dropping está implantado en `garageStore.js` y funciona por sesión de carrera.

Materiales comunes dropeables:

- Chatarra (`scrap`)
- Aleación (`alloy`)
- Goma (`rubber`)
- Compuesto (`compound`)
- Disco (`disc`)
- Muelle (`spring`)
- Engranaje (`gear`)

Material especial:

- ECU (`ecu`)

### Recompensa base

Cada vuelta válida concede **2 materiales comunes garantizados**.

### Afinidad por circuito

Cada circuito favorece 3 materiales comunes. Los materiales afines tienen el doble de peso en el sorteo respecto a los demás.

### Bonus por rendimiento

- Récord del circuito: material adicional + ECU garantizada según la lógica actual.
- Mejor vuelta personal con el coche: material adicional y probabilidad ECU reforzada.
- Vuelta dentro del 110 % del mejor tiempo del coche: posibilidad de una pieza común extra.

### ECU dinámica

La probabilidad base parte del **8 %** y aumenta **+2 puntos porcentuales por vuelta sin ECU**, hasta un máximo del **24 %**. Cuando cae una ECU, el contador vuelve a la base.

### Cofre cada 5 vueltas

Cada quinta vuelta de una sesión concede un cofre con **2 materiales comunes extra**.

El premio queda calculado y guardado en el inventario al completar la vuelta; la animación de apertura es solo presentación. Esto evita perder la recompensa si la app se cierra durante el reveal.

Se ha implementado apertura interactiva:

- aparece el cofre;
- el jugador toca para abrirlo;
- se revelan las 2 piezas reales que ya habían sido concedidas;
- después aparece `CONTINUAR`.

En Contrarreloj y Fantasma la apertura pausa brevemente la acción y después se continúa la sesión. En Supervivencia, si coincide con el final, se integra antes del resultado final.

## Resumen de botín de sesión

Existe un acumulador `LOOT_SESSION` con:

- circuito actual;
- vueltas premiadas;
- cantidades totales por material;
- número de ECU;
- cofres obtenidos;
- vueltas con bonus.

En **Supervivencia** ya aparece un panel grande `BOTÍN DE LA CARRERA` en la pantalla final con el total de piezas y desglose por material.

Decisión de diseño acordada para **Contrarreloj y Fantasma**:

- cada vuelta sigue mostrando un aviso rápido de la recompensa;
- al abandonar/finalizar la sesión debe aparecer un resumen completo del botín acumulado antes de volver al menú;
- si no hubo ninguna vuelta válida, no debe mostrarse un resumen vacío.

**Estado:** esta unificación del resumen final para Contrarreloj/Fantasma está definida como comportamiento objetivo y debe verificarse/terminarse si todavía no está completamente conectada al flujo real de salida.

## Tutorial del sistema de dropping

Ruta de assets:

```text
assets/
└── tutorials/
    └── dropping/
        ├── dropping_01_717x330.png
        ├── dropping_02_717x330.png
        ├── dropping_03_717x330.png
        ├── dropping_04_717x330.png
        └── dropping_05_717x330.png
```

Cada imagen mide exactamente **717 × 330 px**.

El tutorial está integrado en:

`Configuración → Ayuda → Sistema de drop`

Características del visor:

- modal horizontal;
- cinco diapositivas;
- usa los botones visuales dibujados dentro de las propias imágenes;
- sobre esos botones existen zonas táctiles invisibles;
- swipe lateral disponible;
- cierre mediante `×`;
- última diapositiva usa `ENTENDIDO`.

Se corrigió el despliegue para que GitHub Pages copie estas imágenes al `dist`, ya que Vite no copiaba automáticamente la carpeta original. También se añadieron al Service Worker para disponibilidad offline.

## Contenido actual del tutorial de dropping

La estructura conceptual final acordada es:

1. Cada vuelta = materiales; presentación de los 8 tipos posibles.
2. Cada circuito tiene afinidad; 3 materiales favorecidos.
3. Corre rápido, gana más; bonus de rendimiento.
4. La ECU se hace más probable; 8 % → 24 % y reset al obtenerla.
5. Cada 5 vueltas = cofre de sesión con 2 materiales extra.

La versión anterior tenía duplicadas las diapositivas 3 y 4; fue reemplazada.

## Pantalla principal

La pantalla principal ha pasado por varias iteraciones de composición.

Estado actual de diseño:

- panel del coche en la parte superior;
- panel de evento general a la izquierda;
- panel del circuito a la derecha;
- coche seleccionado visible en el centro;
- botón grande `ARRANCAR MOTOR`;
- los modos ya no deben ocupar permanentemente el centro: se muestran mediante modal después de pulsar arrancar;
- navegación inferior a Garaje / Factory / Tracks;
- panel de evento general independiente del coche y circuito seleccionados.

Pendiente seguir puliendo proporciones, legibilidad y equilibrio visual cuando aparezcan problemas concretos en dispositivos reales.

## Garaje, piezas y progresión

El estado del garaje se guarda en LocalStorage bajo:

```text
tdr2:garageFusion:v1
```

Incluye:

- inventario;
- piezas equipadas;
- equipamiento por coche;
- descubrimientos;
- monedas;
- último premio;
- contador de anuncios recompensados;
- pity de ECU.

Inventario inicial actual definido en código:

```text
scrap: 8
alloy: 5
rubber: 4
compound: 4
disc: 4
spring: 3
gear: 3
ecu: 2
```

Existen sistemas de crafting/fusión, recetas, evolución de piezas, equipamiento por coche y modificación de estadísticas.

## HUD y datos de carrera

El HUD muestra actualmente:

- vuelta;
- delta;
- sectores;
- `LAST`;
- mejor vuelta del coche;
- récord del circuito;
- marcha;
- velocidad;
- superficie;
- minimapa;
- controles táctiles;
- pausa.

Los rivales CPU de Supervivencia ya deben aparecer en el minimapa.

### Problemas visuales/diagnósticos conocidos

- En modo Fantasma, el bloque `FANTASMA · RÉCORD CARGADO` + `VER REPETICIÓN` puede tapar información del cronómetro. **Pendiente prioritario.**
- En una captura reciente apareció texto de diagnóstico `MISSING ROUND... initialize key...` en pantalla. Debe vigilarse y eliminarse cualquier debug visible antes de una build comercial.
- Existen todavía utilidades/overlays DEV en código histórico; antes de lanzamiento debe hacerse una pasada específica para ocultar o eliminar herramientas de depuración.

## Repeticiones / fantasma

El proyecto incluye sistema de repetición/fantasma y botón `VER REPETICIÓN` cuando hay registro cargado.

La prioridad visual inmediata es recolocar/compactar su encabezado y botón para no competir con el cronómetro ni el HUD de carrera.

## PWA y GitHub Pages

El proyecto se despliega desde `main` mediante GitHub Actions.

Hay que recordar que los assets que no estén en `public` o importados por Vite pueden necesitar copia explícita al `dist`. Esto ya ocurrió con las imágenes del tutorial de dropping.

El Service Worker se ha ido versionando para forzar actualización de caché cuando se añaden assets o cambios relevantes.

## Monetización prevista

El proyecto está orientado a publicación móvil iOS/Android y monetización con AdMob, especialmente anuncios recompensados asociados a progresión/economía.

La integración comercial completa no debe considerarse cerrada todavía. Antes del lanzamiento siguen pendientes validación de consentimiento europeo, flujo real de anuncios, builds nativas y QA específico de stores.

## Estado QA actual

Funciona y ha sido probado directamente en iPhone durante iteraciones reales, pero el proyecto sigue en desarrollo activo.

Áreas que ya han recibido correcciones importantes:

- salida de CPU en Supervivencia;
- posición de parrilla;
- colisiones/evitación CPU;
- eliminación por línea de meta;
- resultados contaminados con demasiadas vueltas;
- detección de superficie incorrecta;
- drops y pity ECU;
- cofres cada 5 vueltas;
- resumen de botín de Supervivencia;
- tutorial de dropping y carga en GitHub Pages;
- penalización antiatajo de +2 s.

## Pendientes inmediatos

1. Recolocar/compactar `FANTASMA · RÉCORD CARGADO` y `VER REPETICIÓN` para liberar el cronómetro.
2. Verificar y terminar el resumen final de botín al salir de Contrarreloj/Fantasma.
3. Probar exhaustivamente la apertura del cofre en vuelta 5/10/15 y en final de Supervivencia.
4. Seguir afinando IA CPU: ritmo, errores naturales, trazada, adelantamientos y evitación sin pérdida excesiva de velocidad.
5. Revisar todos los circuitos para falsas detecciones de césped/asfalto y penalizaciones involuntarias.
6. Eliminar mensajes y overlays DEV visibles antes de una build comercial.
7. QA de persistencia: inventario, pity ECU, mejores vueltas, récords, sesiones y reinicios de PWA.
8. Continuar el pulido visual de pantalla principal, resultados, garaje, Factory y Tracks.
9. Preparar integración/publicación móvil y monetización real.

## Regla de seguridad para futuros cambios

Antes de tocar una mecánica que ya funciona:

- identificar el archivo exacto responsable;
- evitar reescribir sistemas completos si basta un ajuste localizado;
- no cambiar simultáneamente física, UI y economía salvo necesidad real;
- preservar los datos persistentes existentes;
- probar primero en el modo/circuito afectado;
- documentar aquí cualquier cambio estructural importante.

Especialmente en Supervivencia y timing, no volver a sustituir la línea de meta real por aproximaciones de progreso o posición de parrilla.

## Último punto confirmado por el usuario

La penalización antiatajo de +2 s del circuito `track01` quedó finalmente ajustada de forma que **ya no salta al acercarse por el asfalto y sí funciona en el interior ilegal indicado**.

El siguiente problema visual señalado es el solapamiento del encabezado de Fantasma y el botón de repetición sobre el cronómetro.