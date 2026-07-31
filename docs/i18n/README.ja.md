# MeltMesh 日本語

[English](../../README.md) · [简体中文](../../README.zh-CN.md) · 日本語 · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português](README.pt-BR.md)

![MeltMesh hero preview](../meltmesh-hero.svg)

MeltMesh は、ブラウザ上で動くリアクティブな SDF マテリアル融合サンドボックスです。

GLB アセットを読み込み、物体同士を接触させると、その重なりは単なる表示レイヤーではなく、新しい計算可能な接触マテリアルとして扱われます。

## 主な特徴

- 最大 5 個の GLB アセットを同時に読み込み。
- 各アセットを個別に選択、移動、スケール可能。
- Three.js の PBR メッシュ、テクスチャ、アニメーションを保持。
- Blender を使って GLB を `64^3` の SDF ボリュームへ変換。
- 色、粗さ、金属度、アルファ、発光、透過をマテリアルボリュームとしてベイク。
- 解析的 SDF プリミティブとインポート済みメッシュ SDF を融合。
- 接触メモリ、溶解フロント、屈折 reflection バンドをリアルタイムに描画。

## 数学モデル

相互作用状態は次のベクトルで表されます。

```math
z_t =
\left[
p_t,\ d_t,\ v_t,\ \tau_t,\ c_t,\ n_t
\right]
```

ドメインルーターは、SDF、相場、光学マテリアルの重みを推定します。

```math
\pi_t =
\mathrm{softmax}
\begin{bmatrix}
s_{\mathrm{SDF}}(z_t) \\
s_{\mathrm{phase}}(z_t) \\
s_{\mathrm{optical}}(z_t)
\end{bmatrix}
```

接触 reflection は次の局所光学場として扱います。

```math
R(x,n,t) =
K(x,t)\ I(x)\ Q(x,n,t)\ F(n,v)
```

ここで `K` は接触カーネル、`I` はマテリアルインピーダンス、`Q` は準結晶スペクトル基底、`F` は Fresnel 項です。

## ローカル実行

```bash
git clone https://github.com/hippoley/meltmesh.git
cd meltmesh
python server.py
```

ブラウザで開きます。

```text
http://127.0.0.1:4173/
```

## 独自性

MeltMesh は SDF、sphere tracing、smooth CSG、相場、ボリュームサンプリング、スクリーンスペース屈折、PBR などの公開グラフィックス技術を利用しています。Womp や Fidget のソースコード、私有アルゴリズム、アセットは含まれていません。
