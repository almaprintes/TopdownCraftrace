# Mastery roof calibration — reproducible admin workflow

Official source: `src/game/stats/masteryRoofCalibration.json` on `main`.
The file is compiled into every game's DEV build: **the same positions reach
every player only after review and a green Build + Deploy**.

## Where to edit

1. Enter DEV Admin Hub → **EDITAR COCHES**.
2. Select the car → **EDITAR COCHE**.
3. In the premium parameter editor, open **★ MAESTRÍA / TECHO**.
4. Choose one of the nine shield levels and calibrate **LOBBY** / **CARRERA**
   separately, with each car's own image displayed.
5. Arrow presses adjust ±2 pixels at the editor's displayed car scale.
   **+1/−1 PX** adjusts badge diameter, and **↶ 90° / 90° ↷** changes orientation
   (0°,90°,180°,270°), accommodating cars facing the opposite direction.
6. Calibrate each car independently. Changes immediately appear in the admin
   preview, and remain stored as **local draft**. The regular player game is not
   modified until the export is committed to GitHub.
7. Press **EXPORTAR JSON** and send the file
   `tdr-mastery-roof-calibration.json` to the project chat.
8. Import that file by replacing `src/game/stats/masteryRoofCalibration.json`
   on `main`, after validating the schema and the known car IDs.
9. Verify both in-lobby and in-race positions on different aspect ratios.
   Pass all CI checks and confirm the same exact SHA has successful **build**
   and **deploy**, then deliver the new DEV version.

## Schema / coordinate semantics

```json
{
  "schema_version": 1,
  "units": "car_short_axis_ratio",
  "cars": {
    "helix_spark": {
      "lobby": {"x": 0.0, "y": 0.0, "size": 0.0, "rotation": 0},
      "race":  {"x": 0.0, "y": 0.0, "size": 0.0, "rotation": 180}
    }
  }
}
```

`x` and `y` are offsets relative to the car's *painted short axis*
(not viewport percentages). `size` is additive size relative to that same
axis, and `rotation` is in degrees. Positive X means right; positive Y means
down. The editor converts 2-pixel/1-pixel presses into these ratios, so the
visual relationship is preserved across devices. Unlisted cars use the
baseline placement.

The editor uses the lobby WebP image in both previews; the race panel
approximates its proportional in-game sizing. Always check the actual
in-race result before declaring a car calibrated.

**No physics or car stat overrides belong in this file.** The file is not a
player setting and should never be written by the player in production.

## Rollback

Reset positions for one view/car in the editor and export again, or revert
the matching JSON keys in Git. Do not overwrite the unrelated car handling
settings or the user's profile data.
