# Field Studio

一个面向浏览器的隐式建模实验室：导入 GLB 模型，将解析几何与网格距离场放入同一个实时渲染管线，并通过定向布尔、局部相场和材质所有权转移实现接触溶解。

> 项目仍处于实验阶段。它以 Womp 的连续建模体验作为产品表现参考，但不包含 Womp 源码、资产或专有实现，也不与 Womp 存在关联。

## 功能

- 导入 GLB，并保留原始 Three.js PBR 材质与动画。
- 通过 Blender 将网格转换为 `64³` SDF 与烘焙材质体。
- 在统一颜色和深度管线中渲染 GLB、SDF 几何与地面。
- 支持球体、圆角盒和导入网格的鼠标移动与缩放。
- 使用有方向的 `A -> B` 布尔吸收，而不只是对称 smooth-min。
- 在真实网格接触点积累具有历史的局部相场。
- 使用各向异性相场，让溶解沿网格表面扩散并减少薄壁穿透。
- 通过布尔结算器调整接触、侵蚀、平滑、扰动与时间演化。
- WebGPU 可用时启用实验管线，初始化失败时保留 WebGL2 回退。

## 原理概览

现有解析几何记为 `A`，导入模型记为 `B`：

```text
dC = dB - erosionRadius(phase) + frontNoise
erodedA = max(dA, -dC)
result = adaptiveSmoothMin(erodedA, dB)
```

接触点由 CPU 侧三线性 SDF 采样与梯度投影求得。每个接触点生成一个贴附表面的各向异性相场种子；相场沿切平面扩散较宽、沿法线方向较薄。

完整推导、参数定义和验收指标见 [MATHEMATICAL_MODEL.md](MATHEMATICAL_MODEL.md)。

## 环境要求

- 支持 WebGL2 的现代浏览器，推荐 Chromium/Chrome。
- Python 3.10 或更高版本。
- Blender 4.x 或 5.x，用于 GLB 转换与体积烘焙。
- 支持硬件加速的独立或集成显卡。

项目不依赖 npm，也不需要前端构建步骤。Three.js r147 已保存在 `vendor/three` 中。

## 快速开始

```bash
git clone <your-repository-url>
cd sdf-studio
python server.py
```

浏览器打开 `http://127.0.0.1:4173/`。

如果 `blender` 没有加入系统 `PATH`，请设置环境变量：

```powershell
$env:FIELD_STUDIO_BLENDER = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
python server.py
```

```bash
export FIELD_STUDIO_BLENDER=/path/to/blender
python server.py
```

## 导入流程

点击右上角“导入”并选择 `.glb` 文件。服务会调用 Blender：

1. 清理不兼容的 GLB 扩展字段。
2. 读取网格、动画帧与材质。
3. 生成 STL 动画缓存。
4. 采样网格 SDF。
5. 烘焙颜色与粗糙度体积。
6. 将结果写入本地 `cache/`。

单文件上传限制为 500 MB，转换超时为 5 分钟。

## 布尔结算器

| 参数 | 作用 | 调整建议 |
|---|---|---|
| 融合强度 | 全局反应尺度 | 过大会使几何膨胀 |
| 接触阈值 | 开始积累相场的距离 | 隔空反应时降低 |
| 侵蚀半径 | 导入模型吸收旧几何的深度 | 溶解不明显时提高 |
| 布尔平滑 | 最终连接面的平滑范围 | 出现鼓包时降低 |
| 前沿扰动 | 侵蚀边界的不规则程度 | 规则切割感明显时提高 |
| 溶解速率 | 接触时的相场积累速度 | 反馈太慢时提高 |
| 恢复速率 | 分离后的相场衰减速度 | 设置为 `0` 可保留痕迹 |

推荐起始值：

```text
融合强度    0.28
接触阈值    0.22
侵蚀半径    1.05
布尔平滑    0.14
前沿扰动    0.18
溶解速率    0.85
恢复速率    0.01
```

## 项目结构

```text
sdf-studio/
├── app.js                     WebGL2 SDF、状态与交互
├── three-renderer.js          Three.js PBR 与统一深度合成
├── webgpu-renderer.js         实验性 WebGPU 管线
├── convert_glb.py             Blender 网格/SDF/材质转换
├── server.py                  本地静态服务与转换 API
├── index.html                 应用界面
├── styles.css                 界面样式
├── MATHEMATICAL_MODEL.md      数学建模文档
├── THIRD_PARTY_NOTICES.md     第三方组件声明
└── vendor/three/              Three.js r147 与许可证
```

## 当前限制

- 固定 `64³` SDF 对细网、薄壁和锐利边缘的表达有限。
- 局部相场由八个解析种子近似，不是完整的三维 PDE 网格。
- 烘焙材质体目前主要保存颜色与粗糙度。
- 仅支持 GLB；FBX、USD、OBJ 等格式尚未接入转换入口。
- Blender 转换是同步请求，大文件处理期间浏览器需要等待。
- 尚未建立自动化 GPU 截图和性能回归测试。

## 路线图

- [ ] 局部 `128³` 或自适应稀疏窄带 SDF。
- [ ] GPU ping-pong 三维相场演化。
- [ ] 完整 PBR 材质体：金属度、法线、透射和发光。
- [ ] 基于屏幕误差的自适应 Sphere Tracing。
- [ ] OBJ、FBX、USD/USDZ 导入转换。
- [ ] 可撤销的对象与布尔操作历史。
- [ ] 桌面端和移动端视觉回归测试。

## 贡献

欢迎提交 issue 和 pull request。提交代码前请：

1. 不要提交 `cache/`、日志或导入模型。
2. 着色器修改需测试未导入和已导入两种状态。
3. 在问题报告中说明浏览器、显卡、Blender 版本和复现步骤。
4. 不要提交来源不明、许可证不兼容的代码或资产。
5. 第三方代码必须保留许可证并更新 `THIRD_PARTY_NOTICES.md`。

## 开源许可

项目自有代码采用 [MIT License](LICENSE)，允许使用、修改、分发和商业使用，但必须保留版权与许可证声明。

Three.js 与 GLTFLoader 由 Three.js Authors 按 MIT License 发布，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和 [vendor/three/LICENSE](vendor/three/LICENSE)。

## 致谢与来源边界

- [Three.js](https://github.com/mrdoob/three.js)：PBR、GLB 加载与 WebGL 渲染基础。
- Khronos glTF：GLB 格式及材质扩展规范。
- SDF、smooth CSG、Sphere Tracing、有限差分和相场属于公开数学与图形学方法。
- Womp 仅作为交互表现对标；本项目没有使用其源码或专有资源。
- Matt Keeter 的 Fidget 是隐式建模方向的公开技术启发；本仓库没有包含 Fidget 源码片段。
