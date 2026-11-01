# 3D Landing Page — Energy Company

Corporate concept prototype for a **hybrid real-time cinematic WebGL** landing page.

## Interaction

- Scroll / trackpad: cinematic travel through six authored scene beats
- Explore: hands the same WebGL camera to bounded OrbitControls
- Drag: orbit the current hero environment
- Mouse wheel while exploring: dolly in/out
- Escape / Resume: return to the authored cinematic camera path

## Rendering

The prototype uses Three.js with ACES tone mapping, PBR materials, adaptive soft shadows, bloom and SMAA on capable devices, plus a lighter rendering path for constrained hardware.

## Hosting

This repository is a zero-build static prototype suitable for Vercel. `index.html` loads Three.js ES modules from jsDelivr using an import map.

## Production next step

Replace the procedural hero geometry with approved architectural GLB assets (LOD0/LOD1/LOD2/proxy) and KTX2 PBR texture sets while preserving the current interaction and camera architecture.
