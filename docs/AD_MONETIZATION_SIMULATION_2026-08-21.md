# Simulación de monetización por rewarded ads

Fecha: 2026-08-21
Estado: modelo de planificación, no ingresos garantizados

## Qué se monetiza realmente

Google AdMob / redes publicitarias son quienes sirven los anuncios y generan el ingreso. RevenueCat no paga un eCPM adicional: desde 2026 puede recibir eventos de impresiones e ingresos de AdMob/AppLovin y mostrarlos junto con compras/suscripciones. Por tanto, RevenueCat se usará como capa de tracking/unificación, no como una segunda fuente de ingreso por impresión.

## Benchmark externo usado

Fuente de referencia: Appodeal eCPM Report 2025 (datos Q4 2024, 100.000+ apps, 70+ redes, 200+ mil millones de visualizaciones). En Rewarded Video, Europa se situó aproximadamente alrededor de 5 USD eCPM en Android y 9 USD eCPM en iOS; iOS y los mercados premium tienden a rendir más. Google AdMob define eCPM como ingresos / impresiones × 1.000 y dispone de eCPM Trends para comparar con apps similares.

Para no vendernos humo, se modelan tres franjas de planificación:

- **Baja: 3 USD eCPM**
- **Base: 7 USD eCPM**
- **Alta: 12 USD eCPM**

No son tarifas garantizadas de AdMob. Son escenarios de sensibilidad razonables alrededor del benchmark europeo de rewarded video y contemplan mezcla de plataforma, país, estacionalidad, fill y demanda.

## Perfiles de uso del anuncio post-carrera

El anuncio duplica exactamente el botín ya obtenido; no vuelve a tirar RNG.

Tres perfiles:

1. **0 %**: nunca duplica.
2. **50 %**: duplica una de cada dos carreras de media.
3. **100 %**: duplica todas las carreras posibles.

Duración operativa usada: 6 min por carrera completa + 30 s por rewarded visto.

## Progresión estimada por un coche

Las sesiones para los tiers altos se aproximan por el multiplicador efectivo de botín del perfil: 1,0× / 1,5× / 2,0×. Street mantiene la calibración específica de onboarding.

| Perfil | Tier | Carreras acumuladas | Rewarded post-carrera | Tiempo total aprox. |
|---|---|---:|---:|---:|
| 0 % | Street | 2,95 | 0 | 0,30 h |
| 0 % | Sport | 62 | 0 | 6,20 h |
| 0 % | Racing | 310 | 0 | 31,00 h |
| 0 % | Prototype | 1.022 | 0 | 102,20 h |
| 50 % | Street | 2,30 | 1,15 | 0,24 h |
| 50 % | Sport | 41,3 | 20,7 | 4,30 h |
| 50 % | Racing | 206,7 | 103,4 | 21,53 h |
| 50 % | Prototype | 681,3 | 340,7 | 70,97 h |
| 100 % | Street | 1,86 | 1,86 | 0,20 h |
| 100 % | Sport | 31 | 31 | 3,36 h |
| 100 % | Racing | 155 | 155 | 16,79 h |
| 100 % | Prototype | 511 | 511 | 55,36 h |

## Ingreso publicitario estimado acumulado por un coche

Fórmula: `ingreso = impresiones / 1000 × eCPM`.

| Perfil | Tier | Impresiones | eCPM 3 USD | eCPM 7 USD | eCPM 12 USD |
|---|---|---:|---:|---:|---:|
| 50 % | Street | 1,15 | $0,003 | $0,008 | $0,014 |
| 50 % | Sport | 20,7 | $0,06 | $0,14 | $0,25 |
| 50 % | Racing | 103,4 | $0,31 | $0,72 | $1,24 |
| 50 % | Prototype | 340,7 | **$1,02** | **$2,38** | **$4,09** |
| 100 % | Street | 1,86 | $0,006 | $0,013 | $0,022 |
| 100 % | Sport | 31 | $0,09 | $0,22 | $0,37 |
| 100 % | Racing | 155 | $0,47 | $1,09 | $1,86 |
| 100 % | Prototype | 511 | **$1,53** | **$3,58** | **$6,13** |

## Extrapolación a 15 coches

Si un jugador maxea los 15 coches con comportamiento similar y sin reutilización compartida de piezas/materiales entre coches:

### Perfil 50 %

- Rewarded post-carrera: ~5.110 impresiones.
- Ingreso a 3 USD eCPM: ~$15,33.
- Ingreso a 7 USD eCPM: ~$35,77.
- Ingreso a 12 USD eCPM: ~$61,32.

### Perfil 100 %

- Rewarded post-carrera: 7.665 impresiones.
- Ingreso a 3 USD eCPM: ~$23,00.
- Ingreso a 7 USD eCPM: ~$53,66.
- Ingreso a 12 USD eCPM: ~$91,98.

## Rewarded adicional cada 4 horas

La tienda contempla además una recompensa de monedas cada 4 horas. Esta impresión es independiente del anuncio de duplicación post-carrera y debe medirse por separado.

Si un jugador la reclama siempre durante su progreso Prototype, añadiría aproximadamente:

- perfil 0 %: ~25 impresiones adicionales por coche;
- perfil 50 %: ~17 adicionales;
- perfil 100 %: ~13 adicionales.

Su impacto económico es pequeño frente a cientos de anuncios post-carrera, pero aumenta la recurrencia y debe aparecer como placement separado en AdMob/RevenueCat.

## Variables que deben entrar en telemetría / vuelco de datos

Por jugador y por cohorte registrar:

- carreras iniciadas y completadas;
- tier máximo alcanzado por coche;
- horas activas acumuladas;
- rewarded post-carrera ofrecidos;
- rewarded post-carrera iniciados;
- rewarded completados;
- tasa de aceptación del rewarded;
- botín base de cada carrera;
- botín duplicado entregado;
- rewarded de 4 h reclamados;
- impresiones totales por placement;
- fill rate;
- eCPM real por placement;
- ingreso publicitario real por jugador;
- ARPDAU publicitario;
- país/región;
- plataforma iOS/Android;
- versión de app;
- tiempo hasta Street/Sport/Racing/Prototype;
- compras IAP y monedas compradas, para medir monetización híbrida sin doble contabilización.

## RevenueCat

RevenueCat Ad Monetization (beta en 2026) puede recibir eventos de AdMob a nivel de impresión y mostrar Ad Impressions, Ad Revenue, Ad eCPM, fill rate, CTR, Ad ARPDAU y usuarios monetizados. RevenueCat advierte que sus cifras en tiempo real pueden diferir de las del mediador/red por deduplicación, fraude y postprocesado; AdMob debe considerarse la fuente final para conciliación publicitaria.

La monetización por anuncios no cuenta actualmente para el Monthly Tracked Revenue (MTR) de RevenueCat mientras la función permanezca en ese estado beta, por lo que no debe modelarse una comisión de RevenueCat sobre este ingreso publicitario en esta simulación.

## Decisión de diseño

El modelo base de negocio debe trabajar al menos con las tres franjas de eCPM anteriores y con tres tasas de aceptación 0/50/100 %. Nunca presupuestar ingresos usando solo el escenario alto. El escenario Base (7 USD eCPM) es la referencia operativa inicial para rewarded video europeo, a sustituir cuanto antes por eCPM real de nuestros propios placements tras lanzamiento.
