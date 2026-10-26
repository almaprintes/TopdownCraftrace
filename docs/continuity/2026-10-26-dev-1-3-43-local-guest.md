# DEV 1.3.43 · Alta local sin cuenta

**Alcance entregado:** Nuevas instalaciones guardan nick y geografía directamente en almacenamiento local y no crean usuario anónimo de Supabase. El usuario puede conducir, comprar, progresar y utilizar rewarded ads sin una cuenta; los anuncios siguen sujetos a consentimiento, disponibilidad y verificación nativa. La reserva global del nick y la publicación de tiempos requieren credenciales online. Se conserva intacta la identidad anónima de usuarios existentes para una futura conversión segura; una sesión eliminada no se reemplaza.

**UX:** Botón claro «JUGAR SIN CUENTA», Cuenta con estado «Partida en este dispositivo», lobby «PARTIDA LOCAL» y copia JSON. Opciones avanzadas antiguas permanecen plegadas para compatibilidad. En iPhone, la descarga JSON no tiene confirmación nativa de archivo guardado.

**Pendiente antes de ofrecer Google/Apple como botones reales:** configurar OAuth Google y Apple en Supabase y plataformas, integrar inicio/vinculación de sesión web y nativa, validar callback/ID tokens y RLS, verificar que el mismo UUID se conserva o que el nuevo es el esperado, comprobar copia completa de progreso y resolver colisiones de nick sin transferir cuentas existentes. Probar Android/iPhone/PWA con recuperación y reinstalación segura. Hasta entonces **no afirmar que una partida local está protegida en la nube**.

Sin cambios de datos Supabase, circuitos, coches, ghosts, IA o APK/AAB.

**Ajuste de seguimiento (misma iteración .43):** el texto geográfico inicial muestra «TU REGIÓN» y explicación de guardado local, sin prometer ranking antes de autenticar. Corregido el verificador de firma QA para comparar semver >=1.2.317 también en ramas DEV 1.3+; ninguna condición de firma/certificado se ha relajado.
