# Launch checklist

Use this before posting MeltMesh to GitHub Trending, Hacker News, Reddit,
Twitter/X, Bilibili, Product Hunt, or graphics communities.

## Must-have assets

- [ ] 10-second GIF: import GLB -> move into contact -> material fusion appears.
- [ ] 30-second video with captions.
- [ ] One tiny sample GLB with permissive license.
- [ ] Before/after screenshot: separate mesh layer vs unified SDF material field.
- [ ] Social preview image at `docs/meltmesh-hero.svg`.

## README above the fold

- [ ] One sentence that explains the project.
- [ ] Visual immediately under the title.
- [ ] Install/run commands visible without scrolling too far.
- [ ] Honest status badge: research prototype.
- [ ] Clear originality note.

## Technical credibility

- [ ] Math model links are visible.
- [ ] Current limitations are explicit.
- [ ] Renderer paths are named: Three.js, WebGL2, WebGPU experimental.
- [ ] Import constraints are explicit: GLB, Blender conversion, `64^3` dense volume.

## Community hooks

- [ ] Good first issues exist.
- [ ] Visual bug template exists.
- [ ] Feature request template exists.
- [ ] Roadmap has small claimable milestones.
- [ ] Contribution guide asks for reproducible scenes and screenshots.

## Suggested launch copy

Short:

> MeltMesh turns contact between imported 3D assets into a live SDF material
> field: smooth Boolean geometry, phase-field dissolution, and refractive
> source-material reflection in the browser.

Long:

> Most browser 3D demos render imported meshes and procedural SDF objects as
> separate layers. MeltMesh explores a different model: when objects touch, the
> contact region becomes a computable material. It imports GLB assets, bakes
> mesh SDF/material volumes, preserves Three.js PBR rendering, and generates
> refractive dissolution bands from interaction state.

## Places to share

- r/threejs
- r/webgpu
- r/computergraphics
- Hacker News Show HN
- Product Hunt
- Bilibili graphics/devlog video
- Twitter/X with GIF and model diagram
- Discord communities for Three.js, WebGPU, creative coding, Blender
