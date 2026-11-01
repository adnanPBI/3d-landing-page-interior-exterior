import * as THREE from 'three';

/**
 * Five conceptual, explorable process interiors embedded inside the existing
 * Convalt hall envelopes. No exterior node or site transform is modified.
 * World coordinates, dimensions and campus scale are inherited from V5.4.5.
 */
export const INTERIOR_REVISION = 'convalt-interior-exterior-v1.0.0';
export const INTERIOR_SPACES = Object.freeze([
  {id:'manufacturing',label:'Manufacturing plant',short:'Manufacturing',kind:'factory',x:-16,z:35,w:34,d:18,h:7,yaw:0,
   entrance:[0,5.65],description:'Illustrative HJT manufacturing flow, service lanes and production equipment.'},
  {id:'compute-01',label:'Compute hall 01',short:'Compute 01',kind:'compute',variant:0,x:11,z:-45,w:29,d:9,h:6.4,yaw:-Math.PI/2,
   entrance:[-10,0],description:'Server racks, cooling flow and controlled access aisles.'},
  {id:'compute-02',label:'Compute hall 02',short:'Compute 02',kind:'compute',variant:1,x:11,z:-58,w:29,d:9,h:6.4,yaw:-Math.PI/2,
   entrance:[-10,0],description:'Compute racks, power distribution and cooling instrumentation.'},
  {id:'compute-03',label:'Compute hall 03',short:'Compute 03',kind:'compute',variant:2,x:11,z:-71,w:29,d:9,h:6.4,yaw:-Math.PI/2,
   entrance:[-10,0],description:'Network cabinets, power cabinets and service monitoring.'},
  {id:'recycling',label:'Material recycling plant',short:'Recycling',kind:'recycling',x:-12,z:-89,w:27,d:17,h:6.8,yaw:0,
   entrance:[0,5.8],description:'Sorting stations, recovered-material handling and protected inspection aisles.'}
]);

const BODY_RADIUS=.34;
function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
export function withinInterior(meta,x,z,obstacles=[],radius=BODY_RADIUS){
  const lx=x-meta.x,lz=z-meta.z;
  if(Math.abs(lx)>meta.w/2-.9-radius || Math.abs(lz)>meta.d/2-.9-radius)return false;
  return !obstacles.some(o=>lx+radius>o[0]&&lx-radius<o[1]&&lz+radius>o[2]&&lz-radius<o[3]);
}

export function createCampusInteriors(scene,{high=true}={}){
  const root=new THREE.Group();
  root.name='conceptual-walkable-interiors';
  scene.add(root);
  const shapes=new Map(), materials=[], zones=new Map(), animated=[], lamps=[];
  const mat=(hex,metalness=0,roughness=.68,emissive=0x000000,eIntensity=0)=>
    {const m=new THREE.MeshStandardMaterial({color:hex,metalness,roughness,emissive,emissiveIntensity:eIntensity});materials.push(m);return m;};
  const finish=mat(0x657c78,.26,.66),floor=mat(0x788884,.08,.89),
    ceiling=mat(0xc5d0c8,.08,.74),wall=mat(0x9dacaa,.04,.72),
    steel=mat(0x738588,.58,.44),dark=mat(0x25373d,.44,.47),
    rubber=mat(0x172427,.07,.88),glass=mat(0x152d3f,.16,.24),
    copper=mat(0x9b6e4e,.53,.39),hazard=mat(0xe6b95c,.06,.73),
    lit=mat(0xd7e8d5,.08,.28,0xc5e5b3,.64),
    blue=mat(0x3ca9ad,.14,.44,0x0b889b,.55),
    green=mat(0x82c4a6,.10,.45,0x389d70,.35);
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
    // Internal finish surfaces are inset from the existing solid external shell.
    box(g,0,.40,0,def.w-.65,.10,def.d-.65,floor);
    box(g,0,def.h-.30,0,def.w-.65,.06,def.d-.65,ceiling);
    box(g,0,def.h/2,-hd,def.w-.65,def.h-.8,.07,wall);
    box(g,0,def.h/2, hd,def.w-.65,def.h-.8,.07,wall);
    box(g,-hw,def.h/2,0,.07,def.h-.8,def.d-.65,wall);
    box(g, hw,def.h/2,0,.07,def.h-.8,def.d-.65,wall);
    // Safety kick, ceiling cable rails, and ceiling-mounted light strips.
    for(const side of [-1,1]){
      box(g,0,.62,side*(hd-.06),def.w-.65,.16,.10,dark);
      box(g,0,def.h-.65,side*1.3,def.w-3,.09,.17,steel);
      for(let x=-def.w/2+3;x<def.w/2-2;x+=5){
        box(g,x,def.h-.72,side*1.3,2.7,.055,.23,lit);
      }
    }
    for(let x=-def.w/2+2.5;x<def.w/2-1;x+=5){
      box(g,x,.47,0,.065,.012,3.0,hazard).castShadow=false;
    }
    const light=new THREE.PointLight(0xd9eadc,high?3.0:1.35,18,2);
    light.position.set(0,def.h-1,0);light.castShadow=false;g.add(light);lamps.push(light);
    return zone;
  }
  function machine(zone,x,z,i){
    const g=zone.group;
    const w=3.0,d=1.7;
    box(g,x,.60,z,w,.36,d,dark);
    box(g,x,1.10,z,w-.22,.54,d-.24,steel);
    box(g,x,1.53,z,w-.45,.24,d-.40,finish);
    for(const sx of [-1,1]){
      box(g,x+sx*1.34,1.78,z,.15,.56,1.45,steel);
      box(g,x+sx*1.34,2.08,z,.2,.09,1.55,hazard);
    }
    box(g,x,1.62,z,w-1,.065,.55,rubber);
    for(let j=0;j<4;j++){
      const roller=cylinder(g,x-1.0+j*.63,1.69,z,.115,.78,j===1?copper:steel);
      roller.rotation.x=Math.PI/2;animated.push({object:roller,axis:'x',speed:.36+(i%3)*.08,zone:zone.meta.id});
    }
    box(g,x-1.1,1.48,z+.89,.30,.24,.055,i%2?green:blue);
    register(zone,x,z,w+.20,d+.3);
  }
  function rack(zone,x,z,variant,index){
    const g=zone.group,w=1.64,d=1.12;
    box(g,x,1.73,z,w,2.58,d,dark);
    box(g,x,1.73,z+(z<0?.565:-.565),w-.14,2.34,.075,glass);
    for(let y=.78;y<2.72;y+=.22){
      box(g,x,y,z+(z<0?.616:-.616),w-.21,.035,.04,steel);
    }
    box(g,x,2.90,z,w,.10,d,steel);
    for(const side of [-1,1])box(g,x+side*.72,1.73,z+(z<0?.61:-.61),.055,2.32,.045,steel);
    const status=(variant===1?blue:variant===2?green:lit);
    for(let j=0;j<5;j++){
      box(g,x+(j%2?-.48:.48),1.0+j*.32,z+(z<0?.665:-.665),.055,.065,.025,status);
    }
    if(index%3===0)box(g,x,3.03,z,.8,.06,d,finish);
    register(zone,x,z,w+.15,d+.16);
  }
  function recoveryCell(zone,x,z,index){
    const g=zone.group,w=3.15,d=2;
    box(g,x,.68,z,w,.48,d,dark);
    box(g,x,1.12,z,w-.3,.18,d-.35,rubber);
    for(const side of [-1,1]){
      box(g,x+side*(w/2-.13),1.40,z,.075,.52,d,steel);
      box(g,x+side*(w/2-.13),1.73,z,.09,.08,d,hazard);
    }
    for(let i=0;i<3;i++){
      const block=box(g,x-.9+i*.9,1.31,z+(i%2?.23:-.23),.35,.22,.5,
        index%3===0?copper:index%3===1?finish:glass);
      if(index%2===0)animated.push({object:block,axis:'y',speed:.16,zone:zone.meta.id,oscillate:true});
    }
    box(g,x,2.15,z,2.6,.16,.35,steel);
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
    } else {
      for(let i=0;i<5;i++)for(const side of [-1,1])recoveryCell(zone,-9.2+i*4.6,side*4.65,i);
      for(const x of [-9,0,9]){
        cylinder(g,x,1.3,0,.20,1.15,steel);
        box(g,x,1.95,0,.65,.10,.65,hazard);
      }
      // Internal sorting drum is independent of the existing outdoor trommel.
      const drum=cylinder(g,-9,2.3,-6.1,.64,2.7,steel);
      drum.rotation.z=Math.PI/2;
      animated.push({object:drum,axis:'z',speed:.20,zone:def.id});
    }
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
        if(a.oscillate)a.object.rotation[a.axis]=Math.sin(time*a.speed)*.09;
        else a.object.rotation[a.axis]=time*a.speed;
      }
    },
    audit(){
      return {revision:INTERIOR_REVISION,spaces:INTERIOR_SPACES.map(def=>{
        const z=zones.get(def.id);return {id:def.id,center:[def.x,def.z],
          bounds:[def.w,def.d,def.h],obstacles:z.obstacles.length,spawn:findSpawn(def)};
      })};
    },
    dispose(){
      root.removeFromParent();
      for(const g of shapes.values())g.dispose();
      for(const m of materials)m.dispose();
      for(const light of lamps)light.dispose?.();
      zones.clear();
    }
  };
}
function findSpawn(def){return [def.x+def.entrance[0],1.7,def.z+def.entrance[1]];}
