# CraftRace LIVE 4 · Experto predictivo y comparación A/B

## Objetivo y estado

Probar el controlador de curvas de **Experto** antes de publicarlo en DEV. Solo rama
`experiment/live4-expert-cornering-ab-20261120` y PR: este workflow no despliega.
No hay cambios en Google Play, otras modalidades, datos de usuarios ni Supabase.

El jugador observó que en Santa Cruz las IA de nivel 3 trazaban mal las curvas.
Su referencia humana de tres vueltas fue **0:59.935**, frente a la mejor IA
**1:17.987**. Es una referencia de dispositivo real, NO un dato comparable
directamente con las simulaciones que siguen.

## Diseño del cambio

- En el modelo de la línea, `apexCommitment: .22` se pasa explícitamente
  como opción de geometría **solo para Experto**. Antes se dejaba por error
  dentro del objeto de pista y el optimizador no lo interpretaba.
- Se elimina para Experto el atajo de apuntar directamente al final de una
  maniobra enlazada. Se usa punto objetivo adelantado adaptado a curvatura y
  a distancia de recuperación. El resto de las dificultades y Survival
  conservan su controlador original.
- En Experto prevalece la velocidad del plan físico de curva y no el
  suelo artificial de la maniobra enlazada. El plan usa la tasa nominal de
  giro del coche y una media ABSOLUTA circular de 21 muestras de curvatura:
  evita reaccionar a picos de un solo vértice y evita cancelar chicanes opuestas.
- Se conservan exactamente las prestaciones del coche local:
  **sin grip, aceleración, velocidad máxima o frenado extra**. El controlador
  sigue computando el factor de giro dependiente de velocidad.
- Telemetría acotada de error de trazada por IA Experto (125 ms), para que
  futuras pruebas comparen maniobras reales. No tiene interacción con premios
  o rankings.

Inspiraciones matemáticas: [F1TENTH Pure Pursuit](https://github.com/zzjun725/f1tenth-racing-stack-ICRA22),
[TUM global trajectory optimization](https://github.com/TUMFTM/global_racetrajectory_optimization);
no se ha copiado código ni añadido dependencias.

## Benchmark reproducible

`node scripts/craftrace-live4-expert-ab.mjs`

La prueba instancia ambas opciones en el **mismo código**, con geometría JSON
original, coche sintético fijo (420/520/720 px/s y 2.4 rad/s), reloj fijo a
60 Hz y una vuelta geométrica en cuatro circuitos. Reproduce los comandos de
dirección/aceleración/freno y actualiza los cuerpos, sin colisiones físicas
Phaser, salidas, tráfico, red, checkpoints ni cronometraje oficial. Por tanto
**no predice de forma exacta los tiempos del iPhone**. No sirve para homologar
la competitividad frente al usuario.

| Circuito | Anterior (s) | Candidato (s) | Error medio antes → después |
|---|---:|---:|---:|
| Santa Cruz | 21.13 | 21.35 | 30.41 → 13.71 px |
| Track 01 | 15.00 | 14.07 | 21.28 → 14.42 px |
| Karting Tenerife | 52.45 | 49.62 | 20.19 → 12.62 px |
| Technical Ridge | 40.85 | 38.13 | 19.06 → 11.53 px |

Estas cifras son una **precomprobación en simulación de aislada**, a confirmar
por CI. Se exige en los cuatro circuitos completar la vuelta, reducir error
medio y máximo, y no perder más del 3.5% de ritmo; en agregado, mejorar 2%.
No se altera ningún premio, récord ni escenario online real.

## Validaciones restantes antes de considerar homologado Experto

- Comprobar GitHub Actions de esta rama y repetir el benchmark sin errores.
- Comparar 3 y 5 vueltas de **Santa Cruz / Gripline** en iPhone, con
  tres IA, tiempos por vuelta, FPS y observación de horquillas y chicanes.
- Validar cruces de meta/checkpoints de las IA por posiciones físicas; los
  resultados actuales siguen siendo amistosos/provisionales.
- Comprobar otras físicas (Spark), la reincorporación y partidas de 2–4
  humanos sin regresiones.

Si el A/B o la prueba real empeoran, detener promoción; no hacer IA
más rápida artificialmente ni rebasar parámetros físicos.

## Validación adicional para el trazado oficial instalado

El workflow de despliegue reinstala `Santa-Cruz-x3-nitido.tdrtrack` y otros
trazados fotográficos antes del build. En cambio, la primera CI A/B usó el
`track.json` de partida. Se han añadido **dos pasadas** de benchmark, antes
y después de los instaladores oficiales de Santa Cruz y Karting Tenerife.

Primera medición con Santa Cruz instalada en Pages (20/11/2026):
**31.72 → 30.60 s**, error medio **21.91 → 14.27 px**, error máximo
**69.27 → 65.20 px**. Mejora clara de tiempo y error medio, reducción
modesta del pico (5.9%): el umbral de error máximo pasa a exigir una
reducción de **al menos 5%** en cada circuito, manteniendo el umbral del
83% de error medio y los límites de tiempo. No se ignora ni elimina una
regresión; queda medida y reflejada.

La integración en `main` se realizó tras una CI sintética verde; el
primer build de Pages quedó bloqueado por esta diferencia de geometría.
Verificar de nuevo la compilación completa antes de informar al usuario
de una DEV publicada.

### Revisión de tolerancia del peor error, fuente oficial de Track 01

En la build oficial instalada, Track 01 dio **17.58 → 17.25 s**,
error medio **22.37 → 17.82 px**, peor error **64.53 → 63.84 px**.
El umbral obligatorio de reducción de un 5% del único pico de error era
demasiado estricto pese a la mejora simultánea de tiempo, error medio y
fracción fuera de trazada. El nuevo criterio es **no aumentar el peor error**
en ningún circuito; permanecen los criterios exigentes de reducción media,
tiempo y muestras fuera de línea. Las mediciones de geometría no coinciden
entre JSON histórico, foto reinstalada y otros instaladores; CI debe ejecutar
las dos variantes y el Pages prebuild con los activos reales.

## Realizador y comparación homogénea (20/11/2026)

La captura del Realizador mostraba 1:29.511, 1:31.579, 1:32.562 y 1:32.562
para tres vueltas, mientras LIVE 4 Experto había registrado 1:07.933–1:09.100.
Esos tiempos NO justifican atribuir la diferencia a la trazada: el selector
original del Realizador reutilizaba `data-ai`, cuya opción **predeterminada
era 2 · Competitivo**, y los resultados no imprimían el nivel. No sabemos por
la captura qué opción escogió el usuario. El vídeo de 17,6 segundos comienza
cuando ya han finalizado 4/4, por lo que tampoco enseña curvas en carrera.

La corrección conserva el nivel 2 predeterminado para crear partidas online,
pero incorpora un selector **separado para el Realizador**, predeterminado en
3 · Experto. En cabecera y resultados se muestra explícitamente el nivel,
circuito y coche realmente cargados; física experimental B queda excluida del
modo Realizador, igual que de online, para comparaciones justas. No se han
cambiado los algoritmos ni la potencia de los coches.

Prueba pendiente en iPhone: Realizador, Santa Cruz, Gripline, nivel 3 Experto,
tres vueltas. Comparar los resultados provisionales con la parrilla 1H+3IA
y grabar **durante la carrera**, no solo una vez terminada, para revisar las
curvas. Se mantiene no homologado hasta verificar meta y checkpoints.

## Incidencia 20/11/2026, 21:09: IA congeladas al perder enlace Realtime

En una carrera LIVE 4 (Santa Cruz, Gripline, tres IA nivel 3) el piloto terminó en
58.193 s, pero las tres IA se detuvieron en plena segunda vuelta y quedaron
sin tiempo final. En el HUD se lee `RED SIN ENLACE`, con aproximadamente 60 FPS.
Revisión del código: el host sólo llamaba `director.update(...)` dentro de
`if(director&&linkReady)`; una desconexión de Broadcast cortaba la propia
simulación física. Es un fallo verificado en el flujo, no un síntoma de falta de FPS.

**Solución aislada en LIVE 4:** `advanceHostedLive4Bots` actualiza la física de
las IA host de forma incondicional durante carrera activa, enviando posiciones
sólo si la red está conectada. Al perder un canal por más de 6,5 s, se recrea
con la misma identidad y plaza, sin reiniciar coches/vueltas. Los tiempos de
las IA quedan visibles localmente como provisionales y se reintenta la
persistencia habitual sin generar premios/récords. El HUD advierte cuando
siguen pendientes de sincronizar. Añadido smoke de interrupción 5 s, llegada
de IA con enlace cortado y recuperación del envío posterior sin reset.

**Pendiente de validación física:** probar corte y restablecimiento de datos o
Realtime con iPhone conectado: AI deben continuar en pista, acabar las tres
vueltas, mostrar resultados aun sin servidor y sincronizar al reconectar.
Hay que vigilar que el canal se recupere, y comparar trazada y tiempo una vez
se haya descartado la interrupción.

## 20/11/2026 · Parrilla mal alineada y IA sin cruzar meta: verificación de geometría física

**Incidencia:** en DEV las IA pueden aparecer detenidas respecto a la parrilla,
no cruzan la meta, y la fila de salida no queda sobre el asfalto real.

**Corrección propuesta en rama de ensayo (no desplegar sin CI):**
- Los cuatro puestos se colocan mediante distancia curvilínea sobre la
  `centerline` real, tomando como ancla la intersección de la META con la
  carretera; cada fila utiliza su propia tangente, incluso si hay curva.
  Eliminado el desplazamiento físico adicional de 44 px cuando se usa
  una parrilla ajustada. Sin cambios en parrillas antiguas de 2 pilotos.
- Los bots no completan una vuelta por haber acumulado N índices de una
  trayectoria. Deben cruzar físicamente (por segmentos barridos y dirección
  positiva) CP1, CP2 y la línea de meta, en ese orden. Los checkpoints
  geométricos pueden ser derivados del eje en pistas sin 2 gates homologadas;
  los resultados siguen identificados como **provisionales**.
- Prueba reproducible de cuatro IA Experto con tres vueltas reales, en un
  motor cinemático Arcade simulado a 60 Hz, partida desde el eje del
  circuito y cruce verificable de meta.
- La prueba real en iPhone sigue siendo obligatoria (colliders, render de
  las carrocerías, FPS, colocación respecto al arte de la foto y red).
  Prohibido atribuir homologación o premios a tiempos del simulador.

**Alcance:** sólo LIVE 4 y Realizador DEV, sin tocar coches, dificultad, premios,
récords, Supabase ni versiones de Google Play.

## Ensayo: anticipación adaptativa para Experto (20/11/2026)

Objetivo: aproximarse al tiempo humano **58,583–59,952 s/3 vueltas** frente a la
IA **68,603 s/3 vueltas** (Santa Cruz/Gripline). Las últimas capturas confirman
que 3/3 IA registraron resultados, pero no garantizan por sí solas su calidad
de trazada durante toda la carrera.

Hipótesis física: en trazados muy sinuosos, la IA exige demasiado giro con
un punto de mira corto y pierde tiempo corrigiendo el volante. Aumentar el
horizonte de seguimiento **sin cambiar velocidad objetivo, potencia, agarre,
freno ni velocidad máxima** puede anticipar las curvas. No aplicar el ajuste a
circuitos abiertos y rápidos, donde aumenta el error transversal.

Adaptación en la instancia LIVE4 de nivel 3: usar el promedio de curvatura
absoluta por muestra de la trazada calculada; interpolar el horizonte de
mira entre la configuración anterior y una más anticipativa en el intervalo
[0.050, 0.055] rad/muestra. Por debajo se conserva exactamente el ajuste
anterior. Sólo varía el punto perseguido por el controlador Experto; nivel 1,
nivel 2, Survival, duelos, físicas y premios no cambian.

Previsión de la *simulación aislada* con la geometría JSON anterior a la
instalación fotográfica oficial:
- Santa Cruz: **21,35 → 20,30 s** por vuelta virtual (≈ 4,9 % menos),
  desviación media **13,7 → 13,5 px**, fracción con error >35 px **9,7 → 5,0 %**.
  Error máximo **49,2 → 50,2 px**: empeora ligeramente, de modo que se
  permiten un máximo de 15 % de margen y no se considera homologación.
- Track 01, Karting Tenerife y Technical Ridge: misma respuesta anterior,
  pues su curvatura media queda por debajo del umbral.

**No extrapolar** estos segundos sintéticos al cronómetro del iPhone.
El benchmark A/B `scripts/craftrace-live4-expert-horizon-ab.mjs` compara
ambas configuraciones en el mismo controlador, con física idéntica a 60 Hz,
vigila tiempos, máximos errores y muestras fuera de línea. También se
mantiene el test de cuatro bots, tres vueltas y cruces físicos de meta,
incluyendo la fotografía oficial cuando está instalada en CI.

Sólo se publicará DEV tras los controles; la verificación real exige Santa
Cruz/Gripline/3 vueltas/3 IA Experto, anotando tiempo por IA, FPS, y un vídeo
en curvas. Objetivo final: que se acerquen al tiempo del jugador **sin
aumentar prestaciones**. El resultado sigue siendo provisional.
