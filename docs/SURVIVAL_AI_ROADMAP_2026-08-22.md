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

Estado: siguiente tarea.

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

- Generar velocidad máxima local.
- Calcular puntos de frenada hacia atrás.
- Calcular aceleración posible hacia delante.
- Comparar tiempo teórico con telemetría.

Criterio de salida:

- ninguna frenada principal empieza después del vértice;
- sin alternancia rápida gas/freno;
- velocidad coherente con radio y superficie.

### Fase 3 — Controlador físico de un bot

- Un rival de prueba sigue la trayectoria usando dirección, gas y freno.
- Sin tráfico ni adelantamientos.
- El resto permanece en legacy.

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
