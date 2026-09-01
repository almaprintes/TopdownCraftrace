# Top Down RACE: CraftRace — Version & Bug-Fix Registry

> **Documento de consulta periódica.** Antes de diagnosticar un bug reportado por un tester, comprobar aquí la versión afectada y si el problema ya figura como corregido en una versión posterior.

## Protocolo

- Cada build identificable de `develop` y cada beta publicada en `main` debe tener una versión visible.
- Cada cambio de versión debe registrar: fecha, rama, correcciones, regresiones conocidas y commits relevantes.
- Cuando llegue un bug de un tester, registrar la **versión exacta** en la que ocurrió antes de modificar código.
- Antes de trabajar en un bug, buscarlo primero en este registro para evitar corregir dos veces el mismo problema.
- Un arreglo solo se marca como **CORREGIDO** cuando está incorporado en la versión indicada; si aún requiere prueba real, marcar **PENDIENTE DE VALIDACIÓN**.
- `develop` es el campo de pruebas. `main` no debe asumir una corrección hasta que ésta haya sido validada y fusionada.

---

## DEV 0.0.2 — 2026-09-01

**Rama:** `develop`

### Fabricación / Upgrade Workshop

- **CORREGIDO:** migración de la interfaz problemática de Fabricación desde textos/modales Phaser hacia DOM para evitar solapamientos entre ambas capas.
- **CORREGIDO:** restaurada la barra inferior de piezas instaladas y su comportamiento funcional tomando `main` como referencia.
- **CORREGIDO:** restaurado el panel del coche actual y sus barras de estadísticas dinámicas.
- **CORREGIDO:** las barras de estadísticas vuelven a reflejar visualmente el efecto/tier de las piezas instaladas.
- **CORREGIDO:** flujo posterior a fabricar una pieza; el cuadro de guardar/instalar deja de mezclarse con la interfaz Phaser anterior.
- **CORREGIDO:** disposición del selector de familia y tier de piezas en la interfaz DOM.
- **CORREGIDO:** estados de materiales (cantidad disponible, requerida, porcentaje y faltantes) dentro de las tarjetas.
- **CORREGIDO:** botón de fabricación cuando faltan materiales: el texto ya no debe saltar a dos líneas ni desbordar verticalmente su hueco.
- **CONSERVADO:** comportamiento original de instalación/cambio de piezas y barra inferior, evitando simplificar su lógica al migrar la presentación.

### Arquitectura / UI

- **REGLA CONFIRMADA:** los textos de estas interfaces deben ser DOM; no reintroducir `Phaser.Text` para solucionar problemas visuales de Fabricación.
- **DOCUMENTADO:** al modificar pantallas híbridas, localizar primero el flujo/clase real ejecutada y su herencia antes de aplicar overrides; varios intentos anteriores no alcanzaban el método real usado después de `_craftDirect()`.

### Identificación de build

- Versión técnica incrementada de `0.0.1` a `0.0.2`.
- La pantalla de orientación identifica esta build como **DEV 0.0.2** para distinguir capturas y reportes de testers.

### Commits relevantes

- `efa976d534dc0bca954fdce680c16be4646ddb66` — pulido visual / identificación DEV 0.0.2.
- `dbe5f1b79100cf7f2c80f2611b80abdc458c502a` — versión técnica 0.0.2.
- `78c3c86ad5b947da253204cbf5491132caedc1d1` — disparo de despliegue asociado.

### Validación

Estado al cerrar la versión: **Fabricación considerada funcional y visualmente cerrada**, pendiente únicamente de detectar posibles regresiones durante uso prolongado de DEV.

---

## Registro de bugs de testers

Añadir futuras incidencias con este formato:

### BUG-XXXX — título breve
- **Reportado en:** BETA/DEV x.y.z
- **Pantalla/sistema:**
- **Síntoma:**
- **Reproducción:**
- **Estado:** NUEVO / INVESTIGANDO / CORREGIDO / NO REPRODUCIDO
- **Corregido en:** x.y.z
- **Commit:**
- **Notas:**
