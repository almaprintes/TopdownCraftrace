# TrackStudio iPhone crash fix — DEV 1.2.103 (11/10/2026)

## Evidence
Two consecutive real iPhone diagnostic screenshots after DEV 1.2.101 and 1.2.102 show a crash in TrackStudioScene during Phaser Text.setText -> updateText -> Frame.setSize -> Frame.updateUVs.
DEV 1.2.102's screenshot specifically identifies TrackStudioScene._updatePanel during pointerup. This is the legacy panel, not the new shape-only inspector.

## Root cause and scope
DEV 1.2.102 replaced only the boundary editor's inspector with DOM. Whenever shape edit was off, the wrapper called originalPanel(), which still updated Phaser Text on every pointerup.
That produces the same fault path for classic centerline and piano selection.

## Corrective actions
- Make the entire TrackStudio properties inspector DOM-backed for **all** modes: no selection, classic centerline, pianos and independently editable shape boundaries.
- Remove the obsolete original Phaser Text panel implementation from TrackStudioScene and leave a harmless initialization stub, so accidentally falling back to it cannot trigger the UV crash.
- Keep visible information and existing piano/node delete and nudge buttons.
- Preserve the old image, centerline, both edge shapes, save/restore history, and screen-to-world coordinates untouched.
- Expand the current regression test to check every inspector branch and ensure neither inspector wrapper nor the scene's original method calls Phaser Text.setText.
- Publish on main only, PWA only; no SDK/Android release. The Play Store version remains 1.1.188.

## Acceptance
1. Open the user's existing .tdrtrack on iPhone.
2. Select classic centerline points and pianos with AJUSTAR off; no crash.
3. Activate AJUSTAR, select both independent edges, drag node and handle, release; no crash.
4. Exit and reload; saved geometry remains identical.
5. GitHub Build and Deploy must be green for the exact DEV HEAD.

Real-device smoke remains necessary: GitHub Actions is not a substitute for iPhone touch/WebGL behavior.
