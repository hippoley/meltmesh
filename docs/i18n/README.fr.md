# MeltMesh en Français

[English](../../README.md) · [简体中文](../../README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · Français · [Deutsch](README.de.md) · [Português](README.pt-BR.md)

![MeltMesh hero preview](../meltmesh-hero.svg)

MeltMesh est un bac à sable de fusion de matériaux SDF réactifs dans le navigateur.

Importez de vrais actifs GLB, mettez-les en contact, puis transformez la zone d’intersection en une surface mathématique vivante : booléens lissés, dissolution par champ de phase, transfert de matériaux sources et motifs de réflexion réfractive.

## Fonctionnalités actuelles

- Import de 5 actifs GLB maximum sans remplacer les précédents.
- Sélection, déplacement et mise à l’échelle indépendants pour chaque actif.
- Conservation des maillages PBR Three.js, textures et animations d’origine.
- Conversion GLB vers volume SDF `64^3` via Blender.
- Baking de couleur, rugosité, métallicité, alpha, émission et transmission.
- Fusion entre primitives SDF analytiques et SDF issus de maillages importés.
- Mémoire de contact, fronts de dissolution et bandes de reflection réfractive.

## Modèle mathématique

L’état d’interaction est représenté par :

```math
z_t =
\left[
p_t,\ d_t,\ v_t,\ \tau_t,\ c_t,\ n_t
\right]
```

Le routeur attribue des poids aux domaines SDF, champ de phase et matériau optique.

```math
\pi_t =
\operatorname{softmax}
\begin{bmatrix}
s_{\mathrm{SDF}}(z_t) \\
s_{\mathrm{phase}}(z_t) \\
s_{\mathrm{optical}}(z_t)
\end{bmatrix}
```

La reflection de contact est modélisée par :

```math
R(x,n,t) =
K(x,t)\ I(x)\ Q(x,n,t)\ F(n,v)
```

`K` est le noyau de contact, `I` l’impédance matérielle, `Q` la base spectrale quasi cristalline, et `F` la réponse de Fresnel.

## Exécution locale

```bash
git clone https://github.com/hippoley/meltmesh.git
cd meltmesh
python server.py
```

Ouvrez :

```text
http://127.0.0.1:4173/
```

## Originalité

MeltMesh utilise des techniques graphiques publiques : SDF, sphere tracing, smooth CSG, champs de phase, échantillonnage volumique, réfraction en espace écran et PBR. Le dépôt ne contient pas de code, d’algorithmes propriétaires ni d’actifs Womp ou Fidget.
