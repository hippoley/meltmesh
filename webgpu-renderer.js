(function(){
const shader=`
struct Uniforms{
  resolution:vec2f,time:f32,blend:f32,
  camera:vec3f,_p0:f32,color:vec3f,roughness:f32,
  spherePos:vec3f,sphereScale:f32,boxPos:vec3f,boxScale:f32,
  meshPos:vec3f,meshScale:f32,meshBounds:vec3f,hasMesh:f32,
  boxSize:f32,radius:f32,specular:f32,hasMaterial:f32,
}
@group(0) @binding(0) var<uniform> u:Uniforms;
@group(0) @binding(1) var sdfTex:texture_3d<f32>;
@group(0) @binding(2) var materialTex:texture_3d<f32>;
@group(0) @binding(3) var materialSampler:sampler;
struct VOut{@builtin(position) position:vec4f,}
@vertex fn vs(@builtin(vertex_index) i:u32)->VOut{var p=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));var o:VOut;o.position=vec4f(p[i],0.0,1.0);return o;}
fn sdSphere(p:vec3f,r:f32)->f32{return length(p)-r;}
fn sdBox(p:vec3f,b:vec3f,r:f32)->f32{let q=abs(p)-b+r;return min(max(q.x,max(q.y,q.z)),0.0)+length(max(q,vec3f(0)))-r;}
fn smin(a:f32,b:f32,k:f32)->f32{let h=clamp(0.5+0.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}
fn meshUv(p:vec3f)->vec3f{return (p-u.meshPos)/u.meshScale/(u.meshBounds*2.0)+0.5;}
fn meshSdf(p:vec3f)->f32{let local=(p-u.meshPos)/u.meshScale;let q=abs(local)-u.meshBounds;let outside=length(max(q,vec3f(0.0)));if(max(q.x,max(q.y,q.z))>0.0){return outside*u.meshScale;}let uv=clamp(meshUv(p),vec3f(0.0),vec3f(0.999));let size=vec3f(textureDimensions(sdfTex,0));let cell=vec3i(uv*size);return textureLoad(sdfTex,cell,0).r*u.meshScale;}
fn primitiveSdf(p:vec3f)->f32{let a=sdSphere(p-u.spherePos,u.radius*u.sphereScale);let b=sdBox(p-u.boxPos,vec3f(u.boxSize,u.boxSize*0.82,u.boxSize*0.9)*u.boxScale,0.28*u.boxScale);return smin(a,b,max(u.blend,0.001));}
fn objectSdf(p:vec3f)->f32{let baseDist=primitiveSdf(p);if(u.hasMesh>0.5){return smin(baseDist,meshSdf(p),max(u.blend,0.001));}return baseDist;}
fn meshMaterialWeight(p:vec3f)->f32{let k=max(u.blend,0.001);return clamp(0.5+0.5*(primitiveSdf(p)-meshSdf(p))/k,0.0,1.0);}
  fn scene(p:vec3f)->vec2f{let o=objectSdf(p);let g=p.y+1.38;if(o<g){return vec2f(o,1.0);}return vec2f(g,2.0);}
fn normalAt(p:vec3f)->vec3f{let e=0.002;return normalize(vec3f(scene(p+vec3f(e,0.0,0.0)).x-scene(p-vec3f(e,0.0,0.0)).x,scene(p+vec3f(0.0,e,0.0)).x-scene(p-vec3f(0.0,e,0.0)).x,scene(p+vec3f(0.0,0.0,e)).x-scene(p-vec3f(0.0,0.0,e)).x));}
fn sky(rd:vec3f)->vec3f{let h=clamp(rd.y*0.5+0.5,0.0,1.0);return mix(vec3f(0.82,0.89,0.94),vec3f(1.0,0.99,0.94),h);}
@fragment fn fs(@builtin(position) pos:vec4f)->@location(0) vec4f{
  let uv=(2.0*pos.xy-u.resolution)/u.resolution.y;let ro=u.camera;let lookAt=vec3f(0.0,-0.05,0.0);let ww=normalize(lookAt-ro);let uu=normalize(cross(ww,vec3f(0.0,1.0,0.0)));let vv=cross(uu,ww);let rd=normalize(uu*uv.x+vv*uv.y+ww*1.75);
  var t=0.0;var id=0.0;for(var i=0;i<80;i++){let hit=scene(ro+rd*t);if(hit.x<0.002){id=hit.y;break;}t+=hit.x*0.7;if(t>30.0){break;}}
  var col=sky(rd);if(id>0.0){let p=ro+rd*t;let n=normalAt(p);let ld=normalize(vec3f(-0.65,0.85,-0.45));let diff=max(dot(n,ld),0.0);var albedo=u.color;var rough=u.roughness;
    if(id>1.5){let grid=i32(floor(p.x*2.0)+floor(p.z*2.0))%2;albedo=select(vec3f(0.78,0.81,0.80),vec3f(0.66,0.70,0.72),grid==1);col=albedo*(0.58+diff*0.42);}
    else{if(u.hasMesh>0.5&&u.hasMaterial>0.5){let w=meshMaterialWeight(p);let tc=clamp(meshUv(p),vec3f(0.001),vec3f(0.999));let mat=textureSampleLevel(materialTex,materialSampler,tc,0.0);albedo=mix(albedo,mat.rgb,w);rough=mix(rough,mat.a,w);}let viewDir=-rd;let halfDir=normalize(ld+viewDir);let noV=max(dot(n,viewDir),0.001);let noL=max(dot(n,ld),0.0);let noH=max(dot(n,halfDir),0.0);let voH=max(dot(viewDir,halfDir),0.0);let metalness=clamp(u.specular,0.0,1.0);rough=max(rough,0.08);let alpha=rough*rough;let alpha2=alpha*alpha;let denom=noH*noH*(alpha2-1.0)+1.0;let D=alpha2/max(3.14159265*denom*denom,0.0001);let k=(rough+1.0)*(rough+1.0)/8.0;let Gv=noV/(noV*(1.0-k)+k);let Gl=noL/(noL*(1.0-k)+k);let F0=mix(vec3f(0.04),albedo,metalness);let F=F0+(vec3f(1.0)-F0)*pow(1.0-voH,5.0);let specular=D*Gv*Gl*F/max(4.0*noV*noL,0.001);let diffuse=(vec3f(1.0)-F)*(1.0-metalness)*albedo/3.14159265;let reflection=sky(reflect(rd,n));let ambient=albedo*0.07*(1.0-metalness)+reflection*F*(0.35+0.65*(1.0-rough));col=ambient+(diffuse+specular)*vec3f(4.2,3.9,3.6)*noL;}
  }
  col=1.0-exp(-col*1.45);col=pow(col,vec3f(0.4545));return vec4f(col,1.0);
}`;
function padded(data,rowBytes,height,depth){const stride=Math.ceil(rowBytes/256)*256;if(stride===rowBytes)return{data,bytesPerRow:stride};const out=new Uint8Array(stride*height*depth),src=new Uint8Array(data.buffer,data.byteOffset,data.byteLength);for(let z=0;z<depth;z++)for(let y=0;y<height;y++){const s=(z*height+y)*rowBytes,d=(z*height+y)*stride;out.set(src.subarray(s,s+rowBytes),d);}return{data:out,bytesPerRow:stride};}
window.createWebGpuRenderer=async function(canvas,getState){
  const report=stage=>window.dispatchEvent(new CustomEvent('webgpu-stage',{detail:stage}));
  if(!navigator.gpu)return null;report('请求适配器');const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)return null;
  report('创建设备');const device=await adapter.requestDevice();device.pushErrorScope('validation');const context=canvas.getContext('webgpu');if(!context)throw new Error('[canvas] 无法创建 WebGPU context');const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
  report('编译 WGSL');const module=device.createShaderModule({code:shader});const info=await module.getCompilationInfo();if(info.messages.some(m=>m.type==='error'))throw new Error(info.messages.map(m=>`[WGSL ${m.lineNum}:${m.linePos}] ${m.message}`).join('\n'));
  const groupLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'unfilterable-float',viewDimension:'3d'}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float',viewDimension:'3d'}},{binding:3,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}}]});
  report('创建 Pipeline');const pipeline=await device.createRenderPipelineAsync({layout:device.createPipelineLayout({bindGroupLayouts:[groupLayout]}),vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});const uniform=device.createBuffer({size:128,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  let sdf=device.createTexture({size:[1,1,1],dimension:'3d',format:'r32float',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}),material=device.createTexture({size:[1,1,1],dimension:'3d',format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});device.queue.writeTexture({texture:sdf},new Float32Array([1]),{},[1,1,1]);device.queue.writeTexture({texture:material},new Uint8Array([255,80,140,128]),{},[1,1,1]);let group;
  const materialFiltering=device.createSampler({magFilter:'linear',minFilter:'linear'});const rebuild=()=>group=device.createBindGroup({layout:groupLayout,entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:sdf.createView({dimension:'3d'})},{binding:2,resource:material.createView({dimension:'3d'})},{binding:3,resource:materialFiltering}]});rebuild();let hasVolume=false,hasMaterial=false,running=true;
  function resize(){const dpr=Math.min(devicePixelRatio||1,1.75),w=Math.max(1,Math.round(canvas.clientWidth*dpr)),h=Math.max(1,Math.round(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}return[w,h];}
  const validationError=await device.popErrorScope();if(validationError)throw new Error(`[validation] ${validationError.message}`);device.lost.then(info=>{running=false;window.dispatchEvent(new CustomEvent('webgpu-lost',{detail:info.message||info.reason}));});
  function frame(now){if(!running)return;const s=getState(),size=resize(),cp=Math.cos(s.pitch),cam=[Math.sin(s.yaw)*cp*s.distance,Math.sin(s.pitch)*s.distance,Math.cos(s.yaw)*cp*s.distance],v=new Float32Array(32),boxPosition=s.objects.box.visible===false?[999,999,999]:s.objects.box.position;v.set(size,0);v[2]=now/1000;v[3]=s.blend;v.set(cam,4);v.set(s.color,8);v[11]=s.roughness;v.set(s.objects.sphere.position,12);v[15]=s.objects.sphere.scale;v.set(boxPosition,16);v[19]=s.objects.box.scale;v.set(s.objects.mesh.position,20);v[23]=s.objects.mesh.scale;v.set(s.objects.mesh.bounds,24);v[27]=s.meshFusion&&hasVolume?1:0;v[28]=s.boxSize;v[29]=s.radius;v[30]=s.specular;v[31]=hasMaterial?1:0;device.queue.writeBuffer(uniform,0,v);const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:.86,g:.9,b:.92,a:1},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);requestAnimationFrame(frame);}report('首帧就绪');requestAnimationFrame(frame);
  return{device,stop(){running=false;},setVolume(sdfData,materialData,size){sdf.destroy();material.destroy();sdf=device.createTexture({size:[size,size,size],dimension:'3d',format:'r32float',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});material=device.createTexture({size:[size,size,size],dimension:'3d',format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});const sd=padded(sdfData,size*4,size,size),md=padded(materialData,size*4,size,size);device.queue.writeTexture({texture:sdf},sd.data,{bytesPerRow:sd.bytesPerRow,rowsPerImage:size},[size,size,size]);device.queue.writeTexture({texture:material},md.data,{bytesPerRow:md.bytesPerRow,rowsPerImage:size},[size,size,size]);hasVolume=true;hasMaterial=!!materialData;rebuild();}};
};
})();
