# Supabase bootstrap — 2026-09-17

> Fuente de continuidad para la infraestructura online de TopDown RACE: Craftrace. Este documento registra lo configurado realmente en el dashboard de Supabase el 17/09/2026 y las decisiones acordadas antes de implementar leaderboards.

## Estado

Supabase está dado de alta, pero **todavía NO se han creado tablas ni se ha integrado Supabase en el código del juego**.

No hacer cambios manuales adicionales en tablas/policies sin documentarlos y versionarlos. La intención es que el esquema futuro quede representado mediante migraciones SQL en este repositorio.

## Organización y proyecto

- Organización: `CraftRace Studio`
- Tipo de organización seleccionado: `Startup`
- Plan: `Free`
- Proyecto: `TopDown RACE - Craftrace`
- Región: `West EU (Ireland)`
- Base de datos: PostgreSQL estándar/default
- OrioleDB: NO activado
- Advanced Configuration: no se modificó

## Integración GitHub

- Supabase tiene autorización únicamente para el repositorio `almaprintes/TopdownCraftrace`.
- La conexión GitHub del dashboard **NO implica por sí sola que las migraciones SQL del repositorio se desplieguen automáticamente a producción**.
- Cuando se implemente el esquema, las migraciones deberán versionarse en el repo y su mecanismo de despliegue deberá configurarse explícitamente.
- El botón `Connect` del dashboard de Supabase no era necesario para completar el alta. Se usará cuando corresponda obtener/configurar los datos de conexión de la aplicación.

## Data API y seguridad de tablas

Configuración elegida al crear el proyecto:

- Data API: ACTIVADA.
- `Automatically expose new tables`: DESACTIVADO.
- Automatic RLS: ACTIVADO.

Principio obligatorio: mínimo privilegio. No asumir que una clave pública del cliente es secreta; la protección real de datos debe quedar en las políticas RLS y en el diseño del backend.

## Authentication

Configuración actual:

- Anonymous Sign-ins: ACTIVADO.
- Email: DESACTIVADO.
- Phone: DESACTIVADO/no usado.
- Apple, Google y demás proveedores: no usados/desactivados para esta primera implementación.

Los usuarios anónimos de Supabase usan el rol `authenticated`. Por ello, las futuras políticas RLS no deben interpretar `authenticated` como acceso general. Deben restringir operaciones mediante `auth.uid()` y mínimo privilegio. Si una política necesita diferenciar sesiones anónimas, puede contemplar el claim `is_anonymous`.

## Identidad prevista para Craftrace

Objetivo de UX: no añadir una pantalla de registro al jugador.

Flujo previsto:

1. El jugador introduce el nick que Craftrace ya solicita.
2. Supabase crea/mantiene una identidad anónima interna con UUID.
3. El perfil del juego asocia ese UUID con el nick.
4. Los tiempos/récords del leaderboard se asocian al UUID.

No se prevé solicitar email ni contraseña para esta primera versión.

El detalle definitivo sobre unicidad/formato del nick y recuperación/sincronización entre dispositivos se decidirá antes de crear el esquema.

## Leaderboard previsto — todavía sin implementar

La primera versión se orientará a rankings por circuito. Datos candidatos, pendientes de cerrar antes de crear tablas:

- `user_id` interno de Supabase
- nick
- circuito
- mejor tiempo
- coche utilizado
- fecha del récord
- versión del juego

Las políticas deberán permitir, como principio general:

- lectura del leaderboard necesaria para el juego;
- creación/actualización de datos propios por el usuario correspondiente;
- impedir que un jugador modifique perfiles o resultados de otros jugadores;
- ningún privilegio administrativo desde el cliente público.

La validación/anticheat de tiempos deberá diseñarse antes de considerar el leaderboard competitivo fiable.

## Google Play / privacidad

La beta pública actual se creó antes de esta integración. Al implementar Supabase, el UUID anónimo, el nick y los datos de leaderboard saldrán del dispositivo hacia el backend.

**Antes de publicar en Google Play cualquier build que envíe esos datos, revisar y actualizar la declaración Data Safety de Play Console según la implementación real.** No asumir que la declaración anterior de “no recogida de datos” sigue siendo válida.

## Secretos

Nunca guardar en GitHub:

- contraseña de la base de datos;
- `service_role` key;
- secretos administrativos;
- cualquier credencial privada equivalente.

Las claves que deban existir en cliente deben tratarse según el modelo de seguridad oficial de Supabase; la seguridad del acceso a datos no puede depender de ocultar una clave pública dentro del bundle del juego.

## Próximos pasos

1. Diseñar el esquema definitivo del leaderboard antes de crear tablas.
2. Crear `supabase/migrations/` cuando se adopte el flujo de migraciones.
3. Definir tablas, constraints, índices y RLS en SQL versionado.
4. Configurar explícitamente el mecanismo de despliegue de migraciones; no asumirlo por la conexión GitHub existente.
5. Integrar Auth anónimo + perfil/nick en DEV (`main`).
6. Probar permisos RLS y abuso básico antes de usar datos reales de ranking.
7. Revisar Data Safety/privacidad antes de promover esta funcionalidad a la beta pública/Google Play.

## Límites de alcance de este hito

Este commit es únicamente documentación. No cambia la versión visible de DEV, no modifica el juego, no crea tablas, no ejecuta migraciones y no toca `beta-1.0`.
