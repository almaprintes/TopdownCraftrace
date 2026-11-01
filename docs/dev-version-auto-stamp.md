# DEV versioning — automatic GitHub Pages releases

- Source fallback `index.html` = **DEV 1.4.10**, for local development and static tests.
- Only the `Deploy Top Down Race` workflow on GitHub Actions stamps the **deployed** DEV HTML after production boundary tests, using `GITHUB_RUN_NUMBER`. The anchor is run **5675 → DEV 1.4.9**; run **5676 → DEV 1.4.10**, run **5677 → DEV 1.4.11**, etc.
- No commit loop: the script changes only the temporary CI checkout, before `npx vite build --base=/TopdownCraftrace/dev/`. This also means that a failed/cancelled run can consume a patch number without publishing it, intentionally (uniqueness over contiguous releases).
- The game reads the stamped meta `tdr-dev-version` into the existing version badge, orientation overlay and diagnostic version. `/dev/` and `/dev-live/` are always built from the same stamped artifact.
- The real deployed source commit is separately recorded in `dev-build.txt` as `DEV_SOURCE_SHA`. Use both displayed DEV version and SHA in support issues.
- **Android Play** and **iOS local** are **not versioned by this script**. `npm run build:prod` runs before stamp and must not consume DEV build number.
- Run `node scripts/dev-version-stamp-smoke.mjs` or the standard `npm run prebuild` to validate; Pages step additionally verifies the actual bundle contains the expected meta.
- This approach avoids automatic `git push` on every build and needs no new token or elevated GitHub permission.
