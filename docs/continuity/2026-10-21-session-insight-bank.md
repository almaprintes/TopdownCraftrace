# Continuidad — Lectura de tanda con banco masivo (21/10/2026)

## Decisión del propietario

Después de probar la APK QA 1.2.328, el propietario indicó que estaba «súper completa casi para publicar» salvo por los comentarios de «Lectura de la tanda»: demasiado similares y repetitivos. Solicitó expresamente un **JSON con centenares de frases**, aunque haya frases tipo, para minimizar las repeticiones que ve un jugador. Por eso se eligió contenido curado en JSON y un selector persistente en lugar de una pequeña lista aleatoria o generación con IA en directo.

## Qué se integró en DEV 1.2.329

- `src/game/ui/sessionInsightBank.json`: versión de catálogo 1, **16 categorías × 24 frases = 384 textos en español, 384 en inglés; 768 en total**, sin frases idénticas dentro de cada idioma. Cada categoría recibe expresiones variadas, con diagnósticos y consejos basados en telemetría real.
- Categorías: `noLaps`, `oneLap`, `shortRun`, `manyOff`, `lightOff`, `invalid`, `pb`, `steady`, `improving`, `fading`, `uneven`, `braking`, `coasting`, `throttle`, `clean`, `neutral`.
- `src/game/ui/sessionInsightReader.js`: selecciona **solo categorías compatibles** con vueltas, validez, tiempos, récord personal previo, salidas, reparto de freno/inercia/gas y tendencia entre primeras/últimas vueltas. No atribuir PB si no existe marca anterior superior; no llamar limpia una tanda con salidas o giros inválidos.
- Rotación de 24 frases por idioma y categoría: uso agotador antes de reciclar, persistencia `localStorage` bajo `tdr2:sessionInsightCycle:v1`, protección frente a repetición inmediata incluso después de completar ciclo, y breve historial de focos para alternar asuntos relevantes. No toca Supabase ni progreso de la partida. La memoria de frases es **local al dispositivo**, no sincronizada entre teléfonos.
- `src/game/scenes/RaceSessionReportScene.js`: eliminado `pickVerdict` (5 textos por caso) y conectado `buildSessionInsight`. Mantiene propiedad pública `verdict`, pantalla, HTML de exportación, paginación, sectores F1 y récords intactos.
- `scripts/session-insight-bank-smoke.mjs`: verifica cantidad, claves, duplicados, datos plausibles, antirrepetición de 24 sesiones iguales, ES/EN y contrato del informe. Se ejecuta en `.github/workflows/pages.yml`.
- `index.html`: DEV 1.2.329.

## Verificaciones y límites

GitHub Actions Build + Deploy DEV [39589979514](https://github.com/almaprintes/TopdownCraftrace/actions/runs/39589979514) `completed/success` para commit `f3e90cc28dcd0583791a87495849a5ef29933ee5`; smoke indicó explícitamente `PASS: 16 situations, 768 bilingual JSON phrases, telemetry guards, 24 unique repeated sessions, persisted anti-repeat, unchanged report contract`. El commit de documentación/prueba adicional conserva la misma lógica en la aplicación.

**No** se ha generado otra APK después de la 1.2.328. La Play pública permanece 1.1.188/vc8. Pendiente revisión visual y de calidad de frases por el propietario en DEV; no afirmar que aparezcan ya en la APK instalada.

## Próximos pasos

Escuchar feedback real del propietario: si un tipo de comentario parece inexacto o demasiado genérico, ajustar la categoría en el JSON, sin modificar física de carrera. Se puede extender el catálogo sin cambiar la lógica de selección; si cambia el recuento por categoría, actualizar el smoke. Cualquier APK nueva requiere petición expresa del propietario.

## Ajuste de integración final — DEV 1.2.330 (21/10/2026)

La DEV 1.2.329 ya contenía las 768 frases del JSON y su selector, pero `RaceExperienceExportReadingScene.js`, situada más abajo en la cadena de herencia que `RaceSessionReportScene.js`, volvía a sustituir `report.verdict` mediante `sessionEngineerReading`. Esto anulaba en el juego **real** la variedad aunque las pruebas unitarias del catálogo estuvieran verdes. En DEV 1.2.330 se han retirado las viejas frases y se conserva sin alteración el veredicto construido con `buildSessionInsight` en la capa base, tanto en informe en pantalla como exportado. El smoke impide regresar a la sobrescritura, prueba el historial diferenciado por piloto y verifica que `tdrCleanLap === false` invalida una vuelta para efectos de comentarios. No se modificaron físicas, puntuaciones, premios, rankings, Supabase ni versión Android. El último APK sigue 1.2.328, sin esta corrección. Prueba física ES/EN y cambio de piloto pendiente hasta siguiente QA autorizada.
