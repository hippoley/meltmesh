import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = (id) => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
const cloneData = (v) => JSON.parse(JSON.stringify(v));

const ui = {
  stage: $('stage'),
  canvas: $('scene'),
  frameOverlay: $('frameOverlay'),
  status: $('status'),
  loading: $('loading'),
  error: $('error'),
  top: $('topView'),
  side: $('sideView'),
  shots: $('shots'),
  targets: $('targets'),
  targetMeta: $('targetMeta'),
  points: $('points'),
  segments: $('segments'),
  duration: $('duration'),
  speed: $('speed'),
  speedLabel: $('speedLabel'),
  accelIn: $('accelIn'),
  brakeOut: $('brakeOut'),
  durationVal: $('durationVal'),
  speedVal: $('speedVal'),
  accelInVal: $('accelInVal'),
  brakeOutVal: $('brakeOutVal'),
  segmentSummary: $('segmentSummary'),
  addPoint: $('addPoint'),
  deletePoint: $('deletePoint'),
  play: $('play'),
  playSequence: $('playSequence'),
  loop: $('loop'),
  origin: $('origin'),
  reset: $('reset'),
  timeline: $('timeline'),
  readout: $('readout'),
  totalReadout: $('totalReadout'),
  importGlb: $('importGlb'),
  importGlbInput: $('importGlbInput'),
  homeView: $('homeView'),
  qApply: $('qApply'),
  qHorizontal: $('qHorizontal'),
  qPan: $('qPan'),
  qVertical: $('qVertical'),
  qTilt: $('qTilt'),
  qZoom: $('qZoom'),
  qRotate: $('qRotate'),
  qReset: $('qReset'),
  heightHint: $('heightHint'),
  motionUI: $('motionUI'),
  nextFrame: $('nextFrame'),
  frameResize: $('frameResize'),
  frameRotate: $('frameRotate'),
  ribbonHandle: $('ribbonHandle'),
  ghostFrames: [$('ghost1'),$('ghost2'),$('ghost3')],
  motionApply: $('motionApply'),
  motionReset: $('motionReset'),
  advancedDrawer: $('advancedDrawer'),
  advancedToggle: $('advancedToggle'),
  advancedClose: $('advancedClose'),
  stabilizePath: $('stabilizePath')
};

function setAdvancedOpen(open){
  if(!ui.advancedDrawer)return;
  ui.advancedDrawer.classList.toggle('open',open);
  ui.advancedDrawer.setAttribute('aria-hidden',open?'false':'true');
  ui.advancedToggle?.setAttribute('aria-expanded',open?'true':'false');
}
ui.advancedToggle?.addEventListener('click',()=>{
  setAdvancedOpen(!ui.advancedDrawer?.classList.contains('open'));
});
ui.advancedClose?.addEventListener('click',()=>setAdvancedOpen(false));
window.addEventListener('keydown',e=>{
  if(e.key==='Escape' && ui.advancedDrawer?.classList.contains('open')){
    setAdvancedOpen(false);
  }
});

const renderer = new THREE.WebGLRenderer({
  canvas: ui.canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x171419);
scene.fog = new THREE.Fog(0x171419, 12, 30);

const camera = new THREE.PerspectiveCamera(52, 1, 0.05, 80);
camera.position.set(0, 2.1, 8.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.target.set(0, 1.2, 0);
controls.minDistance = 1.2;
controls.maxDistance = 18;
controls.maxPolarAngle = Math.PI * 0.49;
let navigationMode = false;
controls.enabled = false;
function syncNavigationMode(){
  controls.enabled = navigationMode && !playing;
  ui.stage?.classList.toggle('navigate',navigationMode);
  if(ui.homeView){
    ui.homeView.classList.toggle('active',navigationMode);
    ui.homeView.textContent = navigationMode ? 'Done' : 'Navigate';
  }
}

const topCtx = ui.top.getContext('2d');
const sideCtx = ui.side.getContext('2d');
const frameCtx = ui.frameOverlay.getContext('2d');

const room = new THREE.Group();
room.name = 'Demo Living Room';
scene.add(room);

const targetDefs = {};
const targetPickMeshes = [];
let importedRoot = null;

function std(color, rough=.75, metal=.02){
  return new THREE.MeshStandardMaterial({color, roughness:rough, metalness:metal});
}
function addMesh(parent, geo, mat, position, rotation=[0,0,0], cast=true, receive=true, targetId=null){
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...position);
  m.rotation.set(...rotation);
  m.castShadow = cast;
  m.receiveShadow = receive;
  if(targetId){
    m.userData.targetId = targetId;
    targetPickMeshes.push(m);
  }
  parent.add(m);
  return m;
}
function box(parent, size, position, mat, targetId=null, rotation=[0,0,0]){
  return addMesh(parent, new THREE.BoxGeometry(...size), mat, position, rotation, true, true, targetId);
}
function registerTarget(id, label, pos){
  targetDefs[id] = {id,label,position:new THREE.Vector3(...pos)};
}
function buildRoom(){
  const floorMat = std(0x755d4a,.72,.04);
  const wallMat = std(0xe5dfd7,.9,0);
  const trimMat = std(0xc9c1b8,.8,0);
  const darkMat = std(0x242127,.56,.08);
  const sofaMat = std(0x8d8790,.88,0);
  const cushionMat = std(0xb9b2bb,.95,0);
  const woodMat = std(0x6b4932,.7,.02);
  const brassMat = std(0x9d7944,.38,.55);

  addMesh(room, new THREE.PlaneGeometry(10,10), floorMat, [0,0,0], [-Math.PI/2,0,0], false, true);
  box(room,[10,.08,.18],[0,.05,-5],trimMat);
  box(room,[10,3.25,.16],[0,1.625,-5.08],wallMat);
  box(room,[.16,3.25,10],[-5.08,1.625,0],wallMat);
  box(room,[.16,3.25,5.6],[5.08,1.625,-2.2],wallMat);

  // Rug
  const rugMat = new THREE.MeshStandardMaterial({color:0x8c756e,roughness:1});
  addMesh(room,new THREE.PlaneGeometry(4.7,3.2),rugMat,[.2,.014,1.0],[-Math.PI/2,0,0],false,true);

  // Window + outdoor card
  const window = new THREE.Group();
  window.position.set(-3.35,1.7,-4.95);
  window.userData.targetId='window';
  room.add(window);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.55,1.75),new THREE.MeshPhysicalMaterial({
    color:0x93b9cf,transparent:true,opacity:.42,roughness:.08,metalness:0,transmission:.25
  }));
  glass.position.z=.02;
  glass.userData.targetId='window';
  targetPickMeshes.push(glass);
  window.add(glass);
  const frameMat = std(0x2c292d,.55,.12);
  box(window,[2.75,.08,.08],[0,.91,.06],frameMat,'window');
  box(window,[2.75,.08,.08],[0,-.91,.06],frameMat,'window');
  box(window,[.08,1.9,.08],[-1.38,0,.06],frameMat,'window');
  box(window,[.08,1.9,.08],[1.38,0,.06],frameMat,'window');
  box(window,[.055,1.75,.08],[0,0,.06],frameMat,'window');
  const outdoors = new THREE.Mesh(new THREE.PlaneGeometry(4.4,2.7),new THREE.MeshBasicMaterial({color:0x7c9a83}));
  outdoors.position.set(0,0,-.3);
  window.add(outdoors);
  registerTarget('window','Window',[-3.35,1.7,-4.82]);

  // Sofa
  const sofa = new THREE.Group();
  sofa.position.set(-.25,0,0);
  room.add(sofa);
  box(sofa,[3.25,.38,1.25],[0,.35,0],sofaMat,'sofa');
  box(sofa,[3.25,.92,.28],[0,.88,-.50],sofaMat,'sofa',[-.10,0,0]);
  box(sofa,[.34,.72,1.25],[-1.47,.62,0],sofaMat,'sofa');
  box(sofa,[.34,.72,1.25],[1.47,.62,0],sofaMat,'sofa');
  [-.85,0,.85].forEach(x=>box(sofa,[.78,.18,.98],[x,.63,.04],cushionMat,'sofa'));
  [-1.18,1.18].forEach(x=>box(sofa,[.11,.16,.11],[x,.12,-.38],darkMat));
  registerTarget('sofa','Sofa',[-.25,1.0,-.15]);

  // Coffee table
  const table = new THREE.Group(); table.position.set(.2,0,2); room.add(table);
  box(table,[2.15,.13,1.05],[0,.62,0],woodMat,'table');
  [-.86,.86].forEach(x=>[-.38,.38].forEach(z=>box(table,[.10,.58,.10],[x,.30,z],darkMat,'table')));
  registerTarget('table','Coffee table',[.2,.66,2]);

  // TV cabinet + screen
  const cabinet = new THREE.Group(); cabinet.position.set(3.25,0,-2.45); cabinet.rotation.y=-Math.PI/2; room.add(cabinet);
  box(cabinet,[2.5,.62,.48],[0,.32,0],woodMat,'cabinet');
  box(cabinet,[2.05,1.18,.08],[0,1.35,-.02],darkMat,'cabinet');
  const screenMat = new THREE.MeshStandardMaterial({color:0x111218,roughness:.3,metalness:.12,emissive:0x07090d,emissiveIntensity:.65});
  box(cabinet,[1.88,1.02,.035],[0,1.35,-.075],screenMat,'cabinet');
  registerTarget('cabinet','TV / cabinet',[3.25,1.25,-2.45]);

  // Plant
  const plant = new THREE.Group(); plant.position.set(-3.25,0,1.85); room.add(plant);
  addMesh(plant,new THREE.CylinderGeometry(.37,.48,.58,24),std(0x665449,.84,0),[0,.29,0],undefined,true,true,'plant');
  addMesh(plant,new THREE.CylinderGeometry(.045,.055,1.38,12),std(0x4d3726,.9,0),[0,1.18,0],undefined,true,true,'plant');
  const leafMat=std(0x3e6d4b,.83,0);
  [[-.30,1.35,0],[.28,1.55,.05],[-.18,1.82,-.1],[.18,1.95,.08],[.03,1.65,.25]].forEach((p,i)=>{
    const leaf=addMesh(plant,new THREE.SphereGeometry(.34,18,12),leafMat,p,undefined,true,true,'plant');
    leaf.scale.set(1,.5,.65); leaf.rotation.z=(i%2?1:-1)*.48;
  });
  registerTarget('plant','Plant',[-3.25,1.35,1.85]);

  // Floor lamp
  const lamp = new THREE.Group(); lamp.position.set(2.75,0,1.8); room.add(lamp);
  addMesh(lamp,new THREE.CylinderGeometry(.07,.09,2.2,16),brassMat,[0,1.1,0]);
  addMesh(lamp,new THREE.CylinderGeometry(.35,.48,.62,24,1,true),new THREE.MeshStandardMaterial({color:0xe9d7bd,roughness:.75,side:THREE.DoubleSide}),[0,2.18,0]);
  const bulb=new THREE.PointLight(0xffd7a5,26,5.5,2);bulb.position.set(0,2.05,0);bulb.castShadow=true;lamp.add(bulb);

  // Ceiling pendant
  addMesh(room,new THREE.CylinderGeometry(.04,.04,1.1,12),darkMat,[0,2.72,-.2]);
  addMesh(room,new THREE.CylinderGeometry(.33,.52,.46,24,1,true),new THREE.MeshStandardMaterial({color:0xd7c4aa,roughness:.72,side:THREE.DoubleSide}),[0,2.05,-.2]);
  const pendant=new THREE.PointLight(0xffe4c1,34,7,2);pendant.position.set(0,1.98,-.2);pendant.castShadow=true;room.add(pendant);

  // Room target
  registerTarget('room','Room center',[0,1.25,-.45]);

  // Lighting
  const hemi=new THREE.HemisphereLight(0xc7d9f0,0x5a4437,1.35);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffefd7,2.8);sun.position.set(-2.5,6.8,5.5);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;scene.add(sun);

  // Small visual target anchors
  Object.values(targetDefs).forEach(def=>{
    const g=new THREE.Group();g.name='anchor-'+def.id;g.position.copy(def.position);scene.add(g);def.marker=g;
    const sph=new THREE.Mesh(new THREE.SphereGeometry(.055,14,10),new THREE.MeshBasicMaterial({color:0xffffff}));
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.16,.012,8,32),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.7}));
    ring.rotation.x=Math.PI/2;g.add(sph,ring);g.visible=false;
  });
}
buildRoom();

const defaultShots = [
  {
    id:'establish', name:'01 · Establish', targetId:'room',
    points:[[0,2.15,8.1],[-1.8,2.0,6.5],[-2.2,2.1,4.2],[-.7,1.85,2.9]],
    segments:[
      {duration:2.0,speed:.85,accelIn:7,brakeOut:2},
      {duration:1.8,speed:1.0,accelIn:2,brakeOut:2},
      {duration:2.1,speed:.85,accelIn:2,brakeOut:8}
    ]
  },
  {
    id:'sofaPush', name:'02 · Sofa push', targetId:'sofa',
    points:[[2.6,1.75,6.7],[1.6,1.68,5.25],[.85,1.58,3.8],[.45,1.48,2.75]],
    segments:[
      {duration:1.4,speed:1,accelIn:6,brakeOut:1},
      {duration:1.4,speed:1.1,accelIn:2,brakeOut:2},
      {duration:1.7,speed:.85,accelIn:1,brakeOut:9}
    ]
  },
  {
    id:'windowArc', name:'03 · Window arc', targetId:'window',
    points:[[1.6,2.0,3.6],[.2,2.1,2.1],[-1.7,2.05,.8],[-3.0,1.85,-.35]],
    segments:[
      {duration:1.6,speed:.95,accelIn:6,brakeOut:1},
      {duration:1.6,speed:1.05,accelIn:1,brakeOut:1},
      {duration:1.8,speed:.9,accelIn:1,brakeOut:8}
    ]
  },
  {
    id:'cabinetReveal', name:'04 · Cabinet reveal', targetId:'cabinet',
    points:[[-1.8,1.45,4.7],[-.2,1.55,3.5],[1.35,1.65,2.2],[2.55,1.72,.5]],
    segments:[
      {duration:1.5,speed:1,accelIn:5,brakeOut:2},
      {duration:1.5,speed:1.1,accelIn:1,brakeOut:2},
      {duration:2.0,speed:.85,accelIn:1,brakeOut:8}
    ]
  }
];

let shots = cloneData(defaultShots);
let currentShotIndex = 0;
let selectedPoint = 0;
let selectedSegment = 0;
let playhead = 0;
let playing = false;
let playbackMode = 'shot';
let looping = false;
let sequenceIndex = 0;
let lastTs = performance.now();
let drag = null;
let pointerDown = null;

function shot(){ return shots[currentShotIndex]; }
function targetFor(s=shot()){
  const def=targetDefs[s.targetId] || targetDefs.room;
  const out=def.position.clone();
  if(Array.isArray(s.lookOffset)) out.add(new THREE.Vector3(...s.lookOffset));
  return out;
}
function relabelPoints(s=shot()){
  s.pointLabels = s.points.map((_,i)=>String.fromCharCode(65+i));
}
shots.forEach(relabelPoints);

function effectiveDuration(seg){ return seg.duration / Math.max(.05,seg.speed); }
function shotDuration(s=shot()){ return s.segments.reduce((sum,x)=>sum+effectiveDuration(x),0); }
function totalSequenceDuration(){ return shots.reduce((sum,s)=>sum+shotDuration(s),0); }

function harmonicMean(a,b){
  if(a<=0 || b<=0) return Math.max(a,b,0);
  return 2*a*b/(a+b);
}
function nominalParamRate(seg){
  return 1/Math.max(.001,effectiveDuration(seg));
}
function knotParamRate(s,knotIndex){
  const lastKnot=s.points.length-1;

  // Only the beginning and end of an entire shot are allowed to approach a stop.
  if(knotIndex<=0){
    const seg=s.segments[0],base=nominalParamRate(seg);
    return base*(1-.95*clamp(seg.accelIn/10,0,1));
  }
  if(knotIndex>=lastKnot){
    const seg=s.segments[s.segments.length-1],base=nominalParamRate(seg);
    return base*(1-.95*clamp(seg.brakeOut/10,0,1));
  }

  const prev=s.segments[knotIndex-1],next=s.segments[knotIndex];
  const prevBase=nominalParamRate(prev),nextBase=nominalParamRate(next);

  // The authored brake/acceleration values still shape the junction,
  // but an interior waypoint is a pass-through point, not an implicit stop.
  const prevWish=prevBase*(1-.72*clamp(prev.brakeOut/10,0,1));
  const nextWish=nextBase*(1-.72*clamp(next.accelIn/10,0,1));
  const blended=harmonicMean(prevWish,nextWish);

  // Guarantee visible flow through the node even when both adjacent controls are strong.
  // An explicit Hold/Stop feature can be added separately when a real stop is desired.
  const floor=.42*Math.min(prevBase,nextBase);
  const ceiling=1.65*Math.max(prevBase,nextBase);
  return clamp(blended,floor,ceiling);
}
function smoothSegmentWarp(s,segmentIndex,t){
  const seg=s.segments[segmentIndex],d=effectiveDuration(seg);
  let m0=d*knotParamRate(s,segmentIndex);
  let m1=d*knotParamRate(s,segmentIndex+1);

  // Cubic Hermite time law. Matching knot rates on both sides gives C1 camera velocity.
  // Keep the normalized curve monotone even with very different neighboring speeds.
  m0=Math.max(0,m0);m1=Math.max(0,m1);
  const sum=m0+m1;
  if(sum>3){const scale=3/sum;m0*=scale;m1*=scale}

  const t2=t*t,t3=t2*t;
  const u=(t3-2*t2+t)*m0+(-2*t3+3*t2)+(t3-t2)*m1;
  return clamp(u,0,1);
}
function catmull(p0,p1,p2,p3,t){
  const t2=t*t,t3=t2*t;
  return [0,1,2].map(k=>.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3));
}
function posOnSegment(s,i,t){
  const pts=s.points;
  const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
  return catmull(p0,p1,p2,p3,t);
}
function segmentAtTime(s,time){
  let cursor=0;
  for(let i=0;i<s.segments.length;i++){
    const d=effectiveDuration(s.segments[i]);
    if(time<=cursor+d || i===s.segments.length-1){
      return {i,local:clamp((time-cursor)/Math.max(.001,d),0,1),cursor,d};
    }
    cursor+=d;
  }
  return {i:s.segments.length-1,local:1,cursor:0,d:1};
}
function cameraStateAt(s,time){
  const hit=segmentAtTime(s,clamp(time,0,shotDuration(s)));
  const u=smoothSegmentWarp(s,hit.i,hit.local);
  const p=posOnSegment(s,hit.i,u);
  return {position:new THREE.Vector3(...p), target:targetFor(s).clone(), roll:s.roll||0, segment:hit.i, u};
}
function samplePath(s=shot(),count=180){
  const total=shotDuration(s),arr=[];
  for(let i=0;i<=count;i++) arr.push(cameraStateAt(s,total*i/count));
  return arr;
}
function applyCameraState(state){
  camera.position.copy(state.position);
  camera.lookAt(state.target);
  controls.target.copy(state.target);
  controls.update();
  if(state.roll) camera.rotateZ(state.roll);
}

function setTargetMarker(){
  Object.values(targetDefs).forEach(x=>{if(x.marker)x.marker.visible=false});
  const def=targetDefs[shot().targetId];
  if(def?.marker) def.marker.visible=true;
}
function setStatus(text){ ui.status.textContent=text; }

function stopPlayback(){
  playing=false;
  ui.play.textContent='▶ Play';
  const q=$('quickPlay'); if(q) q.textContent='▶ Preview shot';
  syncNavigationMode();
}
function switchShot(index,snap=true){
  stopPlayback();
  currentShotIndex=clamp(index,0,shots.length-1);
  selectedPoint=0;selectedSegment=0;playhead=0;
  setTargetMarker();
  refreshUI();
  if(snap) applyCameraState(cameraStateAt(shot(),0));
  resetMotionGesture();
  setStatus('SHOT · '+shot().name.toUpperCase());
}

function renderShots(){
  ui.shots.innerHTML='';
  shots.forEach((s,i)=>{
    const o=document.createElement('option');
    o.value=String(i);
    o.textContent=s.name+' · '+(targetDefs[s.targetId]?.label||'Target')+' · '+shotDuration(s).toFixed(1)+'s';
    o.selected=i===currentShotIndex;
    ui.shots.appendChild(o);
  });
  ui.shots.onchange=()=>switchShot(+ui.shots.value,true);
}
function renderTargets(){
  ui.targets.innerHTML='';
  Object.values(targetDefs).forEach(def=>{
    const o=document.createElement('option');
    o.value=def.id;
    o.textContent=def.label;
    o.selected=shot().targetId===def.id;
    ui.targets.appendChild(o);
  });
  ui.targets.onchange=()=>{
    const def=targetDefs[ui.targets.value];
    if(!def)return;
    shot().targetId=def.id;
    setTargetMarker();
    refreshUI();
    applyCameraState(cameraStateAt(shot(),playhead));
    setStatus('TARGET · '+def.label.toUpperCase());
  };
  const def=targetDefs[shot().targetId];
  ui.targetMeta.textContent='Click an object in 3D to refocus · ['+def.position.toArray().map(v=>v.toFixed(2)).join(', ')+']';
}
function renderPoints(){
  ui.points.innerHTML='';
  shot().points.forEach((p,i)=>{
    const b=document.createElement('button');
    b.type='button'; b.className='point-card'+(i===selectedPoint?' active':'');
    b.innerHTML='<strong>'+shot().pointLabels[i]+'</strong><small>'+p.map(v=>v.toFixed(1)).join(', ')+'</small>';
    b.addEventListener('click',()=>{selectedPoint=i;selectedSegment=Math.min(i,shot().segments.length-1);refreshUI()});
    ui.points.appendChild(b);
  });
  ui.deletePoint.disabled=shot().points.length<=2;
}
function renderSegments(){
  ui.segments.innerHTML='';
  shot().segments.forEach((seg,i)=>{
    const o=document.createElement('option');
    o.value=String(i);
    o.textContent=shot().pointLabels[i]+' → '+shot().pointLabels[i+1]+' · '+effectiveDuration(seg).toFixed(2)+'s';
    o.selected=i===selectedSegment;
    ui.segments.appendChild(o);
  });
  ui.segments.onchange=()=>{
    selectedSegment=+ui.segments.value;
    selectedPoint=selectedSegment;
    refreshUI();
  };
}
function setRangePos(el,min,max){
  const p=((+el.value-min)/(max-min))*100;
  el.style.setProperty('--pos',clamp(p,0,100).toFixed(2)+'%');
}
function renderTiming(){
  const seg=shot().segments[selectedSegment];
  ui.duration.value=seg.duration;ui.speed.value=seg.speed;ui.accelIn.value=seg.accelIn;ui.brakeOut.value=seg.brakeOut;
  setRangePos(ui.duration,.5,8);setRangePos(ui.speed,.25,3);setRangePos(ui.accelIn,0,10);setRangePos(ui.brakeOut,0,10);
  ui.durationVal.textContent=seg.duration.toFixed(1)+' s';
  ui.speedVal.textContent=seg.speed.toFixed(2)+'×';
  if(ui.speedLabel) ui.speedLabel.textContent='Speed '+shot().pointLabels[selectedSegment]+'→'+shot().pointLabels[selectedSegment+1];
  ui.accelInVal.textContent=seg.accelIn.toFixed(1);
  ui.brakeOutVal.textContent=seg.brakeOut.toFixed(1);
  ui.segmentSummary.textContent='Smooth junction · '+effectiveDuration(seg).toFixed(2)+'s';
}
function refreshTimeline(){
  const total=shotDuration();
  ui.timeline.max=total;
  if(playhead>total)playhead=total;
  ui.timeline.value=playhead;
  ui.readout.textContent=playhead.toFixed(2)+' s';
  ui.totalReadout.textContent=total.toFixed(2)+' s';
}
function refreshUI(){
  renderShots();renderTargets();renderPoints();renderSegments();renderTiming();refreshTimeline();
}

function setSegment(prop,value){
  shot().segments[selectedSegment][prop]=+value;
  renderTiming();renderShots();refreshTimeline();
  setStatus('SEGMENT · '+shot().pointLabels[selectedSegment]+'→'+shot().pointLabels[selectedSegment+1]);
}
ui.duration.addEventListener('input',e=>setSegment('duration',e.target.value));
ui.speed.addEventListener('input',e=>setSegment('speed',e.target.value));
ui.accelIn.addEventListener('input',e=>setSegment('accelIn',e.target.value));
ui.brakeOut.addEventListener('input',e=>setSegment('brakeOut',e.target.value));

function pointDistance(a,b){
  return Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
}
function autoHeightForXY(s,x,z){
  const n=s.points.length,last=s.points[n-1];
  if(n<2) return last?.[1]??1.7;
  const prev=s.points[n-2];
  const prevHorizontal=Math.hypot(last[0]-prev[0],last[2]-prev[2]);
  const nextHorizontal=Math.hypot(x-last[0],z-last[2]);
  if(prevHorizontal<.15) return last[1];
  const slope=(last[1]-prev[1])/prevHorizontal;
  return clamp(last[1]+slope*nextHorizontal,.65,3.3);
}
function appendPathPoint(s,p){
  const n=s.points.length;
  const previousSegment=s.segments[s.segments.length-1] || {duration:1.8,speed:1,accelIn:3,brakeOut:3};
  const nextPoint=[
    clamp(p[0],-5.2,5.2),
    clamp(p[1],.35,3.7),
    clamp(p[2],-5.2,7.8)
  ];

  // Preserve perceived travel speed automatically when the new leg is longer or shorter.
  let worldSpeed=1.2;
  if(n>=2 && s.segments.length){
    const previousDistance=pointDistance(s.points[n-2],s.points[n-1]);
    const previousTime=effectiveDuration(previousSegment);
    if(previousDistance>.05 && previousTime>.05) worldSpeed=previousDistance/previousTime;
  }
  const newDistance=pointDistance(s.points[n-1],nextPoint);
  const inheritedSpeed=previousSegment.speed || 1;
  const autoDuration=clamp((newDistance/Math.max(.3,worldSpeed))*inheritedSpeed,.5,8);

  s.points.push(nextPoint);
  s.segments.push({
    ...previousSegment,
    duration:autoDuration,
    speed:inheritedSpeed
  });
  relabelPoints(s);
  selectedPoint=s.points.length-1;
  selectedSegment=s.segments.length-1;
  refreshUI();
  setStatus('NEXT · '+s.pointLabels[selectedPoint-1]+'→'+s.pointLabels[selectedPoint]);
}
function nextContinuationPoint(s){
  const n=s.points.length,last=s.points[n-1],prev=s.points[Math.max(0,n-2)];
  let dx=last[0]-prev[0],dy=last[1]-prev[1],dz=last[2]-prev[2];
  const horizontal=Math.hypot(dx,dz);
  if(horizontal<.2){dx=.9;dz=-1.5;dy=0}
  return [last[0]+dx,last[1]+dy,last[2]+dz];
}
ui.addPoint.addEventListener('click',()=>{
  stopPlayback();
  const s=shot();
  appendPathPoint(s,nextContinuationPoint(s));
});
ui.deletePoint.addEventListener('click',()=>{
  if(shot().points.length<=2)return;
  stopPlayback();const s=shot();s.points.splice(selectedPoint,1);
  if(selectedPoint<s.segments.length)s.segments.splice(selectedPoint,1);else s.segments.pop();
  while(s.segments.length<s.points.length-1)s.segments.push({duration:1.8,speed:1,accelIn:5,brakeOut:5});
  relabelPoints(s);selectedPoint=clamp(selectedPoint,0,s.points.length-1);selectedSegment=clamp(Math.min(selectedPoint,s.segments.length-1),0,s.segments.length-1);refreshUI();setStatus('POINT DELETED');
});

function stabilizeCurrentPath(){
  const s=shot();
  if(!s || s.points.length<3 || s.segments.length<2){
    setStatus('STABILIZE · NEED MORE PATH');
    return;
  }

  stopPlayback();
  const totalBefore=shotDuration(s);
  const progress=totalBefore>0?clamp(playhead/totalBefore,0,1):1;
  const originalPoints=cloneData(s.points);
  const originalSegments=cloneData(s.segments);

  // One conservative Laplacian pass: remove local hand jitter without
  // noticeably changing the authored route or either endpoint.
  const nextPoints=cloneData(s.points);
  let moved=0;
  for(let i=1;i<s.points.length-1;i++){
    const prev=new THREE.Vector3(...originalPoints[i-1]);
    const curr=new THREE.Vector3(...originalPoints[i]);
    const next=new THREE.Vector3(...originalPoints[i+1]);
    const midpoint=prev.clone().add(next).multiplyScalar(.5);
    const delta=midpoint.sub(curr).multiplyScalar(.18);

    const localScale=Math.min(
      prev.distanceTo(curr),
      curr.distanceTo(next)
    );
    const maxShift=Math.min(.12,Math.max(.025,localScale*.10));
    if(delta.length()>maxShift)delta.setLength(maxShift);
    delta.y*=.82;

    const p=curr.add(delta);
    p.x=clamp(p.x,-5.2,5.2);
    p.y=clamp(p.y,.35,3.7);
    p.z=clamp(p.z,-5.2,7.8);
    nextPoints[i]=p.toArray();
    moved=Math.max(moved,delta.length());
  }
  s.points=nextPoints;

  // Smooth local timing a little as well. Preserve overall shot duration so
  // stabilization does not unexpectedly make the shot faster or slower.
  const effective=originalSegments.map(effectiveDuration);
  const softened=effective.map((v,i)=>{
    if(i===0 || i===effective.length-1)return v;
    const neighbor=(effective[i-1]+v+effective[i+1])/3;
    return mix(v,neighbor,.24);
  });
  const sumSoft=softened.reduce((a,b)=>a+b,0)||1;
  const durationScale=totalBefore/sumSoft;

  s.segments.forEach((seg,i)=>{
    const targetEffective=softened[i]*durationScale;
    seg.duration=clamp(targetEffective*Math.max(.05,seg.speed),.07,8);

    // Interior joins should flow through instead of visibly braking/restarting.
    if(i>0)seg.accelIn=mix(seg.accelIn,Math.min(seg.accelIn,1.25),.35);
    if(i<s.segments.length-1)seg.brakeOut=mix(seg.brakeOut,Math.min(seg.brakeOut,1.25),.35);
  });

  s._lastStabilizeBackup={points:originalPoints,segments:originalSegments};
  relabelPoints(s);
  const totalAfter=shotDuration(s);
  playhead=totalAfter*progress;
  selectedPoint=clamp(selectedPoint,0,s.points.length-1);
  selectedSegment=clamp(selectedSegment,0,s.segments.length-1);
  refreshUI();
  applyCameraState(cameraStateAt(s,playhead));
  refreshTimeline();

  ui.stabilizePath?.classList.remove('done');
  requestAnimationFrame(()=>ui.stabilizePath?.classList.add('done'));
  setTimeout(()=>ui.stabilizePath?.classList.remove('done'),520);
  setStatus('STABILIZED · LIGHT '+Math.round(moved*100)+'cm');
}
ui.stabilizePath?.addEventListener('click',stabilizeCurrentPath);

ui.origin.addEventListener('click',()=>{stopPlayback();playhead=0;applyCameraState(cameraStateAt(shot(),0));refreshTimeline();setStatus('SHOT START')});
ui.reset.addEventListener('click',()=>{stopPlayback();shots=cloneData(defaultShots);shots.forEach(relabelPoints);currentShotIndex=0;selectedPoint=0;selectedSegment=0;playhead=0;setTargetMarker();refreshUI();applyCameraState(cameraStateAt(shot(),0));resetMotionGesture();if(ui.heightHint)ui.heightHint.textContent='height auto';setStatus('DEMO RESET')});
ui.loop.addEventListener('click',()=>{looping=!looping;ui.loop.classList.toggle('active',looping);ui.loop.textContent=looping?'↻ Loop ON':'↻ Loop'});
ui.play.addEventListener('click',()=>{
  playbackMode='shot';
  if(playhead>=shotDuration())playhead=0;
  playing=!playing;
  syncNavigationMode();
  ui.play.textContent=playing?'⏸ Pause':'▶ Play';
  syncPlayLabels();
  setStatus(playing?'PLAYING · '+shot().name.toUpperCase():'PAUSED');
});
ui.playSequence.addEventListener('click',()=>{
  playbackMode='sequence';sequenceIndex=0;currentShotIndex=0;playhead=0;selectedPoint=0;selectedSegment=0;playing=true;controls.enabled=false;setTargetMarker();refreshUI();setStatus('PLAYING SEQUENCE');
});

const quickPlay=$('quickPlay');
const quickStart=$('quickStart');

function syncPlayLabels(){
  if(quickPlay) quickPlay.textContent=playing?'⏸ Pause shot':'▶ Preview shot';
}
quickPlay?.addEventListener('click',()=>{
  ui.play.click();
  syncPlayLabels();
});
quickStart?.addEventListener('click',()=>ui.origin.click());

document.querySelectorAll('[data-motion-preset]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const preset=btn.dataset.motionPreset;
    const seg=shot().segments[selectedSegment];
    if(preset==='smooth'){
      seg.speed=.9; seg.accelIn=5.5; seg.brakeOut=5.5;
    }else if(preset==='cruise'){
      seg.speed=1.15; seg.accelIn=1.5; seg.brakeOut=1.5;
    }else if(preset==='arrive'){
      seg.speed=.85; seg.accelIn=2.0; seg.brakeOut=8.5;
    }
    document.querySelectorAll('[data-motion-preset]').forEach(x=>x.classList.toggle('active',x===btn));
    refreshUI();
    setStatus('MOTION · '+preset.toUpperCase());
  });
});

window.addEventListener('keydown',e=>{
  const tag=document.activeElement?.tagName;
  if(tag==='INPUT' || tag==='BUTTON' || tag==='SUMMARY' || tag==='SELECT') return;
  if(e.code==='Space'){
    e.preventDefault();
    ui.play.click();
    syncPlayLabels();
  }
  if(e.key==='Enter' && endpointActive()){
    e.preventDefault();
    compileMotionGesture();
  }
  if(e.key==='Escape' && endpointActive()){
    e.preventDefault();
    resetMotionGesture();
    setStatus('GESTURE · RESET');
  }
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='z'){
    e.preventDefault();
    if(endpointActive())resetMotionGesture();else undoLastChainMove();
  }
  if(e.key==='0'){
    ui.origin.click();
  }
});
const quickAxes=[
  ['Horizontal',ui.qHorizontal,$('qHorizontalVal')],
  ['Pan',ui.qPan,$('qPanVal')],
  ['Vertical',ui.qVertical,$('qVerticalVal')],
  ['Tilt',ui.qTilt,$('qTiltVal')],
  ['Zoom',ui.qZoom,$('qZoomVal')],
  ['Rotate',ui.qRotate,$('qRotateVal')]
];

const motionState={
  dx:0,
  dy:0,
  scale:1,
  rot:0,
  bendX:0,
  bendY:0,
  rhythm:[.17,.50,.83],
  trace:[],
  gestureTempo:1,
  snapX:null,
  snapY:null,
  snapScale:null,
  snapRot:null
};
let motionDrag=null;
const pilotState={
  active:false,
  pointerId:null,
  captureEl:null,
  anchorX:0,
  anchorY:0,
  x:0,
  y:0,
  startMs:0,
  lastSampleMs:0,
  moved:false,
  samples:[]
};

function quickValue(el){return +(el?.value||0)}
function mix(a,b,t){return a+(b-a)*t}
function smoothstep01(t){t=clamp(t,0,1);return t*t*(3-2*t)}
function magnetic(value,targets,radius,strength=.72){
  let best=null,bestD=Infinity;
  for(const target of targets){
    const d=Math.abs(value-target);
    if(d<bestD){bestD=d;best=target}
  }
  if(best===null || bestD>=radius)return {value,target:null,strength:0};
  const pull=smoothstep01(1-bestD/radius)*strength;
  return {value:mix(value,best,pull),target:best,strength:pull};
}
function rubberClamp(value,min,max,soft=32){
  if(value<min)return min-(min-value)/(1+(min-value)/soft);
  if(value>max)return max+(value-max)/(1+(value-max)/soft);
  return value;
}
function stageMetrics(){
  const r=ui.stage.getBoundingClientRect();
  return {w:r.width,h:r.height,baseX:r.width*.5,baseY:r.height*.47,baseW:r.width*.36,baseH:r.height*.40};
}
function endpointActive(){
  return Math.abs(motionState.dx)>2 || Math.abs(motionState.dy)>2 || Math.abs(motionState.scale-1)>.012 || Math.abs(motionState.rot)>.35;
}
function motionActive(){
  return endpointActive() || Math.abs(motionState.bendX)>2 || Math.abs(motionState.bendY)>2;
}
function traceScreenAt(t){
  const tr=motionState.trace;
  if(!tr || tr.length<2)return null;
  const t0=tr[0].time,t1=tr[tr.length-1].time,span=Math.max(1,t1-t0);
  const target=t0+clamp(t,0,1)*span;
  let i=1;
  while(i<tr.length && tr[i].time<target)i++;
  i=clamp(i,1,tr.length-1);
  const a=tr[i-1],b=tr[i],d=Math.max(1,b.time-a.time);
  const u=clamp((target-a.time)/d,0,1);
  return {x:mix(a.x,b.x,u),y:mix(a.y,b.y,u)};
}
function curve2D(t){
  const traced=traceScreenAt(t);
  if(traced)return traced;
  const g=stageMetrics();
  const x0=g.baseX,y0=g.baseY;
  const x2=g.baseX+motionState.dx,y2=g.baseY+motionState.dy;
  const x1=(x0+x2)/2+motionState.bendX,y1=(y0+y2)/2+motionState.bendY;
  const u=1-t;
  return {
    x:u*u*x0+2*u*t*x1+t*t*x2,
    y:u*u*y0+2*u*t*y1+t*t*y2
  };
}
function curveStyleAt(t){
  return {
    scale:1+(motionState.scale-1)*t,
    rot:motionState.rot*t
  };
}
function positionMotionElement(el,t){
  const g=stageMetrics(),p=curve2D(t),st=curveStyleAt(t);
  el.style.left=p.x+'px';
  el.style.top=p.y+'px';
  el.style.width=(g.baseW*st.scale)+'px';
  el.style.height=(g.baseH*st.scale)+'px';
  el.style.transform='translate(-50%,-50%) rotate('+st.rot+'deg)';
}
function updateMotionUI(){
  if(!ui.nextFrame)return;
  const g=stageMetrics(),end=curve2D(1);
  ui.nextFrame.style.left=end.x+'px';
  ui.nextFrame.style.top=end.y+'px';
  ui.nextFrame.style.width=(g.baseW*motionState.scale)+'px';
  ui.nextFrame.style.height=(g.baseH*motionState.scale)+'px';
  ui.nextFrame.style.transform='translate(-50%,-50%) rotate('+motionState.rot+'deg)';

  const control={
    x:(g.baseX+end.x)/2+motionState.bendX,
    y:(g.baseY+end.y)/2+motionState.bendY
  };
  ui.ribbonHandle.style.left=control.x+'px';
  ui.ribbonHandle.style.top=control.y+'px';

  const visible=endpointActive();
  ui.ribbonHandle.style.opacity=visible?'1':'0';
  ui.ribbonHandle.style.pointerEvents='none';
  ui.ghostFrames.forEach((el,i)=>{
    positionMotionElement(el,motionState.rhythm[i]);
    el.style.opacity=visible?'1':'0';
    el.style.pointerEvents='none';
  });
  if(ui.motionApply){
    ui.motionApply.disabled=!visible;
    ui.motionApply.style.opacity=visible?'1':'.45';
  }
  if(ui.motionApply){
    ui.motionApply.textContent=(shot()._chainMoves||0)>0?'Add next':'Apply';
  }
  if(ui.motionReset){
    ui.motionReset.title=visible?'Reset current gesture':'Undo last committed move';
  }

  drawFrameOverlay();
}
function resetMotionGesture(){
  motionState.dx=0;motionState.dy=0;motionState.scale=1;motionState.rot=0;
  motionState.bendX=0;motionState.bendY=0;motionState.rhythm=[.17,.50,.83];
  motionState.trace=[];motionState.gestureTempo=1;
  motionState.snapX=null;motionState.snapY=null;motionState.snapScale=null;motionState.snapRot=null;
  quickAxes.forEach(([,el,out])=>{
    if(el)el.value='0';
    if(out)out.textContent='0.0';
  });
  updateMotionUI();
}
function inferGestureFromTrace(finalPass=false){
  const tr=motionState.trace;
  if(!tr || tr.length<3)return;
  const g=stageMetrics();
  const start=tr[0],end=tr[tr.length-1];
  let total=0;
  const cum=[0];
  for(let i=1;i<tr.length;i++){
    total+=Math.hypot(tr[i].x-tr[i-1].x,tr[i].y-tr[i-1].y);
    cum.push(total);
  }
  if(total<8)return;

  // Geometry is no longer reduced to one quadratic bend.
  // The complete stroke is preserved and sampled directly into 3D.

  // Rhythm: equal-time ghost frames land where the pointer actually was at
  // 25/50/75% of gesture time. Slow hand movement => close frames; fast => wide.
  const t0=start.time,t1=end.time,elapsed=Math.max(1,t1-t0);
  const qs=[.25,.50,.75];
  const inferred=qs.map(q=>{
    const target=t0+elapsed*q;
    let i=1;
    while(i<tr.length && tr[i].time<target)i++;
    i=clamp(i,1,tr.length-1);
    const a=tr[i-1],b=tr[i],span=Math.max(1,b.time-a.time);
    const u=clamp((target-a.time)/span,0,1);
    const d=cum[i-1]+Math.hypot(b.x-a.x,b.y-a.y)*u;
    return clamp(d/total,.04,.96);
  });
  inferred[0]=clamp(inferred[0],.05,.78);
  inferred[1]=clamp(inferred[1],inferred[0]+.06,.89);
  inferred[2]=clamp(inferred[2],inferred[1]+.06,.95);
  const rhythmFit=finalPass?.68:.22;
  motionState.rhythm=motionState.rhythm.map((v,i)=>mix(v,inferred[i],rhythmFit));

  // The speed of the same drag also supplies a global tempo hint.
  // A slow deliberate drag yields a slower cinematic move; a flick stays brisk.
  const tempoTarget=clamp(elapsed/850,.62,1.65);
  motionState.gestureTempo=mix(motionState.gestureTempo,tempoTarget,finalPass?.72:.24);
}

function drawFrameOverlay(){
  if(!frameCtx || !ui.frameOverlay)return;
  const g=stageMetrics();
  frameCtx.clearRect(0,0,g.w,g.h);
  if(playing)return;

  if(pilotState.active){
    const ax=pilotState.anchorX,ay=pilotState.anchorY;
    const px=pilotState.x,py=pilotState.y;
    const dx=px-ax,dy=py-ay;
    const mag=Math.min(1,Math.hypot(dx,dy)/Math.max(90,Math.min(g.w,g.h)*.22));

    frameCtx.beginPath();
    frameCtx.moveTo(ax,ay);
    frameCtx.lineTo(px,py);
    frameCtx.strokeStyle='rgba(220,170,248,'+(0.28+mag*.48)+')';
    frameCtx.lineWidth=2;
    frameCtx.lineCap='round';
    frameCtx.stroke();

    frameCtx.beginPath();
    frameCtx.arc(ax,ay,15,0,Math.PI*2);
    frameCtx.strokeStyle='rgba(255,255,255,.28)';
    frameCtx.lineWidth=1;
    frameCtx.stroke();

    frameCtx.beginPath();
    frameCtx.arc(px,py,5+mag*3,0,Math.PI*2);
    frameCtx.fillStyle='rgba(238,207,252,.96)';
    frameCtx.fill();

    if(pilotState.samples.length>1){
      // A small screen-space trace of the actual steering hand movement.
      frameCtx.beginPath();
      pilotState.samples.forEach((sample,i)=>{
        if(!sample.screen)return;
        if(!i)frameCtx.moveTo(sample.screen.x,sample.screen.y);
        else frameCtx.lineTo(sample.screen.x,sample.screen.y);
      });
      frameCtx.strokeStyle='rgba(255,224,139,.24)';
      frameCtx.lineWidth=1;
      frameCtx.stroke();
    }
    return;
  }

  // In author mode there is deliberately no framing box. The scene itself is
  // the control surface. Old frame/ribbon feedback only appears for explicit
  // advanced-axis edits.
  if(!endpointActive())return;

  if(motionState.snapX!==null){
    frameCtx.beginPath();frameCtx.moveTo(motionState.snapX,0);frameCtx.lineTo(motionState.snapX,g.h);
    frameCtx.strokeStyle='rgba(255,228,148,.34)';frameCtx.lineWidth=1;frameCtx.stroke();
  }
  if(motionState.snapY!==null){
    frameCtx.beginPath();frameCtx.moveTo(0,motionState.snapY);frameCtx.lineTo(g.w,motionState.snapY);
    frameCtx.strokeStyle='rgba(255,228,148,.34)';frameCtx.lineWidth=1;frameCtx.stroke();
  }

  if(motionState.trace.length>2){
    frameCtx.beginPath();
    for(let i=0;i<=36;i++){
      const p=traceScreenAt(i/36);
      if(!p)continue;
      if(!i)frameCtx.moveTo(p.x,p.y);else frameCtx.lineTo(p.x,p.y);
    }
    frameCtx.strokeStyle='rgba(220,170,248,.78)';
    frameCtx.lineWidth=2;
    frameCtx.lineCap='round';
    frameCtx.lineJoin='round';
    frameCtx.stroke();
  }

  motionState.rhythm.forEach(t=>{
    const p=curve2D(t);
    frameCtx.fillStyle='rgba(233,202,249,.82)';
    frameCtx.beginPath();frameCtx.arc(p.x,p.y,2.6,0,Math.PI*2);frameCtx.fill();
  });
}
function worldMotionPreview(s=shot()){
  const g=stageMetrics();
  const last=s.points[s.points.length-1],tar=targetFor(s);
  const from=new THREE.Vector3(...last);
  const forward=tar.clone().sub(from).normalize();
  let right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0));
  if(right.lengthSq()<1e-6)right.set(1,0,0);else right.normalize();
  const up=new THREE.Vector3(0,1,0);
  const push=(motionState.scale-1)*5.6;

  const tr=motionState.trace;
  const traceStart=tr?.length?tr[0]:{x:g.baseX,y:g.baseY,time:0};

  const at=t=>{
    let screen=traceScreenAt(t);
    if(!screen){
      const p=curve2D(t);
      screen={x:p.x,y:p.y};
    }
    const dx=screen.x-traceStart.x;
    const dy=screen.y-traceStart.y;
    const p=from.clone()
      .addScaledVector(right,(dx/g.w)*5.2)
      .addScaledVector(up,(-dy/g.h)*3.3)
      .addScaledVector(forward,push*smoothstep01(t));
    p.x=clamp(p.x,-5.2,5.2);
    p.y=clamp(p.y,.35,3.7);
    p.z=clamp(p.z,-5.2,7.8);
    return p;
  };

  const samples=[];
  for(let i=0;i<=48;i++)samples.push(at(i/48));
  const end=at(1);
  return {from,end,at,samples};
}
function nearestCurveT(clientX,clientY){
  const r=ui.stage.getBoundingClientRect(),x=clientX-r.left,y=clientY-r.top;
  let bestT=0,best=Infinity;
  for(let i=0;i<=100;i++){
    const t=i/100,p=curve2D(t),d=(p.x-x)*(p.x-x)+(p.y-y)*(p.y-y);
    if(d<best){best=d;bestT=t}
  }
  return bestT;
}
function compileMotionGesture(){
  if(!endpointActive()){
    setStatus('DRAW A MOVE');
    return;
  }
  stopPlayback();syncNavigationMode();
  const s=shot(),preview=worldMotionPreview(s);
  const beforePoints=s.points.length;
  const beforeSegments=s.segments.length;
  const previousBrakeOut=s.segments.length?s.segments[s.segments.length-1].brakeOut:null;
  const prev=s.segments[s.segments.length-1]||{duration:1.8,speed:1,accelIn:0,brakeOut:0};
  const inheritedSpeed=prev.speed||1;

  let worldSpeed=1.2;
  if(s.points.length>=2 && s.segments.length){
    const a=s.points[s.points.length-2],b=s.points[s.points.length-1];
    const d=pointDistance(a,b),tm=effectiveDuration(prev);
    if(d>.05&&tm>.05)worldSpeed=d/tm;
  }
  let pathLength=0;
  for(let i=1;i<preview.samples.length;i++)pathLength+=preview.samples[i].distanceTo(preview.samples[i-1]);
  const traceElapsed=motionState.trace.length>1
    ? Math.max(.25,(motionState.trace[motionState.trace.length-1].time-motionState.trace[0].time)/1000)
    : 1;
  const distanceTime=pathLength/Math.max(.35,worldSpeed);
  const totalTime=clamp(distanceTime*.55 + traceElapsed*1.45, .65, 8);
  const authoredTs=motionState.trace.length>3
    ? [.16,.33,.50,.67,.84,1]
    : [...motionState.rhythm,1];
  const segmentTime=totalTime/authoredTs.length;

  // Ghost frames are equal-time samples. Their spatial spacing therefore *is*
  // the acceleration profile: close frames = slow, wide frames = fast.
  // If this shot already ended here, adding another move turns that old
  // endpoint into a pass-through node instead of braking and restarting.
  if(s.segments.length){
    s.segments[s.segments.length-1].brakeOut=0;
  }

  authoredTs.forEach((t,idx)=>{
    const p=preview.at(t);
    s.points.push([clamp(p.x,-5.2,5.2),clamp(p.y,.35,3.7),clamp(p.z,-5.2,7.8)]);
    s.segments.push({
      duration:segmentTime*inheritedSpeed,
      speed:inheritedSpeed,
      accelIn:0,
      brakeOut:idx===authoredTs.length-1?3:0
    });
  });

  // Advanced Pan/Tilt remain available and feed the same compiler.
  const baseTar=(targetDefs[s.targetId]||targetDefs.room).position;
  const from=preview.end.clone();
  const forward=baseTar.clone().sub(from).normalize();
  let right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0));
  if(right.lengthSq()<1e-6)right.set(1,0,0);else right.normalize();
  const lookOffset=right.multiplyScalar(quickValue(ui.qPan)*.12);
  lookOffset.y+=quickValue(ui.qTilt)*.10;
  s.lookOffset=lookOffset.toArray();
  s.roll=THREE.MathUtils.degToRad(motionState.rot);

  relabelPoints(s);
  selectedPoint=s.points.length-1;
  selectedSegment=s.segments.length-1;
  refreshUI();
  playhead=shotDuration(s);
  applyCameraState(cameraStateAt(s,playhead));
  refreshTimeline();
  if(ui.heightHint)ui.heightHint.textContent='height '+preview.end.y.toFixed(2)+' m';

  s._chainMoves=(s._chainMoves||0)+1;
  s._chainHistory=s._chainHistory||[];
  s._chainHistory.push({
    pointsAdded:s.points.length-beforePoints,
    segmentsAdded:s.segments.length-beforeSegments,
    previousBrakeOut
  });

  // Re-anchor: the camera is now physically at the committed endpoint.
  // Reset only the gesture surface, not the authored path, so the next drag
  // continues from this exact point.
  resetMotionGesture();
  ui.motionUI?.classList.add('reanchor');
  setTimeout(()=>ui.motionUI?.classList.remove('reanchor'),220);
  setStatus('CONTINUE · DRAW AGAIN');
}

function beginPilotGesture(e){
  if(navigationMode || playing || e.button!==0)return;
  e.preventDefault();e.stopPropagation();
  stopPlayback();
  navigationMode=false;
  syncNavigationMode();

  const r=ui.stage.getBoundingClientRect();
  pilotState.active=true;
  pilotState.pointerId=e.pointerId;
  pilotState.captureEl=e.currentTarget;
  pilotState.anchorX=e.clientX-r.left;
  pilotState.anchorY=e.clientY-r.top;
  pilotState.x=pilotState.anchorX;
  pilotState.y=pilotState.anchorY;
  pilotState.startMs=performance.now();
  pilotState.lastSampleMs=pilotState.startMs;
  pilotState.moved=false;
  pilotState.samples=[{
    position:camera.position.clone(),
    time:0,
    screen:{x:pilotState.anchorX,y:pilotState.anchorY}
  }];
  try{e.currentTarget?.setPointerCapture?.(e.pointerId)}catch{}
  ui.stage?.classList.add('piloting');
  setStatus('STEER · RELEASE TO KEEP');
}

function updatePilotPointer(e){
  if(!pilotState.active || e.pointerId!==pilotState.pointerId)return;
  const r=ui.stage.getBoundingClientRect();
  // Pointer capture keeps steering alive even beyond the visible canvas.
  // Do not clamp to the frame: the frame is a viewport, not a control boundary.
  pilotState.x=e.clientX-r.left;
  pilotState.y=e.clientY-r.top;
  if(Math.hypot(pilotState.x-pilotState.anchorX,pilotState.y-pilotState.anchorY)>4){
    pilotState.moved=true;
  }
}

function updatePilot(dt,nowMs){
  if(!pilotState.active)return;
  const g=stageMetrics();
  const radius=Math.max(140,Math.min(g.w,g.h)*.30);
  const nx=clamp((pilotState.x-pilotState.anchorX)/radius,-1,1);
  const ny=clamp((pilotState.y-pilotState.anchorY)/radius,-1,1);
  const mag=clamp(Math.hypot(nx,ny),0,1);
  const drive=smoothstep01(clamp((mag-.06)/.94,0,1));
  if(drive<=0)return;

  const target=targetFor(shot());
  const forward=target.clone().sub(camera.position);
  if(forward.lengthSq()<.0001)forward.set(0,0,-1);else forward.normalize();

  const worldUp=new THREE.Vector3(0,1,0);
  let right=new THREE.Vector3().crossVectors(forward,worldUp);
  if(right.lengthSq()<.0001)right.set(1,0,0);else right.normalize();

  // Joystick semantics:
  // left/right -> orbit/strafe around the target
  // up/down    -> rise/fall
  // distance from the anchor -> speed
  // a forward component is always present, making a continuous "camera drive".
  const direction=forward.clone().multiplyScalar(.72)
    .addScaledVector(right,nx*1.35)
    .addScaledVector(worldUp,-ny*.95);
  if(direction.lengthSq()<.0001)return;
  direction.normalize();

  const speed=.35 + drive*2.35;
  const next=camera.position.clone().addScaledVector(direction,speed*dt);
  next.x=clamp(next.x,-5.2,5.2);
  next.y=clamp(next.y,.35,3.7);
  next.z=clamp(next.z,-5.2,7.8);

  applyCameraState({position:next,target:target.clone(),roll:shot().roll||0});

  if(nowMs-pilotState.lastSampleMs>=55){
    const elapsed=nowMs-pilotState.startMs;
    const last=pilotState.samples[pilotState.samples.length-1];
    if(!last || last.position.distanceTo(next)>.035){
      pilotState.samples.push({
        position:next.clone(),
        time:elapsed,
        screen:{x:pilotState.x,y:pilotState.y}
      });
      if(pilotState.samples.length>180)pilotState.samples.shift();
      pilotState.lastSampleMs=nowMs;
    }
  }
}

function compactPilotSamples(samples,maxPoints=18){
  if(samples.length<=2)return samples;
  const out=[samples[0]];
  let last=out[0];
  for(let i=1;i<samples.length-1;i++){
    const p=samples[i];
    const dist=last.position.distanceTo(p.position);
    const elapsed=p.time-last.time;
    if(dist>.16 || elapsed>220){
      out.push(p);last=p;
    }
  }
  out.push(samples[samples.length-1]);
  if(out.length<=maxPoints)return out;
  const reduced=[out[0]];
  for(let i=1;i<maxPoints-1;i++){
    reduced.push(out[Math.round(i*(out.length-1)/(maxPoints-1))]);
  }
  reduced.push(out[out.length-1]);
  return reduced;
}

function commitPilotGesture(){
  const s=shot();
  const samples=compactPilotSamples(pilotState.samples);
  if(samples.length<2)return false;

  const beforePoints=s.points.length;
  const beforeSegments=s.segments.length;
  const previousBrakeOut=s.segments.length?s.segments[s.segments.length-1].brakeOut:null;
  if(s.segments.length)s.segments[s.segments.length-1].brakeOut=0;

  let previous=samples[0];
  for(let i=1;i<samples.length;i++){
    const sample=samples[i];
    const p=sample.position;
    s.points.push([
      clamp(p.x,-5.2,5.2),
      clamp(p.y,.35,3.7),
      clamp(p.z,-5.2,7.8)
    ]);
    const duration=clamp((sample.time-previous.time)/1000,.07,1.5);
    s.segments.push({
      duration,
      speed:1,
      accelIn:0,
      brakeOut:i===samples.length-1?3:0
    });
    previous=sample;
  }

  relabelPoints(s);
  selectedPoint=s.points.length-1;
  selectedSegment=s.segments.length-1;
  s._chainMoves=(s._chainMoves||0)+1;
  s._chainHistory=s._chainHistory||[];
  s._chainHistory.push({
    pointsAdded:s.points.length-beforePoints,
    segmentsAdded:s.segments.length-beforeSegments,
    previousBrakeOut
  });

  playhead=shotDuration(s);
  refreshUI();
  refreshTimeline();
  setStatus('CONTINUE · STEER AGAIN');
  return true;
}

function endPilotGesture(e){
  if(!pilotState.active || (e?.pointerId!==undefined && e.pointerId!==pilotState.pointerId))return;
  const wasMoved=pilotState.moved;
  const startClientX=(ui.stage.getBoundingClientRect().left+pilotState.anchorX);
  const startClientY=(ui.stage.getBoundingClientRect().top+pilotState.anchorY);

  if(wasMoved){
    const elapsed=performance.now()-pilotState.startMs;
    const last=pilotState.samples[pilotState.samples.length-1];
    if(!last || last.position.distanceTo(camera.position)>.015){
      pilotState.samples.push({
        position:camera.position.clone(),
        time:elapsed,
        screen:{x:pilotState.x,y:pilotState.y}
      });
    }
  }

  try{pilotState.captureEl?.releasePointerCapture?.(pilotState.pointerId)}catch{}
  pilotState.active=false;
  ui.stage?.classList.remove('piloting');

  if(!wasMoved){
    selectTargetAt(startClientX,startClientY);
    setStatus('TARGET SELECTED · HOLD TO STEER');
  }else{
    commitPilotGesture();
  }

  pilotState.pointerId=null;
  pilotState.captureEl=null;
  pilotState.samples=[];
  drawFrameOverlay();
}

window.addEventListener('pointermove',updatePilotPointer,{passive:true});
window.addEventListener('pointerup',endPilotGesture);
window.addEventListener('pointercancel',endPilotGesture);

function syncAxesToMotion(){
  const g=stageMetrics();
  const h=quickValue(ui.qHorizontal),pan=quickValue(ui.qPan),v=quickValue(ui.qVertical),tilt=quickValue(ui.qTilt),z=quickValue(ui.qZoom),rot=quickValue(ui.qRotate);
  motionState.dx=(h*.013+pan*.004)*g.w;
  motionState.dy=(-v*.014-tilt*.004)*g.h;
  motionState.scale=clamp(1+z*.028,.58,1.7);
  motionState.rot=clamp(rot*1.6,-35,35);
  motionState.bendX=pan*.009*g.w;
  motionState.bendY=-tilt*.009*g.h;
  updateMotionUI();
}
quickAxes.forEach(([,el,out])=>{
  el?.addEventListener('input',()=>{
    if(out)out.textContent=(+el.value).toFixed(1);
    syncAxesToMotion();
  });
});
ui.qReset?.addEventListener('click',()=>{resetMotionGesture();setStatus('MOVE · RESET')});
ui.qApply?.addEventListener('click',compileMotionGesture);
ui.motionApply?.addEventListener('click',compileMotionGesture);
if(ui.motionApply)ui.motionApply.title='Apply and continue from this endpoint';
function undoLastChainMove(){
  const s=shot(),history=s._chainHistory;
  if(!history?.length)return false;
  stopPlayback();syncNavigationMode();
  const step=history.pop();
  s.points.splice(Math.max(1,s.points.length-step.pointsAdded),step.pointsAdded);
  s.segments.splice(Math.max(0,s.segments.length-step.segmentsAdded),step.segmentsAdded);
  if(s.segments.length && step.previousBrakeOut!==null){
    s.segments[s.segments.length-1].brakeOut=step.previousBrakeOut;
  }
  s._chainMoves=Math.max(0,(s._chainMoves||1)-1);
  relabelPoints(s);
  selectedPoint=s.points.length-1;
  selectedSegment=Math.max(0,s.segments.length-1);
  playhead=shotDuration(s);
  refreshUI();
  applyCameraState(cameraStateAt(s,playhead));
  resetMotionGesture();
  setStatus('UNDO · LAST MOVE');
  return true;
}
ui.motionReset?.addEventListener('click',()=>{
  if(endpointActive()){
    resetMotionGesture();
    setStatus('GESTURE · RESET');
  }else if(!undoLastChainMove()){
    resetMotionGesture();
    setStatus('READY');
  }
});

function beginMotionDrag(mode,e,index=-1){
  e.preventDefault();e.stopPropagation();
  const g=stageMetrics();
  motionDrag={
    mode,index,pointerId:e.pointerId,captureEl:e.currentTarget,
    startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,lastTime:performance.now(),
    activated:false,
    dx:motionState.dx,dy:motionState.dy,scale:motionState.scale,rot:motionState.rot,
    bendX:motionState.bendX,bendY:motionState.bendY,
    rhythm:[...motionState.rhythm],
    centerX:g.baseX+motionState.dx,centerY:g.baseY+motionState.dy,
    resizeDistance:Math.max(24,Math.hypot(e.clientX-(ui.stage.getBoundingClientRect().left+g.baseX+motionState.dx),e.clientY-(ui.stage.getBoundingClientRect().top+g.baseY+motionState.dy)))
  };
  try{e.currentTarget?.setPointerCapture?.(e.pointerId)}catch{}
  ui.motionUI?.classList.add('dragging');
  if(mode==='frame'){
    motionState.trace=[{
      x:g.baseX+motionState.dx,
      y:g.baseY+motionState.dy,
      time:performance.now()
    }];
    motionState.bendX=0;motionState.bendY=0;
    motionState.rhythm=[.17,.50,.83];
    motionState.gestureTempo=1;
    motionState.snapX=null;motionState.snapY=null;
  }
}
ui.nextFrame?.addEventListener('pointerdown',e=>{
  if(e.target===ui.frameResize||e.target===ui.frameRotate)return;
  beginMotionDrag('frame',e);
});
ui.frameResize?.addEventListener('pointerdown',e=>beginMotionDrag('resize',e));
ui.frameRotate?.addEventListener('pointerdown',e=>beginMotionDrag('rotate',e));
ui.ribbonHandle?.addEventListener('pointerdown',e=>beginMotionDrag('bend',e));
ui.ribbonHandle?.addEventListener('dblclick',e=>{
  e.preventDefault();e.stopPropagation();
  motionState.bendX=0;motionState.bendY=0;
  updateMotionUI();
  setStatus('STRAIGHT');
});
ui.ghostFrames.forEach((el,i)=>el?.addEventListener('pointerdown',e=>beginMotionDrag('rhythm',e,i)));

window.addEventListener('pointermove',e=>{
  if(!motionDrag || (motionDrag.pointerId!==undefined && e.pointerId!==motionDrag.pointerId))return;
  const d=motionDrag,dx=e.clientX-d.startX,dy=e.clientY-d.startY;
  const travel=Math.hypot(dx,dy);
  if(!d.activated && travel<5)return;
  d.activated=true;

  if(d.mode==='frame'){
    const g=stageMetrics();
    const samples=e.getCoalescedEvents?.()||[e];
    for(const sample of samples){
      const rawDx=d.dx+(sample.clientX-d.startX);
      const rawDy=d.dy+(sample.clientY-d.startY);
      const elasticX=rubberClamp(rawDx,-g.w*.36,g.w*.36,36);
      const elasticY=rubberClamp(rawDy,-g.h*.30,g.h*.30,32);
      const cx=g.baseX+elasticX,cy=g.baseY+elasticY;
      motionState.dx=elasticX;
      motionState.dy=elasticY;
      const guidesX=[g.w/3,g.w/2,g.w*2/3],guidesY=[g.h/3,g.h/2,g.h*2/3];
      motionState.snapX=guidesX.find(v=>Math.abs(cx-v)<7)??null;
      motionState.snapY=guidesY.find(v=>Math.abs(cy-v)<7)??null;

      const now=sample.timeStamp||performance.now();
      const x=g.baseX+motionState.dx,y=g.baseY+motionState.dy,last=motionState.trace[motionState.trace.length-1];
      if(!last || now-last.time>10 || Math.hypot(x-last.x,y-last.y)>2.5){
        motionState.trace.push({x,y,time:now});
        if(motionState.trace.length>120)motionState.trace.shift();
      }
      d.lastX=sample.clientX;d.lastY=sample.clientY;d.lastTime=now;
    }
    inferGestureFromTrace(false);
    const preview=worldMotionPreview(shot());
    applyCameraState({position:preview.end,target:targetFor(shot()).clone(),roll:THREE.MathUtils.degToRad(motionState.rot)});
  }else if(d.mode==='resize'){
    const r=ui.stage.getBoundingClientRect();
    const cx=r.left+d.centerX,cy=r.top+d.centerY;
    const distance=Math.max(18,Math.hypot(e.clientX-cx,e.clientY-cy));
    const raw=clamp(d.scale*(distance/d.resizeDistance),.58,1.7);
    const snap=magnetic(raw,[.75,1,1.25,1.5],.065,.82);
    motionState.scale=snap.value;
    motionState.snapScale=snap.strength>.3?snap.target:null;
  }else if(d.mode==='bend'){
    const g=stageMetrics();
    const rawX=rubberClamp(d.bendX+dx,-g.w*.28,g.w*.28,30);
    const rawY=rubberClamp(d.bendY+dy,-g.h*.28,g.h*.28,28);
    const snapX=magnetic(rawX,[0],22,.86);
    const snapY=magnetic(rawY,[0],18,.82);
    motionState.bendX=snapX.value;
    motionState.bendY=snapY.value;
  }else if(d.mode==='rotate'){
    const r=ui.stage.getBoundingClientRect();
    const cx=r.left+d.centerX,cy=r.top+d.centerY;
    const raw=clamp(Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI+90,-35,35);
    const snap=magnetic(raw,[-30,-15,0,15,30],4.5,.86);
    motionState.rot=snap.value;
    motionState.snapRot=snap.strength>.3?snap.target:null;
  }else if(d.mode==='rhythm'){
    let t=nearestCurveT(e.clientX,e.clientY);
    const lo=d.index===0?.05:motionState.rhythm[d.index-1]+.06;
    const hi=d.index===2?.95:motionState.rhythm[d.index+1]-.06;
    motionState.rhythm[d.index]=clamp(t,lo,hi);
  }
  updateMotionUI();
  setStatus(d.mode==='frame'?'FLOW':(d.mode==='bend'?'TURN':(d.mode==='rhythm'?'RHYTHM':'MOTION PREVIEW')));
});
function endMotionDrag(e){
  if(!motionDrag || (e?.pointerId!==undefined && motionDrag.pointerId!==undefined && e.pointerId!==motionDrag.pointerId))return;
  const d=motionDrag;
  try{d.captureEl?.releasePointerCapture?.(d.pointerId)}catch{}
  ui.motionUI?.classList.remove('dragging');

  if(d.mode==='frame'){
    if(!d.activated){
      selectTargetAt(d.startX,d.startY);
      motionDrag=null;
      updateMotionUI();
      return;
    }
    inferGestureFromTrace(true);
    motionDrag=null;
    compileMotionGesture();
    return;
  }else if(d.activated){
    ui.motionUI?.classList.add('settling');
    setTimeout(()=>ui.motionUI?.classList.remove('settling'),170);
  }

  motionDrag=null;
  updateMotionUI();
}
window.addEventListener('pointerup',endMotionDrag);
window.addEventListener('pointercancel',endMotionDrag);

ui.timeline.addEventListener('input',e=>{stopPlayback();syncNavigationMode();playhead=+e.target.value;applyCameraState(cameraStateAt(shot(),playhead));refreshTimeline();setStatus('SCRUB')});

ui.homeView.addEventListener('click',()=>{
  stopPlayback();
  if(pilotState.active){
    pilotState.active=false;
    pilotState.samples=[];
    ui.stage?.classList.remove('piloting');
  }
  navigationMode=!navigationMode;
  if(navigationMode)resetMotionGesture();
  syncNavigationMode();
  setStatus(navigationMode?'NAVIGATE · DRAG SCENE':'AUTHOR · HOLD + STEER');
});

function resizeRenderer(){
  const r=ui.stage.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
  renderer.setSize(r.width,r.height,false);
  camera.aspect=r.width/r.height;camera.updateProjectionMatrix();
  ui.frameOverlay.width=Math.round(r.width*dpr);
  ui.frameOverlay.height=Math.round(r.height*dpr);
  frameCtx.setTransform(dpr,0,0,dpr,0,0);
  resizeMini(ui.top,topCtx);resizeMini(ui.side,sideCtx);
  updateMotionUI();
}
function resizeMini(canvas,context){
  const r=canvas.parentElement.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
  context.setTransform(dpr,0,0,dpr,0,0);
}
new ResizeObserver(resizeRenderer).observe(ui.stage);

const mapConfig={
  top:{minX:-5.5,maxX:5.5,minY:-5.5,maxY:8.0},
  side:{minX:-5.5,maxX:8.0,minY:0,maxY:4.0}
};
function mapper(canvas,mode){
  const r=canvas.parentElement.getBoundingClientRect(),w=r.width,h=r.height,pad=16,b=mapConfig[mode];
  const sx=(w-pad*2)/(b.maxX-b.minX),sy=(h-pad*2)/(b.maxY-b.minY),scale=Math.min(sx,sy),cx=(b.minX+b.maxX)/2,cy=(b.minY+b.maxY)/2;
  return{
    w,h,scale,
    map:(x,y)=>mode==='top'?[w/2+(x-cx)*scale,h/2+(y-cy)*scale]:[w/2+(x-cx)*scale,h/2-(y-cy)*scale],
    unmap:(px,py)=>mode==='top'?[cx+(px-w/2)/scale,cy+(py-h/2)/scale]:[cx+(px-w/2)/scale,cy-(py-h/2)/scale]
  };
}
function drawProjectionRect(c,m,x,y,w,h,label,alpha=.12){
  const a=m.map(x-w/2,y-h/2),b=m.map(x+w/2,y+h/2);
  const left=Math.min(a[0],b[0]),top=Math.min(a[1],b[1]),rw=Math.abs(b[0]-a[0]),rh=Math.abs(b[1]-a[1]);
  c.fillStyle='rgba(255,255,255,'+alpha+')';c.fillRect(left,top,rw,rh);
  c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=1;c.strokeRect(left,top,rw,rh);
  if(label){c.fillStyle='rgba(220,209,226,.56)';c.font='8px ui-monospace';c.fillText(label,left+4,top+10)}
}
function drawRoomTop(c,m){
  const a=m.map(-5,-5),b=m.map(5,5);
  c.fillStyle='rgba(255,255,255,.025)';c.fillRect(Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
  c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=1.2;c.strokeRect(Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
  drawProjectionRect(c,m,-.25,0,3.25,1.25,'SOFA',.10);
  drawProjectionRect(c,m,.2,2,2.15,1.05,'TABLE',.08);
  drawProjectionRect(c,m,3.25,-2.45,.65,2.5,'TV',.08);
  drawProjectionRect(c,m,-3.25,1.85,.8,.8,'PLANT',.07);
  const wa=m.map(-4.7,-4.94),wb=m.map(-2.0,-4.94);c.strokeStyle='rgba(166,205,229,.68)';c.lineWidth=3;c.beginPath();c.moveTo(...wa);c.lineTo(...wb);c.stroke();
}
function drawRoomSide(c,m){
  const floorA=m.map(-5,0),floorB=m.map(8,0),ceilA=m.map(-5,3.25),ceilB=m.map(8,3.25);
  c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=1.2;c.beginPath();c.moveTo(...floorA);c.lineTo(...floorB);c.stroke();
  c.strokeStyle='rgba(255,255,255,.10)';c.beginPath();c.moveTo(...ceilA);c.lineTo(...ceilB);c.stroke();
  drawProjectionRect(c,m,0,.67,1.25,1.18,'SOFA',.09);
  drawProjectionRect(c,m,2,.35,1.05,.68,'TABLE',.07);
  drawProjectionRect(c,m,-2.45,.9,.65,1.8,'TV',.07);
  drawProjectionRect(c,m,1.85,1.05,.8,2.1,'PLANT',.06);
  const wa=m.map(-4.95,.78),wb=m.map(-4.95,2.62);c.strokeStyle='rgba(166,205,229,.68)';c.lineWidth=3;c.beginPath();c.moveTo(...wa);c.lineTo(...wb);c.stroke();
}
function drawMini(context,canvas,mode){
  const m=mapper(canvas,mode),s=shot(),path=samplePath(s,180);
  context.clearRect(0,0,m.w,m.h);context.fillStyle='rgba(15,12,18,.98)';context.fillRect(0,0,m.w,m.h);
  mode==='top'?drawRoomTop(context,m):drawRoomSide(context,m);
  context.strokeStyle='rgba(200,150,232,.96)';context.lineWidth=2;context.beginPath();
  path.forEach((st,i)=>{const p=mode==='top'?m.map(st.position.x,st.position.z):m.map(st.position.z,st.position.y);if(!i)context.moveTo(...p);else context.lineTo(...p)});context.stroke();
  s.points.forEach((p,i)=>{
    const q=mode==='top'?m.map(p[0],p[2]):m.map(p[2],p[1]);
    const isEnd=i===s.points.length-1;
    context.fillStyle=i===selectedPoint?'#ffffff':'#c178e6';
    context.beginPath();context.arc(q[0],q[1],i===selectedPoint?5:4,0,Math.PI*2);context.fill();
    if(isEnd){
      context.strokeStyle='rgba(255,255,255,.72)';context.lineWidth=1;
      context.beginPath();context.arc(q[0],q[1],8,0,Math.PI*2);context.stroke();
    }
    context.fillStyle='#c9bacf';context.font='9px ui-monospace';context.fillText(s.pointLabels[i],q[0]+7,q[1]-6)
  });
  if(endpointActive()){
    const preview=worldMotionPreview(s);
    context.strokeStyle='rgba(255,224,139,.78)';
    context.lineWidth=1.3;
    context.setLineDash([4,4]);
    context.beginPath();
    preview.samples.forEach((p,i)=>{
      const q=mode==='top'?m.map(p.x,p.z):m.map(p.z,p.y);
      if(!i)context.moveTo(...q);else context.lineTo(...q);
    });
    context.stroke();context.setLineDash([]);
    motionState.rhythm.forEach(t=>{
      const p=preview.at(t),q=mode==='top'?m.map(p.x,p.z):m.map(p.z,p.y);
      context.fillStyle='rgba(238,205,251,.95)';context.beginPath();context.arc(q[0],q[1],3,0,Math.PI*2);context.fill();
    });
    const b=mode==='top'?m.map(preview.end.x,preview.end.z):m.map(preview.end.z,preview.end.y);
    context.fillStyle='#ffe08b';context.beginPath();context.arc(b[0],b[1],4.5,0,Math.PI*2);context.fill();
    if(mode==='side'){
      context.fillStyle='#ffe08b';context.font='9px ui-monospace';
      context.fillText('NEXT '+preview.end.y.toFixed(2)+'m',Math.min(m.w-78,b[0]+9),Math.max(18,b[1]-7));
    }
  }
  const cp=mode==='top'?m.map(camera.position.x,camera.position.z):m.map(camera.position.z,camera.position.y);context.fillStyle='#ffe08b';context.beginPath();context.arc(cp[0],cp[1],4,0,Math.PI*2);context.fill();
  const tar=targetFor();const tp=mode==='top'?m.map(tar.x,tar.z):m.map(tar.z,tar.y);context.fillStyle='#ffffff';context.beginPath();context.arc(tp[0],tp[1],3,0,Math.PI*2);context.fill();
  if(mode==='side' && s.points[selectedPoint]){
    const p=s.points[selectedPoint],q=m.map(p[2],p[1]);
    context.strokeStyle='rgba(255,224,139,.28)';context.setLineDash([3,3]);context.beginPath();context.moveTo(0,q[1]);context.lineTo(m.w,q[1]);context.stroke();context.setLineDash([]);
    context.fillStyle='#ffe08b';context.font='9px ui-monospace';context.fillText('H '+p[1].toFixed(2)+'m',Math.min(m.w-54,q[0]+10),Math.max(16,q[1]-8));
  }
}
function localXY(e,canvas){const r=canvas.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
function hitPoint(canvas,mode,x,y){
  const m=mapper(canvas,mode),s=shot();let hit=-1,best=14;
  s.points.forEach((p,i)=>{const q=mode==='top'?m.map(p[0],p[2]):m.map(p[2],p[1]);const d=Math.hypot(q[0]-x,q[1]-y);if(d<best){best=d;hit=i}});
  return hit;
}
function bindMini(canvas,mode){
  canvas.addEventListener('pointerdown',e=>{
    stopPlayback();syncNavigationMode();
    const [x,y]=localXY(e,canvas),hit=hitPoint(canvas,mode,x,y);
    if(hit>=0){
      selectedPoint=hit;selectedSegment=Math.min(hit,shot().segments.length-1);drag={mode,index:hit};canvas.setPointerCapture(e.pointerId);
      if(ui.heightHint) ui.heightHint.textContent='height '+shot().points[hit][1].toFixed(2)+' m';
      refreshUI();return;
    }
    if(mode==='top'){
      const m=mapper(canvas,mode),v=m.unmap(x,y),s=shot();
      const autoY=autoHeightForXY(s,v[0],v[1]);
      appendPathPoint(s,[v[0],autoY,v[1]]);
      if(ui.heightHint) ui.heightHint.textContent='AUTO · '+autoY.toFixed(2)+' m';
      setStatus('AUTO HEIGHT · '+autoY.toFixed(2)+'m');
    }
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag)return;
    const [x,y]=localXY(e,canvas),m=mapper(canvas,mode),v=m.unmap(x,y),p=shot().points[drag.index];
    if(mode==='top'){
      p[0]=clamp(v[0],-5.2,5.2);
      p[2]=clamp(v[1],-5.2,7.8);
    }else{
      p[1]=clamp(v[1],.35,3.7);
      if(ui.heightHint) ui.heightHint.textContent='height '+p[1].toFixed(2)+' m';
    }
    refreshUI();setStatus(mode==='side'?'HEIGHT · '+p[1].toFixed(2)+'m':'EDIT POINT · '+shot().pointLabels[drag.index]);
  });
  const end=e=>{if(!drag)return;drag=null;try{canvas.releasePointerCapture(e.pointerId)}catch{}setStatus('EDIT PATH')};
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
}
bindMini(ui.top,'top');bindMini(ui.side,'side');

const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
function selectTargetAt(clientX,clientY){
  const r=renderer.domElement.getBoundingClientRect();
  pointer.x=((clientX-r.left)/r.width)*2-1;
  pointer.y=-((clientY-r.top)/r.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(targetPickMeshes,true);
  if(!hits.length)return false;
  let obj=hits[0].object,id=obj.userData.targetId;
  while(!id&&obj.parent){obj=obj.parent;id=obj.userData.targetId}
  if(id&&targetDefs[id]){
    shot().targetId=id;
    setTargetMarker();
    refreshUI();
    controls.target.copy(targetDefs[id].position);
    controls.update();
    setStatus('TARGET · '+targetDefs[id].label.toUpperCase());
    return true;
  }
  return false;
}
renderer.domElement.addEventListener('pointerdown',beginPilotGesture,{capture:true});

ui.importGlb.addEventListener('click',()=>ui.importGlbInput.click());
ui.importGlbInput.addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  ui.loading.classList.remove('hidden');ui.loading.textContent='Loading GLB scene…';
  try{
    const url=URL.createObjectURL(file),loader=new GLTFLoader();
    loader.load(url,gltf=>{
      URL.revokeObjectURL(url);
      if(importedRoot)scene.remove(importedRoot);
      importedRoot=gltf.scene;
      importedRoot.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.targetId='imported';targetPickMeshes.push(o)}});
      const box3=new THREE.Box3().setFromObject(importedRoot),size=new THREE.Vector3(),center=new THREE.Vector3();box3.getSize(size);box3.getCenter(center);
      const maxDim=Math.max(size.x,size.y,size.z)||1,scale=5/maxDim;importedRoot.scale.setScalar(scale);
      importedRoot.position.set(-center.x*scale,0.02-center.y*scale,-center.z*scale);
      scene.add(importedRoot);
      const finalBox=new THREE.Box3().setFromObject(importedRoot),finalCenter=new THREE.Vector3();finalBox.getCenter(finalCenter);
      registerTarget('imported','Imported model',finalCenter.toArray());
      const def=targetDefs.imported;
      const marker=new THREE.Group();marker.position.copy(def.position);scene.add(marker);def.marker=marker;
      const sph=new THREE.Mesh(new THREE.SphereGeometry(.06,14,10),new THREE.MeshBasicMaterial({color:0xffffff}));
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.18,.012,8,32),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.7}));ring.rotation.x=Math.PI/2;marker.add(sph,ring);marker.visible=false;
      shot().targetId='imported';setTargetMarker();refreshUI();controls.target.copy(def.position);controls.update();setStatus('GLB LOADED');
      ui.loading.classList.add('hidden');
    },undefined,err=>{throw err});
  }catch(err){showError('Could not load this GLB. Try a self-contained .glb file.');ui.loading.classList.add('hidden')}
  e.target.value='';
});

function showError(msg){ui.error.textContent=msg;ui.error.classList.add('show');setTimeout(()=>ui.error.classList.remove('show'),4500)}

function animate(ts){
  const dt=Math.min(.05,(ts-lastTs)/1000||0);lastTs=ts;
  if(playing){
    playhead+=dt;
    const total=shotDuration();
    if(playhead>=total){
      if(playbackMode==='sequence'){
        if(currentShotIndex<shots.length-1){
          currentShotIndex++;sequenceIndex=currentShotIndex;selectedPoint=0;selectedSegment=0;playhead=0;setTargetMarker();refreshUI();
        }else if(looping){
          currentShotIndex=0;sequenceIndex=0;selectedPoint=0;selectedSegment=0;playhead=0;setTargetMarker();refreshUI();
        }else{
          playhead=total;playing=false;syncNavigationMode();ui.play.textContent='▶ Play';syncPlayLabels();setStatus('SEQUENCE FINISHED');
        }
      }else if(looping){
        playhead=0;
      }else{
        playhead=total;playing=false;syncNavigationMode();ui.play.textContent='▶ Play';syncPlayLabels();setStatus('SHOT FINISHED');
      }
    }
    if(playing || playhead<=shotDuration()) applyCameraState(cameraStateAt(shot(),playhead));
    refreshTimeline();
  } else if(pilotState.active) {
    updatePilot(dt,ts);
  } else {
    controls.update();
  }
  drawMini(topCtx,ui.top,'top');
  drawMini(sideCtx,ui.side,'side');
  drawFrameOverlay();
  renderer.render(scene,camera);
  requestAnimationFrame(animate);
}

setTargetMarker();
refreshUI();
resizeRenderer();
applyCameraState(cameraStateAt(shot(),0));
navigationMode=false;
syncNavigationMode();
resetMotionGesture();
setStatus('HOLD + STEER');
ui.loading.classList.add('hidden');
requestAnimationFrame(animate);
