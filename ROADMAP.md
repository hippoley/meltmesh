# MeltMesh Roadmap

This roadmap is written for contributors and early users. The goal is to turn
MeltMesh from a local research prototype into a memorable open-source graphics
project: easy to run, visually distinct, and technically credible.

## North star

Make contact between imported 3D objects feel alive:

> Imported meshes, SDF primitives, and source materials enter one shared field.
> When they touch, the contact region computes a new material instead of drawing
> a simple overlap.

## Milestone 1: first impression

- Add a one-click hosted demo.
- Add a 10-second GIF showing GLB import, contact, dissolution, and reflection.
- Bundle one tiny sample model with permissive licensing.
- Keep README formulas GitHub-compatible.
- Keep all visible UI strings localized.

Success signal: a new visitor can understand the project in 15 seconds.

## Milestone 2: reliable import

- Keep up to five imported GLB assets without replacement.
- Preserve per-object transform state when switching selection.
- Report material import status clearly: material count, textures, metalness,
  roughness, alpha, emission, transmission.
- Improve thin mesh SDF generation for screens, wires, fabric, and window meshes.

Success signal: imported assets visibly participate in contact instead of
feeling like a separate layer.

## Milestone 3: better contact math

- Replace approximate bounding contact with SDF overlap metrics.
- Add per-pair contact kernels.
- Add persistent phase memory per object pair.
- Add material-transfer weights based on SDF ownership and source material
  contrast.
- Add a debug view for contact kernels, phase seeds, and source ownership.

Success signal: moving the same objects produces repeatable, explainable
changes at the intersection.

## Milestone 4: GPU acceleration

- Move multi-volume composition to WebGPU compute.
- Store imported fields in sparse bricks.
- Stream SDF/material bricks only near active contact zones.
- Add low/medium/high quality presets for integrated GPUs.

Success signal: five imported objects can interact at interactive frame rates.

## Milestone 5: community benchmark

- Publish a small gallery of benchmark scenes:
  - glass marble into metal mesh,
  - soft sphere into fabric screen,
  - translucent cube into animated GLB,
  - multi-object contact chain,
  - failure cases for thin geometry.
- Add screenshot comparison images for each benchmark.
- Track known limitations honestly.

Success signal: contributors can improve visuals without arguing from memory.

## Community growth checklist

- Short demo GIF at the top of README.
- Clear “what is new here?” sentence above the fold.
- Direct comparison section: mesh overlay vs unified SDF material field.
- Small sample assets with licenses.
- `good first issue` labels.
- Issue template for visual bugs.
- Public roadmap with small, claimable tasks.
- README translations kept free of mojibake.
- No proprietary Womp/Fidget code or assets.

## Positioning

Use this line consistently:

> MeltMesh is a browser-native sandbox for SDF contact, phase-field dissolution,
> and source-material reflection between imported 3D assets.

Avoid overclaiming that it is a CAD kernel or a full Womp replacement. The
stronger pitch is narrower and more defensible: contact becomes a computable
material.
