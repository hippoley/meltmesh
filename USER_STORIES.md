# MeltMesh User Stories

MeltMesh is not just a GLB viewer and not just a shader toy. Its central story is:

> Imported objects, analytic SDF bodies, and material fields enter one shared contact field. When they touch, every participant changes.

This document turns that idea into development-ready user stories.

## Product north star

As a creator, I want to drag real 3D assets into a browser scene, move them into contact, and see the contact region become a new computed material, so that fusion feels like a visible mathematical event instead of a simple overlap.

## Persona 1: visual prototyper

### Story 1.1: one-click material scene

As a visual prototyper, I want to load a ready-made scene with plastic, metal, wood, ceramic, steel, and glass objects, so that I can immediately understand what MeltMesh does without finding my own files.

Acceptance criteria:

- The scene loads at least five distinct material samples.
- Each sample has a recognizable PBR identity: plastic, polished metal, walnut wood, glazed porcelain, and brushed steel.
- The original SDF sphere and round box are visible by default as transparent marble-like bodies.
- The user can select any object from the scene list.
- Selecting an object updates the transform controls.

### Story 1.2: direct manipulation

As a visual prototyper, I want to move any object with the mouse, so that I can stage collisions by hand.

Acceptance criteria:

- Dragging in Move mode changes the selected object's position.
- Imported GLB objects do not replace each other.
- Each imported object keeps its own position and scale when switching selection.
- The transform panel stays synchronized while dragging.
- Orbit mode rotates the camera instead of moving the object.

## Persona 2: graphics researcher

### Story 2.1: contact becomes a field

As a graphics researcher, I want object contact to be represented as a mathematical field, so that the visual result is repeatable, inspectable, and tunable.

Acceptance criteria:

- The system computes proximity/contact strength for each active pair.
- Contact strength changes continuously as objects approach, overlap, and separate.
- Contact is not just a screen-space overlay.
- The contact response can affect geometry smoothing, phase memory, and optical material transfer.
- The UI exposes whether the current dominant route is implicit geometry, phase evolution, or refractive material exchange.

### Story 2.2: every participant receives residue

As a graphics researcher, I want every object in a contact group to receive material residue, so that fusion is not a one-way effect.

Acceptance criteria:

- If A touches B, A shows some trace of B and B shows some trace of A.
- If A, B, and C form a contact chain, residue can propagate across the group.
- Residue fades or stabilizes according to a controllable recovery/memory rate.
- Residue contains at least color, optical strength, memory strength, and geometry strength.
- The effect is visible on imported Three.js PBR meshes and SDF primitives.

## Persona 3: 3D artist

### Story 3.1: material exchange feels physical

As a 3D artist, I want the fusion region to borrow visual traits from the source materials, so that metal, glass, wood, ceramic, and plastic do not all dissolve the same way.

Acceptance criteria:

- Metal contact increases reflectivity and specular contrast.
- Wood contact introduces warm grain-like color variation.
- Ceramic contact introduces glossy glaze and subtle crackle-like structure.
- Plastic contact keeps smooth saturated reflection with lower metallic response.
- Brushed steel contact creates anisotropic-looking streaks or directional roughness.
- The fusion material is generated from source traits, not a fixed empty color.

### Story 3.2: transparent objects feel like glass marbles

As a 3D artist, I want the default sphere and round box to be transparent and refractive, so that I can see objects behind them and read depth through the material.

Acceptance criteria:

- The sphere and round box show environment reflection.
- Background objects are visible through them.
- The material has Fresnel highlights near silhouettes.
- The ground and sky are visible through refraction.
- Contact areas can become brighter, more spectral, or more distorted.

## Persona 4: open-source visitor

### Story 4.1: understand in 15 seconds

As a GitHub visitor, I want the README to explain the project visually and quickly, so that I can decide whether to star, run, or contribute.

Acceptance criteria:

- The README has a short one-sentence pitch above the fold.
- The README includes a hero visual.
- It explains what is new compared with a normal Three.js GLB viewer.
- It links to the mathematical model, roadmap, and user stories.
- It avoids claiming to be a CAD kernel or a Womp clone.

### Story 4.2: visual encyclopedia mode

As a learner, I want a guide mode inspired by visual encyclopedias, so that I can see how SDFs, PBR, lighting, textures, post-processing, controls, animation, and physics relate to MeltMesh.

Acceptance criteria:

- The guide enumerates major Three.js rendering elements.
- Each element has a MeltMesh-specific interpretation.
- Each concept maps to a demo object, material, or visualization mode.
- The guide does not copy external diagrams or proprietary assets.
- The guide links to primary references where appropriate.

## Epics

### Epic A: demo asset pack

Goal: ship an immediately understandable sample scene.

Stories:

- Load five material samples.
- Preserve per-object state.
- Make samples draggable.
- Add material source labels.
- Add reset layout.

### Epic B: real contact exchange

Goal: make contact produce visible two-way material change.

Stories:

- Pairwise contact kernels.
- Contact graph propagation.
- Per-object residue buffers.
- PBR-aware material transfer.
- SDF primitive residue rendering.

### Epic C: guide and community layer

Goal: make the project explain itself.

Stories:

- Visual guide page.
- README visual rewrite.
- Known limitation gallery.
- Good-first-issue map.
- Multilingual docs without mojibake.

## Prioritized backlog

1. Fix direct manipulation for all selected objects.
2. Make sample assets one-click load and visually distinct.
3. Replace bounding-sphere contact with per-object SDF/proxy contact.
4. Add contact graph propagation for imported objects.
5. Make material exchange affect roughness, metalness, transmission, and bump response.
6. Add Guide Mode based on the rendering-element taxonomy.
7. Add visual regression screenshots for key contact scenes.
8. Prepare a hosted demo and launch README.

