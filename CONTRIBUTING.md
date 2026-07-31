# Contributing to MeltMesh

MeltMesh is a research prototype for reactive SDF material fusion in the browser.
The best contributions are reproducible: a scene, a setting, a screenshot or
recording, and a clear explanation of the visual or mathematical improvement.

## Good first issues

- Add a small GLB sample scene that stresses thin geometry, glass, metal, or fabric.
- Improve imported-material detection for GLB assets.
- Add screenshots or short clips that show before/after contact fusion.
- Add translations for runtime UI strings and README pages.
- Improve visual regression notes for WebGL2, Three.js, and WebGPU paths.

## High-impact technical work

- GPU composition of multiple imported SDF volumes.
- Better SDF generation for thin, open, or highly perforated meshes.
- Sparse brick volume storage instead of fixed dense `64^3` grids.
- Contact-local material transfer driven by source albedo, roughness, metalness,
  transmission, and emission.
- Reaction-diffusion or anisotropic phase-field models for richer dissolution fronts.
- Dual Contouring or Surface Nets export for fused surfaces.

## Reporting visual bugs

Please include:

1. Browser and GPU.
2. Imported file format and approximate model type.
3. Whether Blender conversion succeeded.
4. Screenshot or recording.
5. The settings panel values if the issue depends on sliders.

Useful bug labels:

- `import`
- `material`
- `sdf`
- `webgpu`
- `threejs`
- `i18n`
- `visual-regression`

## Development

```bash
python server.py
```

Open:

```text
http://127.0.0.1:4173/
```

If Blender is not in `PATH`, set:

```powershell
$env:FIELD_STUDIO_BLENDER="C:\Program Files\Blender Foundation\Blender 4.3\blender.exe"
python server.py
```

## Pull request standard

Before opening a PR:

- Keep the change focused.
- Avoid unrelated rewrites.
- Add or update screenshots for visual changes.
- Update README or model docs when behavior changes.
- Run the local app and check for console errors.
- If the change touches i18n, check all visible text after switching languages.

## Project principles

- Imported meshes and analytic SDFs should feel like they occupy one world.
- Contact should be computable, not a flat overlay.
- Source materials should influence the fused region.
- The prototype can be experimental, but the claim must be reproducible.
