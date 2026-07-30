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
  scene.environment = createEnvironment(renderer);
  scene.add(createGround());
  scene.add(new THREE.HemisphereLight(0xf8fbff, 0x58626a, 1.8));
  const key = new THREE.DirectionalLight(0xfff1df, 4.2); key.position.set(-4, 6, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xb9ddff, 2.0); fill.position.set(4, 2, -3); scene.add(fill);
  const camera = new THREE.PerspectiveCamera(59.49, 1, 0.05, 100);
  const root = new THREE.Group(); scene.add(root);
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
    uSphereScale:{value:1},uBoxScale:{value:1},uMeshScale:{value:1},uHasMeshSdf:{value:0},uHasMeshMaterial:{value:0},uHasMeshFeatures:{value:0},uMeshSdf:{value:dummySdf},uMeshMaterial:{value:dummyMaterial},uMeshFeatures:{value:dummyFeatures},uPreset:{value:0}
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
  let dissolveMemory = 0, nextPhaseSeed = 0, lastSeedPosition = null, lastMeshTransform = null;
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
  float contactDistance = min(sphereDistance, boxDistance);
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
      };
      if (index === 0 && state.objects?.mesh) state.objects.mesh.materialReport = state.imported?.[index]?.materialReport;
      models.push({ model, mixer, index, name: list[index].name, basePosition: model.position.clone(), baseScale: scale, sourceColor, materialReport });
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
    window.mathDomainRouter?.update(state, now);
    evolveDissolveMemory(state, delta);
    const effective=state.domainModel?.effective||state;sdfUniforms.uConsumeScale.value=effective.consumeScale;sdfUniforms.uBooleanSmooth.value=state.booleanSmooth;sdfUniforms.uFrontNoise.value=effective.frontNoise;
    for(let index=0;index<phaseSeeds.length;index++)sdfUniforms.uPhaseSeeds.value[index].set(...phaseSeeds[index].position,phaseSeeds[index].strength);
    for(let index=0;index<phaseSeeds.length;index++)sdfUniforms.uPhaseNormals.value[index].set(...phaseSeeds[index].normal,0);
    camera.position.set(Math.sin(state.yaw) * cp * state.distance, Math.sin(state.pitch) * state.distance, Math.cos(state.yaw) * cp * state.distance);
    camera.lookAt(0, -0.05, 0);camera.updateMatrixWorld();viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    renderer.getDrawingBufferSize(drawingSize);if(sceneTarget.width!==drawingSize.x||sceneTarget.height!==drawingSize.y)sceneTarget.setSize(drawingSize.x,drawingSize.y);sdfUniforms.uResolution.value.copy(drawingSize);sdfUniforms.uTime.value=performance.now()/1000;sdfUniforms.uBlend.value=effective.blend;sdfUniforms.uSpacing.value=state.spacing;sdfUniforms.uRadius.value=state.radius;sdfUniforms.uBoxSize.value=state.boxSize;sdfUniforms.uRoughness.value=state.roughness;sdfUniforms.uSpecular.value=state.specular;sdfUniforms.uTransmission.value=effective.transmission;sdfUniforms.uIor.value=state.ior;sdfUniforms.uDissolveMemory.value=dissolveMemory;sdfUniforms.uColor.value.set(...state.color);sdfUniforms.uCamera.value.copy(camera.position);sdfUniforms.uPreset.value=state.preset;sdfUniforms.uSpherePos.value.set(...state.objects.sphere.position);sdfUniforms.uBoxPos.value.set(...state.objects.box.position);sdfUniforms.uSphereScale.value=state.objects.sphere.scale;sdfUniforms.uBoxScale.value=state.objects.box.scale;sdfUniforms.uMeshPos.value.set(...state.objects.mesh.position);sdfUniforms.uMeshBounds.value.set(...state.objects.mesh.bounds);sdfUniforms.uMeshScale.value=state.objects.mesh.scale;sdfUniforms.uHasMeshSdf.value=state.meshFusion&&state.meshVolumeReady?1:0;
    root.visible = ready;
    root.position.set(0, 0, 0); root.scale.setScalar(1);
    for (const entry of models) {
      const object = state.imported?.[entry.index] || state.objects.mesh;
      const position = object?.position || [0, 0, 0];
      entry.model.position.set(entry.basePosition.x + position[0], entry.basePosition.y + position[1], entry.basePosition.z + position[2]);
      entry.model.scale.setScalar(entry.baseScale * (object?.scale || 1));
    }
    for (const shader of interactionShaders) {
      const sphere = state.objects.sphere, box = state.objects.box;
      shader.uniforms.uInteractionEnabled.value = state.meshFusion && state.meshVolumeReady ? 1 : 0;
      shader.uniforms.uContactSphere.value.set(...sphere.position, state.radius * sphere.scale);
      shader.uniforms.uContactBox.value.set(...box.position, 0.28 * box.scale);
      shader.uniforms.uContactBoxSize.value.set(state.boxSize * box.scale, state.boxSize * 0.82 * box.scale, state.boxSize * 0.9 * box.scale);
      shader.uniforms.uContactBand.value = Math.max(state.blend, 0.01);
      shader.uniforms.uContactTime.value = now;
      shader.uniforms.uDomainImplicit.value = state.domainModel?.domains?.implicitGeometry ?? 0.34;
      shader.uniforms.uDomainPhase.value = state.domainModel?.domains?.phaseField ?? 0.33;
      shader.uniforms.uDomainOptical.value = state.domainModel?.domains?.optical ?? 0.33;
      shader.uniforms.uContactDebug.value = state.contactDebug ? 1 : 0;
      shader.uniforms.uReactionColor.value.setRGB(state.color[0], state.color[1], state.color[2]).lerp(new THREE.Color(0x8dffd0), 0.42);
      const imported = state.imported || [];
      let contact = 0, closestPair = null, closestDistance = Infinity;
      for (let i = 0; i < imported.length; i++) for (let j = i + 1; j < imported.length; j++) {
        const a = imported[i], b = imported[j];
        const distance = Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1], a.position[2] - b.position[2]);
        contact = Math.max(contact, THREE.MathUtils.clamp(1 - distance / Math.max(state.blend * 2.4, 0.2), 0, 1));
        if(distance < closestDistance){closestDistance=distance;closestPair=[i,j];}
      }
      shader.uniforms.uImportedContact.value = contact;
      if(closestPair){const [i,j]=closestPair,a=imported[i],b=imported[j],ca=models[i]?.sourceColor,cb=models[j]?.sourceColor;shader.uniforms.uImportedContactCenter.value.set((a.position[0]+b.position[0])*.5,(a.position[1]+b.position[1])*.5,(a.position[2]+b.position[2])*.5);shader.uniforms.uImportedContactRadius.value=Math.max(state.blend*1.6,.18);if(ca&&cb)shader.uniforms.uReactionColor.value.copy(ca).lerp(cb,.5);}
    }
    for (const mixer of mixers) mixer.update(delta);
    renderer.setRenderTarget(sceneTarget);renderer.clear(true,true,true);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.clear(true,true,true);renderer.render(sdfScene,sdfCamera);
  }
  frame();
  window.unifiedRendererActive = true;
  document.getElementById('viewport').classList.add('unified-renderer');
  document.getElementById('renderStatus').textContent = 'Three.js · 统一深度 SDF';
  window.dispatchEvent(new Event('unified-renderer-ready'));
  return { loadFile, loadFiles, setVolume, isReady: () => ready, isUnified: () => true };
};

window.dispatchEvent(new Event('three-module-ready'));
