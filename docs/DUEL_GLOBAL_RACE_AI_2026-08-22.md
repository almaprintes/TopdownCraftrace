# DUELO + IA GLOBAL DE CARRERA — 2026-08-22

Repositorio: `almaprintes/TopdownCraftrace`  
Rama: `main`

## Decisión de producto

**DUELO nace como un modo oficial y permanente del juego. No es una herramienta temporal de QA ni un laboratorio oculto.**

Concepto:

- jugador humano contra un único rival, **CPU1**;
- carrera configurable de **5, 10 o 15 vueltas**;
- pensado para carreras largas / stints en los que el rival pueda observar, comparar y mejorar;
- debe mantener el mismo nivel de acabado visual y funcional que Contrarreloj, Fantasma y Supervivencia;
- en el selector de modos debe aparecer como **cuarta tarjeta real**, no como botón auxiliar.

El selector fue rediseñado como carrusel de cuatro modos para que DUELO tenga el mismo peso visual que los demás.

## Objetivo real de DUELO

El objetivo de crear DUELO **no es fabricar una IA exclusiva para ese modo**.

DUELO es el entorno oficial donde podemos entrenar, observar y validar una **IA de carrera común para todo Top Down RACE**.

La IA aprendida debe poder utilizarse después en:

- DUELO;
- SUPERVIVENCIA;
- futuras carreras normales;
- campeonatos;
- eventos;
- cualquier modo futuro que necesite pilotos controlados por IA.

Regla arquitectónica:

> **DUELO entrena la IA; DUELO no posee la IA.**

El cerebro, el aprendizaje y la memoria deben vivir en `src/game/ai/` o módulos comunes equivalentes, nunca encerrados dentro de una escena concreta de DUELO.

---

# De dónde venimos: CPU1 experimental

Antes de DUELO se desarrolló CPU1 dentro de Supervivencia como bot físico experimental (`planner_v1`).

Componentes existentes relevantes:

- `src/game/ai/trackRacingLinePlanner.js`
- `src/game/ai/trackSpeedProfilePlanner.js`
- `src/game/ai/trackManeuverPlanner.js`
- `src/game/ai/survivalPhysicalBotController.js`
- `src/game/ai/survivalAiRuntime.js`
- `src/game/scenes/RaceSurvivalTrafficScene.js`
- `src/game/scenes/RaceSurvivalPolishScene.js`

Ya se había conseguido:

- bot físico real;
- telemetría;
- velocidad visible en debug;
- grabación de su mejor vuelta;
- repetición de la mejor vuelta de CPU1;
- aprendizaje parcial a partir de vueltas humanas;
- estabilización importante en rectas.

La física común **BASE 1.0 permanece congelada**. Cualquier evolución de IA debe actuar sobre decisión, planificación, trazada, velocidad objetivo y aprendizaje, no modificar la física común sin un defecto concreto demostrado.

---

# Problema que motivó el cambio

En Karting Tenerife se detectaron defectos claros en CPU1:

1. En rectas podía oscilar lateralmente, perdiendo punta porque el coche nunca quedaba completamente orientado.
2. En curvas rápidas/abiertas levantaba el acelerador demasiado cuando podría mantener velocidad.
3. Seguía puntos de una línea de forma demasiado literal en vez de conducir un arco continuo.
4. En la chicane de la bajada trataba las dos curvas como correcciones independientes.
5. La entrada a esa chicane era mala: debería colocarse previamente al lado derecho para atravesar la enlazada con una trayectoria mucho más recta.

Se hizo un intento de corregir chicanes añadiendo preparación lateral y lógica especial al controlador. Resultado real observado por el usuario:

> CPU1 empezó a hacer movimientos erráticos incluso en rectas.

Ese cambio fue deshecho. No volver a introducir reglas laterales agresivas globales sin validación por trayectoria completa.

---

# Investigación conceptual

Se revisaron enfoques habituales de IA de carreras y conducción autónoma:

- minimum-curvature / minimum-time racing line;
- Pure Pursuit con lookahead adaptativo;
- Model Predictive Control / Model Predictive Contouring Control;
- imitation learning;
- reinforcement learning;
- aprendizaje híbrido: demostración humana + optimización posterior.

Conclusión de diseño:

**CPU1 no debe limitarse a perseguir una lista de puntos.**

La IA debe separar:

1. **trayectoria global / racing line**;
2. **perfil de velocidad objetivo**;
3. **controlador físico que ejecuta esa intención**;
4. **memoria/aprendizaje que modifica decisiones futuras**.

Para una chicane, el criterio correcto no es programar “ve a la derecha” por circuito, sino conseguir que el sistema pueda descubrir que una preparación lateral concreta permite:

- menos volante acumulado;
- menos cambios de signo del volante;
- menos distancia recorrida;
- mayor velocidad mínima;
- mejor velocidad de salida;
- menor tiempo del sector.

---

# Filosofía de aprendizaje en stints largos

DUELO permite 5/10/15 vueltas precisamente para disponer de suficiente experiencia dentro de una misma sesión.

La unidad básica de aprendizaje debe ser **la vuelta completa o un sector coherente**, no correcciones que cambian continuamente dentro de la misma vuelta.

Ejemplo conceptual:

- V1 CPU1 usa estrategia A.
- Al terminar V1 se evalúa el resultado y se prepara A1.
- V2 usa A1 de principio a fin.
- Al terminar V2 se compara contra A.
- Si A1 mejora, puede convertirse en nueva base.
- Si empeora, se rechaza y se conserva A.

Regla esencial:

> **No aceptar una modificación porque se parece más a la trazada humana. Aceptarla solo si mejora una métrica validada, especialmente el tiempo.**

Esto evita que CPU1 copie errores humanos y permite que termine encontrando soluciones mejores que la demostración original.

---

# Aprendizaje específico y aprendizaje general

La IA debe manejar dos niveles de conocimiento.

## 1. Conocimiento específico de circuito + coche

Ejemplos:

- colocación antes de una chicane;
- puntos de frenada;
- apertura de entrada;
- vértices;
- velocidad mínima objetivo;
- velocidad de salida;
- sectores donde puede mantener gas;
- familias de trayectorias que ya se probaron y dieron mal resultado.

La memoria persistente debe quedar identificada al menos por:

`trackKey + carId`

Porque un mismo circuito puede exigir decisiones distintas a coches con capacidades diferentes.

## 2. Conocimiento general del piloto IA

Debe poder transferirse entre circuitos:

- no zigzaguear en recta;
- minimizar correcciones innecesarias;
- mirar suficientemente lejos;
- reconocer enlazadas/chicanes;
- valorar velocidad de salida;
- evitar frenar dos veces una secuencia que puede resolverse como una única maniobra;
- mantener gas en curvas abiertas cuando existe margen;
- penalizar steering nervioso;
- comprometerse durante un intervalo con una trayectoria para no cambiar de decisión cada frame.

Objetivo a largo plazo:

> Cuantos más circuitos entrene CPU1, mejor debería llegar de base a un circuito que todavía no conoce.

---

# ¿Puede aprender en cualquier circuito?

**Sí. Es un requisito del sistema.**

DUELO y la IA común no deben estar ligados a Karting Tenerife.

Un circuito es candidato si proporciona geometría suficiente para construir el modelo de conducción, principalmente:

- centerline / race centerline válida;
- anchura de pista utilizable;
- línea de meta;
- geometría coherente para calcular progreso.

En cualquier circuito compatible se debe poder:

1. generar una trazada inicial;
2. generar perfil de velocidad;
3. hacer un stint humano + CPU1;
4. registrar vueltas y sectores;
5. comparar decisiones;
6. guardar aprendizaje de ese circuito+coche;
7. recuperarlo en la siguiente sesión;
8. usarlo desde otros modos del juego.

Ejemplo:

- CPU1 puede aprender una solución concreta para la chicane de Karting Tenerife.
- En Karting Canarias construirá otra memoria específica.
- Al regresar a Tenerife recuperará la de Tenerife.
- Las mejoras generales del piloto (estabilidad, anticipación, valoración de salida) pueden aplicarse en ambos.

---

# Intento fallido: construir DUELO sobre Supervivencia

Se intentó inicialmente implementar DUELO como una variante de Supervivencia:

- se iniciaba internamente como `survival`;
- se pretendía conservar solo CPU1;
- se neutralizaban eliminaciones;
- se intentaba superar el límite fijo de cinco vueltas;
- se reutilizaba el planner físico de CPU1.

Esto produjo una integración demasiado frágil.

Síntoma repetido en iPhone real:

> El usuario entraba en DUELO y corría solo; CPU1 no aparecía.

Se intentaron capas adicionales de garantía de inicialización, pero siguió sin resolverse satisfactoriamente.

**Decisión final: abandonar esta arquitectura.**

No seguir construyendo DUELO recortando o transformando Supervivencia.

---

# Nueva arquitectura de DUELO

DUELO debe crearse **desde cero como modo independiente**, reutilizando únicamente componentes realmente comunes.

Debe tener lógica propia de:

- creación de CPU1;
- parrilla de dos coches;
- conteo de vueltas;
- clasificación;
- cronometraje CPU1;
- resultado;
- HUD;
- futuras repeticiones;
- alimentación del sistema común de aprendizaje.

No debe heredar:

- parrilla de seis coches;
- eliminaciones;
- rondas de Supervivencia;
- límite de cinco vueltas de Supervivencia;
- resultados de Supervivencia;
- lógica de simulación del resto de participantes.

La primera escena standalone creada para iniciar esta transición es:

`src/game/scenes/RaceDuelStandaloneScene.js`

Commit que enruta el juego hacia la versión standalone:

`0e5c3a3deb8bf25196b2a1e94231f82d4b2e6bfd` — `Route Duel through standalone training mode`

Importante: **el usuario todavía no ha confirmado en dispositivo que esta escena standalone funcione correctamente. No afirmar que CPU1 ya aparece hasta prueba real.**

---

# UI del selector de modos

Primera implementación incorrecta:

- DUELO apareció como un microbotón inferior añadido al panel;
- rompía coherencia gráfica;
- daba apariencia de función de prueba.

El usuario dejó claro que DUELO nace para quedarse.

Diseño corregido:

- cuarta tarjeta completa;
- mismo lenguaje visual que Contrarreloj, Fantasma y Supervivencia;
- panel convertido en carrusel;
- tres tarjetas visibles con desplazamiento hacia la cuarta;
- flechas laterales;
- indicadores de página;
- DUELO abre selector de 5/10/15 vueltas.

Regla de producto:

> Todo modo permanente debe integrarse con la misma jerarquía visual que los demás modos, nunca como añadido auxiliar.

---

# Módulos comunes de IA iniciados

Para evitar que el conocimiento quede encerrado en DUELO se inició la separación de módulos comunes dentro de `src/game/ai/`.

La intención arquitectónica es disponer de:

- **controlador común de carrera**: ejecuta el coche físico usando un perfil/planner;
- **almacén común de aprendizaje**: persiste conocimiento por circuito+coche;
- DUELO como entrenador/consumidor;
- Supervivencia y futuros modos como consumidores de la misma IA.

Se crearon inicialmente módulos comunes para avanzar en esa dirección:

- `src/game/ai/raceAiController.js`
- `src/game/ai/raceAiLearningStore.js`

Estos módulos son infraestructura inicial; no considerar la arquitectura de aprendizaje terminada todavía.

---

# Objetivo futuro del motor de IA

Flujo deseado:

```text
VUELTAS HUMANAS + VUELTAS CPU1
            ↓
     TELEMETRÍA COMPARABLE
            ↓
  ANÁLISIS POR SECTOR/MANIOBRA
            ↓
 GENERAR VARIANTE DE CONDUCCIÓN
            ↓
 PROBAR EN LA SIGUIENTE VUELTA
            ↓
 ¿MEJORA TIEMPO / ESTABILIDAD?
      ↙              ↘
    SÍ                NO
  GUARDAR           RECHAZAR
      ↓
RACE AI LEARNING STORE
      ↓
CUALQUIER MODO DEL JUEGO
```

Una posible evolución posterior es un planificador predictivo de trayectorias candidatas:

- mirar un horizonte de pista por delante;
- generar varias curvas candidatas dentro del ancho disponible;
- puntuar progreso, longitud, curvatura, steering acumulado, cambios de signo, velocidad conservable y margen a bordes;
- elegir la mejor;
- comprometerse durante un intervalo para evitar oscilaciones frame a frame.

Esto es especialmente prometedor para chicanes y curvas enlazadas.

---

# Métricas que debemos registrar

Para que el aprendizaje sea demostrable y reversible, por vuelta/sector interesa conservar:

- tiempo de vuelta;
- parciales / sectores;
- posición x/y;
- heading;
- velocidad;
- throttle;
- brake;
- steer;
- curvatura local/futura;
- distancia a racing line;
- margen aproximado a bordes;
- velocidad mínima del sector;
- velocidad de salida;
- steering acumulado;
- número de cambios de signo del volante;
- distancia recorrida;
- trayectoria candidata / versión de estrategia usada;
- versión del aprendizaje que produjo la vuelta.

Cada mejora aceptada debe ser trazable a datos, no a intuición únicamente.

---

# Reglas de seguridad técnica para esta fase

1. **BASE 1.0 no se toca.**
2. No afirmar que un cambio funciona en iPhone hasta que el usuario lo pruebe.
3. Verificar siempre `main` y SHA real antes de comunicar commits.
4. Cambios pequeños y reversibles.
5. No volver a convertir Supervivencia en dependencia estructural de DUELO.
6. No hardcodear soluciones de una chicane concreta si pueden expresarse como una decisión general del planner.
7. No aceptar aprendizaje sin comparar rendimiento posterior.
8. El aprendizaje debe persistir fuera de la escena/modo que lo generó.

---

# Próximo paso inmediato

1. **Validar en iPhone que `RaceDuelStandaloneScene` muestra realmente TÚ + CPU1.**
2. Si falla, arreglar exclusivamente el núcleo standalone hasta lograr:
   - dos coches visibles;
   - mismo semáforo;
   - ambos se mueven;
   - vueltas 5/10/15 correctas;
   - ganador correcto.
3. No añadir todavía complejidad de aprendizaje mientras el núcleo de dos coches no esté validado.
4. Después, conectar DUELO al controlador común `raceAiController.js` y al almacén `raceAiLearningStore.js`.
5. Registrar vuelta humana y vuelta CPU1 en un formato común.
6. Implementar aprendizaje **vuelta a vuelta**, con aceptación/rechazo por rendimiento.
7. Una vez validado, hacer que Supervivencia consuma el mismo Race AI común.
8. Probar aprendizaje en varios circuitos para separar correctamente conocimiento específico y generalización.

---

# Resumen de una frase

**DUELO es un modo permanente de TÚ vs CPU1 y, al mismo tiempo, el principal campo de entrenamiento de una IA de carrera global, persistente, reutilizable por cualquier modo y capaz de aprender en cualquier circuito compatible.**
