# DEV 1.3.11 — Sustitución del volante por dirección táctil

Decisión del propietario (23/10/2026): retirar el método VOLANTE, mantener PALANCA y BOTONES; la tercera opción será DIRECCIÓN TÁCTIL.

## Implementación
- `RaceWheelModeScene.js`: conserva internamente `steeringMode: 'wheel'` solo por compatibilidad con partidas y preferencias existentes; ahora genera una banda táctil horizontal en vez del volante gráfico.
- Primer contacto neutral en cualquier punto; arrastre horizontal con `pointer capture`; curva progresiva, umbral de movimiento y sensibilidad/inversión existentes; giro analógico -1..1; liberación/cancelación centra y elimina la captura; sin RAF ni temporizadores adicionales.
- `SettingsWheelModeScene.js` y `SettingsDomScene.js`: nombre visible DIRECCIÓN TÁCTIL y representación rectangular en la calibración.
- Se conserva la entrega de dirección a las mismas físicas de los coches a través de `_tdrWheelSteer`, sin tocar parámetros de vehículos, récords, anuncios ni Supabase.
- Identificador visible de la DEV: 1.3.11.

## Pendiente de validación
- Probar iPhone y Android, con acelerador/freno de mano multitáctil, inversión, controles zurdos, cambio de dirección rápido, soltar/cancelar, marcha atrás y variante normal/inversa.
- Confirmar compilación y GitHub Pages; los commits no equivalen a pruebas en dispositivo.
- Comprobar en la calibración que la zona y hitbox del nuevo rectángulo siguen coincidiendo tras mover el control.
- No generar APK/AAB ni publicar Play sin petición explícita.
