# Seguridad y coste de comentarios web · TDR (30/10/2026)

## Diagnóstico
El endpoint `public.post_web_track_comment(text,text,text,uuid)` acepta publicaciones anónimas deliberadamente. Es una función `SECURITY DEFINER` con `search_path=''` y validación de pista, alias, texto, nombres reservados y frecuencia de 60 segundos por identificador de navegador. El identificador procede del cliente y puede cambiarse: **no es identidad ni límite confiable contra ataques**. No se conceden INSERT/UPDATE directos a `anon` sobre las tablas privadas.

## Protección aplicada (migración 030)
- Un único bloqueo transaccional no bloqueante serializa las solicitudes a la RPC de comentarios, para que dos intentos simultáneos no superen los límites.
- Máximo **12 comentarios por pista en una hora móvil** y **60 por pista en 24 horas móviles**. Se aprovecha el índice existente `(track_id,created_at DESC)`: comprobaciones con `OFFSET 11/59 LIMIT 1`, sin recorrer toda la tabla y sin nuevas estructuras.
- Se conserva la regla de 60 segundos por token, pero ya no es el único freno. Peticiones que superan límites globales no generan ni comentario ni fila de token.
- Los identificadores caducados de `web_comment_rate_limits` se eliminan tras 48 horas, **reutilizando** el cron de limpieza diario de las 03:43 UTC. No se crea otro cron, índice ni servicio y no se eliminan comentarios históricos.
- El endpoint sigue respondiendo un ID numérico al publicar, y mantiene las mismas pistas, validaciones, formato y accesibilidad para visitantes sin sesión.
- Se revoca `EXECUTE` heredado de `PUBLIC` y se concede explícitamente solo a `anon` y `authenticated`. Se conservan cerradas las escrituras directas a las tablas.

## Comprobaciones
- Migración aplicada a Supabase con éxito; verificadas las cláusulas de límites y el `search_path` de la función instalada.
- Cron existente verificado activo y con nuevo borrado de tokens antiguos; horario conservado.
- Verificado `anon: RPC sí, INSERT directo no`; no se alteraron los datos: 1 comentario existente y 1 token.
- Con transacción revertida y rol `anon`, un identificador de pista no permitido continúa rechazándose. La lectura pública del comentario existente funciona.
- `scripts/web-comment-security-smoke.mjs` protege el contrato y se ejecuta en prebuild.

## Riesgos residuales y decisiones
**No implica protección total contra denegación de servicio:** cualquier navegador puede enviar numerosas solicitudes inválidas o saturar la cuota compartida. Un volumen adversarial elevado exige rate limiting antes de PostgreSQL (WAF/Edge) y controles anti-bot/CAPTCHA evaluados por coste. Los topes también pueden rechazar usuarios legítimos cuando se alcancen: supervisar actividad y ajustar según evidencia.

El asesor de Supabase puede seguir mostrando la advertencia `anon_security_definer_function_executable`. **No declararla resuelta**: el acceso anónimo a esta función privilegiada es intencional por compatibilidad. El resto de funciones `SECURITY DEFINER` con sesiones autenticadas deben revisarse individualmente; no retirar accesos a ciegas.

Siguiente paso de escala: medir el consumo de las copias de partidas y reducir bytes por sincronización, conservando controles de revisión, integridad y recuperación.
