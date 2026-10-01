# TAS — implementation state

## 2026-10-01 · Phase 1

The repository now has the canonical campaign structure and a small runtime contract for campaign/slot naming.

Created:
- `public/assets/advertising/campaigns/default/campaign.json`
- `public/assets/advertising/campaigns/almaprint/campaign.json`
- `src/game/advertising/trackAdvertising.js`

No existing circuit has been modified yet and no advertising artwork has been baked into a track.

### Next vertical slice
Use `karting-tenerife` as the first pilot only after the neutral support artwork is available:
1. add one BILLBOARD slot;
2. add two FLAG slots;
3. add one TRACKSIDE/BARRIER slot;
4. make Race runtime resolve the selected campaign with fallback to `default`;
5. verify switching campaign requires no JavaScript change;
6. then expose the same slot editing in Production Studio.

This order preserves the TAS law: the circuit owns slots; the campaign owns images.
