# MeltMesh auf Deutsch

[English](../../README.md) · [简体中文](../../README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · Deutsch · [Português](README.pt-BR.md)

![MeltMesh hero preview](../meltmesh-hero.svg)

MeltMesh ist eine browserbasierte Sandbox für reaktive SDF-Materialfusion.

Importierte GLB-Assets werden nicht nur als separate Ebene gerendert. Wenn sie andere Objekte berühren, wird die Kontaktzone zu einem neuen berechenbaren Material: glatte boolesche Geometrie, Phasenfeld-Auflösung, Materialübertragung und refraktive Reflection-Muster.

## Aktueller Funktionsumfang

- Bis zu 5 GLB-Assets gleichzeitig importieren.
- Jedes importierte Asset separat auswählen, bewegen und skalieren.
- Ursprüngliche Three.js-PBR-Meshes, Texturen und Animationen behalten.
- GLB über Blender in ein `64^3` SDF-Volumen konvertieren.
- Farbe, Rauheit, Metallizität, Alpha, Emission und Transmission in Materialvolumen backen.
- Analytische SDF-Primitive mit importierten Mesh-SDFs fusionieren.
- Kontaktgedächtnis, Auflösungsfronten und refraktive Reflection-Bänder rendern.

## Mathematisches Modell

Der Interaktionszustand wird dargestellt als:

```math
z_t =
\left[
p_t,\ d_t,\ v_t,\ \tau_t,\ c_t,\ n_t
\right]
```

Der Router gewichtet implizite Geometrie, Phasenfeld und optisches Material.

```math
\pi_t =
\mathrm{softmax}
\begin{bmatrix}
s_{\mathrm{SDF}}(z_t) \\
s_{\mathrm{phase}}(z_t) \\
s_{\mathrm{optical}}(z_t)
\end{bmatrix}
```

Die Kontakt-Reflection wird modelliert als:

```math
R(x,n,t) =
K(x,t)\ I(x)\ Q(x,n,t)\ F(n,v)
```

`K` ist der Kontaktkern, `I` die Materialimpedanz, `Q` eine quasikristalline Spektralbasis und `F` die Fresnel-Antwort.

## Lokal ausführen

```bash
git clone https://github.com/hippoley/meltmesh.git
cd meltmesh
python server.py
```

Öffnen:

```text
http://127.0.0.1:4173/
```

## Originalität

MeltMesh nutzt öffentliche Grafiktechniken: SDF, Sphere Tracing, Smooth CSG, Phasenfelder, Volumensampling, Screen-Space-Refraction und PBR. Dieses Repository enthält keinen Code, keine proprietären Algorithmen und keine Assets von Womp oder Fidget.
