# Spatial Exchange Field Model

This note formalizes the next MeltMesh direction: objects do not merely overlap.
When they touch, every object in the contact group is transformed by a shared
field process. The visual target is a procedural, law-like exchange between
memory space and real space: something closer to spatial chemistry than a
Boolean mesh operation.

## 1. Core intuition

MeltMesh should model contact as a local event where two or more worlds partially
exchange structure.

- A remembered scene carries compressed traces: color, density, shape, semantic
  association, noise, uncertainty, and temporal residue.
- A real scene carries measured traces: geometry, material, illumination,
  camera-space evidence, and physical anchoring.
- The contact region becomes a membrane where these traces refract, copy,
  dissolve, and redistribute.

The important rule is:

> The fused region is not a new empty material. It is sampled from the interiors,
> surfaces, memories, and uncertainty fields of every participating object.

Therefore each object changes after contact. Fusion is not `A + B -> C`; it is:

```text
A, B, C, ... -> A', B', C', ...
```

## 2. Object state

Each object `i` is represented by a bundle of fields:

```math
O_i(t) =
\left(
S_i(x,t),
M_i(x,t),
L_i(x,t),
G_i(x,t),
E_i(x,t),
\mu_i(x,t)
\right)
```

where:

- `S_i(x,t)` is the signed distance or density field.
- `M_i(x,t)` is the material field: albedo, roughness, metalness, alpha,
  transmission, emission, normal detail.
- `L_i(x,t)` is the light-response field.
- `G_i(x,t)` is the semantic or memory feature field.
- `E_i(x,t)` is uncertainty or entropy.
- `mu_i(x,t)` is contact memory.

For a mesh, `S_i` is produced by voxelized SDF baking. For a 3D Gaussian
Splatting scene, `S_i` can be replaced or complemented by a density field.

## 3. 3DGS-compatible representation

A 3DGS file can be treated as a distribution of anisotropic kernels:

```math
\rho_i(x) =
\sum_{k=1}^{N_i}
\alpha_{ik}
\mathcal{N}
\left(
x;\,
p_{ik},\,
\Sigma_{ik}
\right)
```

Each Gaussian stores:

```math
g_{ik} =
\left(
p_{ik},
\Sigma_{ik},
\alpha_{ik},
c_{ik},
r_{ik},
e_{ik},
\gamma_{ik}
\right)
```

where `p` is position, `Sigma` is anisotropic covariance, `alpha` is opacity,
`c` is color or spherical harmonics, `r` is roughness/material response, `e` is
emission, and `gamma` is a learned or user-authored memory feature.

To interact with SDF objects, derive a soft implicit field:

```math
S_i^{gs}(x) =
\tau_i - \rho_i(x)
```

The zero level set of `S_i^{gs}` is not a hard surface, but it is enough to
define proximity, overlap, and contact kernels.

## 4. Contact group

At time `t`, build a contact graph:

```math
\mathcal{G}_t =
\left(
V_t,\ E_t
\right)
```

Each node is an object. An edge exists when two fields are near or overlapping:

```math
(i,j) \in E_t
\quad \Longleftrightarrow \quad
\min_x
\left(
|S_i(x,t)| + |S_j(x,t)|
\right)
< \epsilon
```

Connected components of this graph are contact groups:

```math
\mathcal{C}_m(t) \subseteq V_t
```

The solver should operate on each group, not only on pairwise objects. This is
how three, four, or five imported assets can form a shared reaction zone.

## 5. Exchange membrane

For each contact group, define a local membrane kernel:

```math
K_i(x,t) =
\exp
\left(
-
\frac{S_i(x,t)^2}{2\sigma_s^2}
\right)
```

and group contact intensity:

```math
K_{\mathcal{C}}(x,t) =
1 -
\prod_{i \in \mathcal{C}}
\left(
1 - K_i(x,t)
\right)
```

This creates a smooth region around multi-object contact. It behaves like a
chemical reaction vessel: no contact, no reaction; deep and persistent contact,
strong reaction.

## 6. Exchange law

Each field has an ownership weight:

```math
w_i(x,t) =
\frac{
\exp(-\beta S_i(x,t)) K_i(x,t)
}{
\sum_{j \in \mathcal{C}}
\exp(-\beta S_j(x,t)) K_j(x,t)
+ \varepsilon
}
```

Material exchange is:

```math
\tilde{M}(x,t) =
\sum_{i \in \mathcal{C}}
w_i(x,t) M_i(x,t)
```

But this alone is too simple. The interesting part is that the blend should be
modulated by contrast, memory, and procedural structure:

```math
M^*(x,t) =
\tilde{M}(x,t)
+ K_{\mathcal{C}}(x,t)
\Psi
\left(
\Delta M,
\Delta G,
\mu,
x,
n,
t
\right)
```

`Psi` is the reflection/exchange generator. It can be implemented as a small
procedural shader, not an AI model:

```math
\Psi =
a_1 Q_{\phi}(x,n,t)
+ a_2 R_F(n,v)
+ a_3 D_{\eta}(x,t)
+ a_4 H(G_i,G_j)
```

where:

- `Q_phi` is a quasi-crystal or interference basis.
- `R_F` is a Fresnel/refraction term.
- `D_eta` is reaction-diffusion or structured noise.
- `H` is semantic or memory mismatch.

## 7. Reciprocity: every object changes

The key rule is reciprocal update. Each object receives residue from the group:

```math
M_i'(x,t) =
(1-\lambda_i) M_i(x,t)
+ \lambda_i
\left[
(1-\chi_i)\tilde{M}(x,t)
+ \chi_i M^*(x,t)
\right]
```

The coefficient `lambda_i` is not global. It depends on exposure:

```math
\lambda_i(x,t) =
K_i(x,t)
\left(
a_p p_i
+ a_d d_i
+ a_\tau \tau_i
+ a_c c_i
\right)
```

So a glass sphere, a metal mesh, and a memory-scene splat cloud will all change
differently under the same contact.

Geometry also changes:

```math
S_i'(x,t) =
S_i(x,t)
- \lambda_i(x,t) A_i(x,t)
+ \kappa \Delta S_i(x,t)
```

`A_i` is an absorption/erosion term, and `kappa Delta S_i` smooths the changed
front. This creates the feeling of dissolving into another object instead of
only showing a transparent overlay.

## 8. Exchange, distribution, and non-commutativity

For artistic control, define a binary contact operator:

```math
A \star_{\theta} B
```

A simple Boolean union is commutative:

```math
A \cup B = B \cup A
```

But memory exchange should be partially non-commutative:

```math
A \star_{\theta} B \ne B \star_{\theta} A
```

because the result depends on which object is treated as memory, which is
treated as physical anchor, and which has stronger material impedance.

However, the group should still have a stable distribution law:

```math
A \star (B \oplus C)
\approx
(A \star B) \oplus (A \star C)
```

This means multi-object contact can be computed as local pairwise exchange, then
renormalized over the whole group. The effect feels procedural and law-like,
not random.

## 9. Memory scene versus real scene

For the specific “memory scene meets real scene” idea, assign each object a
world role:

```math
\omega_i \in
\{
real,\ memory,\ hybrid
\}
```

Then define role-biased transfer:

```math
T_{i \to j}(x,t) =
w_i(x,t)
\ A_{ij}
\ K_{\mathcal{C}}(x,t)
```

`A_ij` is a role-affinity matrix:

```text
real -> memory: anchors geometry, reduces entropy
memory -> real: injects pattern, color drift, duplicated details
hybrid -> both: stabilizes the bridge
```

A remembered room crossing into a real scan could therefore:

- copy wallpaper color into metal edges,
- bend light around contact seams,
- repeat familiar shapes as faint displaced echoes,
- dissolve real geometry only where memory confidence is high,
- leave persistent residue after the objects separate.

## 10. Visual rendering contract

The final shader should expose these terms:

```math
Color =
PBR(M_i)
+ K_{\mathcal{C}} Reflection
+ \mu_i Residue
+ E_i UncertaintyGlow
```

Minimum implementation targets:

1. Contact-local effect only. The sky and unrelated background must not stick.
2. Multi-object contact groups, not one global mesh volume.
3. Source material sampling from every participating object.
4. Reciprocal residue update so all objects visibly change.
5. Stable procedural basis so repeated interactions feel discoverable.
6. Debug view showing ownership, contact kernel, memory, and role transfer.

## 11. Practical staged implementation

### Stage A: current mesh/SDF project

- Add `role` to every object: `real`, `memory`, or `hybrid`.
- Add per-object residue parameters: `residueColor`, `residueMetalness`,
  `residueRoughness`, `residueTransmission`, `residueStrength`.
- Build contact groups from object radii first, then replace with SDF overlap.
- For each group, compute ownership weights and write them into shader uniforms.
- Render contact bands from source material contrast, not a fixed color.

### Stage B: 3DGS support

- Load Gaussian splat attributes as density/material samples.
- Convert splat density into `S_gs = tau - rho`.
- Use splat covariance direction as anisotropic flow direction.
- At contact, update Gaussian color/opacity/covariance by exchange residue.

### Stage C: exportable experiments

- Record interaction traces as JSON.
- Save contact seeds and residue fields.
- Export a generated mesh through Dual Contouring.
- Export changed Gaussian attributes as a new splat scene.

## 12. Why this is mathematically coherent

The model has a clear domain:

- Fields define objects.
- Kernels define contact.
- Weights define ownership.
- Operators define exchange.
- Memory defines persistence.
- Role affinity defines directionality.
- Procedural bases define repeatable visual complexity.

It is not just “make the overlap glow.” It is a dynamic field system where each
object has state, contact creates a membrane, and the membrane redistributes
geometry, material, light response, and memory according to explicit equations.
