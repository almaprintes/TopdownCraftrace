# Continuidad — Eventos progresivos (2026-08-17)

Se sustituye el antiguo panel decorativo de EVENTO GLOBAL / 20 vueltas por una progresión real de 7 eventos secuenciales conectados a la economía existente.

## Arquitectura

- Lógica: `src/game/events/raceEvents.js`
- Presentación activa en lobby: `src/game/scenes/MenuCarPreviewFixScene.js`, sobreescribiendo `_renderGlobalEventCard()` de la cadena de menú.
- Persistencia del progreso: `localStorage`, clave `tdr2:raceEvents:v1`.
- Inventario/monedas: usa `garageStore.js` (`loadGarage`, `saveGarage`, `addItem`). No existen monedas o recursos paralelos.
- Cada evento crea una línea base al activarse. Las estadísticas anteriores no completan retroactivamente el nuevo evento.
- Al completar aparece `RECLAMAR PREMIO`; solo entonces se ingresan monedas/materiales y se activa el siguiente evento con una nueva línea base.

## Escalera actual

1. PRIMER STINT — 5 vueltas. Premio: 150 monedas + Chatarra x6 + Goma x3.
2. TRAZADA LIMPIA — 8 vueltas sin penalizaciones. Premio: 250 monedas + Aleación x5 + Compuesto x4.
3. CONOCE EL PADDOCK — 3 vueltas en 3 circuitos diferentes. Premio: 400 monedas + Disco x5 + Muelle x4.
4. RITMO DE CARRERA — 15 vueltas limpias. Premio: 600 monedas + Engranaje x5 + Compuesto x6 + ECU x1.
5. RESISTENCIA — 30 vueltas. Premio: 850 monedas + Chatarra x10 + Aleación x8 + Goma x8 + Disco x6.
6. DOMINIO DE CIRCUITOS — 5 vueltas en 5 circuitos diferentes. Premio: 1200 monedas + Engranaje x8 + Muelle x8 + Compuesto x10 + ECU x2.
7. PILOTO PRO — 50 vueltas limpias. Premio: 1800 monedas + paquete amplio de materiales + ECU x3.

## Cómo se mide

- Se leen historiales `tdr2:ttHist:*`.
- Una vuelta válida requiere tiempo numérico > 0.
- Una vuelta limpia es una vuelta cuyo `penaltyMs` es 0.
- Para misiones multi-circuito se mide el incremento de vueltas por historial desde la activación del evento.

## Commits

- `2e6f490e5cf4bc9ddb9e31047e2f224af0c5ae46` — Add progressive race event rewards.
- `6f1ea2e38f4be9006c790272b20074a721d7bd56` — Connect lobby to progressive race events.

## Nota de despliegue

El status de Vercel para `6f1ea2e...` aparece en failure por `build-rate-limit` de la cuenta de Vercel, no por un error de compilación reportado por el repositorio.
