# MeltMesh 数学模型规格

## 0. 文档目的

本文把 MeltMesh 的“折射、复制、溶解”概念写成可计算、可离散、可调参、可验证的数学系统。

它不是对真实材料化学的完整模拟，也不是对任何商业软件内核的推测复刻。它是一套面向实时视觉计算的现象学模型：保留足够明确的几何和动力学结构，同时允许艺术家控制结果。

模型需要同时满足：

1. **局部性**：没有接触就没有传播。
2. **方向性**：A 溶进 B 与 B 溶进 A 可以不同。
3. **历史性**：结果与接触持续时间和运动路径有关。
4. **多体性**：三个以上物体可通过接触网络传播特征。
5. **可解释性**：每个视觉变化对应明确状态量。
6. **可控性**：艺术参数不破坏数值稳定性。
7. **实时性**：浏览器中可以渐进近似，而非必须离线求解。

---

## 1. 世界、对象与状态

空间域：

\[
\Omega\subset\mathbb R^3
\]

时间：

\[
t\in\mathbb R_{\ge0}
\]

系统包含 \(N\) 个对象：

\[
\mathcal O=\{O_1,O_2,\ldots,O_N\}
\]

每个对象不是单一网格，而是一个状态元组：

\[
O_i=
\left(
d_i,
\phi_i,
\mathbf g_i,
\mathbf v_i,
\mathbf T_i,
Z_i,
\chi_i
\right)
\]

其中：

- \(d_i(\mathbf p,t)\)：有符号距离或保守距离估计。
- \(\phi_i(\mathbf p,t)\in[0,1]\)：对象身份相场。
- \(\mathbf g_i(\mathbf p,t)\)：形态与材质基因向量。
- \(\mathbf v_i\)：速度场或刚体速度。
- \(\mathbf T_i\)：对象到世界的变换。
- \(Z_i\)：形态阻抗。
- \(\chi_i\)：对象角色，例如吸收者、供体、催化剂、镜像体。

### 1.1 符号距离约定

\[
d_i(\mathbf p)<0\quad\mathbf p\text{ 位于对象内部}
\]

\[
d_i(\mathbf p)=0\quad\mathbf p\text{ 位于对象表面}
\]

\[
d_i(\mathbf p)>0\quad\mathbf p\text{ 位于对象外部}
\]

严格 SDF 满足 Eikonal 方程：

\[
\|\nabla d_i\|=1
\]

体素化、非均匀缩放和噪声扰动会破坏这个性质。因此实时求解器使用保守步长，而不假设所有场都严格满足 Eikonal 条件。

### 1.2 形态基因向量

定义：

\[
\mathbf g_i=
\begin{bmatrix}
\mathbf c\\
r\\
m\\
\tau\\
\eta\\
e\\
f_s\\
a_s\\
\mathbf q_s
\end{bmatrix}
\]

- \(\mathbf c\in[0,1]^3\)：基础颜色。
- \(r\in[0,1]\)：粗糙度。
- \(m\in[0,1]\)：金属度。
- \(\tau\in[0,1]\)：透射率。
- \(\eta\ge1\)：光学折射率。
- \(e\ge0\)：发光强度。
- \(f_s\)：形态频率。
- \(a_s\)：形态振幅。
- \(\mathbf q_s\)：纹理或结构方向。

把几何特征频率也视为基因，可以使“复制”影响形状，而不只是颜色。

---

## 2. 距离场构造

### 2.1 解析体

球：

\[
d_{sphere}(\mathbf p)=\|\mathbf p-\mathbf c\|-r
\]

圆角盒：

\[
\mathbf q=|\mathbf p-\mathbf c|-\mathbf b+r
\]

\[
d_{roundbox}
=
\min(\max(q_x,q_y,q_z),0)
+\|\max(\mathbf q,0)\|-r
\]

### 2.2 导入网格距离场

对三角形集合 \(\mathcal T\)：

\[
\tilde d(\mathbf p)=
\min_{T\in\mathcal T}
\mathrm{dist}(\mathbf p,T)
\]

封闭网格可利用奇偶射线或广义绕数确定符号：

\[
d(\mathbf p)=s(\mathbf p)\tilde d(\mathbf p),
\qquad s\in\{-1,+1\}
\]

开放薄网格使用壳层场：

\[
d_{shell}(\mathbf p)=\tilde d(\mathbf p)-h
\]

其中 \(h\) 是人工壳层厚度。窗纱、布料和单面板应使用壳层语义，而不能错误地假设它们具有封闭内部。

### 2.3 局部特征尺度

定义局部厚度估计：

\[
\ell_i(\mathbf p)
\approx
\min\left(
|d_i(\mathbf p+s\mathbf n)|
+|d_i(\mathbf p-s\mathbf n)|
\right)
\]

或通过 medial-axis 近似获得。所有布尔平滑半径必须满足：

\[
k_i(\mathbf p)\le c_\ell\ell_i(\mathbf p)
\]

否则薄框和锐角会被错误膨胀。

---

## 3. 接触不是一个点，而是一张膜

### 3.1 接触窄带

对象 \(i,j\) 的候选接触域：

\[
\Gamma_{ij}^{\varepsilon}
=
\left\{
\mathbf p\in\Omega:
|d_i-d_j|<\varepsilon_d,
\quad
\max(d_i,d_j)<\varepsilon_c
\right\}
\]

第一项表示双方对该空间位置具有相近所有权，第二项排除两个远距离场数值偶然相等的情况。

### 3.2 接触权重

\[
w_{ij}(\mathbf p)
=
\exp\left[-\frac{(d_i-d_j)^2}{2\sigma_d^2}\right]
\exp\left[-\frac{\max(d_i,d_j)^2}{2\sigma_c^2}\right]
\]

再乘相对速度门控：

\[
v_n=(\mathbf v_i-\mathbf v_j)\cdot\mathbf n_{ij}
\]

\[
g_v=\mathrm{smoothstep}(v_0,v_1,-v_n)
\]

接近速度越高，初次反应越强；分离时不会继续注入新的相态。

### 3.3 接触法线与切空间

\[
\mathbf n_i=\frac{\nabla d_i}{\|\nabla d_i\|},
\qquad
\mathbf n_j=\frac{\nabla d_j}{\|\nabla d_j\|}
\]

\[
\mathbf n_{ij}
=
\frac{\mathbf n_i-\mathbf n_j}
{\|\mathbf n_i-\mathbf n_j\|+\epsilon}
\]

选择切向基：

\[
\mathbf t_1=
\frac{\mathbf a\times\mathbf n_{ij}}
{\|\mathbf a\times\mathbf n_{ij}\|},
\qquad
\mathbf t_2=\mathbf n_{ij}\times\mathbf t_1
\]

接触坐标：

\[
u=(\mathbf p-\mathbf c)\cdot\mathbf t_1
\]

\[
v=(\mathbf p-\mathbf c)\cdot\mathbf t_2
\]

\[
n=(\mathbf p-\mathbf c)\cdot\mathbf n_{ij}
\]

艺术图案与反应扩散优先在 \((u,v)\) 接触切平面求解，避免穿过薄壁。

---

## 4. 折射：形态信息如何过膜

### 4.1 Householder 反射

\[
H(\mathbf n)=I-2\mathbf n\mathbf n^T
\]

方向、频率或局部坐标经过反射：

\[
\mathbf q_r=H(\mathbf n_{ij})\mathbf q_i
\]

它保证接触面变化时，复制结构的方向连续响应法线，而不是固定在世界坐标。

### 4.2 形态阻抗

定义无量纲阻抗：

\[
Z_i=
z_0
+z_m m_i
+z_r(1-r_i)
+z_\tau\tau_i
+z_\kappa|\kappa_i|
+z_\rho\rho_i
\]

- 金属和光滑表面可具有更高阻抗。
- 高曲率区域可增加阻抗，限制复制穿过尖角。
- \(\rho_i\) 是用户定义的概念密度，不必对应真实质量密度。

### 4.3 Snell 型传递

\[
\eta_{ij}=\frac{Z_i}{Z_j}
\]

对入射方向 \(\mathbf q_i\)：

\[
c_i=-\mathbf n\cdot\mathbf q_i
\]

\[
k=1-\eta_{ij}^2(1-c_i^2)
\]

若 \(k\ge0\)：

\[
\mathbf q_t
=
\eta_{ij}\mathbf q_i
+(\eta_{ij}c_i-\sqrt{k})\mathbf n
\]

若 \(k<0\)，发生“全形态反射”，只生成 \(\mathbf q_r\)，不向另一对象传递主结构。

### 4.4 反射与透射比例

使用 Schlick 近似：

\[
R_0=\left(\frac{Z_i-Z_j}{Z_i+Z_j}\right)^2
\]

\[
R(\theta)=R_0+(1-R_0)(1-\cos\theta)^5
\]

\[
T=1-R
\]

这不是声称材料真的遵守光学，而是利用稳定、可解释的光学形式控制形态信息的反射与传递比例。

---

## 5. 复制：不是克隆，而是变异传递

### 5.1 传递矩阵

\[
\mathbf g_{i\rightarrow j}
=
\mathcal T_{ij}\mathbf g_i
\]

\[
\mathcal T_{ij}
=
T\mathcal R(\mathbf q_t)
+R\mathcal H(\mathbf q_r)
\]

其中 \(\mathcal R\) 重定向结构频率和法线方向，\(\mathcal H\) 表示反射分量。

### 5.2 受控变异

\[
\mathbf g_{i\rightarrow j}'
=
\mathbf g_{i\rightarrow j}
+\mu\mathbf M A_{ij}(\mathbf p,t)
\]

- \(\mu\)：变异强度。
- \(\mathbf M\)：限制哪些基因可变异的掩码。
- \(A_{ij}\)：有数学秩序的艺术场。

颜色、粗糙度和形态振幅应分别设上界：

\[
\mathbf g'\leftarrow
\mathrm{project}_{\mathcal G}(\mathbf g')
\]

其中 \(\mathcal G\) 是合法材质参数域。

### 5.3 所有权更新

\[
\rho_{ij}=w_{ij}\phi_{ij}A_{ij}
\]

\[
\mathbf g_j'
=(1-\rho_{ij})\mathbf g_j
+\rho_{ij}\mathbf g_{i\rightarrow j}'
\]

复制只有在接触权重、相场历史和艺术场三者同时存在时发生。

---

## 6. 艺术规律：准晶体而非白噪声

### 6.1 黄金角谱

黄金角：

\[
\theta_g=\pi(3-\sqrt5)
\]

构造 \(M\) 个方向：

\[
\theta_m=m\theta_g
\]

\[
\mathbf k_m
=
k_m(cos\theta_m\mathbf t_1+sin\theta_m\mathbf t_2)
\]

因为黄金角与 \(2\pi\) 不形成低阶有理比，方向集合不会快速重复。

### 6.2 准周期干涉

\[
Q(\mathbf p,t)
=
\frac1M
\sum_{m=1}^{M}
\cos(\mathbf k_m\cdot\mathbf p+\omega_mt+\psi_m)
\]

归一化：

\[
A_Q=\frac12+\frac12Q
\]

通过非线性重映射形成晶格或裂隙：

\[
A_{cell}=\mathrm{smoothstep}(a,b,|Q|)
\]

\[
A_{ridge}=\exp(-\gamma|Q-q_0|)
\]

### 6.3 折射干涉

原始谱：

\[
Q_i=Q(\mathbf p;\mathbf k_m)
\]

反射谱：

\[
Q_r=Q(\mathbf p;H(\mathbf n)\mathbf k_m)
\]

折射谱：

\[
Q_t=Q(\mathbf p;\mathcal S_{ij}\mathbf k_m)
\]

组合：

\[
A_{ij}=R Q_r+T Q_t+\xi Q_iQ_t
\]

乘积项 \(Q_iQ_t\) 产生拍频，表现为缓慢变化的大尺度带状结构。

### 6.4 为什么不用纯随机噪声

白噪声满足统计均匀，却缺乏跨尺度的视觉因果。准周期谱具有：

- 不明显重复。
- 可由接触法线连续旋转。
- 可被阻抗稳定地折射。
- 可复现，方便测试和分享场景。
- 可通过频谱直接控制艺术尺度。

随机噪声只作为微小扰动项：

\[
A=(1-\epsilon)A_Q+\epsilon N,
\qquad \epsilon\ll1
\]

---

## 7. 溶解动力学

### 7.1 Allen-Cahn 身份相场

\[
\frac{\partial\phi}{\partial t}
=
D_\phi\Delta_\Gamma\phi
-\lambda(\phi^3-\phi)
+S_{contact}
-S_{recovery}
\]

双稳态势能：

\[
W(\phi)=\frac14(\phi^2-1)^2
\]

\[
-\frac{dW}{d\phi}=-(\phi^3-\phi)
\]

它倾向让状态停留在未反应或已反应两种相态，而不是长期处于模糊的中间灰区。

### 7.2 Cahn-Hilliard 守恒版本

若希望“旧身份不会凭空消失，而是在表面搬运”：

\[
\frac{\partial\phi}{\partial t}
=
\nabla_\Gamma\cdot(M\nabla_\Gamma\mu)
\]

\[
\mu=W'(\phi)-\epsilon^2\Delta_\Gamma\phi
\]

Cahn-Hilliard 更符合质量守恒，但需要四阶空间导数，实时实现成本更高。

### 7.3 当前低成本近似

每个接触种子强度：

\[
\frac{da_i}{dt}=\alpha(1-a_i)
\quad\text{接触时}
\]

\[
\frac{da_i}{dt}=-\beta a_i
\quad\text{分离时}
\]

各向异性核：

\[
\phi_i
=
a_i\exp\left(
-\frac{d_T^2}{2\sigma_T^2}
-\frac{d_N^2}{2\sigma_N^2}
\right)
\]

概率并集：

\[
\phi=1-\prod_i(1-\phi_i)
\]

这是完整表面 PDE 的解析低秩近似。

---

## 8. 反应扩散复制

### 8.1 Gray-Scott

\[
\frac{\partial u}{\partial t}
=D_u\Delta_\Gamma u-uv^2+F(1-u)
\]

\[
\frac{\partial v}{\partial t}
=D_v\Delta_\Gamma v+uv^2-(F+K)v
\]

解释：

- \(u\)：原有材质或未反应基质。
- \(v\)：被折射复制的形态基因。
- \(uv^2\)：自催化复制。
- \(F\)：外部补给。
- \(K\)：衰减。

### 8.2 参数区域与视觉倾向

以下仅是归一化系统中的起始区域，需要根据离散尺度校准：

| 配方 | \(F\) | \(K\) | 倾向 |
|---|---:|---:|---|
| Cell | 0.035 | 0.065 | 分裂细胞与斑点 |
| Maze | 0.029 | 0.057 | 迷宫状通道 |
| Coral | 0.054 | 0.063 | 分叉珊瑚 |
| Echo | 0.018 | 0.051 | 缓慢扩张的重复环 |

这些名字是视觉配方，不是材料物理分类。

### 8.3 接触注入

\[
u\leftarrow u-\delta w_{ij}
\]

\[
v\leftarrow v+\delta w_{ij}A_{ij}
\]

新特征只在真实接触处注入，随后沿接触表面传播。

---

## 9. 多物体接触网络

### 9.1 接触图

\[
G=(V,E,W)
\]

边权：

\[
W_{ij}
=
A_{ij}^{contact}
\cdot
T_{ij}^{duration}
\cdot
\exp(-|Z_i-Z_j|/Z_0)
\]

接触面积越大、时间越长、阻抗越接近，传播越强。

### 9.2 图拉普拉斯传播

对象级基因矩阵：

\[
\mathbf G=
[\mathbf g_1,\mathbf g_2,\ldots,\mathbf g_N]^T
\]

\[
L=D-W
\]

\[
\frac{d\mathbf G}{dt}
=
-\gamma L\mathbf G
+\mathbf S
+\mathbf M
\]

\(\mathbf M\) 是每次跨边传播产生的变异项。

### 9.3 传播代数

路径 \(i\to j\to k\) 的传递：

\[
\mathcal T_{i\to k}
=
\mathcal T_{jk}\mathcal T_{ij}
\]

一般情况下：

\[
\mathcal T_{jk}\mathcal T_{ij}
\ne
\mathcal T_{ij}\mathcal T_{jk}
\]

因此接触顺序会影响最终结果。这种非交换性使系统具有叙事性：同样三个物体，接触顺序不同，最终形态不同。

---

## 10. 几何结算

### 10.1 定向侵蚀

对象 B 吸收 A：

\[
d_C=d_B-r(\phi)+a_nA_{ij}
\]

\[
d_A^{eroded}=\max(d_A,-d_C)
\]

### 10.2 复制生长

\[
d_B^{grown}
=
d_B-g(\rho_{AB},A_{ij})
\]

其中：

\[
g=g_0\rho_{AB}(2A_{ij}-1)
\]

正值向外生长，负值向内形成孔洞。

### 10.3 自适应平滑

\[
k(\mathbf p)
=
\min
\left(
k_{artist},
c_\ell\ell(\mathbf p),
c_\kappa/(|\kappa(\mathbf p)|+\epsilon)
\right)
\]

高曲率和薄壁处自动减小平滑半径。

### 10.4 多体 soft-min

LogSumExp 形式：

\[
d_{final}
=
-\frac1\lambda
\log\sum_i
\exp(-\lambda d_i')
\]

对象数量多时，应减去最小值稳定指数计算：

\[
m=\min_i d_i'
\]

\[
d_{final}
=
m-rac1\lambda
\log\sum_i\exp[-\lambda(d_i'-m)]
\]

---

## 11. 材质与显示

### 11.1 材质所有权单纯形

每个点的对象权重：

\[
\mathbf w=(w_1,\ldots,w_N)
\]

约束：

\[
w_i\ge0,
\qquad
\sum_iw_i=1
\]

使用 softmax：

\[
w_i=
\frac{\exp(-\lambda_md_i+b_i)}
{\sum_j\exp(-\lambda_md_j+b_j)}
\]

\(b_i\) 由相场和复制关系调制。

### 11.2 PBR 参数混合

颜色可线性混合，但粗糙度最好在平方域混合：

\[
r^2=\sum_iw_ir_i^2
\]

法线应在切空间归一化：

\[
\mathbf n=
\frac{\sum_iw_i\mathbf n_i}
{\|\sum_iw_i\mathbf n_i\|}
\]

折射率可通过介电常数近似混合：

\[
\epsilon_r=\sum_iw_i\eta_i^2
\]

\[
\eta=\sqrt{\epsilon_r}
\]

### 11.3 前沿能量

\[
E_{front}=\|\nabla_\Gamma\phi\|
\]

只在相态变化最快的边界产生视觉反馈。它应优先驱动：

- 粗糙度下降，形成湿润边缘。
- 薄膜干涉色。
- 轻微法线起伏。
- 透射吸收变化。
- 极少量发光。

不应直接添加固定宽度、固定颜色的描边。

### 11.4 真实光学反射

\[
F_0=\left(\frac{\eta-1}{\eta+1}\right)^2
\]

\[
F=F_0+(1-F_0)(1-\mathbf n\cdot\mathbf v)^5
\]

真实 Fresnel 负责观察角度相关的边缘反射；艺术折射场负责接触区域的结构变化，两者不应混为一个发光 rim。

---

## 12. 无量纲化

选择特征长度 \(L\)、时间 \(T\)、速度 \(U=L/T\)。

\[
\hat{\mathbf p}=\frac{\mathbf p}{L},
\qquad
\hat t=\frac tT,
\qquad
\hat d=\frac dL
\]

重要无量纲群：

### 12.1 扩散-反应比

\[
\Pi_D=\frac{DT}{L^2}
\]

### 12.2 接触持续比

\[
\Pi_C=\frac{t_{contact}}{T_{reaction}}
\]

### 12.3 侵蚀比

\[
\Pi_E=\frac{r_{erosion}}{\ell_{local}}
\]

若 \(\Pi_E>1\)，侵蚀尺度超过局部厚度，容易穿透薄壁。

### 12.4 平滑比

\[
\Pi_S=\frac{k}{\ell_{local}}
\]

推荐保持：

\[
\Pi_S<0.25
\]

### 12.5 谱尺度比

\[
\Pi_Q=k_{wave}\ell_{contact}
\]

它决定接触区域中出现多少个准周期单元。

无量纲化可以让不同大小模型使用相似参数，而不是为每个 GLB 重新猜测绝对数值。

---

## 13. 数值离散

### 13.1 Sphere Tracing

\[
t_{n+1}=t_n+\alpha d_{safe}(\mathbf p_n)
\]

噪声、形变和插值误差存在时：

\[
0<\alpha<1
\]

可根据局部 Lipschitz 上界调整：

\[
\alpha(\mathbf p)=
\frac{\alpha_0}
{1+c_n\|\nabla n\|+c_\phi\|\nabla\phi\|}
\]

前沿越复杂，步长越保守。

### 13.2 法线

四面体差分比六次中心差分更省采样：

\[
\nabla d\approx
\sum_{k=1}^{4}
\mathbf e_kd(\mathbf p+\epsilon\mathbf e_k)
\]

其中 \(\mathbf e_k\) 是四面体方向。

### 13.3 表面二维 PDE

对每个活动接触创建 \(R\times R\) 切平面纹理。Gray-Scott 显式 Euler：

\[
u^{n+1}=u^n+\Delta t
\left(D_u\Delta_hu^n-u^n(v^n)^2+F(1-u^n)\right)
\]

\[
v^{n+1}=v^n+\Delta t
\left(D_v\Delta_hv^n+u^n(v^n)^2-(F+K)v^n\right)
\]

二维五点 Laplacian：

\[
\Delta_hu_{ij}
=
\frac{u_{i+1,j}+u_{i-1,j}+u_{i,j+1}+u_{i,j-1}-4u_{ij}}{h^2}
\]

显式扩散稳定条件近似：

\[
\Delta t
\le
\frac{h^2}{4\max(D_u,D_v)}
\]

反应项可能要求更小步长；工程上应限制 \(u,v\in[0,1]\)。

### 13.4 半拉格朗日输运

若接触面在移动：

\[
\phi^{n+1}(\mathbf x)
=
\phi^n(\mathbf x-\Delta t\mathbf v_T)
\]

\(\mathbf v_T\) 是表面切向速度。半拉格朗日方法稳定但有数值耗散，可用 MacCormack 修正。

---

## 14. GPU 数据结构

### 14.1 对象缓冲

每个对象记录：

```text
transform
bounds
SDF type / volume index
material gene vector
role
impedance
phase parameters
```

### 14.2 接触缓冲

每个活动接触记录：

```text
objectA, objectB
contact center
normal, tangent1, tangent2
contact radius
phase strength
relative velocity
impedance ratio
spectral seed
age
```

### 14.3 分层求解

1. CPU 或 compute shader 做 broad phase。
2. SDF 支撑点或局部采样做 narrow phase。
3. 更新接触图。
4. 更新接触相场纹理。
5. 更新对象级基因传播。
6. Raymarch 求最终几何。
7. PBR 与原始网格统一深度合成。

---

## 15. 艺术配方

### 15.1 Shimmer：湮灭式折射膜

目标：彩色但不霓虹描边，结构会随观察和接触法线变化。

```text
reflectionWeight   0.35
transmissionWeight 0.65
goldenWaves        7
mutation           0.12
phaseDiffusion     medium
frontEmission      very low
thinFilm           medium
```

数学重点：\(Q_i\)、\(Q_t\) 的拍频和薄膜干涉。

### 15.2 Echo Rooms：后室式重复变异

目标：重复框架逐步偏移、尺度失真，但仍保持准规则。

```text
goldenWaves        5
graphPropagation   high
mutation           0.04 per hop
scaleDrift         1.018 per hop
rotationDrift      golden angle
recovery           0
```

路径传播：

\[
s_n=s_0(1+\delta_s)^n
\]

\[
\theta_n=\theta_0+n\theta_g
\]

每次复制相似但不完全相同，避免普通阵列的机械感。

### 15.3 Mycelium：菌丝接触网络

目标：特征沿多物体接触图分叉传播。

```text
GrayScott          Coral
graphDiffusion     medium
contactMemory      high
impedanceContrast  low
erosion            low
growth             high
```

### 15.4 Crystal Memory：晶体记忆

目标：接触区域形成稳定准晶格，并在分离后保留。

```text
quasicrystal       high frequency
recovery           0
booleanSmooth      low
roughnessTransfer  high
geometryGrowth     low
```

---

## 16. 参数辨识与校准

### 16.1 单元测试场景

1. 球与无限平面：验证接触距离和轴对称性。
2. 球与薄板：验证不穿透另一侧。
3. 两球斜向擦过：验证切向输运。
4. 玻璃与金属：验证阻抗差异。
5. A-B-C 链：验证图传播和接触顺序。
6. 封闭网格与开放网格：验证 signed/shell 语义。

### 16.2 观测量

- 首次反馈延迟 \(t_{response}\)。
- 接触半径 \(r_{contact}\)。
- 溶解深度 \(h_{erosion}\)。
- 薄壁泄漏率 \(L_{thin}\)。
- 轨迹位置抖动 \(J_{track}\)。
- 材质原貌保持率 \(P_{material}\)。
- 帧时间均值与 95 分位。

### 16.3 损失函数

\[
\mathcal L
=
w_1L_{targetShape}
+w_2L_{thin}
+w_3J_{track}
+w_4(1-P_{material})
+w_5L_{performance}
\]

如果有参考视频，可以加入轮廓、光流和色彩直方图损失，但不应只优化单帧像素相似度。

---

## 17. 稳定性与失败模式

### 17.1 隔空反应

原因：只比较 \(|d_i-d_j|\)，没有限制双方到表面的绝对距离。

修复：接触权重同时包含 \(\max(d_i,d_j)\) 门控。

### 17.2 薄壁双面污染

原因：使用球形三维核。

修复：使用 \(\sigma_N\ll\sigma_T\) 的各向异性表面核或二维接触纹理。

### 17.3 Smooth-min 鼓包

原因：\(k\) 大于局部厚度或曲率尺度。

修复：自适应 \(k(\mathbf p)\)。

### 17.4 规则波纹

原因：少量世界坐标正弦直接相乘。

修复：黄金角谱、折射谱和少量噪声混合。

### 17.5 假描边

原因：用固定颜色 rim 模拟 Fresnel。

修复：真实 Fresnel 负责光学边缘，\(\|\nabla\phi\|\) 只调制接触前沿材质。

### 17.6 Raymarch 穿面

原因：噪声和相场导致场不再是严格 SDF。

修复：保守步长、Lipschitz 估计、最大步长限制和命中后二分精修。

### 17.7 多体结果不稳定

原因：逐对象 min 的求值顺序影响结果。

修复：使用对称多体 LogSumExp 或明确把非交换性作为接触历史的一部分保存。

---

## 18. 实现路线

### 阶段 A：准周期接触显示

- 黄金角波向量。
- 接触法线反射。
- 阻抗控制的反射/透射比例。
- 图案只调制接触区域的粗糙度、吸收和轻微法线。

### 阶段 B：二维接触反应扩散

- 每个活动接触分配 `64×64` RG 纹理。
- WebGPU compute 或 WebGL ping-pong。
- Gray-Scott 更新。
- 切空间映射回三维。

### 阶段 C：多物体接触图

- 稳定对象 ID。
- 接触边生命周期。
- 图拉普拉斯基因传播。
- 非交换接触历史。

### 阶段 D：自适应几何

- `128³` 局部窄带或稀疏体素。
- 局部厚度与曲率估计。
- 自适应布尔半径。
- 命中后二分精修。

### 阶段 E：持久化作品

- 保存对象、接触图、相场纹理和随机谱种子。
- 可撤销历史。
- 确定性重放。
- 分享链接和导出网格。

---

## 19. 最小可行方程组

如果只保留最关键部分，实时版本可以使用：

接触：

\[
w_{ij}
=
e^{-(d_i-d_j)^2/(2\sigma_d^2)}
e^{-\max(d_i,d_j)^2/(2\sigma_c^2)}
\]

相场：

\[
\phi=1-\prod_s
\left[
1-a_s
e^{-d_T^2/(2\sigma_T^2)-d_N^2/(2\sigma_N^2)}
\right]
\]

准周期艺术场：

\[
Q=\frac1M\sum_m
\cos(H(\mathbf n)\mathbf k_m\cdot\mathbf p+\omega_mt)
\]

侵蚀：

\[
d_A'=\max[d_A,-(d_B-r\phi+\mu Q)]
\]

合成：

\[
d=\mathrm{smin}_{k(\mathbf p)}(d_A',d_B)
\]

材质复制：

\[
\mathbf g=(1-w\phi A_Q)\mathbf g_B
+w\phi A_Q\mathcal T_{AB}\mathbf g_A
\]

这组方程已经包含局部接触、历史、折射方向、艺术规律、定向溶解和材质复制。

---

## 20. 项目的独立切入点

MeltMesh 不需要以“开源 Womp 克隆”为定位。更有价值的命题是：

> 当多个数字物体接触时，它们是否可以像生态系统一样交换形态信息，而不仅是进行一次布尔运算？

在这个命题中：

- SDF 提供连续几何语言。
- 接触流形提供传播介质。
- 折射算子提供方向变化。
- 准周期谱提供可识别的数学美感。
- 相场提供时间和记忆。
- 反应扩散提供复制与自组织。
- 接触图提供多物体叙事。

这使 MeltMesh 从一个造型工具变成一个“形态生态实验台”。
