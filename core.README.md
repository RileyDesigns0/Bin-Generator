# BinCore geometry API

Dependency-free `core.js` exports CommonJS (`require('./core.js')`) or `globalThis.BinCore` in a browser/worker. No DOM access, network access, or dependencies. Units are mm.

- `parseSTL(ArrayBuffer) -> Float32Array`: binary (including headers beginning `solid`) or ASCII STL, flattened xyz triangles. Rejects empty, malformed-length, nonfinite-coordinate and oversized input.
- `bounds(vertices) -> {min:[x,y,z], max:[x,y,z], size:[x,y,z]}`.
- `transform(vertices, {rx=0, ry=0, rz=0, scale=1}) -> Float32Array`: rotate about X, then Y, then Z, in degrees; uniform positive scale; center bounding box in XY and put minimum Z at zero. Does not mutate input.
- `buildBin(vertices, {width,depth,height,wall,floor,clearance=0,resolution=1,offsetX=0,offsetY=0}) -> {positions,heights,nx,ny,dx,dy,stats}`. Width/depth/height are OUTER dimensions. Source XY is preserved plus offsets; source Z is translated by `floor + clearance - bounds(vertices).min[2]`. The highest source vertex plus clearance must remain at/below rim. All options must be finite numbers. Source+clearance must fit inside walls. Numerical overcut must also preserve the full requested wall thickness; otherwise an actionable error asks for finer resolution, a larger bin, or moving inward. Invalid fits are never silently clipped.
- `binarySTL(positions) -> ArrayBuffer`: outward normals calculated from each triangle.
- `demoModel() -> Float32Array`: closed, outward T-shaped object with overhang shoulders, 18 x 10 x 14 mm.

## Grid and approximation

`nx`/`ny` count VERTICES, not cells. Vertex `(i,j)` has coordinates `(-width/2+i*dx, -depth/2+j*dy, heights[j*nx+i])`. `dx=width/(nx-1)`, `dy=depth/(ny-1)` and both are at most requested resolution. `positions` is an unindexed Float32Array of complete bin boundary triangles, including triangulated flat bottom and all exterior side walls.

The cavity is a **numerical conservative approximation**, not exact CAD offsetting. Every source triangle is clipped against overlapping XY cells; even projected lines and thin slivers contribute. The lowest Z over the clipped fragment is retained, regardless of upper intersections. This solid is swept upward, eliminating undercuts. Clearance is spherical Euclidean-ball dilation using `h - sqrt(r*r - distance*distance)`, with conservative rectangle distances, not model scaling or square dilation. Node heights bound all incident cells conservatively; a shared-vertex piecewise-linear top surface avoids stepped-wall T junctions. Heights are clamped at the requested floor. Conservative overcut can enlarge the cavity, lose narrow pillars, and flatten sloping details; decrease resolution to improve accuracy. Very steep slopes can have significant vertical overcut.

`stats` keys: `triangleCount`, `sourceTriangleCount`, `occupiedCells`, `requestedResolution`, `resolutionX`, `resolutionY`, `approximate` (true), `method`, `maxHorizontalOvercut` (conservative 3-cell-diagonal bound), `work` (work-unit count).

Limits: 350,000 triangles for parsing/transformation/export; 320 vertices per grid axis; 75,000 total grid vertices; 12 million raster work units and 32 million combined raster/offset work units. Errors advise simplifying input or changing resolution. Work is synchronous: run `buildBin` in a Web Worker for responsive UI.

Run tests: `node --test core.test.cjs`.
