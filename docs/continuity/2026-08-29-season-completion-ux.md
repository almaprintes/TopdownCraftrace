# Season completion UX — 2026-08-29

## Final induction car reward
The final AVENIR Gripline reward artwork includes its presentation plinth. On short Android landscape viewports the artwork was oversized and the plinth fell outside the visible composition.

`MenuCoinAssetScene._showEventRewardModal()` now detects car rewards and fits the complete reward artwork inside a bounded 58% viewport width / 62% viewport height box, centered slightly above the vertical midpoint. This keeps the car large while preserving the full plinth.

Commit: `1070b7bfcf90486f18f4ef475da2251de6dae8d8`.

## Completed Season 0 lobby state
The lobby previously fell back to an obsolete `PILOTO DE ÉLITE / 7/7 EVENTOS` state even though Induction now contains 14 stages.

The DOM lobby now renders a dedicated completed state:
- `TEMPORADA 0 · COMPLETADA`;
- `PILOTO COMPLETO`;
- confirmation of all 14 induction stages;
- `PRÓXIMA TEMPORADA EN`;
- live countdown to 00:00 on the first day of the next calendar month.

English equivalents are included. The countdown updates while the lobby remains open.

This establishes the calendar rule for future normal seasons: new seasons start on the first day of a calendar month. Season 0 remains the special Induction season.

Commit: `d5bc963600e32dd3697697f669c32e2901ce3be4`.

## Follow-up
The countdown/post-season state is implemented now. The content/catalog for Season 1 itself is intentionally separate work; this change does not invent or reset a new season before its content exists.
