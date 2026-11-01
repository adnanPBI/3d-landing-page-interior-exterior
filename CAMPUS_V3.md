# Campus V3 architectural pass

Revision: campus-v3-architectural-20260917.

## Scope
Only the Three.js environment and renderer integration change. index.html, styles.css and app.js are deliberately inherited unchanged from c1f996f201b4945b6cf7c6a9eff9c19a083271c4. Existing navigation, corporate copy, right-side glass card and bottom chapter rail remain intact. No other repository is involved.

## What is authored
- Ribbed manufacturing halls, facade seams, clerestory glazing, loading-bay doors and canopies, rooftop photovoltaic tables and HVAC equipment.
- A framed curtain-wall office rather than a transparent solid block.
- 71 solar tables: separate cell surface, backing, four perimeter rails, supporting structure and inverter equipment. The cell surface is never covered by a solid metal frame. Field tables no longer rotate as entire rows.
- Three turbines with one yaw-head/shaft/rotor hierarchy and tapered blades. Only the rotor spins.
- Three data-center halls, facade fins, screened cooling equipment, roof fan rotors, generators and pipework.
- Open recycling process shed, supported recovery drum, elevated walkway and yellow guardrails, roller conveyors, material bins and silos.
- Textured terrain, irregular rocky edges, multi-cluster trees, hedges, planted beds, pond, pedestrian paving, marked asphalt, curbs, parking and vehicles.
- Outdoor sky environment for PMREM reflections, tuned daylight, soft shadow maps, toned-down bloom and adaptive post-processing fallback.

## Source
campus.js owns the architectural geometry and shared lighting. campus-materials.js owns deterministic CanvasTexture maps, material response and physical building signs. scene.js owns camera handoff, rendering and disposal.

All geometry is authored procedurally and remains editable in source. This is an architectural concept model, not a surveyed digital twin or a photogrammetric asset set. No AI-generated background image or prerecorded movie replaces the WebGL campus.

## Validation performed
The exact campus.js and campus-materials.js uploaded to GitHub match the tested local Git blob hashes. JavaScript syntax checks passed. A Chromium/SwiftShader/Xvfb offline WebGL harness using the Three.js renderer bundled in the supplied Grok workspace rendered six journey viewpoints with zero captured JavaScript/render errors. Ten constructed-scene geometry checks passed, including rotor-axis stability through a revolution, 120-degree blade spacing, upward-facing panel surfaces, finite coordinates and the geometry budget.

High-mode geometry: 292484 triangles before shadow passes. 4346 static detail instances in 65 instance batches. Roof-fan parts use separate animated instance batches. These counts do not establish a 60-FPS result on client hardware. The offline harness did not certify the remote CDN loading, fonts, OrbitControls or full post-processing chain. A production browser/laptop acceptance run remains necessary.

For an optional browser geometry check, open the site with ?qa=1 and run:

```js
const { inspectCampus } = await import('./tests/campus-contract.js');
inspectCampus(window.__campusScene.campus);
```

On a deployment with commit-pinned CDN imports, import the test from the same commit-pinned base rather than mixing origins or versions.
