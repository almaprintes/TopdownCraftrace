# TDR — Contrato de físicas y antitrampas (31/10/2026)

**Solo diagnóstico, sin certificación de récords ni cambios de producción.**

Hallazgo verificado en RaceScene: los valores finales de cada coche incluyen
CAR_SPECS, el JSON oficial car_overrides.json, ajustes locales de Car Editor,
niveles de mejora (engine/brakes/tires), Garage Fusion, ajuste DEV y efectos
de superficie. resolveCarParams multiplica maxFwd por 1,40. Crown Cuper suma
un multiplicador 1,20 en su módulo especial. La base de fábrica NO demuestra
qué físico fue usado en una vuelta ni es un límite fiable de sanción.

Nueva implementación: config/online-trusted-physics.json identifica con hashes
de GitHub (blob SHA-1) los cinco archivos de origen. El módulo Node
src/server/trustedVehiclePhysics.js verifica estos archivos, fusiona
los parámetros de fábrica con los parches oficiales publicados, genera
la referencia para los 21 vehículos registrados (incluye 3 bases), y calcula
su huella SHA-256. Si algún archivo cambia, las pruebas FALLAN hasta que
se apruebe de forma explícita un catálogo/edición nuevos.

La función de diagnóstico shadowReviewCarMotion evalúa desplazamiento
instantáneo y por ventanas de al menos 100 ms. Señala saltos importantes,
pero no impone descalificaciones: las mejoras locales y el jitter de captura
no están certificados. Un ID de coche o tuning declarado por el cliente
no permite pasar de shadow-pending a verified.

**Pendiente para certificar:** evidencias de equipamiento y coche controladas
por el servidor, versión fiable de física y reproducción de controles o
simulación autoritativa, calibrada por plataforma y circuito. La grabación
de posiciones puede falsificarse: un hash del cliente no soluciona eso.
Los récords, usuarios, Supabase Free y suspensión de anuncios siguen intactos.

Prueba aislada: node scripts/tdr-vehicle-physics-lab.mjs
en GitHub Actions tdr-postgres-lab.yml.
