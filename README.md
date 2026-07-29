# Field Studio

Field Studio is a browser-based implicit modeling and rendering experiment for
imported GLB assets, signed distance fields, directional Boolean absorption,
and stateful contact dissolution.

## Capabilities

- Import GLB scenes while retaining their Three.js PBR materials and animation.
- Convert imported meshes to a sampled SDF and baked material volume.
- Combine analytic primitives and imported fields in one depth-aware renderer.
- Apply directional `A -> B` erosion instead of symmetric smooth union alone.
- Accumulate surface-bound phase seeds at measured mesh contact locations.
- Tune contact, erosion, Boolean smoothing, front noise, and phase rates.

## Run locally

The conversion endpoint requires Python and Blender. Start the local service:

```powershell
python server.py
```

Then open `http://127.0.0.1:4173/`.

## Technical basis

The implementation uses established computer graphics and numerical modeling
techniques: signed distance fields, smooth CSG, sphere tracing, finite-difference
normals, sampled volume fields, and a reduced phase-field approximation.

Womp is a product and interaction reference only. This repository contains no
Womp source code and is not affiliated with, endorsed by, or licensed by Womp.
The phase-field solver and renderer integration in this repository were written
for this project.

## Licensing

No license is currently granted for the project-authored source code. Copyright
is reserved by its owner until a project license is selected.

Bundled Three.js files are licensed separately under the MIT License. See
`THIRD_PARTY_NOTICES.md` and `vendor/three/LICENSE`.
