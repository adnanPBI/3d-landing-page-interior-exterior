import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildCampus, lightCampus, CAMPUS_REVISION } from './campus.js';
import { createCampusInteriors, INTERIOR_REVISION } from './campus-interiors.js';

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
    this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.interiorMode=false;this.currentInterior=null;this.savedExteriorPose=null;
    this.walkKeys=new Set();
    this.extKeys=new Set();
    this.interiorYaw=0;this.interiorPitch=0;
    this.targetInteriorYaw=0;this.targetInteriorPitch=0;
    this.interiorWheelForward=0;this.interiorWheelStrafe=0;
    this.interiorEyeY=1.7;this.targetInteriorEyeY=1.7;
    this.interiorFov=64;this.targetInteriorFov=64;
    this.interiorPivotMode=false;
    this.interiorPivotDistance=3.2;
    this.interiorPivotCenter=new THREE.Vector3();
    this.lookPointer=null;this.lookPointerButton=0;this.lookPointerShift=false;
    // Unrestricted 360° Any-Angle Exterior Orbit State (works in both Journey & Free Explore modes!)
    this.journeyAzimuth=0;this.targetJourneyAzimuth=0;
    this.journeyPolar=0;this.targetJourneyPolar=0;
    this.journeyDistanceScale=1.0;this.targetJourneyDistanceScale=1.0;
    this.journeyPanOffset=new THREE.Vector3();this.targetJourneyPanOffset=new THREE.Vector3();
    this.journeyOverrideSpherical=null;
    this.journeyDragPointer=null;this.journeyDragButton=0;this.journeyDragShift=false;
    this.journeyLastX=0;this.journeyLastY=0;
    this.autoTurntable=false;
    this.hasCustomJourneyOrbit=false;
    this.navigationFlight=null;this.onInteriorChange=null;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:this.high?'high-performance':'default'});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;
    this.renderer.shadowMap.enabled=this.high;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x566c64);
    this.scene.fog=new THREE.FogExp2(0x75877d,.0020);
    this.camera=new THREE.PerspectiveCamera(40,1,.15,650);
    this.look=new THREE.Vector3();this.desired=new THREE.Vector3();this.targetLook=new THREE.Vector3();
    this.lighting=lightCampus(this.scene,this.renderer,this.high);
    this.campus=buildCampus(this.scene,this.renderer,this.high);

    // Add-only internal models: no exterior transforms, meshes or roads are edited.
    this.interiors=createCampusInteriors(this.scene,{high:this.high});
    this.daylight={
      sunPosition:this.lighting.sun.position.clone(),
      sunColor:this.lighting.sun.color.clone(),
      sunIntensity:this.lighting.sun.intensity,
      hemi:this.scene.children.find(o=>o.isHemisphereLight),
      background:this.scene.background.clone(),
      fog:this.scene.fog.color.clone(),
      fogDensity:this.scene.fog.density,
      envIntensity:this.scene.environmentIntensity||0.84
    };
    this.controls=new OrbitControls(this.camera,canvas);this.controls.enabled=false;
    this.controls.enableDamping=true;this.controls.dampingFactor=.065;
    this.controls.enablePan=true;this.controls.screenSpacePanning=true;
    this.controls.minDistance=3.5;this.controls.maxDistance=220;
    this.controls.minPolarAngle=0.02;this.controls.maxPolarAngle=Math.PI*0.492;
    this.controls.minAzimuthAngle=-Infinity;this.controls.maxAzimuthAngle=Infinity;
    this.controls.zoomSpeed=1.15;this.controls.rotateSpeed=.95;this.controls.panSpeed=1.15;
    this.onInteriorKeyDown=(e)=>{
      if(e.target?.closest?.('input,textarea,select,[contenteditable]'))return;
      const k=e.key.toLowerCase();
      if(this.interiorMode){
        const keys=['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright','shift','q','e','r'];
        if(keys.includes(k)){
          e.preventDefault();
          if(k==='r')this.resetInteriorPose();
          else this.walkKeys.add(k);
        }
        return;
      }
      // Exterior keyboard 360° orbit, tilt, pan & zoom
      const extKeys=['q','e','w','a','s','d','r','f','+','=','-','_','0'];
      if(extKeys.includes(k)){
        if(k==='0'){
          this.resetExteriorView();
        }else{
          this.extKeys.add(k);
        }
      }
    };
    this.onInteriorKeyUp=(e)=>{
      const k=e.key.toLowerCase();
      this.walkKeys.delete(k);
      this.extKeys.delete(k);
    };
    this.onInteriorBlur=()=>{this.walkKeys.clear();this.extKeys.clear();this.lookPointer=null;this.journeyDragPointer=null;};
    this.onExplorePointerDown=()=>{if(!this.interiorMode)this.navigationFlight=null;};
    this.onInteriorContextMenu=(e)=>{e.preventDefault();};
    this.onInteriorPointerDown=(e)=>{
      if(e.button!==0&&e.button!==1&&e.button!==2)return;
      if(!this.interiorMode){
        // Direct 360° drag-to-orbit & pan in Journey Mode when OrbitControls is not active
        if(!this.getExploring()){
          this.journeyDragPointer=e.pointerId;
          this.journeyDragButton=e.button;
          this.journeyDragShift=!!e.shiftKey;
          this.journeyLastX=e.clientX;this.journeyLastY=e.clientY;
          this.hasCustomJourneyOrbit=true;
          canvas.setPointerCapture?.(e.pointerId);
        }
        return;
      }
      this.lookPointer=e.pointerId;
      this.lookPointerButton=e.button;
      this.lookPointerShift=!!e.shiftKey;
      this.pointerLastX=e.clientX;this.pointerLastY=e.clientY;
      if(this.interiorPivotMode||e.button===2||e.button===1||e.shiftKey){
        const cy=Math.cos(this.interiorPitch);
        this.interiorPivotCenter.set(
          this.camera.position.x-Math.sin(this.interiorYaw)*cy*this.interiorPivotDistance,
          this.camera.position.y+Math.sin(this.interiorPitch)*this.interiorPivotDistance,
          this.camera.position.z-Math.cos(this.interiorYaw)*cy*this.interiorPivotDistance
        );
      }
      canvas.setPointerCapture?.(e.pointerId);
    };
    this.onInteriorPointerMove=(e)=>{
      if(!this.interiorMode){
        if(!this.getExploring()&&this.journeyDragPointer===e.pointerId){
          const dx=e.clientX-this.journeyLastX,dy=e.clientY-this.journeyLastY;
          this.journeyLastX=e.clientX;this.journeyLastY=e.clientY;
          const isPan=this.journeyDragButton===2||this.journeyDragButton===1||this.journeyDragShift||e.shiftKey;
          if(isPan){
            const fwd=new THREE.Vector3();this.camera.getWorldDirection(fwd);
            const right=new THREE.Vector3().crossVectors(fwd,this.camera.up).normalize();
            const up=new THREE.Vector3().crossVectors(right,fwd).normalize();
            const dist=this.camera.position.distanceTo(this.look)||45;
            const panScale=dist*0.0016;
            this.targetJourneyPanOffset.addScaledVector(right,-dx*panScale);
            this.targetJourneyPanOffset.addScaledVector(up,dy*panScale);
            this.targetJourneyPanOffset.x=THREE.MathUtils.clamp(this.targetJourneyPanOffset.x,-65,65);
            this.targetJourneyPanOffset.y=THREE.MathUtils.clamp(this.targetJourneyPanOffset.y,-8,26);
            this.targetJourneyPanOffset.z=THREE.MathUtils.clamp(this.targetJourneyPanOffset.z,-75,75);
          }else{
            this.targetJourneyAzimuth-=dx*0.0062;
            this.targetJourneyPolar=THREE.MathUtils.clamp(this.targetJourneyPolar-dy*0.0052,-1.45,1.45);
          }
        }
        return;
      }
      if(this.lookPointer!==e.pointerId)return;
      const dx=e.clientX-this.pointerLastX,dy=e.clientY-this.pointerLastY;
      this.pointerLastX=e.clientX;this.pointerLastY=e.clientY;
      const isOrbitPivot=this.interiorPivotMode||this.lookPointerButton===2||this.lookPointerButton===1||this.lookPointerShift||e.shiftKey;
      if(this.lookPointerButton===1&&!this.interiorPivotMode){
        const rightX=Math.cos(this.interiorYaw),rightZ=-Math.sin(this.interiorYaw);
        const stepX=-dx*0.012*rightX,stepZ=-dx*0.012*rightZ;
        const nx=this.camera.position.x+stepX,nz=this.camera.position.z+stepZ;
        if(this.interiors.canMove(this.currentInterior,nx,this.camera.position.z))this.camera.position.x=nx;
        if(this.interiors.canMove(this.currentInterior,this.camera.position.x,nz))this.camera.position.z=nz;
        this.targetInteriorEyeY=THREE.MathUtils.clamp(this.targetInteriorEyeY+dy*0.008,1.05,3.25);
        return;
      }
      this.targetInteriorYaw-=dx*.0034;
      this.targetInteriorPitch=THREE.MathUtils.clamp(this.targetInteriorPitch-dy*.0028,-1.18,1.18);
      if(isOrbitPivot){
        const cy=Math.cos(this.targetInteriorPitch);
        const desiredX=this.interiorPivotCenter.x+Math.sin(this.targetInteriorYaw)*cy*this.interiorPivotDistance;
        const desiredZ=this.interiorPivotCenter.z+Math.cos(this.targetInteriorYaw)*cy*this.interiorPivotDistance;
        const desiredY=THREE.MathUtils.clamp(
          this.interiorPivotCenter.y-Math.sin(this.targetInteriorPitch)*this.interiorPivotDistance,
          1.05,3.25
        );
        if(this.interiors.canMove(this.currentInterior,desiredX,this.camera.position.z))this.camera.position.x=desiredX;
        if(this.interiors.canMove(this.currentInterior,this.camera.position.x,desiredZ))this.camera.position.z=desiredZ;
        this.targetInteriorEyeY=desiredY;
      }
    };
    this.onInteriorPointerUp=(e)=>{
      if(this.lookPointer===e.pointerId)this.lookPointer=null;
      if(this.journeyDragPointer===e.pointerId)this.journeyDragPointer=null;
    };
    this.onInteriorWheel=(e)=>{
      if(!this.interiorMode){
        // In Journey Mode, Ctrl/Meta/Alt/Shift + Wheel zooms the 3D camera directly without scrolling the page
        if(!this.getExploring()&&(e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)){
          e.preventDefault();
          const normY=e.deltaMode===1?e.deltaY*18:e.deltaMode===2?e.deltaY*120:e.deltaY;
          this.targetJourneyDistanceScale=THREE.MathUtils.clamp(this.targetJourneyDistanceScale*(1+normY*0.0012),0.10,2.8);
          this.hasCustomJourneyOrbit=true;
        }
        return;
      }
      e.preventDefault();
      const normY=e.deltaMode===1?e.deltaY*18:e.deltaMode===2?e.deltaY*120:e.deltaY;
      const normX=e.deltaMode===1?e.deltaX*18:e.deltaMode===2?e.deltaX*120:e.deltaX;
      if(e.ctrlKey||e.metaKey){
        this.targetInteriorFov=THREE.MathUtils.clamp(this.targetInteriorFov+normY*0.035,34,76);
        return;
      }
      const forwardImpulse=THREE.MathUtils.clamp(-normY*0.022,-3.6,3.6);
      const strafeImpulse=THREE.MathUtils.clamp(normX*0.016,-2.4,2.4);
      this.interiorWheelForward=THREE.MathUtils.clamp(this.interiorWheelForward+forwardImpulse,-11.5,11.5);
      this.interiorWheelStrafe=THREE.MathUtils.clamp(this.interiorWheelStrafe+strafeImpulse,-7.5,7.5);
      if(this.interiorPivotMode){
        this.interiorPivotDistance=THREE.MathUtils.clamp(this.interiorPivotDistance+normY*0.004,1.2,7.5);
      }
    };
    this.onInteriorDblClick=(e)=>{
      if(!this.interiorMode){
        // Double-clicking in exterior view zooms smoothly in toward the current target
        this.orbitExteriorBy(0,0,0.72);
        return;
      }
      this.interiorWheelForward=THREE.MathUtils.clamp(this.interiorWheelForward+5.2,-11.5,11.5);
    };
    window.addEventListener('keydown',this.onInteriorKeyDown);
    window.addEventListener('keyup',this.onInteriorKeyUp);
    window.addEventListener('blur',this.onInteriorBlur);
    canvas.addEventListener('contextmenu',this.onInteriorContextMenu);
    canvas.addEventListener('pointerdown',this.onExplorePointerDown);
    canvas.addEventListener('pointerdown',this.onInteriorPointerDown);
    canvas.addEventListener('pointermove',this.onInteriorPointerMove);
    canvas.addEventListener('pointerup',this.onInteriorPointerUp);
    canvas.addEventListener('pointercancel',this.onInteriorPointerUp);
    canvas.addEventListener('wheel',this.onInteriorWheel,{passive:false});
    canvas.addEventListener('dblclick',this.onInteriorDblClick);
    this.setupPost();this.resize();
    this.onResize=()=>this.resize();addEventListener('resize',this.onResize);
    this.onVisibility=()=>{this.previous=0;};document.addEventListener('visibilitychange',this.onVisibility);
    canvas.dataset.campusRevision=CAMPUS_REVISION;
    canvas.dataset.interiorRevision=INTERIOR_REVISION;
    if(new URLSearchParams(location.search).has('qa'))window.__campusScene=this;
  }
  setupPost(){
    if(!this.high)return;
    try {
      this.composer=new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene,this.camera));
      this.bloomPass=new UnrealBloomPass(new THREE.Vector2(960,540),.13,.5,1.1);
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(new SMAAPass());this.composer.addPass(new OutputPass());
    }catch(error){console.warn('Post-processing unavailable; using direct WebGL rendering.',error);this.disposePost();}
  }
  disposePost(){if(this.composer){for(const pass of this.composer.passes)pass.dispose?.();this.composer.dispose();this.composer=null;this.bloomPass=null;}}
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
    const enteringExplore=!this.wasExplore&&exploring;
    this.wasExplore=exploring;this.exploreChapter=chapter;this.controls.enabled=exploring;
    if(exploring){
      this.exploreBaseFov=this.camera.fov;
      const c=CHAPTERS[chapter]||CHAPTERS[0];
      if(enteringExplore&&this.hasCustomJourneyOrbit){
        this.controls.target.copy(this.look);
      }else{
        this.controls.target.set(...c.focus);
      }
      // Unlock full 360° horizontal & 0°–90° vertical rotation and wide zoom range
      this.controls.minDistance=3.5;this.controls.maxDistance=220;
      this.controls.minPolarAngle=0.02;this.controls.maxPolarAngle=Math.PI*0.492;
      this.controls.minAzimuthAngle=-Infinity;this.controls.maxAzimuthAngle=Infinity;
      this.controls.update();
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
  applyExteriorKeyboard(dt){
    if(this.interiorMode||dt<=0)return;
    const has=k=>this.extKeys.has(k);
    const yawDir=(has('q')?1:0)-(has('e')?1:0);
    const tiltDir=(has('f')?1:0)-(has('r')?1:0);
    const zoomDir=(has('-')||has('_')?1:0)-(has('+')||has('=')?1:0);
    const moveF=(has('w')?1:0)-(has('s')?1:0);
    const moveS=(has('d')?1:0)-(has('a')?1:0);
    const autoYaw=this.autoTurntable?0.42*dt:0;

    if(yawDir!==0||tiltDir!==0||zoomDir!==0||autoYaw!==0){
      this.orbitExteriorBy(yawDir*1.55*dt+autoYaw,tiltDir*1.15*dt,1+zoomDir*0.85*dt);
    }
    if(moveF!==0||moveS!==0){
      const fwd=new THREE.Vector3();this.camera.getWorldDirection(fwd);fwd.y=0;
      if(fwd.lengthSq()<0.001)fwd.set(0,0,-1);else fwd.normalize();
      const right=new THREE.Vector3(-fwd.z,0,fwd.x);
      const speed=28*dt;
      const delta=fwd.multiplyScalar(moveF*speed).addScaledVector(right,moveS*speed);
      if(this.getExploring()){
        this.controls.target.add(delta);
        this.camera.position.add(delta);
      }else{
        this.targetJourneyPanOffset.add(delta);
        this.hasCustomJourneyOrbit=true;
      }
    }
  }
  orbitExteriorBy(deltaAzimuth=0,deltaPolar=0,zoomFactor=1){
    if(this.interiorMode)return false;
    if(this.getExploring()){
      this.navigationFlight=null;
      const offset=this.camera.position.clone().sub(this.controls.target);
      const sph=new THREE.Spherical().setFromVector3(offset);
      sph.theta+=deltaAzimuth;
      sph.phi=THREE.MathUtils.clamp(sph.phi+deltaPolar,0.02,Math.PI*0.492);
      sph.radius=THREE.MathUtils.clamp(sph.radius*zoomFactor,3.5,220);
      offset.setFromSpherical(sph);
      this.camera.position.copy(this.controls.target).add(offset);
      if(this.camera.position.y<0.65)this.camera.position.y=0.65;
      this.controls.update();
    }else{
      this.targetJourneyAzimuth+=deltaAzimuth;
      this.targetJourneyPolar=THREE.MathUtils.clamp(this.targetJourneyPolar+deltaPolar,-1.45,1.45);
      this.targetJourneyDistanceScale=THREE.MathUtils.clamp(this.targetJourneyDistanceScale*zoomFactor,0.10,2.8);
      this.hasCustomJourneyOrbit=true;
    }
    return true;
  }
  setExteriorViewPreset(preset){
    if(this.interiorMode)this.exitInterior();
    if(preset==='reset'){
      this.resetExteriorView();
      return true;
    }
    const target=this.getExploring()?this.controls.target.clone():new THREE.Vector3(...sampleCamera(this.getProgress()).l).add(this.targetJourneyPanOffset);
    const currentDist=THREE.MathUtils.clamp(this.camera.position.distanceTo(target)||68,18,165);
    let theta=0,phi=0.82,dist=currentDist;
    if(preset==='north'){theta=0;phi=0.92;}
    else if(preset==='east'){theta=Math.PI*0.5;phi=0.92;}
    else if(preset==='south'){theta=Math.PI;phi=0.92;}
    else if(preset==='west'){theta=-Math.PI*0.5;phi=0.92;}
    else if(preset==='top'){theta=0;phi=0.04;dist=Math.max(currentDist,78);}
    else if(preset==='horizon'){
      const cur=new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(target));
      theta=cur.theta;phi=1.44;dist=Math.min(currentDist,54);
    }else if(preset==='iso'){theta=0.68;phi=0.78;dist=76;}
    else return false;

    if(this.getExploring()){
      const offset=new THREE.Vector3().setFromSpherical(new THREE.Spherical(dist,phi,theta));
      const toPos=target.clone().add(offset);
      if(toPos.y<0.8)toPos.y=0.8;
      this.navigationFlight={
        fromTarget:this.controls.target.clone(),toTarget:target,
        fromPosition:this.camera.position.clone(),toPosition:toPos,
        duration:this.reducedMotion?.01:0.75,elapsed:0
      };
    }else{
      const pose=sampleCamera(this.getProgress());
      const baseVec=new THREE.Vector3(...pose.p).sub(new THREE.Vector3(...pose.l));
      const baseSph=new THREE.Spherical().setFromVector3(baseVec);
      this.targetJourneyAzimuth=theta-baseSph.theta;
      this.targetJourneyPolar=phi-baseSph.phi;
      this.targetJourneyDistanceScale=THREE.MathUtils.clamp(dist/(baseSph.radius||65),0.15,2.5);
      this.hasCustomJourneyOrbit=true;
    }
    return true;
  }
  resetExteriorView(){
    this.autoTurntable=false;
    this.targetJourneyAzimuth=0;this.targetJourneyPolar=0;
    this.targetJourneyDistanceScale=1.0;
    this.targetJourneyPanOffset.set(0,0,0);
    this.hasCustomJourneyOrbit=false;
    if(this.getExploring()){
      const c=CHAPTERS[this.getChapter()]||CHAPTERS[0];
      const pose=sampleCamera(c.at);
      this.navigationFlight={
        fromTarget:this.controls.target.clone(),toTarget:new THREE.Vector3(...c.focus),
        fromPosition:this.camera.position.clone(),toPosition:new THREE.Vector3(...pose.p),
        duration:this.reducedMotion?.01:0.75,elapsed:0
      };
    }
    return true;
  }
  toggleAutoTurntable(force){
    this.autoTurntable=typeof force==='boolean'?force:!this.autoTurntable;
    return this.autoTurntable;
  }
  tick=(now)=>{
    if(document.hidden)return;
    const raw=this.previous?Math.max(0,(now-this.previous)/1000):1/60;this.previous=now;
    const dt=Math.min(raw,.075);this.time+=dt;this.syncExplore();
    this.applyExteriorKeyboard(dt);
    if(this.getExploring()){
      if(this.interiorMode)this.updateInteriorWalk(dt);
      else{
        this.controls.update(dt);
        this.updateExteriorNavigation(dt);
        this.syncTopViewQuality(dt);
      }
    }
    else{
      const orbitLerp=this.ready?1-Math.exp(-14*dt):1;
      this.journeyAzimuth+=(this.targetJourneyAzimuth-this.journeyAzimuth)*orbitLerp;
      this.journeyPolar+=(this.targetJourneyPolar-this.journeyPolar)*orbitLerp;
      this.journeyDistanceScale+=(this.targetJourneyDistanceScale-this.journeyDistanceScale)*orbitLerp;
      this.journeyPanOffset.lerp(this.targetJourneyPanOffset,orbitLerp);

      const pose=sampleCamera(this.getProgress()),mouse=this.getMouse();
      const baseTarget=new THREE.Vector3(...pose.l).add(this.journeyPanOffset);
      const baseOffset=new THREE.Vector3(...pose.p).sub(new THREE.Vector3(...pose.l));
      const sph=new THREE.Spherical().setFromVector3(baseOffset);
      sph.theta+=this.journeyAzimuth;
      sph.phi=THREE.MathUtils.clamp(sph.phi+this.journeyPolar,0.03,Math.PI*0.492);
      sph.radius=THREE.MathUtils.clamp(sph.radius*this.journeyDistanceScale,3.5,220);
      baseOffset.setFromSpherical(sph);

      const parallaxScale=this.hasCustomJourneyOrbit?0.25:1.0;
      this.desired.copy(baseTarget).add(baseOffset);
      this.desired.x+=mouse.x*1.1*parallaxScale;
      this.desired.y=Math.max(0.65,this.desired.y+mouse.y*.45*parallaxScale);
      this.targetLook.copy(baseTarget);
      this.targetLook.x+=mouse.x*.35*parallaxScale;
      this.targetLook.y+=mouse.y*.1*parallaxScale;

      const k=this.ready?1-Math.exp(-(this.hasCustomJourneyOrbit?12:3.3)*dt):1;
      this.camera.position.lerp(this.desired,k);this.look.lerp(this.targetLook,k);this.camera.lookAt(this.look);
      this.camera.fov+=(pose.f-this.camera.fov)*k;this.camera.updateProjectionMatrix();
    }
    if(!this.reducedMotion){
      this.campus.animate(this.time);

      this.interiors.update(this.time);
    }
    if(this.composer)this.composer.render();else this.renderer.render(this.scene,this.camera);
    this.onFrame?.();
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

  // The existing OrbitControls remains the exterior camera owner.
  updateExteriorNavigation(dt){
    if(this.navigationFlight){
      const f=this.navigationFlight;
      f.elapsed+=dt;
      const u=THREE.MathUtils.clamp(f.elapsed/f.duration,0,1);
      const e=u*u*(3-2*u);
      this.controls.target.copy(f.fromTarget).lerp(f.toTarget,e);
      this.camera.position.copy(f.fromPosition).lerp(f.toPosition,e);
      this.controls.update();
      if(u>=1)this.navigationFlight=null;
    }
    // Pan the target and camera together within generous island bounds so any-angle exploration is unrestricted.
    const before=this.controls.target.clone();
    this.controls.target.x=THREE.MathUtils.clamp(this.controls.target.x,-72,72);
    this.controls.target.y=THREE.MathUtils.clamp(this.controls.target.y,.2,32);
    this.controls.target.z=THREE.MathUtils.clamp(this.controls.target.z,-122,72);
    this.camera.position.add(this.controls.target.clone().sub(before));
    if(this.camera.position.y<0.65)this.camera.position.y=0.65;
    this.controls.update();
  }
  focusFacility(id){
    const def=this.interiors.get(id);
    if(!def)return false;
    if(this.interiorMode)this.exitInterior();
    const target=new THREE.Vector3(def.x,Math.min(def.h*.5,4),def.z);
    const position=new THREE.Vector3(def.x+Math.min(21,def.w*.82),12,def.z+Math.min(22,def.d*1.4));
    if(this.getExploring()){
      this.controls.enabled=true;
      this.controls.minDistance=3.5;this.controls.maxDistance=220;
      this.navigationFlight={
        fromTarget:this.controls.target.clone(),toTarget:target,
        fromPosition:this.camera.position.clone(),toPosition:position,
        duration:this.reducedMotion?.01:1.15,elapsed:0
      };
    }else{
      const pose=sampleCamera(this.getProgress());
      this.targetJourneyPanOffset.copy(target).sub(new THREE.Vector3(...pose.l));
      this.hasCustomJourneyOrbit=true;
    }
    return true;
  }
  enterInterior(id){
    if(!this.getExploring())return false;
    const def=this.interiors.get(id);
    const spawn=this.interiors.start(id);
    if(!def||!spawn||!this.interiors.canMove(id,spawn.x,spawn.z))return false;
    if(this.interiorMode)this.exitInterior();
    this.navigationFlight=null;
    this.savedExteriorPose={
      position:this.camera.position.clone(),target:this.controls.target.clone(),
      min:this.controls.minDistance,max:this.controls.maxDistance,fov:this.camera.fov,
      sunCastShadow:this.lighting.sun.castShadow,
      envIntensity:this.scene.environmentIntensity,
      exposure:this.renderer.toneMappingExposure,
      fogColor:this.scene.fog.color.clone(),
      fogDensity:this.scene.fog.density
    };
    this.currentInterior=id;
    this.interiorMode=true;
    this.walkKeys.clear();
    this.interiorWheelForward=0;
    this.interiorWheelStrafe=0;
    this.interiorEyeY=1.7;this.targetInteriorEyeY=1.7;
    this.interiorFov=64;this.targetInteriorFov=64;
    this.controls.enabled=false;
    this.campus.root.visible=false;
    this.lighting.sun.castShadow=false;
    this.scene.environmentIntensity=1.26;
    this.renderer.toneMappingExposure=1.10;
    this.scene.fog.color.setHex(def.kind==='compute'?(def.variant===0?0x1b3442:def.variant===1?0x0c2820:0x261d11):0x1b2e33);
    this.scene.fog.density=.0075;
    if(this.bloomPass){this.bloomPass.strength=.22;this.bloomPass.threshold=.82;}
    this.interiors.setActive(id);
    this.camera.position.copy(spawn);
    this.camera.fov=64;this.camera.updateProjectionMatrix();
    this.interiorYaw=def.yaw;this.interiorPitch=0;
    this.targetInteriorYaw=def.yaw;this.targetInteriorPitch=0;
    this.interiorPivotCenter.set(
      spawn.x-Math.sin(def.yaw)*this.interiorPivotDistance,
      1.7,
      spawn.z-Math.cos(def.yaw)*this.interiorPivotDistance
    );
    if(this.topViewHighRes){this.topViewHighRes=false;this.resize();}
    this.updateInteriorWalk(0);
    this.onInteriorChange?.();
    return true;
  }
  resetInteriorPose(){
    if(!this.interiorMode||!this.currentInterior)return false;
    const def=this.interiors.get(this.currentInterior);
    const spawn=this.interiors.start(this.currentInterior);
    if(!def||!spawn)return false;
    this.camera.position.copy(spawn);
    this.interiorEyeY=1.7;this.targetInteriorEyeY=1.7;
    this.interiorFov=64;this.targetInteriorFov=64;
    this.interiorYaw=def.yaw;this.targetInteriorYaw=def.yaw;
    this.interiorPitch=0;this.targetInteriorPitch=0;
    this.interiorWheelForward=0;this.interiorWheelStrafe=0;
    this.interiorPivotCenter.set(
      spawn.x-Math.sin(def.yaw)*this.interiorPivotDistance,
      1.7,
      spawn.z-Math.cos(def.yaw)*this.interiorPivotDistance
    );
    this.updateInteriorWalk(0);
    return true;
  }
  setInteriorPivotMode(enabled){
    this.interiorPivotMode=!!enabled;
    if(this.interiorMode){
      const cy=Math.cos(this.interiorPitch);
      this.interiorPivotCenter.set(
        this.camera.position.x-Math.sin(this.interiorYaw)*cy*this.interiorPivotDistance,
        this.camera.position.y+Math.sin(this.interiorPitch)*this.interiorPivotDistance,
        this.camera.position.z-Math.cos(this.interiorYaw)*cy*this.interiorPivotDistance
      );
    }
    this.onInteriorChange?.();
    return this.interiorPivotMode;
  }
  exitInterior(){
    if(!this.interiorMode)return false;
    this.walkKeys.clear();this.lookPointer=null;
    this.interiorWheelForward=0;this.interiorWheelStrafe=0;
    this.interiors.setActive(null);
    this.interiorMode=false;this.currentInterior=null;
    this.campus.root.visible=true;
    this.controls.enabled=this.getExploring();
    const save=this.savedExteriorPose;this.savedExteriorPose=null;
    if(save){
      this.camera.position.copy(save.position);this.controls.target.copy(save.target);
      this.controls.minDistance=save.min;this.controls.maxDistance=save.max;
      this.camera.fov=save.fov;this.camera.updateProjectionMatrix();
      this.lighting.sun.castShadow=save.sunCastShadow;
      this.scene.environmentIntensity=save.envIntensity;
      this.renderer.toneMappingExposure=save.exposure;
      this.scene.fog.color.copy(save.fogColor);
      this.scene.fog.density=save.fogDensity;
      if(this.bloomPass){this.bloomPass.strength=.13;this.bloomPass.threshold=1.1;}
      this.controls.update();
    }
    this.onInteriorChange?.();
    return true;
  }
  setWalkAction(key,down){
    if(!['w','a','s','d','q','e'].includes(key))return;
    if(down&&this.interiorMode)this.walkKeys.add(key);
    else this.walkKeys.delete(key);
  }
  nudgeInteriorYaw(deltaYaw,deltaPitch=0){
    if(!this.interiorMode)return;
    this.targetInteriorYaw+=deltaYaw;
    this.targetInteriorPitch=THREE.MathUtils.clamp(this.targetInteriorPitch+deltaPitch,-1.18,1.18);
  }
  updateInteriorWalk(dt){
    if(!this.interiorMode)return;
    const keys=this.walkKeys,pressed=(...k)=>k.some(key=>keys.has(key));
    const forward=(pressed('w','arrowup')?1:0)-(pressed('s','arrowdown')?1:0);
    const strafe=(pressed('d','arrowright')?1:0)-(pressed('a','arrowleft')?1:0);
    const turn=(pressed('q')?1:0)-(pressed('e')?1:0);
    if(turn!==0&&dt>0){
      this.targetInteriorYaw+=turn*1.65*dt;
    }
    const lookLerp=dt>0?1-Math.exp(-18*dt):1;
    this.interiorYaw+=(this.targetInteriorYaw-this.interiorYaw)*lookLerp;
    this.interiorPitch+=(this.targetInteriorPitch-this.interiorPitch)*lookLerp;
    this.interiorEyeY+=(this.targetInteriorEyeY-this.interiorEyeY)*lookLerp;
    if(Math.abs(this.camera.fov-this.targetInteriorFov)>0.02){
      this.camera.fov+=(this.targetInteriorFov-this.camera.fov)*lookLerp;
      this.camera.updateProjectionMatrix();
    }

    const len=Math.hypot(forward,strafe)||1;
    const speed=pressed('shift')?4.8:2.85,step=speed*dt/len;
    const wheelStepF=this.interiorWheelForward*dt;
    const wheelStepS=this.interiorWheelStrafe*dt;
    if(dt>0){
      const decay=Math.exp(-6.5*dt);
      this.interiorWheelForward*=decay;
      this.interiorWheelStrafe*=decay;
      if(Math.abs(this.interiorWheelForward)<0.005)this.interiorWheelForward=0;
      if(Math.abs(this.interiorWheelStrafe)<0.005)this.interiorWheelStrafe=0;
    }

    const totalForward=forward*step+wheelStepF;
    const totalStrafe=strafe*step+wheelStepS;
    const dx=-Math.sin(this.interiorYaw)*totalForward+Math.cos(this.interiorYaw)*totalStrafe;
    const dz=-Math.cos(this.interiorYaw)*totalForward-Math.sin(this.interiorYaw)*totalStrafe;
    if(this.interiorPivotMode&&Math.abs(wheelStepF)>0.0001){
      this.targetInteriorEyeY=THREE.MathUtils.clamp(
        this.targetInteriorEyeY+Math.sin(this.interiorPitch)*wheelStepF*0.35,
        1.05,3.25
      );
    }

    const x=this.camera.position.x+dx,z=this.camera.position.z+dz;
    if(this.interiors.canMove(this.currentInterior,x,this.camera.position.z))this.camera.position.x=x;
    if(this.interiors.canMove(this.currentInterior,this.camera.position.x,z))this.camera.position.z=z;
    this.camera.position.y=this.interiorEyeY;
    const cy=Math.cos(this.interiorPitch);
    this.camera.lookAt(
      this.camera.position.x-Math.sin(this.interiorYaw)*cy,
      this.camera.position.y+Math.sin(this.interiorPitch),
      this.camera.position.z-Math.cos(this.interiorYaw)*cy
    );
  }
  setLightingMode(mode){
    if(mode!=='day'&&mode!=='golden')return false;
    const sun=this.lighting.sun,day=this.daylight;
    if(mode==='golden'){
      sun.position.set(-72,33,63);sun.color.setHex(0xffd3a0);sun.intensity=2.55;
      if(day.hemi)day.hemi.intensity=.45;
      this.scene.background.setHex(0x53675d);this.scene.fog.color.setHex(0x657568);
    }else{
      sun.position.copy(day.sunPosition);sun.color.copy(day.sunColor);sun.intensity=day.sunIntensity;
      if(day.hemi)day.hemi.intensity=.64;
      this.scene.background.copy(day.background);this.scene.fog.color.copy(day.fog);
    }
    return true;
  }
  start(){this.previous=0;this.renderer.setAnimationLoop(this.tick);}
  dispose(){
    this.renderer.setAnimationLoop(null);removeEventListener('resize',this.onResize);
    document.removeEventListener('visibilitychange',this.onVisibility);
    window.removeEventListener('keydown',this.onInteriorKeyDown);
    window.removeEventListener('keyup',this.onInteriorKeyUp);
    window.removeEventListener('blur',this.onInteriorBlur);
    const el=this.controls.domElement;
    el.removeEventListener('contextmenu',this.onInteriorContextMenu);
    el.removeEventListener('pointerdown',this.onExplorePointerDown);
    el.removeEventListener('pointerdown',this.onInteriorPointerDown);
    el.removeEventListener('pointermove',this.onInteriorPointerMove);
    el.removeEventListener('pointerup',this.onInteriorPointerUp);
    el.removeEventListener('pointercancel',this.onInteriorPointerUp);
    el.removeEventListener('wheel',this.onInteriorWheel);
    el.removeEventListener('dblclick',this.onInteriorDblClick);
    this.controls.dispose();this.interiors.dispose();

    this.disposePost();this.campus.dispose();this.lighting.dispose();this.renderer.dispose();
    if(window.__campusScene===this)delete window.__campusScene;
  }
}
export function detectQuality(){
  try{
    const canvas=document.createElement('canvas'),gl=canvas.createContext?canvas.createContext('webgl2'):canvas.getContext('webgl2');
    if(!gl)return 'fallback';gl.getExtension('WEBGL_lose_context')?.loseContext();
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return 'lite';
    return (navigator.hardwareConcurrency||4)<=2||(navigator.deviceMemory||4)<=2||innerWidth<560?'lite':'high';
  }catch{return 'fallback';}
}
