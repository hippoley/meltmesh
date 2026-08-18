import * as THREE from './vendor/three/three.module.js';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';

function sanitizeGlb(buffer) {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) return buffer;
  const jsonLength = view.getUint32(12, true);
  const document = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)).trim());
  for (const material of document.materials || []) {
    const volume = material.extensions?.KHR_materials_volume;
    if (volume && volume.attenuationDistance == null) delete volume.attenuationDistance;
  }
  let json = new TextEncoder().encode(JSON.stringify(document));
  const paddedLength = Math.ceil(json.length / 4) * 4;
  const output = new Uint8Array(20 + paddedLength + buffer.byteLength - 20 - jsonLength);
  output.set(new Uint8Array(buffer, 0, 12));
  const outputView = new DataView(output.buffer);
  outputView.setUint32(8, output.length, true);
  outputView.setUint32(12, paddedLength, true);
  outputView.setUint32(16, 0x4e4f534a, true);
  output.fill(0x20, 20, 20 + paddedLength);
  output.set(json, 20);
  output.set(new Uint8Array(buffer, 20 + jsonLength), 20 + paddedLength);
  return output.buffer;
}

function createEnvironment(renderer) {
  const environment = new THREE.Scene();
  environment.background = new THREE.Color(0xe8edf0);
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(12, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xeef1f2, side: THREE.BackSide })
  );
  environment.add(room);
  const panels = [
    [0xffd7bd, [-3, 2, -2], [0, Math.PI / 2, 0]],
    [0xc8e4ff, [3, 1, 0], [0, -Math.PI / 2, 0]],
    [0xffffff, [0, 4, 0], [Math.PI / 2, 0, 0]],
  ];
  for (const [color, position, rotation] of panels) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    panel.position.set(...position); panel.rotation.set(...rotation); environment.add(panel);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(environment, 0.04).texture;
  pmrem.dispose();
  return texture;
}

function createSkyTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
  const context = canvas.getContext('2d');
  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#3278b6'); sky.addColorStop(0.48, '#8fc0df'); sky.addColorStop(0.72, '#dbe8ed'); sky.addColorStop(1, '#aebec4');
  context.fillStyle = sky; context.fillRect(0, 0, canvas.width, canvas.height);
  const sun = context.createRadialGradient(760, 126, 2, 760, 126, 78);
  sun.addColorStop(0, 'rgba(255,252,224,1)'); sun.addColorStop(0.16, 'rgba(255,245,196,.82)'); sun.addColorStop(1, 'rgba(255,245,210,0)');
  context.fillStyle = sun; context.fillRect(620, 0, 280, 280);
  const clouds = [[130,185,155,34],[410,132,190,28],[680,205,145,25],[900,165,130,24]];
  context.fillStyle = 'rgba(255,255,255,.52)';
  for (const [x,y,w,h] of clouds) { context.beginPath(); context.ellipse(x,y,w,h,0,0,Math.PI*2); context.ellipse(x+w*.45,y-16,w*.48,h*.8,0,0,Math.PI*2); context.fill(); }
  const texture = new THREE.CanvasTexture(canvas); texture.mapping = THREE.EquirectangularReflectionMapping; texture.encoding = THREE.sRGBEncoding;
  return texture;
}

function createGround() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const context = canvas.getContext('2d');
  const tile = canvas.width / 8;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    context.fillStyle = (x + y) % 2 ? '#aeb8bc' : '#dce2e3';
    context.fillRect(x * tile, y * tile, tile, tile);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.encoding = THREE.sRGBEncoding;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshStandardMaterial({ map: texture, color: 0xffffff, roughness: 0.78, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.38;
  ground.userData.isGround = true;
  return ground;
}

const proceduralPbrCache = new Map();
function canvasPbrTexture(key, painter, repeatX = 1, repeatY = 1) {
  const cacheKey = `${key}:${repeatX}:${repeatY}`;
  if (proceduralPbrCache.has(cacheKey)) return proceduralPbrCache.get(cacheKey);
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const context = canvas.getContext('2d');
  painter(context, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.encoding = THREE.sRGBEncoding;
  texture.anisotropy = 8;
  proceduralPbrCache.set(cacheKey, texture);
  return texture;
}
function createSunsetSkyTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
  const context = canvas.getContext('2d');
  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#1b3152'); sky.addColorStop(0.38, '#516f91'); sky.addColorStop(0.62, '#e19662'); sky.addColorStop(1, '#f7c17a');
  context.fillStyle = sky; context.fillRect(0, 0, canvas.width, canvas.height);
  const sun = context.createRadialGradient(790, 330, 2, 790, 330, 170);
  sun.addColorStop(0, 'rgba(255,233,165,1)'); sun.addColorStop(0.2, 'rgba(255,178,98,.84)'); sun.addColorStop(1, 'rgba(255,147,89,0)');
  context.fillStyle = sun; context.fillRect(560, 120, 420, 360);
  context.fillStyle = 'rgba(22,34,48,.45)';
  for(let i=0;i<16;i++){const x=i*76-40, h=30+Math.sin(i*1.7)*16;context.fillRect(x,360-h,58,h);}
  const texture = new THREE.CanvasTexture(canvas); texture.mapping = THREE.EquirectangularReflectionMapping; texture.encoding = THREE.sRGBEncoding;
  return texture;
}
function createPoolWaterNormal() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  const image = context.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const u = x / canvas.width, v = y / canvas.height;
    const waveX = Math.sin(u * Math.PI * 16 + v * Math.PI * 5) * .55 + Math.sin(u * Math.PI * 29 - v * Math.PI * 11) * .25;
    const waveY = Math.cos(v * Math.PI * 18 - u * Math.PI * 7) * .52 + Math.sin(v * Math.PI * 34 + u * Math.PI * 9) * .2;
    const index = (y * canvas.width + x) * 4;
    image.data[index] = 128 + waveX * 42;
    image.data[index + 1] = 128 + waveY * 42;
    image.data[index + 2] = 255;
    image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 12);
  texture.encoding = THREE.LinearEncoding;
  return texture;
}
function linearDataTexture(key, painter, repeatX = 1, repeatY = 1) {
  const texture = canvasPbrTexture(key, painter, repeatX, repeatY).clone();
  texture.encoding = THREE.LinearEncoding;
  texture.needsUpdate = true;
  return texture;
}
function paintWood(ctx, w, h) {
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, '#5f3419'); gradient.addColorStop(.45, '#b06a31'); gradient.addColorStop(1, '#3d2112');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
  for (let y = -h; y < h * 2; y += 18) {
    const offset = Math.sin(y * .017) * 42 + Math.sin(y * .051) * 12;
    ctx.strokeStyle = `rgba(${70 + (y % 40)},${35 + (y % 30)},18,.34)`;
    ctx.lineWidth = 3 + Math.abs(Math.sin(y * .03)) * 9;
    ctx.beginPath();
    for (let x = -80; x <= w + 80; x += 32) {
      const yy = y + Math.sin(x * .018 + y * .012) * 20 + offset;
      if (x === -80) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 34; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 18 + Math.random() * 45;
    const knot = ctx.createRadialGradient(x, y, 3, x, y, r);
    knot.addColorStop(0, 'rgba(40,18,6,.65)'); knot.addColorStop(.42, 'rgba(115,52,18,.25)'); knot.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = knot; ctx.beginPath(); ctx.ellipse(x, y, r * 1.55, r * .55, Math.random() * Math.PI, 0, Math.PI * 2); ctx.fill();
  }
}
function paintBrushLines(ctx, w, h, base = '#b9bec1') {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y++) {
    const value = 165 + Math.floor(Math.sin(y * .23) * 18 + Math.random() * 24);
    ctx.fillStyle = `rgba(${value},${value + 3},${value + 6},.34)`;
    ctx.fillRect(0, y, w, 1);
  }
  for (let i = 0; i < 120; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.04 + Math.random() * .08})`;
    ctx.lineWidth = 1;
    const y = Math.random() * h; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + Math.sin(i) * 18); ctx.stroke();
  }
}
function paintCeramic(ctx, w, h) {
  const gradient = ctx.createRadialGradient(w * .35, h * .25, 5, w * .5, h * .5, w * .74);
  gradient.addColorStop(0, '#fffaf0'); gradient.addColorStop(.52, '#f5e7d2'); gradient.addColorStop(1, '#dcc6a9');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(128,90,48,.10)'; ctx.lineWidth = 1.4;
  for (let i = 0; i < 80; i++) {
    let x = Math.random() * w, y = Math.random() * h;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let j = 0; j < 7; j++) { x += (Math.random() - .5) * 54; y += (Math.random() - .5) * 54; ctx.lineTo(x, y); }
    ctx.stroke();
  }
}
function paintSpeckle(ctx, w, h, base = '#9fa3a0', contrast = 44) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 42000; i++) {
    const v = 128 + (Math.random() - 0.5) * contrast;
    ctx.fillStyle = `rgba(${v},${v},${v},${0.12 + Math.random() * 0.26})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}
function paintFabric(ctx, w, h, color = '#6f7fa9') {
  ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < w; i += 6) { ctx.fillStyle = `rgba(255,255,255,${i % 12 ? .045 : .08})`; ctx.fillRect(i, 0, 2, h); }
  for (let j = 0; j < h; j += 7) { ctx.fillStyle = `rgba(0,0,0,${j % 14 ? .045 : .08})`; ctx.fillRect(0, j, w, 2); }
}
function paintWallpaper(ctx, w, h, color = '#5b6fa8') {
  ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,.26)'; ctx.lineWidth = 4;
  for (let y = -80; y < h + 80; y += 120) for (let x = -80; x < w + 80; x += 120) {
    ctx.beginPath();
    ctx.ellipse(x, y, 34, 78, Math.PI / 4, 0, Math.PI * 2);
    ctx.ellipse(x + 56, y + 46, 34, 78, -Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}
function applyTextureSet(material, { map, roughnessMap, bumpMap, metalnessMap, bumpScale = 0.04 }) {
  if (map) material.map = map;
  if (roughnessMap) material.roughnessMap = roughnessMap;
  if (metalnessMap) material.metalnessMap = metalnessMap;
  if (bumpMap) { material.bumpMap = bumpMap; material.bumpScale = bumpScale; }
}
function tuneRecognizableSampleMaterial(material) {
  const name = String(material.name || '').toLowerCase();
  if (!name) return;
  const setColor = hex => material.color?.set(hex);
  if (name.includes('plastic')) {
    setColor(0xff2858);
    material.metalness = 0.0;
    material.roughness = 0.14;
    material.envMapIntensity = 1.65;
    if ('clearcoat' in material) material.clearcoat = 0.75;
    if ('clearcoatRoughness' in material) material.clearcoatRoughness = 0.08;
    applyTextureSet(material, { bumpMap: linearDataTexture('plastic-orange-peel', (ctx,w,h)=>{ctx.fillStyle='#808080';ctx.fillRect(0,0,w,h);for(let i=0;i<9000;i++){const v=118+Math.random()*34;ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(Math.random()*w,Math.random()*h,2,2);}}, 4, 4), bumpScale: 0.012 });
  } else if (name.includes('polished metal')) {
    setColor(0xffb14a);
    material.metalness = 1.0;
    material.roughness = 0.055;
    material.envMapIntensity = 2.55;
    applyTextureSet(material, { roughnessMap: linearDataTexture('polished-micro-scratches', (ctx,w,h)=>paintBrushLines(ctx,w,h,'#5f6264'), 1, 5), bumpMap: linearDataTexture('polished-bump-scratches', (ctx,w,h)=>paintBrushLines(ctx,w,h,'#808080'), 1, 8), bumpScale: 0.018 });
  } else if (name.includes('walnut') || name.includes('wood')) {
    setColor(0x8a4c22);
    material.metalness = 0.0;
    material.roughness = 0.62;
    material.envMapIntensity = 0.72;
    if ('clearcoat' in material) material.clearcoat = 0.08;
    applyTextureSet(material, { map: canvasPbrTexture('walnut-basecolor', paintWood, 2, 2), roughnessMap: linearDataTexture('walnut-roughness', (ctx,w,h)=>{paintWood(ctx,w,h);ctx.globalCompositeOperation='color';ctx.fillStyle='#8f8f8f';ctx.fillRect(0,0,w,h);}, 2, 2), bumpMap: linearDataTexture('walnut-bump', paintWood, 2, 2), bumpScale: 0.055 });
  } else if (name.includes('porcelain')) {
    setColor(0xfff2de);
    material.metalness = 0.0;
    material.roughness = 0.16;
    material.envMapIntensity = 1.85;
    if ('clearcoat' in material) material.clearcoat = 0.86;
    if ('clearcoatRoughness' in material) material.clearcoatRoughness = 0.045;
    applyTextureSet(material, { map: canvasPbrTexture('porcelain-glaze', paintCeramic, 1, 1), roughnessMap: linearDataTexture('porcelain-roughness', paintCeramic, 1, 1), bumpMap: linearDataTexture('porcelain-crazing-bump', paintCeramic, 1, 1), bumpScale: 0.018 });
  } else if (name.includes('steel')) {
    setColor(0xb8bdc0);
    material.metalness = 1.0;
    material.roughness = 0.42;
    material.envMapIntensity = 2.05;
    if ('clearcoat' in material) material.clearcoat = 0.0;
    applyTextureSet(material, { roughnessMap: linearDataTexture('brushed-steel-roughness', (ctx,w,h)=>paintBrushLines(ctx,w,h,'#9ca2a5'), 1, 12), bumpMap: linearDataTexture('brushed-steel-bump', (ctx,w,h)=>paintBrushLines(ctx,w,h,'#808080'), 1, 16), bumpScale: 0.026 });
  }
  material.needsUpdate = true;
}

window.createThreeRenderer = async function createThreeRenderer(canvas, getState) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.82;
  renderer.physicallyCorrectLights = true;
  renderer.autoClear = false;
  const scene = new THREE.Scene();
  const skyTexture = createSkyTexture(); scene.background = skyTexture;
  const sunsetSkyTexture = createSunsetSkyTexture();
  scene.fog = new THREE.Fog(0xd9edf3, 34, 78);
  const studioEnvironment = createEnvironment(renderer);
  scene.environment = studioEnvironment;
  scene.add(createGround());
  const hemi = new THREE.HemisphereLight(0xf8fbff, 0x58626a, 1.8); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff1df, 4.2); key.position.set(-4, 6, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xb9ddff, 2.0); fill.position.set(4, 2, -3); scene.add(fill);
  const camera = new THREE.PerspectiveCamera(59.49, 1, 0.05, 100);
  const root = new THREE.Group(); scene.add(root);
  const guideRoot = new THREE.Group(); guideRoot.visible = false; scene.add(guideRoot);
  const poolWaterMaterials = [];
  const poolBalls = [];
  const poolCaustics = [];
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const guideFocus = new THREE.Vector3(0, -0.05, 0);
  const sdfScene = new THREE.Scene();
  const sdfCamera = new THREE.Camera();
  const drawingSize = new THREE.Vector2();
  const viewProjection = new THREE.Matrix4();
  let sceneTarget = new THREE.WebGLRenderTarget(1, 1, { minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter, format:THREE.RGBAFormat });
  sceneTarget.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);

  function volumeTexture(data, size, material = false) {
    const texture = new THREE.Data3DTexture(data, size, size, size);
    texture.format = material ? THREE.RGBAFormat : THREE.RedFormat;
    texture.type = material ? THREE.UnsignedByteType : THREE.FloatType;
    texture.minFilter = material ? THREE.LinearFilter : THREE.NearestFilter;
    texture.magFilter = material ? THREE.LinearFilter : THREE.NearestFilter;
    texture.wrapS = texture.wrapT = texture.wrapR = THREE.ClampToEdgeWrapping;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
    return texture;
  }
  function buildGuideMaterial(entry, index) {
    const palette = {
      Architecture: 0x9be15d,
      Geometry: 0x6fd2ff,
      Materials: 0xffc36a,
      Lighting: 0xfff08b,
      Objects: 0xc8a8ff,
      Cameras: 0xb3e5ff,
      Textures: 0xffa6d4,
      Renderer: 0x8bf5c7,
      'Post-FX': 0xff8f66,
      Controls: 0xd0e36b,
      TSL: 0x88ddff,
      Animation: 0xffb37a,
      Audio: 0x9cd0ff,
      Special: 0xa5ffcd,
      Loaders: 0xd7d7d7,
      Physics: 0xffc4a1,
      Helpers: 0xbde35f,
      Curves: 0x91c7ff,
      Math: 0xf2b8ff,
    };
    const color = palette[entry.module] || 0xffffff;
    const key = `${entry.module}:${entry.kind}:${index}`;
    const base = new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.1 });
    if (entry.kind === 'glass' || entry.kind === 'env' || entry.kind === 'camera') {
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.05, metalness: 0.0, transmission: 0.88, transparent: true, opacity: 0.95, ior: 1.5, envMapIntensity: 1.5 });
    }
    if (entry.kind === 'matte' || entry.kind === 'flat') {
      return new THREE.MeshLambertMaterial({ color });
    }
    if (entry.kind === 'toon') {
      return new THREE.MeshToonMaterial({ color });
    }
    if (entry.kind === 'normal') {
      return new THREE.MeshNormalMaterial();
    }
    if (entry.kind === 'wire' || entry.kind === 'axes') {
      return new THREE.MeshBasicMaterial({ color, wireframe: true });
    }
    if (entry.kind === 'points') {
      return new THREE.PointsMaterial({ color, size: 0.08, sizeAttenuation: true });
    }
    if (entry.kind === 'sprite') {
      return new THREE.SpriteMaterial({ color });
    }
    if (entry.kind === 'renderer' || entry.kind === 'webgpu' || entry.kind === 'target') {
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, metalness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.08 });
    }
    if (entry.kind === 'pbr' || entry.kind === 'metal' || entry.kind === 'rough' || entry.kind === 'bump') {
      return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.7 });
    }
    if (entry.kind === 'sdf' || entry.kind === 'wood') {
      return new THREE.MeshStandardMaterial({ color, roughness: 0.68, metalness: 0.0 });
    }
    if (entry.kind === 'bloom' || entry.kind === 'emissive') {
      return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.05 });
    }
    return base;
  }
  function guideGeometry(entry, index) {
    switch (entry.kind) {
      case 'group': return new THREE.DodecahedronGeometry(0.18, 0);
      case 'axes': return new THREE.CylinderGeometry(0.03, 0.03, 0.42, 10);
      case 'ring': return new THREE.TorusGeometry(0.16, 0.05, 8, 24);
      case 'plane': return new THREE.PlaneGeometry(0.34, 0.34);
      case 'cylinder': return new THREE.CylinderGeometry(0.12, 0.12, 0.34, 18);
      case 'cone': return new THREE.ConeGeometry(0.15, 0.34, 18);
      case 'torus': return new THREE.TorusGeometry(0.17, 0.05, 12, 28);
      case 'capsule': return new THREE.CapsuleGeometry(0.11, 0.18, 4, 10);
      case 'tube': return new THREE.TorusKnotGeometry(0.09, 0.028, 64, 8);
      case 'extrude': return new THREE.ExtrudeGeometry(new THREE.Shape([
        new THREE.Vector2(-0.15, -0.1),
        new THREE.Vector2(0.15, -0.1),
        new THREE.Vector2(0.15, 0.1),
        new THREE.Vector2(-0.05, 0.15),
        new THREE.Vector2(-0.15, 0.1),
      ]), { depth: 0.08, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.02, bevelThickness: 0.02 });
      case 'lathe': return new THREE.LatheGeometry([
        new THREE.Vector2(0.04, -0.16), new THREE.Vector2(0.08, -0.12), new THREE.Vector2(0.12, -0.03),
        new THREE.Vector2(0.1, 0.08), new THREE.Vector2(0.05, 0.16)
      ], 24);
      case 'shape': return new THREE.ShapeGeometry(new THREE.Shape([
        new THREE.Vector2(-0.16, -0.08), new THREE.Vector2(0.16, -0.08), new THREE.Vector2(0.12, 0.12), new THREE.Vector2(-0.08, 0.18)
      ]));
      case 'poly': return new THREE.IcosahedronGeometry(0.16, index % 2);
      case 'wire': return new THREE.OctahedronGeometry(0.16, 0);
      case 'custom': return new THREE.TorusKnotGeometry(0.12, 0.035, 72, 10);
      case 'light': return new THREE.SphereGeometry(0.1, 20, 20);
      case 'env': return new THREE.SphereGeometry(0.16, 24, 18);
      case 'flat': return new THREE.BoxGeometry(0.24, 0.24, 0.02);
      case 'matte': return new THREE.SphereGeometry(0.16, 18, 18);
      case 'gloss': return new THREE.SphereGeometry(0.16, 24, 24);
      case 'pbr': return new THREE.SphereGeometry(0.16, 32, 24);
      case 'glass': return new THREE.SphereGeometry(0.17, 32, 24);
      case 'toon': return new THREE.CylinderGeometry(0.12, 0.16, 0.28, 16);
      case 'normal': return new THREE.TorusGeometry(0.16, 0.05, 10, 24);
      case 'depth': return new THREE.BoxGeometry(0.22, 0.22, 0.08);
      case 'shadow': return new THREE.PlaneGeometry(0.34, 0.34);
      case 'sprite': return new THREE.PlaneGeometry(0.26, 0.26);
      case 'points': return new THREE.SphereGeometry(0.15, 10, 10);
      case 'camera': return new THREE.ConeGeometry(0.14, 0.28, 4);
      case 'texture': return new THREE.PlaneGeometry(0.28, 0.28);
      case 'renderer': return new THREE.BoxGeometry(0.23, 0.16, 0.08);
      case 'webgpu': return new THREE.BoxGeometry(0.23, 0.16, 0.08);
      case 'target': return new THREE.BoxGeometry(0.2, 0.2, 0.04);
      case 'bloom': return new THREE.SphereGeometry(0.15, 18, 18);
      case 'ao': return new THREE.TorusGeometry(0.16, 0.04, 8, 24);
      case 'dof': return new THREE.BoxGeometry(0.22, 0.16, 0.12);
      case 'motion': return new THREE.ConeGeometry(0.12, 0.3, 12);
      case 'vignette': return new THREE.CircleGeometry(0.18, 32);
      case 'lut': return new THREE.BoxGeometry(0.18, 0.18, 0.06);
      case 'orbit': return new THREE.TorusGeometry(0.16, 0.04, 10, 24);
      case 'pointer': return new THREE.ConeGeometry(0.12, 0.28, 16);
      case 'drag': return new THREE.BoxGeometry(0.18, 0.18, 0.18);
      case 'transform': return new THREE.OctahedronGeometry(0.16, 0);
      case 'nodes': return new THREE.IcosahedronGeometry(0.16, 0);
      case 'sdf': return new THREE.IcosahedronGeometry(0.16, 1);
      case 'animation': return new THREE.SphereGeometry(0.15, 18, 18);
      case 'keyframe': return new THREE.BoxGeometry(0.18, 0.18, 0.18);
      case 'morph': return new THREE.CapsuleGeometry(0.11, 0.18, 4, 10);
      case 'bone': return new THREE.CylinderGeometry(0.05, 0.05, 0.32, 8);
      case 'audio': return new THREE.TorusGeometry(0.16, 0.05, 10, 24);
      case 'audio3d': return new THREE.SphereGeometry(0.14, 18, 18);
      case 'analyser': return new THREE.BoxGeometry(0.18, 0.18, 0.18);
      case 'sky': return new THREE.SphereGeometry(0.18, 18, 18);
      case 'mirror': return new THREE.PlaneGeometry(0.28, 0.28);
      case 'ray': return new THREE.ConeGeometry(0.1, 0.3, 12);
      case 'particles': return new THREE.SphereGeometry(0.14, 12, 12);
      case 'gltf': return new THREE.BoxGeometry(0.18, 0.24, 0.14);
      case 'obj': return new THREE.CylinderGeometry(0.1, 0.12, 0.22, 8);
      case 'fbx': return new THREE.CapsuleGeometry(0.09, 0.16, 4, 8);
      case 'draco': return new THREE.TorusGeometry(0.14, 0.04, 8, 20);
      case 'physics': return new THREE.BoxGeometry(0.2, 0.2, 0.2);
      case 'cloth': return new THREE.PlaneGeometry(0.28, 0.28, 8, 8);
      case 'vehicle': return new THREE.BoxGeometry(0.22, 0.12, 0.12);
      case 'ragdoll': return new THREE.CapsuleGeometry(0.08, 0.22, 4, 10);
      case 'grid': return new THREE.PlaneGeometry(0.34, 0.34);
      case 'lightHelper': return new THREE.CylinderGeometry(0.035, 0.035, 0.34, 8);
      case 'bezier': return new THREE.TorusGeometry(0.16, 0.03, 8, 20);
      case 'catmull': return new THREE.TorusKnotGeometry(0.1, 0.03, 64, 8);
      case 'vector': return new THREE.ConeGeometry(0.12, 0.28, 10);
      case 'quat': return new THREE.TorusGeometry(0.16, 0.045, 10, 24);
      case 'matrix': return new THREE.BoxGeometry(0.2, 0.2, 0.2);
      case 'euler': return new THREE.OctahedronGeometry(0.16, 0);
      default: return new THREE.SphereGeometry(0.15, 16, 16);
    }
  }
  function buildGuidePack(entries) {
    guideRoot.clear();
    const group = new THREE.Group();
    entries.forEach((entry, index) => {
      const material = buildGuideMaterial(entry, index);
      const geometry = guideGeometry(entry, index);
      let object;
      if (entry.kind === 'points') {
        const points = new THREE.Points(geometry, material);
        object = points;
      } else if (entry.kind === 'sprite') {
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.34, 0.34, 1);
        object = sprite;
      } else {
        object = new THREE.Mesh(geometry, material);
      }
      const column = index % 10;
      const row = Math.floor(index / 10);
      object.position.set((column - 4.5) * 0.62, 1.4 + row * 0.18, -3.8 - row * 0.72);
      object.rotation.set((index % 3) * 0.25, (index % 5) * 0.22, (index % 7) * 0.18);
      object.scale.multiplyScalar(entry.module === 'Lighting' ? 1.2 : 1);
      object.userData.guideEntry = entry;
      group.add(object);
    });
    guideRoot.add(group);
  }
  function buildMaterialBallMaterial(entry) {
    const colorHex = typeof entry.color === 'number' ? entry.color : 0xffffff;
    const common = {
      color: colorHex,
      roughness: entry.roughness ?? 0.4,
      metalness: entry.metalness ?? 0.0,
      envMapIntensity: 1.6,
    };
    const colorCss = `#${colorHex.toString(16).padStart(6, '0')}`;
    const textureKey = `gpuopen-${entry.family}`;
    if (entry.family === 'glass' || entry.family === 'liquid' || entry.family === 'gem') {
      const material = new THREE.MeshPhysicalMaterial({
        ...common,
        roughness: entry.roughness ?? 0.05,
        transmission: entry.transmission ?? 0.98,
        ior: entry.ior ?? 1.52,
        transparent: true,
        opacity: 0.96,
        clearcoat: entry.clearcoat ?? 0.9,
        clearcoatRoughness: entry.clearcoatRoughness ?? 0.04,
        thickness: 0.6,
      });
      applyTextureSet(material, { bumpMap: linearDataTexture(`${textureKey}-micro-bubble`, (ctx,w,h)=>paintSpeckle(ctx,w,h,'#808080',26), 3, 3), bumpScale: 0.006 });
      return material;
    }
    let material;
    if (entry.family === 'wood') {
      material = new THREE.MeshStandardMaterial({ ...common, roughness: entry.roughness ?? 0.7, metalness: 0.0 });
      applyTextureSet(material, { map: canvasPbrTexture(`${textureKey}-wood-color`, paintWood, 2, 2), roughnessMap: linearDataTexture(`${textureKey}-wood-rough`, paintWood, 2, 2), bumpMap: linearDataTexture(`${textureKey}-wood-bump`, paintWood, 2, 2), bumpScale: 0.045 });
      return material;
    }
    if (entry.family === 'textile') {
      material = new THREE.MeshStandardMaterial({ ...common, roughness: entry.roughness ?? 0.92, metalness: 0.0 });
      applyTextureSet(material, { map: canvasPbrTexture(`${textureKey}-fabric-color`, (ctx,w,h)=>paintFabric(ctx,w,h,colorCss), 5, 5), roughnessMap: linearDataTexture(`${textureKey}-fabric-rough`, (ctx,w,h)=>paintFabric(ctx,w,h,'#999999'), 5, 5), bumpMap: linearDataTexture(`${textureKey}-fabric-bump`, (ctx,w,h)=>paintFabric(ctx,w,h,'#808080'), 5, 5), bumpScale: 0.028 });
      return material;
    }
    if (entry.family === 'stone' || entry.family === 'concrete' || entry.family === 'ground') {
      material = new THREE.MeshStandardMaterial({ ...common, roughness: entry.roughness ?? 0.82, metalness: 0.0 });
      applyTextureSet(material, { map: canvasPbrTexture(`${textureKey}-stone-color`, (ctx,w,h)=>paintSpeckle(ctx,w,h,colorCss,70), 3, 3), roughnessMap: linearDataTexture(`${textureKey}-stone-rough`, (ctx,w,h)=>paintSpeckle(ctx,w,h,'#999999',62), 3, 3), bumpMap: linearDataTexture(`${textureKey}-stone-bump`, (ctx,w,h)=>paintSpeckle(ctx,w,h,'#808080',86), 3, 3), bumpScale: entry.family === 'ground' ? 0.07 : 0.035 });
      return material;
    }
    if (entry.family === 'wallpaper') {
      material = new THREE.MeshStandardMaterial({ ...common, roughness: entry.roughness ?? 0.78, metalness: 0.0 });
      applyTextureSet(material, { map: canvasPbrTexture(`${textureKey}-wallpaper-color`, (ctx,w,h)=>paintWallpaper(ctx,w,h,colorCss), 2, 2), roughnessMap: linearDataTexture(`${textureKey}-wallpaper-rough`, (ctx,w,h)=>paintWallpaper(ctx,w,h,'#999999'), 2, 2), bumpMap: linearDataTexture(`${textureKey}-wallpaper-bump`, (ctx,w,h)=>paintWallpaper(ctx,w,h,'#808080'), 2, 2), bumpScale: 0.016 });
      return material;
    }
    if (entry.family === 'ceramic') {
      material = new THREE.MeshPhysicalMaterial({ ...common, roughness: entry.roughness ?? 0.18, clearcoat: entry.clearcoat ?? 0.88, clearcoatRoughness: entry.clearcoatRoughness ?? 0.04 });
      applyTextureSet(material, { map: canvasPbrTexture(`${textureKey}-ceramic-color`, paintCeramic, 1, 1), roughnessMap: linearDataTexture(`${textureKey}-ceramic-rough`, paintCeramic, 1, 1), bumpMap: linearDataTexture(`${textureKey}-ceramic-bump`, paintCeramic, 1, 1), bumpScale: 0.018 });
      return material;
    }
    if (entry.family === 'coats' || entry.family === 'plastic') {
      material = new THREE.MeshPhysicalMaterial({
        ...common,
        clearcoat: entry.clearcoat ?? 0.8,
        clearcoatRoughness: entry.clearcoatRoughness ?? 0.05,
      });
      applyTextureSet(material, { bumpMap: linearDataTexture(`${textureKey}-coat-bump`, (ctx,w,h)=>paintSpeckle(ctx,w,h,'#808080',24), 4, 4), bumpScale: entry.family === 'plastic' ? 0.012 : 0.006 });
      return material;
    }
    if (entry.family === 'metal') {
      material = new THREE.MeshStandardMaterial({ ...common, roughness: entry.roughness ?? 0.25, metalness: 1.0 });
      applyTextureSet(material, { roughnessMap: linearDataTexture(`${textureKey}-metal-rough`, (ctx,w,h)=>paintBrushLines(ctx,w,h,'#8f9498'), 1, 10), bumpMap: linearDataTexture(`${textureKey}-metal-bump`, (ctx,w,h)=>paintBrushLines(ctx,w,h,'#808080'), 1, 14), bumpScale: 0.018 });
      return material;
    }
    material = new THREE.MeshStandardMaterial(common);
    applyTextureSet(material, { bumpMap: linearDataTexture(`${textureKey}-surface-bump`, (ctx,w,h)=>paintSpeckle(ctx,w,h,'#808080',42), 3, 3), bumpScale: 0.018 });
    return material;
  }
  function buildMaterialPark(entries) {
    guideRoot.clear();
    poolWaterMaterials.length = 0;
    poolBalls.length = 0;
    poolCaustics.length = 0;
    const group = new THREE.Group();
    const ballGeometry = new THREE.SphereGeometry(0.34, 42, 28);
    const materialCache = new Map();
    const poolColumns = 24;
    const depthRepeats = 4;
    const rowCount = Math.ceil(entries.length * depthRepeats / poolColumns);
    for (let n = 0; n < entries.length * depthRepeats; n++) {
      const entry = entries[n % entries.length];
      const index = n;
      const cacheKey = entry.uniqueKey || entry.id || entry.name;
      let material = materialCache.get(cacheKey);
      if (!material) { material = buildMaterialBallMaterial(entry); materialCache.set(cacheKey, material); }
      const mesh = new THREE.Mesh(ballGeometry, material);
      const row = Math.floor(index / poolColumns);
      const col = index % poolColumns;
      const depth = row / Math.max(1, rowCount - 1);
      const spacing = THREE.MathUtils.lerp(0.92, 0.66, depth);
      const poolWidth = THREE.MathUtils.lerp(18.8, 13.4, depth);
      const hash = value => {
        const result = Math.sin(value * 127.1 + 311.7) * 43758.5453123;
        return result - Math.floor(result);
      };
      const jitterX = (hash(index * 3 + 1) - .5) * spacing * 1.25;
      const jitterZ = (hash(index * 3 + 2) - .5) * spacing * .88;
      const jitterY = (hash(index * 3 + 3) - .5) * .16;
      const parity = row % 2 ? spacing * 0.47 : 0;
      const centered = (col - poolColumns / 2) / (poolColumns / 2);
      const x = centered * poolWidth * 0.5 + parity + jitterX + 1.4;
      const z = -2.2 - row * spacing * 0.94 + jitterZ;
      const layer = (index * 17 + row * 3) % 3;
      const waterLine = -0.88 + Math.sin(row * 0.23) * 0.026;
      const y = waterLine + layer * 0.17 + jitterY;
      mesh.position.set(x, y, z);
      const horizonScale = THREE.MathUtils.lerp(0.86, 0.43, depth);
      const radiusVariation = THREE.MathUtils.lerp(.82, 1.18, hash(index * 5 + 4));
      mesh.scale.setScalar(horizonScale * radiusVariation * (1.0 + (entry.family === 'glass' || entry.family === 'liquid' ? 0.1 : 0)));
      mesh.rotation.set(hash(index + 21) * Math.PI, hash(index + 57) * Math.PI, hash(index + 91) * Math.PI);
      mesh.userData.guideEntry = { ...entry, repeatedTile: [Math.floor(n / entries.length), 0], poolLayer: layer };
      mesh.userData.poolMotion = { baseX:x, baseY:y, baseZ:z, phase:hash(index + 131) * Math.PI * 2, buoyancy:THREE.MathUtils.lerp(.018,.055,hash(index + 173)), drift:THREE.MathUtils.lerp(.006,.026,hash(index + 197)) };
      poolBalls.push(mesh);
      group.add(mesh);
    }
    const tileCanvas = document.createElement('canvas'); tileCanvas.width = tileCanvas.height = 256;
    const tileCtx = tileCanvas.getContext('2d');
    tileCtx.fillStyle = '#e5eff0'; tileCtx.fillRect(0,0,256,256);
    tileCtx.strokeStyle = 'rgba(66, 124, 143, .36)'; tileCtx.lineWidth = 2;
    for(let i=0;i<=256;i+=32){tileCtx.beginPath();tileCtx.moveTo(i,0);tileCtx.lineTo(i,256);tileCtx.moveTo(0,i);tileCtx.lineTo(256,i);tileCtx.stroke();}
    const tileTexture = new THREE.CanvasTexture(tileCanvas); tileTexture.wrapS = tileTexture.wrapT = THREE.RepeatWrapping; tileTexture.repeat.set(10, 18); tileTexture.encoding = THREE.sRGBEncoding;
    const grout = new THREE.MeshStandardMaterial({ map: tileTexture, color: 0xffffff, roughness: 0.42, metalness: 0.0 });
    const coping = new THREE.MeshPhysicalMaterial({ color: 0xf5f0e7, roughness: 0.32, metalness: 0.0, clearcoat: 0.18, clearcoatRoughness: 0.12 });
    const poolBounds = { width: 22.2, length: 43.8, centerX: 1.4, centerZ: -19.7 };
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(poolBounds.width, poolBounds.length), grout);
    floor.rotation.x = -Math.PI / 2; floor.position.set(poolBounds.centerX, -1.58, poolBounds.centerZ); group.add(floor);
    const longWallGeometry = new THREE.BoxGeometry(.35, 2.35, poolBounds.length + .7);
    const leftWall = new THREE.Mesh(longWallGeometry, grout); leftWall.position.set(poolBounds.centerX - poolBounds.width / 2, -.38, poolBounds.centerZ);
    const rightWall = new THREE.Mesh(longWallGeometry, grout); rightWall.position.set(poolBounds.centerX + poolBounds.width / 2, -.38, poolBounds.centerZ);
    const nearWall = new THREE.Mesh(new THREE.BoxGeometry(poolBounds.width + .7, 2.35, .35), grout); nearWall.position.set(poolBounds.centerX, -.38, poolBounds.centerZ + poolBounds.length / 2);
    const farWall = new THREE.Mesh(new THREE.BoxGeometry(poolBounds.width + .7, 2.35, .35), grout); farWall.position.set(poolBounds.centerX, -.38, poolBounds.centerZ - poolBounds.length / 2);
    const nearCoping = new THREE.Mesh(new THREE.BoxGeometry(poolBounds.width + .7, .22, .62), coping); nearCoping.position.set(poolBounds.centerX, .79, poolBounds.centerZ + poolBounds.length / 2);
    const leftCoping = new THREE.Mesh(new THREE.BoxGeometry(.62, .22, poolBounds.length + .7), coping); leftCoping.position.set(poolBounds.centerX - poolBounds.width / 2, .79, poolBounds.centerZ);
    const rightCoping = new THREE.Mesh(new THREE.BoxGeometry(.62, .22, poolBounds.length + .7), coping); rightCoping.position.set(poolBounds.centerX + poolBounds.width / 2, .79, poolBounds.centerZ);
    group.add(leftWall, rightWall, nearWall, farWall, nearCoping, leftCoping, rightCoping);
    const waterNormal = createPoolWaterNormal();
    const waterMaterial = new THREE.MeshPhysicalMaterial({ color: 0x57bbd0, roughness: 0.095, metalness: 0, transmission: 0.38, transparent: true, opacity: 0.78, ior: 1.333, thickness: 1.25, attenuationColor: new THREE.Color(0x7bd7e4), attenuationDistance: 2.8, clearcoat: 1, clearcoatRoughness: 0.03, normalMap: waterNormal, normalScale: new THREE.Vector2(.32,.32), side: THREE.DoubleSide, envMapIntensity: 1.9, depthWrite: false });
    poolWaterMaterials.push(waterMaterial);
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(poolBounds.width - .22, poolBounds.length - .22, 1, 1), waterMaterial
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(poolBounds.centerX, -.84, poolBounds.centerZ);
    group.add(water);
    const causticMaterial = new THREE.MeshBasicMaterial({ color: 0xc8f7ff, transparent: true, opacity: .14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (let index = 0; index < 28; index++) {
      const caustic = new THREE.Mesh(new THREE.RingGeometry(.12, .7, 32), causticMaterial.clone());
      caustic.rotation.x = -Math.PI / 2; caustic.position.set(poolBounds.centerX + Math.sin(index * 2.3) * 9.2, -1.565, poolBounds.centerZ + Math.cos(index * 1.7) * 19.2);
      caustic.scale.set(1.8, .48 + (index % 3) * .16, 1); caustic.userData.phase = index * .73; poolCaustics.push(caustic); group.add(caustic);
    }
    guideRoot.add(group);
  }
  function pickGuideEntry(clientX, clientY) {
    if (!guideRoot.visible) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    pointerNdc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(guideRoot.children, true);
    const hit = hits.find(item => item.object?.userData?.guideEntry);
    if (!hit) return null;
    const entry = hit.object.userData.guideEntry;
    hit.object.getWorldPosition(guideFocus);
    return {
      ...entry,
      position: guideFocus.toArray(),
    };
  }

  const dummySdf = volumeTexture(new Float32Array([1]), 1);
  const dummyMaterial = volumeTexture(new Uint8Array([143, 158, 173, 72]), 1, true);
  const dummyFeatures = volumeTexture(new Uint8Array([0, 255, 0, 0]), 1, true);
  const source = window.fieldStudioShaders;
  if (!source) throw new Error('SDF shader source is not ready');
  const sdfFragment = source.fragmentSource
    .replace(/^#version 300 es\s*/, '')
    .replace('uniform vec2 uResolution;', 'uniform vec2 uResolution;\nuniform mat4 uViewProjection;\nuniform sampler2D uSceneColor;\nuniform sampler2D uSceneDepth;')
    .replace('  col=1.0-exp', '  vec2 screenUv=gl_FragCoord.xy/uResolution;float sceneDepth=texture(uSceneDepth,screenUv).r;if(id<=0.0){gl_FragDepth=sceneDepth;fragColor=texture(uSceneColor,screenUv);return;}vec3 fieldHit=ro+rd*t;vec3 fieldNormal=normalAt(fieldHit);vec4 clipPosition=uViewProjection*vec4(fieldHit,1.0);float sdfDepth=clamp(clipPosition.z/clipPosition.w*0.5+0.5,0.0,1.0);float meshOwnership=uHasMeshSdf==1?importedMaterialWeight(fieldHit):0.0;float contactReaction=id<1.5?fusionReaction(fieldHit,fieldNormal):0.0;bool originalMaterialOwnsPixel=meshOwnership>0.68&&contactReaction<0.08&&sceneDepth<=sdfDepth+0.0035;bool groundOwnsPixel=id>1.5&&sceneDepth<=sdfDepth+0.0035;if(sceneDepth<sdfDepth-0.0002&&contactReaction<0.08||originalMaterialOwnsPixel||groundOwnsPixel){gl_FragDepth=sceneDepth;fragColor=texture(uSceneColor,screenUv);return;}gl_FragDepth=sdfDepth;\n  col=1.0-exp')
    .replace('fragColor=vec4(col*vignette,1.0);', 'if(id<1.5){float marble=surfaceIsSphere;float thickness=mix(0.38,1.15,marble)*sqrt(max(1.0-pow(1.0-surfaceFresnel,2.0),0.0));float iorBend=clamp((uIor-1.0)/0.52,0.02,1.8);vec2 bend=surfaceNormal.xy*mix(0.010,0.058,marble)*(0.45+thickness)*iorBend;vec2 uvR=clamp(screenUv+bend*1.025,vec2(0.002),vec2(0.998));vec2 uvG=clamp(screenUv+bend,vec2(0.002),vec2(0.998));vec2 uvB=clamp(screenUv+bend*0.975,vec2(0.002),vec2(0.998));vec3 behind=vec3(texture(uSceneColor,uvR).r,texture(uSceneColor,uvG).g,texture(uSceneColor,uvB).b);float behindDepth=texture(uSceneDepth,uvG).r;vec3 environmentBehind=sky(refract(rd,surfaceNormal,1.0/max(uIor,1.001)))*0.72;behind=mix(behind,environmentBehind,smoothstep(0.9985,1.0,behindDepth));vec3 tint=clamp(uColor,vec3(0.04),vec3(1.0));vec3 absorption=exp(-(vec3(1.0)-tint)*thickness*1.18);vec3 reflected=sky(reflect(rd,surfaceNormal))*0.62;float f0=pow((uIor-1.0)/(uIor+1.0),2.0);float fresnel=f0+(1.0-f0)*surfaceFresnel;float transmit=clamp(uTransmission,0.0,1.0);vec3 glassColor=behind*absorption*(1.0-fresnel)*transmit+reflected*fresnel*uSpecular+behind*(1.0-transmit);float highlight=pow(max(dot(surfaceNormal,normalize(vec3(-0.45,0.72,0.52))),0.0),mix(260.0,72.0,uRoughness));glassColor+=highlight*vec3(1.0,0.98,0.93)*0.78*uSpecular;fragColor=vec4(glassColor,1.0);}else{fragColor=vec4(col*vignette,1.0);}');
  const sdfUniforms = {
    uResolution:{value:new THREE.Vector2(1,1)},uViewProjection:{value:viewProjection},uSceneColor:{value:sceneTarget.texture},uSceneDepth:{value:sceneTarget.depthTexture},uTime:{value:0},uBlend:{value:.28},uSpacing:{value:1.05},uRadius:{value:1},uBoxSize:{value:.78},uRoughness:{value:.06},uSpecular:{value:.96},uTransmission:{value:.98},uIor:{value:1.52},uDissolveMemory:{value:0},uConsumeScale:{value:.86},uBooleanSmooth:{value:.24},uFrontNoise:{value:.14},
    uColor:{value:new THREE.Vector3(.74,.91,.97)},uCamera:{value:new THREE.Vector3()},uSpherePos:{value:new THREE.Vector3()},uBoxPos:{value:new THREE.Vector3()},uMeshPos:{value:new THREE.Vector3()},uMeshBounds:{value:new THREE.Vector3(1,1,1)},uPhaseSeeds:{value:Array.from({length:8},()=>new THREE.Vector4())},uPhaseNormals:{value:Array.from({length:8},()=>new THREE.Vector4(0,1,0,0))},
    uSphereScale:{value:1},uBoxScale:{value:1},uShowBox:{value:0},uMeshScale:{value:1},uHasMeshSdf:{value:0},uHasMeshMaterial:{value:0},uHasMeshFeatures:{value:0},uMeshSdf:{value:dummySdf},uMeshMaterial:{value:dummyMaterial},uMeshFeatures:{value:dummyFeatures},uPreset:{value:0}
  };
  const sdfMaterial = new THREE.RawShaderMaterial({
    glslVersion:THREE.GLSL3,
    vertexShader:'in vec3 position;void main(){gl_Position=vec4(position,1.0);}',
    fragmentShader:sdfFragment,
    uniforms:sdfUniforms,
    depthTest:true,
    depthWrite:true,
    transparent:false,
    blending:THREE.NoBlending
  });
  const sdfGeometry = new THREE.BufferGeometry();
  sdfGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
  const sdfQuad = new THREE.Mesh(sdfGeometry,sdfMaterial);sdfQuad.frustumCulled=false;sdfScene.add(sdfQuad);
  const loader = new GLTFLoader();
  const clock = new THREE.Clock();
  const interactionShaders = [];
  let mixers = [], models = [], ready = false, sdfVolume = dummySdf, materialVolume = dummyMaterial, featuresVolume = dummyFeatures, sdfCpuData = null, sdfCpuSize = 1;
  let dissolveMemory = 0, nextPhaseSeed = 0, lastSeedPosition = null, lastMeshTransform = null, guideEntryCount = 0;
  const phaseSeeds = Array.from({length:8},()=>({position:[0,0,0],normal:[0,1,0],strength:0}));

  function installContactDissolve(material) {
    if (material.userData.contactDissolve) return;
    material.userData.contactDissolve = true;
    const textureKeys = ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','alphaMap','aoMap','bumpMap','displacementMap','clearcoatMap','transmissionMap'];
    const textureSignal = Math.min(1, textureKeys.reduce((count, key) => count + (material[key] ? 1 : 0), 0) / 6);
    const previousCompile = material.onBeforeCompile;
    material.onBeforeCompile = shader => {
      previousCompile?.(shader);
      shader.uniforms.uInteractionEnabled = { value: 0 };
      shader.uniforms.uContactSphere = { value: new THREE.Vector4() };
      shader.uniforms.uContactBox = { value: new THREE.Vector4() };
      shader.uniforms.uContactBoxSize = { value: new THREE.Vector3() };
      shader.uniforms.uShowBox = { value: 0 };
      shader.uniforms.uContactBand = { value: 0.28 };
      shader.uniforms.uContactTime = { value: 0 };
      shader.uniforms.uReactionColor = { value: new THREE.Color(0x9dffdc) };
      shader.uniforms.uImportedContact = { value: 0 };
      shader.uniforms.uDomainImplicit = { value: 0.34 };
      shader.uniforms.uDomainPhase = { value: 0.33 };
      shader.uniforms.uDomainOptical = { value: 0.33 };
      shader.uniforms.uContactDebug = { value: 1 };
      shader.uniforms.uSourceMetalness = { value: Number.isFinite(material.metalness) ? material.metalness : 0 };
      shader.uniforms.uSourceRoughness = { value: Number.isFinite(material.roughness) ? material.roughness : 0.5 };
      shader.uniforms.uSourceTextureSignal = { value: textureSignal };
      shader.uniforms.uImportedContactCenter = { value: new THREE.Vector3() };
      shader.uniforms.uImportedContactRadius = { value: 0.3 };
      shader.vertexShader = shader.vertexShader
        .replace('void main() {', 'varying vec3 vInteractionWorld;\nvoid main() {')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvInteractionWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', `uniform float uInteractionEnabled;
uniform float uImportedContact;
uniform vec3 uImportedContactCenter;
uniform float uImportedContactRadius;
uniform vec4 uContactSphere;
uniform vec4 uContactBox;
uniform vec3 uContactBoxSize;
uniform float uShowBox;
uniform float uContactBand;
uniform float uContactTime;
uniform float uDomainImplicit;
uniform float uDomainPhase;
uniform float uDomainOptical;
uniform float uContactDebug;
uniform float uSourceMetalness;
uniform float uSourceRoughness;
uniform float uSourceTextureSignal;
uniform vec3 uReactionColor;
varying vec3 vInteractionWorld;
float interactionBoxSdf(vec3 p, vec3 b, float radius) {
  vec3 q = abs(p) - b + radius;
  return min(max(q.x, max(q.y, q.z)), 0.0) + length(max(q, 0.0)) - radius;
}
float interactionHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float interactionNoise(vec3 p) {
  vec3 cell = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(interactionHash(cell), interactionHash(cell + vec3(1,0,0)), f.x),
                 mix(interactionHash(cell + vec3(0,1,0)), interactionHash(cell + vec3(1,1,0)), f.x), f.y),
             mix(mix(interactionHash(cell + vec3(0,0,1)), interactionHash(cell + vec3(1,0,1)), f.x),
                 mix(interactionHash(cell + vec3(0,1,1)), interactionHash(cell + vec3(1,1,1)), f.x), f.y), f.z);
}
float refractiveContactSpectrum(vec3 p) {
  const float golden = 2.39996323;
  float field = 0.0;
  for (int i = 0; i < 5; i++) {
    float a = float(i) * golden;
    vec3 k = normalize(vec3(cos(a), sin(a), 0.24 + float(i) * 0.09));
    field += cos(dot(p, k) * (3.0 + float(i) * 0.55) + uContactTime * (0.10 + float(i) * 0.018));
  }
  return clamp(0.5 + field / 10.0, 0.0, 1.0);
}
vec3 contactReflectionPalette(vec3 p, float strength, float impedance) {
  float spectrum = refractiveContactSpectrum(p);
  float vein = smoothstep(0.55, 0.86, abs(interactionNoise(p * 19.0 + vec3(0.0, uContactTime * 0.12, 0.0)) - 0.5) * 2.0);
  vec3 cyan = vec3(0.02, 0.95, 0.82);
  vec3 amber = vec3(1.0, 0.45, 0.06);
  vec3 violet = vec3(0.50, 0.32, 1.0);
  vec3 copied = mix(cyan, amber, spectrum);
  copied = mix(copied, violet, vein * (0.28 + impedance * 0.34));
  return copied * strength * (0.55 + impedance * 1.25);
}
void main() {`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
float interactionEdge = 0.0;
float interactionWet = 0.0;
if (uInteractionEnabled > 0.5) {
  float sphereDistance = length(vInteractionWorld - uContactSphere.xyz) - uContactSphere.w;
  float boxDistance = interactionBoxSdf(vInteractionWorld - uContactBox.xyz, uContactBoxSize, uContactBox.w);
  float contactDistance = uShowBox > 0.5 ? min(sphereDistance, boxDistance) : sphereDistance;
  float band = max(uContactBand, 0.015);
  float importedKernel = uImportedContact * exp(-dot(vInteractionWorld - uImportedContactCenter, vInteractionWorld - uImportedContactCenter) / max(uImportedContactRadius * uImportedContactRadius, 0.0001));
  float penetration = max(1.0 - smoothstep(-band * 0.72, band * 0.10, contactDistance), importedKernel);
  float coarse = interactionNoise(vInteractionWorld * 7.0 + vec3(0.0, uContactTime * 0.08, 0.0));
  float pores = interactionNoise(vInteractionWorld * 31.0 - vec3(0.0, uContactTime * 0.16, 0.0));
  float mirrored = refractiveContactSpectrum(vInteractionWorld + vec3(coarse, pores, coarse - pores) * band * 2.4);
  float dissolveMask = mix(coarse, pores, 0.32 + uDomainPhase * 0.38);
  float membrane = exp(-abs(contactDistance + band * 0.04) / max(band * mix(0.18, 0.06, uDomainImplicit), 0.002));
  float materialImpedance = clamp(abs(uSourceMetalness - uSourceRoughness) * 0.72 + uSourceTextureSignal * 0.36, 0.0, 1.0);
  interactionEdge = max(membrane, importedKernel * (1.0 - importedKernel) * 2.4) * (0.55 + dissolveMask * 0.45) * (0.8 + uDomainPhase * 1.9) * (0.82 + materialImpedance * 0.55);
  interactionWet = clamp(penetration * (0.62 + dissolveMask * 0.38) + interactionEdge * 0.28, 0.0, 1.0);
  interactionWet *= 0.86 + uDomainOptical * 1.75 + mirrored * 0.48 + materialImpedance * 0.42;
}`)
        .replace('#include <output_fragment>', `
if (uInteractionEnabled > 0.5) {
  float contactSpectrum = refractiveContactSpectrum(vInteractionWorld);
  float sourceGloss = 1.0 - clamp(uSourceRoughness, 0.0, 1.0);
  float materialMode = clamp(uSourceMetalness * 0.62 + uSourceTextureSignal * 0.22 + contactSpectrum * 0.32, 0.0, 1.0);
  float materialImpedance = clamp(abs(uSourceMetalness - uSourceRoughness) * 0.72 + uSourceTextureSignal * 0.36, 0.0, 1.0);
  vec3 materialSpectrum = contactReflectionPalette(vInteractionWorld, 1.0, materialImpedance);
  vec3 reflectedMaterial = mix(uReactionColor, materialSpectrum, 0.48 + uDomainOptical * 0.46);
  vec3 copiedMaterial = mix(diffuseColor.rgb, reflectedMaterial, 0.42 + uDomainOptical * 0.32 + sourceGloss * 0.16);
  diffuseColor.rgb = mix(diffuseColor.rgb, copiedMaterial, clamp(interactionWet * (0.48 + uDomainPhase * 0.34), 0.0, 0.94));
  outgoingLight = mix(outgoingLight, outgoingLight * (0.46 + uDomainImplicit * 0.18) + copiedMaterial * (0.24 + uDomainOptical * 0.32), clamp(interactionWet * (0.68 + uDomainPhase * 0.38), 0.0, 0.96));
  outgoingLight += materialSpectrum * interactionEdge * (1.45 + uDomainOptical * 2.2 + sourceGloss * 1.35);
  outgoingLight = mix(outgoingLight, materialSpectrum, clamp(uContactDebug * interactionWet * 0.52, 0.0, 0.64));
}
#include <output_fragment>`);
      interactionShaders.push(shader);
    };
    material.customProgramCacheKey = () => 'refractive-contact-material-v8';
  }

  function summarizeMaterials(model) {
    const materials = new Set();
    model.traverse(object => {
      if (!object.isMesh || !object.material) return;
      for (const material of (Array.isArray(object.material) ? object.material : [object.material])) materials.add(material);
    });
    const textureKeys = ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','alphaMap','aoMap','bumpMap','displacementMap','clearcoatMap','transmissionMap'];
    let textureCount = 0, metalness = 0, roughness = 0, transparent = 0;
    const sourceColor = new THREE.Color();
    for (const material of materials) {
      textureCount += textureKeys.reduce((count, key) => count + (material[key] ? 1 : 0), 0);
      metalness += Number.isFinite(material.metalness) ? material.metalness : 0;
      roughness += Number.isFinite(material.roughness) ? material.roughness : 0.5;
      transparent += material.transparent || material.opacity < 0.999 ? 1 : 0;
      sourceColor.add(material.color || new THREE.Color(0x8c9ba6));
    }
    const materialCount = Math.max(materials.size, 1);
    sourceColor.multiplyScalar(1 / materialCount);
    return {
      materialCount: materials.size,
      textureCount,
      metalness: metalness / materialCount,
      roughness: roughness / materialCount,
      transparent,
      sourceColor,
    };
  }

  function collectMaterials(model) {
    const materials = new Set();
    model.traverse(object => {
      if (!object.isMesh || !object.material) return;
      for (const material of (Array.isArray(object.material) ? object.material : [object.material])) materials.add(material);
    });
    return Array.from(materials).map(material => ({
      material,
      color: material.color ? material.color.clone() : new THREE.Color(0xffffff),
      emissive: material.emissive ? material.emissive.clone() : new THREE.Color(0x000000),
      opacity: Number.isFinite(material.opacity) ? material.opacity : 1,
      envMapIntensity: Number.isFinite(material.envMapIntensity) ? material.envMapIntensity : 1,
    }));
  }

  function applyResidueToModel(entry, object) {
    const residue = object?.residue;
    if (!residue || !entry.materialStates) return;
    const strength = THREE.MathUtils.clamp(residue.strength || 0, 0, 1);
    const memory = THREE.MathUtils.clamp(residue.memory || 0, 0, 1);
    const optical = THREE.MathUtils.clamp(residue.optical || 0, 0, 1);
    const residueColor = new THREE.Color(...(residue.color || [0.72, 0.93, 1]));
    for (const state of entry.materialStates) {
      const material = state.material;
      if (material.color) material.color.copy(state.color).lerp(residueColor, strength * (0.22 + memory * 0.24));
      if (material.emissive) material.emissive.copy(state.emissive).lerp(residueColor, strength * (0.12 + optical * 0.28));
      material.envMapIntensity = state.envMapIntensity * (1 + optical * strength * 1.4);
      if (strength > 0.08 && material.transparent) material.opacity = Math.max(0.28, state.opacity - strength * memory * 0.22);
      material.needsUpdate = true;
    }
  }
  function addWeightedColor(target, source, weight) {
    target.r += source.r * weight;
    target.g += source.g * weight;
    target.b += source.b * weight;
    return target;
  }

  function disposeModel() {
    for (const entry of models) entry.model.traverse(object => { if (object.geometry) object.geometry.dispose(); });
    for (const entry of models) root.remove(entry.model);
    models = []; mixers = []; ready = false; interactionShaders.length = 0;
  }
  async function loadFile(file) {
    return loadFiles(window.__pendingThreeFiles?.length ? window.__pendingThreeFiles : [file]);
  }
  async function loadFiles(files) {
    disposeModel();
    const list = Array.from(files).slice(0, 5);
    for (let index = 0; index < list.length; index++) {
      const buffer = sanitizeGlb(await list[index].arrayBuffer());
      const gltf = await new Promise((resolve, reject) => loader.parse(buffer, '', resolve, reject));
      const model = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
      const scale = 2.6 / Math.max(size.x, size.y, size.z, 0.0001);
      model.scale.setScalar(scale); model.position.copy(center.multiplyScalar(-scale));
      model.traverse(object => {
      if (!object.isMesh) return;
      object.frustumCulled = true;
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          installContactDissolve(material);
          material.envMapIntensity = 1.25;
          tuneRecognizableSampleMaterial(material);
          if (material.transparent) material.depthWrite = false;
          material.needsUpdate = true;
        }
      }
      });
      root.add(model);
      const mixer = gltf.animations.length ? new THREE.AnimationMixer(model) : null;
      if (mixer) for (const clip of gltf.animations) mixer.clipAction(clip).play();
      const materialReport = summarizeMaterials(model);
      const sourceColor = materialReport.sourceColor;
      const state = getState();
      if (state.imported?.[index]) state.imported[index].materialReport = {
        materialCount: materialReport.materialCount,
        textureCount: materialReport.textureCount,
        metalness: materialReport.metalness,
        roughness: materialReport.roughness,
        transparent: materialReport.transparent,
        sourceColor: sourceColor.toArray(),
      };
      if (index === 0 && state.objects?.mesh) state.objects.mesh.materialReport = state.imported?.[index]?.materialReport;
      models.push({ model, mixer, index, name: list[index].name, basePosition: model.position.clone(), baseScale: scale, sourceColor, materialReport, materialStates: collectMaterials(model) });
      if (mixer) mixers.push(mixer);
    }
    ready = true;
    return { count: models.length, animations: mixers.length };
  }
  function setVolume(sdfData, materialData, size, featuresData = null) {
    if (sdfVolume !== dummySdf) sdfVolume.dispose();
    if (materialVolume !== dummyMaterial) materialVolume.dispose();
    if (featuresVolume !== dummyFeatures) featuresVolume.dispose();
    sdfVolume = volumeTexture(sdfData, size);if(renderer.extensions.has('OES_texture_float_linear')){sdfVolume.minFilter=THREE.LinearFilter;sdfVolume.magFilter=THREE.LinearFilter;sdfVolume.needsUpdate=true;}
    sdfCpuData = sdfData; sdfCpuSize = size;
    materialVolume = volumeTexture(materialData, size, true);
    const fallbackFeatures = featuresData || new Uint8Array(size * size * size * 4);
    if (!featuresData) for (let index = 1; index < fallbackFeatures.length; index += 4) fallbackFeatures[index] = 255;
    featuresVolume = volumeTexture(fallbackFeatures, size, true);
    sdfUniforms.uMeshSdf.value = sdfVolume;
    sdfUniforms.uMeshMaterial.value = materialVolume;
    sdfUniforms.uMeshFeatures.value = featuresVolume;
    sdfUniforms.uHasMeshSdf.value = 1;
    sdfUniforms.uHasMeshMaterial.value = materialData ? 1 : 0;
    sdfUniforms.uHasMeshFeatures.value = featuresData ? 1 : 0;
    dissolveMemory=0;lastSeedPosition=null;lastMeshTransform=null;for(const seed of phaseSeeds){seed.position=[0,0,0];seed.normal=[0,1,0];seed.strength=0;}
  }
  function sampleMeshDistance(worldPosition, state) {
    if (!sdfCpuData || !state.meshVolumeReady) return Infinity;
    const mesh = state.objects.mesh, bounds = mesh.bounds, scale = mesh.scale;
    const uv = worldPosition.map((value, axis) => (value - mesh.position[axis]) / scale / (bounds[axis] * 2) + 0.5);
    if (uv.some(value => value < 0 || value > 1)) return Infinity;
    const grid = uv.map(value => value * (sdfCpuSize - 1)), base = grid.map(Math.floor), fraction = grid.map((value,index) => value-base[index]);
    const voxel = (x,y,z) => sdfCpuData[Math.min(sdfCpuSize-1,x)+sdfCpuSize*(Math.min(sdfCpuSize-1,y)+sdfCpuSize*Math.min(sdfCpuSize-1,z))];
    const x00=THREE.MathUtils.lerp(voxel(base[0],base[1],base[2]),voxel(base[0]+1,base[1],base[2]),fraction[0]);
    const x10=THREE.MathUtils.lerp(voxel(base[0],base[1]+1,base[2]),voxel(base[0]+1,base[1]+1,base[2]),fraction[0]);
    const x01=THREE.MathUtils.lerp(voxel(base[0],base[1],base[2]+1),voxel(base[0]+1,base[1],base[2]+1),fraction[0]);
    const x11=THREE.MathUtils.lerp(voxel(base[0],base[1]+1,base[2]+1),voxel(base[0]+1,base[1]+1,base[2]+1),fraction[0]);
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(x00,x10,fraction[1]),THREE.MathUtils.lerp(x01,x11,fraction[1]),fraction[2])*scale;
  }
  function projectToMeshSurface(point,state) {
    const distance=sampleMeshDistance(point,state),epsilon=Math.max(...state.objects.mesh.bounds)*state.objects.mesh.scale/sdfCpuSize*1.5;
    if(!Number.isFinite(distance)||epsilon<=0)return {position:point,normal:[0,1,0]};
    const gradient=[0,1,2].map(axis=>{const positive=[...point],negative=[...point];positive[axis]+=epsilon;negative[axis]-=epsilon;return (sampleMeshDistance(positive,state)-sampleMeshDistance(negative,state))/(2*epsilon);});
    const length=Math.hypot(...gradient);if(!Number.isFinite(length)||length<1e-5)return {position:point,normal:[0,1,0]};
    const normal=gradient.map(value=>value/length);return {position:point.map((value,index)=>value-normal[index]*distance),normal};
  }
  function evolveDissolveMemory(state, delta) {
    const meshTransform={position:[...state.objects.mesh.position],scale:state.objects.mesh.scale};
    if(lastMeshTransform){const ratio=meshTransform.scale/lastMeshTransform.scale;for(const seed of phaseSeeds)seed.position=seed.position.map((value,index)=>meshTransform.position[index]+(value-lastMeshTransform.position[index])*ratio);if(lastSeedPosition)lastSeedPosition=lastSeedPosition.map((value,index)=>meshTransform.position[index]+(value-lastMeshTransform.position[index])*ratio);}
    lastMeshTransform=meshTransform;
    if (!state.meshFusion || !state.meshVolumeReady) { dissolveMemory = Math.max(0, dissolveMemory - delta * state.recoveryRate * dissolveMemory);for(const seed of phaseSeeds)seed.strength=Math.max(0,seed.strength-delta*state.recoveryRate*seed.strength);state.dissolveMemory=dissolveMemory;state.phaseSeeds=phaseSeeds.map(seed=>[...seed.position,seed.strength]);return; }
    const sphere = state.objects.sphere, box = state.objects.box;
    const closestSupport = points => points.map(point => ({point,distance:sampleMeshDistance(point,state)})).reduce((best,current) => current.distance < best.distance ? current : best);
    const sphereReach = state.radius * sphere.scale, sphereAxes = [[0,0,0],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    const sphereHit = closestSupport(sphereAxes.map(axis => sphere.position.map((value,index) => value + axis[index] * sphereReach * 0.78)));
    const boxExtents = [state.boxSize,state.boxSize*.82,state.boxSize*.9].map(value => value * box.scale);
    const boxSupports = [[0,0,0],[1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],[-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1]];
    const boxHit = closestSupport(boxSupports.map(axis => box.position.map((value,index) => value + axis[index] * boxExtents[index] * 0.82)));
    const closest = sphereHit.distance < boxHit.distance ? sphereHit : boxHit;
    const contact=projectToMeshSurface(closest.point,state),contactPoint=contact.position;
    const touching = closest.distance < state.blend * state.contactThreshold;
    const drive = touching ? state.dissolveRate * (1 - dissolveMemory) : -state.recoveryRate * dissolveMemory;
    dissolveMemory = THREE.MathUtils.clamp(dissolveMemory + delta * drive, 0, 1);
    for (const seed of phaseSeeds) seed.strength = Math.max(0, seed.strength - delta * state.recoveryRate * seed.strength);
    if (touching) {
      const seedRadius=Math.max(state.blend*state.consumeScale*.55,.08);
      const nearest=phaseSeeds.map(seed=>({seed,distance:Math.hypot(...contactPoint.map((value,index)=>value-seed.position[index]))})).sort((a,b)=>a.distance-b.distance)[0];
      const moved=!lastSeedPosition||Math.hypot(...contactPoint.map((value,index)=>value-lastSeedPosition[index]))>seedRadius;
      let seed=nearest.distance<seedRadius?nearest.seed:phaseSeeds.reduce((weakest,current)=>current.strength<weakest.strength?current:weakest);
      if(moved&&nearest.distance>=seedRadius){seed.position=[...contactPoint];seed.normal=[...contact.normal];seed.strength=0;lastSeedPosition=[...contactPoint];nextPhaseSeed=(nextPhaseSeed+1)%phaseSeeds.length;}
      seed.position=seed.position.map((value,index)=>THREE.MathUtils.lerp(value,contactPoint[index],Math.min(1,delta*5)));
      seed.normal=seed.normal.map((value,index)=>THREE.MathUtils.lerp(value,contact.normal[index],Math.min(1,delta*5)));const normalLength=Math.hypot(...seed.normal)||1;seed.normal=seed.normal.map(value=>value/normalLength);
      seed.strength=THREE.MathUtils.clamp(seed.strength+delta*state.dissolveRate*(1-seed.strength),0,1);
    }
    state.phaseSeeds=phaseSeeds.map(seed => [...seed.position,seed.strength]);state.phaseNormals=phaseSeeds.map(seed=>[...seed.normal,0]);
    state.dissolveMemory = dissolveMemory;
  }
  function frame() {
    requestAnimationFrame(frame);
    const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight);
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    const state = getState(), now = performance.now() / 1000, delta = Math.min(clock.getDelta(), 0.05), cp = Math.cos(state.pitch);
    scene.background = skyTexture;
    scene.environment = state.materialPark ? skyTexture : studioEnvironment;
    renderer.toneMappingExposure = state.materialPark ? 0.92 : 0.82;
    scene.fog.color.set(state.materialPark ? 0xbfddea : 0xd9edf3);
    scene.fog.near = state.materialPark ? 20 : 34;
    scene.fog.far = state.materialPark ? 62 : 78;
    hemi.intensity = state.materialPark ? 2.25 : 1.8;
    key.color.set(state.materialPark ? 0xfff6dc : 0xfff1df);
    key.intensity = state.materialPark ? 5.0 : 4.2;
    key.position.set(state.materialPark ? -7.5 : -4, state.materialPark ? 10.5 : 6, state.materialPark ? 5.5 : 4);
    fill.intensity = state.materialPark ? 1.35 : 2.0;
    fill.color.set(state.materialPark ? 0xb8e4ff : 0xb9ddff);
    for (const material of poolWaterMaterials) {
      material.normalMap.offset.set((now * .014) % 1, (-now * .009) % 1);
    }
    if (state.materialPark) {
      for (const ball of poolBalls) {
        const motion = ball.userData.poolMotion;
        if (!motion) continue;
        const t = now * (0.72 + motion.drift * 8.0) + motion.phase;
        const waveA = Math.sin(t) * motion.buoyancy;
        const waveB = Math.sin(t * 0.61 + motion.phase * 1.7) * motion.buoyancy * .45;
        ball.position.y = motion.baseY + waveA + waveB;
        ball.position.x = motion.baseX + Math.sin(t * .37 + motion.phase) * motion.drift;
        ball.position.z = motion.baseZ + Math.cos(t * .29 + motion.phase) * motion.drift * .65;
        ball.rotation.y += motion.drift * .12;
      }
      for (const caustic of poolCaustics) {
        const phase = caustic.userData.phase || 0;
        const scale = 1 + Math.sin(now * .42 + phase) * .18;
        caustic.scale.x = 1.8 * scale;
        caustic.scale.y = (.48 + ((phase / .73) % 3) * .16) * (1.0 + Math.cos(now * .31 + phase) * .12);
        caustic.material.opacity = .1 + (Math.sin(now * .9 + phase) * .5 + .5) * .1;
      }
    }
    const guideEntries = window.meltmeshVisualGuideCatalog || [];
    const materialEntries = window.meltmeshMaterialParkCatalog || [];
    if (state.guidePack && guideEntries.length && guideEntryCount !== guideEntries.length) { buildGuidePack(guideEntries); guideEntryCount = guideEntries.length; }
    if (state.materialPark && materialEntries.length && guideEntryCount !== -materialEntries.length) { buildMaterialPark(materialEntries); guideEntryCount = -materialEntries.length; }
    guideRoot.visible = !!(state.guidePack || state.materialPark);
    guideRoot.rotation.y = Math.sin(now * 0.08) * 0.08;
    window.mathDomainRouter?.update(state, now);
    evolveDissolveMemory(state, delta);
    const effective=state.domainModel?.effective||state;sdfUniforms.uConsumeScale.value=effective.consumeScale;sdfUniforms.uBooleanSmooth.value=state.booleanSmooth;sdfUniforms.uFrontNoise.value=effective.frontNoise;
    for(let index=0;index<phaseSeeds.length;index++)sdfUniforms.uPhaseSeeds.value[index].set(...phaseSeeds[index].position,phaseSeeds[index].strength);
    for(let index=0;index<phaseSeeds.length;index++)sdfUniforms.uPhaseNormals.value[index].set(...phaseSeeds[index].normal,0);
    const focus = state.guideFocus || [0, -0.05, 0];
    camera.position.set(focus[0] + Math.sin(state.yaw) * cp * state.distance, focus[1] + Math.sin(state.pitch) * state.distance, focus[2] + Math.cos(state.yaw) * cp * state.distance);
    camera.lookAt(focus[0], focus[1], focus[2]);camera.updateMatrixWorld();viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    renderer.getDrawingBufferSize(drawingSize);if(sceneTarget.width!==drawingSize.x||sceneTarget.height!==drawingSize.y)sceneTarget.setSize(drawingSize.x,drawingSize.y);sdfUniforms.uResolution.value.copy(drawingSize);sdfUniforms.uTime.value=performance.now()/1000;sdfUniforms.uBlend.value=effective.blend;sdfUniforms.uSpacing.value=state.spacing;sdfUniforms.uRadius.value=state.radius;sdfUniforms.uBoxSize.value=state.boxSize;sdfUniforms.uRoughness.value=state.roughness;sdfUniforms.uSpecular.value=state.specular;sdfUniforms.uTransmission.value=effective.transmission;sdfUniforms.uIor.value=state.ior;sdfUniforms.uDissolveMemory.value=dissolveMemory;sdfUniforms.uColor.value.set(...state.color);sdfUniforms.uCamera.value.copy(camera.position);sdfUniforms.uPreset.value=state.preset;sdfUniforms.uSpherePos.value.set(...state.objects.sphere.position);sdfUniforms.uBoxPos.value.set(...state.objects.box.position);sdfUniforms.uSphereScale.value=state.objects.sphere.scale;sdfUniforms.uBoxScale.value=state.objects.box.scale;sdfUniforms.uShowBox.value=state.objects.box.visible!==false?1:0;sdfUniforms.uMeshPos.value.set(...state.objects.mesh.position);sdfUniforms.uMeshBounds.value.set(...state.objects.mesh.bounds);sdfUniforms.uMeshScale.value=state.objects.mesh.scale;sdfUniforms.uHasMeshSdf.value=state.meshFusion&&state.meshVolumeReady?1:0;
    root.visible = ready;
    root.position.set(0, 0, 0); root.scale.setScalar(1);
    for (const entry of models) {
      const object = state.imported?.[entry.index] || state.objects.mesh;
      const position = object?.position || [0, 0, 0];
      entry.model.position.set(entry.basePosition.x + position[0], entry.basePosition.y + position[1], entry.basePosition.z + position[2]);
      entry.model.scale.setScalar(entry.baseScale * (object?.scale || 1));
      applyResidueToModel(entry, object);
    }
    for (const shader of interactionShaders) {
      const sphere = state.objects.sphere, box = state.objects.box;
      shader.uniforms.uInteractionEnabled.value = state.meshFusion && state.meshVolumeReady ? 1 : 0;
      shader.uniforms.uContactSphere.value.set(...sphere.position, state.radius * sphere.scale);
      shader.uniforms.uContactBox.value.set(...box.position, 0.28 * box.scale);
      shader.uniforms.uContactBoxSize.value.set(state.boxSize * box.scale, state.boxSize * 0.82 * box.scale, state.boxSize * 0.9 * box.scale);
      shader.uniforms.uShowBox.value = box.visible !== false ? 1 : 0;
      shader.uniforms.uContactBand.value = Math.max(state.blend, 0.01);
      shader.uniforms.uContactTime.value = now;
      shader.uniforms.uDomainImplicit.value = state.domainModel?.domains?.implicitGeometry ?? 0.34;
      shader.uniforms.uDomainPhase.value = state.domainModel?.domains?.phaseField ?? 0.33;
      shader.uniforms.uDomainOptical.value = state.domainModel?.domains?.optical ?? 0.33;
      shader.uniforms.uContactDebug.value = state.contactDebug ? 1 : 0;
      const imported = state.imported || [];
      const exchangeStates = imported.map(() => ({
        strength: 0,
        memory: 0,
        optical: 0,
        geometry: 0,
        color: new THREE.Color(0, 0, 0),
        weight: 0,
      }));
      let contact = 0, closestPair = null, closestDistance = Infinity;
      for (let i = 0; i < imported.length; i++) for (let j = i + 1; j < imported.length; j++) {
        const a = imported[i], b = imported[j];
        const radiusA = Math.max(0.12, Math.hypot(...(a.bounds || [1, 1, 1])) * 0.5 * (a.scale || 1));
        const radiusB = Math.max(0.12, Math.hypot(...(b.bounds || [1, 1, 1])) * 0.5 * (b.scale || 1));
        const dx = b.position[0] - a.position[0], dy = b.position[1] - a.position[1], dz = b.position[2] - a.position[2];
        const centerDistance = Math.hypot(dx, dy, dz) || 1e-6;
        const surfaceDistance = centerDistance - radiusA - radiusB;
        const kernel = THREE.MathUtils.clamp(1 - surfaceDistance / Math.max(state.blend * 1.7, 0.12), 0, 1);
        contact = Math.max(contact, kernel);
        if (kernel > 0) {
          const colorA = models[i]?.sourceColor || new THREE.Color().setRGB(0.72, 0.93, 1);
          const colorB = models[j]?.sourceColor || new THREE.Color().setRGB(0.72, 0.93, 1);
          exchangeStates[i].strength += kernel * 0.5;
          exchangeStates[j].strength += kernel * 0.5;
          exchangeStates[i].memory = Math.max(exchangeStates[i].memory, kernel);
          exchangeStates[j].memory = Math.max(exchangeStates[j].memory, kernel);
          exchangeStates[i].optical += kernel * (0.28 + (models[j]?.materialReport?.roughness ?? 0.35) * 0.35);
          exchangeStates[j].optical += kernel * (0.28 + (models[i]?.materialReport?.roughness ?? 0.35) * 0.35);
          exchangeStates[i].geometry = Math.max(exchangeStates[i].geometry, kernel);
          exchangeStates[j].geometry = Math.max(exchangeStates[j].geometry, kernel);
          addWeightedColor(exchangeStates[i].color, colorB, kernel);
          addWeightedColor(exchangeStates[j].color, colorA, kernel);
          exchangeStates[i].weight += kernel;
          exchangeStates[j].weight += kernel;
        }
        if (surfaceDistance < closestDistance){closestDistance=surfaceDistance;closestPair=[i,j];}
      }
      const avgReaction = new THREE.Color(0x8dffd0);
      if (imported.length) {
        const accum = new THREE.Color(0, 0, 0);
        let accumWeight = 0;
        for (let index = 0; index < imported.length; index++) {
          const source = models[index]?.sourceColor;
          if (!source) continue;
          const weight = Math.max(0.15, exchangeStates[index].weight);
          addWeightedColor(accum, source, weight);
          accumWeight += weight;
        }
        if (accumWeight > 0) avgReaction.copy(accum.multiplyScalar(1 / accumWeight));
      }
      shader.uniforms.uReactionColor.value.copy(avgReaction).lerp(new THREE.Color(0x8dffd0), 0.22);
      shader.uniforms.uImportedContact.value = contact;
      if(closestPair){const [i,j]=closestPair,a=imported[i],b=imported[j],ca=models[i]?.sourceColor,cb=models[j]?.sourceColor;shader.uniforms.uImportedContactCenter.value.set((a.position[0]+b.position[0])*.5,(a.position[1]+b.position[1])*.5,(a.position[2]+b.position[2])*.5);shader.uniforms.uImportedContactRadius.value=Math.max(state.blend*1.6,.18);if(ca&&cb)shader.uniforms.uReactionColor.value.copy(ca).lerp(cb,.5);}
      for (let index = 0; index < imported.length; index++) {
        const stateItem = imported[index];
        const exchange = exchangeStates[index];
        if (!stateItem) continue;
        const mixWeight = Math.min(1, exchange.weight / Math.max(1, imported.length - 1));
        const averagedColor = exchange.weight > 0 ? exchange.color.multiplyScalar(1 / exchange.weight) : (models[index]?.sourceColor || new THREE.Color(0.72, 0.93, 1));
        stateItem.residue = {
          strength: THREE.MathUtils.clamp(exchange.strength * 0.9, 0, 1),
          memory: THREE.MathUtils.clamp(exchange.memory, 0, 1),
          optical: THREE.MathUtils.clamp(0.12 + mixWeight * 0.88, 0, 1),
          geometry: THREE.MathUtils.clamp(exchange.geometry, 0, 1),
          color: averagedColor.toArray(),
        };
      }
    }
    for (const mixer of mixers) mixer.update(delta);
    renderer.setRenderTarget(sceneTarget);renderer.clear(true,true,true);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.clear(true,true,true);renderer.render(sdfScene,sdfCamera);
  }
  frame();
  window.unifiedRendererActive = true;
  document.getElementById('viewport').classList.add('unified-renderer');
  document.getElementById('renderStatus').textContent = window.meltmeshI18n?.translate?.(window.meltmeshI18n.currentLanguage, 'threeUnified') || 'Three.js unified depth SDF';
  window.dispatchEvent(new Event('unified-renderer-ready'));
  return { loadFile, loadFiles, setVolume, pickGuideEntry, isReady: () => ready, isUnified: () => true };
};

window.dispatchEvent(new Event('three-module-ready'));
