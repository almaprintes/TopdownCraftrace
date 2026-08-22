# Hoja de ruta — IA de conducción de Supervivencia

Fecha de decisión: 22/08/2026  
Repositorio: `almaprintes/TopdownCraftrace`  
Rama fuente de verdad: `main`

## Objetivo

Sustituir progresivamente la IA de Supervivencia basada en progreso y desplazamiento lateral por pilotos que:

- analicen la geometría completa del circuito;
- construyan trazadas competitivas continuas dentro de los límites reales;
- anticipen curvas y tráfico;
- controlen dirección, acelerador y freno con restricciones dinámicas;
- conserven decisiones durante un horizonte razonable;
- tengan personalidades coherentes;
- produzcan carreras creíbles, competitivas y legibles en móvil.

El objetivo visual no es que los coches parezcan perfectos, sino que sus decisiones resulten comprensibles: preparar una curva, buscar el vértice, abrir la salida, levantar por tráfico, preparar un adelantamiento y abortarlo cuando deja de ser seguro.

## Diagnóstico del sistema actual

Archivos principales:

- `src/game/scenes/RaceSurvivalModeScene.js`
- `src/game/scenes/RaceSurvivalReliableScene.js`
- `src/game/scenes/RaceSurvivalTrafficScene.js`
- `src/game/scenes/RaceSurvivalPolishScene.js`

El sistema vigente representa cada rival principalmente mediante:

- progreso normalizado sobre una ruta;
- offset lateral;
- ritmo objetivo;
- variaciones y decisiones de tráfico;
- posición calculada directamente sobre la trayectoria.

Aunque se han añadido suavizado, detección de curvas y amortiguación visual, la arquitectura sigue teniendo una limitación fundamental: el bot no conduce realmente el coche. El sistema coloca el coche sobre una trayectoria y después intenta hacer creíble el resultado.

Síntomas observados:

- efecto Scalextric;
- pilotos paralelos en carriles imaginarios;
- seguimiento excesivo del centerline y sus microcurvas;
- correcciones angulares frecuentes;
- frenazos y acelerones reactivos;
- desplazamientos laterales grandes después de horquillas;
- adelantamientos decididos demasiado tarde;
- errores aleatorios percibidos como fallos del juego, no como comportamiento humano.

## Principios aprobados

1. **Espacio continuo, no carriles discretos.**  
   El ancho de pista es una región navegable entre dos límites.

2. **Planificación y control separados.**  
   Una capa decide la trayectoria futura; otra controla el vehículo para seguirla.

3. **Horizonte temporal.**  
   Las decisiones deben evaluar varios metros o segundos por delante.

4. **Compromiso e histéresis.**  
   Una maniobra no se cambia cada fotograma. Solo se abandona por riesgo, bloqueo o una alternativa claramente superior.

5. **Velocidad anticipativa.**  
   Frenado y aceleración dependen de la curvatura futura, el agarre, la distancia disponible y el tráfico.

6. **Humanización coherente.**  
   Las diferencias provienen de personalidad, capacidad, percepción y consistencia. No de saltos aleatorios de posición o velocidad.

7. **La física es la autoridad.**  
   El bot debe producir órdenes equivalentes a volante, gas y freno. No teletransportar el coche a su siguiente punto.

8. **Migración reversible.**  
   Cada fase tendrá un interruptor de compatibilidad y pruebas antes de retirar el sistema anterior.

## Arquitectura objetivo

### 1. Modelo geométrico de pista

Entrada:

- centerline oficial;
- borde izquierdo;
- borde derecho;
- anchura local;
- meta y sentido;
- superficie;
- zonas de seguridad cuando existan.

Salida:

- ruta remuestreada por distancia;
- tangente continua;
- curvatura firmada;
- anchura útil local;
- secuencias de curvas;
- rectas y zonas potenciales de adelantamiento.

La geometría oficial no se modifica. Se genera un modelo derivado exclusivo para planificación.

### 2. Optimizador de trazada global

Primera versión: minimizar una función de coste formada por:

- curvatura;
- cambio de curvatura;
- longitud;
- proximidad a límites;
- riesgo de abandonar la pista.

La variable optimizada será un offset continuo respecto a la referencia geométrica, limitado por los bordes reales. No se impondrá mecánicamente exterior–interior–exterior a cada nodo; ese patrón debe emerger de reducir curvatura y tiempo esperado.

Se generarán:

- una trazada base competitiva;
- una variante conservadora;
- una o dos alternativas utilizables con tráfico.

### 3. Perfil de velocidad

Para cada punto:

- radio/curvatura;
- velocidad segura por agarre;
- capacidad de frenado;
- capacidad de aceleración;
- superficie.

Se aplicará un recorrido hacia atrás para calcular dónde debe comenzar la frenada y uno hacia delante para limitar la aceleración de salida.

El perfil será específico del coche o de una categoría de comportamiento cuando sea necesario.

### 4. Planificador local

Horizonte inicial previsto: 1,5–2,5 segundos.

Generará varias trayectorias candidatas en el espacio continuo de la pista y puntuará:

- progreso/tiempo;
- suavidad;
- respeto de límites;
- riesgo de colisión;
- bloqueo futuro;
- capacidad real para completar la maniobra;
- desviación respecto a la trazada rápida.

La posición actual de un rival no se tratará como obstáculo estático. Se proyectará una trayectoria futura sencilla usando su velocidad, dirección y tendencia lateral.

### 5. Controlador del coche

El planificador entrega puntos futuros y velocidad objetivo.

El controlador produce:

- dirección;
- acelerador;
- freno.

Primera opción práctica:

- seguimiento geométrico tipo Pure Pursuit con lookahead dependiente de velocidad;
- término de corrección transversal inspirado en Stanley;
- límites de velocidad angular y variación de volante;
- controlador longitudinal con aceleración y frenado máximos.

Debe usar el mismo modelo de movimiento o una interfaz equivalente a la del jugador.

### 6. Personalidad

Parámetros persistentes por piloto:

- habilidad;
- agresividad;
- consistencia;
- anticipación;
- tolerancia al riesgo;
- margen a bordes;
- decisión de adelantamiento;
- capacidad de recuperación.

La personalidad cambia costes y márgenes, no introduce teletransportes.

## Migración por fases

### Fase 0 — Instrumentación y comparación

Estado: implementada el 22/08/2026.

Implementación:

- runtime: `src/game/ai/survivalAiRuntime.js`;
- modo persistente solicitado: `localStorage['tdr2:survivalAiMode']`;
- valores admitidos: `legacy` y `planner_v1`;
- mientras `SURVIVAL_AI_PLANNER_READY` sea `false`, pedir `planner_v1` produce fallback seguro a `legacy`;
- overlay DEV: `localStorage['tdr2:survivalAiDebug'] = '1'`;
- telemetría circular de la sesión: `window.__TDR_SURVIVAL_AI__`;
- el overlay y la telemetría no envían información fuera del dispositivo.

La conducción visible continúa en `legacy`. El overlay muestra la referencia derivada y el horizonte actual de cada rival, pero no interviene en el control.

- Añadir bandera de IA: `legacy` / `planner_v1`.
- Registrar por bot:
  - posición;
  - velocidad;
  - dirección;
  - curvatura futura;
  - trayectoria elegida;
  - velocidad objetivo;
  - gas/freno/dirección;
  - cambios de plan;
  - distancia a límites y rivales.
- Crear overlay DEV opcional de trazadas candidatas.
- Mantener producción en `legacy` hasta validar.

Criterio de salida:

- poder comparar una vuelta legacy y planner con el mismo coche/circuito;
- cero cambios funcionales para el jugador.

### Fase 1 — Modelo de pista y trazada global

Estado: implementada en modo observación; acondicionamiento de discontinuidades validado estructuralmente y pendiente de homologación visual prioritaria en tres circuitos.

Implementación:

- `src/game/ai/trackRacingLinePlanner.js`;
- optimizador global reutilizable con límites Frenet y margen de seguridad;
- cálculo automático al cargar el circuito de Supervivencia;
- línea nueva amarilla disponible en overlay DEV;
- métricas incorporadas a `window.__TDR_SURVIVAL_AI__`;
- informe completo: `docs/SURVIVAL_AI_TRACK_HOMOLOGATION_2026-08-22.md`;
- 17/17 circuitos generan un modelo estructural válido;
- la referencia derivada detecta y suaviza concentraciones angulares con desplazamiento limitado por anchura;
- ese desplazamiento se descuenta del corredor lateral para conservar el margen de seguridad;
- la comparación A/B corrigió falsos picos de cierre del primer arnés de validación;
- Sakhir, Shanghai y Santa Cruz quedan como revisión visual prioritaria antes de controlar coches.

Tareas de la fase:

- Construir bordes/anchura local fiables.
- Remuestrear por distancia.
- Calcular tangente y curvatura continuas.
- Optimizar una trayectoria de mínima curvatura.
- Visualizarla en DEV.
- No controlar todavía a los rivales con ella.

Criterio de salida:

- trayectoria siempre dentro de pista;
- sin microzigzags;
- exterior–vértice–exterior visible donde reduce curvatura;
- comportamiento coherente en horquillas, curvas enlazadas y rectas.

### Fase 2 — Perfil de velocidad anticipativo

Estado: implementada estructuralmente en modo observación; pendiente de calibración física y validación visual.

Implementación:

- `src/game/ai/trackSpeedProfilePlanner.js`;
- límite local derivado de curvatura y aceleración lateral;
- pase de frenada hacia atrás;
- pase de aceleración hacia delante;
- continuidad cerrada entre final e inicio de vuelta;
- métricas añadidas al evento `track_model` de telemetría;
- 17/17 circuitos generan perfiles finitos sin violar los límites longitudinales configurados;
- informe: `docs/SURVIVAL_AI_SPEED_PROFILE_VALIDATION_2026-08-22.md`.

Tareas pendientes:

- calibrar parámetros con el coche patrón;
- visualizar frenadas y vértices;
- comparar tiempo teórico con telemetría real;
- mantener el perfil desconectado de los coches hasta Fase 3.

Criterio de salida:

- ninguna frenada principal empieza después del vértice;
- sin alternancia rápida gas/freno;
- velocidad coherente con radio y superficie.

### Fase 3 — Controlador físico de un bot

Estado: implementación experimental disponible mediante `planner_v1`; no homologada.

Implementación:

- `src/game/ai/survivalPhysicalBotController.js`;
- un cuerpo Arcade real sigue la trazada usando dirección, gas y freno continuos;
- no se teletransporta su posición durante la marcha;
- objetivo anticipado dependiente de velocidad;
- el perfil de Fase 2 define la velocidad objetivo;
- sin tráfico, adelantamientos ni colisión con el pelotón;
- los otros cuatro rivales permanecen en `legacy`;
- telemetría de volante, gas, freno, velocidad objetivo y distancia a línea;
- informe: `docs/SURVIVAL_AI_PHYSICAL_BOT_VALIDATION_2026-08-22.md`.

Validación estructural:

- 17/17 circuitos avanzan y permanecen dentro del semiancho nominal tras la primera calibración;
- Jeddah reduce su desviación máxima simulada de 95.6 a 40.1 px;
- Karting Tenerife reduce de 70.6 a 43.1 px;
- Santa Cruz reduce de 61.3 a 42.3 px;
- la calibración usa una regla general de anticipación y reducción de velocidad por error, sin excepciones de circuito;
- sigue pendiente la prueba real en Phaser antes de homologar;
- el modo puede activarse para una sesión mediante `?survivalAi=planner_v1&survivalAiDebug=1`;
- un watchdog registra y recupera salidas o bloqueos del bot experimental sin afectar a `legacy`;
- cualquier recuperación invalida esa vuelta como prueba de homologación;
- el overlay DEV permite seleccionar y seguir con la cámara a cualquiera de los seis participantes;
- CPU1 queda identificado explícitamente como `BOT FÍSICO`;
- el balance `legacy` usa solo referencias históricas del coche seleccionado;
- el ritmo máximo aleatorio ya no puede superar la referencia usada para equilibrar la carrera;
- CPU1 calcula su máximo físico desde el mismo `targetRate` que la parrilla y queda fuera del tráfico legacy;
- el fallback sin histórico se acelera del 36 % al 42 % para recuperar competitividad;
- las etiquetas de espectador muestran vueltas, cruces de meta y armado para diagnosticar el duelo final;
- la evaluación de cierre de ronda se ejecuta continuamente desde el estado de carrera válido;
- corrección tras prueba: CPU1 ya tenía buen ritmo; se conserva su control lateral nuevo y se restaura velocidad con factor físico 1.16;
- el aumento de ritmo de los cuatro legacy se mantiene porque eran los que resultaban excesivamente lentos;
- CPU1 detecta sucesiones de curvatura alterna y amplía el objetivo hasta después de la segunda curva;
- la anticipación de chicane reduce correcciones sin cambiar rectas ni ritmo;
- validación estructural posterior: 17/17 circuitos dentro del corredor.

Criterio de salida:

- vuelta completa en varios circuitos;
- sin salidas sistemáticas;
- dirección estable;
- diferencia de tiempo razonable respecto a la trayectoria teórica.

### Fase 4 — Pelotón sin adelantamientos

- Migrar los cinco rivales.
- Añadir seguimiento anticipativo del coche delantero.
- Mantener línea y distancia sin frenazos binarios.

Criterio de salida:

- grupo estable;
- ausencia de colisiones repetitivas;
- aceleración/frenado progresivos;
- ningún coche sobre raíles.

### Fase 5 — Adelantamientos predictivos

- Trayectorias candidatas.
- Predicción sencilla de rivales.
- Selección de lado.
- Compromiso temporal.
- Aborto seguro.
- Reincorporación gradual a la trazada rápida.

Criterio de salida:

- adelantamientos preparados antes de alcanzar al rival;
- sin cambios izquierda–derecha repetidos;
- no adelantar donde la maniobra no puede completarse;
- defensa y cortes limitados por reglas.

### Fase 6 — Personalidades y humanización

- Perfiles persistentes.
- Variación limitada de percepción y ejecución.
- Diferencias medibles en frenada, riesgo y consistencia.
- Balance de dificultad.

Criterio de salida:

- pilotos reconocibles por comportamiento;
- errores explicables;
- tiempos competitivos pero no idénticos;
- dificultad ajustable sin aumentar artificialmente velocidad máxima.

### Fase 7 — Retirada del legado

Solo después de validar en iPhone:

- varios coches;
- asfalto y tierra;
- circuitos rápidos y técnicos;
- salida, pelotón, adelantamientos y eliminaciones;
- rendimiento sostenido.

## Pruebas obligatorias

Circuitos/tipos de sección:

- horquilla;
- curva larga;
- chicane;
- curvas consecutivas del mismo sentido;
- recta larga;
- cambio de anchura;
- tierra;
- trazado con centerline denso o irregular.

Escenarios:

- bot solo;
- dos coches con ritmos similares;
- coche lento delante;
- tres coches en paralelo;
- jugador bloqueando la trazada;
- adelantamiento iniciado y abortado;
- reincorporación después de evitar tráfico.

Métricas:

- tiempo de vuelta;
- variación vuelta a vuelta;
- cambios de plan por segundo;
- cambios de signo del volante por segundo;
- alternancias gas/freno;
- aceleración lateral;
- distancia mínima a bordes;
- contactos;
- tiempo perdido en tráfico;
- adelantamientos intentados y completados.

## Referencias técnicas

- Xue, Yue y Dolan, *Spline-Based Minimum-Curvature Trajectory Optimization for Autonomous Racing*:  
  https://arxiv.org/abs/2309.09186
- Betz et al., *A Survey on Autonomous Vehicle Racing*:  
  https://mediatum.ub.tum.de/doc/1772110/document.pdf
- Stahl et al., *Predictive Spliner: Data-Driven Overtaking in Autonomous Racing Using Opponent Trajectory Prediction*:  
  https://arxiv.org/html/2410.04868
- Kalaria, Lin y Dolan, *Towards Optimal Head-to-head Autonomous Racing with Curriculum Reinforcement Learning*:  
  https://arxiv.org/abs/2308.13491
- Chung, Seong y Shim, *Learning from Demonstration with Hierarchical Policy Abstractions Toward High-Performance and Courteous Autonomous Racing*:  
  https://arxiv.org/html/2411.04735
- Vasco et al., *A Super-human Vision-based Reinforcement Learning Agent for Autonomous Racing in Gran Turismo*:  
  https://arxiv.org/html/2406.12563

## Decisiones que no deben confundirse

- No se va a integrar entrenamiento neuronal dentro del juego móvil en esta fase.
- No se va a copiar literalmente GT Sophy.
- No se va a modificar la física común BASE 1.0 para ocultar problemas de IA.
- No se usarán animaciones visuales para fingir una conducción que la lógica no produce.
- No se sustituirá inmediatamente toda la IA: cada capa se validará de forma aislada.
- Las correcciones del minimapa son independientes de la arquitectura de conducción.

## Estado de los parches actuales

Los ajustes realizados en `RaceSurvivalTrafficScene.js` mejoran la presentación provisional, pero no constituyen la arquitectura definitiva. Deben conservarse únicamente mientras `planner_v1` no alcance los criterios de validación de las fases 1–4.

Intento provisional del 22/08/2026:

- se probaron una línea personal estable, anticipación de chicanes y límites laterales menores;
- la prueba visual en Santa Cruz fue claramente peor;
- el cambio de comportamiento se revirtió completo en el commit `883258c`;
- no continuar ajustando este controlador por parches antes de terminar las capas nuevas;
- el diagnóstico de serpenteo y desplazamientos queda registrado para diseñar y evaluar la Fase 3.


## Última calibración visual de Fase 3

Tras observar que CPU1 se abría demasiado en casi todas las curvas:

- la trazada optimizada se conserva, pero su excursión lateral se escala al 72 %;
- el refuerzo físico sube de 1.16 a 1.21 para ganar aproximadamente un 4 % de ritmo;
- 17/17 circuitos siguen dentro del corredor en simulación;
- Santa Cruz reduce su offset planificado máximo de 16.8 a 12.1 px;
- la aceptación definitiva continúa pendiente de prueba visual en dispositivo.


## Controlador refinado a partir de vídeo real

La grabación de CPU1 en Santa Cruz confirmó que reducir el ancho de la trazada no bastaba: el controlador seguía realizando correcciones amplias y trataba algunas enlazadas como una S completa.

Estado vigente:

- detección de chicane estricta, con energía suficiente en ambos sentidos;
- horizonte menor en curvas cerradas y ampliación acotada en chicanes confirmadas;
- variación de volante limitada sin desplazar artificialmente el coche;
- factor físico 1.27 y techo experimental 86 %;
- 17/17 circuitos dentro del corredor en simulación;
- Santa Cruz: 33.0 px máximos respecto a la línea y 22.9 cambios de signo de volante por vuelta;
- pendiente nueva validación visual en iPhone.


## Chicanes cortas y segundo aumento de ritmo

Tras una segunda grabación real:

- se añade detección de dos lóbulos breves, opuestos y equilibrados;
- el factor físico sube a 1.38 y el techo experimental al 92 %;
- 17/17 circuitos conservan validez estructural;
- un techo del 95 % se probó y descartó por salida en Shanghai;
- pendiente validación visual y de ritmo en iPhone.


## Criterio de piano y compromiso de chicane

Decisión de conducción:

- tocar brevemente un piano para arañar tiempo es válido y humaniza;
- tolerancia experimental: hasta 3 px durante 0.40 s;
- una chicane corta mantiene un objetivo de salida fijo durante doce muestras;
- CPU1 usa factor 1.45 y techo 95 %;
- 17/17 circuitos pasan el criterio revisado;
- no existe fatiga programada por vuelta.


## Presupuesto de riesgo de CPU1

Para evitar una conducción artificialmente conservadora:

- CPU1 conserva más velocidad en curva cuando llega bien colocado;
- el extra crece en curvas lentas y desaparece con error angular o transversal;
- no altera velocidad punta ni introduce fallos aleatorios;
- riesgo máximo experimental: 0.35;
- 17/17 circuitos válidos;
- Santa Cruz mejora a 27.45/27.38 s en simulación.


## Fase 3B — Planificación por maniobras

Implementada experimentalmente tras analizar una vuelta humana de Santa Cruz en 17.301 s.

- nuevo `trackManeuverPlanner.js`;
- curvatura suavizada antes de segmentar;
- curvas enlazadas agrupadas por proximidad, oposición y equilibrio;
- una entrada, una salida y una velocidad común por secuencia;
- sin recentralización entre vértices;
- riesgo y tolerancia de piano condicionados;
- 17/17 circuitos dentro del criterio revisado;
- Santa Cruz: nueve secuencias, 27.83/27.70 s y 2.9 px durante 0.28 s.
