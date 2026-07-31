# MeltMesh 中文简介

[English](README.md) · 简体中文 · [日本語](docs/i18n/README.ja.md) · [한국어](docs/i18n/README.ko.md) · [Español](docs/i18n/README.es.md) · [Français](docs/i18n/README.fr.md) · [Deutsch](docs/i18n/README.de.md) · [Português](docs/i18n/README.pt-BR.md)

![MeltMesh 预览图](docs/meltmesh-hero.svg)

MeltMesh 是一个浏览器端三维建模实验沙盘。

它的目标不是复刻传统 CAD，也不是只把 GLB 模型叠在 SDF 胶体上，而是让导入模型真正进入同一个隐式场、材质场和接触相场。

## 核心切入点

当多个物体接触时，接触区不再只是两个图层的视觉重叠，而会变成一个新的可计算材料区域。

系统会根据交互状态自动调整三类数学模型的权重：

1. **隐式几何**
   - 决定融合形状、布尔边界和连续表面。
   - 对应 SDF、smooth CSG、sphere tracing。

2. **相场演化**
   - 决定溶解前沿、接触记忆和空间变化。
   - 对应局部 phase field、接触种子、非均匀扰动。

3. **折射材质**
   - 决定交界处如何继承、混合、复制源物体材质。
   - 对应 Fresnel、材质阻抗、准晶谱场和屏幕空间折射。

## 当前能力

- 支持最多五个 GLB 资产独立导入。
- 每个导入资产可以单独选择、移动、缩放。
- 保留原始 Three.js PBR 网格、贴图、动画和材质响应。
- 通过 Blender 把 GLB 转成 `64^3` SDF 体。
- 烘焙颜色、粗糙度、金属度、透明度、发光和透射率。
- 让导入模型和 SDF 几何体进入同一套融合规则。
- 接触区会产生溶解、折射、材质迁移和 reflection 条带。

## 数学模型

系统把交互状态抽象成：

```math
z_t =
\left[
p_t,\ d_t,\ v_t,\ \tau_t,\ c_t,\ n_t
\right]
```

其中：

- `p_t`：物体接近程度；
- `d_t`：估计穿透深度；
- `v_t`：相对运动速度；
- `tau_t`：累计接触时间；
- `c_t`：材质差异；
- `n_t`：活跃物体数量。

然后通过路由器得到三个数学域的权重：

```math
\pi_t =
\operatorname{softmax}
\begin{bmatrix}
s_{\mathrm{SDF}}(z_t) \\
s_{\mathrm{phase}}(z_t) \\
s_{\mathrm{optical}}(z_t)
\end{bmatrix}
```

这些权重会实时影响几何融合、相场溶解和材质折射。

接触区的 reflection 可以写成：

```math
R(x,n,t) =
K(x,t)\ I(x)\ Q(x,n,t)\ F(n,v)
```

其中：

- `K` 是接触核；
- `I` 是材质阻抗；
- `Q` 是准晶谱场；
- `F` 是 Fresnel 反射项。

这就是为什么接触区应该出现空间分布不同的颜色、反射和溶解纹理，而不是一整块单调的发光材质。

## 本地运行

```bash
git clone https://github.com/hippoley/meltmesh.git
cd meltmesh
python server.py
```

打开：

```text
http://127.0.0.1:4173/
```

如果 Blender 不在 `PATH` 里，可以设置：

```powershell
$env:FIELD_STUDIO_BLENDER="C:\Program Files\Blender Foundation\Blender 4.3\blender.exe"
python server.py
```

## 原创性说明

MeltMesh 使用的是公开图形学技术：SDF、sphere tracing、smooth CSG、相场、体采样、屏幕空间折射和 PBR 渲染。

项目把 Womp 作为公开视觉交互参考，但不包含 Womp 源码、私有算法、资产、商标或复制实现。

项目也参考过 Matt Keeter 的 Fidget 作为隐式建模方向的公开技术启发，但仓库里没有包含 Fidget 的源码文件或代码片段。
