import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = (id) => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
const cloneData = (v) => JSON.parse(JSON.stringify(v));

const ui = {
  stage: $('stage'),
  canvas: $('scene'),
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
  homeView: $('homeView')
};

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

const topCtx = ui.top.getContext('2d');
const sideCtx = ui.side.getContext('2d');

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
  return def.position;
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
  return {position:new THREE.Vector3(...p), target:targetFor(s).clone(), segment:hit.i, u};
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
}

function setTargetMarker(){
  Object.values(targetDefs).forEach(x=>{if(x.marker)x.marker.visible=false});
  const def=targetDefs[shot().targetId];
  if(def?.marker) def.marker.visible=true;
}
function setStatus(text){ ui.status.textContent=text; }

function stopPlayback(){
  playing=false;
  ui.play.textContent='▶ Play selected shot';
  const q=$('quickPlay'); if(q) q.textContent='▶ Preview shot';
}
function switchShot(index,snap=true){
  stopPlayback();
  currentShotIndex=clamp(index,0,shots.length-1);
  selectedPoint=0;selectedSegment=0;playhead=0;
  setTargetMarker();
  refreshUI();
  if(snap) applyCameraState(cameraStateAt(shot(),0));
  setStatus('SHOT · '+shot().name.toUpperCase());
}

function renderShots(){
  ui.shots.innerHTML='';
  shots.forEach((s,i)=>{
    const b=document.createElement('button');
    b.type='button'; b.className='shot-card'+(i===currentShotIndex?' active':'');
    b.innerHTML='<strong>'+s.name+'</strong><small>'+targetDefs[s.targetId]?.label+' · '+shotDuration(s).toFixed(1)+'s</small>';
    b.addEventListener('click',()=>switchShot(i,true));
    ui.shots.appendChild(b);
  });
}
function renderTargets(){
  ui.targets.innerHTML='';
  Object.values(targetDefs).forEach(def=>{
    const b=document.createElement('button');
    b.type='button'; b.className='chip'+(shot().targetId===def.id?' active':'');
    b.textContent=def.label;
    b.addEventListener('click',()=>{
      shot().targetId=def.id; setTargetMarker(); refreshUI(); applyCameraState(cameraStateAt(shot(),playhead)); setStatus('TARGET · '+def.label.toUpperCase());
    });
    ui.targets.appendChild(b);
  });
  const def=targetDefs[shot().targetId];
  ui.targetMeta.textContent=def.label+' · ['+def.position.toArray().map(v=>v.toFixed(2)).join(', ')+'] · click an object in 3D to retarget';
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
    const b=document.createElement('button');
    b.type='button'; b.className='segment-card'+(i===selectedSegment?' active':'');
    b.innerHTML='<strong>'+shot().pointLabels[i]+'→'+shot().pointLabels[i+1]+'</strong><small>'+effectiveDuration(seg).toFixed(2)+'s</small>';
    b.addEventListener('click',()=>{selectedSegment=i;selectedPoint=i;refreshUI()});
    ui.segments.appendChild(b);
  });
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
  ui.accelInVal.textContent=seg.accelIn.toFixed(1);
  ui.brakeOutVal.textContent=seg.brakeOut.toFixed(1);
  ui.segmentSummary.textContent=shot().pointLabels[selectedSegment]+'→'+shot().pointLabels[selectedSegment+1]+' · '+seg.duration.toFixed(1)+'s authored · '+effectiveDuration(seg).toFixed(2)+'s effective · junction velocity auto-smoothed';
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

ui.addPoint.addEventListener('click',()=>{
  stopPlayback();
  const s=shot(),i=selectedPoint;
  const next=i<s.points.length-1?s.points[i+1]:[s.points[i][0]+.8,s.points[i][1],s.points[i][2]-1.8];
  const p=i<s.points.length-1?s.points[i].map((v,k)=>(v+next[k])*.5):next;
  s.points.splice(i+1,0,p);
  s.segments.splice(i,0,{duration:1.8,speed:1,accelIn:5,brakeOut:5});
  while(s.segments.length>s.points.length-1)s.segments.pop();
  relabelPoints(s);selectedPoint=i+1;selectedSegment=Math.min(i,s.segments.length-1);refreshUI();setStatus('POINT ADDED');
});
ui.deletePoint.addEventListener('click',()=>{
  if(shot().points.length<=2)return;
  stopPlayback();const s=shot();s.points.splice(selectedPoint,1);
  if(selectedPoint<s.segments.length)s.segments.splice(selectedPoint,1);else s.segments.pop();
  while(s.segments.length<s.points.length-1)s.segments.push({duration:1.8,speed:1,accelIn:5,brakeOut:5});
  relabelPoints(s);selectedPoint=clamp(selectedPoint,0,s.points.length-1);selectedSegment=clamp(Math.min(selectedPoint,s.segments.length-1),0,s.segments.length-1);refreshUI();setStatus('POINT DELETED');
});

ui.origin.addEventListener('click',()=>{stopPlayback();playhead=0;applyCameraState(cameraStateAt(shot(),0));refreshTimeline();setStatus('SHOT START')});
ui.reset.addEventListener('click',()=>{stopPlayback();shots=cloneData(defaultShots);shots.forEach(relabelPoints);currentShotIndex=0;selectedPoint=0;selectedSegment=0;playhead=0;setTargetMarker();refreshUI();applyCameraState(cameraStateAt(shot(),0));setStatus('DEMO RESET')});
ui.loop.addEventListener('click',()=>{looping=!looping;ui.loop.classList.toggle('active',looping);ui.loop.textContent=looping?'↻ Loop ON':'↻ Loop'});
ui.play.addEventListener('click',()=>{
  playbackMode='shot';
  if(playhead>=shotDuration())playhead=0;
  playing=!playing;
  controls.enabled=!playing;
  ui.play.textContent=playing?'⏸ Pause selected shot':'▶ Play selected shot';
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
  if(tag==='INPUT' || tag==='BUTTON' || tag==='SUMMARY') return;
  if(e.code==='Space'){
    e.preventDefault();
    ui.play.click();
    syncPlayLabels();
  }
  if(e.key==='0'){
    ui.origin.click();
  }
});
ui.timeline.addEventListener('input',e=>{stopPlayback();controls.enabled=true;playhead=+e.target.value;applyCameraState(cameraStateAt(shot(),playhead));refreshTimeline();setStatus('SCRUB')});

ui.homeView.addEventListener('click',()=>{stopPlayback();controls.enabled=true;camera.position.set(0,2.8,9.2);controls.target.set(0,1.1,-.2);controls.update();setStatus('FREE VIEW')});

function resizeRenderer(){
  const r=ui.stage.getBoundingClientRect();
  renderer.setSize(r.width,r.height,false);
  camera.aspect=r.width/r.height;camera.updateProjectionMatrix();
  resizeMini(ui.top,topCtx);resizeMini(ui.side,sideCtx);
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
function drawRoomTop(c,m){
  c.strokeStyle='rgba(255,255,255,.13)';c.lineWidth=1;
  const a=m.map(-5,-5),b=m.map(5,5);c.strokeRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);
  const rect=(x,z,w,d)=>{const p=m.map(x-w/2,z-d/2),q=m.map(x+w/2,z+d/2);c.strokeRect(p[0],p[1],q[0]-p[0],q[1]-p[1])};
  c.strokeStyle='rgba(255,255,255,.08)';rect(-.25,0,3.25,1.25);rect(.2,2,2.15,1.05);rect(3.25,-2.45,1.0,2.5);rect(-3.25,1.85,.8,.8);
}
function drawRoomSide(c,m){
  c.strokeStyle='rgba(255,255,255,.13)';c.lineWidth=1;
  const a=m.map(-5,0),b=m.map(8,0);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke();
  const ceilA=m.map(-5,3.25),ceilB=m.map(8,3.25);c.strokeStyle='rgba(255,255,255,.06)';c.beginPath();c.moveTo(ceilA[0],ceilA[1]);c.lineTo(ceilB[0],ceilB[1]);c.stroke();
}
function drawMini(context,canvas,mode){
  const m=mapper(canvas,mode),s=shot(),path=samplePath(s,180);
  context.clearRect(0,0,m.w,m.h);context.fillStyle='rgba(15,12,18,.98)';context.fillRect(0,0,m.w,m.h);
  mode==='top'?drawRoomTop(context,m):drawRoomSide(context,m);
  context.strokeStyle='rgba(200,150,232,.96)';context.lineWidth=2;context.beginPath();
  path.forEach((st,i)=>{const p=mode==='top'?m.map(st.position.x,st.position.z):m.map(st.position.z,st.position.y);if(!i)context.moveTo(...p);else context.lineTo(...p)});context.stroke();
  s.points.forEach((p,i)=>{const q=mode==='top'?m.map(p[0],p[2]):m.map(p[2],p[1]);context.fillStyle=i===selectedPoint?'#ffffff':'#c178e6';context.beginPath();context.arc(q[0],q[1],i===selectedPoint?5:4,0,Math.PI*2);context.fill();context.fillStyle='#c9bacf';context.font='9px ui-monospace';context.fillText(s.pointLabels[i],q[0]+7,q[1]-6)});
  const cp=mode==='top'?m.map(camera.position.x,camera.position.z):m.map(camera.position.z,camera.position.y);context.fillStyle='#ffe08b';context.beginPath();context.arc(cp[0],cp[1],4,0,Math.PI*2);context.fill();
  const tar=targetFor();const tp=mode==='top'?m.map(tar.x,tar.z):m.map(tar.z,tar.y);context.fillStyle='#ffffff';context.beginPath();context.arc(tp[0],tp[1],3,0,Math.PI*2);context.fill();
}
function localXY(e,canvas){const r=canvas.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
function hitPoint(canvas,mode,x,y){
  const m=mapper(canvas,mode),s=shot();let hit=-1,best=14;
  s.points.forEach((p,i)=>{const q=mode==='top'?m.map(p[0],p[2]):m.map(p[2],p[1]);const d=Math.hypot(q[0]-x,q[1]-y);if(d<best){best=d;hit=i}});
  return hit;
}
function bindMini(canvas,mode){
  canvas.addEventListener('pointerdown',e=>{
    stopPlayback();controls.enabled=true;
    const [x,y]=localXY(e,canvas),hit=hitPoint(canvas,mode,x,y);
    if(hit>=0){
      selectedPoint=hit;selectedSegment=Math.min(hit,shot().segments.length-1);drag={mode,index:hit};canvas.setPointerCapture(e.pointerId);refreshUI();return;
    }
    if(mode==='top'){
      const m=mapper(canvas,mode),v=m.unmap(x,y),s=shot(),insert=Math.min(selectedPoint+1,s.points.length),height=s.points[selectedPoint]?.[1]??1.7;
      s.points.splice(insert,0,[clamp(v[0],-5.2,5.2),height,clamp(v[1],-5.2,7.8)]);
      s.segments.splice(Math.min(selectedPoint,s.segments.length),0,{duration:1.8,speed:1,accelIn:5,brakeOut:5});
      while(s.segments.length>s.points.length-1)s.segments.pop();
      relabelPoints(s);selectedPoint=insert;selectedSegment=Math.min(insert,s.segments.length-1);refreshUI();setStatus('POINT ADDED');
    }
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag)return;
    const [x,y]=localXY(e,canvas),m=mapper(canvas,mode),v=m.unmap(x,y),p=shot().points[drag.index];
    if(mode==='top'){p[0]=clamp(v[0],-5.2,5.2);p[2]=clamp(v[1],-5.2,7.8)}
    else{p[2]=clamp(v[0],-5.2,7.8);p[1]=clamp(v[1],.35,3.7)}
    refreshUI();setStatus('EDIT POINT · '+shot().pointLabels[drag.index]);
  });
  const end=e=>{if(!drag)return;drag=null;try{canvas.releasePointerCapture(e.pointerId)}catch{}setStatus('EDIT PATH')};
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
}
bindMini(ui.top,'top');bindMini(ui.side,'side');

const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY}});
renderer.domElement.addEventListener('pointerup',e=>{
  if(!pointerDown)return;
  if(Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)>5){pointerDown=null;return}
  pointerDown=null;
  const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(targetPickMeshes,true);
  if(!hits.length)return;
  let obj=hits[0].object,id=obj.userData.targetId;
  while(!id&&obj.parent){obj=obj.parent;id=obj.userData.targetId}
  if(id&&targetDefs[id]){
    shot().targetId=id;setTargetMarker();refreshUI();controls.target.copy(targetDefs[id].position);controls.update();setStatus('TARGET · '+targetDefs[id].label.toUpperCase());
  }
});

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
          playhead=total;playing=false;controls.enabled=true;ui.play.textContent='▶ Play selected shot';syncPlayLabels();setStatus('SEQUENCE FINISHED');
        }
      }else if(looping){
        playhead=0;
      }else{
        playhead=total;playing=false;controls.enabled=true;ui.play.textContent='▶ Play selected shot';syncPlayLabels();setStatus('SHOT FINISHED');
      }
    }
    if(playing || playhead<=shotDuration()) applyCameraState(cameraStateAt(shot(),playhead));
    refreshTimeline();
  } else {
    controls.update();
  }
  drawMini(topCtx,ui.top,'top');
  drawMini(sideCtx,ui.side,'side');
  renderer.render(scene,camera);
  requestAnimationFrame(animate);
}

setTargetMarker();
refreshUI();
resizeRenderer();
applyCameraState(cameraStateAt(shot(),0));
ui.loading.classList.add('hidden');
requestAnimationFrame(animate);
