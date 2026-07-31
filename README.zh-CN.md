# MeltMesh 中文简介

[English](README.md) · 简体中文 · [日本語](docs/i18n/README.ja.md) · [한국어](docs/i18n/README.ko.md) · [Español](docs/i18n/README.es.md) · [Français](docs/i18n/README.fr.md) · [Deutsch](docs/i18n/README.de.md) · [Português](docs/i18n/README.pt-BR.md)

![MeltMesh 预览图](docs/meltmesh-hero.svg)

MeltMesh 是一个浏览器端三维建模实验沙盘。它不是把 GLB 模型简单叠在 SDF 胶体上，而是尝试让导入资产进入同一个隐式几何场、材质场和接触相场。

核心想法：

> 当多个物体接触时，接触区本身变成一种新的可计算材料。

## 当前能力

- 最多导入 5 个 GLB 资产，后续导入不会替换前一个资产。
- 每个导入资产可以独立选择、移动和缩放。
- 保留 Three.js PBR 网格、贴图、动画和材质响应。
- 通过 Blender 把 GLB 几何转成 `64^3` SDF 体。
- 烘焙源颜色、粗糙度、金属度、透明度、发光和透射率。
- 让解析 SDF 几何体与导入网格进入同一套融合规则。
- 接触区会产生局部溶解、材质迁移、折射 reflection 条带和接触记忆。
- 前端工作台支持 8 种语言运行时切换。

## 数学建模方向

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

路由器把状态映射到三个数学域：

```math
\pi_t =
\mathrm{softmax}
\begin{bmatrix}
s_{\mathrm{SDF}}(z_t) \\
s_{\mathrm{phase}}(z_t) \\
s_{\mathrm{optical}}(z_t)
\end{bmatrix}
```

三个域分别控制：

1. **隐式几何**：SDF、smooth CSG、sphere tracing。
2. **相场演化**：局部 phase field、接触种子、非均匀溶解前沿。
3. **折射材质**：Fresnel、材质阻抗、准晶格 reflection 和屏幕空间折射。

接触区的 reflection 可以简化写成：

```math
R(x,n,t) =
K(x,t)\ I(x)\ Q(x,n,t)\ F(n,v)
```

这意味着接触区不应该是一整块单调发光材质，而应该随空间位置、法线、材质差异和接触历史产生不同的颜色、纹理和折射结构。

## 本地运行

需要 Python 3.10+，并建议安装 Blender 4.x。

```bash
git clone https://github.com/hippoley/meltmesh.git
cd meltmesh
python server.py
```

打开：

```text
http://127.0.0.1:4173/
```

如果 Blender 不在 `PATH` 中，可以设置：

```powershell
$env:FIELD_STUDIO_BLENDER="C:\Program Files\Blender Foundation\Blender 4.3\blender.exe"
python server.py
```

## 适合贡献的方向

- 更稳定的 GLB 到 SDF 转换，尤其是薄片、纱网、开口模型。
- WebGPU compute 多体融合。
- 接触区材质迁移和 reaction-diffusion。
- 可复现 benchmark 场景和视觉回归测试。
- 更好的示例资产、截图、短视频和文档翻译。

## 原创性说明

MeltMesh 使用公开图形学技术：SDF、sphere tracing、smooth CSG、相场、体采样、屏幕空间折射和 PBR。项目把 Womp 作为软融合视觉效果的公开对标对象，但不包含 Womp 源码、私有算法、资产或实现材料。

更多说明见：

- [MATHEMATICAL_MODEL.md](MATHEMATICAL_MODEL.md)
- [MODEL_SPECIFICATION.md](MODEL_SPECIFICATION.md)
- [REFRACTION_MODEL.md](REFRACTION_MODEL.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [ROADMAP.md](ROADMAP.md)
