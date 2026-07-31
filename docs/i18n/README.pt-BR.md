# MeltMesh em Português

[English](../../README.md) · [简体中文](../../README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · Português

![MeltMesh hero preview](../meltmesh-hero.svg)

MeltMesh é um sandbox de fusão material SDF reativa no navegador.

Importe ativos GLB reais, coloque-os em contato e transforme a região de sobreposição em uma nova superfície matemática: geometria booleana suave, dissolução por campo de fase, transferência de materiais de origem e padrões de reflection refrativa.

## Funcionalidades atuais

- Importa até 5 ativos GLB sem substituir os anteriores.
- Cada ativo importado pode ser selecionado, movido e escalado de forma independente.
- Preserva malhas PBR Three.js, texturas e animações originais.
- Converte GLB em volumes SDF `64^3` usando Blender.
- Gera volumes de material com cor, rugosidade, metalicidade, alfa, emissão e transmissão.
- Fusiona primitivas SDF analíticas com SDFs de malhas importadas.
- Renderiza memória de contato, frentes de dissolução e faixas de reflection refrativa.

## Modelo matemático

O estado de interação é representado por:

```math
z_t =
\left[
p_t,\ d_t,\ v_t,\ \tau_t,\ c_t,\ n_t
\right]
```

O roteador calcula pesos para geometria implícita, campo de fase e material óptico.

```math
\pi_t =
\mathrm{softmax}
\begin{bmatrix}
s_{\mathrm{SDF}}(z_t) \\
s_{\mathrm{phase}}(z_t) \\
s_{\mathrm{optical}}(z_t)
\end{bmatrix}
```

A reflection de contato é modelada como:

```math
R(x,n,t) =
K(x,t)\ I(x)\ Q(x,n,t)\ F(n,v)
```

`K` é o núcleo de contato, `I` é a impedância material, `Q` é uma base espectral quase cristalina e `F` é a resposta de Fresnel.

## Executar localmente

```bash
git clone https://github.com/hippoley/meltmesh.git
cd meltmesh
python server.py
```

Abra:

```text
http://127.0.0.1:4173/
```

## Originalidade

MeltMesh usa técnicas públicas de computação gráfica: SDF, sphere tracing, smooth CSG, campos de fase, amostragem volumétrica, refração em espaço de tela e PBR. O repositório não contém código, algoritmos proprietários ou ativos do Womp ou do Fidget.
