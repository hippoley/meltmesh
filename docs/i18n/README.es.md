# MeltMesh en Español

[English](../../README.md) · [简体中文](../../README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · Español · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português](README.pt-BR.md)

![MeltMesh hero preview](../meltmesh-hero.svg)

MeltMesh es un sandbox de fusión material con SDF reactivos que corre en el navegador.

Importa activos GLB reales, muévelos hasta que entren en contacto y convierte la zona de solapamiento en una nueva superficie matemática: geometría booleana suave, disolución con memoria de fase, transferencia de material y patrones de reflexión refractiva.

## Funciones actuales

- Importa hasta 5 activos GLB sin reemplazar los anteriores.
- Cada activo importado se puede seleccionar, mover y escalar por separado.
- Conserva mallas PBR de Three.js, texturas y animaciones originales.
- Convierte GLB en volúmenes SDF `64^3` mediante Blender.
- Hornea color, rugosidad, metalicidad, alfa, emisión y transmisión en volúmenes de material.
- Fusiona primitivas SDF analíticas con SDF derivados de mallas importadas.
- Genera memoria de contacto, frentes de disolución y bandas de reflection refractiva.

## Modelo matemático

El estado de interacción se representa como:

```math
z_t =
\left[
p_t,\ d_t,\ v_t,\ \tau_t,\ c_t,\ n_t
\right]
```

El router asigna pesos a tres dominios: geometría implícita, campo de fase y material óptico.

```math
\pi_t =
\mathrm{softmax}
\begin{bmatrix}
s_{\mathrm{SDF}}(z_t) \\
s_{\mathrm{phase}}(z_t) \\
s_{\mathrm{optical}}(z_t)
\end{bmatrix}
```

La reflection de contacto se modela como:

```math
R(x,n,t) =
K(x,t)\ I(x)\ Q(x,n,t)\ F(n,v)
```

`K` es el núcleo de contacto, `I` la impedancia material, `Q` una base espectral cuasicristalina y `F` la respuesta de Fresnel.

## Ejecutar localmente

```bash
git clone https://github.com/hippoley/meltmesh.git
cd meltmesh
python server.py
```

Abre:

```text
http://127.0.0.1:4173/
```

## Originalidad

MeltMesh usa técnicas públicas de gráficos: SDF, sphere tracing, smooth CSG, campos de fase, muestreo volumétrico, refracción en espacio de pantalla y PBR. No incluye código, algoritmos privados ni recursos de Womp o Fidget.
