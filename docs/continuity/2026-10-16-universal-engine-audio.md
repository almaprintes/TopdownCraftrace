# DEV 1.2.237 — sonido de motor universal CC0 para todos los coches

Fecha: 16 de octubre de 2026. Rama única: `main`. Solo DEV, sin publicación Google Play.

## Decisión y fuentes

El propietario aprobó probar un solo **buen sonido de motor, coherente para todos los coches**.
No se han añadido librerías ni archivos de audio externos: se reutilizan los seis WAV CC0 de `public/assets/audio/engine/spark/`, procedentes de [OpenGameArt: Racing Car Engine Sound Loops](https://opengameart.org/content/racing-car-engine-sound-loops) (autor domasx2, CC0). La verificación de formato y hashes SHA-256 ya existe en `scripts/spark-engine-audio-smoke.mjs`.

Se examinaron alternativas públicas GitHub: `buntine/CarEngines` tiene el **mismo SHA de blob** de Jeep que ya existe en el repositorio, por lo que no aportaría mejora; `markeasting/engine-audio` tiene bancos multicapas más pesados cuya procedencia/licencias individuales necesitarían auditoría de assets; `VinZu17/Engine-Sound-Simulator` ofrece un sintetizador procedural, pero ya tenemos un AudioWorklet equivalente y grabaciones reales. Unificar el banco CC0 existente minimiza descargas, riesgo de copyright y coste de rendimiento.

## Diseño implementado

- Nuevo perfil `TDR_RACE_UNIVERSAL` en `src/game/audio/EngineAudioProfiles.js`: banco de seis muestras reales, RPM 1000→7500, crossfade *equal-power* en solo dos voces audibles, pitch y resonancia acústica suavizados, volumen y tono dependientes de gas y velocidad real.
- Función pura `selectEngineAudioProfile(carId,requested,{dev})`: para **todos los IDs definidos en CAR_SPECS**, el perfil de DEV es universal. Para `dev:false`, Spark mantiene su modo original, Gripline su perfil afinado, Vortex su Jeep y otros el modo procedural. No se modifican `carSpecs.js`, la selección de coche, la conducción ni los parámetros de física.
- `CarEngineSampleRuntime.js` invoca la selección antes de priorizar el fallback Spark. La activación depende de `!IS_PROD_BUILD`, no de URL manipulable ni de ajustes almacenados. El usuario escucha el mismo banco en todas las carreras DEV.
- WebAudio local único por carrera: seis `AudioBufferSourceNode` sincronizados con un mismo reloj; dos mezclados, el resto en silencio. Ignición CC0 existente, prefade, master, motor y efectos respetan Settings. Se preserva la desconexión al salir/terminar carrera y pausa/rewarded/ad focus en móviles.
- Ningún recurso descargado desde GitHub Raw durante la carrera; 0 WAV adicionales, 0 dependencias nuevas, sin red aparte de los WAV locales existentes.

## Comprobación

`npm run check:spark-engine-audio` valida la integridad de WAV, todos los coches en DEV, modo producción sin cambios, ralentí, aceleración parado, subida de RPM por velocidad, caída al levantar gas, mezcla de dos capas, potencia constante, límite de pitch y limpieza del audio al cerrar.

**Pendiente de prueba auditiva humana**: iPhone 12, Redmi 2201117TY y uno o dos coches distintos, probar aceleración antes del semáforo, gas a fondo, soltar gas, resultado final y cambio de app. Una prueba de código y CI no demuestran por sí solas que al propietario le guste el timbre.
