# Campus V5 preview release

Publish the three runtime modules from the user's `campus_v5_hires_upgrade.zip` without substituting an older campus. The Git blob hashes match the local source files exactly; see `version.json`.

Base: `57fcd2667c2f62ddd63d1811fd86b5d4cc9eaab3` (the accepted V3 review branch), not the separate implementation on `main`.

Keep the existing HTML, CSS, interface script and journey controller unchanged. Target a NEW Vercel preview, not an existing production alias.

## Pre-publication checks
- Node.js syntax checks passed for all three new runtime modules.
- All relative imports between the three modules resolve in the staged release.
- Uploaded Git blob hashes match the staged source hashes.
- Do not reuse V3/V4 screenshots or geometry counts as V5 evidence. The images in the previous upgrade archive were inherited and were not newly rendered for V5.
- The inherited `tests/campus-contract.js` and `CAMPUS_V3.md` describe the V3 baseline. Their hard-coded table count and triangle budget are not V5 acceptance results.
- Full-browser V5 rendering, collision/placement checks, mobile quality and physical-device performance are NOT certified by the syntax checks.

## Publishing
Serve the entire repository root as a static site with the existing `vercel.json`. Include `campus-water.js` and `version.json`. Preserve all approved interface files. Verify the deployed `version.json` and runtime hashes before declaring source parity. A deployment-created response is not a live-browser verification.
