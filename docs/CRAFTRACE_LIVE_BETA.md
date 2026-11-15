# CrafRace LIVE DEV — preparación segura

Estado: **núcleo de protocolo y pruebas únicamente**. No existe una carrera online jugable ni se ha desplegado esta rama.

Se trasladan las lecciones funcionales de SlotRace DEV 0.15.82, pero **no** su modelo de física de dos carriles. CrafRace usa un motor y una identidad de pista diferentes.

## Contrato de implementación
- Dos identidades permanentes verificadas por Supabase Auth, mismo UUID de CraftRace Studio, sin usar apodos como identificador.
- Tabla/canales **separados** de SlotRace, autorización RLS de anfitrión/invitado, códigos aleatorios, caducidad, límites antispam.
- Pista, dirección y versión de físicas coincidentes antes de permitir la cuenta atrás; una simulación local por participante y rival visual interpolado, inicialmente sin colisiones.
- Cronómetro por reloj monotónico y sincronización explícita de salida. Nunca confiar en relojes de pared diferentes ni inventar tiempos.
- Pausa al desconectarse; tras reincorporación con código, confirmar a ambos y repetir la manga/prueba interrumpida si se perdió el estado.
- Sin créditos ni récords homologados en esta beta hasta disponer de validación servidor.
- Menús y UX compartidos Android/iOS, adaptación PADDOCK premium, notificación de revancha visible y chat compatible multitáctil.
- La rama NO se integra en Google Play ni en Xcode por publicar la PWA.

## Pendiente para una primera prueba real
- Transportes y tablas/RPC seguros, RLS de Realtime y migración revisada.
- Entrada DEV desde el selector de modalidades.
- Conexión de la carrera real de CrafRace, posiciones remotas, reloj y salida.
- Pruebas de conexión con dos móviles, pérdida de red, reentrada, salida, revancha y resultados.
- Verificar después GitHub Actions y publicación real antes de invitar a probar.

Prueba de regresión de este primer núcleo: node scripts/craftrace-live-protocol-smoke.mjs
