# Registro de geometrías oficiales de TDR — laboratorio autoritativo

**Estado: SOLO DIAGNÓSTICO.** El manifiesto en `config/online-trusted-editions.json`
se mantiene en GitHub, no procede del navegador. El módulo Node
`src/server/raceEditionRegistry.js` calcula la huella SHA-256 con la geometría
oficial de Karting Tenerife y rechaza cualquier cambio que no haya sido
aprobado explícitamente por una nueva edición de pista.

## Garantías existentes

- Dos identidades aisladas: `karting-tenerife` y `karting-tenerife-horario`.
- Orden de checkpoints, normales invertidas y huellas distintas.
- Una modificación del trazado oficial provoca un fallo en GitHub Actions
  (**no** cambia automáticamente la versión de los récords).
- Un hash declarado por el cliente **nunca** se acepta como prueba de versión.
- Los registros antiguos y los tiempos sin fantasma permanecen `historical-unversioned`
  o `unverified-no-ghost`, sin descalificación ni eliminación.
- Una vuelta sintética correcta devuelve `shadow-pass`, **no** `verified`.

## Alcance y limitaciones

GitHub Actions no es un servidor de producción permanente y el módulo
no está conectado a Supabase. El juez actual no prueba que las posiciones
de un fantasma provengan de la física real del juego: pueden fabricarse.
Tampoco marca automáticamente las 15 marcas históricas, ni altera las
96 identidades provisionales. Las ediciones solo incluyen dos variantes
del circuito piloto; los demás siguen `unsupported`.

**Próximos hitos:** (1) fijar versión de físicas y coche mediante datos
de confianza del servidor, (2) probar corredores legítimos en Android/iOS
y circuitos editados, (3) asociar la versión a la publicación mediante
una operación segura y auditable, (4) medir falsos positivos y costes,
(5) activar los estados pending/verified/review con período de gracia.
Ningún hito se considerará completo por recibir un hash enviado desde el móvil.

Verificación:
`node scripts/tdr-edition-registry-lab.mjs`; GitHub Actions `tdr-postgres-lab.yml`.
