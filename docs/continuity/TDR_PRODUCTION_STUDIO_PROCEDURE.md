# TDR Production Studio — procedimiento de construcción

**Estado:** plan de continuidad aprobado  
**Misión:** convertir **Production Studio** en la herramienta única de producción de circuitos de Top Down RACE y retirar progresivamente la dependencia del antiguo Environment Studio y del Admin HUD disperso.

## 1. Objetivo final

Un circuito debe poder recorrer este flujo sin editar código a mano:

```
CREAR / IMPORTAR PROYECTO
        ↓
TRACK
        ↓
ENVIRONMENT / MATERIALS
        ↓
DECORATION / BEAUTY
        ↓
GAMEPLAY / AI
        ↓
ADVERTISING
        ↓
VALIDATOR
        ↓
PACKAGE / EXPORT
        ↓
READY FOR REPO
```

La fuente de verdad será un único `track-project.json`. Production Studio edita el proyecto; el juego consume el resultado publicado.

## 2. Regla principal

> **Production Studio será la única puerta de entrada para construir, editar, validar y empaquetar circuitos.**

No se crearán nuevas funciones exclusivas en Environment Studio o en pantallas antiguas del Admin HUD. Mientras falten funciones por migrar, las herramientas antiguas pueden seguir existiendo, pero no se eliminan hasta que Production Studio tenga equivalencia comprobada.

## 3. Módulos

### Project
- crear, abrir, duplicar y guardar proyecto;
- ID, nombre, versión y metadatos;
- autosave seguro;
- import/export del `track-project.json`;
- historial mínimo de cambios/recuperación.

### Track
Hereda Track Studio:
- geometría/trazado;
- límites;
- línea de meta;
- checkpoints;
- parrilla;
- slots de salida;
- físicas/zona conducible;
- minimapa;
- trazada/IA.

### Environment
Sustituye Environment Studio:
- terreno y materiales;
- repetición/escala de texturas;
- chunks alineados al mundo;
- fondos;
- decoración;
- iluminación;
- Beauty Layers;
- orden/profundidad de capas.

### Materials
Integra Material Studio:
- catálogo reutilizable;
- repetición, escala, brillo y parámetros;
- preview inmediato;
- persistencia del proyecto.

### Gameplay
- checkpoints y vuelta válida;
- spawn/parrilla;
- IA/test bot;
- límites y colisiones;
- zonas especiales;
- prueba directa del circuito.

### Advertising
Integración con **TDR Track Advertising System (TAS)**:
- crear/seleccionar slots;
- BILLBOARD, FLAG, BARRIER, GANTRY y TRACKSIDE;
- preview de campaña;
- fallback default;
- IDs persistentes en el proyecto.

### Validator
Circuit Validator obligatorio:
- circuito cerrado/jugable;
- meta y checkpoints coherentes;
- parrilla válida;
- límites/físicas;
- IA/test bot completa vuelta;
- assets existentes;
- materiales válidos;
- Beauty Layers;
- slots publicitarios;
- referencias rotas;
- preview/minimapa.

Salida:

```
✅ CIRCUITO VALIDADO — READY FOR REPO
```

Un error bloqueante impide exportar como producción.

### Package / Export
Genera una carpeta autocontenida y lista para repositorio:
- `track-project.json`;
- datos runtime;
- assets requeridos;
- minimapa/preview;
- manifiesto/versionado;
- informe de validación.

Publicar un circuito terminado debe reducirse a **subir el paquete validado al repositorio**.

## 4. Fuente única de verdad

`track-project.json` debe contener o referenciar de forma inequívoca:
- identidad/versión;
- geometría;
- límites;
- meta/checkpoints;
- parrilla;
- materiales;
- environment;
- decoración/Beauty Layers;
- gameplay/IA;
- publicidad TAS;
- assets;
- metadata de exportación.

Ningún dato crítico se mantiene simultáneamente en dos registros manuales independientes.

## 5. Migración desde herramientas actuales

### Fase 0 — Auditoría
Antes de cambiar arquitectura:
1. inventariar todas las funciones del Admin HUD;
2. inventariar Track Studio;
3. inventariar Environment Studio;
4. inventariar Material Studio;
5. localizar dónde se persiste cada dato;
6. marcar duplicidades y dependencias runtime.

Resultado: matriz `FUNCIÓN → HERRAMIENTA ACTUAL → DESTINO PRODUCTION STUDIO → ESTADO`.

### Fase 1 — Shell estable
Consolidar Production Studio ya existente:
- navegación por módulos;
- proyecto cargado siempre visible;
- guardado/autosave;
- puente entre módulos sin perder estado;
- layout usable con teclado y táctil/iOS.

### Fase 2 — Track
Migrar/embeber Track Studio sin reescribir lo que ya funciona. El mismo dato debe alimentar editor, exportación y RaceScene.

### Fase 3 — Environment + Materials
Migrar Environment Studio y Material Studio conservando comportamiento y fidelidad. Primero equivalencia; después mejoras.

### Fase 4 — Gameplay
Centralizar parrilla, checkpoints, límites, IA y test de conducción.

### Fase 5 — TAS
Añadir los slots publicitarios como parte nativa del proyecto de circuito.

### Fase 6 — Validator
Construir Circuit Validator y convertirlo en requisito de exportación.

### Fase 7 — Package
Exportación reproducible y lista para repo.

### Fase 8 — Retirada del legado
Solo cuando la matriz funcional esté 100 % cubierta:
- bloquear nuevas funciones en Admin HUD antiguo;
- retirar accesos redundantes;
- conservar compatibilidad de proyectos;
- eliminar código legado únicamente tras verificar que ningún runtime depende de él.

## 6. Reglas de implementación

- Trabajar sobre `dev-first-update`; no tocar la estable para desarrollar Studio.
- No crear herramientas paralelas para resolver un problema puntual.
- No duplicar datos entre escenas.
- No migrar una función hasta conocer su persistencia y consumidor runtime.
- Primero paridad funcional, luego rediseño.
- Cada módulo debe poder guardar sin depender de otro módulo abierto.
- Cambiar de módulo no puede perder cambios.
- iPhone/iPad/Android deben poder usar el flujo esencial.
- Los datos exportados deben ser deterministas y versionados.
- Los assets se referencian mediante rutas estables.
- Un proyecto antiguo debe poder migrarse o informar claramente de incompatibilidad.
- Ninguna eliminación de legado se hace por apariencia: solo por dependencia demostrada.

## 7. Orden de trabajo para la próxima sesión

1. Abrir el Production Studio actual y documentar su estado real.
2. Crear la matriz de funciones del Admin HUD/Track/Environment/Materials.
3. Marcar **YA MIGRADO / PARCIAL / PENDIENTE / LEGADO**.
4. Confirmar el esquema actual de `track-project.json`.
5. Resolver primero persistencia y navegación.
6. Migrar una sola función vertical completa y probar: editar → guardar → recargar → runtime.
7. Repetir por módulos.
8. No retirar Environment ni Admin HUD hasta superar Validator y una exportación real.

## 8. Criterio de terminado

Production Studio estará listo para sustituir Environment/Admin HUD cuando sea posible:

1. crear un circuito;
2. diseñar trazado y parrilla;
3. aplicar materiales/environment;
4. decorar;
5. configurar gameplay e IA;
6. colocar publicidad TAS;
7. conducirlo y validarlo;
8. exportarlo;
9. subir el paquete al repo;
10. jugarlo desde el runtime;

**sin editar manualmente archivos del circuito ni entrar en las herramientas antiguas.**

## 9. Ley Production Studio

> **Una herramienta, un proyecto, una fuente de verdad, un paquete publicable.**

Si para terminar un circuito hay que sincronizar manualmente dos editores o dos registros, la migración todavía no está terminada.
