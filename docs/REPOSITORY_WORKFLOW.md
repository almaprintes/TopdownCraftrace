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
