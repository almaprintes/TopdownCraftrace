# Candidata PROD desde DEV 1.1.171

La promoción a la siguiente beta Android usa un target de compilación real:

- `npm run build` conserva la experiencia DEV y sus herramientas internas.
- `npm run build:prod` genera el juego público, Shipaton Judges Mode y los
  sistemas rewarded, pero excluye Admin Hub, editores, Environment Builder,
  Track Studio y `public/tool`.
- Los accesos locales DEV a coches/circuitos no pueden habilitarse en PROD.
- El helper global de carga de escenas se expone solo en DEV.
- `scripts/prod-bundle-smoke.mjs` inspecciona el artefacto final y falla si
  reaparecen herramientas internas; también exige Judge Mode y placements
  rewarded públicos.

El wrapper Capacitor debe copiar exclusivamente `dist/` producido por
`BASE=./ npm run build:prod`. No debe copiar el build web DEV.
