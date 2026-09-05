# REGLAS OBLIGATORIAS DE TRABAJO — TOP DOWN RACE

Estas reglas prevalecen sobre cualquier costumbre anterior del repositorio.

1. NO crear ramas nuevas para trabajo normal.
2. Trabajar SIEMPRE en `main` para el desarrollo actual.
3. `beta-0.0.3` es la beta pública estable y NO se modifica sin autorización explícita del propietario del proyecto.
4. GitHub Pages debe publicar:
   - `/` desde `beta-0.0.3`
   - `/dev` desde `main`
5. NO mezclar código, assets ni builds desde ramas auxiliares, antiguas, recovery, lab, preview, feat, fix, tmp, backup o similares.
6. NO cambiar el origen de `/dev` fuera de `main`.
7. NO actualizar la beta pública automáticamente al hacer cambios en `main`.
8. Una nueva beta solo se publica cuando el propietario diga explícitamente que una mejora sustancial está lista para promoción.
9. Antes de cualquier cambio de despliegue, verificar este archivo y `.github/workflows/pages.yml`.
10. Si una tarea parece requerir una rama nueva, detenerse y buscar una solución dentro de `main` salvo autorización explícita del propietario.

Objetivo operativo: una beta estable para testers y una única línea de desarrollo independiente, simple y predecible.
