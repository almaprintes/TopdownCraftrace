# Top-Down Race 2 — Estructura de chats y handoff

# SUPERPROMPT ACTUAL — 2026-08-20

Repositorio `almaprintes/TopdownCraftrace` · rama `main`.

## Reglas críticas
- Usar GitHub conectado real.
- Inspeccionar imports y archivos activos antes de editar.
- Cambios pequeños y reversibles.
- Tras modificar, verificar SHA exacto con `fetch_commit` antes de comunicarlo.
- El usuario prueba en iPhone real; no afirmar funcionamiento en dispositivo hasta confirmación.

## BASE 1.0
Física común congelada. No tocar globalmente salvo defecto concreto.
Patrón: `VELOCE Flash`.
Commit base aprobado: `433651cf043c9f2312fdc8cd264948c9645608a7` — `Blend chassis load transitions across brake and throttle`.
La identidad se construye mediante perfiles/overrides individuales.
Override activo: `public/community/car-overrides.json`.

## Filosofía de marcas
- HÉLIX: escuela, accesible y progresiva.
- CROWN: equilibrada, refinada y más prestacional.
- AVENIR: precisión/control; recompensa técnica.
- VELOCE: velocidad a cambio de exigencia creciente.
- FORGE: pesado/lento en asfalto y muy tolerante fuera.

Principio: **mejor coche no significa coche más fácil**.

## Homologación STOCK 1.0 — Karting Tenerife
Contrarreloj, normalmente 5 vueltas, completamente stock.

| # | Coche | Mejor | Punta | Sensación | Estado |
|---|---|---:|---:|---|---|
|1|HÉLIX Spark|50.613|52 km/h|Facilísimo, monótono, llega enseguida a punta|REPETIR STOCK*|
|2|HÉLIX Comet|47.737|56 km/h|Sumamente divertido y accesible|CONGELAR|
|3|HÉLIX Pulse|45.905|59 km/h|Muy rápido/fácil; salida excepcional|VIGILAR|
|4|CROWN Axis|~46.034|—|Algo lento frente a Pulse pero muy fácil|CONGELAR|
|5|CROWN Vector|43.877|62 km/h|Fantástico; permite progresar vuelta a vuelta|CONGELAR|
|6|CROWN Equinox|41.458|65 km/h|Muy potente; rápido con sensación de peligro|CONGELAR|
|7|AVENIR Gripline|44.599|59 km/h|Mucho control y bastante velocidad|CONGELAR|
|8|AVENIR Apex|42.366|62 km/h|Nervioso inicialmente, rápidamente dominable|CONGELAR|
|9|AVENIR Torque|41.008|65 km/h|Sublime; raíles, pianos, salida potentísima|CONGELAR|
|10|VELOCE Flash|41.493|68 km/h|Patrón; difícil, trasera viva, exige freno|PATRÓN / CONGELAR|
|11|VELOCE Surge|39.865|72 km/h|Muy salvaje; orientar antes de abrir gas|VIGILAR|
|12|VELOCE Photon|38.849|80 km/h|Potro indomable; aceleración brutal|REVISAR DIFICULTAD|
|13|FORGE Hammer|52.043|54 km/h|Excesivamente difícil de reorientar|REVISAR|
|14|FORGE Anvil|52.241|54 km/h|Chicanes críticas; gas a impulsos ayuda|REVISAR|
|15|FORGE Colossus|56.607|53 km/h|Aprendible; morro tiembla/pivote muy centrado|REVISAR|

* Spark llevaba Frenos T4. Como apenas frenó, la lectura de carácter sigue siendo útil, pero el crono no es homologación stock estricta.

## Lectura por familias

### HÉLIX
Progresión correcta. Comet especialmente divertido. Pulse quizá demasiado fácil para ser el superior; no tocar todavía. Spark debe repetirse completamente stock.

### CROWN
Familia muy sólida: Axis accesible, Vector progresivo, Equinox potente/peligroso.
Axis recibió únicamente corrección visual `visualScale: 0.92` en commit `efc5b9e917f24d3d93687ce47e2009c9c58c9172`.

### AVENIR
Familia más redonda de la primera homologación.
- Gripline 44.599 / 59: control + velocidad.
- Apex 42.366 / 62: nerviosismo inicial que se aprende rápido.
- Torque 41.008 / 65: precisión brutal, devora pianos, gran salida de curva.

Los tres congelados provisionalmente.

### VELOCE
Flash repetido stock: 41.493 / 68 km/h frente al antiguo 41.751; la mejora del piloto fue solo de unas décimas.

Surge: 39.865 / 72 km/h; 17 detecciones fuera, 31 frenadas, frenada máxima 0.62 s. Muy salvaje pero ofrece enorme recompensa cuando se domina.

Photon: 38.849 / 80 km/h; 26 detecciones fuera, 12.6 s acumulados, 29 frenadas, frenada máxima 1.08 s. Solo una vuelta realmente dominada. Revisar dificultad antes de decidir si suavizar.

No tocar BASE 1.0.

### FORGE — diagnóstico
FORGE necesita revisión, pero **no** debe convertirse en AVENIR pesado.

Hammer:
- Vueltas útiles: 53.974 → 52.051 → 52.043 → 52.409.
- V5 1:12.077 contaminada porque se perdió CP2 y hubo que volver a buscarlo.
- Punta 54 km/h.
- Muy difícil de reorientar pese a poca velocidad.

Anvil:
- Tanda accidental de 4 vueltas: 55.379 → 52.241 → 52.900 → 53.074.
- Punta 54 km/h.
- La segunda curva de las chicanes penaliza muchísimo; casi hay que parar para invertir orientación.
- En curvas normales funciona mejor recuperar gas con pequeños impulsos.

Colossus:
- 1:15.073 → 1:01.061 → 59.054 → 57.152 → 56.607.
- Punta 53 km/h.
- Aprendizaje muy claro y más satisfactorio que Hammer/Anvil.
- Debería sentirse más pesado, pero el morro tiembla demasiado.
- Sensación de pivote excesivamente centrado: la parte trasera parece bailar.
- 71% gas / 28% coasting / 1% freno.

Ventaja FORGE a conservar: enorme tolerancia a césped/terreno y 0 penalización fuera en estas tandas.

Objetivo FORGE 1.1:
- conservar masa, anticipación y dificultad en cambios rápidos;
- conservar ventaja fuera de asfalto;
- reducir pivote central/trasera bailona;
- hacer que la dificultad venga de masa, batalla e inercia, no de sobreviraje extraño;
- hacer Hammer/Anvil más satisfactorios y distinguibles;
- Colossus puede ser el peor en Karting Tenerife, pero debe obedecer previsiblemente cuando se conduce bien.

Antes de cambiar valores: inspeccionar `public/community/car-overrides.json` y el código activo que consume esos parámetros. Ajustes pequeños/reversibles. BASE 1.0 intocable.

## Factory / desequipado y UX pendiente
Gripline tenía accidentalmente `tires_street` T1 y `transmission_prototype` T4.
Wrapper activo: `src/game/scenes/UpgradeWorkshopUnequipScene.js`.
Commit: `fe2a036c45487ee5d939f6564113681c5ce3f7ea` — `Return factory parts to inventory when unequipping`.

El usuario confirmó Gripline con cinco categorías vacías / `SIN EQUIPAR`.

Se descubrió que el inventario visual puede ocultar piezas T4 finales al filtrar según si pueden participar en otra receta. Revisar.

La parte derecha de Fabricación necesita **rediseño UX profundo**:
- botones montados;
- materiales incómodos de desplegar;
- flechas/controles demasiado pequeños;
- flujo crafting → autoequipado → desequipado poco intuitivo;
- inventario que oculta piezas válidas.

No parchear superficialmente: diseñar primero mockup horizontal iPhone y después implementar.

## SIGUIENTE GRAN FASE — CRAFTING Y POTENCIAL MÁXIMO
1. Auditar todas las mejoras reales: Motor, Transmisión, Neumáticos, Frenos y Suspensión; T1→T4; recetas, costes y efectos reales.
2. Determinar cómo debe afectar cada mejora a cada coche/familia.
3. Definir el **máximo potencial** de cada uno de los 15 coches.
4. Evitar que todos los coches maxeados converjan en el mismo supercoche.
5. Permitir potenciar fortalezas, compensar debilidades o habilitar builds sin borrar identidad.
6. Repetir homologación con coches desarrollados/maxeados y comparar stock → máximo.
7. Probar posteriormente en circuitos/superficies diferentes; Karting Tenerife no debe decidir por sí solo el potencial global, especialmente para FORGE.

Principio de diseño: Gripline maxeado debe seguir siendo Gripline; Photon maxeado debe seguir siendo terroríficamente rápido y exigente; Colossus maxeado debe ser una apisonadora eficaz en su terreno, no un deportivo gigante.

## Próximo paso inmediato
Inspeccionar parámetros reales de FORGE en `public/community/car-overrides.json` y su consumo activo antes de proponer FORGE 1.1. Después auditar el árbol completo de crafting/mejoras y definir potencial máximo por coche.
