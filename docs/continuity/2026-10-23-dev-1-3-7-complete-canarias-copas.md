# DEV 1.3.7 — Karting Canarias: ocho copas terminadas

Fecha: 23/10/2026 · main · DEV PWA únicamente.

## Decisión de producto
El propietario pregunta si es necesario renombrar el sistema: **NO**. Continuamos llamándolo **Copas** tanto en Environment Studio como en la conversación; internamente sigue `canopyZones` y `photo-canopy`, aunque en otros circuitos se utilice también para puentes peatonales, marquesinas, voladizos, estructuras que no se pueden recorrer y otros objetos sobre la pista. Renombrar no aporta funcionalidad y arriesga compatibilidad sin necesidad. Puentes transitables/cruces a distinta altura quedan para una futura ampliación. Los vehículos seguirán sin colisionar entre sí.

## Entrega del propietario
El propietario terminó un proyecto de Environment Studio `karting-canarias-4096.environment(2).json` (formato de exportación Studio v8), con **8 zonas** de `photo-canopy`, 405 vértices en total:
- `canarias-left-straight-canopy-1`: 76 nodos (primera copa aprobada de 1.3.6)
- `canopy-1792784376405-3`: 56 nodos
- `canopy-1792784701097-3`: 47 nodos
- `canopy-1792784766920-4`: 33 nodos
- `canopy-1792784796662-5`: 16 nodos
- `canopy-1792784957893-5`: 118 nodos
- `canopy-1792785008087-6`: 38 nodos
- `canopy-1792785047309-7`: 21 nodos

Todas las zonas tienen opacidad 0.93, están dentro del mundo 4096×6144, área significativa, sin autointersecciones y dentro de los límites del editor (≤240 nodos según motor; el editor limita el borrador a 120 y la mayor tiene 118). Se cargan igual en ambos sentidos, normal e inverso, del circuito físico.

## Integración prudente
- Se reemplazó **solo** el campo `canopyZones` del `src/game/tracks/library/karting-canarias-4096/karting-canarias-4096.environment.json` oficial con el array completo del archivo del usuario, **sin redondear coordenadas ni borrar zonas pequeñas**. El esquema instalado sigue `version:7` para compatibilidad.
- El archivo entregado incluye además un cambio en la primera línea Bézier de colisión: pasa de **28 a 29 nodos** y modifica el tramo cercano. Como el usuario entregó el archivo expresamente para las **copas**, esa modificación no se aplicó a las colisiones de la pista hasta una orden separada. Se conservaron las 5 líneas Bézier (conteo de nodos [28,2,8,3,4]), la zona sólida, meta, foto y los elementos existentes. **Si solicita corregir alguna colisión, comparar la versión nueva del JSON con el oficial; no descartar silenciosamente esta diferencia.**
- El botón de `EnvironmentBuilderCanopyOcclusionScene.js` sigue llamándose **«Copas»**, ahora muestra `CARGAR 8 COPAS CANARIAS`. Al pulsarlo importa únicamente las ocho copas oficiales y pregunta antes de reemplazar copas locales; las colisiones y el resto del proyecto quedan intactos.
- `scripts/environment-canopy-occlusion-smoke.mjs` verifica ocho máscaras, firma de nodos exacta [76,56,47,33,16,118,38,21], validez geométrica, no alteración de colisiones ni formato de environment, interfaz de importación, ruta y liberación de recursos.
- Versión visible `DEV 1.3.7`. Google Play 1.2.335 (vc10) y APK/AAB intactos.

## Aceptación pendiente
Prueba visual real en iPhone/Android, normal e inverso, para verificar que los 8 recortes reproducen las ramas y no oscurecen indebidamente el coche; medir rendimiento, comparar con la versión anterior. Build de GitHub Actions no sustituye prueba visual.
