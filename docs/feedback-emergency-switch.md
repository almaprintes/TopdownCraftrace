# TDR — informes voluntarios y botón rojo Supabase (01/11/2026)

**Ámbito:** solo DEV PWA de GitHub Pages /dev. No modificar la app Android publicada ni la integración iOS local en esta entrega.

## Flujo
- Jugador: **Configuración → Legal/Soporte → Informar de un problema**. Descripción de 8 a 1000 caracteres; telemetría mínima únicamente tras marcar consentimiento. Requiere sesión online de TDR y conserva su identidad; el ID de la cuenta se almacena para aplicar límites. No se envían el correo, ubicación ni IDs de dispositivo en los diagnósticos adjuntos.
- Receptor: PostgREST RPC `tdr_submit_feedback`, que valida acceso y comprueba el **interruptor server-side** dentro de una transacción protegida por advisory lock antes de escribir. NO hay envío en el bucle de carrera ni sondeos automáticos.
- Límites: 2 por cuenta/día UTC, 40 globales/día UTC, 5 minutos entre envíos del mismo jugador, máximo 1500 caracteres de JSON técnico. Los límites de escritura se aplican en la base de datos. Las peticiones rechazadas aún consumen cierto tráfico de API: no son un cortafuegos global de Supabase.
- Control: **Paddock ADMIN → Botón rojo · Supabase** o **Comunicaciones**. Inicio con sesión TDR/Google y `app_metadata.tdr_staff=true`. Botón rojo: RPC `tdr_set_feedback_enabled(false)` confirmada por servidor. Activación verde solo con confirmación. Inicialmente **OFF**.
- Consulta: Comunicaciones → **Ver informes recibidos**; la lista se limita a los últimos 20, solo personal autorizado. Hay copia de cada incidencia para GitHub. **La creación automática de GitHub Issues NO está conectada:** requeriría configurar un secreto de GitHub con un mecanismo de confianza separado. No se introducen PAT ni service_role en el cliente.

## Parada de emergencia alternativa (si no abre el juego)
1. Abrir el proyecto Supabase desde su Dashboard.
2. SQL Editor, ejecutar:

```sql
update public.tdr_feedback_control
set enabled = false, updated_at = now()
where id = 'global';
```

3. Verificar con `select enabled from public.tdr_feedback_control where id='global';`. Debe devolver `false`. Esto detiene nuevos informes, pero **no** suspende Supabase entero.
4. Si Supabase está caído, el botón remoto tampoco podrá operar. Entonces hay que acudir a los controles de la plataforma.

## Seguridad, privacidad y seguimiento
- `tdr_feedback_reports`: RLS activo, escritura directa revocada, lectura staff; las tres RPC son `SECURITY DEFINER` con `search_path=''`, permisos restringidos y autorización explícita.
- Limpieza oportunista de registros anteriores a 30 días al aceptar otro informe; **no garantiza borrado exacto a los 30 días** cuando no hay entradas nuevas. Configurar purga programada antes de utilizar los datos para soporte de producción.
- No se puede deducir el consumo total Supabase a partir del contador de informes; consultar Usage de Supabase periódicamente.
- Prueba de regresión: `node scripts/feedback-emergency-switch-smoke.mjs`, además del `prebuild`.
- Validación manual pendiente: entrar como staff en DEV, comprobar OFF inicial, activar con confirmación, enviar informe desde cuenta distinta, ver en panel, desactivar con rojo, probar segundo envío denegado, comprobar 0 cambios en partidas y récords.
