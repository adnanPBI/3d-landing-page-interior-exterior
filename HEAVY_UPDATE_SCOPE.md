# ZIP Heavy Update - Approved-Scope Integration

Input ZIP SHA256: 9a82c1196731adc0024fe27fb7ffed9ff2da8187df2776d41079eab2b8e643e0.

Integrated: richer existing industrial halls, additional headquarters interior INSIDE the EXISTING office, improved indoor floors, equipment, textures, lights and animations. Extended camera controls stay inside the original Free Explore panel.

Intentionally excluded: new BESS/substation, hydrogen pilot plant, exterior EV carport structures/vehicles, outdoor materials/water changes, new floating global orbit dock, and any movement or resizing of the existing campus.

The normal WebGL browser experience remains the main presentation mode. The ZIP does not implement headset WebXR.

Source QA and actual browser QA must pass before publication.

## Acceptance and limitations
Windows Chrome WebGL2 browser smoke test: six existing interiors enter/walk/exit successfully, with no JS page errors or failed network requests. Source-preservation checks pass.
Legacy exterior tests include historical assertions that fail on unchanged baseline source, and some require unavailable npm three; not corrected here because the approved exterior cannot be modified.
Mobile FPS, end-to-end visual collisions, WebXR headset validation, and live production browser authentication have not been certified.
