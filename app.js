const canvas = document.getElementById('glCanvas');
const meshCanvas = document.getElementById('meshCanvas');
const interactionSurface = document.getElementById('viewport');
const errorPanel = document.getElementById('errorPanel');
const errorMessage = document.getElementById('errorMessage');
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });

const state = {
  blend: 0.28, spacing: 1.05, radius: 1, boxSize: 0.78, contactThreshold:0.32, consumeScale:0.86, booleanSmooth:0.24, frontNoise:0.14, dissolveRate:0.55, recoveryRate:0.04,
  roughness: 0.06, specular: 0.96, transmission: 0.98, ior: 1.52, color: [0.74, 0.91, 0.97],
  yaw: -0.55, pitch: 0.25, distance: 6.2, preset: 0, selected: 'sphere', mode:'move', meshFusion:true, meshVolumeReady:false, dissolveMemory:0, phaseSeeds:Array.from({length:8},()=>[0,0,0,0]),phaseNormals:Array.from({length:8},()=>[0,1,0,0]),
  objects:{sphere:{position:[-0.55,0,0],scale:1},box:{position:[0.5,0.08,0],scale:1},mesh:{position:[0,0,0],scale:1,bounds:[1,1,1]}}
};

const vertexSource = `#version 300 es
in vec2 position;
void main(){ gl_Position = vec4(position, 0.0, 1.0); }`;

const fragmentSource = `#version 300 es
precision highp float;
precision highp sampler3D;
out vec4 fragColor;
uniform vec2 uResolution;
uniform float uTime, uBlend, uSpacing, uRadius, uBoxSize, uRoughness, uSpecular, uTransmission, uIor, uDissolveMemory, uConsumeScale, uBooleanSmooth, uFrontNoise;
uniform vec3 uColor, uCamera, uSpherePos, uBoxPos, uMeshPos, uMeshBounds;
uniform float uSphereScale, uBoxScale;
uniform float uMeshScale; uniform int uHasMeshSdf, uHasMeshMaterial; uniform sampler3D uMeshSdf; uniform sampler3D uMeshMaterial;
uniform vec4 uPhaseSeeds[8];
uniform vec4 uPhaseNormals[8];
uniform int uPreset;

float sdSphere(vec3 p, float r){ return length(p)-r; }
float sdRoundBox(vec3 p, vec3 b, float r){ vec3 q=abs(p)-b+r; return min(max(q.x,max(q.y,q.z)),0.0)+length(max(q,0.0))-r; }
float smin(float a,float b,float k){ float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0); return mix(b,a,h)-k*h*(1.0-h); }
float fieldHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float fieldNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(fieldHash(i),fieldHash(i+vec3(1,0,0)),f.x),mix(fieldHash(i+vec3(0,1,0)),fieldHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(fieldHash(i+vec3(0,0,1)),fieldHash(i+vec3(1,0,1)),f.x),mix(fieldHash(i+vec3(0,1,1)),fieldHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float quasiPattern(vec3 p){const float golden=2.39996323;float sum=0.0;for(int i=0;i<6;i++){float a=float(i)*golden;vec3 k=normalize(vec3(cos(a),sin(a),0.37+0.08*float(i)));sum+=cos(dot(p,k)*(3.2+0.47*float(i))+uTime*(0.12+0.027*float(i)));}return sum/6.0;}
float dissolvePattern(vec3 p){vec3 flow=vec3(0.0,-uTime*0.09,uTime*0.035);float ordered=quasiPattern(p*1.08+flow),coarse=fieldNoise(p*3.8+flow),medium=fieldNoise(p*9.1-flow*1.7);return ordered*0.58+(coarse*0.28+medium*0.14)*2.0-0.42;}
float refractiveSpectrum(vec3 p,vec3 n){vec3 axis=abs(n.y)<0.92?vec3(0,1,0):vec3(1,0,0),t1=normalize(cross(axis,n)),t2=normalize(cross(n,t1));float sum=0.0;for(int i=0;i<6;i++){float a=float(i)*2.39996323;vec3 incident=normalize(t1*cos(a)+t2*sin(a)+n*(0.20+0.045*float(i)));vec3 reflected=incident-2.0*n*dot(incident,n);float frequency=2.8+0.42*float(i);sum+=cos(dot(p,incident)*frequency+uTime*0.10*float(i+1));sum+=0.68*cos(dot(p,reflected)*frequency*0.83-uTime*0.07*float(i+1));}return sum/10.08;}
vec3 importedUv(vec3 p){return (p-uMeshPos)/uMeshScale/(uMeshBounds*2.0)+0.5;}
float importedSdf(vec3 p){vec3 local=(p-uMeshPos)/uMeshScale, q=abs(local)-uMeshBounds;float outside=length(max(q,0.0));if(max(q.x,max(q.y,q.z))>0.0)return outside*uMeshScale;return texture(uMeshSdf,importedUv(p)).r*uMeshScale;}
float localPhase(vec3 p){float survival=1.0;float tangentSigma=max(uBlend*uConsumeScale*1.75,0.08),normalSigma=max(tangentSigma*0.34,0.035);for(int i=0;i<8;i++){vec3 delta=p-uPhaseSeeds[i].xyz,n=normalize(uPhaseNormals[i].xyz+vec3(1e-6));float normalDistance=dot(delta,n),tangentDistance2=max(dot(delta,delta)-normalDistance*normalDistance,0.0);float exponent=tangentDistance2/(2.0*tangentSigma*tangentSigma)+normalDistance*normalDistance/(2.0*normalSigma*normalSigma);float contribution=clamp(uPhaseSeeds[i].w*exp(-exponent),0.0,0.96);survival*=1.0-contribution;}return clamp(1.0-survival,0.0,1.0);}

vec2 primitivePair(vec3 p){
  vec3 a=uSpherePos, b=uBoxPos;
  if(uPreset==0){ a=vec3(-uSpacing*0.52,0.0,0.0); b=vec3(uSpacing*0.48,0.08,0.0); }
  if(uPreset==1){ a=vec3(-0.32,-uSpacing*0.35,0.0); b=vec3(0.32,uSpacing*0.38,0.0); }
  if(uPreset==2){ float ang=uTime*0.32; a=vec3(cos(ang),0.0,sin(ang))*uSpacing*0.58; b=-a; }
  float sphere=sdSphere(p-a,uRadius*uSphereScale);
  vec3 bp=p-b;
  if(uPreset==2) bp.xy*=mat2(cos(0.55),-sin(0.55),sin(0.55),cos(0.55));
  float box=sdRoundBox(bp,vec3(uBoxSize,uBoxSize*0.82,uBoxSize*0.9)*uBoxScale,0.28*uBoxScale);
  return vec2(sphere,box);
}
float primitiveSdf(vec3 p){
  vec2 pair=primitivePair(p);float k=max(uBlend,0.001);
  float contact=1.0-smoothstep(k*0.12,k*1.35,abs(pair.x-pair.y));
  return smin(pair.x,pair.y,k)+dissolvePattern(p)*k*0.075*contact;
}
float objectSdf(vec3 p){
  float primitive=primitiveSdf(p);if(uHasMeshSdf!=1)return primitive;
  float mesh=importedSdf(p),k=max(uBlend,0.001);
  float memory=max(smoothstep(0.0,1.0,uDissolveMemory)*0.18,localPhase(p));
  float frontNoise=dissolvePattern(p*1.17+vec3(2.4))*k*mix(0.02,uFrontNoise,memory);
  float consumeRadius=k*mix(0.08,uConsumeScale,memory);
  float consumer=mesh-consumeRadius+frontNoise;
  float erodedPrimitive=max(primitive,-consumer);
  float featureScale=clamp(abs(mesh)*2.4+k*0.10,k*0.06,k*max(uBooleanSmooth,0.01));
  return smin(erodedPrimitive,mesh,featureScale);
}
float importedMaterialWeight(vec3 p){
  if(uHasMeshSdf!=1)return 0.0;
  float k=max(uBlend,0.001),primitive=primitiveSdf(p),mesh=importedSdf(p);
  float memory=max(smoothstep(0.0,1.0,uDissolveMemory)*0.18,localPhase(p));float front=mesh-k*mix(0.08,uConsumeScale,memory)+dissolvePattern(p*1.17+vec3(2.4))*k*mix(0.02,uFrontNoise,memory);
  float absorbed=1.0-smoothstep(-k*0.18,k*0.34,front);
  float ownership=clamp(0.5+0.5*(primitive-mesh)/(k*0.32),0.0,1.0);
  return max(absorbed,ownership);
}
float fusionReaction(vec3 p,vec3 n){
  float k=max(uBlend,0.001);vec2 pair=primitivePair(p);
  float primitiveContact=1.0-smoothstep(k*0.08,k*1.25,abs(pair.x-pair.y));
  float meshContact=0.0;if(uHasMeshSdf==1){float mesh=importedSdf(p),memory=max(smoothstep(0.0,1.0,uDissolveMemory)*0.18,localPhase(p));float front=mesh-k*mix(0.08,uConsumeScale,memory)+dissolvePattern(p*1.17+vec3(2.4))*k*mix(0.02,uFrontNoise,memory);meshContact=(1.0-smoothstep(k*0.05,k*0.42,abs(front)))*memory;}
  float spectrum=0.5+0.5*refractiveSpectrum(p,n),flow=0.72+0.28*dissolvePattern(p*0.82+vec3(0.0,uTime*0.04,0.0));
  return clamp(max(primitiveContact,meshContact)*flow*(0.82+0.18*spectrum),0.0,1.0);
}

vec2 scene(vec3 p){
  float obj=objectSdf(p);
  float ground=p.y+1.38;
  return obj<ground?vec2(obj,1.0):vec2(ground,2.0);
}
vec3 normalAt(vec3 p){
  vec2 e=vec2(0.0015,0.0);
  return normalize(vec3(scene(p+e.xyy).x-scene(p-e.xyy).x,scene(p+e.yxy).x-scene(p-e.yxy).x,scene(p+e.yyx).x-scene(p-e.yyx).x));
}
float softShadow(vec3 ro,vec3 rd,float mint,float maxt){
  float res=1.0,t=mint;
  for(int i=0;i<32;i++){ float h=scene(ro+rd*t).x; res=min(res,12.0*h/t); t+=clamp(h,0.02,0.22); if(h<0.0005||t>maxt) break; }
  return clamp(res,0.15,1.0);
}
float ambientOcclusion(vec3 p,vec3 n){
  float occ=0.0,scale=1.0;
  for(int i=1;i<=5;i++){ float h=0.045*float(i); occ+=(h-scene(p+n*h).x)*scale; scale*=0.68; }
  return clamp(1.0-occ*2.2,0.0,1.0);
}
vec3 sky(vec3 rd){
  float h=clamp(rd.y*0.5+0.5,0.0,1.0);
  vec3 base=mix(vec3(0.82,0.89,0.94),vec3(1.0,0.99,0.94),h);
  float sun=pow(max(dot(rd,normalize(vec3(-0.5,0.65,-0.35))),0.0),48.0);
  return base+sun*vec3(0.55,0.42,0.20);
}
void main(){
  vec2 uv=(2.0*gl_FragCoord.xy-uResolution.xy)/uResolution.y;
  vec3 ro=uCamera, target=vec3(0.0,-0.05,0.0);
  vec3 ww=normalize(target-ro), uu=normalize(cross(ww,vec3(0,1,0))), vv=cross(uu,ww);
  vec3 rd=normalize(uu*uv.x+vv*uv.y+ww*1.75);
  float t=0.0,id=0.0,surfaceFresnel=0.0,surfaceIsSphere=0.0;vec3 surfaceNormal=vec3(0.0,1.0,0.0);
  for(int i=0;i<96;i++){ vec2 hit=scene(ro+rd*t); float hitEpsilon=max(0.00055,0.00018*t); if(hit.x<hitEpsilon){id=hit.y;break;} t+=hit.x*0.82; if(t>30.0)break; }
  vec3 col=sky(rd);
  if(id>0.0){
    vec3 p=ro+rd*t,n=normalAt(p),lightDir=normalize(vec3(-0.65,0.85,-0.45));surfaceNormal=n;surfaceFresnel=pow(1.0-max(dot(n,-rd),0.0),5.0);vec3 sphereCenter=uSpherePos,boxCenter=uBoxPos;if(uPreset==0){sphereCenter=vec3(-uSpacing*0.52,0.0,0.0);boxCenter=vec3(uSpacing*0.48,0.08,0.0);}if(uPreset==1){sphereCenter=vec3(-0.32,-uSpacing*0.35,0.0);boxCenter=vec3(0.32,uSpacing*0.38,0.0);}surfaceIsSphere=step(abs(sdSphere(p-sphereCenter,uRadius*uSphereScale)),abs(sdRoundBox(p-boxCenter,vec3(uBoxSize,uBoxSize*0.82,uBoxSize*0.9)*uBoxScale,0.28*uBoxScale)));
    float diff=max(dot(n,lightDir),0.0),shadow=softShadow(p+n*0.008,lightDir,0.03,10.0),ao=ambientOcclusion(p,n);
    vec3 albedo=uColor;float surfaceRoughness=uRoughness;float reaction=id<1.5?fusionReaction(p,n):0.0;float spectrum=0.5+0.5*refractiveSpectrum(p,n);
    if(id<1.5&&uHasMeshSdf==1&&uHasMeshMaterial==1){float materialWeight=importedMaterialWeight(p);vec4 imported=texture(uMeshMaterial,clamp(importedUv(p),0.0,1.0));float junction=pow(max(0.0,1.0-abs(materialWeight*2.0-1.0)),1.7);albedo=mix(albedo,imported.rgb,smoothstep(0.04,0.96,materialWeight));albedo=mix(albedo,normalize(max(albedo,vec3(0.001)))*1.08,junction*0.24);surfaceRoughness=mix(surfaceRoughness,imported.a,smoothstep(0.08,0.92,materialWeight));surfaceRoughness=mix(surfaceRoughness,0.12,junction*0.34);}
    if(id<1.5){vec3 spectralTint=mix(vec3(0.12,0.68,0.58),vec3(0.86,0.38,0.16),spectrum);albedo=mix(albedo,albedo*vec3(0.58,0.82,0.78),reaction*0.42);albedo=mix(albedo,spectralTint,reaction*0.10);surfaceRoughness=mix(surfaceRoughness,0.025,reaction*0.72);}
    if(id>1.5){ float grid=mod(floor(p.x*2.0)+floor(p.z*2.0),2.0); albedo=mix(vec3(0.66,0.70,0.72),vec3(0.78,0.81,0.80),grid); }
    vec3 viewDir=-rd,halfDir=normalize(lightDir+viewDir);
    float noV=max(dot(n,viewDir),0.001),noL=max(dot(n,lightDir),0.0),noH=max(dot(n,halfDir),0.0),voH=max(dot(viewDir,halfDir),0.0);
    if(id>1.5){col=albedo*(0.58+diff*shadow*0.42);}
    else{float fresnel=pow(1.0-noV,5.0),reflectionWeight=mix(0.08,0.92,fresnel)*uSpecular;vec3 reflection=sky(reflect(rd,n));vec3 refraction=sky(refract(rd,n,0.66))*mix(vec3(1.0),albedo,0.18);float highlight=pow(noH,mix(220.0,48.0,surfaceRoughness))*shadow;col=mix(refraction,reflection,reflectionWeight)+highlight*vec3(1.0,0.98,0.94)*2.4+albedo*0.035;col=mix(col,col*0.62+reflection*0.38,reaction*0.56);}
    col=mix(col,sky(rd),1.0-exp(-0.012*t*t));
  }
  col=1.0-exp(-col*1.45); col=pow(col,vec3(0.4545));
  float vignette=1.0-0.10*dot(uv,uv); fragColor=vec4(col*vignette,1.0);
}`;
window.fieldStudioShaders={vertexSource,fragmentSource};

function fail(message){ errorPanel.hidden=false; errorMessage.textContent=message; document.getElementById('renderStatus').textContent='渲染不可用'; }
function compile(type, source){ const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader); if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader)); return shader; }

let program;
try {
  if(!gl) throw new Error('当前浏览器或显卡未启用 WebGL2。请开启硬件加速后重试。');
  program=gl.createProgram(); gl.attachShader(program,compile(gl.VERTEX_SHADER,vertexSource)); gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragmentSource)); gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
} catch(error){ fail(error.message); throw error; }

const positions=new Float32Array([-1,-1,3,-1,-1,3]);
const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,positions,gl.STATIC_DRAW);
const pos=gl.getAttribLocation(program,'position'); gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0); gl.useProgram(program);
const uniformNames=['uResolution','uTime','uBlend','uSpacing','uRadius','uBoxSize','uRoughness','uSpecular','uTransmission','uIor','uDissolveMemory','uConsumeScale','uBooleanSmooth','uFrontNoise','uPhaseSeeds[0]','uPhaseNormals[0]','uColor','uCamera','uPreset','uSpherePos','uBoxPos','uSphereScale','uBoxScale','uMeshPos','uMeshBounds','uMeshScale','uHasMeshSdf','uHasMeshMaterial','uMeshSdf','uMeshMaterial'];
const uniforms=Object.fromEntries(uniformNames.map(name=>[name,gl.getUniformLocation(program,name)]));

function resize(){ const dpr=Math.min(devicePixelRatio||1,1.75); const w=Math.round(canvas.clientWidth*dpr),h=Math.round(canvas.clientHeight*dpr); if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;meshCanvas.width=w;meshCanvas.height=h;gl.viewport(0,0,w,h);if(meshGl)meshGl.viewport(0,0,w,h);} }
let frameCount=0,lastFps=performance.now();
function render(now){
  gl.uniform1f(uniforms.uConsumeScale,state.consumeScale); gl.uniform1f(uniforms.uBooleanSmooth,state.booleanSmooth); gl.uniform1f(uniforms.uFrontNoise,state.frontNoise);
  gl.uniform4fv(uniforms['uPhaseSeeds[0]'],state.phaseSeeds.flat());
  gl.uniform4fv(uniforms['uPhaseNormals[0]'],state.phaseNormals.flat());
  resize(); const cp=Math.cos(state.pitch), camera=[Math.sin(state.yaw)*cp*state.distance,Math.sin(state.pitch)*state.distance,Math.cos(state.yaw)*cp*state.distance];
  if(threeRenderer?.isUnified?.()){requestAnimationFrame(render);return;}
  if(webgpuRenderer){renderImportedMesh(camera);requestAnimationFrame(render);return;}
  gl.uniform2f(uniforms.uResolution,canvas.width,canvas.height); gl.uniform1f(uniforms.uTime,now/1000); gl.uniform1f(uniforms.uBlend,state.blend); gl.uniform1f(uniforms.uSpacing,state.spacing); gl.uniform1f(uniforms.uRadius,state.radius); gl.uniform1f(uniforms.uBoxSize,state.boxSize); gl.uniform1f(uniforms.uRoughness,state.roughness); gl.uniform1f(uniforms.uSpecular,state.specular); gl.uniform1f(uniforms.uTransmission,state.transmission); gl.uniform1f(uniforms.uIor,state.ior); gl.uniform1f(uniforms.uDissolveMemory,state.dissolveMemory); gl.uniform3fv(uniforms.uColor,state.color); gl.uniform3fv(uniforms.uCamera,camera); gl.uniform1i(uniforms.uPreset,state.preset);gl.uniform3fv(uniforms.uSpherePos,state.objects.sphere.position);gl.uniform3fv(uniforms.uBoxPos,state.objects.box.position);gl.uniform1f(uniforms.uSphereScale,state.objects.sphere.scale);gl.uniform1f(uniforms.uBoxScale,state.objects.box.scale);gl.uniform3fv(uniforms.uMeshPos,state.objects.mesh.position);gl.uniform3fv(uniforms.uMeshBounds,state.objects.mesh.bounds);gl.uniform1f(uniforms.uMeshScale,state.objects.mesh.scale);gl.uniform1i(uniforms.uHasMeshSdf,state.meshFusion&&meshSdfTexture?1:0);gl.uniform1i(uniforms.uHasMeshMaterial,meshMaterialTexture?1:0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_3D,meshSdfTexture);gl.uniform1i(uniforms.uMeshSdf,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_3D,meshMaterialTexture);gl.uniform1i(uniforms.uMeshMaterial,1);
  gl.drawArrays(gl.TRIANGLES,0,3); frameCount++;
  renderImportedMesh(camera);
  if(now-lastFps>700){ document.getElementById('fps').textContent=`${Math.round(frameCount*1000/(now-lastFps))} FPS`; frameCount=0; lastFps=now; }
  requestAnimationFrame(render);
}

['blend','contactThreshold','consumeScale','booleanSmooth','frontNoise','dissolveRate','recoveryRate','spacing','radius','boxSize','roughness','specular','transmission','ior'].forEach(id=>{ const input=document.getElementById(id),output=document.querySelector(`output[for=${id}]`); input.addEventListener('input',()=>{state[id]=Number(input.value);output.value=Number(input.value).toFixed(2);}); });
document.querySelectorAll('.swatch').forEach(button=>button.addEventListener('click',()=>{document.querySelector('.swatch.active')?.classList.remove('active');button.classList.add('active');state.color=button.dataset.color.split(',').map(Number);}));
const materialPresets={
  marble:{roughness:.06,specular:.96,transmission:.98,ior:1.52,color:[.74,.91,.97],swatch:0},
  crystal:{roughness:.02,specular:1,transmission:.94,ior:1.72,color:[.92,.97,1],swatch:0},
  smoke:{roughness:.12,specular:.82,transmission:.72,ior:1.48,color:[.18,.25,.30],swatch:null},
  frosted:{roughness:.48,specular:.54,transmission:.62,ior:1.46,color:[.72,.84,.88],swatch:0}
};
function syncMaterialControls(){for(const id of ['roughness','specular','transmission','ior']){document.getElementById(id).value=state[id];document.querySelector(`output[for=${id}]`).value=state[id].toFixed(2);}}
document.querySelectorAll('.material-preset').forEach(button=>button.addEventListener('click',()=>{const preset=materialPresets[button.dataset.material];Object.assign(state,{roughness:preset.roughness,specular:preset.specular,transmission:preset.transmission,ior:preset.ior,color:[...preset.color]});document.querySelectorAll('.material-preset').forEach(item=>item.classList.toggle('active',item===button));document.querySelectorAll('.swatch').forEach((item,index)=>item.classList.toggle('active',index===preset.swatch));document.getElementById('materialStatus').textContent=button.textContent;syncMaterialControls();}));
document.querySelectorAll('.swatch').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.material-preset').forEach(item=>item.classList.remove('active'));document.getElementById('materialStatus').textContent='自定义染色';}));
for(const id of ['roughness','specular','transmission','ior'])document.getElementById(id).addEventListener('input',()=>{document.querySelectorAll('.material-preset').forEach(item=>item.classList.remove('active'));document.getElementById('materialStatus').textContent='自定义玻璃';});
const presets={blend:{preset:0,blend:.28,spacing:1.05,radius:1,boxSize:.78},stack:{preset:1,blend:.24,spacing:1.5,radius:.82,boxSize:.68},orbit:{preset:2,blend:.16,spacing:1.8,radius:.7,boxSize:.62}};
function applyPreset(name){Object.assign(state,presets[name]);document.querySelectorAll('.preset').forEach(b=>b.classList.toggle('active',b.dataset.preset===name));['blend','spacing','radius','boxSize'].forEach(id=>{document.getElementById(id).value=state[id];document.querySelector(`output[for=${id}]`).value=state[id].toFixed(2);});}
document.querySelectorAll('.preset').forEach(button=>button.addEventListener('click',()=>applyPreset(button.dataset.preset)));
document.getElementById('randomize').addEventListener('click',()=>{state.blend=.12+Math.random()*.85;state.spacing=.45+Math.random()*1.45;state.radius=.58+Math.random()*.68;state.boxSize=.48+Math.random()*.62;['blend','spacing','radius','boxSize'].forEach(id=>{document.getElementById(id).value=state[id];document.querySelector(`output[for=${id}]`).value=state[id].toFixed(2);});});
document.getElementById('resetView').addEventListener('click',()=>Object.assign(state,{yaw:-.55,pitch:.25,distance:6.2}));
let dragging=false,lastX=0,lastY=0;
interactionSurface.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;interactionSurface.setPointerCapture(e.pointerId);});
interactionSurface.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;if(state.mode==='move'){const object=state.objects[state.selected],speed=state.distance*.0018;object.position[0]+=dx*Math.cos(state.yaw)*speed;object.position[2]-=dx*Math.sin(state.yaw)*speed;object.position[1]-=dy*speed;state.preset=3;selectObject(state.selected);}else{state.yaw-=dx*.008;state.pitch=Math.max(-1.25,Math.min(1.25,state.pitch+dy*.008));}lastX=e.clientX;lastY=e.clientY;});
interactionSurface.addEventListener('pointerup',()=>dragging=false); interactionSurface.addEventListener('pointercancel',()=>dragging=false);
interactionSurface.addEventListener('wheel',e=>{e.preventDefault();state.distance=Math.max(3.3,Math.min(11,state.distance+e.deltaY*.006));},{passive:false});

const meshGl=meshCanvas.getContext('webgl2',{alpha:true,antialias:true,premultipliedAlpha:false});
const meshVertex=`#version 300 es
precision highp float;
in vec3 aPosition; in vec3 aNormal;
uniform vec3 uMeshCamera, uMeshOffset; uniform float uAspect, uMeshScale;
out vec3 vNormal; out vec3 vWorld;
void main(){
  vec3 target=vec3(0.0,-0.05,0.0),ww=normalize(target-uMeshCamera),uu=normalize(cross(ww,vec3(0,1,0))),vv=cross(uu,ww);
  vec3 world=aPosition*uMeshScale+uMeshOffset,rel=world-uMeshCamera; float z=dot(rel,ww);
  gl_Position=vec4(dot(rel,uu)*1.75/uAspect,dot(rel,vv)*1.75,z*0.5,z);
  vNormal=aNormal; vWorld=world;
}`;
const meshFragment=`#version 300 es
precision highp float;
in vec3 vNormal; in vec3 vWorld; out vec4 outColor;
void main(){
  vec3 n=normalize(vNormal),lightDir=normalize(vec3(-0.65,0.85,-0.45));
  float diff=max(dot(n,lightDir),0.0),rim=pow(1.0-abs(n.z),2.0);
  vec3 base=vec3(0.76,0.86,0.34),col=base*(0.28+0.72*diff)+rim*0.14;
  outColor=vec4(col,0.96);
}`;
let meshProgram=null,meshFrames=[],meshSdfTexture=null,meshMaterialTexture=null,meshSdfData=null,meshMaterialData=null,webgpuRenderer=null,threeRenderer=null,threeModelReady=false,pendingThreeFile=null,meshVertexCount=0,sequencePlaying=true,sequenceStart=performance.now(),sequenceFrame=0;
if(meshGl){
  const meshCompile=(type,source)=>{const shader=meshGl.createShader(type);meshGl.shaderSource(shader,source);meshGl.compileShader(shader);if(!meshGl.getShaderParameter(shader,meshGl.COMPILE_STATUS))throw new Error(meshGl.getShaderInfoLog(shader));return shader;};
  meshProgram=meshGl.createProgram();meshGl.attachShader(meshProgram,meshCompile(meshGl.VERTEX_SHADER,meshVertex));meshGl.attachShader(meshProgram,meshCompile(meshGl.FRAGMENT_SHADER,meshFragment));meshGl.linkProgram(meshProgram);
  meshGl.enable(meshGl.DEPTH_TEST);
}
function renderImportedMesh(camera){
  if(!meshGl)return;meshGl.clearColor(0,0,0,0);meshGl.clear(meshGl.COLOR_BUFFER_BIT|meshGl.DEPTH_BUFFER_BIT);if(!meshFrames.length||pendingThreeFile||threeModelReady||(state.meshFusion&&meshSdfTexture))return;
  if(meshFrames.length>1&&sequencePlaying){const fps=Number(document.getElementById('sequenceFps').value)||24;sequenceFrame=Math.floor((performance.now()-sequenceStart)/1000*fps)%meshFrames.length;updateTimeline();}
  const frame=meshFrames[sequenceFrame];meshVertexCount=frame.count;meshGl.useProgram(meshProgram);meshGl.bindBuffer(meshGl.ARRAY_BUFFER,frame.buffer);
  const stride=6*4,p=meshGl.getAttribLocation(meshProgram,'aPosition'),n=meshGl.getAttribLocation(meshProgram,'aNormal');
  meshGl.enableVertexAttribArray(p);meshGl.vertexAttribPointer(p,3,meshGl.FLOAT,false,stride,0);meshGl.enableVertexAttribArray(n);meshGl.vertexAttribPointer(n,3,meshGl.FLOAT,false,stride,3*4);
  meshGl.uniform3fv(meshGl.getUniformLocation(meshProgram,'uMeshCamera'),camera);meshGl.uniform3fv(meshGl.getUniformLocation(meshProgram,'uMeshOffset'),state.objects.mesh.position);meshGl.uniform1f(meshGl.getUniformLocation(meshProgram,'uMeshScale'),state.objects.mesh.scale);meshGl.uniform1f(meshGl.getUniformLocation(meshProgram,'uAspect'),meshCanvas.width/meshCanvas.height);meshGl.drawArrays(meshGl.TRIANGLES,0,meshVertexCount);
}
function triangle(out,a,b,c){
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
  for(const v of [a,b,c])out.push(v[0],v[1],v[2],nx,ny,nz);
}
function parseObj(text){
  const vertices=[],out=[];for(const raw of text.split(/\r?\n/)){const parts=raw.trim().split(/\s+/);if(parts[0]==='v')vertices.push(parts.slice(1,4).map(Number));else if(parts[0]==='f'){const face=parts.slice(1).map(value=>{let i=Number(value.split('/')[0]);if(i<0)i=vertices.length+i+1;return vertices[i-1];});for(let i=1;i<face.length-1;i++)if(face[0]&&face[i]&&face[i+1])triangle(out,face[0],face[i],face[i+1]);}}return out;
}
function parseStl(buffer){
  const view=new DataView(buffer),out=[];if(buffer.byteLength>=84&&84+view.getUint32(80,true)*50===buffer.byteLength){const count=view.getUint32(80,true);let offset=84;for(let i=0;i<count;i++,offset+=50){const a=[],b=[],c=[];for(let k=0;k<3;k++)a.push(view.getFloat32(offset+12+k*4,true));for(let k=0;k<3;k++)b.push(view.getFloat32(offset+24+k*4,true));for(let k=0;k<3;k++)c.push(view.getFloat32(offset+36+k*4,true));triangle(out,a,b,c);}return out;}
  const text=new TextDecoder().decode(buffer),verts=[];for(const match of text.matchAll(/vertex\s+([-+\deE.]+)\s+([-+\deE.]+)\s+([-+\deE.]+)/gi)){verts.push([Number(match[1]),Number(match[2]),Number(match[3])]);if(verts.length===3){triangle(out,...verts);verts.length=0;}}return out;
}
function normalizeMeshSequence(frames){
  let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const data of frames){if(data.length<18)throw new Error('某个文件中没有可用的三角形');for(let i=0;i<data.length;i+=6)for(let k=0;k<3;k++){min[k]=Math.min(min[k],data[i+k]);max[k]=Math.max(max[k],data[i+k]);}}
  const center=min.map((v,k)=>(v+max[k])/2),scale=2.6/Math.max(...max.map((v,k)=>v-min[k]),.0001);state.objects.mesh.bounds=max.map((v,k)=>Math.max((v-min[k])*scale*.5,.04));return frames.map(data=>{for(let i=0;i<data.length;i+=6){data[i]=(data[i]-center[0])*scale;data[i+1]=(data[i+1]-center[1])*scale-.05;data[i+2]=(data[i+2]-center[2])*scale;}return new Float32Array(data);});
}
let toastTimer;
function showToast(message,isError=false){const toast=document.getElementById('toast');toast.textContent=message;toast.style.borderColor=isError?'#ff654f':'#59613c';toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.hidden=true,3200);}
function updateTimeline(){const slider=document.getElementById('frameSlider');slider.value=sequenceFrame;document.getElementById('frameLabel').textContent=`${sequenceFrame+1} / ${meshFrames.length}`;}
const objectNames={sphere:'球体',box:'圆角盒',mesh:'导入网格'};
function selectObject(name){
  if(!state.objects[name])return;state.selected=name;document.querySelectorAll('[data-object]').forEach(button=>button.classList.toggle('active',button.dataset.object===name));document.getElementById('selectedName').textContent=`${objectNames[name]} · 变换`;
  const object=state.objects[name];['tx','ty','tz'].forEach((id,index)=>document.getElementById(id).value=object.position[index].toFixed(2));document.getElementById('objectScale').value=object.scale.toFixed(2);
}
function bindSceneItems(){document.querySelectorAll('[data-object]').forEach(button=>{button.onclick=()=>selectObject(button.dataset.object);});}
['tx','ty','tz'].forEach((id,index)=>document.getElementById(id).addEventListener('input',event=>{const value=Number(event.target.value);if(Number.isFinite(value)){state.objects[state.selected].position[index]=value;state.preset=3;document.querySelectorAll('.preset').forEach(button=>button.classList.remove('active'));}}));
document.getElementById('objectScale').addEventListener('input',event=>{const value=Number(event.target.value);if(Number.isFinite(value)&&value>0){state.objects[state.selected].scale=value;state.preset=3;document.querySelectorAll('.preset').forEach(button=>button.classList.remove('active'));}});
document.getElementById('resetObject').addEventListener('click',()=>{const positions={sphere:[-.55,0,0],box:[.5,.08,0],mesh:[0,0,0]},bounds=state.objects[state.selected].bounds;state.objects[state.selected]={position:[...positions[state.selected]],scale:1,...(bounds?{bounds}: {})};state.preset=3;selectObject(state.selected);});
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{state.mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(item=>item.classList.toggle('active',item===button));canvas.style.cursor=state.mode==='move'?'move':'grab';}));
function setFusionMode(enabled){state.meshFusion=enabled;viewport.classList.toggle('fusion-active',enabled);}
document.getElementById('meshFusion').addEventListener('change',event=>setFusionMode(event.target.checked));
bindSceneItems();
async function importFiles(fileList){
  const files=Array.from(fileList).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));if(!files.length)return;
  if(files.length===1&&files[0].name.toLowerCase().endsWith('.glb')){await importGlb(files[0]);return;}
  const unsupported=files.find(file=>['abc','vdb'].includes(file.name.split('.').pop().toLowerCase()));if(unsupported){showToast(`${unsupported.name} 需要服务端转换；请从 Blender 导出 OBJ 序列`,true);return;}
  if(files.some(file=>!['obj','stl'].includes(file.name.split('.').pop().toLowerCase()))){showToast('请选择 OBJ、STL，或同格式的帧序列',true);return;}
  try{showToast(`正在解析 ${files.length} 个网格帧...`);const raw=[];for(const file of files){const ext=file.name.split('.').pop().toLowerCase();raw.push(ext==='obj'?parseObj(await file.text()):parseStl(await file.arrayBuffer()));}const normalized=normalizeMeshSequence(raw);
    for(const frame of meshFrames)meshGl.deleteBuffer(frame.buffer);meshFrames=normalized.map(data=>{const buffer=meshGl.createBuffer();meshGl.bindBuffer(meshGl.ARRAY_BUFFER,buffer);meshGl.bufferData(meshGl.ARRAY_BUFFER,data,meshGl.STATIC_DRAW);return{buffer,count:data.length/6};});sequenceFrame=0;sequencePlaying=files.length>1;sequenceStart=performance.now();meshVertexCount=meshFrames[0].count;
    const timeline=document.getElementById('timeline'),slider=document.getElementById('frameSlider');timeline.hidden=files.length===1;slider.max=files.length-1;document.getElementById('playSequence').textContent='Ⅱ';const fusion=document.getElementById('meshFusion');fusion.disabled=false;fusion.checked=true;setFusionMode(true);updateTimeline();
    const label=files.length>1?`${files[0].name} +${files.length-1}`:files[0].name;document.getElementById('importedObjects').innerHTML=`<button class="scene-item" data-object="mesh"><span class="shape-icon mesh"></span><span><strong>${label.replace(/[<>&]/g,'')}</strong><small>${files.length} frame${files.length>1?'s':''} · mesh cache</small></span><span class="visibility">●</span></button>`;bindSceneItems();selectObject('mesh');showToast(`已导入 ${files.length} 帧 · ${Math.round(meshVertexCount/3).toLocaleString()} 个三角形/当前帧`);
  }catch(error){showToast(`导入失败：${error.message}`,true);}
}
async function importGlb(file){
  pendingThreeFile=file;threeModelReady=false;state.meshVolumeReady=false;
  const fusion=document.getElementById('meshFusion');fusion.checked=true;fusion.disabled=true;setFusionMode(true);
  if(threeRenderer){threeRenderer.loadFile(file).then(()=>{threeModelReady=true;document.getElementById('renderStatus').textContent=webgpuRenderer?'Three.js PBR + WebGPU SDF':'Three.js PBR + SDF';showToast('Three.js 已载入原始 GLB 材质与动画');}).catch(error=>{const detail=String(error?.stack||error?.message||error);showToast(`Three.js 加载失败：${error.message}`,true);fetch(`/client-error?source=three-load&message=${encodeURIComponent(detail)}`).catch(()=>{});});}
  try{
    showToast(`正在用 Blender 转换 ${file.name}...`);document.getElementById('renderStatus').textContent='转换 GLB';
    const form=new FormData();form.append('file',file);const response=await fetch('/api/convert-glb',{method:'POST',body:form});const manifest=await response.json();if(!response.ok)throw new Error(manifest.error||'转换服务不可用');
    const converted=[];for(const url of manifest.frames){const frameResponse=await fetch(url);if(!frameResponse.ok)throw new Error('无法读取转换后的动画帧');converted.push(new File([await frameResponse.blob()],url.split('/').pop(),{type:'model/stl'}));}
    document.getElementById('sequenceFps').value=Math.max(1,Math.min(60,Math.round(manifest.fps||24)));await importFiles(converted);fusion.disabled=true;
    if(manifest.sdf){
      const resolveCacheUrl=name=>name&&name.startsWith('/')?name:manifest.frames[0].replace(/[^/]+$/,name||'mesh-material.bin');
      const size=manifest.sdf.resolution,sdfResponse=await fetch(resolveCacheUrl(manifest.sdf.url));
      if(!sdfResponse.ok)throw new Error('无法读取真实网格距离场');
      const values=new Float32Array(await sdfResponse.arrayBuffer());if(values.length!==size*size*size)throw new Error('距离场体素数量不正确');meshSdfData=values;
      meshSdfTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_3D,meshSdfTexture);const filter=gl.getExtension('OES_texture_float_linear')?gl.LINEAR:gl.NEAREST;gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MIN_FILTER,filter);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MAG_FILTER,filter);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_R,gl.CLAMP_TO_EDGE);gl.texImage3D(gl.TEXTURE_3D,0,gl.R32F,size,size,size,0,gl.RED,gl.FLOAT,values);state.objects.mesh.bounds=manifest.sdf.bounds;
      document.getElementById('fusionLabel').textContent='真实网格 SDF 融合';showToast('真实网格距离场已启用');
      try{const materialResponse=await fetch(resolveCacheUrl(manifest.sdf.materialUrl));if(!materialResponse.ok)throw new Error();const materials=new Uint8Array(await materialResponse.arrayBuffer());if(materials.length!==size*size*size*4)throw new Error();meshMaterialData=materials;meshMaterialTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_3D,meshMaterialTexture);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_R,gl.CLAMP_TO_EDGE);gl.texImage3D(gl.TEXTURE_3D,0,gl.RGBA8,size,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,materials);document.getElementById('fusionLabel').textContent='真实 SDF + 烘焙材质场';}catch{meshMaterialData=new Uint8Array(size*size*size*4);for(let i=0;i<meshMaterialData.length;i+=4){meshMaterialData[i]=143;meshMaterialData[i+1]=158;meshMaterialData[i+2]=173;meshMaterialData[i+3]=72;}showToast('真实 SDF 已启用，材质场暂时使用金属银',true);}if(webgpuRenderer)webgpuRenderer.setVolume(meshSdfData,meshMaterialData,size);threeRenderer?.setVolume?.(meshSdfData,meshMaterialData,size);state.meshVolumeReady=true;fusion.checked=true;fusion.disabled=false;setFusionMode(true);
    }
    document.getElementById('importedObjects').querySelector('strong').textContent=file.name.replace(/[<>&]/g,'');document.getElementById('importedObjects').querySelector('small').textContent=`${manifest.frames.length} frame${manifest.frames.length>1?'s':''} · GLB/Blender`;showToast(`GLB 已兼容：${manifest.frames.length} 帧动画缓存`);
  }catch(error){fusion.disabled=!meshSdfTexture;showToast(`GLB 导入失败：${error.message}`,true);}finally{document.getElementById('renderStatus').textContent=window.unifiedRendererActive?'Three.js · 统一深度 SDF':(threeModelReady?'Three.js PBR + SDF':(webgpuRenderer?'WebGPU 实时':'WebGL2 回退'));}
}
const input=document.getElementById('fileInput'),viewport=document.getElementById('viewport'),dropHint=document.getElementById('dropHint');
document.getElementById('importButton').addEventListener('click',()=>input.click());input.addEventListener('change',()=>{if(input.files.length)importFiles(input.files);input.value='';});
document.getElementById('playSequence').addEventListener('click',()=>{sequencePlaying=!sequencePlaying;if(sequencePlaying)sequenceStart=performance.now()-sequenceFrame/(Number(document.getElementById('sequenceFps').value)||24)*1000;document.getElementById('playSequence').textContent=sequencePlaying?'Ⅱ':'▶';});
document.getElementById('frameSlider').addEventListener('input',e=>{sequencePlaying=false;sequenceFrame=Number(e.target.value);document.getElementById('playSequence').textContent='▶';updateTimeline();});
viewport.addEventListener('dragover',e=>{e.preventDefault();dropHint.hidden=false;});viewport.addEventListener('dragleave',e=>{if(!viewport.contains(e.relatedTarget))dropHint.hidden=true;});viewport.addEventListener('drop',e=>{e.preventDefault();dropHint.hidden=true;if(e.dataTransfer.files.length)importFiles(e.dataTransfer.files);});
window.addEventListener('webgpu-stage',event=>{if(!window.unifiedRendererActive&&!threeModelReady)document.getElementById('renderStatus').textContent=`WebGPU · ${event.detail}`;});
window.addEventListener('webgpu-lost',event=>{webgpuRenderer=null;document.getElementById('viewport').classList.remove('webgpu-active');const status=document.getElementById('renderStatus');status.textContent='WebGL2 · WebGPU 设备已丢失';status.title=event.detail||'';showToast(`WebGPU 设备已丢失：${event.detail||'未知原因'}`,true);});
if(window.createWebGpuRenderer){window.createWebGpuRenderer(document.getElementById('gpuCanvas'),()=>state).then(renderer=>{if(!renderer){document.getElementById('renderStatus').textContent='WebGL2 · 无 WebGPU 适配器';return;}if(window.unifiedRendererActive){renderer.stop();return;}webgpuRenderer=renderer;if(meshSdfData&&meshMaterialData)renderer.setVolume(meshSdfData,meshMaterialData,Math.round(Math.cbrt(meshSdfData.length)));document.getElementById('viewport').classList.add('webgpu-active');document.getElementById('renderStatus').textContent=threeModelReady?'Three.js PBR + WebGPU SDF':'WebGPU 实时';}).catch(error=>{console.warn('WebGPU fallback:',error);const message=String(error?.message||error),status=document.getElementById('renderStatus');status.textContent=`WebGL2 · ${message.slice(0,72)}`;status.title=message;showToast(`WebGPU：${message}`,true);fetch(`/client-error?source=webgpu&message=${encodeURIComponent(message)}`).catch(()=>{});});}
async function initializeThree(){if(!window.createThreeRenderer||threeRenderer)return;try{threeRenderer=await window.createThreeRenderer(document.getElementById('threeCanvas'),()=>state);if(meshSdfData&&meshMaterialData)threeRenderer.setVolume(meshSdfData,meshMaterialData,Math.round(Math.cbrt(meshSdfData.length)));if(pendingThreeFile){await threeRenderer.loadFile(pendingThreeFile);threeModelReady=true;document.getElementById('renderStatus').textContent='Three.js 统一深度 + SDF';}}catch(error){console.warn('Three.js fallback:',error);const detail=String(error?.stack||error?.message||error);showToast(`Three.js 初始化失败：${error.message}`,true);fetch(`/client-error?source=three-init&message=${encodeURIComponent(detail)}`).catch(()=>{});}}
window.addEventListener('unified-renderer-ready',()=>{webgpuRenderer?.stop?.();webgpuRenderer=null;viewport.classList.remove('webgpu-active');});
window.addEventListener('three-module-ready',initializeThree);initializeThree();
requestAnimationFrame(render);
