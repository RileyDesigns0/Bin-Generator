# Formnest — scan to insertion-safe bin

**Download the ready-to-open app:** [Formnest.html](https://github.com/RileyDesigns0/Bin-Generator/releases/latest/download/Formnest.html)

The downloaded HTML is self-contained. Open it in a modern Chromium-based browser (Chrome, Edge, Brave) with WebGL enabled. The STEP importer and WASM runtime are bundled; it does not upload scans or fetch libraries at runtime. The file is about 11 MB. The interactive 3D view needs WebGL; geometry parsing/building uses a worker.

## Use

1. Set box width, depth, height, wall and floor in mm.
2. Import STL/STL-like `.slt` or STEP/STP. STL units are selected separately; STEP units are converted to mm.
3. Orient the model for vertical (+Z) insertion. Use **Move (G)** to drag along world X/Y, **Rotate (R)** for XYZ rotation, and hold **Shift** for 1 mm / 15° snapping. Numeric fields stay synchronized. Z stays grounded to floor + clearance after release.
4. Generate and inspect the cavity, then download the bin as binary STL (mm).

Dragging locks camera orbit and immediately invalidates the old bin/export. The preview reuses its geometry buffers while dragging and rebuilds the canonical mesh/normals only once on release. Smoothing remains available and unchanged.

The cavity uses a conservative rasterized lower-envelope heightfield: it clears everything above the model's lowest surface at every XY position, eliminating upward insertion undercuts. Clearance is a Euclidean distance offset, **not scaling**. Output is an approximate closed triangle mesh, not an exact CAD Boolean or STEP solid. Fine details can be softened or overcut by grid sampling; the UI reports the approximation and limits. Inspect the STL in your slicer and test-fit before printing.

## Smooth import and cavity transitions

STEP imports preserve OpenCascade surface normals, with Standard/Fine/Ultra tessellation quality. Select quality before importing; reimport to change an existing STEP model. STL previews use crease-aware smooth normals without altering vertex positions. Sharp CAD edges remain sharp. This follows the supplied CAD-View reference's separation of tessellation and shading.

The optional **Round cavity transitions** setting also changes the exported mesh: a downward-only smoothing pass removes additional material at transitions. It cannot fill the insertion cavity or create an undercut, and the protected wall band and minimum floor remain intact. It adds clearance and is not a dimensioned fillet or a substitute for a finer grid. Disable it when preserving the tighter unsmoothed cavity matters more.

## Source and development

- `ui.html` — app shell and UI
- `core.js` — dependency-free mesh parser, transforms, heightfield generation and STL export
- `vendor/` — bundled Three.js / OrbitControls and occt-import-js/OpenCascade runtime with their licenses
- `build.py` — embeds the UI, engine, STEP importer, WASM and license notices into `Formnest.html`
- `core.test.cjs`, `ui.test.cjs` — Node built-in tests
- `fixtures/cube.step` — STEP import test fixture

Rebuild the downloadable file and run tests:

```sh
python3 build.py
node --test *.test.cjs
```

The app runs locally in a browser; no web server or package installation is required to use the download. No organizer base/preset patterns or STEP export are included yet.
