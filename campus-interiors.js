import * as THREE from 'three';
import {enhanceInterior,POLISH_REVISION} from './interior-polish.js';

/**
 * Explorable process and operations interiors embedded inside the existing
 * Convalt hall envelopes. No exterior node or site transform is modified.
 * World coordinates, dimensions and campus scale are inherited from V5.4.5.
 */
export const INTERIOR_REVISION = 'convalt-interior-exterior-v1.2.0';
export const INTERIOR_SPACES = Object.freeze([
  {id:'manufacturing',label:'Manufacturing plant',short:'Manufacturing',kind:'factory',x:-16,z:35,w:34,d:18,h:7,yaw:0,
   entrance:[0,0],description:'Illustrative HJT manufacturing flow, service lanes and production equipment.'},
  {id:'headquarters',label:'Convalt Energy HQ & Grid Control',short:'Energy HQ',kind:'office',x:9,z:34,w:11,d:11,h:5,yaw:0,
   entrance:[0,2.8],description:'Executive energy command center, 3D campus digital-twin table and microgrid SCADA wall.'},
  {id:'compute-01',label:'Compute hall 01',short:'Compute 01',kind:'compute',variant:0,x:11,z:-45,w:29,d:9,h:6.4,yaw:-Math.PI/2,
   entrance:[-10,0],description:'Server racks, cooling flow and controlled access aisles.'},
  {id:'compute-02',label:'Compute hall 02',short:'Compute 02',kind:'compute',variant:1,x:11,z:-58,w:29,d:9,h:6.4,yaw:-Math.PI/2,
   entrance:[-10,0],description:'Compute racks, power distribution and cooling instrumentation.'},
  {id:'compute-03',label:'Compute hall 03',short:'Compute 03',kind:'compute',variant:2,x:11,z:-71,w:29,d:9,h:6.4,yaw:-Math.PI/2,
   entrance:[-10,0],description:'Network cabinets, power cabinets and service monitoring.'},
  {id:'recycling',label:'Material recycling plant',short:'Recycling',kind:'recycling',x:-12,z:-89,w:27,d:17,h:6.8,yaw:0,
   entrance:[-1.8,0],description:'Sorting stations, recovered-material handling and protected inspection aisles.'}
]);

const BODY_RADIUS=.34;
function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
export function withinInterior(meta,x,z,obstacles=[],radius=BODY_RADIUS){
  const lx=x-meta.x,lz=z-meta.z;
  if(Math.abs(lx)>meta.w/2-.9-radius || Math.abs(lz)>meta.d/2-.9-radius)return false;
  return !obstacles.some(o=>lx+radius>o[0]&&lx-radius<o[1]&&lz+radius>o[2]&&lz-radius<o[3]);
}

function buildInteriorSurfaceMaps(textures) {
  const makeCanvas=(w,h,draw,srgb=true,repeatX=1,repeatY=1)=>{
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const ctx=c.getContext('2d');
    if(ctx)draw(ctx,w,h);
    const t=new THREE.CanvasTexture(c);
    t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
    t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.repeat.set(repeatX,repeatY);
    textures.push(t);
    return t;
  };

  // 1A. Manufacturing Plant Floor (1024x1024): ISO-7 Cleanroom Terrazzo Epoxy with Copper ESD Grid & AGV Target Markers
  const epoxyAlbedo=makeCanvas(1024,1024,(ctx,w,h)=>{
    const g=ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0,'#8ea6ac');g.addColorStop(0.5,'#829ba2');g.addColorStop(1,'#94aeb4');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    const tile=256;
    let s=193;const rnd=()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};
    for(let ty=0;ty<h;ty+=tile)for(let tx=0;tx<w;tx+=tile){
      ctx.fillStyle=((tx/tile)+(ty/tile))%2===0?'rgba(230,245,248,0.12)':'rgba(20,40,48,0.06)';
      ctx.fillRect(tx+3,ty+3,tile-6,tile-6);
      // Recessed copper/brass ESD grounding grid seam & dark joint
      ctx.strokeStyle='#2c4248';ctx.lineWidth=4;
      ctx.strokeRect(tx+2,ty+2,tile-4,tile-4);
      ctx.strokeStyle='rgba(92,225,230,0.38)';ctx.lineWidth=1.5;
      ctx.strokeRect(tx+8,ty+8,tile-16,tile-16);
      // Corner cleanroom optical fiducial crosshairs
      ctx.strokeStyle='rgba(200,145,88,0.55)';ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(tx+22,ty+14);ctx.lineTo(tx+22,ty+30);
      ctx.moveTo(tx+14,ty+22);ctx.lineTo(tx+30,ty+22);
      ctx.stroke();
    }
    // Fine terrazzo quartz & mica micro-chips
    for(let i=0;i<3200;i++){
      const x=rnd()*w,y=rnd()*h,r=1.2+rnd()*2.8;
      ctx.fillStyle=rnd()>0.45?'rgba(235,248,252,0.14)':'rgba(22,42,48,0.12)';
      ctx.fillRect(x,y,r,r);
    }
  },true,12,7);

  // 1B. Material Recycling Plant Floor (1024x1024): Heavy-Duty Basalt Aggregate & Steel Diamond-Tread Industrial Floor
  const recyclingFloorAlbedo=makeCanvas(1024,1024,(ctx,w,h)=>{
    const g=ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0,'#2b383a');g.addColorStop(0.5,'#232f31');g.addColorStop(1,'#2e3c3e');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    const tile=256;
    let s=577;const rnd=()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};
    for(let ty=0;ty<h;ty+=tile)for(let tx=0;tx<w;tx+=tile){
      const isPlate=((tx/tile)+(ty/tile))%2===0;
      ctx.fillStyle=isPlate?'#324245':'#263336';
      ctx.fillRect(tx+4,ty+4,tile-8,tile-8);
      ctx.strokeStyle='#11191b';ctx.lineWidth=5;
      ctx.strokeRect(tx+2.5,ty+2.5,tile-5,tile-5);
      ctx.strokeStyle='rgba(232,196,88,0.32)';ctx.lineWidth=2;
      ctx.strokeRect(tx+10,ty+10,tile-20,tile-20);
      if(isPlate){
        // Heavy steel diamond-plate anti-wear texture
        ctx.fillStyle='rgba(175,205,210,0.16)';
        for(let py=ty+26;py<ty+tile-22;py+=22){
          for(let px=tx+26;px<tx+tile-22;px+=22){
            ctx.fillRect(px,py,9,3);
            ctx.fillRect(px+10,py+10,3,9);
          }
        }
      }
      // Corner anchor bolts
      for(const [cx,cy] of [[18,18],[tile-18,18],[18,tile-18],[tile-18,tile-18]]){
        ctx.fillStyle='#8fa4a8';
        ctx.beginPath();ctx.arc(tx+cx,ty+cy,5,0,Math.PI*2);ctx.fill();
      }
    }
    for(let i=0;i<2400;i++){
      const x=rnd()*w,y=rnd()*h,r=1.5+rnd()*3.0;
      ctx.fillStyle=rnd()>0.5?'rgba(180,205,200,0.06)':'rgba(10,16,18,0.14)';
      ctx.fillRect(x,y,r,r);
    }
  },true,10,6);

  const epoxyRough=makeCanvas(256,256,(ctx,w,h)=>{
    ctx.fillStyle='#525252';ctx.fillRect(0,0,w,h);
    let s=701;const rnd=()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};
    for(let i=0;i<900;i++){
      const v=62+Math.floor(rnd()*38);
      ctx.fillStyle=`rgb(${v},${v},${v})`;
      ctx.fillRect(rnd()*w,rnd()*h,4+rnd()*10,4+rnd()*10);
    }
    ctx.strokeStyle='#b0b0b0';ctx.lineWidth=3;ctx.strokeRect(1,1,w-2,h-2);
  },false,10,6);

  // 2A. Compute Hall 01 Floor (1024x1024): Arctic Cleanroom White & Sapphire-Cyan 600mm Pedestal Grid
  const raisedCompute0=makeCanvas(1024,1024,(ctx,w,h)=>{
    ctx.fillStyle='#9eb8c4';ctx.fillRect(0,0,w,h);
    const tile=256;
    for(let ty=0;ty<h;ty+=tile)for(let tx=0;tx<w;tx+=tile){
      const isPerf=((tx/tile)+(ty/tile))%2===0;
      const g=ctx.createLinearGradient(tx,ty,tx+tile,ty+tile);
      g.addColorStop(0,isPerf?'#dcebf2':'#cddfe8');
      g.addColorStop(0.5,isPerf?'#d0e2ec':'#c2d6e0');
      g.addColorStop(1,isPerf?'#e2f0f6':'#d4e6ef');
      ctx.fillStyle=g;
      ctx.fillRect(tx+4,ty+4,tile-8,tile-8);
      // Brushed aluminum pedestal bezel & dark gasket seam
      ctx.strokeStyle='#385464';ctx.lineWidth=5;
      ctx.strokeRect(tx+2.5,ty+2.5,tile-5,tile-5);
      ctx.strokeStyle='#eef8fc';ctx.lineWidth=2;
      ctx.strokeRect(tx+7,ty+7,tile-14,tile-14);
      ctx.strokeStyle='rgba(45,195,225,0.55)';ctx.lineWidth=2;
      ctx.strokeRect(tx+14,ty+14,tile-28,tile-28);
      // Corner stainless lock screws
      for(const [cx,cy] of [[18,18],[tile-18,18],[18,tile-18],[tile-18,tile-18]]){
        ctx.fillStyle='#5c7c8c';
        ctx.beginPath();ctx.arc(tx+cx,ty+cy,5,0,Math.PI*2);ctx.fill();
      }
      if(isPerf){
        // High-density cold-aisle venturi airflow perforations with sapphire sub-floor glow
        for(let py=ty+34;py<ty+tile-30;py+=22){
          for(let px=tx+34;px<tx+tile-30;px+=22){
            ctx.fillStyle='#0d2b3a';
            ctx.fillRect(px,py,10,10);
            ctx.fillStyle='#4be2f2';
            ctx.fillRect(px+2,py+2,4,4);
          }
        }
      } else {
        // Solid cleanroom anti-static tile with subtle diagonal telemetry crosshair
        ctx.strokeStyle='rgba(80,130,150,0.22)';ctx.lineWidth=1.5;
        ctx.beginPath();
        ctx.moveTo(tx+28,ty+tile/2);ctx.lineTo(tx+tile-28,ty+tile/2);
        ctx.moveTo(tx+tile/2,ty+28);ctx.lineTo(tx+tile/2,ty+tile-28);
        ctx.stroke();
      }
    }
  },true,14,5);

  // 2B. Compute Hall 02 Floor (1024x1024): Hydro-Thermal Emerald-Teal & Brushed Stainless Grating Grid
  const raisedCompute1=makeCanvas(1024,1024,(ctx,w,h)=>{
    ctx.fillStyle='#081815';ctx.fillRect(0,0,w,h);
    const tile=256;
    for(let ty=0;ty<h;ty+=tile)for(let tx=0;tx<w;tx+=tile){
      const isGrate=((tx/tile)+(ty/tile))%2===0;
      const g=ctx.createLinearGradient(tx,ty,tx+tile,ty+tile);
      g.addColorStop(0,isGrate?'#173a33':'#122e28');
      g.addColorStop(1,isGrate?'#1e463e':'#173831');
      ctx.fillStyle=g;
      ctx.fillRect(tx+4,ty+4,tile-8,tile-8);
      ctx.strokeStyle='#05100d';ctx.lineWidth=5;
      ctx.strokeRect(tx+2.5,ty+2.5,tile-5,tile-5);
      // Copper & emerald perimeter seal frame
      ctx.strokeStyle='#b87c4c';ctx.lineWidth=2.5;
      ctx.strokeRect(tx+9,ty+9,tile-18,tile-18);
      ctx.strokeStyle='rgba(56,239,155,0.48)';ctx.lineWidth=1.5;
      ctx.strokeRect(tx+16,ty+16,tile-32,tile-32);
      if(isGrate){
        // Heavy-duty stainless-steel bar grating over emerald sub-floor coolant plenum
        for(let py=ty+28;py<ty+tile-24;py+=18){
          ctx.fillStyle='#04100d';
          ctx.fillRect(tx+28,py,tile-56,9);
          ctx.fillStyle='#88b8ac';
          ctx.fillRect(tx+28,py+9,tile-56,4);
          ctx.fillStyle='rgba(56,239,155,0.35)';
          ctx.fillRect(tx+36,py+2,tile-72,3);
        }
      } else {
        // Anti-slip diamond tread plate pattern
        ctx.fillStyle='rgba(160,220,205,0.18)';
        for(let py=ty+32;py<ty+tile-28;py+=24){
          for(let px=tx+32;px<tx+tile-28;px+=24){
            ctx.fillRect(px,py,8,3);
            ctx.fillRect(px+10,py+10,3,8);
          }
        }
      }
      for(const [cx,cy] of [[18,18],[tile-18,18],[18,tile-18],[tile-18,tile-18]]){
        ctx.fillStyle='#c88a54';
        ctx.beginPath();ctx.arc(tx+cx,ty+cy,5,0,Math.PI*2);ctx.fill();
      }
    }
  },true,14,5);

  // 2C. Compute Hall 03 Floor (1024x1024): Industrial Graphite, Copper Grounding & HV Gold Dielectric Grid
  const raisedCompute2=makeCanvas(1024,1024,(ctx,w,h)=>{
    ctx.fillStyle='#12100c';ctx.fillRect(0,0,w,h);
    const tile=256;
    for(let ty=0;ty<h;ty+=tile)for(let tx=0;tx<w;tx+=tile){
      const isRibbed=((tx/tile)+(ty/tile))%2===0;
      const g=ctx.createLinearGradient(tx,ty,tx+tile,ty+tile);
      g.addColorStop(0,isRibbed?'#2a241b':'#221d15');
      g.addColorStop(1,isRibbed?'#332b20':'#282219');
      ctx.fillStyle=g;
      ctx.fillRect(tx+4,ty+4,tile-8,tile-8);
      ctx.strokeStyle='#090806';ctx.lineWidth=5;
      ctx.strokeRect(tx+2.5,ty+2.5,tile-5,tile-5);
      ctx.strokeStyle='#d4a24c';ctx.lineWidth=2.5;
      ctx.strokeRect(tx+10,ty+10,tile-20,tile-20);
      if(isRibbed){
        // Ribbed 35kV dielectric rubberized traction grooves
        for(let py=ty+26;py<ty+tile-22;py+=14){
          ctx.fillStyle='#14110c';
          ctx.fillRect(tx+24,py,tile-48,6);
          ctx.fillStyle='rgba(245,200,110,0.22)';
          ctx.fillRect(tx+24,py+6,tile-48,2);
        }
      } else {
        // Copper earthing mesh inlay & HV caution corner chevrons
        ctx.strokeStyle='rgba(205,140,75,0.28)';ctx.lineWidth=2;
        ctx.strokeRect(tx+28,ty+28,tile-56,tile-56);
        ctx.beginPath();
        ctx.moveTo(tx+28,ty+28);ctx.lineTo(tx+tile-28,ty+tile-28);
        ctx.moveTo(tx+tile-28,ty+28);ctx.lineTo(tx+28,ty+tile-28);
        ctx.stroke();
      }
      for(const [cx,cy] of [[20,20],[tile-20,20],[20,tile-20],[tile-20,tile-20]]){
        ctx.fillStyle='#f0c254';
        ctx.beginPath();ctx.arc(tx+cx,ty+cy,6,0,Math.PI*2);ctx.fill();
      }
    }
  },true,14,5);

  // 3. Architectural Acoustic Micro-Ribbed Wall Cladding
  const wallAlbedo=makeCanvas(512,512,(ctx,w,h)=>{
    ctx.fillStyle='#899a98';ctx.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=16){
      ctx.fillStyle=y%32===0?'#94a5a3':'#7e8f8d';
      ctx.fillRect(0,y,w,12);
      ctx.fillStyle='rgba(24,38,40,0.28)';
      ctx.fillRect(0,y+12,w,4);
    }
    for(let x=0;x<w;x+=128){
      ctx.fillStyle='rgba(28,42,44,0.35)';
      ctx.fillRect(x,0,3,h);
    }
  },true,8,2);

  return {epoxyAlbedo,recyclingFloorAlbedo,epoxyRough,raisedCompute0,raisedCompute1,raisedCompute2,wallAlbedo};
}

export function createCampusInteriors(scene,{high=true}={}){
  const root=new THREE.Group();
  root.name='conceptual-walkable-interiors';
  scene.add(root);
  const shapes=new Map(), materials=[], textures=[], zones=new Map(), animated=[], lamps=[],polishStages=[];
  const surf=buildInteriorSurfaceMaps(textures);

  const mat=(hex,metalness=0,roughness=.68,emissive=0x000000,eIntensity=0,extra={})=>
    {const m=new THREE.MeshStandardMaterial({
      color:hex,metalness,roughness,emissive,emissiveIntensity:eIntensity,
      envMapIntensity:metalness>0.3?1.4:1.05,
      ...extra
    });materials.push(m);return m;};

  const finish=mat(0x6d8582,.42,.38),
    floorEpoxy=mat(0xffffff,.26,.24,0x06161c,.05,{map:surf.epoxyAlbedo,roughnessMap:surf.epoxyRough}),
    floorRecycling=mat(0xffffff,.42,.28,0x081412,.05,{map:surf.recyclingFloorAlbedo,roughnessMap:surf.epoxyRough}),
    floorCompute0=mat(0xffffff,.38,.22,0x061a24,.08,{map:surf.raisedCompute0,roughnessMap:surf.epoxyRough}),
    floorCompute1=mat(0xffffff,.58,.24,0x041c15,.10,{map:surf.raisedCompute1,roughnessMap:surf.epoxyRough}),
    floorCompute2=mat(0xffffff,.46,.28,0x1c1406,.08,{map:surf.raisedCompute2,roughnessMap:surf.epoxyRough}),
    ceiling=mat(0xb8c6c2,.22,.56),
    ceilingCompute0=mat(0xdcecf2,.28,.38),
    ceilingCompute1=mat(0x1e3d36,.42,.44),
    ceilingCompute2=mat(0x332b20,.36,.48),
    wall=mat(0xffffff,.18,.52,0x000000,0,{map:surf.wallAlbedo}),
    wallCompute0=mat(0xdff2f8,.24,.40,0x000000,0,{map:surf.wallAlbedo}),
    wallCompute1=mat(0x74a89a,.32,.44,0x000000,0,{map:surf.wallAlbedo}),
    wallCompute2=mat(0xb8a484,.28,.48,0x000000,0,{map:surf.wallAlbedo}),
    steel=mat(0x8fa4a8,.82,.24),
    dark=mat(0x1b2b31,.56,.32),
    rackBody0=mat(0xd8e6ec,.46,.24),
    rackBody1=mat(0x112b25,.62,.28),
    rackBody2=mat(0x241e16,.52,.34),
    rubber=mat(0x152124,.10,.78),
    glass=mat(0x18364a,.20,.14,0x092334,.18),
    copper=mat(0xc28658,.84,.24),
    hazard=mat(0xe8bd52,.18,.36,0x4a3204,.18),
    lit=mat(0xe2f4e8,.08,.20,0xc5e5b3,.88),
    blue=mat(0x6ce8ff,.14,.22,0x14b8e0,.92),
    green=mat(0x64f0b4,.14,.24,0x1eb874,.88),
    amberLit=mat(0xffd278,.12,.22,0xd99218,.92);

  function geo(w,h,d){
    const key=[w,h,d].join('/');
    if(!shapes.has(key))shapes.set(key,new THREE.BoxGeometry(w,h,d));
    return shapes.get(key);
  }
  function box(group,x,y,z,w,h,d,m=steel){
    const mesh=new THREE.Mesh(geo(w,h,d),m);mesh.position.set(x,y,z);
    mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  function line(group,a,b,width,m=steel){
    const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),dir=q.clone().sub(p);
    const item=box(group,...p.clone().add(q).multiplyScalar(.5).toArray(),width,dir.length(),width,m);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return item;
  }
  function cylinder(group,x,y,z,radius,height,m=steel){
    const key='c/'+radius+'/'+height;let g=shapes.get(key);
    if(!g){g=new THREE.CylinderGeometry(radius,radius,height,high?16:10);shapes.set(key,g);}
    const item=new THREE.Mesh(g,m);item.position.set(x,y,z);item.castShadow=false;item.receiveShadow=true;group.add(item);return item;
  }
  function register(zone,x,z,w,d){zone.obstacles.push([x-w/2,x+w/2,z-d/2,z+d/2]);}
  function room(def){
    const g=new THREE.Group();g.name='interior-'+def.id;g.position.set(def.x,0,def.z);g.visible=false;root.add(g);
    const zone={meta:def,group:g,obstacles:[]};zones.set(def.id,zone);
    const hw=def.w/2-.34,hd=def.d/2-.34;
    const isComp=def.kind==='compute',v=def.variant||0;
    const floorMat=isComp?(v===0?floorCompute0:v===1?floorCompute1:floorCompute2):(def.kind==='recycling'?floorRecycling:floorEpoxy);
    const ceilMat=isComp?(v===0?ceilingCompute0:v===1?ceilingCompute1:ceilingCompute2):ceiling;
    const wallMat=isComp?(v===0?wallCompute0:v===1?wallCompute1:wallCompute2):wall;
    const stripLit=isComp?(v===0?blue:v===1?green:amberLit):lit;
    // Internal finish surfaces are inset from the existing solid external shell.
    box(g,0,.435,0,def.w-.65,.09,def.d-.65,floorMat);
    box(g,0,def.h-.30,0,def.w-.65,.06,def.d-.65,ceilMat);
    box(g,0,def.h/2,-hd,def.w-.65,def.h-.8,.07,wallMat);
    box(g,0,def.h/2, hd,def.w-.65,def.h-.8,.07,wallMat);
    box(g,-hw,def.h/2,0,.07,def.h-.8,def.d-.65,wallMat);
    box(g, hw,def.h/2,0,.07,def.h-.8,def.d-.65,wallMat);
    // Safety kick, ceiling cable rails, and ceiling-mounted light strips.
    for(const side of [-1,1]){
      box(g,0,.62,side*(hd-.06),def.w-.65,.16,.10,isComp&&v===1?copper:isComp&&v===2?hazard:dark);
      box(g,0,def.h-.65,side*1.3,def.w-3,.09,.17,isComp&&v===1?copper:steel);
      for(let x=-def.w/2+3;x<def.w/2-2;x+=5){
        box(g,x,def.h-.72,side*1.3,2.7,.055,.23,stripLit);
      }
    }
    if(def.kind!=='office'&&!isComp){
      for(let x=-def.w/2+2.5;x<def.w/2-1;x+=5){
        box(g,x,.494,0,.065,.010,2.8,hazard).castShadow=false;
      }
    }
    const lightHex=isComp?(v===0?0xc8f4ff:v===1?0xb4ffe0:0xffe4b4):0xd9eadc;
    const light=new THREE.PointLight(lightHex,high?3.2:1.5,24,1.7);
    light.position.set(0,def.h-1,0);light.castShadow=false;g.add(light);lamps.push(light);
    return zone;
  }
  function machine(zone,x,z,i){
    const g=zone.group;
    const w=3.0,d=1.7;
    // Sculpted vibration-isolated machine bed with cylindrical leveling feet & recessed service plinth
    for(const dx of [-1.28,0,1.28])for(const dz of [-.68,.68]){
      cylinder(g,x+dx,.52,z+dz,.09,.12,copper);
    }
    box(g,x,.64,z,w-.12,.22,d-.12,dark);
    box(g,x,1.06,z,w-.26,.54,d-.28,steel);
    box(g,x,1.44,z,w-.36,.16,d-.34,finish);
    // Cylindrical corner gantry columns instead of flat blocky slabs
    for(const sx of [-1,1])for(const sz of [-.58,.58]){
      cylinder(g,x+sx*1.30,1.82,z+sz,.065,.68,steel);
    }
    box(g,x,1.58,z,w-.5,.055,.68,rubber);
    // 6 precision transport rollers per station
    for(let j=0;j<6;j++){
      const roller=cylinder(g,x-1.15+j*.46,1.65,z,.085,.82,j%2===0?copper:steel);
      roller.rotation.x=Math.PI/2;animated.push({object:roller,axis:'x',speed:.65+(i%3)*.12,zone:zone.meta.id});
    }
    register(zone,x,z,w+.20,d+.3);
  }
  function rack(zone,x,z,variant,index){
    const g=zone.group,w=1.64,d=1.12;
    const dZ=z<0?1:-1;
    const bodyMat=variant===0?rackBody0:variant===1?rackBody1:rackBody2;
    const capMat=variant===0?steel:variant===1?copper:hazard;
    const trimMat=variant===0?steel:variant===1?copper:hazard;
    const status=(variant===0?blue:variant===1?green:amberLit);
    // Main cabinet body spans y=[0.44, 2.84]; top crown cap spans y=[2.85, 2.95] with stepped overhang to prevent Z-fighting
    box(g,x,1.64,z,w,2.40,d,bodyMat);
    box(g,x,1.64,z+dZ*.574,w-.16,2.24,.020,glass);
    for(let y=.78;y<2.68;y+=.22){
      box(g,x,y,z+dZ*.592,w-.24,.032,.012,trimMat);
    }
    box(g,x,2.90,z,w+.032,.10,d+.032,capMat);
    for(const side of [-1,1])box(g,x+side*.76,1.64,z+dZ*.592,.048,2.24,.014,trimMat);
    for(let j=0;j<5;j++){
      box(g,x+(j%2?-.76:.76),1.0+j*.32,z+dZ*.606,.036,.055,.010,status);
    }
    if(index%3===0)box(g,x,3.00,z,.80,.07,d-.16,variant===1?copper:finish);
    register(zone,x,z,w+.15,d+.16);
  }
  function recoveryCell(zone,x,z,index){
    const g=zone.group,w=3.15,d=2;
    // Sculpted tubular steel frame & rotating drum conveyor bed instead of simplistic solid boxes
    for(const dx of [-1.32,0,1.32])for(const dz of [-.76,.76]){
      cylinder(g,x+dx,.78,z+dz,.075,.64,dark);
    }
    box(g,x,.64,z,w-.32,.26,d-.36,dark);
    box(g,x,1.10,z,w-.24,.12,d-.38,rubber);
    // Rotating head & tail crowned conveyor drums + 5 troughing rollers
    for(let r=0;r<5;r++){
      const rx=x-1.20+r*.60;
      const drum=cylinder(g,rx,1.18,z,.11,1.42,r%2===0?copper:steel);
      drum.rotation.x=Math.PI/2;
      animated.push({object:drum,axis:'x',speed:.75+(index%3)*.15,zone:zone.meta.id});
    }
    // Cylindrical corner gantry stanchions supporting overhead separation assemblies
    for(const dx of [-1.28,1.28])for(const dz of [-.72,.72]){
      cylinder(g,x+dx,1.68,z+dz,.058,1.12,steel);
    }
    for(let i=0;i<3;i++){
      const block=cylinder(g,x-.9+i*.9,1.32,z+(i%2?.22:-.22),.18,.22,
        index%3===0?copper:index%3===1?finish:glass);
      if(index%2===0)animated.push({object:block,axis:'y',speed:.42,zone:zone.meta.id,oscillate:true});
    }
    register(zone,x,z,w+.16,d+.24);
  }
  for(const def of INTERIOR_SPACES){
    const zone=room(def);
    const g=zone.group;
    if(def.kind==='factory'){
      for(let i=0;i<6;i++)for(const side of [-1,1])machine(zone,-12+i*4.45,side*5.1,i);
      for(const x of [-12,0,12])box(g,x,3.65,0,2.2,.09,.10,lit);
      box(g,-14,2.25,0,.52,3.7,.3,finish);
    } else if(def.kind==='compute'){
      for(let i=0;i<10;i++)for(const side of [-1,1])rack(zone,-11+i*2.44,side*2.52,def.variant,i);
      for(let x=-12;x<12;x+=3.2){
        box(g,x,3.55,0,1.2,.11,.11,lit);
      }
      // Ceiling cable ladders, restrained and inside the approved shell.
      for(const z of [-3.58,3.58])for(let x=-11;x<12;x+=.72)box(g,x,4.25,z,.045,.07,.48,steel);
    } else if(def.kind==='office'){
      // Convalt Energy HQ & Grid Control Center (curtain-wall-office at x=9, z=34)
      // Register central holographic campus table and side operator consoles as obstacles
      register(zone,0,-.35,2.35,2.35);
      register(zone,-3.25,-1.55,1.65,2.10);
      register(zone, 3.25,-1.55,1.65,2.10);
    } else {
      for(let i=0;i<5;i++)for(const side of [-1,1])recoveryCell(zone,-9.2+i*4.6,side*4.65,i);
      for(const x of [-9,0,9]){
        cylinder(g,x,1.3,0,.20,1.15,steel);
        box(g,x,1.95,0,.65,.10,.65,hazard);
      }
      // Internal sorting drum is independent of the existing outdoor trommel.
      const drum=cylinder(g,-9,2.3,-6.1,.64,2.7,steel);
      drum.rotation.z=Math.PI/2;
      animated.push({object:drum,axis:'z',speed:.35,zone:def.id});
    }
    // All detail is local to the existing hall; no exterior geometry is touched.
    const stage=enhanceInterior(zone,def,{high});
    stage.zoneId=def.id;
    polishStages.push(stage);
  }
  let active=null;
  return {
    root,
    spaces:INTERIOR_SPACES,
    get active(){return active;},
    setActive(id){
      if(id!=null&&!zones.has(id))return false;
      active=id;
      for(const [key,zone] of zones)zone.group.visible=(key===id);
      return true;
    },
    get(id){return zones.get(id)?.meta||null;},
    start(id){
      const def=zones.get(id)?.meta;if(!def)return null;
      return new THREE.Vector3(def.x+def.entrance[0],1.7,def.z+def.entrance[1]);
    },
    canMove(id,x,z){
      const zone=zones.get(id);
      return !!zone&&withinInterior(zone.meta,x,z,zone.obstacles,BODY_RADIUS);
    },
    update(time){
      if(!active)return;
      for(const a of animated){
        if(a.zone!==active)continue;
        if(a.oscillate)a.object.rotation[a.axis]=Math.sin(time*a.speed)*.14;
        else a.object.rotation[a.axis]=time*a.speed;
      }
      for(const polish of polishStages){
        if(polish.zoneId===active)polish.update?.(time);
      }
    },
    audit(){
      return {revision:INTERIOR_REVISION,polishRevision:POLISH_REVISION,spaces:INTERIOR_SPACES.map(def=>{
        const z=zones.get(def.id);return {id:def.id,center:[def.x,def.z],
          bounds:[def.w,def.d,def.h],obstacles:z.obstacles.length,spawn:findSpawn(def)};
      })};
    },
    dispose(){
      root.removeFromParent();
      for(const g of shapes.values())g.dispose();
      for(const t of textures)t.dispose();
      for(const m of materials)m.dispose();
      for(const light of lamps)light.dispose?.();
      for(const polish of polishStages)polish.dispose();
      zones.clear();
    }
  };
}
function findSpawn(def){return [def.x+def.entrance[0],1.7,def.z+def.entrance[1]];}
