# MeltMesh 한국어

[English](../../README.md) · [简体中文](../../README.zh-CN.md) · [日本語](README.ja.md) · 한국어 · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português](README.pt-BR.md)

![MeltMesh hero preview](../meltmesh-hero.svg)

MeltMesh는 브라우저에서 실행되는 반응형 SDF 재질 융합 샌드박스입니다.

GLB 자산을 가져와 다른 물체와 접촉시키면, 겹치는 영역은 단순한 시각적 오버레이가 아니라 새롭게 계산되는 접촉 재질이 됩니다.

## 현재 기능

- 최대 5개의 GLB 자산을 동시에 가져오기.
- 각 자산을 독립적으로 선택, 이동, 스케일 조정.
- 원본 Three.js PBR 메시, 텍스처, 애니메이션 유지.
- Blender를 통해 GLB를 `64^3` SDF 볼륨으로 변환.
- 색상, 거칠기, 금속도, 알파, 발광, 투과율을 재질 볼륨으로 베이크.
- 해석적 SDF 프리미티브와 가져온 메시 SDF를 융합.
- 접촉 기억, 용해 전선, 굴절 reflection 밴드를 실시간 렌더링.

## 수학 모델

상호작용 상태는 다음 벡터로 표현됩니다.

```math
z_t =
\left[
p_t,\ d_t,\ v_t,\ \tau_t,\ c_t,\ n_t
\right]
```

도메인 라우터는 SDF, 위상장, 광학 재질 도메인의 가중치를 계산합니다.

```math
\pi_t =
\operatorname{softmax}
\begin{bmatrix}
s_{\mathrm{SDF}}(z_t) \\
s_{\mathrm{phase}}(z_t) \\
s_{\mathrm{optical}}(z_t)
\end{bmatrix}
```

접촉 reflection은 다음과 같은 국소 광학장으로 모델링됩니다.

```math
R(x,n,t) =
K(x,t)\ I(x)\ Q(x,n,t)\ F(n,v)
```

`K`는 접촉 커널, `I`는 재질 임피던스, `Q`는 준결정 스펙트럼 기저, `F`는 Fresnel 응답입니다.

## 로컬 실행

```bash
git clone https://github.com/hippoley/meltmesh.git
cd meltmesh
python server.py
```

브라우저에서 엽니다.

```text
http://127.0.0.1:4173/
```

## 독창성

MeltMesh는 SDF, sphere tracing, smooth CSG, 위상장, 볼륨 샘플링, 스크린 공간 굴절, PBR 같은 공개 그래픽스 기술을 사용합니다. Womp 또는 Fidget의 소스 코드, 사유 알고리즘, 자산은 포함하지 않습니다.
