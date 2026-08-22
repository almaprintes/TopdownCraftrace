# FASCÍCULO 001 — DUELO + IA GLOBAL DE CARRERA

Fecha de apertura: 2026-08-22  
Estado: **ACTIVO**  
Repositorio: `almaprintes/TopdownCraftrace` · rama `main`

## 1. Punto de partida

CPU1 nació como bot físico experimental dentro de Supervivencia (`planner_v1`). Ya existían:

- racing line planner;
- speed profile planner;
- maneuver planner;
- controlador físico;
- telemetría;
- velocidad visible en debug;
- grabación y repetición de la mejor vuelta de CPU1;
- aprendizaje parcial desde vueltas humanas;
- mejoras de estabilidad en recta.

La física común **BASE 1.0 sigue congelada**. La IA debe mejorar decisión, trazada, velocidad objetivo y aprendizaje, no alterar la física común salvo defecto concreto demostrado.

## 2. El problema que abrió esta fase

En Karting Tenerife CPU1 seguía perdiendo mucho tiempo por conducción, especialmente en la chicane de la bajada:

- correcciones izquierda/derecha excesivas;
- pérdida de punta en rectas por no mantener el morro estable;
- levantar gas innecesariamente en curvas abiertas;
- tratar curvas enlazadas como giros independientes;
- mala colocación previa a la chicane.

Observación clave del usuario: para esa chicane CPU1 debería prepararse a la derecha y poder atravesar las dos curvas casi como una recta.

## 3. Experimento fallido que no debe repetirse

Se probó una preparación lateral especial dentro del controlador físico. El resultado real fue malo: CPU1 empezó a hacer movimientos erráticos incluso en rectas.

Ese experimento fue deshecho.

Lección: **no contaminar el controlador global con objetivos laterales agresivos o reglas locales que cambien la dirección frame a frame**. Las decisiones de chicane deben resolverse preferentemente en planificación/trayectoria y validarse con cronómetro.

## 4. Investigación conceptual

Se revisaron enfoques habituales de IA de carreras:

- minimum-curvature / minimum-time racing line;
- Pure Pursuit con lookahead adaptativo;
- Model Predictive Control / MPCC;
- imitation learning;
- reinforcement learning;
- aprendizaje híbrido: demostración humana + optimización.

Conclusión: CPU1 no debe limitarse a perseguir puntos. El sistema debe separar:

1. trayectoria/racing line;
2. velocidad objetivo;
3. controlador físico;
4. aprendizaje/memoria.

Para una chicane, la IA debería poder descubrir qué trayectoria reduce volante acumulado, cambios de signo, distancia recorrida y pérdida de velocidad, en lugar de recibir una regla hardcodeada tipo “ve a la derecha”.

## 5. Nacimiento de DUELO

Se decide crear un modo oficial y permanente:

**DUELO — TÚ vs CPU1**

Características de producto:

- un humano contra CPU1;
- 5, 10 o 15 vueltas;
- pensado para stints largos;
- mismo rango visual y funcional que Contrarreloj, Fantasma y Supervivencia;
- cuarta tarjeta real del selector de modos;
- selector organizado como carrusel, no como botón auxiliar.

DUELO no nace como laboratorio oculto. Es un modo que debe quedarse en el juego.

## 6. Primer error de arquitectura: reutilizar Supervivencia

Se intentó construir DUELO recortando Supervivencia:

- arrancar internamente como `survival`;
- conservar solo CPU1;
- desactivar eliminaciones;
- superar el límite heredado de cinco vueltas;
- reutilizar resultados y lógica existentes.

En iPhone real el síntoma fue repetido: **el jugador entraba en DUELO y CPU1 no aparecía; corría solo**.

Se intentaron capas adicionales para forzar la creación de CPU1 y tampoco quedó fiable.

Decisión definitiva:

> **DUELO no dependerá estructuralmente de Supervivencia.**

No volver a este enfoque.

## 7. Nueva arquitectura: DUELO standalone

DUELO debe disponer de lógica propia para:

- creación de CPU1;
- parrilla de dos coches;
- conteo de vueltas;
- clasificación;
- cronometraje;
- resultado;
- HUD;
- futura repetición;
- alimentación del aprendizaje común.

Puede reutilizar física y planners comunes, pero no la maquinaria de eliminaciones/rondas de Supervivencia.

Escena creada para iniciar esta transición:

`src/game/scenes/RaceDuelStandaloneScene.js`

Commit que enruta el juego hacia ella:

`0e5c3a3deb8bf25196b2a1e94231f82d4b2e6bfd` — `Route Duel through standalone training mode`

**Estado real:** todavía no confirmado en iPhone que esta versión standalone muestre correctamente TÚ + CPU1. No afirmar lo contrario hasta prueba del usuario.

## 8. La decisión más importante: DUELO no posee la IA

El objetivo de DUELO es entrenar y validar una **IA global de carrera**, no una IA exclusiva del modo.

Regla arquitectónica:

> **DUELO entrena la IA; DUELO no posee la IA.**

El conocimiento debe poder reutilizarse en:

- DUELO;
- Supervivencia;
- carreras normales;
- campeonatos;
- eventos;
- cualquier modo futuro con rivales IA.

Por eso el cerebro y la memoria deben vivir en módulos comunes bajo `src/game/ai/`.

## 9. Infraestructura común iniciada

Se crean como primera separación:

- `src/game/ai/raceAiController.js`
- `src/game/ai/raceAiLearningStore.js`

`raceAiController.js` funciona como fachada de controlador común para que los modos dejen de depender de un nombre específico de Supervivencia.

`raceAiLearningStore.js` inicia memoria persistente identificada por:

`trackKey + carId`

La arquitectura de aprendizaje todavía no está terminada; estos módulos son la base.

## 10. Aprendizaje vuelta a vuelta

La idea acordada para stints largos:

- V1 usa estrategia A.
- Al terminar se evalúa y se genera A1.
- V2 usa A1 de forma coherente.
- Se compara con A.
- Si mejora, se acepta.
- Si empeora, se rechaza y se conserva la mejor estrategia conocida.

No modificar conducción caóticamente dentro de la misma vuelta.

Regla central:

> **No aceptar una modificación porque copie mejor al humano; aceptarla porque mejora rendimiento medible.**

Esto permite aprender del jugador sin copiar sus errores y deja abierta la posibilidad de que CPU1 encuentre una solución mejor.

## 11. Aprendizaje específico y general

### Específico de circuito + coche

Debe guardar cosas como:

- colocación previa a maniobras;
- puntos de frenada;
- vértices;
- velocidad mínima;
- velocidad de salida;
- zonas de gas sostenido;
- variantes de trayectoria probadas;
- variantes rechazadas.

Clave mínima: `trackKey + carId`.

### General del piloto IA

Debe transferirse entre circuitos:

- no zigzaguear en recta;
- mirar suficientemente lejos;
- reconocer chicanes/enlazadas;
- valorar salida de curva;
- no frenar dos veces lo que puede resolverse como una sola maniobra;
- mantener gas en curva abierta cuando hay margen;
- penalizar volante nervioso;
- comprometerse con una decisión durante un intervalo en vez de cambiar cada frame.

Objetivo: cuantos más circuitos entrene, mejor debería llegar CPU1 a un trazado nuevo.

## 12. ¿Puede aprender en cualquier circuito?

Sí. Es un requisito.

Un circuito es candidato si aporta geometría suficiente:

- centerline/race centerline válida;
- ancho de pista utilizable;
- línea de meta;
- geometría coherente para calcular progreso.

Flujo esperado en cualquier circuito compatible:

1. generar trazada inicial;
2. generar perfil de velocidad;
3. correr stint humano + CPU1;
4. registrar telemetría;
5. comparar sectores/manobras;
6. probar variantes;
7. guardar mejoras por circuito+coche;
8. recuperar el conocimiento en sesiones futuras;
9. permitir que otros modos consuman esa misma IA.

## 13. Métricas a conservar

Por vuelta/sector interesa registrar:

- tiempo de vuelta y parciales;
- x/y;
- heading;
- velocidad;
- gas;
- freno;
- steer;
- curvatura local/futura;
- distancia a racing line;
- margen aproximado a bordes;
- velocidad mínima;
- velocidad de salida;
- steering acumulado;
- cambios de signo del volante;
- distancia recorrida;
- versión de estrategia usada;
- versión del aprendizaje.

Las mejoras deben ser trazables a datos.

## 14. Reglas técnicas de esta fase

1. BASE 1.0 no se toca.
2. No afirmar funcionamiento en iPhone sin prueba real.
3. Verificar `main` y SHA antes de comunicar commits.
4. Cambios pequeños y reversibles.
5. DUELO no vuelve a depender estructuralmente de Supervivencia.
6. No hardcodear una chicane concreta cuando pueda resolverse con lógica general.
7. No aceptar aprendizaje sin comparar rendimiento.
8. La memoria de IA vive fuera de DUELO.

## 15. Próximo paso

Primero validar el núcleo standalone:

- dos coches visibles;
- mismo semáforo;
- ambos arrancan;
- 5/10/15 vueltas correctas;
- ganador correcto.

Después:

- conectar plenamente DUELO con `raceAiController.js`;
- usar `raceAiLearningStore.js`;
- unificar formato de telemetría humano/CPU1;
- implementar aprendizaje vuelta a vuelta;
- validar que lo aprendido pueda cargarse desde otro modo;
- probar en varios circuitos.

## 16. Hito para el making-of

Esta fase contiene una decisión narrativa importante para el futuro documental del Shipaton:

**se intentó construir un modo nuevo reciclando demasiado código de Supervivencia, falló repetidamente en dispositivo real y se decidió detener el parcheo para convertir DUELO en un modo independiente y la IA en un sistema global reutilizable.**

Es un buen ejemplo de cómo una solución aparentemente más rápida terminó revelando la arquitectura correcta.
