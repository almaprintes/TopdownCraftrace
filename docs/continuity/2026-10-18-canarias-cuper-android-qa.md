# DEV 1.2.266 — Canarias 4096 / Crown Cuper / Android real ads QA

- Corrected source committed: src/game/tracks/library/karting-canarias-4096/source/karting-canarias-4096.tdrtrack; SHA256 1c3e92545c12e0b9941f10e81f8ca6c58e233c909e59005c465507d3b90bc086.
- Prebuild installer generates track.json, 8 static original-resolution 2048x1536 photographic WebP tiles and selector image. No runtime culling or x2.5 scaling.
- One Canarias is visible in DEV and Android release payload: karting-canarias-4096. Original and Narrow70 sources preserved for rollback, not displayed. Migrate only selected track localStorage, NOT historical times or ghosts.
- Three original checkpoint gates stay in metadata but the race enforces the first and last (two). Start/finish static checkerboard is at authored gate. Validate lap counting on hardware.
- Crown Cuper: 14 permanent stages, Gripline real 500km odometer after induction to unlock campaign, Cuper original at stage 2, gold skin at stage 14; stage 12 requires verified native rewarded ad and online record server ACK. Visible km/500, bar, and remaining mileage on lobby when gated.
- Android QA uses minified, signed deviceTestRelease with real AdMob and RevenueCat, isolated .rewardedtest package and no MEDIR. No AAB, no Play upload. Avoid repetitive testing of live ad inventory; use registered test devices for multiple runs.
- Physical acceptance still necessary: complete Canarias laps, compare visual clarity/performance and heat, record publication with real SSV, rewards/recycler/garage/skins and player backup. Green CI does not prove ad completion.
- Public Play 1.1.188 versionCode 8 unchanged; new publication only after explicit approval.
