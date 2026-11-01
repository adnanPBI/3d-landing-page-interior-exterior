# Convalt Energy — Interior + Exterior WebGL Campus

An explorable, conceptual architectural experience that faithfully preserves the approved Convalt Energy exterior and adds five walkable industrial interiors.

## Baseline and protected scope

- Original source: adnanPBI/3d-landing-page-energy-company at commit b1de42b2d9b321df9633707a4c2c242e1252a1ae.
- New independent project: this repository. The original repository is unchanged.
- All original files, tests, docs and the original AGPL-3.0 license are mirrored here.
- Byte-identical exterior campus.js, index.html, and styles.css. All existing external geometry and coordinates stay unchanged.
- Conceptual visualization only, not an engineering digital twin or live operational telemetry.

## Five new interiors inside existing building shells

| Interior | Center X,Z | Existing envelope in meters | Illustrative content |
| --- | --- | --- | --- |
| Manufacturing | -16,35 | 34 x 18 x 7 | Production machines and safety aisles |
| Compute Hall 01 | 11,-45 | 29 x 9 x 6.4 | Server cabinets and lighting |
| Compute Hall 02 | 11,-58 | 29 x 9 x 6.4 | Cooling and compute equipment |
| Compute Hall 03 | 11,-71 | 29 x 9 x 6.4 | Network and electrical infrastructure |
| Recycling | -12,-89 | 27 x 17 x 6.8 | Sorting stations and inspection lanes |

The new campus-interiors.js contains procedural details, wall/floor finishes, collision volumes, and motion for selected machinery. Interiors stay hidden until entered and do not move or remove exterior meshes.

## Controls

1. Use the original scroll-driven cinematic chapters or click Explore.
2. Drag to orbit, wheel to zoom and pan across the bounded exterior island.
3. In the existing Free Explore glass panel, pick a building in Facility Navigator.
4. Focus exterior for a closer look or Enter interior for a first-person tour.
5. Indoors: WASD or arrow keys to walk; drag the canvas to look; Shift moves faster.
6. On mobile use the direction-pad buttons.
7. Exit to exterior orbit restores the earlier view. Esc exits the room, then Explore.
8. Resume cinematic journey returns to the original story.
9. The optional Golden hour atmosphere changes light only; default daylight is unchanged.

## Runtime

Static Three.js 0.186.0 application using the original pinned CDN import map. No npm install or build step is required.

Start a local HTTP server from the repository root, for example:

~~~sh
python -m http.server 8000
~~~

Open http://localhost:8000. For Vercel, use Framework Preset Other, root directory at repository root, no build command and output directory dot.

## Validation

Run Node.js 22 or later:

~~~sh
node --check app.js
node --check scene.js
node --check campus-interiors.js
node --check explore-ui.js
node --test tests/interior-explore-contract.mjs
~~~

GitHub Actions performs source syntax and integrity checks. Source checks cannot verify that WebGL rendered. Before calling the edition fully visually verified, perform real browser QA: all six exterior chapters and all five interiors, WebGL initialization and console errors, both high/lite quality modes, touch and keyboard, collision and exit/resume, and matched-camera exterior screenshots.

See version.json for the exact original commit, preserved blob hashes and edition revision. Original license and historical documentation remain available.
