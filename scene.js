import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildCampus, lightCampus, CAMPUS_REVISION } from './campus.js';

export const CHAPTERS = [
  { at: .02, index: "01", kicker: "Integrated platform", title: "American Made Energy", body: "A connected landscape of manufacturing, generation, compute and circular recovery — presented as one explorable energy ecosystem.", explore: "Explore the master campus", focus: [-2,3,18], min: 34, max: 110, metrics: [["4","connected systems"],["Real-time","WebGL model"]] },
  { at: .20, index: "02", kicker: "Manufacturing", title: "Restore the line", body: "A cinematic industrial campus with production halls, rooftop systems, logistics courts and landscaped infrastructure.", explore: "Orbit the factory", focus: [-14,4,35], min: 18, max: 70, metrics: [["3.6 GW","planned HJT campus"],["PBR","material pipeline"]] },
  { at: .40, index: "03", kicker: "Power generation", title: "Power at scale", body: "Move through reflective photovoltaic fields, inverter infrastructure and animated wind turbines in a working renewable landscape.", explore: "Examine the energy field", focus: [-2,2,-3], min: 16, max: 64, metrics: [["PV + Wind","hybrid generation"],["Instanced","repeated equipment"]] },
  { at: .60, index: "04", kicker: "Data centers", title: "Energy for compute", body: "Purpose-built compute halls combine cooling banks, service yards and luminous operational detail.", explore: "Inspect the data campus", focus: [11,3,-45], min: 18, max: 58, metrics: [["10,000 ac","Maine platform"],["Turnkey","power + cooling"]] },
  { at: .80, index: "05", kicker: "Recycling", title: "A circular industry", body: "Conveyors, sorting equipment, recovery drums and illuminated process gates close the material loop.", explore: "Explore material recovery", focus: [8,4,-90], min: 14, max: 56, metrics: [["1 GW","planned recycling"],["Circular","material recovery"]] },
  { at: .97, index: "06", kicker: "Horizon", title: "One connected future", body: "The camera pulls back to reveal manufacturing, generation, compute and circular recovery as one long-horizon infrastructure platform.", explore: "Orbit the ecosystem", focus: [0,3,-22], min: 46, max: 138, metrics: [["6","cinematic beats"],["1","connected landscape"]] },
];

const CAMERA = [
  [0.00, [72,36,136], [-2,2.7,26], 39],
  [0.09, [58,28,114], [-7,2.9,32], 38],
  [0.20, [47,20,84], [-11,3.8,36], 35],
  [0.30, [36,17,55], [-4,2.7,16], 37],
  [0.40, [40,22,36], [0,3,-9], 42],
  [0.50, [29,15,0], [7,2.9,-30], 37],
  [0.60, [30,14,-24], [10,3.6,-49], 35],
  [0.69, [23,13,-47], [9,3.6,-63], 34],
  [0.76, [21,11,-68], [9,4.7,-84], 32],
  [0.81, [43,20,-69], [3,3.8,-89], 40],
  [0.86, [39,14,-90], [6,3.7,-89], 40],
  [0.91, [29,18,-111], [4,3.8,-88], 40],
  [1.00, [74,58,86], [0,2.6,-24], 46],
];

export function chapterAt(t) {
  let i = 0;
  for (let n = 0; n < CHAPTERS.length - 1; n += 1) {
    if (t >= (CHAPTERS[n].at + CHAPTERS[n + 1].at) / 2) i = n + 1;
  }
  return i;
}

const smooth = (t) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * c * (c * (c * 6 - 15) + 10);
};

export function sampleCamera(t) {
  let i = 0;
  while (i < CAMERA.length - 2 && CAMERA[i + 1][0] < t) i += 1;
  const a = CAMERA[i];
  const b = CAMERA[i + 1];
  const s = smooth((t - a[0]) / (b[0] - a[0] || 1));
  const mix = (x, y) => x + (y - x) * s;
  return {
    p: a[1].map((v, n) => mix(v, b[1][n])),
    l: a[2].map((v, n) => mix(v, b[2][n])),
    f: mix(a[3], b[3]),
  };
}


export class EnergyScene {
  constructor(canvas,{quality='high',getProgress,getMouse,getExploring,getChapter,onReady}){
    Object.assign(this,{getProgress,getMouse,getExploring,getChapter,onReady});
    this.high=quality==='high';this.ready=false;this.wasExplore=false;this.exploreChapter=-1;
    this.topViewHighRes=false;this.exploreBaseFov=40;
    this.time=0;this.previous=0;this.frameSamples=[];this.degraded=false;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:this.high?'high-performance':'default'});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;
    this.renderer.shadowMap.enabled=this.high;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x566c64);
    this.scene.fog=new THREE.FogExp2(0x75877d,.0020);
    this.camera=new THREE.PerspectiveCamera(40,1,.15,600);
    this.look=new THREE.Vector3();this.desired=new THREE.Vector3();this.targetLook=new THREE.Vector3();
    this.lighting=lightCampus(this.scene,this.renderer,this.high);
    this.campus=buildCampus(this.scene,this.renderer,this.high);
    this.controls=new OrbitControls(this.camera,canvas);this.controls.enabled=false;
    this.controls.enableDamping=true;this.controls.dampingFactor=.065;this.controls.enablePan=false;
    this.controls.zoomSpeed=.72;this.controls.rotateSpeed=.46;
    this.setupPost();this.resize();
    this.onResize=()=>this.resize();addEventListener('resize',this.onResize);
    this.onVisibility=()=>{this.previous=0;};document.addEventListener('visibilitychange',this.onVisibility);
    canvas.dataset.campusRevision=CAMPUS_REVISION;
    if(new URLSearchParams(location.search).has('qa'))window.__campusScene=this;
  }
  setupPost(){
    if(!this.high)return;
    try {
      this.composer=new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene,this.camera));
      this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(960,540),.13,.5,1.1));
      this.composer.addPass(new SMAAPass());this.composer.addPass(new OutputPass());
    }catch(error){console.warn('Post-processing unavailable; using direct WebGL rendering.',error);this.disposePost();}
  }
  disposePost(){if(this.composer){for(const pass of this.composer.passes)pass.dispose?.();this.composer.dispose();this.composer=null;}}
  resize(){
    const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);
    this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
    const dpr=devicePixelRatio||1;
    const ratio=this.high&&!this.degraded
      ?(this.topViewHighRes?Math.min(Math.max(dpr,1.75),2):Math.min(dpr,1.5))
      :1.0;
    this.renderer.setPixelRatio(ratio);this.renderer.setSize(w,h,false);
    this.composer?.setPixelRatio(ratio);this.composer?.setSize(w,h);
  }
  syncExplore(){
    const exploring=this.getExploring(),chapter=this.getChapter();
    if(exploring===this.wasExplore&&(!exploring||chapter===this.exploreChapter))return;
    this.wasExplore=exploring;this.exploreChapter=chapter;this.controls.enabled=exploring;
    if(exploring){
      this.exploreBaseFov=this.camera.fov;
      const c=CHAPTERS[chapter]||CHAPTERS[0];this.controls.target.set(...c.focus);
      this.controls.minDistance=c.min;this.controls.maxDistance=c.max;
      this.controls.minPolarAngle=.42;this.controls.maxPolarAngle=1.42;this.controls.update();
    }else{
      this.look.copy(this.controls.target);
      if(this.topViewHighRes){this.topViewHighRes=false;this.resize();}
    }
  }
  syncTopViewQuality(dt){
    const exploring=this.getExploring();
    const topView=this.high&&!this.degraded&&exploring&&this.controls.getPolarAngle()<1.0;
    if(topView!==this.topViewHighRes){this.topViewHighRes=topView;this.resize();}
    if(exploring){
      const targetFov=topView?Math.min(this.exploreBaseFov,38):this.exploreBaseFov;
      const k=1-Math.exp(-5*dt);
      if(Math.abs(this.camera.fov-targetFov)>.01){
        this.camera.fov+=(targetFov-this.camera.fov)*k;
        this.camera.updateProjectionMatrix();
      }
    }
  }
  tick=(now)=>{
    if(document.hidden)return;
    const raw=this.previous?Math.max(0,(now-this.previous)/1000):1/60;this.previous=now;
    const dt=Math.min(raw,.075);this.time+=dt;this.syncExplore();
    if(this.getExploring()){this.controls.update(dt);this.syncTopViewQuality(dt);}
    else{
      const pose=sampleCamera(this.getProgress()),mouse=this.getMouse();
      this.desired.set(pose.p[0]+mouse.x*1.1,pose.p[1]+mouse.y*.45,pose.p[2]);
      this.targetLook.set(pose.l[0]+mouse.x*.35,pose.l[1]+mouse.y*.1,pose.l[2]);
      const k=this.ready?1-Math.exp(-3.3*dt):1;
      this.camera.position.lerp(this.desired,k);this.look.lerp(this.targetLook,k);this.camera.lookAt(this.look);
      this.camera.fov+=(pose.f-this.camera.fov)*k;this.camera.updateProjectionMatrix();
    }
    this.campus.animate(this.time);
    if(this.composer)this.composer.render();else this.renderer.render(this.scene,this.camera);
    if(!this.ready){this.ready=true;this.onReady?.();}
    // Use unclamped frame intervals for quality decisions, never hide stalls.
    if(this.high&&!this.degraded&&this.time>4){
      this.frameSamples.push(raw);if(this.frameSamples.length>=150){
        const average=this.frameSamples.reduce((a,b)=>a+b,0)/this.frameSamples.length;
        if(average>.036){this.degraded=true;this.disposePost();this.resize();}
        this.frameSamples.length=0;
      }
    }
  };
  start(){this.previous=0;this.renderer.setAnimationLoop(this.tick);}
  dispose(){
    this.renderer.setAnimationLoop(null);removeEventListener('resize',this.onResize);
    document.removeEventListener('visibilitychange',this.onVisibility);this.controls.dispose();
    this.disposePost();this.campus.dispose();this.lighting.dispose();this.renderer.dispose();
    if(window.__campusScene===this)delete window.__campusScene;
  }
}
export function detectQuality(){
  try{
    const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2');
    if(!gl)return 'fallback';gl.getExtension('WEBGL_lose_context')?.loseContext();
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return 'fallback';
    return (navigator.hardwareConcurrency||4)<=2||(navigator.deviceMemory||4)<=2||innerWidth<560?'lite':'high';
  }catch{return 'fallback';}
}
