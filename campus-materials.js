import * as THREE from 'three';

// V4 surface atelier. All maps are authored in code, deterministic, local and
// editable. Color maps are sRGB; roughness and normal maps are linear data.
export function randomSequence(seed = 83017) {
  return () => { seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296; };
}
const TAU=Math.PI*2;
function canvasMap(w,h,draw,color=true) {
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const ctx=c.getContext('2d');if(!ctx)throw new Error('Canvas 2D is required for campus surface maps.');
  draw(ctx,w,h);const t=new THREE.CanvasTexture(c);
  t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function hash(x,y,seed) {let v=Math.imul(x+seed,374761393)^Math.imul(y-seed,668265263);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967295;}
function noise(x,y,period,seed) {
  const ix=Math.floor(x),iy=Math.floor(y);let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);
  const h=(a,b)=>hash((a%period+period)%period,(b%period+period)%period,seed);
  const a=h(ix,iy)*(1-u)+h(ix+1,iy)*u,b=h(ix,iy+1)*(1-u)+h(ix+1,iy+1)*u;return a*(1-v)+b*v;
}
function fieldMap(size,base,kind) {
  const heights=new Float32Array(size*size),values=new Float32Array(size*size),rough=new Float32Array(size*size);
  const seed=kind.length*983;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size,fine=hash(x,y,seed),broad=noise(u*5,v*5,5,seed)-.5,mid=noise(u*32,v*32,32,seed+4)-.5;
    let height=.48+mid*.25+(fine-.5)*.11,color=broad*.055+mid*.08+(fine-.5)*.065,r=.82;
    if(kind==='turf') {height=.42+mid*.18+fine*.24;color=broad*.022+mid*.032+(fine-.5)*.044+Math.sin(v*TAU*4)*.005;r=.95;}
    if(kind==='asphalt'){height=.4+fine*.32+mid*.1;color=broad*.045+(fine>.86?.085:0)+(fine-.5)*.055;r=.82+fine*.12;}
    if(kind==='limestone'){height=.5+mid*.15+fine*.04;color=broad*.04+mid*.07+(fine-.5)*.045;r=.84+mid*.16;}
    if(kind==='rock'){const strata=Math.sin((v*17+noise(u*7,v*7,7,4)*.21)*TAU);height=.5+strata*.09+mid*.24;color=broad*.12+mid*.2+strata*.04;r=.95;}
    if(kind==='metal'){height=.5+Math.sin(u*TAU*96)*.055;color=broad*.02+(fine-.5)*.028;r=.66+mid*.16;}
    if(kind==='timber'){height=.5+noise(u*60,v*4,60,38)*.16;color=noise(u*60,v*4,60,38)*.17-.10+broad*.04;r=.84;}
    const i=y*size+x;heights[i]=height;values[i]=color;rough[i]=r;
  }
  const albedo=canvasMap(size,size,(ctx,w,h)=>{const im=ctx.createImageData(w,h);for(let i=0;i<w*h;i++){for(let k=0;k<3;k++)im.data[i*4+k]=Math.max(0,Math.min(255,base[k]+values[i]*255));im.data[i*4+3]=255;}ctx.putImageData(im,0,0);});
  const normal=canvasMap(size,size,(ctx,w,h)=>{const im=ctx.createImageData(w,h),sample=(x,y)=>heights[((y+h)%h)*w+(x+w)%w];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=(sample(x-1,y)-sample(x+1,y))*1.8,dy=(sample(x,y-1)-sample(x,y+1))*1.8,len=Math.sqrt(dx*dx+dy*dy+1),i=(y*w+x)*4;im.data.set([128+127*dx/len,128+127*dy/len,128+127/len,255],i);}ctx.putImageData(im,0,0);},false);
  const roughness=canvasMap(size,size,(ctx,w,h)=>{const im=ctx.createImageData(w,h);for(let i=0;i<w*h;i++){const r=rough[i]*255;im.data.set([r,r,r,255],i*4);}ctx.putImageData(im,0,0);},false);
  return {albedo,normal,roughness};
}
export function createCampusMaterials(renderer) {
  const maps=[],materials=[];
  const own=(t,{clamp=false,anisotropy=16}={})=>{
    t.generateMipmaps=true;
    t.minFilter=THREE.LinearMipmapLinearFilter;
    t.magFilter=THREE.LinearFilter;
    t.anisotropy=Math.min(anisotropy,renderer?.capabilities.getMaxAnisotropy()||8);
    t.wrapS=t.wrapT=clamp?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;
    t.needsUpdate=true;maps.push(t);return t;
  };
  const mapsFor=(base,kind,size=256)=>{const p=fieldMap(size,base,kind);Object.values(p).forEach(own);return p;};
  const turf=mapsFor([67,88,54],'turf',1024),asphalt=mapsFor([61,67,68],'asphalt',768),concrete=mapsFor([179,178,166],'limestone',768);
  const rock=mapsFor([98,98,86],'rock',1024),metal=mapsFor([174,186,187],'metal',768),timber=mapsFor([133,103,72],'timber',768);
  const surf=(p,strength)=>({map:p.albedo,normalMap:p.normal,roughnessMap:p.roughness,normalScale:new THREE.Vector2(strength,strength)});
  // Top-view stable PV atlas: lower-frequency cell detail survives mipmapping
  // without the high-contrast micro-lines that previously shimmered at distance.
  const solar=own(canvasMap(2048,1024,(c,w,h)=>{
    c.fillStyle='#172331';c.fillRect(0,0,w,h);const rng=randomSequence(811);
    const moduleCols=4,moduleRows=2,moduleW=w/moduleCols,moduleH=h/moduleRows;
    for(let my=0;my<moduleRows;my++)for(let mx=0;mx<moduleCols;mx++){
      const ox=mx*moduleW+10,oy=my*moduleH+10,innerW=moduleW-20,innerH=moduleH-20;
      c.fillStyle='#0e151d';c.fillRect(ox,oy,innerW,innerH);
      const sheen=c.createLinearGradient(ox,oy,ox+innerW,oy+innerH);
      sheen.addColorStop(0,'rgba(72,110,145,.22)');
      sheen.addColorStop(.5,'rgba(35,55,78,.10)');
      sheen.addColorStop(1,'rgba(18,28,40,.20)');
      c.fillStyle=sheen;c.fillRect(ox+2,oy+2,innerW-4,innerH-4);
      const cols=8,rows=4,cw=(innerW-8)/cols,ch=(innerH-8)/rows;
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const x=ox+4+col*cw,y=oy+4+row*ch,d=rng()*8;
        c.fillStyle=`rgb(${20+d},${42+d},${64+d})`;
        c.fillRect(x+1,y+1,cw-2,ch-2);
        c.strokeStyle='rgba(155,180,205,.10)';c.lineWidth=.35;
        c.strokeRect(x+1.5,y+1.5,cw-3,ch-3);
      }
      c.strokeStyle='rgba(210,220,230,.18)';c.lineWidth=1;
      for(const a of [.25,.5,.75]){
        const xx=ox+innerW*a;c.beginPath();c.moveTo(xx,oy+6);c.lineTo(xx,oy+innerH-6);c.stroke();
      }
    }
  }),{clamp:true,anisotropy:16});
  const solarNormal=own(canvasMap(512,256,(c,w,h)=>{
    const im=c.createImageData(w,h);
    for(let i=0;i<w*h;i++)im.data.set([128,128,255,255],i*4);
    c.putImageData(im,0,0);
  },false),{clamp:true,anisotropy:8});
  const solarRough=own(canvasMap(512,256,(c,w,h)=>{
    const r=randomSequence(87),im=c.createImageData(w,h);
    for(let i=0;i<w*h;i++){const v=150+r()*7;im.data.set([v,v,v,255],i*4);}
    c.putImageData(im,0,0);
  },false),{clamp:true,anisotropy:8});
  const grille=own(canvasMap(256,256,(c,w,h)=>{c.fillStyle='#263238';c.fillRect(0,0,w,h);for(let i=0;i<w;i+=8){c.fillStyle='#7d898d';c.fillRect(i,0,1.8,h);c.fillRect(0,i,w,1.8);c.fillStyle='#151c20';c.fillRect(i+2,2,1,h);}}));
  const perforation=own(canvasMap(128,128,(c,w,h)=>{c.fillStyle='#ffffff';c.fillRect(0,0,w,h);c.fillStyle='#000000';for(let y=4;y<h;y+=16)for(let x=4;x<w;x+=16){c.beginPath();c.arc(x,y,3.3,0,TAU);c.fill();}},false));
  const ripple=own(canvasMap(256,256,(c,w,h)=>{const im=c.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=x/w*TAU,b=y/h*TAU;const v=128+17*Math.sin(a*6+b*2)+8*Math.sin(b*9-a);im.data.set([v,v,v,255],(y*w+x)*4);}c.putImageData(im,0,0);},false));
  // An alpha-tested compound-leaf spray breaks up the broad polygon outline
  // into small leaflets. Opaque cut-outs keep depth, shadows and batching stable.
  const leafMap=own(canvasMap(256,256,(c,w,h)=>{
    const rng=randomSequence(581);c.clearRect(0,0,w,h);
    for(let i=0;i<110;i++){
      const a=i*2.39996,rr=Math.sqrt((i+.5)/110),xx=128+Math.cos(a)*105*rr,yy=128+Math.sin(a)*115*rr;
      c.save();c.translate(xx,yy);c.rotate(a*.63);
      const len=19+rng()*18,width=7+rng()*6;
      const grad=c.createLinearGradient(0,-width,0,width);grad.addColorStop(0,'#b5c190');grad.addColorStop(.45,'#99ac7a');grad.addColorStop(1,'#748e59');c.fillStyle=grad;
      c.beginPath();c.moveTo(-len*.5,0);c.bezierCurveTo(-len*.2,-width,len*.3,-width,len*.5,0);c.bezierCurveTo(len*.25,width,-len*.25,width,-len*.5,0);c.fill();
      c.strokeStyle='rgba(190,201,147,.5)';c.lineWidth=.7;c.beginPath();c.moveTo(-len*.4,0);c.lineTo(len*.4,0);c.stroke();c.restore();
    }
  }));
  const leafAlpha=own(canvasMap(256,256,(c,w,h)=>{
    const source=leafMap.image.getContext('2d').getImageData(0,0,w,h),im=c.createImageData(w,h);
    for(let i=0;i<w*h;i++){const a=source.data[i*4+3];im.data.set([a,a,a,255],i*4);}c.putImageData(im,0,0);
  },false));
  // Bleed leaf color into transparent texels and store opacity separately. This
  // prevents dark halos and disappearing crowns when distant mip levels blend.
  {const c=leafMap.image.getContext('2d'),im=c.getImageData(0,0,256,256);for(let i=0;i<im.data.length;i+=4){if(im.data[i+3]<32){im.data[i]=151;im.data[i+1]=171;im.data[i+2]=122;}im.data[i+3]=255;}c.putImageData(im,0,0);leafMap.needsUpdate=true;}
  const normalScale=new THREE.Vector2(.08,.08);
  const standard=(color,roughness=.75,metalness=0,extra={})=>{const a=new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});materials.push(a);return a;};
  const m={
    grass:standard(0xffffff,1,0,surf(turf,.12)),
    asphalt:standard(0xffffff,1,0,surf(asphalt,.19)),
    concrete:standard(0xf1f1ea,1,0,surf(concrete,.13)),
    paving:standard(0xd5d6ce,1,0,surf(concrete,.17)),
    stone:standard(0xffffff,1,0,surf(rock,.52)),
    white:standard(0xe5ebe5,.34,.10),
    cladding:standard(0xf3f4ec,.74,.25,surf(metal,.22)),
    dark:standard(0x25363d,.56,.22),
    steel:standard(0xa8b5ba,.27,.88),black:standard(0x182127,.78,.02),
    copper:standard(0xa87753,.41,.65),yellow:standard(0xbca158,.65,.08),marking:standard(0xd0d1c4,.89,0),
    glass:standard(0x56727c,.10,.38,{envMapIntensity:1.22}),
    glassLit:standard(0x8a9da0,.20,.22,{emissive:0xbda879,emissiveIntensity:.06,envMapIntensity:1.24}),
    pv:standard(0xffffff,.38,.08,{map:solar,normalMap:solarNormal,normalScale:new THREE.Vector2(.02,.02),roughnessMap:solarRough,envMapIntensity:.72,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),
    grille:standard(0xffffff,.64,.60,{map:grille}),
    perforated:standard(0xa1afb0,.46,.72,{alphaMap:perforation,alphaTest:.45,side:THREE.DoubleSide}),
    leaf:standard(0x7f9c64,.84,0,{map:leafMap,vertexColors:true,side:THREE.DoubleSide,alphaMap:leafAlpha,alphaTest:.14}),
    leafLight:standard(0x9bb779,.86,0,{map:leafMap,vertexColors:true,side:THREE.DoubleSide,alphaMap:leafAlpha,alphaTest:.14}),
    tuft:standard(0x789252,.95,0,{vertexColors:true,side:THREE.DoubleSide}),
    bark:standard(0x655644,.99,0,{map:rock.albedo,normalMap:rock.normal,normalScale}),
    water:standard(0x304f57,.14,.26,{bumpMap:ripple,bumpScale:.045,envMapIntensity:1.35}),
    lamp:standard(0xefe2c2,.4,0,{emissive:0xffdbb4,emissiveIntensity:.85}),
    timber:standard(0xffffff,.98,0,surf(timber,.15)),
    gravel:standard(0xaba99b,1,0,surf(rock,.4)),
    soil:standard(0x4d493a,1,0,surf(asphalt,.3)),
    red:standard(0x9b4b35,.52,.05),
    seal:standard(0x303632,.94,0),
  };
  Object.entries(m).forEach(([name,mat])=>mat.name=`campus-${name}`);
  return {m,maps,ripple,dispose(){materials.forEach(a=>a.dispose());maps.forEach(t=>t.dispose());}};
}
export function facadeSign(text,materialColor='#e4e6dd') {
  const t=canvasMap(1024,128,(c,w,h)=>{c.fillStyle='#203036';c.fillRect(0,0,w,h);c.fillStyle=materialColor;c.font='500 51px Arial, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,w/2,h/2,w-56);});
  t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;
  const material=new THREE.MeshStandardMaterial({map:t,roughness:.62,metalness:.14});material.name=`sign-${text}`;return material;
}
