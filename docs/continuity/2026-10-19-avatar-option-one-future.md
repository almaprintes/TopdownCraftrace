# TOP DOWN RACE — Avatares (decisión de producto)

**Aprobado el 19/10/2026 para una actualización futura. NO implementar hoy.**

- Opción 1: catálogo inicial de **24 avatares prediseñados**, bustos/cabezas de pilotos con cascos arcade y estética coherente con Top Down Race. Familias sugeridas: clásico, futurista, urbano, rally, neón y retro (4 variantes por familia).
- Cada retrato, **WebP de 256 × 256 con transparencia**, integrado en assets locales (`public/assets/avatars/avatar_001.webp` … `avatar_024.webp`), sin subida de fotos ni almacenamiento de imágenes en Supabase.
- Configuración → Cuenta: mostrar avatar con nick e insignia; botón **CAMBIAR AVATAR**, cuadrícula, vista previa y **GUARDAR AVATAR**. No mezclar el selector con seguridad ni recuperación de identidad.
- Mostrar avatar en lobby, perfil y listas de tiempos/Race Control, sin sustituir coches, skins ni insignias acreditadas.
- Persistir solo `avatarId` validado en local + copia de progreso + campo de perfil Supabase asociado al **UUID autenticado**; un único avatar por piloto, sin consultas individuales por fila de clasificación.
- Compatibilidad: perfiles sin `avatarId`, selección inválida o recurso ausente usan el emblema TDR actual; nunca provocar imagen rota ni borrar progreso.
- Pruebas antes de publicar: existencia y canal alfa de los 24 recursos, sincronización, compatibilidad, pantalla horizontal iPhone, Android, peso de descarga y velocidad.
- No incluidos: fotos propias, editor modular, marcos premium, avatares de temporada, contenido generado por usuario ni moderación.
- Fases posteriores solo si se autorizan. No convertir esta decisión en tareas de la publicación de hoy (19/10/2026).
