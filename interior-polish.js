import * as THREE from 'three';

/** Interior-only visual detailing. All coordinates are relative to the existing
 * unchanged building envelope; decorations stay above floor circulation or
 * inside the footprints of equipment already registered as obstacles.
 */
export const POLISH_REVISION='interiors-v1.1.0';
export function enhanceInterior(zone,def,{high=true}={}){
 const g=zone.group,geos=new Map(),mats=[],motion=[],lights=[];
 const material=(color,metalness=0,roughness=.6,emissive=0,emissiveIntensity=0)=>{
  const m=new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity});
  mats.push(m);return m;
 };
 const paint=material(0xb9c9c8,.12,.53),titanium=material(0x799399,.68,.32),
  carbon=material(0x192c34,.22,.5),soft=material(0x3a5358,.38,.46),
  glass=material(0x1c3b4b,.08,.18),copper=material(0xb78c5f,.65,.34),
  safety=material(0xe3c675,.04,.62),red=material(0xd06a53,.1,.48,0x671c0d,.25),
  ice=material(0xbde6e8,.08,.25,0x6fd5e6,.64),green=material(0x8ee4b4,.06,.36,0x32a875,.44),
  warm=material(0xf1ddba,.02,.3,0xd6bd8c,.48),matte=material(0x667a77,.02,.84);
 const shape=(w,h,d)=>{const key=[w,h,d].join(':');if(!geos.has(key))geos.set(key,new THREE.BoxGeometry(w,h,d));return geos.get(key);};
 const box=(x,y,z,w,h,d,m=paint)=>{
  const o=new THREE.Mesh(shape(w,h,d),m);o.position.set(x,y,z);o.castShadow=false;o.receiveShadow=true;g.add(o);return o;
 };
 const pipe=(a,b,r=.06,m=titanium)=>{
  const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),delta=q.clone().sub(p);
  const key='pipe:'+r;let geo=geos.get(key);
  if(!geo){geo=new THREE.CylinderGeometry(r,r,1,high?12:7);geos.set(key,geo);}
  const o=new THREE.Mesh(geo,m);
  o.position.copy(p).add(q).multiplyScalar(.5);o.scale.y=delta.length();
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  g.add(o);return o;
 };
 const label=(word,x,y,z,w=1.9,color='#d4e9e4')=>{
  // Canvas textures are deliberately used only for readable internal labels.
  const cvs=document.createElement('canvas');cvs.width=512;cvs.height=96;
  const ctx=cvs.getContext('2d');ctx.fillStyle='#1b3338';ctx.fillRect(0,0,512,96);
  ctx.strokeStyle='#6c9e96';ctx.lineWidth=3;ctx.strokeRect(2,2,508,92);
  ctx.fillStyle=color;ctx.font='600 36px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(word,256,49,478);
  const tex=new THREE.CanvasTexture(cvs);tex.colorSpace=THREE.SRGBColorSpace;
  const lm=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,transparent:false});
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,w*96/512),lm);
  plane.position.set(x,y,z);g.add(plane);return {plane,texture:tex,material:lm};
 };
 const assets=[];
 const addLabel=(...p)=>{assets.push(label(...p));};
 // Exposed acoustic baffles, cable containment, task lights and colored zone ribs.
 const width=def.w/2-.75,depth=def.d/2-.70;
 for(const side of [-1,1]){
  const z=side*(depth-.22);
  pipe([-width,def.h-1.12,z],[width,def.h-1.12,z],.065,titanium);
  for(let x=-width+1.7;x<width;x+=2.6){
   box(x,def.h-.78,z,.045,.23,.60,carbon);
   if(high)box(x,def.h-1.06,z,.22,.045,.32,ice);
  }
  // Floor-level impact-resistant skirting and panel joint rhythm.
  for(let x=-width+2;x<width;x+=3.3)box(x,1.75,side*(depth+.055),.025,2.5,.028,titanium);
  box(0,.59,side*(depth-.12),def.w-2,.045,.09,safety);
 }
 for(let x=-width+2;x<width;x+=4.2){
  pipe([x,def.h-.85,-depth+.5],[x,def.h-.85,depth-.5],.048,soft);
  box(x,def.h-.97,0,1.7,.06,.42,warm);
 }
 // Front wall internal instructional signage.
 const title=def.kind==='factory'?'HJT PRODUCTION':def.kind==='recycling'?'MATERIAL RECOVERY':
  'COMPUTE HALL '+String((def.variant||0)+1).padStart(2,'0');
 addLabel(title,0,def.h-1.50,-depth-.035,3.7);
 // Shared production-system details are placed on existing equipment, not in aisles.
 if(def.kind==='factory'){
  for(let i=0;i<6;i++)for(const side of [-1,1]){
   const x=-12+i*4.45,z=side*5.1;
   // Machine access hatches, control HMI, illuminated optical inspection stations.
   box(x,1.10,z+side*.88,2.15,.20,.07,paint);
   for(let j=0;j<5;j++){
    box(x-.76+j*.38,1.1,z+side*.93,.08,.06,.025,j%3===0?green:carbon);
   }
   box(x+1.12,1.82,z+side*.77,.38,.52,.12,soft);
   box(x+1.12,1.88,z+side*.851,.27,.29,.024,glass);
   box(x+1.12,2.12,z+side*.854,.24,.038,.024,ice);
   for(const dx of [-1.14,1.14]){
    pipe([x+dx,1.85,z-.72],[x+dx,2.46,z-.72],.036,titanium);
    pipe([x+dx,2.46,z-.72],[x+dx,2.46,z+.72],.036,titanium);
   }
   box(x,2.48,z,.42,.13,1.49,carbon);
   if(i%2===0)box(x,2.58,z,.27,.085,.9,ice);
   for(let k=0;k<3;k++)box(x-.70+k*.7,.45,z+side*.58,.42,.055,.16,safety);
  }
  for(const x of [-12,-3,6,12]){
   // overhead compressed-air/electrical services, suspended above clearance.
   pipe([x,def.h-1.16,-7],[x,def.h-1.16,7],.09,titanium);
   pipe([x+.17,def.h-1.36,-7],[x+.17,def.h-1.36,7],.045,copper);
  }
  addLabel('LINE 01 / WAFER',-9.4,3.3,-8.48,2.5);
  addLabel('LINE 02 / MODULE',4.8,3.3,-8.48,2.7);
 }else if(def.kind==='compute'){
  const accent=def.variant===0?ice:def.variant===1?green:warm;
  for(let i=0;i<10;i++)for(const side of [-1,1]){
   const x=-11+i*2.44,z=side*2.52,front=z+(z<0?.67:-.67);
   // Recessed rack faces, handles, perforated panels and port indicators.
   for(let row=0;row<8;row++){
    const y=.93+row*.235;
    box(x,y,front,1.20,.045,.016,row%3===0?titanium:carbon);
    if(high){
     for(let k=0;k<4;k++)box(x-.42+k*.25,y+.07,front+.014,.045,.025,.015,k===0?accent:soft);
    }
   }
   box(x+.68,1.71,front+.015,.058,1.72,.025,titanium);
   box(x-.68,1.71,front+.015,.058,1.72,.025,titanium);
   box(x,3.13,z,.65,.075,.75,soft);
  }
  // Suspended cable trays and restrained thermal-management infrastructure.
  for(const side of [-1,1]){
   const z=side*3.52;
   box(0,4.31,z,25.6,.08,.47,soft);
   for(let x=-12;x<13;x+=.64)box(x,4.38,z,.034,.055,.48,titanium);
   for(const offset of [-.16,0,.16])pipe([-12,4.49,z+offset],[12,4.49,z+offset],.020,offset===0?copper:carbon);
  }
  if(def.variant===0){
   for(const x of [-9,-3,3,9])box(x,4.76,0,1.6,.07,.31,ice);
   addLabel('IT OPERATIONS',0,3.55,-depth-.035,2.3);
  }else if(def.variant===1){
   for(const x of [-9,-3,3,9]){
    pipe([x,4.72,-3.85],[x,4.72,3.85],.095,copper);
    for(const side of [-1,1])box(x,4.55,side*3.4,.63,.13,.30,green);
   }
   addLabel('THERMAL MANAGEMENT',0,3.55,-depth-.035,3.0);
  }else{
   for(const x of [-9,-3,3,9]){
    box(x,4.85,0,1.8,.15,.65,soft);
    for(let k=-2;k<=2;k++)box(x+k*.26,4.74,-.34,.10,.06,.025,ice);
   }
   addLabel('NETWORK & POWER',0,3.55,-depth-.035,3.0);
  }
 }else{
  for(let i=0;i<5;i++)for(const side of [-1,1]){
   const x=-9.2+i*4.6,z=side*4.65;
   // Conveyor sideplates, inspection hood, fixed guarded sort nozzles.
   for(const dx of [-1.38,1.38]){
    box(x+dx,1.52,z,.065,.55,1.72,titanium);
    box(x+dx,1.83,z,.11,.07,1.90,safety);
   }
   box(x,2.40,z,2.45,.16,1.2,soft);
   for(let n=0;n<3;n++){
    box(x-.75+n*.75,2.22,z,.34,.12,.33,carbon);
    box(x-.75+n*.75,2.12,z,.18,.035,.16,ice);
   }
   for(let n=0;n<4;n++)box(x-1.04+n*.70,1.28,z,.20,.07,.44,i%2?copper:matte);
   box(x+1.25,.77,z+side*.73,.16,.38,.15,red);
  }
  for(const x of [-9,0,9]){
   pipe([x,3.15,-7.2],[x,3.15,7.2],.075,titanium);
   box(x,3.4,0,1.8,.08,.4,warm);
  }
  addLabel('SORTING & RECOVERY',0,3.5,-depth-.035,3.2);
 }
 return {
  revision:POLISH_REVISION,
  dispose(){
   for(const entry of assets){entry.texture.dispose();entry.material.dispose();entry.plane.geometry.dispose();}
   for(const m of mats)m.dispose();
   for(const v of geos.values())v.dispose();
   for(const l of lights)l.dispose?.();
  }
 };
}
