# Regla operativa — acceso a GitHub

Para cualquier chat futuro de Top Down RACE / TopdownCraftrace:

- Repositorio habitual: `almaprintes/TopdownCraftrace`.
- Rama habitual: `main`.
- Antes de afirmar que no hay acceso a GitHub, hay que comprobar primero las herramientas/conector GitHub disponibles en la conversación.
- Este repositorio se edita de forma habitual desde ChatGPT mediante el conector GitHub, incluyendo lectura, búsqueda, actualización de archivos y creación de commits.
- No asumir falta de acceso por defecto ni ofrecer workarounds manuales antes de comprobar el conector.
- Si una operación falla, distinguir entre: falta real de permiso, fallo puntual de herramienta, recurso no encontrado o ausencia concreta de una acción; no generalizarlo como "no tengo acceso a GitHub".
- Cuando el usuario pida continuar desarrollo, comprobar el estado real de `main` antes de trabajar desde memoria.
- Tras cada cambio, verificar el commit/SHA real antes de comunicar que está hecho.

Motivo de esta regla: evitar respuestas repetidas e incorrectas diciendo que no hay acceso al repositorio cuando el flujo normal del proyecto consiste precisamente en editarlo desde ChatGPT.
