# REGISTRO DE FASCÍCULOS — TOP DOWN RACE

Este archivo es el índice maestro de continuidad del proyecto.

## Objetivo

Evitar que `docs/CHATS.md` y otros documentos de handoff crezcan indefinidamente y, al mismo tiempo, conservar una cronología clara que pueda servir para el futuro documental / making-of del Shipaton.

## Regla de trabajo

- Cada fase importante del proyecto se documenta en un **fascículo numerado**.
- Formato: `FASCICULO_XXX_TITULO_CORTO.md`.
- Un fascículo debe centrarse en una fase o problema coherente.
- Cuando cambia claramente el tema o el documento empieza a hacerse incómodo de consultar, se **cierra** y se abre el siguiente número.
- No se reescribe la historia: los errores, intentos fallidos, decisiones descartadas y pruebas reales se conservan porque son útiles para reconstruir cómo se hizo el juego.
- Cada fascículo debe terminar con: estado real, commits relevantes, cosas confirmadas por el usuario, cosas NO confirmadas y próximo paso.
- Nunca afirmar que algo funciona en iPhone hasta que el usuario lo haya probado.
- Antes de continuar trabajo técnico, consultar primero este registro y después el fascículo marcado como **ACTIVO**.

## Estados

- `ACTIVO`: fascículo de continuidad actual.
- `CERRADO`: fase terminada o sustituida por una nueva.
- `ARCHIVO`: documentación histórica previa al sistema de fascículos.

## Registro

| Nº | Estado | Fecha | Título | Archivo | Qué cubre |
|---:|---|---|---|---|---|
| 001 | ACTIVO | 2026-08-22 | DUELO + IA global de carrera | `docs/fasciculos/FASCICULO_001_DUELO_IA_GLOBAL.md` | Nacimiento de DUELO, abandono de la dependencia de Supervivencia, CPU1 standalone, IA común, memoria por circuito+coche y aprendizaje reutilizable en todo el juego. |

## Archivo histórico previo

Los documentos anteriores siguen siendo válidos como fuente histórica, pero ya no deben crecer indefinidamente. Entre ellos:

- `docs/CHATS.md` — gran handoff acumulado previo al sistema de fascículos.
- `docs/DUEL_GLOBAL_RACE_AI_2026-08-22.md` — documento que originó el fascículo 001; se mantiene como referencia/compatibilidad.
- Documentos específicos `SURVIVAL_*`, homologaciones, validaciones y demás `.md` ya existentes.

No hace falta migrar de golpe toda la historia antigua. Cuando un documento legado vuelva a ser relevante, se puede resumir en el fascículo activo correspondiente y dejar el original como fuente histórica.

## Para el documental / Shipaton

Cada fascículo debe intentar conservar, cuando aporte valor:

- problema que teníamos;
- hipótesis que probamos;
- qué salió mal;
- reacción/observación real del usuario;
- decisión que cambió el rumbo;
- resultado técnico;
- commits que materializaron el cambio;
- capturas, vídeos o hitos asociados cuando existan;
- lección aprendida.

Esto permite reconstruir después la historia del desarrollo sin tener que leer miles de mensajes del chat.

## Próximo número

El siguiente fascículo será `002` cuando el trabajo abandone claramente el núcleo actual de DUELO + IA global o cuando el fascículo 001 deba cerrarse por tamaño/etapa.
