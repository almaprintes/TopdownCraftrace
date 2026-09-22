# PREPRODUCTION PLAN — TopDown RACE: Craftrace

Fecha de decisión: 2026-09-22
Estado base al documentar: main / DEV 1.1.135
Objetivo: ejecutar este plan justo después de terminar el ajuste funcional de la app durante los próximos días, trabajando coordinadamente con ChatGPT Work.

## 1. Situación y criterio de salida

La beta pública activa NO debe considerarse candidata a producción. Se trabajó principalmente vigilando iPhone/iOS y durante esa evolución se deterioró la jugabilidad/rendimiento en Android. Por tanto, la beta cerrada debe actualizarse antes de solicitar producción.

La siguiente beta debe ser una candidata seria a producción e incorporar:
- correcciones finales de jugabilidad/rendimiento Android sin deteriorar iOS/iPad;
- fixes funcionales recientes de main;
- separación real DEV/PROD;
- Admin y herramientas internas fuera del artefacto PROD;
- Ship-a-ton Judges Mode disponible en PROD con autorización segura;
- pruebas reales del mismo build PROD que después se empaquetará en Android.

No utilizar beta-1.0 como base de desarrollo. Sigue congelada salvo autorización explícita. Trabajar en main.

## 2. Arquitectura objetivo

### PROD — aplicación entregada al jugador
Debe contener el juego y sus sistemas públicos:
- carreras y modos de juego;
- coches/circuitos publicados;
- Garage, Factory, tienda, recompensas;
- Race Control, rankings y ghosts;
- estadísticas, ajustes, audio, etc.;
- Ship-a-ton Judges Mode, porque es requisito del concurso.

NO debe contener herramientas de creación/administración:
- Admin Hub;
- Car Editor;
- Track Editor;
- Track Studio;
- Environment Builder;
- Track Tool interno;
- acceso ADMIN mediante long-press del logo;
- mecanismos equivalentes que permitan cargar escenas administrativas;
- helpers globales de carga de escenas administrativas en PROD.

### DEV — entorno interno
Debe conservar todo lo anterior más:
- Admin Hub;
- Car Editor;
- Track Editor;
- Track Studio;
- Environment Builder;
- Track Tool;
- diagnósticos, telemetría y utilidades internas.

No borrar estas herramientas del repositorio. Separarlas del artefacto de producción.

### CORE compartido
DEV y PROD deben consumir el mismo motor/datos canónicos cuando corresponda:
- TrackBuilder/modelo de circuito;
- circuit registry y datos de circuitos;
- environment registry/datos;
- física;
- IA;
- serialización/import/export compatibles;
- especificaciones y runtime del juego.

No crear dos implementaciones divergentes del juego.

## 3. Hallazgos de la auditoría previa

La implementación actual de Admin está oculta, no protegida:
- game.js registra escenas administrativas como lazy scenes con admin:true, pero ese flag no actúa como autorización.
- ensureLazyScene puede cargar esas escenas.
- existe window.__tdrEnsureScene.
- MenuScene contiene long-press sobre el logo que alterna localStorage tdr2:admin y abre admin-hub.
- MenuAdminLogoRestoreScene restaura deliberadamente ese acceso.
- AdminHub puede activar accesos DEV y alterar progresión local (p. ej. kit de homologación / full car access).
- CarEditor puede guardar overrides locales de prestaciones.
- los editores trabajan principalmente con localStorage/archivos/JSON; no se encontró capacidad administrativa privilegiada de Supabase en ellos.
- public/tool se copia al dist de Vite y expone Track Tool si permanece dentro de public/.

Conclusión: ocultar Admin no es suficiente. En PROD los imports/chunks administrativos no deben generarse.

## 4. Ship-a-ton Judges Mode — requisito obligatorio

Ship-a-ton DEBE permanecer disponible en PROD. Su finalidad es que los jueces puedan investigar/evaluar el 100% del juego sin grind ni barreras de progresión.

Principio:
- el juez usa el MISMO juego de producción;
- Judge Mode concede acceso de evaluación temporal;
- no debe convertir ese acceso temporal en desbloqueos permanentes;
- al desactivarlo, la progresión real del usuario debe permanecer intacta.

La implementación actual ya sigue parcialmente este modelo:
- evaluationAccessEnabled() permite bypass de acceso en carUnlocks/trackUnlocks;
- el bypass no debe persistir recompensas/desbloqueos solo por estar activo.

Debe abarcar todo contenido necesario para evaluación: coches, circuitos, modos, Garage/Factory y demás contenido evaluable. Revisar explícitamente cualquier barrera económica/progresiva que impida al juez investigar una función. Preferir bypass temporal sobre regalar/persistir cantidades artificiales.

### Problema actual
No considerar localStorage tdr2:shipatonJudgeMode:v1=1 como autorización. Cualquier usuario puede manipular almacenamiento local.

### Autorización objetivo mediante Supabase
Supabase no conoce por sí mismo quién es juez. Nosotros entregaremos una credencial/código de evaluación a los jueces a través del canal permitido por Shipaton.

Flujo:
1. juez abre Ajustes > Ship-a-ton 26 > Acceso juez;
2. introduce código;
3. cliente lo envía a un RPC/función segura de Supabase;
4. Supabase valida la credencial en servidor;
5. si es válida, asocia entitlement de juez al auth.uid() anónimo actual;
6. Judge Mode se activa únicamente si el backend confirma entitlement válido.

No incrustar una contraseña maestra en JS/APK.

Diseño recomendado:
- códigos aleatorios de suficiente entropía;
- almacenar hash, no código en claro;
- active;
- expires_at;
- límite de activaciones si procede;
- entitlement asociado al UUID anónimo de Supabase;
- posibilidad de revocar/caducar credenciales;
- no es necesario recopilar nombre/email del juez: solo demostrar que el usuario anónimo presentó una credencial válida.

Una manipulación local del flag no debe bastar para obtener Judge Mode.

## 5. Separación DEV/PROD

Introducir un target de build real (no basado en localStorage) para distinguir DEV y PROD.

En PROD:
- no definir/importar dinámicamente escenas administrativas;
- no registrar AdminHub/CarEditor/TrackEditor/TrackStudio/EnvironmentBuilder;
- no instalar acceso long-press ADMIN;
- no exponer un helper capaz de cargar escenas admin;
- excluir Track Tool de public/dist;
- mantener Shipaton y todos los sistemas públicos.

En DEV:
- conservar todas las herramientas actuales.

La separación debe ser de compilación/tree-shaking/code-splitting: no basta con display:none, flags de UI o claves de localStorage.

## 6. Validación obligatoria del artefacto PROD

No esperar al AAB publicado para descubrir fallos.

Crear un build PROD de prueba accesible de forma controlada (p. ej. /prod-test o equivalente) que sea el mismo tipo de artefacto que se empaquetará.

Probar comparativamente:
- DEV: juego + Admin;
- PROD candidate: juego + Shipaton + sin Admin.

Smoke/regression mínimo en iPhone, iPad y Android:
- arranque;
- lobby;
- Garage;
- Factory;
- tienda/confirmaciones;
- selección de circuitos;
- todos los modos de carrera relevantes;
- controles;
- rendimiento Android;
- recompensas/x2;
- Race Control;
- rankings;
- ghosts/VS;
- estadísticas;
- ajustes/audio;
- Shipaton y acceso al contenido evaluable;
- retorno/suspensión/reanudación cuando proceda.

El AAB debe construirse desde el mismo estado/target PROD ya validado, no desde una variante distinta.

## 7. Guardas CI para no reintroducir Admin

Añadir comprobaciones al workflow de producción. El build PROD debe fallar si el artefacto contiene señales de herramientas internas, por ejemplo:
- AdminHubScene;
- CarEditorScene;
- TrackEditorScene;
- TrackStudioScene;
- EnvironmentBuilderScene;
- tdr2:admin;
- acceso administrativo por logo;
- Track Tool interno.

También verificar positivamente que los elementos imprescindibles siguen presentes/funcionales, especialmente Shipaton Judges Mode.

El objetivo es que futuras modificaciones de Admin no puedan filtrarse accidentalmente a una release.

## 8. Supabase / seguridad online

La auditoría no encontró service-role key incrustada en cliente. Las migraciones revisadas activan RLS y los RPC principales requieren authenticated.

Riesgo separado: el leaderboard confía demasiado en datos enviados por cliente. submit_track_record_with_ghost valida forma/tamaño y mejor tiempo, pero no demuestra que best_time_ms corresponda al ghost ni que sea físicamente plausible.

No mezclar este problema con la separación Admin. Crear tarea independiente de hardening/anti-cheat mínimo antes o alrededor de producción, siempre evitando poner en riesgo la estabilidad de la candidata.

## 9. Orden de ejecución acordado

FASE 0 — ahora:
- terminar ajustes funcionales de la app durante los próximos días;
- prioridad especial a jugabilidad/rendimiento Android y regresiones iOS/iPad;
- no iniciar una gran refactorización mientras se cierran estos bugs.

FASE 1 — frontera de builds:
- introducir DEV/PROD;
- mantener Admin intacto en DEV;
- excluir Admin/editores/tool del artefacto PROD;
- mantener Shipaton en PROD;
- añadir guardas CI;
- crear PROD candidate comprobable.

FASE 2 — Shipaton seguro:
- implementar autorización de juez en Supabase;
- sustituir localStorage como autoridad por entitlement backend;
- conservar bypass temporal/no destructivo de progresión;
- verificar acceso al 100% del contenido evaluable.

FASE 3 — nueva beta cerrada:
- generar actualización de beta desde la candidata;
- probar intensivamente Android + iPhone/iPad;
- recoger feedback y corregir solo regresiones/bloqueadores;
- no considerar la beta activa antigua como validación suficiente.

FASE 4 — candidato de producción:
- Build + Deploy success;
- auditoría automática del bundle PROD;
- smoke test web PROD;
- smoke test Android empaquetado;
- comprobar Shipaton con credencial real;
- generar AAB desde el estado PROD validado;
- solicitar revisión/producción solo después.

FASE 5 — hardening adicional:
- plausibilidad/consistencia leaderboard + ghost;
- mejoras arquitectónicas mayores post-lanzamiento que no sean requisito de seguridad inmediato.

## 10. Reglas de ejecución para ChatGPT / Work

Antes de modificar:
- leer AGENTS.md, PROJECT_HANDOFF.md y este PREPRODUCTION_PLAN.md;
- comprobar HEAD de main y última GitHub Action;
- trabajar solo en main;
- beta-1.0 permanece congelada;
- no mezclar ramas antiguas/recovery/backup/lab/preview/feat/fix/tmp;
- cada cambio visible/funcional DEV incrementa versión y actualiza verificadores;
- antes de declarar desplegado, Build + Deploy deben estar completed/success;
- si falla workflow, inspeccionar logs, corregir y esperar success;
- evitar cambios simultáneos no relacionados;
- no tocar física/IA/circuitos/gameplay durante la separación salvo dependencia demostrada;
- preservar la posibilidad de comparar DEV y PROD candidate.

## 11. Criterio final de aceptación

PREPRODUCTION está lista cuando:
1. Android vuelve a tener jugabilidad/rendimiento aceptables y no hay regresión relevante en iOS/iPad.
2. PROD no contiene ni puede cargar Admin/editores/tool internos.
3. DEV conserva todas las herramientas.
4. Shipaton funciona en la misma build PROD y permite evaluar el 100% del juego.
5. La autoridad Judge procede de Supabase/entitlement, no de un flag local manipulable.
6. CI impide reintroducir herramientas administrativas en PROD.
7. El build PROD ha sido probado directamente antes del empaquetado.
8. El AAB deriva de ese mismo estado PROD validado.
9. La nueva beta cerrada ha sido probada en Android e iOS.
10. Build + Deploy y verificaciones finales están en success.

Este documento es el plan de referencia preproduction. Si una decisión posterior lo modifica, actualizar aquí el cambio y su motivo.
