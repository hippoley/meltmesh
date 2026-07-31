# Refractive Contact Field

## 目标

MeltMesh 的目标不是把几个模型叠在一起，也不是在碰撞位置叠加一层发光颜色。目标是：

> 当多个真实网格接触时，它们仍然保留各自的材质身份，同时在接触区域进入一个共享的隐式场；几何、颜色、粗糙度、反射和可见性沿这个场连续变化，形成可逆、可控、可解释的“折射 + 溶解 + 复制”现象。

这对应三个可验收结果：

1. **同一场**：导入物体和原生 SDF 物体使用同一个距离场和碰撞判定。
2. **不同材质**：接触区不是统一染色，而是由参与接触的材质属性共同决定。
3. **有结构的变化**：变化沿法线、切线和时间相位分布，具有可重复的数学规律，而不是随机噪声贴图。

## 1. 场景表示

对每个物体 (i) 定义一个带材质属性的隐式实体：

\[
\mathcal O_i=(d_i(\mathbf x),\; \mathbf m_i(\mathbf x),\; T_i,\; a_i)
\]

其中：

- (d_i(\mathbf x)) 是物体的有符号距离函数，内部为负，外部为正；
- (\mathbf m_i=(\rho,\; c,\; \eta,\; \tau)) 是粗糙度、颜色、折射率、透射率；
- (T_i) 是对象到世界空间的变换；
- (a_i\in[0,1]) 是对象的接触参与权重。

导入 GLB 先得到网格距离场 (d_i)，同时保留原始 PBR 材质场。原生球、盒、平面直接使用解析 SDF。所有对象在世界空间采样，因此碰撞不再依赖“对象属于哪个渲染层”。

## 2. 接触场

两个物体的接触强度不是简单的 `distance < threshold`，而定义为：

\[
q_{ij}(\mathbf x)=\exp\left(-\frac{|d_i(\mathbf x)|+|d_j(\mathbf x)|}{\sigma_c}\right)
\cdot \exp\left(-\frac{\|\nabla d_i-\nabla d_j\|^2}{\sigma_n^2}\right)
\]

第一项描述两表面的空间接近程度，第二项描述法线是否形成真实接触。这样可以避免两个物体仅仅因为投影重叠就发生“溶解”。

多物体接触场为：

\[
Q(\mathbf x)=1-\prod_{i<j}(1-q_{ij}(\mathbf x))
\]

这使三个或更多物体在同一位置接触时产生叠加效应，但不会超过 1。

## 3. Womp 风格的隐式融合

几何融合使用带可控半径的 smooth-min：

\[
smin(a,b,k)=\min(a,b)-h^2k/4,
\quad h=\max(k-|a-b|,0)/k
\]

对所有对象递归计算：

\[
D_0=d_1,\qquad D_{r+1}=smin(D_r,d_{r+1},kQ)
\]

关键点是融合半径不是固定值，而是 (kQ(\mathbf x))。远离接触区时 (Q\approx0)，物体保持独立；接触区 (Q\to1)，曲面才产生柔性连接。

## 4. 接触溶解与“湮灭”前沿

定义沿接触法线的局部坐标：

\[
u=\mathbf x-\mathbf p_c,\quad n=\frac{\nabla d_i-\nabla d_j}{\|\nabla d_i-\nabla d_j\|}
\]

接触前沿由有序波函数决定，而不是白噪声：

\[
W(\mathbf x,t)=\sum_{r=1}^{6}w_r\cos(\omega_r\mathbf k_r\cdot u+\phi_r t)
\]

其中方向 (\mathbf k_r) 使用黄金角分布，使图案没有明显的重复网格。溶解阈值为：

\[
\Theta(\mathbf x,t)=\mathrm{smoothstep}\left(-1,1,
\frac{W(\mathbf x,t)+\lambda_Q Q(\mathbf x)-\lambda_n|u\cdot n|}{\sigma_d}\right)
\]

最终可见距离：

\[
D_{vis}=D-\alpha\,\Theta\,\sigma_c
\]

因此接触区会出现有方向的侵蚀、穿透和回缩，而不是所有边缘同时融化。

## 5. 材质反射与复制

接触区的材质不能直接取 A 或 B，而定义材质混合权重：

\[
w_i(\mathbf x)=\frac{\exp(-d_i/\tau_m)}{\sum_j\exp(-d_j/\tau_m)}
\]

基础材质为：

\[
\mathbf m_c=\sum_i w_i\mathbf m_i
\]

折射项使用接触法线和视线方向：

\[
F_0=\left(\frac{\eta-1}{\eta+1}\right)^2,\qquad
F(\theta)=F_0+(1-F_0)(1-\cos\theta)^5
\]

在接触区域加入准周期谱扰动：

\[
R(\mathbf x)=\frac12+\frac12\sum_{r=1}^{6}w_r
\cos(\mathbf k_r\cdot\mathbf r(\mathbf x)+\phi_r t)
\]

最终颜色：

\[
\mathbf C=(1-Q)\mathbf C_{base}
 +Q\left[(1-F)\mathbf C_{trans}+F\mathbf C_{refl}\right]
 +\beta Q R\mathbf C_{spectral}
\]

这里的 `spectral` 不是随机彩虹，而是由两种参与材质的金属度、粗糙度和折射率共同决定。金属与玻璃接触时应出现高光谱边缘；粗糙材料与透明材料接触时应出现扩散的内部反射。

## 6. 复制场

“复制”不是复制整个模型，而是在接触区域沿法线生成衰减的镜像层：

\[
\mathbf x' = \mathbf x-2n(n\cdot(\mathbf x-\mathbf p_c))
\]

复制场权重：

\[
G(\mathbf x)=Q(\mathbf x)\exp(-|n\cdot u|/\sigma_r)
\]

渲染时用 (G) 混合原始材质与镜像材质，并让镜像层拥有独立相位：

\[
\phi'_r=\phi_r+\pi r/3
\]

这会产生“同一个物体在接触处被折射、复制、重新组合”的视觉，而不会把整个物体错误地染成一层颜色。

## 7. 动力学与可逆性

接触记忆场 (M\) 避免物体轻微抖动时效果闪烁：

\[
\frac{\partial M}{\partial t}=\lambda_{on}Q(1-M)-\lambda_{off}(1-Q)M
\]

离散更新：

\[
M_{t+\Delta t}=\mathrm{clamp}\left(M_t+\Delta t[\lambda_{on}Q(1-M_t)-\lambda_{off}(1-Q)M_t],0,1\right)
\]

`M` 控制溶解前沿、材质反射和复制场的强度。这样物体分离时效果会逐渐恢复，而不是瞬间跳回原材质。

## 8. 实现顺序

1. **统一世界空间**：每个 GLB 都转换到世界空间 SDF，记录位置、缩放和包围盒。
2. **合并距离场**：对最多 5 个导入网格与原生 SDF 做 smooth-min，并保留每个网格的材质采样器。
3. **接触检测**：使用 (q_{ij}) 和法线差，而不是对象中心距离。
4. **几何前沿**：先实现 (D_{vis}) 和 (M)，确保“融化”真实改变轮廓。
5. **材质场**：实现 softmax 材质归属、Fresnel 反射和谱扰动。
6. **复制层**：最后加入镜像坐标和相位偏移，避免在几何基础未稳定时制造假象。

## 验收标准

- 两个物体不接触：轮廓、材质、阴影完全独立。
- 两个物体刚接触：接触带出现连续高光和材质过渡，但不整块变色。
- 深度穿透：接触区域发生真实的几何侵蚀，轮廓随时间变化。
- 三个以上物体接触：中心区域由 (Q) 统一控制，不出现各自独立的“图层感”。
- 分离物体：溶解和复制效果按 (M) 平滑恢复。
- 更换 GLB：原始 PBR 材质仍作为输入，不被统一材质覆盖。

