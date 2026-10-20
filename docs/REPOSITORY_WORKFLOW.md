# AVISO — FLUJO HISTÓRICO

> La descripción inferior es histórica. Para reglas vigentes 20/10/2026 y fuente actual de Pages/Android, consultar [continuity/2026-10-20-handoff-general.md](continuity/2026-10-20-handoff-general.md), `AGENTS.md`, `.github/workflows/pages.yml` y `.github/workflows/android-revenuecat-qa-apk.yml`. No usar `beta-0.0.3` como línea pública actual.

---

# Flujo de trabajo del repositorio — Top Down Race

## Regla de producto

- `beta-0.0.3` es la beta pública estable que usan los probadores. No se modifica durante el desarrollo normal.
- `main` es la única línea de desarrollo y alimenta `/dev`.
- Una nueva beta solo se publica cuando Juan lo autoriza expresamente tras probar una mejora sustancial.

## Regla de despliegue

- GitHub Pages `/` publica la beta estable.
- GitHub Pages `/dev` publica el estado de `main`.
- La beta estable se compila una vez y su build queda cacheado mientras no cambie la rama beta.
- Los cambios de documentación no deben disparar despliegues.
- Un bloque que el usuario deba probar debe agruparse, siempre que sea posible, en un único commit/push para provocar un único despliegue.
- El contador romano de DEV identifica despliegues probables: `DEV 0.0.4 · I`, `II`, `III`, etc. Solo se incrementa cuando hay una nueva versión que Juan debe probar.

## Objetivo

Mantener un sistema predecible: beta estable para probadores, DEV rápido para desarrollo, sin ramas de trabajo innecesarias ni fuentes de despliegue paralelas.
