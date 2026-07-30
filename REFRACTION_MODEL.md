# Refractive Contact Field

## 折射、复制与溶解的统一模型

MeltMesh 不把物体接触仅视为碰撞或布尔运算，而把接触区域视为一种可以传递形态信息的介质。

这个方向受到《湮灭》中“折射并重组生物特征”的艺术概念，以及后室类空间叙事中“结构重复、微变和失去原始尺度”的启发。它们只构成概念语境，不提供任何被复制的影视资产或专有实现。

## 1. 哲学假设

传统建模默认物体具有稳定身份：物体 A 始终是 A，物体 B 始终是 B，布尔运算只改变边界。

折射接触场采用不同假设：

1. 物体身份不是名称，而是分布在空间中的特征权重。
2. 接触不是瞬时事件，而是一条允许信息通过的界面。
3. 复制不是完全相同，而是经过介质折射后的结构变异。
4. 溶解不是消失，而是原有身份权重转移到其他空间区域。
5. 多物体系统的最终形态来自接触网络，而不是固定的父子层级。

因此，一个物体可表示为：

\[
O_i=(d_i,\mathbf g_i,\phi_i)
\]

其中：

- \(d_i(\mathbf p)\)：几何距离场。
- \(\mathbf g_i(\mathbf p)\)：形态基因场。
- \(\phi_i(\mathbf p,t)\)：身份或相态权重。

形态基因可包含：

\[
\mathbf g=(\text{color},\text{roughness},\text{metalness},
\text{transmission},\text{normal frequency},\text{shape frequency})
\]

## 2. 多物体接触流形

物体 \(i\) 与 \(j\) 的接触窄带定义为：

\[
\Gamma_{ij}
=
\left\{
\mathbf p:
|d_i(\mathbf p)-d_j(\mathbf p)|<\varepsilon,
\quad
\max(d_i,d_j)<r_c
\right\}
\]

接触强度：

\[
w_{ij}(\mathbf p)
=
\exp\left(
-\frac{(d_i-d_j)^2}{2\sigma_d^2}
\right)
\exp\left(
-\frac{\max(d_i,d_j)^2}{2\sigma_c^2}
\right)
\]

这个权重只在双方距离相近且确实靠近表面时升高，可以避免隔空反应。

## 3. 折射算子

### 3.1 接触法线

双方表面的法线为：

\[
\mathbf n_i=\frac{\nabla d_i}{\|\nabla d_i\|},
\qquad
\mathbf n_j=\frac{\nabla d_j}{\|\nabla d_j\|}
\]

接触膜法线取加权二分方向：

\[
\mathbf n_{ij}
=
\frac{\mathbf n_i-\mathbf n_j}
{\|\mathbf n_i-\mathbf n_j\|}
\]

### 3.2 几何反射

Householder 反射矩阵：

\[
H(\mathbf n)=I-2\mathbf n\mathbf n^T
\]

局部坐标或频率向量经过接触膜反射：

\[
\mathbf q_r=H(\mathbf n_{ij})\mathbf q
\]

它可将 A 的纹理方向、凹凸频率或局部形态方向复制到 B，但方向会被接触面的法线重新组织。

### 3.3 折射

设形态阻抗为 \(Z_i\)、\(Z_j\)，类比光学折射率：

\[
\eta_{ij}=\frac{Z_i}{Z_j}
\]

形态方向根据 Snell 型算子改变：

\[
\mathbf q_t
=
\eta_{ij}\mathbf q
+
\left(
\eta_{ij}\cos\theta_i-cos\theta_t
\right)\mathbf n_{ij}
\]

这里的 \(Z\) 不必是真实光学折射率，可以由材料属性构造：

\[
Z=a_0+a_1\,\text{metalness}
+a_2(1-\text{roughness})
+a_3\,\text{density}
\]

这意味着金属、玻璃和柔软材料即使以相同速度接触，也会产生不同的复制方向和扩散距离。

## 4. 有规律的艺术分布

纯随机噪声缺乏可识别秩序，规则正弦又容易显得机械。折射接触场采用准周期干涉函数：

\[
A(\mathbf p)
=
\frac12+
\frac{1}{2M}
\sum_{m=1}^{M}
\cos
\left(
\mathbf k_m\cdot\mathbf p
+\omega_mt+\psi_m
\right)
\]

波向量按照黄金角分布：

\[
\theta_m=m\pi(3-\sqrt5)
\]

\[
\mathbf k_m
=
k_m(cos\theta_m,\sin\theta_m,\gamma_m)
\]

黄金角方向不会形成明显的矩形重复单元，却具有稳定的准晶体秩序。经过反射矩阵：

\[
\mathbf k'_m=H(\mathbf n_{ij})\mathbf k_m
\]

原始波与折射波干涉：

\[
A_{ij}
=
\lambda A(\mathbf p;\mathbf k_m)
+(1-\lambda)A(\mathbf p;\mathbf k'_m)
\]

结果会形成类似细胞、晶体、年轮和空间重复之间的分布，而不是普通 dissolve noise。

## 5. 复制与变异

从 A 复制到 B 的形态基因不是直接赋值：

\[
\mathbf g_{A\rightarrow B}
=
T_{ij}\mathbf g_A
+\mu\,A_{ij}\mathbf v
\]

其中：

- \(T_{ij}\)：由反射、折射和材质阻抗构成的传递矩阵。
- \(\mu\)：变异强度。
- \(\mathbf v\)：受控变异方向。

最终基因场：

\[
\mathbf g_B'
=
(1-\rho_{ij})\mathbf g_B
+\rho_{ij}\mathbf g_{A\rightarrow B}
\]

\[
\rho_{ij}=w_{ij}\phi_{ij}A_{ij}
\]

因此复制具有三个约束：必须接触、必须有相场历史、必须通过艺术分布掩码。

## 6. 溶解相场

局部身份场使用 Allen-Cahn 型演化：

\[
\frac{\partial\phi_i}{\partial t}
=
D_i\nabla^2_{\Gamma}\phi_i
-\lambda_i(\phi_i^3-\phi_i)
+S_i
-C_{i\rightarrow j}
\]

其中 \(\nabla^2_{\Gamma}\) 是接触流形上的 Laplace-Beltrami 算子，使变化沿表面传播而不是穿过薄壁。

复制场可使用 Gray-Scott 型双变量系统：

\[
\frac{\partial u}{\partial t}
=D_u\nabla^2_{\Gamma}u-uv^2+F(1-u)
\]

\[
\frac{\partial v}{\partial t}
=D_v\nabla^2_{\Gamma}v+uv^2-(F+K)v
\]

\(u\) 可以代表原身份，\(v\) 代表被复制的新特征。不同 \((F,K)\) 会产生斑点、分叉、细胞或迷宫结构。

## 7. 多物体接触图

当对象数量大于两个时，建立接触图：

\[
G=(V,E,W)
\]

- 节点 \(V\)：物体。
- 边 \(E\)：发生接触的对象对。
- 权重 \(W_{ij}\)：接触面积、持续时间与阻抗的函数。

对象级特征通过图拉普拉斯扩散：

\[
\frac{d\mathbf G}{dt}
=
-L_W\mathbf G+\mathbf S
\]

\[
L_W=D-W
\]

这允许 A 接触 B、B 再接触 C 后，A 的部分特征经过 B 的二次折射传递给 C。传播次数越多，原始身份越难辨认，形成“复制但不断变异”的系统。

## 8. 几何结算

最终几何不再只由 smooth-min 决定：

\[
d_i'
=
d_i
-\alpha\phi_iA_{ij}
+\beta\rho_{ji}
\]

\[
d_{final}
=
\operatorname{softmin}_i
\left(
d_i',k_i(\mathbf p)
\right)
\]

- \(-\alpha\phi_iA_{ij}\)：溶解或侵蚀。
- \(+\beta\rho_{ji}\)：来自其他对象的复制生长。
- \(k_i(\mathbf p)\)：根据局部厚度、曲率和材质阻抗变化的平滑尺度。

为避免薄壁膨胀，应满足：

\[
k_i(\mathbf p)
\le
c\,\operatorname{thickness}_i(\mathbf p)
\]

## 9. 显示模型

显示颜色由四部分构成：

\[
C=
C_{PBR}
+e_rR
+e_cA_{ij}
+e_g\|\nabla_{\Gamma}\phi\|
\]

- \(C_{PBR}\)：原始材质的物理光照。
- \(R\)：基于 Fresnel 的真实反射。
- \(A_{ij}\)：准周期折射/复制图案。
- \(\|\nabla_{\Gamma}\phi\|\)：只在溶解前沿出现的边界能量。

艺术图案不应该以固定彩色描边形式加入，而应控制粗糙度、薄膜干涉、法线扰动、透射吸收和少量发光。

## 10. 工程实现层级

### Level 1：当前可实时实现

- 在命中点计算接触法线。
- 使用 5 至 8 个黄金角波向量生成准周期干涉场。
- 用 Householder 矩阵反射波向量。
- 用干涉场调制局部相场、粗糙度和吸收前沿。
- 继续使用现有八个各向异性相场种子。

### Level 2：局部 GPU 相场

- 为每个活动接触区域分配低分辨率二维切平面纹理。
- 使用 ping-pong texture 运行 Gray-Scott。
- 将二维结果通过接触切空间映射回三维表面。
- 适合实时浏览器实现，成本低于完整三维 PDE。

### Level 3：完整三维系统

- 稀疏窄带三维相场。
- 多物体接触图与材质基因传播。
- 曲率和厚度约束的自适应布尔结算。
- 多通道 PBR 体积场。
- 局部网格提取与持久化编辑历史。

## 11. 可验证目标

1. 图案具有准周期秩序，但观察不到固定平铺单元。
2. 图案方向随接触法线连续旋转。
3. 多物体接触时，特征沿接触图传播而不是全局同步。
4. 相同对象在不同材质阻抗下产生不同折射方向和扩散尺度。
5. 分离后复制痕迹按设定历史保留或衰减。
6. 薄壁另一侧不被同一次表面反应明显污染。
7. 原始 PBR 材质仍可识别，艺术场只影响接触窄带。
8. 1080p 交互目标保持不低于 30 FPS。

## 12. 独立性

Refractive Contact Field 是 MeltMesh 为开源研究项目提出的建模框架。影视作品只提供哲学和视觉语境；公式来源于公开数学工具的重新组合，包括 SDF、Householder 反射、Snell 型折射、准周期函数、Allen-Cahn、Gray-Scott 和图拉普拉斯。
