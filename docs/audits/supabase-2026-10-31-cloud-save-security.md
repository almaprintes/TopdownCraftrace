# TDR · Auditoría Supabase — seguridad de partidas, 31/10/2026

**Estado:** cierre parcial verificable. El proyecto PostgreSQL 17 funciona; esta auditoría no implica que el antitrampas físico o la identidad Google/Apple estén terminados.

## Hallazgo crítico corregido: escritura directa de partidas

**Antes:** el rol `authenticated` disponía de `SELECT, INSERT, UPDATE` sobre `public.player_progress`, con RLS `user_id=auth.uid()`. Aunque protegía de leer/escribir partidas ajenas, el jugador podía modificar **su propio** progreso directamente, saltándose el control transaccional de revisiones, el límite de payload, el formato 1/2 y el filtro de escrituras idénticas de `save_my_player_progress`.

**31/10/2026:** aplicado en Supabase proyecto `juukbnkjboiazqggqcyv` mediante migración gestionada `20261031074254_cloud_save_rpc_only_permissions_20261031`.

- La función `public.save_my_player_progress(jsonb,bigint)` sigue con la **misma implementación** (sin cambios en JSON ni lógica CAS) y pasa a ejecutarse como `SECURITY DEFINER`. Su búsqueda está fijada a cadena vacía; sus objetos están calificados y usa `auth.uid()` para la propiedad.
- Se revocaron `INSERT, UPDATE, DELETE` directos sobre `public.player_progress` para `PUBLIC`, `anon` y `authenticated`.
- Se conserva `SELECT` con política RLS por dueño; `EXECUTE` de la RPC solo para `authenticated`.
- No se cambian cuentas, registros, monedas ni esquema de copias; los usuarios Auth provisionales conservan la misma ruta de guardado.
- Precondiciones comprobadas antes: `md5(pg_get_functiondef(...)) = cb23a013a88543bc981c7a9ba3926858`, `SELECT` para authenticated, ejecución de la RPC. La migración aborta si cambia la versión.
- Comprobado después: rol authenticated no puede escribir directamente y puede leer su propia fila y llamar a la RPC. Prueba transaccional reversible: no-op conserva revisión, CAS obsoleto devuelve `saved=false`, formato 3 se rechaza y UPDATE directo lanza `insufficient_privilege`. Todas las pruebas bajo `BEGIN ... ROLLBACK`.

**Atención:** el cambio a SECURITY DEFINER añade un aviso heurístico en el analizador; no eliminar permisos de ejecución de esta RPC ni convertirla de nuevo a INVOKER sin rediseñar por completo las políticas y las escrituras.

## Verificación posterior en producción

- 97 cuentas Auth, 26 perfiles, 2 copias de progreso y 15 récords con fantasma.
- `player_progress`: SELECT authenticated=true; INSERT/UPDATE/DELETE authenticated=false; EXECUTE authenticated=true; EXECUTE anon=false.
- SECURITY DEFINER functions: 14 accesibles a authenticated y 1 función de comentarios accesible a anon. Las funciones de juego usan `auth.uid()`, `SET search_path = ''` y acceso mediado a tablas, por diseño. La advertencia es una solicitud de revisión, no prueba de vulnerabilidad. La función pública de comentarios lleva validación y límites de frecuencia; sigue expuesta intencionalmente.
- RLS: `profiles`, `track_records`, `player_progress` usan filtros de `user_id=auth.uid()`. `tdr_public_notices` reserva modificación a `app_metadata.tdr_staff` (no a datos editables por el usuario).
- Security Advisor a las 08:55 UTC: 22 WARN + 5 INFO. 14 WARN de SECURITY DEFINER authenticated, 1 de comentarios públicos, 6 de accesos de cuentas anónimas o esquema cron, 1 de protección de contraseñas filtradas desactivada. 5 INFO de tablas con RLS activado sin políticas (varias privadas/de servicio).
- Performance Advisor: 0 WARN, 3 INFO (dos tablas privadas de backup sin PRIMARY KEY y un índice de país sin uso).

## No confundir alertas de analizador con problemas de permisos

- Tablas auxiliares/backup RLS sin políticas están cerradas a clientes, no requieren políticas públicas.
- Las 96 cuentas anónimas Auth existentes reciben el rol SQL `authenticated`. No revocar sus permisos sin una migración recuperable de identidad y pruebas iOS/Android.
- Los avisos cron necesitan comprobar permisos del esquema, no eliminar las tareas de publicación horaria ni la limpieza; los roles anon y authenticated **no tienen USAGE** en el esquema `cron`.
- Nunca eliminar las tablas de backup o el índice `profiles_country_idx` para conseguir una puntuación de auditoría sin medir su uso.
- Protección de contraseñas filtradas: valorar activación en Auth según proveedor y disponibilidad del plan; no se cambió configuración de autenticación.

## Trabajo pendiente P0 (NO marcar auditado como antitrampas final)

1. **Antitrampas autoritativo.** La RPC de récord solo valida formato de fantasma/tiempo (>1000ms). El juez geométrico de Karting Tenerife, incluidas ambas direcciones, existe **solo en GitHub Actions** y no certifica marcas reales. Añadir versiones de pista, física por vehículo, reproducción independiente y revisión de falsos positivos antes de habilitarlo.
2. **Identidades recuperables.** Enlazar cuentas provisionales a Google/Apple sin cambiar UUID ni perder progreso; pruebas reales en Android/iOS. No deshabilitar el proveedor anónimo hasta completar la transición.
3. **Economía y recompensas.** Una nube editable por el dueño no acredita monedas, inventarios o hitos competitivos: definir operaciones confiables en servidor si pasan a tener valor competitivo. La suspensión de anuncios se mantiene hasta la confirmación oficial de reactivación; no reintroducir el requisito de rewarded para funciones necesarias durante noviembre.
4. **Comentarios web.** Vigilar abuso contra la RPC pública; el token UUID generado por cliente no identifica a una persona de forma robusta. Añadir protección externa si el tráfico real lo requiere.
5. **Tráfico y retención.** Medir tamaño de copias y egress real antes de nueva compactación; no introducir un formato incompatible con Google Play.
6. **Protección de contraseña filtrada.** Revisar el aviso del Security Advisor en función de los proveedores activos.

## Seguridad del procedimiento

Todo cambio futuro requiere comprobar `pg_get_functiondef`, privilegios `pg_proc` / `pg_class`, políticas `pg_policies`, RLS, inventario de datos y restauración; pruebas de usuarios autorizados/no autorizados en transacción reversible y rerun de Advisors. No cambiar producción de Google Play ni la tabla de usuarios de Auth como consecuencia automática de esta auditoría.

Referencias:
- [Documento de arquitectura y riesgos de 100K](../100K_ONLINE_TRUST_STORAGE_ROADMAP.md)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Security Advisor](https://supabase.com/docs/guides/database/database-linter)
