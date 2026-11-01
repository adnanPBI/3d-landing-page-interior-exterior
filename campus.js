import * as THREE from 'three';
import { createFenceSegment } from './campus-fence.js';
import { installWaterReflection } from './campus-water.js';
import { createCampusMaterials, randomSequence, facadeSign } from './campus-materials.js';

const TAU=Math.PI*2;

export const CAMPUS_REVISION = 'campus-v5.4.5-screenshot-mapped-two-tree-removal-20260925';

// Hand-authored, editable architectural geometry. Dimensions share the existing
// journey's world coordinates; the page, overlay and content are not rebuilt.
export function buildCampus(scene, renderer, high = true) {
  const root=new THREE.Group();root.name=CAMPUS_REVISION;scene.add(root);
  const surfaces=createCampusMaterials(renderer),{m}=surfaces;
  const geometries=new Map(), animated=[],signs=[],turbines=[],panels=[],reflections=[];
  const rng=randomSequence(93713);
  const boxCache=new Map();
  function geometry(key,make){if(!geometries.has(key))geometries.set(key,make());return geometries.get(key);}
  function rounded(w,h,d,r=.04){
    const key=[w,h,d,r].join('/');
    if(boxCache.has(key))return boxCache.get(key);
    r=Math.min(w,h,d)<.09?0:Math.min(r,w*.18,h*.18,d*.18);
    const g=new THREE.BoxGeometry(w,h,d,r>0?3:1,r>0?3:1,r>0?3:1),p=g.attributes.position,n=g.attributes.normal;
    const v=new THREE.Vector3(),inner=new THREE.Vector3(),half=new THREE.Vector3(w/2-r,h/2-r,d/2-r);
    if(r>0)for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i);inner.set(Math.max(-half.x,Math.min(half.x,v.x)),Math.max(-half.y,Math.min(half.y,v.y)),Math.max(-half.z,Math.min(half.z,v.z)));
      const normal=v.clone().sub(inner).normalize();v.copy(inner).addScaledVector(normal,r);p.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,normal.x,normal.y,normal.z);
    }
    g.computeBoundingSphere();boxCache.set(key,g);return g;
  }
  function mesh(parent,g,mat,p=[0,0,0],rot=[0,0,0],scale=[1,1,1]){
    const o=new THREE.Mesh(g,mat);o.position.set(...p);o.rotation.set(...rot);o.scale.set(...scale);o.castShadow=high;o.receiveShadow=true;parent.add(o);return o;
  }
  function box(parent,size,p,mat=m.concrete,r=.04){if(r===0||Math.min(...size)<.09)return mesh(parent,geometry('unit-box',()=>new THREE.BoxGeometry(1,1,1)),mat,p,[0,0,0],size);return mesh(parent,rounded(...size,r),mat,p);}
  function cyl(parent,r,h,p,mat=m.steel,rt=r){return mesh(parent,geometry(`c/${rt/r}`,()=>new THREE.CylinderGeometry(rt/r,1,1,high?20:12)),mat,p,[0,0,0],[r,h,r]);}
  const sphere=geometry('sphere',()=>new THREE.SphereGeometry(1,high?14:10,high?9:7));
  // Volumetric sprays of individually curved leaves replace solid crown balls.
  // One shared mesh is instanced throughout the landscape; no transparent billboards.
  const leafGeo=geometry('foliage-v4',()=>{
    const r=randomSequence(1739),positions=[],normals=[],uvs=[],colors=[];
    const v=new THREE.Vector3(),q=new THREE.Quaternion();
    const count=high?44:24;
    for(let n=0;n<count;n++){
      const a=n*2.399963,z=1-2*(n+.5)/count,rr=Math.sqrt(1-z*z);
      const center=new THREE.Vector3(Math.cos(a)*rr,z,Math.sin(a)*rr).multiplyScalar(.50+r()*.48);
      const normal=center.clone().add(new THREE.Vector3((r()-.5)*.7,.28,(r()-.5)*.7)).normalize();
      q.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
      const width=.18+r()*.14,length=.26+r()*.16;
      const ring=[[0,1,0],[-.75,.44,0],[-1,-.32,-.07],[0,-1,0],[1,-.32,-.07],[.75,.44,0]];
      const shade=.63+r()*.31+Math.max(0,z)*.1;
      for(const indices of [[0,1,5],[1,2,5],[2,4,5],[2,3,4]]){
        const tri=indices.map(i=>ring[i]);
        for(const [x,y,zz] of tri){v.set(x*width,y*length,zz*length).applyQuaternion(q).add(center);positions.push(v.x,v.y,v.z);normals.push(normal.x,normal.y,normal.z);uvs.push(x*.5+.5,y*.5+.5);colors.push(shade*.94,shade,shade*.89);}
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeBoundingSphere();return g;
  });
  function ellipsoid(parent,pos,size,mat=m.leaf){return mesh(parent,leafGeo,mat,pos,[0,rng()*6.283,0],size);}
  function beam(parent,a,b,width,mat=m.steel){
    const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);
    const o=box(parent,[width,d.length(),width],p.clone().add(q).multiplyScalar(.5).toArray(),mat,.012);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;
  }
  function pipe(parent,a,b,r=.13,mat=m.steel){
    const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),delta=q.clone().sub(p);
    const o=cyl(parent,r,delta.length(),p.clone().add(q).multiplyScalar(.5).toArray(),mat);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;
  }
  function group(name,p=[0,0,0],parent=root){const g=new THREE.Group();g.name=name;g.position.set(...p);parent.add(g);return g;}
  function sign(parent,text,p,width,yaw=0){const mat=facadeSign(text);signs.push(mat);const o=mesh(parent,geometry(`sign/${width}`,()=>new THREE.PlaneGeometry(width,width/8)),mat,p,[0,yaw,0]);o.castShadow=false;return o;}
  function disc(parent,r,p,mat=m.concrete,sx=1,sz=1){const o=mesh(parent,geometry(`disc/${r}`,()=>new THREE.CylinderGeometry(r,r,.12,64)),mat,p,[0,0,0],[sx,1,sz]);return o;}
  function trimRectangle(parent,w,d,y,x,z,mat=m.concrete,width=.14,height=.22){
    for(const side of [-1,1]){box(parent,[w,height,width],[x,y,z+side*d/2],mat,.02);box(parent,[width,height,d],[x+side*w/2,y,z],mat,.02);}
  }
  function apron(parent,w,d,x,z){box(parent,[w,.9,d],[x,-.35,z],m.paving,.04);trimRectangle(parent,w,d,.15,x,z,m.concrete,.22,.24);}

  // An irregular, planted landform replaces the flat, featureless circular slab.
  const terrain=group('sculpted-landform');
  const boundary=(a)=>1+.022*Math.sin(a*5)+.014*Math.sin(a*11+.8);
  const rim=(a,f=1)=>[Math.cos(a)*70*boundary(a)*f,Math.sin(a)*87*boundary(a)*f-26];
  const groundY=(x,z)=>{
    const f=Math.sqrt((x/70)**2+((z+26)/87)**2);
    return f<.77?-.12:-.12-(f-.77)*3.5+Math.sin(x*.21)*Math.cos(z*.13)*(f-.77)*1.5;
  };
  const vertices=[],uv=[],colors=[],indices=[],segments=144,rings=18;
  for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){
    const a=i/segments*Math.PI*2,[x,z]=rim(a,j/rings),y=groundY(x,z);vertices.push(x,y,z);uv.push(x/17,z/17);
    const shade=.9+.07*Math.sin(x*.13)*Math.sin(z*.19);colors.push(shade,shade,shade);
    if(j<rings&&i<segments){const k=j*(segments+1)+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
  }
  const landGeo=new THREE.BufferGeometry();landGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));landGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));landGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));landGeo.setIndex(indices);landGeo.computeVertexNormals();
  m.grass.vertexColors=true;mesh(terrain,landGeo,m.grass).castShadow=false;
  const sideP=[],sideUV=[],sideI=[],sideC=[];
  for(let j=0;j<=8;j++)for(let i=0;i<=segments;i++){
    const a=i/segments*2*Math.PI,f=1-j*.015,[x,z]=rim(a,f),y=groundY(...rim(a))-j*.91-.32*Math.sin(a*14+j)*Math.sin(j*.4);
    sideP.push(x,y,z);sideUV.push(i/8,j/3);const k=.82+j*.025+.1*Math.sin(a*13+j*2);sideC.push(k,k,k);
    if(j<8&&i<segments){const n=j*(segments+1)+i;sideI.push(n,n+segments+1,n+1,n+1,n+segments+1,n+segments+2);}
  }
  const sideGeo=new THREE.BufferGeometry();sideGeo.setAttribute('position',new THREE.Float32BufferAttribute(sideP,3));sideGeo.setAttribute('uv',new THREE.Float32BufferAttribute(sideUV,2));sideGeo.setAttribute('color',new THREE.Float32BufferAttribute(sideC,3));for(let i=0;i<sideI.length;i+=3){const t=sideI[i+1];sideI[i+1]=sideI[i+2];sideI[i+2]=t;}sideGeo.setIndex(sideI);sideGeo.computeVertexNormals();m.stone.vertexColors=true;mesh(terrain,sideGeo,m.stone);
  // Sparse fractured talus, embedded into the edge rather than a bead-like ring.
  const rockGeo=geometry('fractured-talus',()=>{
    const g=new THREE.SphereGeometry(1,7,5),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=.83+.20*Math.sin(x*6.4+y*2.6+z*5.1);p.setXYZ(i,x*f,y*(.88+.12*Math.sin(z*7)),z*f);}
    const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();return flat;
  });
  for(let i=0;i<35;i++){const a=i*2.399963+.2,[x,z]=rim(a,.989);const b=mesh(terrain,rockGeo,m.stone,[x,groundY(x,z)-1.25,z],[i*.7,i*.43,.13],[1.1+(i%4)*.3,.85+(i%3)*.2,.85+(i%5)*.13]);b.castShadow=high;}


  // Dark asphalt, stone curbs, road markings and loading courts establish scale.
  const streets=group('roads-courts-and-parking');
  function road(w,d,x,z){box(streets,[w,1.4,d],[x,-.65,z],m.stone,.04);const asphalt=box(streets,[w,.16,d],[x,.11,z],m.asphalt,.06);const uv=asphalt.geometry.attributes.uv,p=asphalt.geometry.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,p.getX(i)/2.5,p.getZ(i)/2.5);uv.needsUpdate=true;trimRectangle(streets,w,d,.23,x,z,m.concrete,.25,.22);}
  road(6.8,139,38,-27);road(73,5.2,4,49);road(12,122,-43,-21);road(71,5.2,-1,-92);
  for(let z=-88;z<41;z+=6)box(streets,[.105,.012,2.4],[38,.205,z],m.marking,0).castShadow=false;
  for(let x=-34;x<36;x+=6)box(streets,[2.4,.012,.1],[x,.205,49],m.marking,0).castShadow=false;
  for(let j=0;j<7;j++)box(streets,[.42,.018,4.8],[29+j*.85,.215,49],m.marking,0).castShadow=false;
  apron(streets,34,9,-13,53);apron(streets,14,10,24,35);apron(streets,14,9,-26,-27);
  for(let i=0;i<13;i++)box(streets,[.07,.015,4.6],[-29+i*2.6,.12,53],m.marking,0).castShadow=false;

  function car(x,z,yaw=0,color=m.white){
    const g=group('parked-vehicle',[x,.23,z],streets);g.rotation.y=yaw;
    const utility=((Math.round((x+z)*10)&1)===0),bodyW=utility?1.64:1.56,bodyL=utility?3.62:3.34,roofL=utility?1.98:1.74;
    box(g,[bodyW,.24,bodyL],[0,.26,0],color,.15);
    box(g,[bodyW-.08,.33,bodyL-.34],[0,.49,-.02],color,.15);
    box(g,[bodyW-.12,.08,bodyL-.16],[0,.18,0],m.black,.06);
    box(g,[bodyW-.22,.09,.44],[0,.39,bodyL/2-.08],m.black,.04);box(g,[bodyW-.22,.09,.40],[0,.40,-bodyL/2+.09],m.black,.04);
    box(g,[bodyW*.82,utility?.54:.50,roofL],[0,.92,-.12],m.glass,.12);
    box(g,[bodyW*.74,.12,roofL-.2],[0,1.18,-.16],color,.08);
    box(g,[bodyW*.52,.38,.78],[0,.90,bodyL*.28],m.glass,.07);box(g,[bodyW*.52,.34,.68],[0,.93,-bodyL*.27],m.glass,.07);
    for(const side of [-1,1]){
      box(g,[.08,.42,roofL-.34],[side*(bodyW*.30),.91,-.12],m.dark,.015);
      box(g,[.045,.15,.26],[side*(bodyW*.55),.76,.52],m.steel,.01);box(g,[.12,.08,.2],[side*(bodyW*.63),.79,.64],m.glass,.01);
      box(g,[.10,.16,bodyL-.46],[side*(bodyW*.50),.58,-.02],m.glass,.03);
      for(const dz of [-bodyL*.28,bodyL*.27])box(g,[.12,.22,.42],[side*(bodyW*.52),.36,dz],m.black,.03);
      box(g,[.03,.17,roofL-.30],[side*(bodyW*.39),.91,-.12],m.white,.004);
    }
    for(const dx of [-bodyW*.36,bodyW*.36])for(const dz of [-bodyL*.30,bodyL*.26]){
      const tyre=cyl(g,.30,.19,[dx,.29,dz],m.black);tyre.rotation.z=Math.PI/2;
      const rim=cyl(g,.18,.024,[dx,.29,dz],m.steel);rim.rotation.z=Math.PI/2;
    }
    for(const dx of [-bodyW*.28,bodyW*.28]){
      box(g,[.28,.11,.08],[dx,.57,bodyL/2+.02],m.lamp,.025);box(g,[.28,.10,.07],[dx,.57,-bodyL/2-.01],m.red,.02);
      box(g,[.03,.44,.06],[dx,.86,-.04],m.white,.004);
    }
    box(g,[bodyW*.68,.04,.02],[0,.55,0],m.seal,0);box(g,[bodyW*.68,.04,.02],[0,.64,0],m.seal,0);
    box(g,[.46,.12,.012],[0,.57,bodyL/2+.041],m.marking,.003);box(g,[.42,.10,.012],[0,.58,-bodyL/2-.036],m.marking,.003);
    if(utility){
      for(const dx of [-bodyW*.18,bodyW*.18])box(g,[.05,.06,roofL-.16],[dx,1.23,-.16],m.steel,.008);
      for(const dz of [-.62,.28])box(g,[bodyW*.42,.04,.05],[0,1.25,dz],m.steel,.008);
    }else box(g,[bodyW*.40,.04,.12],[0,1.15,-bodyL*.43],color,.01);
  }
  for(const [i,c] of [[0,m.dark],[2,m.white],[3,m.cladding],[5,m.white],[8,m.dark],[10,m.cladding]])car(-27.7+i*2.6,53,0,c);

  // Drainage channels parallel to the existing road, kept off vehicle lanes.
  for(let z=-83;z<40;z+=10){box(streets,[.32,.026,1.2],[41.06,.214,z],m.grille,.005).castShadow=false;}
  for(let x=-29;x<3;x+=3.2)box(streets,[.016,.01,8.5],[x,.117,53],m.seal,0).castShadow=false;

  function streetLamp(x,z,y=0){
    const g=group('site-light',[x,y,z],streets);cyl(g,.09,4.6,[0,2.3,0],m.steel);box(g,[.13,.12,1.45],[0,4.6,-.63],m.steel,.025);box(g,[.4,.14,.8],[0,4.53,-1.1],m.dark,.03);box(g,[.28,.035,.62],[0,4.445,-1.1],m.lamp,.01);
  }
  for(let z=-83;z<48;z+=15)streetLamp(42.05,z);
  for(let x=-34;x<29;x+=14)streetLamp(x,57.4);

  // East service apron: EV charging + compact service equipment.
  // Apron is 14m x 10m centered at (24,35): x=17..31, z=30..40.
  // Every new element is intentionally contained inside those bounds.
  const eastService=group('east-service-apron-equipment');
  evBay(eastService,20.4,35.0,0);
  evBay(eastService,23.3,35.0,0);
  evCharger(eastService,20.4,.19,38.65,Math.PI);
  evCharger(eastService,23.3,.19,38.65,Math.PI);
  powerCabinet(eastService,27.25,.18,33.2,1.05,.72,1.35);
  powerCabinet(eastService,28.65,.18,33.2,1.05,.72,1.35);
  box(eastService,[2.75,1.45,1.45],[27.95,.90,36.15],m.steel,.10);
  mesh(
    eastService,
    geometry('east-service-equipment-grille',()=>new THREE.PlaneGeometry(2.15,.78)),
    m.grille,
    [27.95,.92,36.885]
  ).castShadow=false;
  for(const [x,z] of [
    [26.55,32.45],[29.35,32.45],
    [26.55,37.15],[29.35,37.15]
  ])cyl(eastService,.075,.78,[x,.39,z],m.yellow);
  box(eastService,[3.95,.018,.055],[27.95,.225,31.55],m.marking,0).castShadow=false;
  box(eastService,[3.95,.018,.055],[27.95,.225,38.00],m.marking,0).castShadow=false;
  box(eastService,[.055,.018,6.45],[26.00,.225,34.78],m.marking,0).castShadow=false;
  box(eastService,[.055,.018,6.45],[29.90,.225,34.78],m.marking,0).castShadow=false;

  // Solar modules are actual separate glazing, backing, perimeter rails and legs.
  // The frame never covers the active cell surface; no row-level spin is applied.
  function solarTable(parent,x,y,z,w=4.45,d=2.28,angle=.24,foundation=0){
    const g=group('pv-module-table',[x,y,z],parent);g.rotation.x=angle;
    box(g,[w,.08,d],[0,0,0],m.black,.015);
    // Lift active glass above backing/rails so oblique views cannot z-fight.
    const panel=mesh(g,geometry(`pvface/${w}/${d}`,()=>new THREE.PlaneGeometry(w-.12,d-.12)),m.pv,[0,.09,0],[-Math.PI/2,0,0]);panel.castShadow=false;
    for(const side of [-1,1]){box(g,[w+.06,.115,.043],[0,.01,side*d/2],m.steel,.01);box(g,[.043,.115,d],[side*w/2,.01,0],m.steel,.01);}
    box(g,[.032,.07,d],[0,.04,0],m.steel,.006);
    box(g,[w,.07,.028],[0,.04,0],m.steel,.006);
    for(const zz of [-d*.32,d*.32])box(g,[w,.065,.07],[0,-.11,zz],m.steel,.01);
    panels.push({surface:panel,frame:g});
    for(const dx of [-w*.34,w*.34])for(const dz of [-d*.31,d*.31]){
      const top=new THREE.Vector3(dx,-.16,dz).applyEuler(g.rotation).add(g.position);
      beam(parent,[top.x,foundation,top.z],top.toArray(),.075,m.steel);
    }
    return g;
  }

  function rooftopHVAC(parent,x,y,z){
    box(parent,[2.7,1.1,1.8],[x,y+.55,z],m.steel,.1);box(parent,[2.55,.08,1.66],[x,y+1.12,z],m.black,.035);
    for(const dx of [-.7,.7]){
      cyl(parent,.59,.08,[x+dx,y+1.19,z],m.black);const ring=mesh(parent,geometry('fan-rim',()=>new THREE.TorusGeometry(.58,.045,6,20)),m.steel,[x+dx,y+1.25,z],[Math.PI/2,0,0]);
      const spin=group('fan',[x+dx,y+1.24,z],parent);spin.userData.animated=true;spin.userData.batchMotion=true;
      cyl(spin,.10,.08,[0,0,0],m.steel);
      for(let k=0;k<5;k++){const a=k*Math.PI*2/5;const b=box(spin,[.16,.045,.42],[Math.sin(a)*.28,0,Math.cos(a)*.28],m.steel,.015);b.rotation.y=a+.35;}
      animated.push({node:spin,axis:'y',speed:.95});
      // Static safety grille above moving fan, with real silhouette detail.
      for(let n=-3;n<=3;n++){const off=n*.13,len=Math.sqrt(Math.max(0,.53*.53-off*off))*2;box(parent,[len,.014,.014],[x+dx,y+1.3,z+off],m.steel,0).castShadow=false;}
    }
    for(const side of [-1,1]){
      const g=mesh(parent,geometry('hvac-grille',()=>new THREE.PlaneGeometry(2.45,.75)),m.grille,[x,y+.55,z+side*.905],[0,side===1?0:Math.PI,0]);g.castShadow=false;
    }
  }

  function rooftopSkylight(parent,x,y,z,w=2.9,d=1.55,h=.34){
    box(parent,[w+.26,.10,d+.26],[x,y+.03,z],m.concrete,.03);
    box(parent,[w,.16,d],[x,y+.12,z],m.white,.03);
    box(parent,[w-.24,.09,d-.24],[x,y+.21,z],m.glass,.02);
    for(const side of [-1,1])box(parent,[w,.05,.05],[x,y+.19,z+side*(d/2-.02)],m.steel,.008);
    for(const side of [-1,1])box(parent,[.05,.05,d],[x+side*(w/2-.02),y+.19,z],m.steel,.008);
  }
  function powerCabinet(parent,x,y,z,w=1.1,d=.78,h=1.35){
    box(parent,[w,h,d],[x,y+h/2,z],m.white,.06);
    mesh(parent,geometry('cab-door',()=>new THREE.PlaneGeometry(w*.74,h*.58)),m.grille,[x,y+h*.55,z+d/2+.012]);
    box(parent,[w*.84,.05,d*.16],[x,y+h*.86,z+d/2+.03],m.dark,.012);
    box(parent,[w*.25,.14,.03],[x+w*.22,y+h*.52,z+d/2+.05],m.dark,.008);
  }

  function evCharger(parent,x,y,z,yaw=0){
    const g=group('ev-charger',[x,y,z],parent);g.rotation.y=yaw;
    box(g,[.72,.12,.72],[0,.06,0],m.concrete,.04);
    box(g,[.46,1.46,.34],[0,.79,0],m.white,.07);
    box(g,[.38,.32,.025],[0,1.03,.183],m.dark,.012);
    box(g,[.24,.11,.028],[0,1.18,.185],m.glassLit,.006);
    box(g,[.07,.07,.03],[.12,1.29,.188],m.lamp,.005);
    pipe(g,[.20,.92,.17],[.31,.62,.24],.025,m.black);
    pipe(g,[.31,.62,.24],[.22,.40,.24],.025,m.black);
    box(g,[.12,.23,.08],[.23,.38,.25],m.dark,.012);
    for(const dx of [-.48,.48])cyl(g,.07,.72,[dx,.36,.14],m.yellow);
    return g;
  }

  function evBay(parent,x,z,yaw=0){
    const g=group('ev-bay',[x,0,z],parent);g.rotation.y=yaw;
    for(const side of [-1,1])box(g,[.055,.018,4.55],[side*1.15,.225,0],m.marking,0).castShadow=false;
    box(g,[2.35,.018,.055],[0,.225,-2.25],m.marking,0).castShadow=false;
    box(g,[2.35,.018,.055],[0,.225,2.25],m.marking,0).castShadow=false;
    box(g,[.52,.018,.055],[0,.226,.12],m.marking,0).castShadow=false;
    box(g,[.055,.018,.72],[-.20,.226,.12],m.marking,0).castShadow=false;
    box(g,[.055,.018,.72],[.20,.226,.12],m.marking,0).castShadow=false;
    box(g,[1.65,.18,.24],[0,.28,1.80],m.concrete,.04);
    return g;
  }
  function fenceRun(parent,a,b,height=1.4){
    return createFenceSegment(parent,a,b,height,m.steel);
  }
  function serviceModule(parent,x,y,z){
    box(parent,[3.6,2.5,2.6],[x,y+1.25,z],m.dark,.08);
    box(parent,[3.25,.12,2.25],[x,y+2.56,z],m.black,.03);
    for(const side of [-1,1])mesh(parent,geometry('service-grille',()=>new THREE.PlaneGeometry(2.8,1.45)),m.grille,[x,y+1.35,z+side*1.31],[0,side===1?0:Math.PI,0]);
    powerCabinet(parent,x-2.9,y,z+.35,.88,.62,1.18);
    powerCabinet(parent,x-2.9,y,z-.55,.88,.62,1.18);
  }
  function panelFacade(parent,w,h,d,base=0){
    for(const side of [-1,1]){
      for(let x=-w/2+.6;x<w/2;x+=1.55)box(parent,[.038,h-.7,.045],[x,base+h/2,side*(d/2+.024)],m.steel,.008);
      box(parent,[w+.14,.2,.14],[0,base+h-.32,side*d/2],m.white,.025);
    }
    for(const side of [-1,1])for(let z=-d/2+.6;z<d/2;z+=1.55)box(parent,[.045,h-.7,.038],[side*(w/2+.024),base+h/2,z],m.steel,.008);
  }
  function hall(name,x,z,w,d,h){
    const g=group(name,[x,0,z]);apron(g,w+2,d+2,0,0);
    box(g,[w,h,d],[0,h/2+.18,0],m.cladding,.09);box(g,[w+.1,.22,d+.1],[0,.36,0],m.concrete,.03);
    box(g,[w-.25,.16,d-.25],[0,h+.28,0],m.dark,.04);trimRectangle(g,w,d,h+.5,0,0,m.concrete,.25,.5);panelFacade(g,w,h,d,.15);
    for(let zz=-d/2+1;zz<d/2;zz+=2)box(g,[w-.8,.033,.046],[0,h+.38,zz],m.steel,.006).castShadow=false;
    // Construction-scale roof edging, rainwater goods and expansion joints.
    for(const xx of [-w/2+.32,w/2-.32]){
      box(g,[.18,.16,d-.5],[xx,h+.35,0],m.steel,.014);
      for(const zz of [-d/2+.4,d/2-.4]){
        pipe(g,[xx,h+.15,zz],[xx,.45,zz],.065,m.steel);
        box(g,[.32,.03,.32],[xx,.14,zz],m.grille,.006);
      }
    }
    for(let x=-w/2+2.7;x<w/2;x+=3.4){
      box(g,[.022,.009,d+1.7],[x,.115,0],m.seal,0).castShadow=false;
      for(const zz of [-d/2-.024,d/2+.024])for(const yy of [1.3,h-1.0]){
        mesh(g,sphere,m.steel,[x,yy,zz],[0,0,0],[.032,.032,.027]).castShadow=false;
      }
    }
    return g;
  }

  // Production campus: ribbed envelope, clerestories, logistics and glazed lobby.
  const factory=hall('manufacturing-campus',-16,35,34,18,7);
  for(const side of [-1,1]){
    box(factory,[30,1.2,.09],[0,5.5,side*9.06],m.glass,.01);
    for(let x=-14;x<=14;x+=2)box(factory,[.065,1.25,.13],[x,5.5,side*9.08],m.steel,.006);
  }
  for(let z=-4.7;z<=2;z+=3.3)for(let x=-13;x<=9;x+=5.2)solarTable(factory,x,7.85,z,4.45,2.28,.18,7.4);
  for(let x=-11;x<=13;x+=6)rooftopHVAC(factory,x,7.4,6.1);
  sign(factory,'CONVALT  /  MANUFACTURING',[0,3.3,9.1],14);
  for(const x of [-10.5,-5.2,0,5.2,10.5])rooftopSkylight(factory,x,7.56,-2.2,2.7,1.4,.32);
  for(const x of [-10.5,-5.2,0,5.2,10.5])rooftopSkylight(factory,x,7.56,2.45,2.7,1.4,.32);
  for(const side of [-1,1]){for(let x=-13.8;x<=13.8;x+=2.3)box(factory,[1.8,.08,.9],[x,4.28,side*9.8],m.white,.02);}
  for(let x=-11;x<=10;x+=7){
    box(factory,[4,3,.14],[x,1.8,9.1],m.dark,.06);box(factory,[3.5,2.4,.12],[x,1.8,9.2],m.steel,.03);
    for(let y=.9;y<3;y+=.28)box(factory,[3.5,.035,.04],[x,y,9.28],m.dark,0);
    box(factory,[4.3,.16,1.6],[x,3.6,9.75],m.white,.04);
    box(factory,[4.7,.12,1.25],[x,4.02,10.35],m.white,.035);
    for(const dx of [-2.0,2.0])beam(factory,[x+dx,4.0,9.85],[x+dx,3.1,10.48],.05,m.steel);
    for(const dx of [-2.2,2.2])cyl(factory,.09,.85,[x+dx,.6,10.1],m.yellow);
    for(const dx of [-1.8,1.8])box(factory,[.24,.7,.19],[x+dx,.65,9.34],m.black,.03);
  }
  const lobby=group('curtain-wall-office',[9,0,34]);apron(lobby,13,14,0,0);
  box(lobby,[11,5,11],[0,2.75,0],m.dark,.07);
  for(const zz of [-5.53,5.53]){
    for(let level=0;level<2;level++)for(let x=-4.4;x<5;x+=1.75)box(lobby,[1.64,1.98,.075],[x,1.5+level*2.15,zz],(Math.round(x*8)+level)%3?m.glass:m.glassLit,.005);
    for(let x=-5.25;x<5.4;x+=1.75)box(lobby,[.06,4.4,.16],[x,2.55,zz],m.steel,.01);
    for(let y=.45;y<=4.85;y+=2.2)box(lobby,[11.2,.065,.2],[0,y,zz],m.steel,.01);
  }
  for(const xx of [-5.52,5.52])for(let z=-4.4;z<5;z+=1.75)box(lobby,[.07,4.2,1.62],[xx,2.6,z],m.glass,.008);
  box(lobby,[11.7,.22,11.7],[0,5.25,0],m.concrete,.04);box(lobby,[7,.18,3.4],[0,3.1,6.5],m.white,.045);
  for(const x of [-3.2,3.2])beam(lobby,[x,.25,7.7],[x,3,7.7],.09);
  sign(lobby,'CONVALT ENERGY',[0,4.1,5.62],7);
  box(lobby,[8.4,.16,1.75],[0,2.86,6.3],m.white,.04);
  for(let x=-3.8;x<=3.8;x+=1.9)beam(lobby,[x,2.86,5.48],[x,2.86,7.05],.06,m.steel);
  for(const z of [-3.7,0,3.7]){box(lobby,[.58,.58,.58],[-5.6,.34,z],m.concrete,.06);box(lobby,[.46,.46,.46],[5.6,.34,z],m.concrete,.06);}
  // Entrance doors, slender exterior sun shades and a finished forecourt.
  for(const x of [-.75,.75]){
    box(lobby,[1.44,2.4,.055],[x,1.5,5.59],m.glassLit,.012);
    pipe(lobby,[x+.45,1.05,5.65],[x+.45,1.78,5.65],.025,m.steel);
  }
  for(let z=-4.8;z<=4.8;z+=.65)box(lobby,[.11,4.25,.12],[5.66,2.55,z],m.timber,.014);
  for(const x of [-5,5]){box(lobby,[1.1,.6,1.7],[x,.45,7.1],m.concrete,.07);box(lobby,[.92,.06,1.5],[x,.78,7.1],m.soil,.01);}
  for(let x=-5;x<=5;x+=1.4)box(lobby,[.016,.01,2.6],[x,.116,6.5],m.seal,0).castShadow=false;
  const annex=hall('production-service-annex',-38,32,6,9,4.8);rooftopHVAC(annex,0,5.2,0);

  // Photovoltaic park. Cell atlas and four-rail frames remain visible at all angles.
  const field=group('photovoltaic-park');
  for(let row=0;row<8;row++)for(let col=0;col<9;col++)solarTable(field,-28.5+col*5.35,1.25,-1-row*3.55,4.45,2.28,.28,-.02);
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)solarTable(field,8.5+col*4.95,1.2,-4-row*3.55,4.1,2.18,.26,-.02);
  // Keep the inverter row in the service aisle, clear of the eastern PV edges.
  for(let z=-3;z>-26;z-=8){
    box(field,[1.55,.14,1.05],[22.2,-.06,z],m.concrete,.02);
    box(field,[1.3,1.55,.8],[22.2,.77,z],m.white,.06);
    box(field,[.87,.74,.02],[22.2,1,z+.41],m.grille,0);
  }
  apron(field,10,7,-24,-29);
  apron(field,8,5,15,-30);
  powerCabinet(field,16.6,.03,-29.4,.92,.65,1.22);
  powerCabinet(field,18.0,.03,-31.0,.92,.65,1.22);
  // Enclose both utility aprons, including their curbs, with a service setback.
  // The former z=-29.8 boundary sliced directly through both equipment pads.
  fenceRun(field,[-32,.02,4.8],[-32,.02,-34],1.28);
  fenceRun(field,[-32,.02,-34],[24,.02,-34],1.28);
  fenceRun(field,[24,.02,-34],[24,.02,4.8],1.28);
  fenceRun(field,[24,.02,4.8],[-32,.02,4.8],1.28);
  for(let i=0;i<3;i++){box(field,[2.2,2.6,2.8],[-27+i*3,1.4,-29],m.white,.11);mesh(field,geometry('inverter-face',()=>new THREE.PlaneGeometry(1.8,1.9)),m.grille,[-27+i*3,1.5,-27.58]);}

  // Shared-axis turbine assembly retained; blades have thickness and tapered roots.
  function windTurbine(x,z,scale=1){
    const assembly=group('wind-turbine',[x,0,z]);assembly.scale.setScalar(scale);disc(assembly,1.15,[0,0,0]);
    cyl(assembly,.45,12,[0,6,0],m.white,.24);
    for(let y=3;y<12;y+=3)cyl(assembly,.451-y*.017,.06,[0,y,0],m.steel);
    const head=group('yaw-head',[0,12.08,0],assembly);head.rotation.y=-.18;
    box(head,[1.18,.78,2.35],[0,.18,-.82],m.white,.17);
    box(head,[.78,.09,.85],[0,.61,-.95],m.grille,.025);
    pipe(head,[0,.18,.05],[0,.18,1.34],.14);
    const rotor=group('rotor',[0,.18,1.34],head);rotor.userData.animated=true;
    const hub=mesh(rotor,sphere,m.white,[0,0,.07],[0,0,0],[.57,.57,.53]);
    const coords=[[-.13,.27],[.16,.27],[.25,1.5],[.14,5.72],[-.025,6.15],[-.13,5.65],[-.2,1.7]];
    const pos=[],ids=[],len=coords.length;
    for(const zz of [-.08,.08])for(const [xx,yy]of coords)pos.push(xx,yy,zz);
    for(let j=1;j<len-1;j++){ids.push(0,j+1,j,len,len+j,len+j+1);}for(let j=0;j<len;j++){const k=(j+1)%len;ids.push(j,k,j+len,k,k+len,j+len);}
    const bg=geometry('tapered-blade',()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(ids);g.computeVertexNormals();return g;});
    const blades=[];for(let i=0;i<3;i++)blades.push(mesh(rotor,bg,m.white,[0,0,0],[0,0,i*2*Math.PI/3]));
    turbines.push({assembly,head,rotor,hub,blades});animated.push({node:rotor,axis:'z',speed:-.42,phase:turbines.length*.72});
  }
  // East-side pair requested in the latest annotated view:
  // 1) move only the circled existing turbine backward from z=16 to z=2,
  //    keeping its x coordinate and scale unchanged;
  // 2) add a new turbine at the marked '+' lawn position, outside the east
  //    solar fence and aligned with the opposite-side turbine at z=-27.
  // Both west-side turbines remain exactly unchanged.
  windTurbine(28,2,1.05);      // existing circled turbine / moved backward
  windTurbine(-34.5,-27,.96);  // west lower turbine / unchanged
  windTurbine(-34.5,2,.9);     // west upper turbine / unchanged
  windTurbine(28,-27,.96);     // NEW east lower turbine / '+' marked lawn

  // Architectural data-center modules: facade fins, screening and service yards.
  for(const [i,z]of [-45,-58,-71].entries()){
    const dc=hall(`data-center-${i+1}`,11,z,29,9,6.4);
    for(const zz of [-4.6,4.6]){
      box(dc,[26,2.5,.06],[0,3.7,zz],m.dark,.01);
      for(let x=-12.5;x<13;x+=.85)box(dc,[.10,2.6,.5],[x,3.7,zz],m.steel,.014);
      box(dc,[25,.08,.09],[0,2.25,zz+.03],m.lamp,.01);
    }
    for(let x=-10.5;x<13;x+=5.3)rooftopHVAC(dc,x,6.7,0);
    for(let x=-12;x<=12;x+=4)pipe(dc,[x,6.95,2.8],[x+2.8,6.95,2.8],.09);
    sign(dc,`COMPUTE HALL  0${i+1}`,[0,5.6,4.69],10);
    for(const x of [-9.6,-4.8,0,4.8,9.6])rooftopSkylight(dc,x,6.78,0,2.25,1.1,.26);
    for(const side of [-1,1])for(let x=-12.6;x<=12.6;x+=1.45)box(dc,[.09,4.4,.10],[x,2.7,side*4.64],m.steel,.008);
    apron(dc,5,10,18,0);
    box(dc,[4.9,.12,1.15],[18,3.6,5.15],m.white,.03);
    for(const dx of [-1.8,1.8])beam(dc,[18+dx,3.55,4.6],[18+dx,2.4,5.58],.05,m.steel);
    serviceModule(dc,18,.08,0);
    for(const zz of [-2.6,1.1]){box(dc,[3,2,2.2],[18,1.16,zz],m.dark,.11);mesh(dc,geometry('gen-grille',()=>new THREE.PlaneGeometry(2.5,1.35)),m.grille,[18,1.3,zz+1.11]);pipe(dc,[18.9,2.15,zz],[18.9,3.2,zz],.11);}
  }

  // Recovery campus: open process shed, correctly supported drum, conveyors,
  // tanks, loading bay and separated recovered-material bins.
  const recycle=hall('material-recovery-hall',-12,-89,27,17,6.8);
  sign(recycle,'MATERIAL RECOVERY',[0,4.8,8.6],18);
  for(let x=-9;x<=9;x+=9){box(recycle,[5,3.2,.1],[x,1.85,8.59],m.dark,.05);for(let yy=.6;yy<3.3;yy+=.35)box(recycle,[4.5,.04,.035],[x,yy,8.66],m.steel,0);box(recycle,[5.4,.10,1.0],[x,3.55,8.98],m.white,.03);for(const dx of [-2.0,2.0])beam(recycle,[x+dx,3.55,8.5],[x+dx,2.55,9.22],.05,m.steel);}
  for(const xx of [-8,0,8])rooftopHVAC(recycle,xx,7.1,-3);
  apron(root,30,20,17,-89);
  const process=group('open-recovery-process',[11,0,-89]);
  for(const xx of [-4.5,4.5])for(const zz of [-5.5,5.5])beam(process,[xx,.12,zz],[xx,7.1,zz],.22,m.steel);
  for(const zz of [-5.5,5.5]){beam(process,[-4.5,7,zz],[4.5,7,zz],.22);beam(process,[-4.5,5.5,zz],[4.5,7,zz],.12);}
  box(process,[10,.18,12.2],[0,7.25,0],m.cladding,.025);
  const drum=group('recovery-drum',[1,3.05,0],process);drum.userData.animated=true;
  const shell=mesh(drum,geometry('open-trommel-shell',()=>new THREE.CylinderGeometry(1.55,1.55,6.5,32,1,true)),m.perforated);shell.rotation.z=Math.PI/2;
  for(const xx of [-3.25,3.25])mesh(drum,geometry('drum-mouth',()=>new THREE.TorusGeometry(1.50,.08,8,32)),m.steel,[xx,0,0],[0,Math.PI/2,0]);
  for(const xx of [-2.6,2.6])mesh(drum,geometry('drum-band',()=>new THREE.TorusGeometry(1.58,.085,8,30)),m.dark,[xx,0,0],[0,Math.PI/2,0]);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;box(drum,[5.9,.05,.055],[0,Math.cos(a)*1.554,Math.sin(a)*1.554],m.dark,.01).rotation.x=a;}
  animated.push({node:drum,axis:'x',speed:.22});
  for(const xx of [-1.5,3.5])for(const zz of [-1,1])beam(process,[xx,.2,zz],[xx,2.05,zz],.3,m.dark);
  box(process,[8,.16,1.2],[1,2.25,3.25],m.grille,.02);
  for(let x=-3;x<=5;x+=2){beam(process,[x,.2,3.25],[x,2.25,3.25],.12);beam(process,[x,2.25,3.78],[x,3.35,3.78],.06,m.yellow);}
  for(const yy of [2.82,3.35])beam(process,[-3,yy,3.78],[5,yy,3.78],.065,m.yellow);
  function conveyor(a,b){
    const mid=new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5),delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),len=delta.length();
    const belt=group('conveyor',mid.toArray());belt.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),delta.clone().normalize());
    box(belt,[len,.18,1.25],[0,0,0],m.black,.02);
    for(const z of [-.71,.71])box(belt,[len,.25,.13],[0,-.1,z],m.steel,.025);
    for(let x=-len/2+.4;x<len/2;x+=.8){const r=cyl(belt,.095,1.42,[x,-.13,0],m.steel);r.rotation.x=Math.PI/2;}
    for(let i=0;i<5;i++){const f=i/4,xx=a[0]+(b[0]-a[0])*f,yy=a[1]+(b[1]-a[1])*f,zz=a[2]+(b[2]-a[2])*f;beam(root,[xx,.14,zz],[xx,yy-.15,zz],.1);}
    for(let i=0;i<8;i++){const piece=box(belt,[.28,.12,.35],[-len/2+.5+i*(len-1)/8,.16,(i%2?1:-1)*.22],i%3===0?m.copper:m.glass,.035);piece.rotation.y=i*.83;}
  }
  conveyor([-1,1.4,-82],[7,3,-87]);conveyor([16,3,-89],[27,1.4,-86]);
  for(let j=0;j<3;j++){
    const x=24+j*3.3,z=-96;box(root,[2.9,1.3,3.4],[x,.78,z],m.dark,.05);box(root,[2.6,.22,3.1],[x,1.2,z],j===0?m.copper:j===1?m.glass:m.steel,.03);
  }
  for(const [i,x]of [-24,-20].entries()){
    const silo=group('recovery-silo',[x,0,-102]);cyl(silo,1.25,6.5,[0,3.65,0],m.steel);
    mesh(silo,sphere,m.steel,[0,6.88,0],[0,0,0],[1.25,.52,1.25]);for(const y of [1,3.5,6.2])mesh(silo,geometry('silo-ring',()=>new THREE.TorusGeometry(1.26,.04,6,24)),m.dark,[0,y,0],[Math.PI/2,0,0]);
    pipe(root,[x,5.6,-102],[x,5.6,-98],.15);pipe(root,[x,5.6,-98],[x,2,-98],.15);
  }

  // Maintenance ladders, static platforms and industrial identification details.
  for(const x of [-24,-20]){
    for(const dx of [-.28,.28])pipe(root,[x+dx,.25,-100.64],[x+dx,6.7,-100.64],.026,m.steel);
    for(let y=.5;y<6.7;y+=.32)pipe(root,[x-.28,y,-100.64],[x+.28,y,-100.64],.022,m.steel);
    for(let y=2.2;y<6.7;y+=.9){const cage=mesh(root,geometry('ladder-cage',()=>new THREE.TorusGeometry(.43,.022,4,16,Math.PI)),m.steel,[x,y,-100.6],[Math.PI/2,0,0]);}
  }
  box(process,[1.1,.65,.7],[-2.7,1.7,1.4],m.dark,.06);
  cyl(process,.29,.7,[-3.5,1.8,1.4],m.steel).rotation.z=Math.PI/2;
  for(let i=0;i<12;i++){const yy=2.27+(i%2)*.06;box(process,[.055,.04,1.1],[-2.8+i*.64,yy,3.25],m.steel,.005).castShadow=false;}

  // Pond and pedestrian gardens, outside PV rows and vehicle roads.
  const garden=group('reflecting-water-and-gardens',[13,0,18]);
  disc(garden,8.9,[0,.01,0],m.concrete,1,.66);const pond=disc(garden,8.5,[0,.09,0],m.water,1,.66);pond.castShadow=false;reflections.push(installWaterReflection(pond,scene,renderer,high));
  const promenade=mesh(garden,geometry('pond-edge',()=>new THREE.TorusGeometry(8.7,.18,8,80)),m.concrete,[0,.12,0],[Math.PI/2,0,0],[1,.66,1]);
  for(let i=0;i<34;i++){const a=i/34*Math.PI*2;box(garden,[.8,.14,.32],[Math.cos(a)*10,.08,Math.sin(a)*6.8],m.paving,.02).rotation.y=-a;}
  for(const x of [-6,0,6]){box(garden,[2.4,.15,.7],[x,.62,8.1],m.timber,.06);for(const xx of [-.85,.85])box(garden,[.1,.55,.58],[x+xx,.29,8.1],m.dark,.025);}

  // Foliage: overlapping irregular crowns rather than single cone primitives.
  const planting=group('landscape-planting');

  // Trees belong in soil/lawn, never through concrete or paved service courts.
  // These buffered rectangles mirror the principal hardscape aprons around the
  // manufacturing campus and service areas. Random perimeter planting is
  // rejected before geometry is created when its trunk would land in hardscape.
  const treeHardscapeZones=[
    ['manufacturing-apron',-16,35,18.5,10.5],
    ['lobby-apron',9,34,7.0,7.5],
    ['east-service-apron',24,35,7.7,5.7],
    ['north-loading-court',-13,53,17.5,5.0],
    ['west-service-apron',-26,-27,7.5,5.0],
    ['front-driveway',-5,45.5,27.0,4.2],
    ['front-lawn-clear-zone',-30.0,31.0,10.5,10.5],
    ['front-approach-clear-zone',-3.5,22.0,10.5,5.5],
    ['front-crosswalk-clear-zone',17.0,51.0,10.0,5.0],
    ['east-service-south-tree-clear-zone',24.5,20.0,2.5,5.0]
  ];
  function treeHitsHardscape(x,z,clearance=.75){
    return treeHardscapeZones.some(([,cx,cz,hx,hz])=>
      Math.abs(x-cx)<=hx+clearance&&Math.abs(z-cz)<=hz+clearance
    );
  }
  function tree(x,z,h=4.2){
    if(treeHitsHardscape(x,z))return null;
    h=Math.round(h*4)/4;const y=groundY(x,z),g=group('tree',[x,y,z],planting);
    const seed=((Math.round((x+70)*100)*92837111)^(Math.round((z+120)*100)*689287499))>>>0,rand=randomSequence(seed||17);
    g.rotation.z=(rand()-.5)*.05;g.rotation.x=(rand()-.5)*.03;
    cyl(g,.13,h*.60,[0,h*.30,0],m.bark,.07);
    box(g,[.34,.18,.34],[0,.08,0],m.bark,.05);
    const branchCount=7+Math.floor(rand()*3);
    for(let j=0;j<branchCount;j++){
      const a=rand()*TAU,yy=h*(.42+.44*rand()),reach=h*(.15+.09*rand()),rise=h*(.10+.10*rand()),radius=h*(.19+.06*rand())*(1-j/branchCount*.36);
      const xx=Math.cos(a)*reach,zz=Math.sin(a)*reach;
      pipe(g,[0,h*.26,0],[xx,yy,zz],.024+.02*(1-j/branchCount),m.bark);
      ellipsoid(g,[xx,yy,zz],[radius,radius*(.86+.16*rand()),radius*(.88+.14*rand())],j%3?m.leaf:m.leafLight);
      if(j%2===0)ellipsoid(g,[xx*.62,yy+.1,zz*.62],[radius*.55,radius*.46,radius*.52],m.leafLight);
    }
    for(let i=0;i<4;i++){
      const a=i*1.5708+rand()*.35;
      ellipsoid(g,[Math.cos(a)*h*.07,h*(.58+.05*i),Math.sin(a)*h*.07],[h*.17,h*.16,h*.15],i%2?m.leaf:m.leafLight);
    }
    ellipsoid(g,[0,h*.90,0],[h*.20,h*.23,h*.19],m.leafLight);
  }
  function ornamentalTree(x,z,h=3.15){
    if(treeHitsHardscape(x,z))return null;
    const y=groundY(x,z),g=group('ornamental-tree',[x,y,z],planting),rand=randomSequence((((x+40)*1234)^((z+80)*5678))>>>0||19);
    cyl(g,.09,h*.52,[0,h*.26,0],m.bark,.055);
    for(let j=0;j<5;j++){
      const a=j*TAU/5+rand()*.25,yy=h*(.46+.08*j),reach=h*(.10+.03*j),xx=Math.cos(a)*reach,zz=Math.sin(a)*reach;
      pipe(g,[0,h*.22,0],[xx,yy,zz],.024,m.bark);
      ellipsoid(g,[xx,yy,zz],[h*.15,h*.18,h*.15],j%2?m.leafLight:m.leaf);
    }
    ellipsoid(g,[0,h*.86,0],[h*.18,h*.23,h*.18],m.leafLight);
  }
  function shrub(x,z,scale=1,tone=0){
    const y=groundY(x,z)+.02,g=group('shrub',[x,y,z],planting);
    const a=(x+z)*.37;g.rotation.y=a;
    const mats=[m.leaf,m.leafLight];
    ellipsoid(g,[-.22*scale,.28*scale,0],[.46*scale,.34*scale,.42*scale],mats[(tone+1)%2]);
    ellipsoid(g,[.18*scale,.32*scale,.12*scale],[.44*scale,.36*scale,.40*scale],mats[tone%2]);
    ellipsoid(g,[0,.38*scale,-.12*scale],[.52*scale,.39*scale,.48*scale],mats[(tone+2)%2]);
  }
  function planter(x,z,w,d,count,axis='x'){
    if(treeHitsHardscape(x,z))return null;
    const y=groundY(x,z);box(planting,[w,.16,d],[x,y+.05,z],m.concrete,.06);box(planting,[w-.14,.07,d-.14],[x,y+.15,z],m.soil,.02);
    for(let i=0;i<count;i++){
      const t=count===1?.5:i/(count-1),px=axis==='x'?x-w/2+.24+t*(w-.48):x,pz=axis==='z'?z-d/2+.24+t*(d-.48):z;
      shrub(px,pz,.82+(i%3)*.08,i);
    }
  }
  for(let i=0;i<(high?156:88);i++){
    const a=i*2.39996,f=.86+rng()*.085,[x,z]=rim(a,f);
    const h=3.3+rng()*2.2;
    if(x>31&&x<46)continue;
    if(z<-78&&Math.abs(x)<39)continue;
    if(i===79)continue; // legacy retained suppression from v5.4.4; not one of the latest marked trees
    tree(x,z,h);
  }
  for(let z=-73;z<43;z+=9)tree(46,z,3.2+rng()*.8);
  for(let z=-52;z<42;z+=12)tree(-52,z,3.9+rng());
  // Keep the user-marked front approach clear. The explicit tree at (25,12)
  // remains removed, and the exact two screenshot-marked world pockets are
  // cleared after tree generation so RNG/placement of all other trees is preserved.
  for(const [x,z]of [[-33,20],[-32,-34]])tree(x,z,3.2);

  // Screenshot-to-world mapping from the visible EV apron / pond geometry:
  // 1) tree in front of EV/service apron -> approx (22.87, 43.79)
  // 2) tree behind the pond -> (25.00, 12.00)
  const markedTreeRemovalZones=[
    ['ev-service-front-tree',22.87,43.79,1.8],
    ['pond-rear-tree',25.00,12.00,1.8]
  ];
  for(const child of [...planting.children]){
    if(child.name!=='tree')continue;
    for(const [,cx,cz,r] of markedTreeRemovalZones){
      if(Math.hypot(child.position.x-cx,child.position.z-cz)<=r){
        planting.remove(child);
        break;
      }
    }
  }
  // Keep the user-marked front lawn / driveway pocket completely clear.
  // Only ornamental trees outside that zone remain.
  for(const [x,z,h]of [[24.2,-39.2,2.9],[-21.2,-79.8,3.0],[-8.8,-79.8,3.0]])ornamentalTree(x,z,h);
  // Front approach intentionally clear: planter removed from road-side zone.
  planter(9.0,41.2,9.5,.96,8);
  // East service apron intentionally left clear: no planter/shrubs on concrete.
  planter(11.0,-39.5,21,.96,15);
  planter(-12.0,-80.6,19,.96,12);
  planter(-26.0,-27.0,7.8,.96,5);
  const hedges=[[9,43,10],[24,-36,12],[-27,-78,10]];
  for(const [x,z,w]of hedges){box(planting,[w,.25,1.3],[x,.02,z],m.concrete,.08);for(let i=0;i<w;i+=.8)ellipsoid(planting,[x-w/2+i,.54,z],[.62,.5,.57]);}
  for(let i=0;i<180;i++){
    const a=i*2.399,[x,z]=rim(a,.985);
    if(treeHitsHardscape(x,z,0))continue;
    ellipsoid(planting,[x,groundY(x,z)+.2,z],[.9,.48,.75],i%3?m.leaf:m.leafLight);
  }

  // Low ornamental grasses: a few crossed tapered blades, batched after placement.
  const grassGeo=geometry('grass-tuft',()=>{
    const p=[],ind=[],uv=[],col=[];
    for(let i=0;i<7;i++){
      const a=i*2.399,h=.14+(i%4)*.04,x=Math.cos(a)*.05,z=Math.sin(a)*.05,k=p.length/3;
      p.push(x-.018,0,z,x+.018,0,z,x+Math.cos(a)*.07,h,z+Math.sin(a)*.06);
      uv.push(0,0,1,0,.5,1);col.push(.6,.63,.52,.6,.63,.52,.85,.88,.66);ind.push(k,k+1,k+2);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(ind);g.computeVertexNormals();return g;
  });
  const gr=randomSequence(61925);
  for(let i=0;i<(high?2800:900);i++){
    const a=gr()*6.283,f=.81+gr()*.15,[x,z]=rim(a,f);
    if(x>31&&x<47||x>-51&&x<-35||z>45&&z<58||z<-77&&Math.abs(x)<39)continue;
    mesh(planting,grassGeo,m.tuft,[x,groundY(x,z)+.01,z],[0,gr()*6.28,0],[1+gr(),1+gr(),1+gr()]).castShadow=false;
  }

  // Instance repeated geometry after world placement. Animated subtrees are
  // excluded, so neither turbine pivots nor rooftop fans get detached.
  root.updateMatrixWorld(true);
  const candidates=new Map();
  root.traverse(o=>{
    if(!o.isMesh||o.userData.reflector)return;for(let p=o;p&&p!==root;p=p.parent)if(p.userData.animated)return;
    const key=`${o.geometry.uuid}/${o.material.uuid}/${o.castShadow}/${o.receiveShadow}`;
    if(!candidates.has(key))candidates.set(key,[]);candidates.get(key).push(o);
  });
  let instances=0,batches=0;
  for(const list of candidates.values()){
    if(list.length<3)continue;
    const first=list[0],inst=new THREE.InstancedMesh(first.geometry,first.material,list.length);
    inst.name=`batch-${first.material.name}`;inst.castShadow=first.castShadow;inst.receiveShadow=first.receiveShadow;
    list.forEach((o,i)=>{inst.setMatrixAt(i,o.matrixWorld);o.removeFromParent();});inst.instanceMatrix.needsUpdate=true;inst.computeBoundingSphere();root.add(inst);instances+=list.length;batches++;
  }
  const motionGroups=new Map(), motionBatches=[];
  root.updateMatrixWorld(true);
  root.traverse(pivot=>{if(!pivot.userData.batchMotion)return;
    for(const o of [...pivot.children]){if(!o.isMesh)continue;
      const key=`${o.geometry.uuid}/${o.material.uuid}`;
      if(!motionGroups.has(key))motionGroups.set(key,[]);
      motionGroups.get(key).push({node:o,pivot,local:o.matrix.clone()});
    }
  });
  for(const list of motionGroups.values()){
    const inst=new THREE.InstancedMesh(list[0].node.geometry,list[0].node.material,list.length);
    inst.name='animated-fan-batch';inst.castShadow=false;inst.receiveShadow=true;
    list.forEach((r,i)=>{inst.setMatrixAt(i,r.node.matrixWorld);r.node.removeFromParent();});
    inst.instanceMatrix.needsUpdate=true;inst.computeBoundingSphere();root.add(inst);motionBatches.push({inst,list});
  }
  const workMatrix=new THREE.Matrix4();
  const audit={revision:CAMPUS_REVISION,pvTables:panels.length,turbines:turbines.length,staticInstances:instances,instanceBatches:batches,animatedParts:animated.length,assetBeautyPass:'cars-trees-planters-canopies'};
  root.userData.audit=audit;
  return {
    root, audit, turbines, panels, groundY, materials:m, reflections,
    animate(t){
      for(const a of animated)a.node.rotation[a.axis]=t*a.speed+(a.phase||0);
      root.updateMatrixWorld(true);
      for(const {inst,list} of motionBatches){list.forEach((r,i)=>inst.setMatrixAt(i,workMatrix.multiplyMatrices(r.pivot.matrixWorld,r.local)));inst.instanceMatrix.needsUpdate=true;}
      surfaces.ripple.offset.set(t*.009,t*.003);
    },
    dispose(){reflections.forEach(r=>r.dispose());const gs=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.isInstancedMesh)o.dispose();});geometries.forEach(g=>gs.add(g));boxCache.forEach(g=>gs.add(g));gs.forEach(g=>g.dispose());signs.forEach(s=>{s.map.dispose();s.dispose();});surfaces.dispose();root.removeFromParent();}
  };
}

// A daylight sky, rather than an indoor room, supplies outdoor reflections.
export function lightCampus(scene,renderer,high=true){
  const environment=new THREE.Scene();
  const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
    uniforms:{zenith:{value:new THREE.Color(0x7595ac)},horizon:{value:new THREE.Color(0xd2d6c9)},ground:{value:new THREE.Color(0x4b5143)},sunDirection:{value:new THREE.Vector3(-36,76,86).normalize()}},
    vertexShader:'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec3 direction; uniform vec3 zenith,horizon,ground,sunDirection; void main(){vec3 d=normalize(direction);vec3 sky=mix(ground,horizon,smoothstep(-0.3,0.06,d.y));sky=mix(sky,zenith,pow(max(d.y,0.0),0.65));float sun=pow(max(dot(d,sunDirection),0.0),180.0);gl_FragColor=vec4(sky+vec3(1.0,0.87,0.64)*sun*3.5,1.0);}'
  });
  const skyGeometry=new THREE.SphereGeometry(30,24,12);environment.add(new THREE.Mesh(skyGeometry,skyMaterial));
  const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromScene(environment,.035,.1,70);
  scene.environment=target.texture;scene.environmentIntensity=.84;
  skyMaterial.dispose();skyGeometry.dispose();pmrem.dispose();
  const hemi=new THREE.HemisphereLight(0xdce8ec,0x41402f,.64);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffebd2,3.28);sun.position.set(-36,76,57);sun.target.position.set(0,0,-29);sun.castShadow=high;
  const c=sun.shadow.camera;c.left=-96;c.right=96;c.top=105;c.bottom=-105;c.near=2;c.far=280;
  sun.shadow.mapSize.set(high?4096:1536,high?4096:1536);sun.shadow.normalBias=.015;sun.shadow.bias=-.00008;scene.add(sun,sun.target);
  return {sun,dispose(){scene.environment=null;target.dispose();sun.shadow.map?.dispose();sun.removeFromParent();sun.target.removeFromParent();hemi.removeFromParent();}};
}
