# REGLAS OBLIGATORIAS DE TRABAJO — TOP DOWN RACE

Estas reglas prevalecen sobre cualquier costumbre anterior del repositorio.

1. NO crear ramas nuevas para trabajo normal.
2. Trabajar SIEMPRE en `main` para el desarrollo actual.
3. `beta-1.0` es la beta pública estable/final y NO se modifica sin autorización explícita del propietario del proyecto.
4. GitHub Pages debe publicar:
   - `/` desde `beta-1.0`
   - `/dev` desde `main`
5. NO mezclar código, assets ni builds desde ramas auxiliares, antiguas, recovery, lab, preview, feat, fix, tmp, backup o similares.
6. NO cambiar el origen de `/dev` fuera de `main`.
7. NO actualizar la beta pública automáticamente al hacer cambios en `main`.
8. Una nueva beta solo se publica cuando el propietario diga explícitamente que una mejora sustancial está lista para promoción.
9. Antes de cualquier cambio de despliegue, verificar este archivo y `.github/workflows/pages.yml`.
10. Si una tarea parece requerir una rama nueva, detenerse y buscar una solución dentro de `main` salvo autorización explícita del propietario.

Estado de versiones desde 2026-09-23:
- Beta cerrada candidata a publicación: `BETA 1.1.173` en rama `beta-1.0`.
- Desarrollo activo: `DEV 1.1.173` en `main` (x2 postcarrera recuperado y arranque real común).
- La antigua `beta-0.0.3` queda como histórico y no debe reutilizarse para despliegues actuales.

Objetivo operativo: una beta estable para testers y una única línea de desarrollo independiente, simple y predecible.

## PROTOCOLO OBLIGATORIO DE ENTREGA DEV — 22/09/2026

11. Tras cualquier cambio que deba publicarse en DEV, NO responder al propietario con estados intermedios del despliegue.
12. Vigilar GitHub Actions de forma autónoma hasta que el workflow correspondiente al HEAD exacto de main termine.
13. Si Build, verificadores o Deploy fallan, diagnosticar el fallo, corregirlo en main y volver a vigilar la nueva ejecución SIN requerir una nueva iteración del propietario, salvo que la corrección implique una decisión de producto o un cambio de alcance.
14. Solo comunicar que una versión está lista cuando el HEAD final tenga Build + Deploy en estado completed/success.
15. Una respuesta del tipo «pendiente», «en cola», «compilando» o «todavía no» no constituye entrega y debe evitarse cuando el propietario haya pedido esperar hasta que esté lista.
16. El objetivo operativo es que el propietario pueda despreocuparse del pipeline: cuando el asistente responda que está lista, debe significar que el despliegue completo ha sido comprobado.
