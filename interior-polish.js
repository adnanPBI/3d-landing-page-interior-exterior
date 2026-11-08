import * as THREE from 'three';

/** Interior-only visual detailing. All coordinates are relative to the existing
 * unchanged building envelope; decorations stay above floor circulation or
 * inside the footprints of equipment already registered as obstacles.
 */
export const POLISH_REVISION='interiors-v1.1.0';

function createProceduralGrain(textures, width=256, height=256, mode='metal') {
  const cvs=document.createElement('canvas');
  cvs.width=width; cvs.height=height;
  const ctx=cvs.getContext('2d');
  if(!ctx)return null;
  const img=ctx.createImageData(width,height);
  const d=img.data;
  let seed=mode==='normal'?419:mode==='hazard'?911:137;
  const rand=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};

  if(mode==='hazard'){
    ctx.fillStyle='#e2b94b';
    ctx.fillRect(0,0,width,height);
    ctx.fillStyle='#161e21';
    const stripe=32;
    for(let i=-height;i<width+height;i+=stripe*2){
      ctx.beginPath();
      ctx.moveTo(i,0);
      ctx.lineTo(i+stripe,0);
      ctx.lineTo(i+stripe-height,height);
      ctx.lineTo(i-height,height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle='rgba(255,255,255,0.18)';
    ctx.lineWidth=3;
    ctx.strokeRect(1.5,1.5,width-3,height-3);
  } else if(mode==='wafer'){
    ctx.fillStyle='#0a192f';
    ctx.fillRect(0,0,width,height);
    const pad=8;
    const g=ctx.createLinearGradient(0,0,width,height);
    g.addColorStop(0,'#174276');
    g.addColorStop(0.45,'#0e2c54');
    g.addColorStop(1,'#1e5694');
    ctx.fillStyle=g;
    ctx.fillRect(pad,pad,width-pad*2,height-pad*2);
    ctx.fillStyle='#0a192f';
    const c=22;
    for(const [cx,cy] of [[pad,pad],[width-pad-c,pad],[pad,height-pad-c],[width-pad-c,height-pad-c]]){
      ctx.fillRect(cx,cy,c,c);
    }
    ctx.strokeStyle='rgba(200,230,255,0.38)';
    ctx.lineWidth=1;
    for(let y=pad+6;y<height-pad;y+=6){
      ctx.beginPath();ctx.moveTo(pad+4,y);ctx.lineTo(width-pad-4,y);ctx.stroke();
    }
    ctx.strokeStyle='rgba(238,248,255,0.82)';
    ctx.lineWidth=2.0;
    for(const frac of [0.16,0.33,0.5,0.67,0.84]){
      const x=pad+(width-pad*2)*frac;
      ctx.beginPath();ctx.moveTo(x,pad+3);ctx.lineTo(x,height-pad-3);ctx.stroke();
    }
    ctx.strokeStyle='#8eb4d6';
    ctx.lineWidth=2.5;
    ctx.strokeRect(pad,pad,width-pad*2,height-pad*2);
  } else if(mode==='module'){
    ctx.fillStyle='#101820';
    ctx.fillRect(0,0,width,height);
    ctx.fillStyle='#dce6ec';
    ctx.fillRect(8,8,width-16,height-16);
    const cols=12,rows=6;
    const cw=(width-24)/cols,ch=(height-24)/rows;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const cx=12+c*cw,cy=12+r*ch;
      const g=ctx.createLinearGradient(cx,cy,cx+cw,cy+ch);
      g.addColorStop(0,'#133863');
      g.addColorStop(0.5,'#0d2747');
      g.addColorStop(1,'#1a497d');
      ctx.fillStyle=g;
      ctx.fillRect(cx+1,cy+1,cw-2,ch-2);
      ctx.strokeStyle='rgba(220,238,255,0.45)';
      ctx.lineWidth=0.7;
      ctx.beginPath();
      ctx.moveTo(cx+cw*0.33,cy+1);ctx.lineTo(cx+cw*0.33,cy+ch-1);
      ctx.moveTo(cx+cw*0.67,cy+1);ctx.lineTo(cx+cw*0.67,cy+ch-1);
      ctx.stroke();
    }
    ctx.fillStyle='#e4eef2';
    ctx.fillRect(width/2-1.5,10,3,height-20);
    ctx.strokeStyle='#7a9098';
    ctx.lineWidth=6;
    ctx.strokeRect(3,3,width-6,height-6);
  } else {
    for(let y=0;y<height;y++){
      const rowWave=Math.sin(y*0.35)*8+Math.sin(y*1.2)*4;
      for(let x=0;x<width;x++){
        const idx=(y*width+x)*4;
        const n=(rand()-0.5)*18;
        const streak=Math.sin((x*0.08)+(y*0.02))*6;
        if(mode==='normal'){
          const nx=128+Math.max(-24,Math.min(24,n*0.6+streak));
          const ny=128+Math.max(-24,Math.min(24,rowWave+n*0.4));
          d[idx]=nx; d[idx+1]=ny; d[idx+2]=248; d[idx+3]=255;
        } else {
          const v=Math.max(40,Math.min(235,165+rowWave+streak+n));
          d[idx]=v; d[idx+1]=v; d[idx+2]=v; d[idx+3]=255;
        }
      }
    }
    ctx.putImageData(img,0,0);
  }

  const tex=new THREE.CanvasTexture(cvs);
  tex.colorSpace=(mode==='hazard'||mode==='wafer'||mode==='module')?THREE.SRGBColorSpace:THREE.NoColorSpace;
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  textures.push(tex);
  return tex;
}

function createProcessHoodTexture(textures, isCleanWhite=false) {
  const cvs=document.createElement('canvas');
  cvs.width=512; cvs.height=256;
  const ctx=cvs.getContext('2d');
  if(!ctx)return null;

  const bg=ctx.createLinearGradient(0,0,0,256);
  bg.addColorStop(0,isCleanWhite?'#dde7e6':'#233740');
  bg.addColorStop(0.5,isCleanWhite?'#c8d6d5':'#182830');
  bg.addColorStop(1,isCleanWhite?'#b4c4c3':'#101c22');
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,512,256);

  // Chamfered architectural panel seams & rivets
  ctx.strokeStyle=isCleanWhite?'#6e8486':'#486872';
  ctx.lineWidth=3;
  ctx.strokeRect(8,8,496,240);
  ctx.beginPath();
  ctx.moveTo(172,8);ctx.lineTo(172,248);
  ctx.moveTo(356,8);ctx.lineTo(356,248);
  ctx.stroke();

  // Top telemetry status header strip
  ctx.fillStyle='#0a161b';
  ctx.fillRect(16,16,480,42);
  ctx.strokeStyle='#5ce1e6';
  ctx.lineWidth=1.5;
  ctx.strokeRect(16,16,480,42);
  ctx.fillStyle='#5ce1e6';
  ctx.font='700 16px "Outfit", sans-serif';
  ctx.textAlign='left';
  ctx.fillText('CONVALT HJT-PRO · PECVD / SPUTTERING CHAMBER',28,42);
  ctx.fillStyle='#4be39a';
  ctx.textAlign='right';
  ctx.fillText('ILLUSTRATIVE · ILLUSTRATIVE',484,42);

  // Left panel: engraved gas manifold schematic & digital 7-segment readouts
  ctx.fillStyle='#0c1b21';
  ctx.fillRect(22,72,138,162);
  ctx.strokeStyle='#355963';
  ctx.strokeRect(22,72,138,162);
  const readouts=[['CHAMBER T','210.4 °C','#f5c26b'],['SiH4 FLOW','145 sccm','#5ce1e6'],['H2 PLASMA','820 sccm','#4be39a']];
  readouts.forEach(([lbl,val,col],idx)=>{
    const y=82+idx*50;
    ctx.fillStyle='#84a8b0';ctx.font='600 10px sans-serif';ctx.textAlign='left';
    ctx.fillText(lbl,32,y+12);
    ctx.fillStyle='#061014';ctx.fillRect(32,y+17,118,24);
    ctx.fillStyle=col;ctx.font='700 15px monospace';
    ctx.fillText(val,40,y+34);
  });

  // Right panel: laser/RF safety placards & rotary pressure dials
  ctx.fillStyle='#0c1b21';
  ctx.fillRect(368,72,126,162);
  ctx.strokeStyle='#355963';
  ctx.strokeRect(368,72,126,162);
  for(let g=0;g<2;g++){
    const gx=402+g*58,gy=114;
    ctx.fillStyle='#e8f4f6';
    ctx.beginPath();ctx.arc(gx,gy,20,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#5ce1e6';ctx.lineWidth=3;ctx.stroke();
    ctx.strokeStyle='#d94b38';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(gx,gy);ctx.lineTo(gx+10,gy-11);ctx.stroke();
  }
  ctx.fillStyle='#f0c246';
  ctx.fillRect(380,158,102,62);
  ctx.fillStyle='#141c20';
  ctx.font='700 11px sans-serif';ctx.textAlign='center';
  ctx.fillText('CLASS 1 LASER',431,180);
  ctx.fillText('RF PLASMA LOCK',431,198);
  ctx.fillText('ISO-7 CLEAN',431,212);

  const tex=new THREE.CanvasTexture(cvs);
  tex.colorSpace=THREE.SRGBColorSpace;
  textures.push(tex);
  return tex;
}

function createMachineCabinetTexture(textures, isRecycling=false) {
  const cvs=document.createElement('canvas');
  cvs.width=512; cvs.height=256;
  const ctx=cvs.getContext('2d');
  if(!ctx)return null;

  const bg=ctx.createLinearGradient(0,0,0,256);
  bg.addColorStop(0,isRecycling?'#5c706e':'#9eb2b4');
  bg.addColorStop(1,isRecycling?'#3e4f4e':'#7d9295');
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,512,256);

  for(let d=0;d<2;d++){
    const dx=10+d*248;
    ctx.fillStyle=isRecycling?'#4e6260':'#8da2a4';
    ctx.fillRect(dx,10,236,236);
    ctx.strokeStyle='#1d2c30';
    ctx.lineWidth=3;
    ctx.strokeRect(dx,10,236,236);
    ctx.strokeStyle='rgba(235,248,250,0.28)';
    ctx.lineWidth=1.5;
    ctx.strokeRect(dx+3,13,230,230);

    for(let ly=136;ly<226;ly+=9){
      ctx.fillStyle='#18262a';
      ctx.fillRect(dx+22,ly,192,4);
      ctx.fillStyle='rgba(230,245,246,0.28)';
      ctx.fillRect(dx+22,ly+4,192,1.5);
    }

    ctx.fillStyle='#132226';
    ctx.fillRect(dx+22,24,132,44);
    ctx.strokeStyle=isRecycling?'#58e89e':'#5ce1e6';
    ctx.lineWidth=1.5;
    ctx.strokeRect(dx+22,24,132,44);
    ctx.fillStyle='#d9f4f2';
    ctx.font='700 12px "Outfit", sans-serif';
    ctx.textAlign='left';
    ctx.fillText(
      isRecycling?(d===0?'CONVALT CRUSH-X9':'EDDY / XRF DRIVE'):(d===0?'CONVALT HJT-800':'VACUUM & RF DRIVE'),
      dx+30,41
    );
    ctx.fillStyle='#7ec4cf';
    ctx.font='500 10px sans-serif';
    ctx.fillText(d===0?'480V 3Φ · 60Hz · IP65':'LOCKOUT BEFORE SERVICE',dx+30,58);

    ctx.fillStyle='#f0c246';
    ctx.beginPath();
    ctx.moveTo(dx+195,24);ctx.lineTo(dx+216,62);ctx.lineTo(dx+174,62);ctx.closePath();
    ctx.fill();
    ctx.strokeStyle='#151d20';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#151d20';ctx.font='700 18px sans-serif';ctx.textAlign='center';
    ctx.fillText('⚡',dx+195,57);

    for(let g=0;g<3;g++){
      const gx=dx+46+g*48,gy=98;
      ctx.fillStyle='#101c20';
      ctx.beginPath();ctx.arc(gx,gy,16,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#c5d6d8';ctx.lineWidth=2.5;ctx.stroke();
      ctx.fillStyle='#e8f4f6';
      ctx.beginPath();ctx.arc(gx,gy,12,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#d94b38';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(gx,gy);
      const ang=-0.8+g*0.65+d*0.4;
      ctx.lineTo(gx+Math.cos(ang)*10,gy+Math.sin(ang)*10);
      ctx.stroke();
    }
  }

  const tex=new THREE.CanvasTexture(cvs);
  tex.colorSpace=THREE.SRGBColorSpace;
  textures.push(tex);
  return tex;
}

function createElMonitorTexture(textures, isRecycling=false) {
  const cvs=document.createElement('canvas');
  cvs.width=512; cvs.height=256;
  const ctx=cvs.getContext('2d');
  if(!ctx)return null;

  ctx.fillStyle='#061015';
  ctx.fillRect(0,0,512,256);
  ctx.fillStyle='#0e2730';
  ctx.fillRect(0,0,512,34);
  ctx.fillStyle=isRecycling?'#58e89e':'#5ce1e6';
  ctx.font='700 15px "Outfit", sans-serif';
  ctx.textAlign='left';
  ctx.fillText(
    isRecycling?'HYPERSPECTRAL XRF / NIR MATERIAL ASSAY · LINE A+B':'AOI / ELECTROLUMINESCENCE (EL) METROLOGY · CLASS AAA',
    14,22
  );
  ctx.fillStyle='#4be39a';
  ctx.font='700 14px sans-serif';
  ctx.textAlign='right';
  ctx.fillText(
    isRecycling?'RECOVERY 98.7% · 4.2 T/HR':'PASS · EFF 25.64% · Pmax 712.4W',
    498,22
  );

  ctx.fillStyle='#0a1820';
  ctx.fillRect(12,44,284,198);
  ctx.strokeStyle='#285866';
  ctx.lineWidth=1.5;
  ctx.strokeRect(12,44,284,198);

  if(isRecycling){
    const fractions=[
      ['SOLAR GLASS CULLET','99.4%',0.92,'#5ce1e6'],
      ['ALUMINUM 6063 FRAME','99.6%',0.88,'#d8e6ea'],
      ['COPPER RIBBON / BUS','99.2%',0.84,'#e09862'],
      ['SILICON WAFER GRADE','99.1%',0.79,'#6d92c4'],
      ['SILVER METALLIZATION','98.4%',0.74,'#f5c26b']
    ];
    fractions.forEach(([name,pct,ratio,col],idx)=>{
      const y=56+idx*36;
      ctx.fillStyle='#9ec6ce';
      ctx.font='600 11px sans-serif';
      ctx.textAlign='left';
      ctx.fillText(name,22,y+11);
      ctx.fillStyle='#122832';
      ctx.fillRect(148,y,102,15);
      ctx.fillStyle=col;
      ctx.fillRect(148,y,102*ratio,15);
      ctx.font='700 11px sans-serif';
      ctx.textAlign='right';
      ctx.fillText(pct,288,y+12);
    });
  } else {
    const cols=10,rows=6;
    const cw=268/cols,ch=182/rows;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const x=20+c*cw,y=52+r*ch;
      const bright=155+((r*7+c*13)%45);
      ctx.fillStyle=`rgb(${Math.floor(bright*0.45)},${Math.floor(bright*0.88)},${bright})`;
      ctx.fillRect(x+1.5,y+1.5,cw-3,ch-3);
      ctx.strokeStyle='rgba(10,24,32,0.65)';
      ctx.lineWidth=1;
      ctx.strokeRect(x+1.5,y+1.5,cw-3,ch-3);
    }
    ctx.strokeStyle='#4be39a';
    ctx.lineWidth=1.5;
    ctx.strokeRect(20+3*cw,52+2*ch,cw,ch);
  }

  ctx.fillStyle='#0a1820';
  ctx.fillRect(308,44,192,126);
  ctx.strokeStyle='#285866';
  ctx.strokeRect(308,44,192,126);
  ctx.strokeStyle='#5ce1e6';
  ctx.lineWidth=2.2;
  ctx.beginPath();
  ctx.moveTo(320,70);
  ctx.lineTo(445,72);
  ctx.quadraticCurveTo(476,74,484,156);
  ctx.stroke();

  ctx.strokeStyle='#f5c26b';
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(320,156);
  ctx.quadraticCurveTo(440,62,462,68);
  ctx.lineTo(484,156);
  ctx.stroke();

  ctx.fillStyle='#0d2028';
  ctx.fillRect(308,178,192,64);
  ctx.strokeStyle='#244b57';
  ctx.strokeRect(308,178,192,64);
  ctx.fillStyle='#9ec6ce';
  ctx.font='600 12px sans-serif';
  ctx.textAlign='left';
  if(isRecycling){
    ctx.fillText('TROMMEL: 18.4 RPM · OK',318,198);
    ctx.fillText('BAGHOUSE ΔP: 1.12 kPa',318,218);
    ctx.fillStyle='#58e89e';
    ctx.fillText('ZERO LANDFILL LOOP ACTIVE',318,235);
  } else {
    ctx.fillText('Voc: 53.8 V   Isc: 15.68 A',318,198);
    ctx.fillText('FF:  84.4 %   u-Crack: 0',318,218);
    ctx.fillStyle='#58e89e';
    ctx.fillText('BIN GRADE: A+ PRIME',318,235);
  }

  const tex=new THREE.CanvasTexture(cvs);
  tex.colorSpace=THREE.SRGBColorSpace;
  textures.push(tex);
  return tex;
}

function createHqVideoWallTexture(textures) {
  const cvs=document.createElement('canvas');
  cvs.width=1024; cvs.height=384;
  const ctx=cvs.getContext('2d');
  if(!ctx)return null;

  ctx.fillStyle='#051116';
  ctx.fillRect(0,0,1024,384);
  const hdr=ctx.createLinearGradient(0,0,1024,0);
  hdr.addColorStop(0,'#0d2a33');hdr.addColorStop(0.5,'#143d48');hdr.addColorStop(1,'#0d2a33');
  ctx.fillStyle=hdr;ctx.fillRect(0,0,1024,52);
  ctx.strokeStyle='#4be39a';ctx.lineWidth=3;ctx.strokeRect(3,3,1018,378);

  ctx.fillStyle='#5ce1e6';ctx.font='700 22px "Outfit", sans-serif';ctx.textAlign='left';
  ctx.fillText('CONVALT ENERGY · INTEGRATED CAMPUS MICROGRID & OPERATIONS COMMAND',24,33);
  ctx.fillStyle='#7bf1a8';ctx.font='700 18px sans-serif';ctx.textAlign='right';
  ctx.fillText('GRID SYNC: 60.00 Hz · 138 kV INTERCONNECT ONLINE',1000,33);

  const cards=[
    ['HJT MANUFACTURING','3.6 GW / YR','99.4% YIELD · 12 CELLS ONLINE','#5ce1e6'],
    ['SOLAR + WIND FIELD','184.6 MW','PV 146.2 MW · WIND 38.4 MW','#4be39a'],
    ['AI COMPUTE HALLS 1–3','118.4 MW','60 RACKS · PUE 1.06 · LIQUID CDU','#f5c26b'],
    ['CIRCULAR RECYCLING','1.0 GW / YR','98.7% MINERAL PURITY · ZERO WASTE','#7bf1a8']
  ];
  cards.forEach(([title,val,sub,col],idx)=>{
    const x=18+idx*248,y=68;
    ctx.fillStyle='#0b1f27';ctx.fillRect(x,y,236,118);
    ctx.strokeStyle='#244f5c';ctx.lineWidth=2;ctx.strokeRect(x,y,236,118);
    ctx.fillStyle='#8eb8c2';ctx.font='600 13px sans-serif';ctx.textAlign='left';
    ctx.fillText(title,x+14,y+26);
    ctx.fillStyle=col;ctx.font='700 30px sans-serif';
    ctx.fillText(val,x+14,y+68);
    ctx.fillStyle='#b8dce4';ctx.font='500 11px sans-serif';
    ctx.fillText(sub,x+14,y+100);
  });

  // Lower campus power-flow waveform & synchroscope telemetry
  ctx.fillStyle='#091920';ctx.fillRect(18,202,640,164);
  ctx.strokeStyle='#244f5c';ctx.strokeRect(18,202,640,164);
  for(let gx=48;gx<640;gx+=40){
    ctx.strokeStyle='rgba(92,225,230,0.12)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(gx,208);ctx.lineTo(gx,360);ctx.stroke();
  }
  ctx.strokeStyle='#4be39a';ctx.lineWidth=3;
  ctx.beginPath();
  for(let i=0;i<=80;i++){
    const px=28+(i/80)*618;
    const py=268+Math.sin(i*0.22)*32+Math.cos(i*0.55)*12;
    if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  }
  ctx.stroke();
  ctx.strokeStyle='#5ce1e6';ctx.lineWidth=2.5;
  ctx.beginPath();
  for(let i=0;i<=80;i++){
    const px=28+(i/80)*618;
    const py=308+Math.cos(i*0.18)*24+Math.sin(i*0.45)*10;
    if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  }
  ctx.stroke();

  // Right synchroscope dial
  ctx.fillStyle='#091920';ctx.fillRect(674,202,332,164);
  ctx.strokeStyle='#244f5c';ctx.strokeRect(674,202,332,164);
  ctx.strokeStyle='#5ce1e6';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(756,284,56,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#4be39a';ctx.beginPath();ctx.arc(756,284,8,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#4be39a';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(756,284);ctx.lineTo(756,234);ctx.stroke();
  ctx.fillStyle='#d8f6ff';ctx.font='700 15px sans-serif';ctx.textAlign='left';
  ctx.fillText('BESS SOC: 96.4%',834,248);
  ctx.fillText('NET EXPORT: +66.2 MW',834,278);
  ctx.fillText('CARBON OFFSET: 100%',834,308);
  ctx.fillStyle='#4be39a';
  ctx.fillText('ISLAND MODE CAPABLE',834,338);

  const tex=new THREE.CanvasTexture(cvs);
  tex.colorSpace=THREE.SRGBColorSpace;
  textures.push(tex);
  return tex;
}

function createHmiTexture(textures, variant=0, stationIndex=1) {
  const cvs=document.createElement('canvas');
  cvs.width=512; cvs.height=352;
  const ctx=cvs.getContext('2d');
  if(!ctx)return null;

  ctx.fillStyle='#08151a';
  ctx.fillRect(0,0,512,352);

  const hdr=ctx.createLinearGradient(0,0,512,0);
  hdr.addColorStop(0,'#0f2c36');
  hdr.addColorStop(1,'#163d47');
  ctx.fillStyle=hdr;
  ctx.fillRect(0,0,512,46);

  const accent=variant===0?'#5ce1e6':variant===1?'#58e89e':'#f5c26b';
  ctx.fillStyle=accent;
  ctx.beginPath(); ctx.arc(24,23,7,0,Math.PI*2); ctx.fill();

  ctx.fillStyle='#e6f7f5';
  ctx.font='600 18px "Outfit", sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='middle';
  const headerTitle=variant===0?`HJT PECVD CELL · STA 0${stationIndex}`:
                    variant===1?`THERMAL CDU LOOP · Z0${stationIndex}`:
                    `OPTICAL / SCADA NODE · 0${stationIndex}`;
  ctx.fillText(headerTitle,42,24);

  ctx.fillStyle='#1f4e58';
  ctx.fillRect(392,10,106,26);
  ctx.fillStyle='#7bf1a8';
  ctx.font='600 13px sans-serif';
  ctx.textAlign='center';
  ctx.fillText('AUTO · ONLINE',445,23);

  const metrics=variant===0?[
    ['WAFER YIELD','99.42 %',accent],
    ['CHAMBER VAC','1.4e-3 mbar','#8de8f2'],
    ['SUBSTRATE T','208.4 °C','#f3cd78'],
    ['THROUGHPUT','7,240 WPH','#7bf1a8']
  ]:variant===1?[
    ['SUPPLY TEMP','21.4 °C','#7bf1a8'],
    ['RETURN TEMP','29.8 °C','#f3cd78'],
    ['FLOW RATE','1,420 L/m',accent],
    ['LOOP PUE','1.06','#8de8f2']
  ]:[
    ['BUSWAY LOAD','41.8 kVA',accent],
    ['OPTICAL BER','1.0e-15','#8de8f2'],
    ['RECOVERY','98.7 %','#7bf1a8'],
    ['AIRFLOW','14,800 CFM','#f3cd78']
  ];

  metrics.forEach(([k,v,col],idx)=>{
    const y=58+idx*68;
    ctx.fillStyle='#0d2229';
    ctx.fillRect(14,y,176,58);
    ctx.strokeStyle='#1f444f';
    ctx.lineWidth=1.5;
    ctx.strokeRect(14,y,176,58);
    ctx.fillStyle='#7fa6ad';
    ctx.font='500 12px sans-serif';
    ctx.textAlign='left';
    ctx.fillText(k,24,y+18);
    ctx.fillStyle=col;
    ctx.font='600 21px sans-serif';
    ctx.fillText(v,24,y+43);
  });

  ctx.fillStyle='#0b1d24';
  ctx.fillRect(204,58,294,188);
  ctx.strokeStyle='#234c57';
  ctx.strokeRect(204,58,294,188);

  ctx.strokeStyle='rgba(110,165,175,0.16)';
  ctx.lineWidth=1;
  for(let gx=224;gx<490;gx+=28){ctx.beginPath();ctx.moveTo(gx,64);ctx.lineTo(gx,240);ctx.stroke();}
  for(let gy=78;gy<240;gy+=28){ctx.beginPath();ctx.moveTo(210,gy);ctx.lineTo(492,gy);ctx.stroke();}

  ctx.strokeStyle=accent;
  ctx.lineWidth=2.5;
  ctx.beginPath();
  for(let i=0;i<=48;i++){
    const px=212+(i/48)*278;
    const py=132+Math.sin(i*0.35+stationIndex)*26+Math.cos(i*0.8)*8;
    if(i===0)ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.stroke();

  ctx.strokeStyle='#58e89e';
  ctx.lineWidth=2;
  ctx.beginPath();
  for(let i=0;i<=48;i++){
    const px=212+(i/48)*278;
    const py=192+Math.cos(i*0.28+stationIndex*0.7)*18+Math.sin(i*0.6)*6;
    if(i===0)ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.stroke();

  ctx.fillStyle='#0d2229';
  ctx.fillRect(204,258,294,72);
  ctx.strokeStyle='#1f444f';
  ctx.strokeRect(204,258,294,72);
  const softkeys=['CHAMBER','OPTICS','VACUUM','DIAG'];
  softkeys.forEach((lbl,idx)=>{
    const sx=214+idx*70;
    ctx.fillStyle=idx===0?'#1b4d59':'#122e36';
    ctx.fillRect(sx,270,62,48);
    ctx.strokeStyle=idx===0?accent:'#2b5864';
    ctx.strokeRect(sx,270,62,48);
    ctx.fillStyle='#d8f3f0';
    ctx.font='600 11px sans-serif';
    ctx.textAlign='center';
    ctx.fillText(lbl,sx+31,295);
  });

  const tex=new THREE.CanvasTexture(cvs);
  tex.colorSpace=THREE.SRGBColorSpace;
  textures.push(tex);
  return tex;
}

function createRackFaceTexture(textures, variant=0) {
  const cvs=document.createElement('canvas');
  cvs.width=512; cvs.height=1024;
  const ctx=cvs.getContext('2d');
  if(!ctx)return null;

  if(variant===0){
    // =========================================================================
    // COMPUTE HALL 01: AI GPU Tensor Supercluster (Anodized White/Silver + Ice Cyan)
    // =========================================================================
    ctx.fillStyle='#071422';
    ctx.fillRect(0,0,512,1024);
    // Anodized silver-white side rails
    ctx.fillStyle='#c8dbe4';
    ctx.fillRect(0,0,36,1024);
    ctx.fillRect(476,0,36,1024);
    ctx.fillStyle='#2a4858';
    for(let y=14;y<1012;y+=16){
      ctx.fillRect(14,y,8,6);
      ctx.fillRect(490,y,8,6);
    }
    // Top 2x 800G InfiniBand Optical Spine Switches
    for(let sw=0;sw<2;sw++){
      const y=18+sw*64;
      ctx.fillStyle='#102a3a';
      ctx.fillRect(40,y,432,54);
      ctx.strokeStyle='#5ce1e6';ctx.lineWidth=2;
      ctx.strokeRect(40,y,432,54);
      for(let p=0;p<16;p++){
        const px=52+p*20;
        ctx.fillStyle='#06121a';
        ctx.fillRect(px,y+10,14,15);
        ctx.fillRect(px,y+29,14,15);
        ctx.fillStyle=p%2===0?'#5ce1e6':'#38ef9b';
        ctx.fillRect(px+2,y+7,10,2);
        ctx.fillRect(px+2,y+45,10,2);
      }
      ctx.fillStyle='#5ce1e6';
      ctx.fillRect(382,y+12,80,30);
      ctx.fillStyle='#05131c';ctx.font='700 12px sans-serif';ctx.textAlign='center';
      ctx.fillText('800G NDR',422,y+31);
    }
    // 4 Massive 4U AI Tensor GPU Super-Pods (H100 / B200 SXM5 Blades)
    for(let pod=0;pod<4;pod++){
      const y=154+pod*212,h=196;
      const g=ctx.createLinearGradient(40,y,472,y+h);
      g.addColorStop(0,'#122c3d');g.addColorStop(0.5,'#0b1e2b');g.addColorStop(1,'#16364a');
      ctx.fillStyle=g;
      ctx.fillRect(40,y,432,h);
      ctx.strokeStyle='#6fd5e6';ctx.lineWidth=2.5;
      ctx.strokeRect(40,y,432,h);
      // Pod header bar
      ctx.fillStyle='#d8ecf4';
      ctx.fillRect(46,y+6,420,28);
      ctx.fillStyle='#081c28';ctx.font='700 14px "Outfit", sans-serif';ctx.textAlign='left';
      ctx.fillText(`CONVALT TENSOR-X8 · SXM5 GPU POD 0${pod+1}`,56,y+25);
      ctx.fillStyle='#007799';ctx.textAlign='right';
      ctx.fillText('8x 700W · NVLINK 4.0',456,y+25);
      // 8 Vertical GPU Heatsink Modules with glowing cyan/blue vapor chambers
      for(let gpu=0;gpu<8;gpu++){
        const gx=50+gpu*51,gy=y+42,gw=45,gh=114;
        ctx.fillStyle='#061118';
        ctx.fillRect(gx,gy,gw,gh);
        ctx.strokeStyle='#3898b8';ctx.lineWidth=1.5;
        ctx.strokeRect(gx,gy,gw,gh);
        // Copper/gold NVLink fin stack + cyan telemetry bar
        for(let fy=gy+8;fy<gy+gh-16;fy+=7){
          ctx.fillStyle=fy%14===0?'#5ce1e6':'#2c6882';
          ctx.fillRect(gx+5,fy,gw-10,3.5);
        }
        ctx.fillStyle='#f5c26b';
        ctx.fillRect(gx+6,gy+gh-12,gw-12,6);
      }
      // Bottom optical NVLink interconnect bus bar
      ctx.fillStyle='#081822';
      ctx.fillRect(48,y+162,416,26);
      ctx.fillStyle='#5ce1e6';
      for(let b=0;b<12;b++)ctx.fillRect(56+b*34,y+169,22,12);
    }
  } else if(variant===1){
    // =========================================================================
    // COMPUTE HALL 02: Direct-to-Chip Liquid Cooling & CDU Manifold Rack (Emerald & Copper)
    // =========================================================================
    ctx.fillStyle='#061814';
    ctx.fillRect(0,0,512,1024);
    // Deep hydro-emerald rails + dual internal vertical copper & emerald coolant headers
    ctx.fillStyle='#143830';
    ctx.fillRect(0,0,32,1024);
    ctx.fillRect(480,0,32,1024);
    // Left Cold Supply Header (Emerald/Cyan) & Right Hot Return Header (Polished Copper)
    ctx.fillStyle='#2ad88a';
    ctx.fillRect(36,12,18,1000);
    ctx.fillStyle='#c88850';
    ctx.fillRect(458,12,18,1000);

    // 10 Liquid-Cooled Cold-Plate Blade Drawers + 2 In-Rack CDU Manifolds
    for(let slot=0;slot<12;slot++){
      const y=16+slot*83,h=74;
      const isCdu=(slot===0||slot===6);
      ctx.fillStyle=isCdu?'#0f352b':'#0b241e';
      ctx.fillRect(60,y,392,h);
      ctx.strokeStyle=isCdu?'#4be39a':'#286858';ctx.lineWidth=2;
      ctx.strokeRect(60,y,392,h);

      if(isCdu){
        ctx.fillStyle='#061612';
        ctx.fillRect(68,y+8,376,h-16);
        ctx.fillStyle='#4be39a';ctx.font='700 14px "Outfit", sans-serif';ctx.textAlign='left';
        ctx.fillText('IN-RACK LIQUID CDU MANIFOLD · ΔT 8.4°C · 142 L/MIN',78,y+30);
        for(let g=0;g<6;g++){
          const cx=92+g*58,cy=y+50;
          ctx.fillStyle=g%2===0?'#38ef9b':'#e08850';
          ctx.beginPath();ctx.arc(cx,cy,10,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle='#d8f4ea';ctx.lineWidth=2;ctx.stroke();
        }
      } else {
        // Horizontal copper cold-plate supply/return rails across server drawer
        ctx.fillStyle='#2ad88a';
        ctx.fillRect(64,y+18,384,6);
        ctx.fillStyle='#c88850';
        ctx.fillRect(64,y+48,384,6);
        // 4 Copper Cold-Plate Waterblocks + Red/Blue QDC Quick-Disconnect Couplings
        for(let c=0;c<4;c++){
          const bx=78+c*92;
          ctx.fillStyle='#12342c';
          ctx.fillRect(bx,y+10,76,h-20);
          ctx.strokeStyle='#c88850';ctx.lineWidth=1.5;
          ctx.strokeRect(bx,y+10,76,h-20);
          // Copper cold plate
          ctx.fillStyle='#b87844';
          ctx.fillRect(bx+18,y+16,40,42);
          // Blue (Cold QDC) & Red (Hot QDC) dripless fittings
          ctx.fillStyle='#38d8ff';
          ctx.beginPath();ctx.arc(bx+10,y+21,5,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#ff5238';
          ctx.beginPath();ctx.arc(bx+66,y+51,5,0,Math.PI*2);ctx.fill();
        }
      }
    }
  } else {
    // =========================================================================
    // COMPUTE HALL 03: High-Voltage 480V Power Grid, LFP BESS & Core Fiber Hall (Graphite & Gold)
    // =========================================================================
    ctx.fillStyle='#14110c';
    ctx.fillRect(0,0,512,1024);
    // Heavy graphite-bronze rails with diagonal yellow/black hazard striping
    ctx.fillStyle='#2b2419';
    ctx.fillRect(0,0,36,1024);
    ctx.fillRect(476,0,36,1024);
    for(let y=0;y<1024;y+=32){
      ctx.fillStyle='#e8bd52';
      ctx.fillRect(6,y,24,14);
      ctx.fillRect(482,y,24,14);
    }

    // Top Section (y=18..210): 480V 3-Phase Molded-Case Breaker & Synchroscope Switchgear
    ctx.fillStyle='#241e14';
    ctx.fillRect(42,18,428,188);
    ctx.strokeStyle='#f3cb78';ctx.lineWidth=2.5;
    ctx.strokeRect(42,18,428,188);
    ctx.fillStyle='#f3cb78';ctx.font='700 15px "Outfit", sans-serif';ctx.textAlign='left';
    ctx.fillText('480V 3Φ BUSWAY SWITCHGEAR · L1 / L2 / L3 ACTIVE',56,44);
    const phases=[['L1 PHASE','482.1 V','418 A','#ff6242'],['L2 PHASE','481.8 V','415 A','#f3cb78'],['L3 PHASE','482.4 V','421 A','#5ce1e6']];
    phases.forEach(([lbl,v,a,col],idx)=>{
      const px=56+idx*136,py=60;
      ctx.fillStyle='#0e0c08';ctx.fillRect(px,py,124,78);
      ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.strokeRect(px,py,124,78);
      ctx.fillStyle='#a89878';ctx.font='600 11px sans-serif';ctx.fillText(lbl,px+10,py+18);
      ctx.fillStyle=col;ctx.font='700 19px monospace';ctx.fillText(v,px+10,py+44);
      ctx.fillStyle='#7bf1a8';ctx.font='600 14px monospace';ctx.fillText(a,px+10,py+66);
    });
    // Rotary disconnect handle & breaker toggles
    ctx.fillStyle='#d94832';ctx.fillRect(56,150,90,42);
    ctx.fillStyle='#ffffff';ctx.font='700 12px sans-serif';ctx.fillText('MAIN ON · I',66,176);
    for(let b=0;b<8;b++){
      ctx.fillStyle=b<7?'#4be39a':'#f3cb78';
      ctx.fillRect(168+b*36,154,24,34);
    }

    // Middle Section (y=222..386): Dense Yellow Single-Mode Optical Core Patch Sanctuary
    ctx.fillStyle='#191610';
    ctx.fillRect(42,222,428,162);
    ctx.strokeStyle='#e8bd52';ctx.lineWidth=2;
    ctx.strokeRect(42,222,428,162);
    ctx.fillStyle='#ffe082';ctx.font='700 13px sans-serif';ctx.textAlign='left';
    ctx.fillText('SINGLE-MODE DWDM OPTICAL MATRIX · 96x 400G ZR+ TRUNKS',54,245);
    for(let r=0;r<3;r++)for(let c=0;c<16;c++){
      const fx=54+c*25,fy=258+r*36;
      ctx.fillStyle='#f5c842';
      ctx.fillRect(fx,fy,18,24);
      ctx.fillStyle='#5ce1e6';
      ctx.fillRect(fx+4,fy+4,10,6);
    }

    // Bottom Section (y=400..1006): 6 Grid-Scale LFP Rack Battery Modules (Safety Gold & Orange)
    for(let bat=0;bat<6;bat++){
      const y=400+bat*100,h=88;
      ctx.fillStyle='#211b12';
      ctx.fillRect(42,y,428,h);
      ctx.strokeStyle='#e08a38';ctx.lineWidth=2;
      ctx.strokeRect(42,y,428,h);
      // Orange HV battery fascia + copper bus terminals
      ctx.fillStyle='#d97228';
      ctx.fillRect(50,y+10,96,h-20);
      ctx.fillStyle='#120e08';ctx.font='700 13px sans-serif';ctx.textAlign='center';
      ctx.fillText(`LFP-100kWh`,98,y+38);
      ctx.fillText(`MOD 0${bat+1}`,98,y+58);
      // 10 Green State-of-Charge (SOC) LED segments per battery module
      for(let s=0;s<10;s++){
        ctx.fillStyle=s<9?'#4be39a':'#5ce1e6';
        ctx.fillRect(162+s*22,y+24,16,40);
      }
      // Positive (Red) & Negative (Black/Blue) HV DC Bus Terminals
      ctx.fillStyle='#ff4d38';ctx.fillRect(398,y+18,22,22);
      ctx.fillStyle='#5ce1e6';ctx.fillRect(432,y+18,22,22);
      ctx.fillStyle='#f3cb78';ctx.font='700 11px monospace';ctx.textAlign='right';
      ctx.fillText('800V DC · 99% SOC',456,y+68);
    }
  }

  const tex=new THREE.CanvasTexture(cvs);
  tex.colorSpace=THREE.SRGBColorSpace;
  textures.push(tex);
  return tex;
}

export function enhanceInterior(zone,def,{high=true}={}){
 const g=zone.group,geos=new Map(),mats=[],motion=[],lights=[],textures=[];
 const metalNormal=createProceduralGrain(textures,256,256,'normal');
 const metalRough=createProceduralGrain(textures,256,256,'rough');
 const hazardTex=createProceduralGrain(textures,256,256,'hazard');
 const waferTex=createProceduralGrain(textures,256,256,'wafer');
 const moduleTex=createProceduralGrain(textures,512,256,'module');

 const material=(color,metalness=0,roughness=.6,emissive=0,emissiveIntensity=0,extra={})=>{
  const m=new THREE.MeshStandardMaterial({
   color,metalness,roughness,emissive,emissiveIntensity,
   envMapIntensity:metalness>0.4?1.48:1.08,
   ...extra
  });
  mats.push(m);return m;
 };

 const brushedExtra=metalNormal?{normalMap:metalNormal,roughnessMap:metalRough,normalScale:new THREE.Vector2(.15,.15)}:{};
 const paint=material(0xb9c9c8,.22,.40,0,0,brushedExtra),
  cleanWhite=material(0xe8f0ee,.18,.32,0,0,brushedExtra),
  titanium=material(0x88a2a8,.84,.22,0,0,brushedExtra),
  chrome=material(0xd8e6ea,.94,.12,0,0),
  carbon=material(0x182930,.42,.36,0,0,brushedExtra),
  darkAnodized=material(0x0f1b20,.56,.30,0,0),
  soft=material(0x3a5358,.48,.36,0,0,brushedExtra),
  glass=material(0x1c3b4b,.16,.09,0x0b2636,.24,{transparent:true,opacity:.62}),
  polyGuard=material(0x88b8c6,.12,.10,0x102c36,.14,{transparent:true,opacity:.36}),
  plasmaGlow=material(0x74e8ff,.10,.15,0x2bc4ff,1.15),
  curingGlow=material(0xffc978,.08,.18,0xff8c1a,1.05),
  copper=material(0xc88d58,.86,.22,0,0,brushedExtra),
  brass=material(0xd8b464,.84,.24,0,0),
  timberWarm=material(0x8c623e,.08,.64,0,0),
  robotOrange=material(0xe07a38,.48,.28,0x3a1504,.10,brushedExtra),
  safety=material(0xe8c458,.14,.42,0x2a1f04,.08),
  hazardMat=material(0xffffff,.10,.48,0,0,hazardTex?{map:hazardTex}:{}),
  waferMat=material(0xffffff,.42,.16,0x0b2848,.26,waferTex?{map:waferTex}:{}),
  solarModMat=material(0xffffff,.36,.18,0x091e36,.20,moduleTex?{map:moduleTex}:{}),
  red=material(0xd95843,.16,.34,0x8f1d0b,.58),
  redPipe=material(0xc93828,.48,.32,0x4a0b04,.22),
  amber=material(0xf0b24a,.12,.30,0xc47d12,.72),
  ice=material(0xbde6e8,.10,.20,0x6fd5e6,.90),
  green=material(0x8ee4b4,.10,.24,0x32a875,.82),
  warm=material(0xf5e2be,.06,.24,0xd6bd8c,.76),
  bluePipe=material(0x2c7da0,.62,.28,0x093042,.16),
  gasPipe=material(0x2f8f68,.58,.30,0x0a3322,.16),
  culletGlass=material(0x63c5da,.24,.14,0x1b6d82,.38),
  siliconMat=material(0x3a4d63,.80,.20,0x0d1826,.22),
  matte=material(0x667a77,.06,.78);

 const shape=(w,h,d)=>{const key=[w,h,d].join(':');if(!geos.has(key))geos.set(key,new THREE.BoxGeometry(w,h,d));return geos.get(key);};
 const box=(x,y,z,w,h,d,m=paint)=>{
  const o=new THREE.Mesh(shape(w,h,d),m);o.position.set(x,y,z);o.castShadow=false;o.receiveShadow=true;g.add(o);return o;
 };
 const cyl=(x,y,z,r,h,m=titanium,rx=0,ry=0,rz=0)=>{
  const key=`cyl:${r}:${h}`;let geo=geos.get(key);
  if(!geo){geo=new THREE.CylinderGeometry(r,r,h,high?16:10);geos.set(key,geo);}
  const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.castShadow=false;o.receiveShadow=true;g.add(o);return o;
 };
 const cone=(x,y,z,rt,rb,h,seg=16,m=titanium,rx=0,ry=0,rz=0)=>{
  const key=`cone:${rt}:${rb}:${h}:${seg}`;let geo=geos.get(key);
  if(!geo){geo=new THREE.CylinderGeometry(rt,rb,h,seg);geos.set(key,geo);}
  const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.castShadow=false;o.receiveShadow=true;g.add(o);return o;
 };
 const torus=(x,y,z,R,r,m=titanium,rx=0,ry=0,rz=0)=>{
  const key=`tor:${R}:${r}`;let geo=geos.get(key);
  if(!geo){geo=new THREE.TorusGeometry(R,r,8,high?24:14);geos.set(key,geo);}
  const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);g.add(o);return o;
 };
 const pipe=(a,b,r=.06,m=titanium)=>{
  const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),delta=q.clone().sub(p);
  const key='pipe:'+r;let geo=geos.get(key);
  if(!geo){geo=new THREE.CylinderGeometry(r,r,1,high?14:8);geos.set(key,geo);}
  const o=new THREE.Mesh(geo,m);
  o.position.copy(p).add(q).multiplyScalar(.5);o.scale.y=delta.length();
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  g.add(o);return o;
 };
 const label=(word,x,y,z,w=1.9,color='#d4e9e4',subtitle='',ry=0)=>{
  const cvs=document.createElement('canvas');cvs.width=1024;cvs.height=224;
  const ctx=cvs.getContext('2d');
  const grad=ctx.createLinearGradient(0,0,1024,224);
  grad.addColorStop(0,'#0e2228');grad.addColorStop(1,'#18353c');
  ctx.fillStyle=grad;ctx.fillRect(0,0,1024,224);
  ctx.strokeStyle='#6c9e96';ctx.lineWidth=6;ctx.strokeRect(6,6,1012,212);
  ctx.fillStyle='#5ce1e6';ctx.fillRect(22,22,10,180);
  ctx.fillStyle=color;ctx.font='600 64px "Outfit", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(word,520,subtitle?92:114,920);
  if(subtitle){
   ctx.fillStyle='#8fc4bc';ctx.font='500 30px "Outfit", sans-serif';
   ctx.fillText(subtitle,520,164,920);
  }
  const tex=new THREE.CanvasTexture(cvs);tex.colorSpace=THREE.SRGBColorSpace;
  const lm=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,transparent:false});
  const h=w*224/1024;
  const back=box(x,y,z+(ry===0?-.018:0),w+.08,h+.06,.028,darkAnodized);
  back.rotation.y=ry;
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),lm);
  plane.position.set(x+(ry?Math.sin(ry)*.018:0),y,z+(ry?Math.cos(ry)*.018:.018));
  plane.rotation.y=ry;
  g.add(plane);return {plane,texture:tex,material:lm};
 };
 const assets=[];
 const addLabel=(...p)=>{assets.push(label(...p));};

 const addPointLight=(x,y,z,hex,intensity,distance)=>{
  const pt=new THREE.PointLight(hex,intensity,distance,1.8);
  pt.position.set(x,y,z);pt.castShadow=false;g.add(pt);lights.push(pt);
 };

 // Helper: Build an articulated 6-axis cylindrical industrial robotic arm
 const buildRoboticArm=(rx,ry,rz,baseYaw=0,isOrange=false,phase=0,heldMat=waferMat)=>{
  cyl(rx,ry+.24,rz,.21,.48,darkAnodized);
  torus(rx,ry+.48,rz,.22,.025,chrome,Math.PI/2,0,0);
  const turret=new THREE.Group();
  turret.position.set(rx,ry+.50,rz);
  turret.rotation.y=baseYaw;
  g.add(turret);

  const armMat=isOrange?robotOrange:cleanWhite;
  const shoulder=new THREE.Mesh(geos.get('cyl:.18:.32')||new THREE.CylinderGeometry(.18,.20,.32,14),armMat);
  shoulder.position.set(0,.16,0);
  turret.add(shoulder);

  const upperGroup=new THREE.Group();
  upperGroup.position.set(0,.28,0);
  turret.add(upperGroup);

  const lowerArm=new THREE.Mesh(geos.get('cyl:.075:.68')||new THREE.CylinderGeometry(.075,.09,.68,12),armMat);
  lowerArm.position.set(0,.30,.08);
  lowerArm.rotation.x=0.28;
  upperGroup.add(lowerArm);

  const elbow=new THREE.Mesh(geos.get('cyl:.11:.22')||new THREE.CylinderGeometry(.11,.11,.22,12),darkAnodized);
  elbow.position.set(0,.60,.18);
  elbow.rotation.z=Math.PI/2;
  upperGroup.add(elbow);

  const forearm=new THREE.Mesh(geos.get('cyl:.06:.62')||new THREE.CylinderGeometry(.055,.07,.62,12),titanium);
  forearm.position.set(0,.62,.44);
  forearm.rotation.x=Math.PI/2;
  upperGroup.add(forearm);

  const wrist=new THREE.Mesh(shape(.46,.04,.38),darkAnodized);
  wrist.position.set(0,.54,.72);
  upperGroup.add(wrist);

  const held=new THREE.Mesh(shape(isOrange?.56:.38,.020,isOrange?.38:.38),heldMat);
  held.position.set(0,.515,.72);
  upperGroup.add(held);

  motion.push({object:turret,type:'robotYaw',baseYaw,amp:0.48,speed:1.55,phase});
  motion.push({object:upperGroup,type:'robotPitch',basePitch:0.08,amp:0.18,speed:2.9,phase});
 };

 // Helper: Build a spinning spoked industrial flywheel / fan wheel
 const buildSpokedWheel=(wx,wy,wz,R=.28,mRim=safety,mHub=chrome,rx=0,ry=0,rz=0,speed=3.5,axis='spinZ')=>{
  const wg=new THREE.Group();
  wg.position.set(wx,wy,wz);
  wg.rotation.set(rx,ry,rz);
  g.add(wg);
  const rim=new THREE.Mesh(geos.get(`tor:${R}:.032`)||new THREE.TorusGeometry(R,.032,8,20),mRim);
  wg.add(rim);
  for(let s=0;s<6;s++){
   const a=s*Math.PI/3;
   const sp=new THREE.Mesh(shape(R*1.9,.028,.024),mHub);
   sp.rotation.z=a;
   wg.add(sp);
  }
  motion.push({object:wg,type:axis,speed,phase:wx+wz});
  return wg;
 };

 // Structural Steel Columns, Roof Trusses, Acoustic Baffles, Perimeter Safety Skirting
 const width=def.w/2-.75,depth=def.d/2-.70;
 for(const side of [-1,1]){
  const z=side*(depth-.22);
  pipe([-width,def.h-1.12,z],[width,def.h-1.12,z],.065,titanium);
  pipe([-width,def.h-1.32,z],[width,def.h-1.32,z],.042,copper);
  for(let x=-width+1.7;x<width;x+=2.6){
   box(x,def.h-.78,z,.045,.23,.60,carbon);
   if(high)box(x,def.h-1.06,z,.28,.048,.34,ice);
  }
  for(let x=-width+2;x<width;x+=3.3){
   const wz=side*(depth+.04);
   box(x,def.h/2,wz,.16,def.h-.85,.14,darkAnodized);
   box(x,def.h/2,wz-side*.065,.22,def.h-.85,.028,titanium);
   box(x,.54,wz-side*.04,.32,.12,.22,safety);
   pipe([x,def.h-1.55,wz-side*.08],[x,def.h-.55,wz-side*1.05],.038,titanium);
  }
  box(0,.59,side*(depth-.12),def.w-2,.055,.095,safety);
  box(0,.88,side*(depth-.12),def.w-2,.04,.06,titanium);
  if(def.kind!=='office')box(0,.495,side*(depth-.42),def.w-2.4,.012,.14,hazardMat);
 }

 for(let x=-width+2;x<width;x+=4.2){
  pipe([x,def.h-.52,-depth+.3],[x,def.h-.52,depth-.3],.058,darkAnodized);
  pipe([x,def.h-.85,-depth+.5],[x,def.h-.85,depth-.5],.048,soft);
  box(x,def.h-.95,0,2.1,.07,.46,darkAnodized);
  box(x,def.h-.992,0,1.92,.030,.36,warm);
 }

 // Front wall internal instructional signage.
 const title=def.kind==='factory'?'HJT PRODUCTION':
  def.kind==='recycling'?'MATERIAL RECOVERY':
  def.kind==='office'?'CONVALT ENERGY HQ':
  'COMPUTE HALL '+String((def.variant||0)+1).padStart(2,'0');
 const mainSub=def.kind==='factory'?'HETEROJUNCTION SOLAR CELL & MODULE LINE · ISO CLASS 7':
  def.kind==='recycling'?'CLOSED-LOOP PHOTOVOLTAIC SEPARATION & MINERAL RECOVERY':
  def.kind==='office'?'EXECUTIVE COMMAND · 3D DIGITAL TWIN · MICROGRID SCADA':
  def.variant===0?'HYPERSCALE AI CLUSTER · COLD AISLE CONTAINMENT':
  def.variant===1?'DIRECT-TO-CHIP LIQUID COOLING · CDU THERMAL LOOP':
  'REDUNDANT 480V BUSWAY A+B · OPTICAL SPINE FABRIC';
 addLabel(title,0,def.h-1.25,-depth-.035,def.kind==='office'?3.4:4.1,'#e6f7f4',mainSub);

 if(def.kind==='factory'){
  // ============================================================================
  // 1. MANUFACTURING PLANT — Sculpted, Dynamic & Realistic Semiconductor/PV Tools
  // ============================================================================
  const hmiTexA=createHmiTexture(textures,0,1);
  const hmiTexB=createHmiTexture(textures,0,2);
  const hmiMatA=new THREE.MeshBasicMaterial({map:hmiTexA});
  const hmiMatB=new THREE.MeshBasicMaterial({map:hmiTexB});
  const cabDoorTex=createMachineCabinetTexture(textures,false);
  const cabDoorMat=new THREE.MeshStandardMaterial({map:cabDoorTex,metalness:.36,roughness:.38});
  const hoodTexDark=createProcessHoodTexture(textures,false);
  const hoodMatDark=new THREE.MeshStandardMaterial({map:hoodTexDark,metalness:.42,roughness:.32});
  const hoodTexWhite=createProcessHoodTexture(textures,true);
  const hoodMatWhite=new THREE.MeshStandardMaterial({map:hoodTexWhite,metalness:.28,roughness:.34});
  const elScreenTex=createElMonitorTexture(textures,false);
  const elScreenMat=new THREE.MeshBasicMaterial({map:elScreenTex});
  mats.push(hmiMatA,hmiMatB,cabDoorMat,hoodMatDark,hoodMatWhite,elScreenMat);

  for(const side of [-1,1]){
   const wz=side*(depth+.01);
   for(let wx=-10.5;wx<=10.5;wx+=7.0){
    box(wx,2.35,wz,4.2,1.65,.05,darkAnodized);
    box(wx,2.35,wz-side*.022,3.96,1.42,.025,glass);
    box(wx,3.12,wz-side*.028,3.8,.04,.035,ice);
   }
   for(const gx of [-13.4,-6.8,0.2,7.2]){
    const gz=side*(depth-.26);
    box(gx,1.45,gz,.88,1.92,.36,cleanWhite);
    box(gx,1.58,gz-side*.192,.72,.68,.02,glass);
    for(const cx of [-.18,.18]){
     cyl(gx+cx,1.42,gz-side*.06,.09,.95,cx<0?bluePipe:gasPipe);
     cyl(gx+cx,1.94,gz-side*.06,.035,.12,brass);
    }
    box(gx,2.18,gz-side*.192,.56,.14,.025,side<0?ice:green);
    pipe([gx,2.41,gz],[gx,def.h-1.22,gz],.032,gasPipe);
   }
   const sx=12.6,sz=side*(depth-.28);
   pipe([sx,.48,sz],[sx,2.55,sz],.028,safety);
   pipe([sx,2.55,sz],[sx,2.55,sz-side*.35],.028,safety);
   cyl(sx,2.46,sz-side*.35,.14,.08,green);
   cyl(sx,1.12,sz-side*.18,.16,.10,chrome);
   box(sx,1.85,sz-side*.02,.28,.36,.025,green);
  }

  // Overhead 5-Ton Cleanroom Double-Girder Bridge Crane & Animated Hoist Trolley
  for(const side of [-1,1]){
   box(0,5.48,side*(depth-.38),def.w-2.2,.14,.16,safety);
  }
  const craneX=3.6;
  for(const dx of [-.42,.42]){
   box(craneX+dx,5.68,0,.22,.28,def.d-1.8,safety);
   box(craneX+dx,5.85,0,.26,.04,def.d-1.8,darkAnodized);
  }
  box(craneX,5.90,-1.4,1.15,.24,1.05,darkAnodized);
  cyl(craneX,5.90,-1.4,.18,.82,copper,0,0,Math.PI/2);
  pipe([craneX-.12,5.65,-1.4],[craneX-.12,3.85,-1.4],.014,chrome);
  pipe([craneX+.12,5.65,-1.4],[craneX+.12,3.85,-1.4],.014,chrome);
  box(craneX,3.76,-1.4,.36,.22,.18,safety);
  torus(craneX,3.58,-1.4,.085,.024,chrome,0,Math.PI/2,0);

  for(let fx=-11.5;fx<=11.5;fx+=4.6){
   for(const fz of [-5.1,5.1]){
    box(fx,def.h-.58,fz,1.35,.14,1.35,cleanWhite);
    box(fx,def.h-.44,fz,.62,.14,.62,titanium);
    box(fx+.48,def.h-.665,fz,.14,.025,.08,ice);
   }
  }
  addLabel('OEE 96.8% · 7,240 WPH',-5.4,4.55,0,3.1,'#7bf1a8','SHIFT TARGET: 3.6 GW/YR · BREAKAGE 0.03%');
  addLabel('ISO-7 CLEANROOM · 21.0°C',5.4,4.55,0,3.1,'#8de8f2','RH 42.5% · ΔP +18.5 Pa · CLASS AAA');

  // West End-Wall (x = -14.2): Automated Wafer Cassette Stocker & Vertical Retriever Elevator
  box(-14.15,2.35,0,.78,3.95,5.6,darkAnodized);
  for(let col=-2;col<=2;col++){
   const cz=col*1.05;
   box(-13.73,2.35,cz,.03,3.55,.88,glass);
   for(let slot=0;slot<7;slot++){
    const sy=.92+slot*.46;
    box(-14.08,sy,cz,.46,.04,.74,titanium);
    box(-14.04,sy+.12,cz,.36,.18,.58,(slot+col)%2===0?waferMat:ice);
   }
  }
  pipe([-13.55,.58,-.52],[-13.55,4.15,-.52],.038,chrome);
  const stockerFork=box(-13.51,2.15,-.52,.24,.18,.82,safety);
  motion.push({object:stockerFork,type:'sweepY',baseY:2.25,amp:1.15,speed:1.1,phase:0.4});
  box(-13.71,4.18,0,.06,.22,5.4,ice);

  // East End-Wall (x = +14.25): Metrology Control Room, Cleanroom Roll-Up Door & Solar Module A-Frames
  box(14.32,2.25,-1.0,.36,3.45,4.8,darkAnodized);
  box(14.11,2.28,-1.0,.03,2.25,4.35,glass);
  box(14.08,2.28,-1.0,0.02,1.35,2.6,elScreenMat);
  box(14.10,3.52,-1.0,.05,.14,4.4,ice);
  addLabel('METROLOGY & EL LAB',14.00,3.95,-1.0,2.6,'#d8f6ff','IV CURVE · QUANTUM EFFICIENCY',-Math.PI/2);

  box(14.35,2.15,4.3,.24,3.35,3.1,titanium);
  for(const dz of [2.75,5.85])box(14.21,2.15,dz,.14,3.35,.16,safety);
  box(14.20,3.88,4.3,.26,.32,3.3,darkAnodized);
  for(let slat=0;slat<6;slat++)box(14.20,.85+slat*.48,4.3,.03,.06,2.85,carbon);
  box(14.19,2.35,4.3,.03,.38,2.45,glass);
  cyl(14.14,4.12,4.3,.06,.14,amber,0,0,Math.PI/2);

  for(const side of [-1,1])for(const rx of [-13.2,12.8]){
   const rz=side*7.25;
   box(rx,.56,rz,1.72,.12,.92,darkAnodized);
   box(rx,.490,rz,1.92,.008,1.12,hazardMat);
   pipe([rx-.72,.62,rz-.38],[rx-.72,2.05,rz],.035,safety);
   pipe([rx-.72,.62,rz+.38],[rx-.72,2.05,rz],.035,safety);
   pipe([rx+.72,.62,rz-.38],[rx+.72,2.05,rz],.035,safety);
   pipe([rx+.72,.62,rz+.38],[rx+.72,2.05,rz],.035,safety);
   const modPanel=box(rx,1.38,rz-side*.22,1.52,1.28,.08,solarModMat);
   modPanel.rotation.x=side*0.18;
  }

  // Stepped Central Cleanroom Sub-Floor Process Utility & Wafer-Optics Trench (z = 0, Zero Z-Fighting!)
  box(-.85,.490,0,26.6,.012,1.24,darkAnodized);
  for(const side of [-1,1]){
   box(-.85,.508,side*.59,26.6,.024,.065,chrome);
  }
  for(let bx=-13.2;bx<=11.6;bx+=2.4){
   box(bx,.526,0,.06,.008,1.12,chrome);
  }
  for(const [pIdx,fz] of [-.36,-.12,.12,.36].entries()){
   box(-.85,.503,fz,26.2,.010,.038,pIdx===0?bluePipe:pIdx===1?gasPipe:pIdx===2?copper:plasmaGlow);
  }
  for(let p=0;p<14;p++){
   const px=-13.0+p*1.85;
   const lane=(p%4);
   const fz=-.36+lane*.24;
   const pulse=box(px,.514,fz,.44,.008,.042,lane%2===0?plasmaGlow:green);
   motion.push({object:pulse,type:'conveyorX',baseX:px,minX:-13.2,span:25.6,speed:lane%2===0?4.4:-4.4});
  }

  // Continuous Guarded Conveyors, Stepped AGV Inductive Guide Tracks & Moving Wafers / Modules
  for(const side of [-1,1]){
   const z=side*5.1;
   box(-.85,1.58,z,25.6,.06,.78,darkAnodized);
   for(const rz of [-.42,.42]){
    pipe([-13.6,1.66,z+rz],[12.0,1.66,z+rz],.038,titanium);
    pipe([-13.6,1.74,z+rz],[12.0,1.74,z+rz],.024,safety);
   }
   for(let lx=-13.8;lx<=12.4;lx+=2.22){
    for(const rz of [-.36,.36]){
     pipe([lx,.48,z+rz],[lx,1.58,z+rz],.032,darkAnodized);
     cyl(lx,.51,z+rz,.08,.04,safety);
    }
   }
   // Non-coplanar stepped hazard & telemetry curbs along machine row (y >= 0.496)
   box(-.85,.496,z-side*1.08,26.2,.016,.14,hazardMat);
   box(-.85,.500,z-side*1.28,25.8,.012,.055,side<0?ice:green);
   // Embedded Brushed-Chrome & Cyan/Emerald Mag-Lev AGV Floor Guide Track at z = ±3.35
   const trackZ=side*3.35;
   box(-.85,.492,trackZ,25.8,.010,.36,chrome);
   box(-.85,.501,trackZ,25.6,.008,.08,side<0?plasmaGlow:green);

   const count=side<0?20:14;
   for(let wIdx=0;wIdx<count;wIdx++){
    const wx=-12.8+wIdx*(25.2/count);
    const item=box(wx,1.655,z,side<0?.52:1.18,.024,side<0?.52:.66,side<0?waferMat:solarModMat);
    motion.push({object:item,type:'conveyorX',baseX:wx,span:25.2,minX:-13.2,speed:side<0?.68:-.54});
   }
  }

  // 4 Full-Length Autonomous Cleanroom FOUP Wafer-Pod & Metrology AGVs Patrolling Both Transfer Tracks!
  for(const [idx,[ax,az,spd]] of [[-8.5,-3.35,1.65],[4.2,-3.35,1.55],[-4.8,3.35,1.58],[7.2,3.35,1.48]].entries()){
   const agv=new THREE.Group();
   agv.position.set(ax,0.488,az);
   g.add(agv);
   // Sculpted multi-tier cleanroom AGV chassis & glowing laser-curtain safety bumper
   const chas=new THREE.Mesh(shape(.92,.14,.56),darkAnodized);chas.position.set(0,.10,0);agv.add(chas);
   const cowl=new THREE.Mesh(shape(.78,.10,.48),cleanWhite);cowl.position.set(0,.20,0);agv.add(cowl);
   const bumper=new THREE.Mesh(shape(.96,.026,.59),az<0?plasmaGlow:green);bumper.position.set(0,.065,0);agv.add(bumper);
   for(const ex of [-.44,.44]){
    const nose=new THREE.Mesh(geos.get('cyl:.26:.14')||new THREE.CylinderGeometry(.26,.26,.14,16),safety);
    nose.position.set(ex,.10,0);agv.add(nose);
   }
   // 4 spinning spoked mecanum wheels
   for(const wx of [-.32,.32])for(const wz of [-.29,.29]){
    const wG=new THREE.Group();wG.position.set(wx,.085,wz);agv.add(wG);
    const wh=new THREE.Mesh(geos.get('cyl:.085:.055')||new THREE.CylinderGeometry(.085,.085,.055,14),carbon);
    wh.rotation.x=Math.PI/2;wG.add(wh);
    const spoke=new THREE.Mesh(shape(.13,.022,.06),chrome);wG.add(spoke);
    motion.push({object:wG,type:'spinZ',speed:-5.4,phase:idx+wx});
   }
   // Motorized vertical scissor-lift FOUP wafer pod carrier + spinning 360° LiDAR dome + rear OLED screen
   const liftGroup=new THREE.Group();
   liftGroup.position.set(-.04,.38,0);
   agv.add(liftGroup);
   const liftPlate=new THREE.Mesh( geos.get('cyl:.24:.04')||new THREE.CylinderGeometry(.24,.24,.04,16),chrome);
   liftGroup.add(liftPlate);
   const podDome=new THREE.Mesh(geos.get('cyl:.22:.34')||new THREE.CylinderGeometry(.19,.23,.34,16),glass);
   podDome.position.set(0,.18,0);liftGroup.add(podDome);
   const waferStack=new THREE.Mesh(geos.get('cyl:.16:.24')||new THREE.CylinderGeometry(.16,.16,.24,14),waferMat);
   waferStack.position.set(0,.17,0);liftGroup.add(waferStack);
   motion.push({object:liftGroup,type:'sweepY',baseY:0.38,amp:0.08,speed:2.6+idx*.3,phase:idx});

   const lidar=new THREE.Group();lidar.position.set(.30,.32,0);agv.add(lidar);
   lidar.add(new THREE.Mesh(geos.get('cyl:.08:.07')||new THREE.CylinderGeometry(.08,.08,.07,14),darkAnodized));
   lidar.add(new THREE.Mesh(geos.get('cyl:.084:.025')||new THREE.CylinderGeometry(.084,.084,.025,14),plasmaGlow));
   motion.push({object:lidar,type:'spinY',speed:6.2,phase:idx});

   const scrBack=new THREE.Mesh(shape(.035,.18,.26),darkAnodized);scrBack.position.set(-.38,.36,0);agv.add(scrBack);
   const scrFace=new THREE.Mesh(shape(.012,.15,.22),az<0?hmiMatA:hmiMatB);scrFace.position.set(-.40,.36,0);agv.add(scrFace);
   motion.push({object:agv,type:'patrolX',minX:-11.8,maxX:10.6,speed:spd,phase:idx*6.2});
  }

  // 12 Multi-Faceted, Dynamic HJT Production Tools (Screenshot 1 Overhaul)
  for(let i=0;i<6;i++)for(const side of [-1,1]){
   const x=-12+i*4.45,z=side*5.1;
   const aisleDir=-side;

   // Stepped Anti-Vibration Machine Plinth & Operator ESD Floor Mat (strictly above y=0.480)
   box(x,.492,z,3.18,.016,1.88,darkAnodized);
   box(x,.498,z+aisleDir*.88,2.45,.012,.32,carbon);
   // Textured twin maintenance cabinet doors + rotary disconnect switch
   const doorPlane=new THREE.Mesh(shape(2.38,.52,.016),cabDoorMat);
   doorPlane.position.set(x,1.06,z+aisleDir*.74);
   g.add(doorPlane);
   box(x-1.26,1.20,z+aisleDir*.73,.09,.09,.025,safety);
   box(x-1.26,1.20,z+aisleDir*.75,.03,.07,.025,red);
   box(x,.53,z+aisleDir*.78,2.65,.028,.035,side<0?ice:green);
   // Dual Front-Corner Cylindrical Vacuum Load-Lock Columns with Reciprocating Wafer Elevators
   for(const lxOff of [-1.18,1.18]){
    cyl(x+lxOff,2.04,z+aisleDir*.56,.14,.66,glass);
    torus(x+lxOff,2.36,z+aisleDir*.56,.15,.020,copper,Math.PI/2,0,0);
    torus(x+lxOff,1.72,z+aisleDir*.56,.15,.020,copper,Math.PI/2,0,0);
    const loadDisk=cyl(x+lxOff,2.04,z+aisleDir*.56,.11,.025,side<0?plasmaGlow:curingGlow);
    motion.push({object:loadDisk,type:'sweepY',baseY:2.04,amp:0.18,speed:2.5+i*.2,phase:lxOff+i});
   }

   const isWetBath=(side<0&&i<2);
   const isPecvd=(side<0&&i>=2&&i<4);
   const isCuring=(side<0&&i>=4);
   const isStringer=(side>0&&i<2);
   const isLaminator=(side>0&&i>=2&&i<4);
   const isFlashTester=(side>0&&i>=4);

   // Sculpted Multi-Tier Process Superstructure with Textured Semiconductor Tool Facade
   const hMat=isWetBath||isFlashTester?hoodMatWhite:hoodMatDark;
   // Upper chamfered process canopy + cylindrical vacuum dome / manifold drum
   box(x,2.38,z,2.54,.44,1.34,hMat);
   cyl(x,2.66,z,.38,2.36,titanium,0,0,Math.PI/2);
   for(const dx of [-1.22,1.22]){
    box(x+dx,2.04,z,.18,.68,1.28,isWetBath||isFlashTester?cleanWhite:darkAnodized);
   }

   // Open-View Illuminated Process Chamber Cavity with Dynamic Internal Mechanisms
   // Backlit plasma/laser chamber floor
   const coreMat=isCuring?curingGlow:isPecvd?plasmaGlow:isFlashTester?warm:side<0?ice:green;
   const core=box(x-.12,1.74,z,1.72,.04,.64,coreMat);
   motion.push({object:core,type:'pulse',base:0.70,amp:0.35,speed:3.2+i*.4,phase:i});

   // Spinning Vacuum Wafer Chuck inside chamber
   const chuck=cyl(x-.45,1.82,z,.24,.08,chrome);
   const chuckWafer=cyl(x-.45,1.87,z,.21,.015,waferMat);
   motion.push({object:chuck,type:'spinY',speed:2.8,phase:i});
   motion.push({object:chuckWafer,type:'spinY',speed:2.8,phase:i});

   // Sweeping Dual-Axis Laser / Plasma Gantry with Glowing Vertical Discharge Curtain
   const gantryHead=new THREE.Group();
   gantryHead.position.set(x-.12,2.08,z);
   g.add(gantryHead);
   const carriage=new THREE.Mesh(shape(.24,.18,.78),chrome);
   gantryHead.add(carriage);
   const laserCurtain=new THREE.Mesh(shape(.035,.36,.58),side<0?plasmaGlow:curingGlow);
   laserCurtain.position.set(0,-.20,0);
   gantryHead.add(laserCurtain);
   motion.push({object:gantryHead,type:'sweepX',baseX:x-.12,amp:.64,speed:2.1+i*.25,phase:i*.9+(side<0?0:1.5)});

   // Reciprocating Vertical Pneumatic Pick-and-Place Actuator on right side of chamber
   const pickHead=cyl(x+.58,2.02,z,.12,.28,copper);
   motion.push({object:pickHead,type:'sweepY',baseY:1.98,amp:.16,speed:3.4+i*.3,phase:i});

   // Clear armored viewing window with brushed chrome frame & ConFlat circular sight-ports
   box(x-.12,2.02,z+aisleDir*.66,1.86,.48,.02,glass);
   for(const vx of [-.68,.44]){
    torus(x+vx,2.02,z+aisleDir*.675,.15,.022,chrome,0,0,0);
   }

   // Stage-specific dynamic external hardware on roof of tool
   if(isWetBath){
    for(const dx of [-.65,.45]){
     cyl(x+dx,2.92,z,.22,.44,cleanWhite);
     buildSpokedWheel(x+dx,3.16,z,.18,ice,chrome,Math.PI/2,0,0,4.5,'spinY');
    }
   } else if(isPecvd){
    box(x-.2,2.92,z,.95,.32,.68,titanium);
    for(let mfc=0;mfc<4;mfc++)cyl(x-.52+mfc*.22,2.92,z+aisleDir*.38,.035,.28,brass);
    buildSpokedWheel(x+.72,2.88,z+aisleDir*.42,.18,plasmaGlow,chrome,0,0,0,5.2,'spinZ');
   } else if(isCuring){
    for(let zIdx=0;zIdx<3;zIdx++){
     const zx=x-.68+zIdx*.68;
     cyl(zx,2.92,z,.20,.34,copper);
     buildSpokedWheel(zx,2.92,z+aisleDir*.22,.16,amber,chrome,0,0,0,4.8,'spinZ');
    }
   } else if(isStringer){
    for(const dx of [-.68,-.14,.40]){
     buildSpokedWheel(x+dx,2.92,z+aisleDir*.36,.20,copper,chrome,0,0,0,2.6+dx,'spinZ');
    }
   } else if(isLaminator){
    for(const dx of [-1.02,.82])for(const dz of [-.48,.48]){
     cyl(x+dx,2.88,z+dz,.085,.38,darkAnodized);
     const piston=cyl(x+dx,3.16,z+dz,.048,.28,chrome);
     motion.push({object:piston,type:'sweepY',baseY:3.14,amp:.08,speed:1.8,phase:i});
    }
   } else if(isFlashTester){
    box(x-.12,3.06,z+aisleDir*.48,1.56,.58,.08,darkAnodized);
    const elPlane=new THREE.Mesh(shape(1.46,.48,.015),elScreenMat);
    elPlane.position.set(x-.12,3.06,z+aisleDir*.530);
    g.add(elPlane);
   }

   // Articulated 6-Axis Industrial Robot Arm at EVERY station for continuous dynamic motion
   buildRoboticArm(x-1.08,0.48,z+aisleDir*.64,aisleDir>0?0.35:-2.75,side>0,i*0.95+side,side>0?solarModMat:waferMat);

   // Tubular Safety Guard Rails & Optical Light Curtains at machine entry/exit throats
   for(const dx of [-1.32,1.32]){
    pipe([x+dx,1.62,z-.42],[x+dx,2.14,z-.42],.028,safety);
    pipe([x+dx,1.62,z+.42],[x+dx,2.14,z+.42],.028,safety);
    pipe([x+dx,2.14,z-.42],[x+dx,2.14,z+.42],.028,safety);
    box(x+dx,1.88,z-.42,.018,.42,.045,red);
    box(x+dx,1.88,z+.42,.018,.42,.045,red);
   }

   // Optical AOI / EL Inspection Gantry & Pulsing Line-Scan Camera Array
   for(const dx of [-1.14,1.14]){
    pipe([x+dx,1.85,z-.72],[x+dx,2.68,z-.72],.040,titanium);
    pipe([x+dx,1.85,z+.72],[x+dx,2.68,z+.72],.040,titanium);
    pipe([x+dx,2.68,z-.72],[x+dx,2.68,z+.72],.040,titanium);
   }
   for(const cz of [-.36,0,.36]){
    cyl(x,2.56,z+cz,.055,.16,darkAnodized);
    cyl(x,2.46,z+cz,.042,.025,ice);
   }
   const scanBar=box(x,2.58,z,.24,.040,.96,i%2===0?ice:green);
   motion.push({object:scanBar,type:'pulse',base:0.65,amp:0.35,speed:3.4+i*.4});

   // 4-Tier Andon Signal Beacon Stack Tower
   const bx=x+.95,bz=z+aisleDir*.55;
   cyl(bx,2.86,bz,.024,.36,chrome);
   cyl(bx,3.08,bz,.048,.070,red);
   cyl(bx,3.16,bz,.048,.070,amber);
   const topBeacon=cyl(bx,3.24,bz,.048,.080,green);
   cyl(bx,3.32,bz,.048,.070,ice);
   motion.push({object:topBeacon,type:'pulse',base:0.55,amp:0.42,speed:2.6+i*.3});

   // Swiveling Cantilevered Operator HMI Console
   const hx=x+1.08,hz=z+aisleDir*.82;
   pipe([hx,1.15,z+aisleDir*.62],[hx,1.62,hz],.034,titanium);
   const hmiTilt=aisleDir>0?-0.22:0.22;
   const hmiBody=box(hx,1.76,hz,.56,.44,.08,darkAnodized);
   hmiBody.rotation.x=hmiTilt;
   const hmiScreen=new THREE.Mesh(shape(.50,.33,.015),side<0?hmiMatA:hmiMatB);
   hmiScreen.position.set(hx,1.78,hz+aisleDir*.046);
   hmiScreen.rotation.x=hmiTilt;
   g.add(hmiScreen);
   box(hx,1.50,hz+aisleDir*.04,.52,.048,.18,titanium);
   cyl(hx+.17,1.54,hz+aisleDir*.06,.034,.025,safety);
   cyl(hx+.17,1.57,hz+aisleDir*.06,.026,.034,red);
   cyl(hx-.14,1.535,hz+aisleDir*.06,.018,.02,green);
   cyl(hx-.05,1.535,hz+aisleDir*.06,.018,.02,ice);
   cyl(hx+.04,1.535,hz+aisleDir*.06,.018,.02,amber);

   // Side Turbo-Molecular Vacuum Pump with Spinning Rotor Sight-Glass
   const pz=z-aisleDir*.68;
   cyl(x-.85,.95,pz,.20,.56,titanium);
   cyl(x-.85,1.32,pz,.14,.16,copper);
   torus(x-.85,1.05,pz,.215,.018,copper,Math.PI/2,0,0);
   torus(x-.85,0.85,pz,.215,.018,copper,Math.PI/2,0,0);
   pipe([x-.85,1.40,pz],[x-.85,1.92,z-aisleDir*.35],.048,chrome);

   for(let k=0;k<3;k++)box(x-.70+k*.7,.510,z+aisleDir*.88,.42,.024,.16,safety);

   pipe([x-.65,2.68,z-aisleDir*.32],[x-.65,def.h-1.16,z-aisleDir*.32],.040,bluePipe);
   pipe([x-.48,2.68,z-aisleDir*.32],[x-.48,def.h-1.26,z-aisleDir*.32],.034,gasPipe);
   pipe([x+.65,2.68,z-aisleDir*.32],[x+.65,def.h-1.36,z-aisleDir*.32],.030,copper);
   torus(x-.65,3.05,z-aisleDir*.26,.068,.015,red,0,0,0);
   torus(x-.48,3.25,z-aisleDir*.26,.062,.014,safety,0,0,0);
  }

  for(const x of [-12,-7.55,-3.1,1.35,5.8,10.25]){
   pipe([x,def.h-1.16,-7.4],[x,def.h-1.16,7.4],.085,titanium);
   pipe([x+.18,def.h-1.34,-7.4],[x+.18,def.h-1.34,7.4],.048,copper);
   pipe([x-.18,def.h-1.26,-7.4],[x-.18,def.h-1.26,7.4],.042,bluePipe);
  }
  for(const z of [-5.4,0,5.4]){
   box(-.8,def.h-1.48,z,27.5,.065,.34,darkAnodized);
   pipe([-14,def.h-1.22,z],[13,def.h-1.22,z],.055,gasPipe);
  }

  addPointLight(-10,5.2,-2.5,0xdff6ff,high?2.5:1.1,17);
  addPointLight(0,5.2,0,0xfff3dd,high?2.8:1.2,19);
  addPointLight(10,5.2,2.5,0xdff6ff,high?2.5:1.1,17);

  addLabel('LINE 01 / WAFER',-9.4,3.55,-8.48,2.8,'#d4f5ff','PECVD · ITO SPUTTERING · AOI');
  addLabel('LINE 02 / MODULE',4.8,3.55,-8.48,2.9,'#dcffe8','CELL STRINGING · EL TEST · LAMINATION');

 }else if(def.kind==='compute'){
  // ============================================================================
  // 2. COMPUTE HALLS 01, 02, 03 — Three Distinct Hyperscale Architectures
  //    - Hall 01 (variant 0): AI Tensor Supercluster & Optical Fabric (Clean White, Chrome & Ice-Cyan)
  //    - Hall 02 (variant 1): Direct-to-Chip & Immersion Liquid Cooling (Hydro-Emerald & Brushed Copper)
  //    - Hall 03 (variant 2): High-Voltage 480V Grid, LFP BESS & Core Fiber (Graphite, Copper & Gold)
  // ============================================================================
  const variant=def.variant||0;
  const accent=variant===0?ice:variant===1?green:warm;
  const rackTex=createRackFaceTexture(textures,variant);
  const rackFaceMat=new THREE.MeshStandardMaterial({
   map:rackTex,metalness:.38,roughness:.28,
   emissive:variant===0?0x0e3242:variant===1?0x0b3322:0x33220a,
   emissiveIntensity:.46,
   polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1
  });
  mats.push(rackFaceMat);

  // Pool of 32 independent stochastic blinking LED materials so every server blinks randomly!
  const ledColors=variant===0?[0x5ce1e6,0x38ef9b,0x42a5f5,0xd8f8ff,0x7bf1a8]:
                  variant===1?[0x38ef9b,0x2ad88a,0x7bf1a8,0xf5c26b,0x5ce1e6]:
                              [0xf5c26b,0xff9e44,0xffe082,0xff5238,0x4be39a];
  const ledBank=Array.from({length:32},(_,idx)=>{
   const hex=ledColors[idx%ledColors.length];
   const m=material(hex,0.08,0.18,hex,0.88);
   motion.push({
    object:{material:m},
    type:'randomBlink',
    seed:idx*1.73+variant*5.1,
    f1:9.5+(idx%9)*2.7,
    f2:17.3+(idx%7)*3.4,
    f3:29.1+(idx%5)*4.3,
    low:0.06,
    high:1.35+(idx%3)*0.25
   });
   return m;
  });

  const hmiTex=createHmiTexture(textures,variant===1?1:variant===2?2:0,variant+1);
  const hmiMat=new THREE.MeshBasicMaterial({map:hmiTex});
  mats.push(hmiMat);

  // Rack-Front Detailing Customized Per Hall Variant
  for(let i=0;i<10;i++)for(const side of [-1,1]){
   const x=-11+i*2.44,z=side*2.52;
   const aisleDir=-side;
   const faceZ=z+aisleDir*.620;
   const rowZ=z+aisleDir*.638;
   const detailZ=z+aisleDir*.654;

   const facePlane=new THREE.Mesh(shape(1.34,2.20,.008),rackFaceMat);
   facePlane.position.set(x,1.64,faceZ);
   g.add(facePlane);

   // 10 server/module U-rows per rack with 6 independently blinking activity LEDs per row
   const barMatA=variant===0?cleanWhite:variant===1?copper:safety;
   const barMatB=variant===0?chrome:variant===1?darkAnodized:carbon;
   for(let row=0;row<10;row++){
    const y=.74+row*.205;
    box(x,y,rowZ,1.24,.032,.014,row%3===0?barMatA:barMatB);
    box(x-.58,y,detailZ,.040,.030,.012,variant===1?copper:chrome);
    box(x+.58,y,detailZ,.040,.030,.012,variant===1?copper:chrome);
    for(let k=0;k<6;k++){
     const chIdx=(i*19+row*7+k*13+(side>0?11:0))%32;
     box(x-.48+k*.19,y+.052,detailZ,.038,.020,.010,ledBank[chIdx]);
    }
   }

   for(const sx of [-1,1]){
    box(x+sx*.73,1.64,rowZ,.060,2.30,.020,variant===0?cleanWhite:variant===1?copper:safety);
    box(x+sx*.73,1.64,detailZ+.004*aisleDir,.018,2.16,.010,accent);
   }
   box(x,2.90,z+aisleDir*.602,1.48,.074,.022,variant===0?cleanWhite:darkAnodized);
   box(x,2.90,z+aisleDir*.618,.58,.038,.008,ledBank[(i*5+(side>0?3:0))%32]);
   box(x,3.10,z,.72,.080,.82,variant===0?cleanWhite:variant===1?copper:soft);
   pipe([x-.22,3.14,z+aisleDir*.35],[x-.22,4.28,side*3.38],.028,variant===2?safety:variant===1?green:ice);
   pipe([x+.22,3.14,z+aisleDir*.35],[x+.22,4.28,side*3.38],.032,variant===1?copper:variant===0?chrome:copper);

   if(variant===0){
    // Hall 01 Rack Front: Dual vertical cyan optical fiber management ducts & NVLink bridge bars
    for(const sx of [-.64,.64]){
     pipe([x+sx,.76,detailZ+.010*aisleDir],[x+sx,2.76,detailZ+.010*aisleDir],.016,ice);
    }
   } else if(variant===1){
    // Hall 02 Rack Front: Full-height Dual Copper & Emerald Liquid-Cooling Manifolds + 6 Cold-Plate Branch Pipes + Sight Glass
    const mx=x+.56,mz=z+aisleDir*.674;
    pipe([mx,.74,mz],[mx,2.80,mz],.028,copper);
    pipe([x-.56,.74,mz],[x-.56,2.80,mz],.026,gasPipe);
    cyl(mx,2.38,mz+.022*aisleDir,.020,.42,green);
    for(let row=0;row<6;row++){
     const ry=.92+row*.32;
     pipe([x-.56,ry,mz],[mx,ry,mz],.014,copper);
     box(mx,ry,mz+.018*aisleDir,.090,.032,.028,brass);
     box(x-.56,ry,mz+.018*aisleDir,.085,.030,.026,ice);
    }
   } else {
    // Hall 03 Rack Front: Vertical 480V Copper Busbar Trunk, Rotary Breaker Handle & Yellow Fiber Rings
    const px=x-.54,pz=z+aisleDir*.674;
    box(px,1.64,pz,.095,2.04,.028,copper);
    box(px,2.24,pz+.018*aisleDir,.072,.24,.014,red);
    box(px,1.44,pz+.018*aisleDir,.065,.22,.012,warm);
    for(let r=0;r<4;r++){
     torus(x+.54,1.05+r*.42,pz,.065,.016,safety,0,0,0);
    }
   }
  }

  // End-of-Row Conditioning / Cooling / Switchgear Towers (Styled Per Hall Variant)
  for(const side of [-1,1])for(const cx of [-12.55,12.25]){
   const cz=side*2.52,aisleDir=-side;
   box(cx,1.68,cz,.92,2.46,1.08,variant===0?cleanWhite:variant===1?darkAnodized:carbon);
   box(cx,2.90,cz,.96,.08,1.12,variant===0?chrome:variant===1?copper:safety);
   box(cx,2.52,cz+aisleDir*.55,.58,.18,.02,hmiMat);
   for(let f=0;f<3;f++){
    const fy=.92+f*.58;
    buildSpokedWheel(cx,fy,cz+aisleDir*.56,.22,variant===1?copper:titanium,accent,0,0,0,5.4+f,'spinZ');
   }
  }

  // Overhead Fire Suppression Piping & Panning Security Domes
  for(const side of [-1,1]){
   pipe([-12.8,5.18,side*1.38],[12.8,5.18,side*1.38],.032,redPipe);
   for(let nx=-10;nx<=10;nx+=4){
    cyl(nx,5.10,side*1.38,.038,.08,brass);
    cyl(nx,5.04,side*1.38,.022,.05,chrome);
   }
   for(const tx of [12.65,13.05]){
    cyl(tx,1.32,side*3.35,.16,1.62,redPipe);
    cyl(tx,2.18,side*3.35,.06,.16,brass);
    pipe([tx,2.24,side*3.35],[tx,5.18,side*3.35],.024,redPipe);
   }
  }
  box(-13.25,1.15,-1.65,.18,1.32,.18,darkAnodized);
  box(-13.15,1.48,-1.65,.04,.24,.16,hmiMat);
  torus(-13.14,1.68,-1.65,.055,.012,accent,0,Math.PI/2,0);
  for(const cx of [-8.5,0,8.5])for(const cz of [-1.65,1.65]){
   cyl(cx,4.85,cz,.09,.12,cleanWhite);
   const dome=cyl(cx,4.75,cz,.075,.09,darkAnodized);
   motion.push({object:dome,type:'robotYaw',baseYaw:0,amp:0.85,speed:0.9,phase:cx+cz});
  }

  const ex=13.35;
  box(ex,2.15,0,.38,3.1,4.6,variant===0?cleanWhite:darkAnodized);
  box(ex-.21,2.25,0,.025,1.65,2.65,hmiMat);
  box(ex-.21,3.25,0,.04,.12,2.8,accent);

  // ============================================================================
  // BUILDER: Sculpted Autonomous Floor-Running Monitoring Robot Fleet
  // ============================================================================
  const buildFloorMonitoringRobot=(startX,laneZ,minX,maxX,speed,phase)=>{
   const bot=new THREE.Group();
   bot.position.set(startX,.485,laneZ);
   g.add(bot);

   const bodyMat=variant===0?cleanWhite:variant===1?copper:safety;
   const trimMat=variant===0?chrome:variant===1?titanium:darkAnodized;
   const glowMat=variant===0?plasmaGlow:variant===1?green:amber;

   // 1. Sculpted multi-tier lower drive chassis & 360-degree laser collision bumper
   const lowerPan=new THREE.Mesh(shape(.76,.09,.48),darkAnodized);
   lowerPan.position.set(0,.095,0);
   bot.add(lowerPan);
   const bumperGlow=new THREE.Mesh(shape(.79,.024,.51),glowMat);
   bumperGlow.position.set(0,.065,0);
   bot.add(bumperGlow);
   const upperCowl=new THREE.Mesh(shape(.64,.12,.40),bodyMat);
   upperCowl.position.set(-.02,.20,0);
   bot.add(upperCowl);
   const topDeck=new THREE.Mesh(shape(.56,.03,.36),trimMat);
   topDeck.position.set(-.02,.275,0);
   bot.add(topDeck);

   // 2. Front Floor-Probing Sensor Array Bar (scans floor tiles & sub-floor trenches)
   const floorProbeBar=new THREE.Mesh(shape(.09,.045,.44),darkAnodized);
   floorProbeBar.position.set(.38,.055,0);
   bot.add(floorProbeBar);
   for(let s=-2;s<=2;s++){
    const emitter=new THREE.Mesh(geos.get('cyl:.016:.03')||new THREE.CylinderGeometry(.016,.016,.03,10),s%2===0?glowMat:ice);
    emitter.position.set(.39,.028,s*.085);
    bot.add(emitter);
   }

   // 3. Spinning Mecanum / Rocker-Bogie Drive Wheels with Spoked Hubs
   const wheelXList=variant===2?[-.25,0,.25]:[-.24,.24];
   for(const wx of wheelXList)for(const wz of [-.255,.255]){
    const wGroup=new THREE.Group();
    wGroup.position.set(wx,.085,wz);
    bot.add(wGroup);
    const tire=new THREE.Mesh(geos.get('cyl:.085:.055')||new THREE.CylinderGeometry(.085,.085,.055,14),carbon);
    tire.rotation.x=Math.PI/2;
    wGroup.add(tire);
    const hub=new THREE.Mesh(geos.get('cyl:.048:.062')||new THREE.CylinderGeometry(.048,.048,.062,12),trimMat);
    hub.rotation.x=Math.PI/2;
    wGroup.add(hub);
    const spoke=new THREE.Mesh(shape(.13,.022,.066),glowMat);
    wGroup.add(spoke);
    motion.push({object:wGroup,type:'spinZ',speed:-5.5,phase:wx+wz});
   }

   // 4. Rear Angled Live-Telemetry OLED Display & Onboard Blinking Status LEDs
   const screenBack=new THREE.Mesh(shape(.04,.22,.30),darkAnodized);
   screenBack.position.set(-.31,.42,0);
   screenBack.rotation.z=-0.22;
   bot.add(screenBack);
   const screenFace=new THREE.Mesh(shape(.012,.18,.26),hmiMat);
   screenFace.position.set(-.332,.42,0);
   screenFace.rotation.z=-0.22;
   bot.add(screenFace);
   for(let k=0;k<4;k++){
    const led=new THREE.Mesh(shape(.035,.018,.012),ledBank[(k*7+variant*5)%32]);
    led.position.set(-.18+k*.11,.21,.206);
    bot.add(led);
   }

   // 5. Variant-Specific Upper Sensor Mast & Dynamic Turret / Vertical Scanner
   if(variant===0){
    // Hall 01 Robot: Dual Telescoping Chrome Mast + Vertical-Scanning Optical/IR Rack Carriage + 360° LiDAR
    for(const sz of [-.11,.11]){
     const col=new THREE.Mesh(geos.get('cyl:.024:1.36')||new THREE.CylinderGeometry(.024,.024,1.36,12),chrome);
     col.position.set(.04,.96,sz);
     bot.add(col);
    }
    const mastCap=new THREE.Mesh(shape(.16,.045,.30),cleanWhite);
    mastCap.position.set(.04,1.66,0);
    bot.add(mastCap);
    // Motorized vertical-scanning rack-inspection head (oscillates up and down the server racks!)
    const scanCarriage=new THREE.Group();
    scanCarriage.position.set(.04,1.05,0);
    bot.add(scanCarriage);
    scanCarriage.add(new THREE.Mesh(shape(.18,.11,.34),darkAnodized));
    for(const sz of [-.175,.175]){
     const laserBar=new THREE.Mesh(shape(.14,.035,.018),plasmaGlow);
     laserBar.position.set(0,0,sz);
     scanCarriage.add(laserBar);
    }
    motion.push({object:scanCarriage,type:'sweepY',baseY:1.05,amp:0.44,speed:2.8,phase});
    // Top spinning 360° multi-beam LiDAR dome
    const lidar=new THREE.Group();
    lidar.position.set(.04,1.74,0);
    bot.add(lidar);
    lidar.add(new THREE.Mesh(geos.get('cyl:.075:.09')||new THREE.CylinderGeometry(.075,.075,.09,14),darkAnodized));
    const lBand=new THREE.Mesh(geos.get('cyl:.078:.03')||new THREE.CylinderGeometry(.078,.078,.03,14),plasmaGlow);
    lidar.add(lBand);
    motion.push({object:lidar,type:'spinY',speed:6.5,phase});
   } else if(variant===1){
    // Hall 02 Robot: Dual Dielectric Fluid Assay Cylinders + Panning Hydro-Thermal & Ultrasonic Turret
    for(const sz of [-.11,.11]){
     const tank=new THREE.Mesh(geos.get('cyl:.052:.34')||new THREE.CylinderGeometry(.052,.052,.34,12),green);
     tank.position.set(-.12,.46,sz);
     bot.add(tank);
     const cap=new THREE.Mesh(geos.get('cyl:.058:.03')||new THREE.CylinderGeometry(.058,.058,.03,12),copper);
     cap.position.set(-.12,.64,sz);
     bot.add(cap);
    }
    for(const sz of [-.08,.08]){
     const strut=new THREE.Mesh(geos.get('cyl:.024:.68')||new THREE.CylinderGeometry(.024,.024,.68,10),copper);
     strut.position.set(.08,.62,sz);
     bot.add(strut);
    }
    const turret=new THREE.Group();
    turret.position.set(.08,1.02,0);
    bot.add(turret);
    turret.add(new THREE.Mesh(shape(.22,.14,.24),darkAnodized));
    for(const sz of [-.07,.07]){
     const barrel=new THREE.Mesh(geos.get('cyl:.038:.12')||new THREE.CylinderGeometry(.038,.038,.12,12),copper);
     barrel.position.set(.12,0,sz);
     barrel.rotation.z=Math.PI/2;
     turret.add(barrel);
     const lens=new THREE.Mesh(geos.get('cyl:.028:.02')||new THREE.CylinderGeometry(.028,.028,.02,10),sz<0?green:ice);
     lens.position.set(.185,0,sz);
     lens.rotation.z=Math.PI/2;
     turret.add(lens);
    }
    motion.push({object:turret,type:'robotYaw',baseYaw:0,amp:0.95,speed:1.8,phase});
   } else {
    // Hall 03 Robot: HV Chevron Bumpers + Panning UHF Corona Parabolic Dish & Busbar Thermography Turret
    for(const exSign of [-1,1]){
     const chev=new THREE.Mesh(shape(.035,.07,.46),hazardMat);
     chev.position.set(exSign*.395,.10,0);
     bot.add(chev);
    }
    const hvMod=new THREE.Mesh(shape(.24,.16,.32),copper);
    hvMod.position.set(-.10,.36,0);
    bot.add(hvMod);
    const mast=new THREE.Mesh(geos.get('cyl:.032:.64')||new THREE.CylinderGeometry(.032,.032,.64,12),titanium);
    mast.position.set(.10,.60,0);
    bot.add(mast);
    const hvTurret=new THREE.Group();
    hvTurret.position.set(.10,.98,0);
    bot.add(hvTurret);
    hvTurret.add(new THREE.Mesh(shape(.20,.14,.22),darkAnodized));
    // Parabolic UHF acoustic partial-discharge dish + infrared lens
    const dish=new THREE.Mesh(geos.get('cone:.11:.03:.08:14')||new THREE.CylinderGeometry(.11,.03,.08,14),safety);
    dish.position.set(.13,.02,-.06);
    dish.rotation.z=-Math.PI/2;
    hvTurret.add(dish);
    const irLens=new THREE.Mesh(geos.get('cyl:.038:.06')||new THREE.CylinderGeometry(.038,.038,.06,12),red);
    irLens.position.set(.12,-.01,.06);
    irLens.rotation.z=Math.PI/2;
    hvTurret.add(irLens);
    const strobe=new THREE.Mesh(geos.get('cyl:.036:.07')||new THREE.CylinderGeometry(.036,.036,.07,10),amber);
    strobe.position.set(0,.11,0);
    hvTurret.add(strobe);
    motion.push({object:hvTurret,type:'robotYaw',baseYaw:0,amp:1.05,speed:1.6,phase});
   }

   motion.push({object:bot,type:'patrolX',minX,maxX,speed,phase});
   return bot;
  };

  if(variant===0){
   // ==========================================================================
   // COMPUTE HALL 01 EXCLUSIVE LOOK:
   // - Stepped Multi-Layer Sub-Floor Optical Waveguide Trench (Zero Z-Fighting!)
   // - 2 Autonomous Telescoping AI Rack-Scanner & LiDAR Floor Robots + Mobile OTDR Cart
   // - Floor-Mounted Cold-Aisle Differential Pressure & Dew-Point Sensor Pedestals
   // - Sloped Overhead Acrylic Skylight Canopy, 4 Halo Chandeliers & Robotic Ceiling Shuttles
   // ==========================================================================
   // 1) Stepped Sub-Floor Optical Waveguide & Cryo-Bus Trench (strictly above y=0.480 floor top!)
   box(0,.490,0,23.6,.012,1.18,darkAnodized);
   for(const side of [-1,1]){
    // Beveled brushed-chrome trench side curbs (y=[0.496, 0.520])
    box(0,.508,side*.56,23.6,.024,.065,chrome);
    // Rack-front cold-aisle venturi floor plinths & glowing cyan airflow telemetry bars (z = ±1.74)
    box(0,.492,side*1.74,24.6,.014,.24,cleanWhite);
    box(0,.504,side*1.74,24.4,.008,.06,ice);
   }
   // Transverse chrome trench bridge ribs every 2.2m (y=[0.522, 0.530])
   for(let bx=-11.0;bx<=11.0;bx+=2.2){
    box(bx,.526,0,.06,.008,1.06,chrome);
   }
   // 5 Parallel Non-Coplanar Optical Waveguide Trunks (y=[0.498, 0.508])
   for(const fz of [-.34,-.17,0,.17,.34]){
    box(0,.503,fz,23.2,.010,.032,fz===0?plasmaGlow:ice);
   }
   // 16 Bi-Directional High-Speed Optical Data Packets racing along the waveguide rails (y=[0.511, 0.519])
   for(let p=0;p<16;p++){
    const px=-11.0+p*1.42;
    const laneIdx=(p%5)-2;
    const pulse=box(px,.515,laneIdx*.17,.42,.008,.042,p%2===0?plasmaGlow:cleanWhite);
    motion.push({object:pulse,type:'conveyorX',baseX:px,minX:-11.2,span:22.4,speed:laneIdx%2===0?5.2:-5.2});
   }

   // 2) Floor-Mounted Cold-Aisle Differential Pressure & Dew-Point Telemetry Pedestals (z = ±1.72)
   for(const side of [-1,1])for(const px of [-7.3,0,7.3]){
    const pz=side*1.72,aisleDir=-side;
    cyl(px,.68,pz,.065,.38,cleanWhite);
    torus(px,.88,pz,.072,.014,ice,Math.PI/2,0,0);
    box(px,.98,pz,.24,.18,.04,darkAnodized);
    const pDisp=new THREE.Mesh(shape(.20,.14,.008),hmiMat);
    pDisp.position.set(px,.98,pz+aisleDir*.026);
    g.add(pDisp);
   }

   // 3) Mobile Optical OTDR & Quantum Bit-Error-Rate (BER) Floor Diagnostic Cart (x = -2.4, z = -1.48)
   const cx=-2.4,cz=-1.48;
   box(cx,.54,cz,.68,.05,.48,cleanWhite);
   box(cx,.88,cz,.64,.04,.44,cleanWhite);
   box(cx,1.18,cz,.68,.045,.48,chrome);
   for(const dx of [-.28,.28])for(const dz of [-.19,.19]){
    pipe([cx+dx,.50,cz+dz],[cx+dx,1.18,cz+dz],.020,chrome);
    cyl(cx+dx,.50,cz+dz,.04,.04,carbon,Math.PI/2,0,0);
   }
   for(const sx of [-.16,.16]){
    torus(cx+sx,.72,cz+.23,.10,.022,ice,0,0,0);
    const mon=box(cx+sx,1.36,cz-.06,.28,.22,.02,darkAnodized);
    mon.rotation.x=0.18;
    const scr=new THREE.Mesh(shape(.25,.19,.008),hmiMat);
    scr.position.set(cx+sx,1.36,cz-.046);
    scr.rotation.x=0.18;
    g.add(scr);
   }

   // 4) Two Autonomous Telescoping AI Rack-Scanner & LiDAR Floor Robots Patrolling Both Cold-Aisle Lanes!
   buildFloorMonitoringRobot(-6.5,-.92,-10.2,10.2,1.45,0.0);
   buildFloorMonitoringRobot( 4.5, .92,-10.2,10.2,1.35,10.2);

   // 5) Sloped Overhead Acrylic Cold-Aisle Containment Skylight Canopy & 4 Circular Ice-Cyan Halo Rings
   for(const side of [-1,1]){
    const canopy=box(0,3.68,side*1.05,24.4,.035,1.48,polyGuard);
    canopy.rotation.x=side*0.34;
    box(0,3.42,side*1.74,24.6,.48,.032,polyGuard);
    box(0,3.18,side*1.74,24.6,.045,.06,cleanWhite);
    box(0,4.28,side*3.45,25.2,.08,.48,cleanWhite);
    box(0,4.22,side*2.12,24.4,.04,.08,ice);
   }
   for(const hx of [-8.4,-2.8,2.8,8.4]){
    torus(hx,4.62,0,1.18,.042,chrome,Math.PI/2,0,0);
    torus(hx,4.57,0,1.18,.028,ice,Math.PI/2,0,0);
    box(hx,4.35,0,.36,.05,6.8,cleanWhite);
   }

   // 6) Dual Ceiling-Mounted Automated Robotic Optical Cartridge Shuttle Gantries
   pipe([-11.2,3.92,-.38],[11.2,3.92,-.38],.028,chrome);
   pipe([-11.2,3.92, .38],[11.2,3.92, .38],.028,chrome);
   for(const [gIdx,baseX] of [-5.2,5.2].entries()){
    const shuttle=new THREE.Group();
    shuttle.position.set(baseX,3.82,0);
    g.add(shuttle);
    shuttle.add(new THREE.Mesh(shape(.68,.16,.92),cleanWhite));
    const sStripe=new THREE.Mesh(shape(.70,.05,.84),ice);
    sStripe.position.set(0,-.04,0);
    shuttle.add(sStripe);
    const arm=new THREE.Mesh(geos.get('cyl:.04:.52')||new THREE.CylinderGeometry(.04,.04,.52,12),chrome);
    arm.position.set(0,-.32,0);
    shuttle.add(arm);
    const head=new THREE.Mesh(shape(.24,.12,.24),plasmaGlow);
    head.position.set(0,-.58,0);
    shuttle.add(head);
    motion.push({object:shuttle,type:'sweepX',baseX,amp:3.6,speed:1.15+gIdx*.25,phase:gIdx*2.1});
   }

   // 7) East-End 3D Holographic AI Neural-Fabric Core (x = 12.55, z = 0)
   cyl(12.55,.82,0,.52,.68,cleanWhite);
   torus(12.55,1.18,0,.54,.028,ice,Math.PI/2,0,0);
   const holoCore=new THREE.Group();
   holoCore.position.set(12.55,1.72,0);
   g.add(holoCore);
   holoCore.add(new THREE.Mesh(geos.get('tor:.38:.022')||new THREE.TorusGeometry(.38,.022,8,24),plasmaGlow));
   const ring2=new THREE.Mesh(geos.get('tor:.30:.018')||new THREE.TorusGeometry(.30,.018,8,24),ice);
   ring2.rotation.x=Math.PI/2;
   holoCore.add(ring2);
   const coreCube=new THREE.Mesh(shape(.24,.24,.24),plasmaGlow);
   coreCube.rotation.set(0.6,0.6,0);
   holoCore.add(coreCube);
   motion.push({object:holoCore,type:'spinY',speed:2.2,phase:0});

   addPointLight(-7,4.8,0,0xa8f0ff,high?2.6:1.2,15);
   addPointLight(4,4.8,0,0xd8faff,high?2.6:1.2,15);
   addLabel('IT OPERATIONS',0,3.62,-depth-.035,2.8,'#d8f6ff','AI TENSOR SUPERCLUSTER · 800G OPTICAL FABRIC');

  }else if(variant===1){
   // ==========================================================================
   // COMPUTE HALL 02 EXCLUSIVE LOOK:
   // - Stepped Stainless & Copper Hydro-Cooling Floor Trenches with Flowing Coolant Pulses
   // - 2 Autonomous Ultrasonic Leak-Sniffer & Hydro-Thermal Floor Crawler Robots
   // - Mobile Dielectric Fluid Filtration & Assay Cart + Sculpted Immersion-Cooling Pods
   // - Overhead Heavy Twin-Pipe Copper & Emerald Hydro-Thermal Truss Bridge with Spinning Valves
   // ==========================================================================
   // 1) Twin Stepped Stainless & Copper Hydro-Cooling Floor Trenches (z = ±1.42, zero coplanar faces!)
   for(const side of [-1,1]){
    const tz=side*1.42;
    // Recessed dark trench liner (y=[0.484, 0.496])
    box(0,.490,tz,23.8,.012,.52,darkAnodized);
    // Copper side curb rails (y=[0.496, 0.520])
    for(const czOff of [-.25,.25]){
     box(0,.508,tz+czOff,23.8,.024,.045,copper);
    }
    // Non-intersecting flat chilled-water supply (green) & hot return (copper) floor channels (y=[0.498, 0.508])
    box(0,.503,tz-.10,23.4,.010,.065,green);
    box(0,.503,tz+.10,23.4,.010,.065,copper);
    // 10 Animated Coolant Flow Pulses streaming along each floor trench (y=[0.510, 0.516])
    for(let fp=0;fp<10;fp++){
     const fpx=-11.0+fp*2.2;
     const flowPulse=box(fpx,.513,tz-.10,.44,.006,.05,ice);
     motion.push({object:flowPulse,type:'conveyorX',baseX:fpx,minX:-11.2,span:22.4,speed:side>0?3.6:-3.6});
    }
    // Elevated brushed-chrome transverse bar grating strictly above the coolant headers (y=[0.522, 0.530])
    for(let gx=-11.2;gx<=11.2;gx+=.52){
     box(gx,.526,tz,.04,.008,.46,chrome);
    }
    box(0,4.31,side*3.48,25.6,.08,.52,copper);
    box(0,4.24,side*2.15,24.4,.04,.08,green);
   }

   // 2) Two Sculpted Dielectric Immersion-Cooling Floor Pods in the Central Aisle (x = -4.6 and x = +4.6, z = 0)
   for(const [tIdx,tx] of [-4.6,4.6].entries()){
    // Vibration-isolated copper leveling feet & stepped stainless lower plinth
    for(const dx of [-.96,0,.96])for(const dz of [-.34,.34]){
     cyl(tx+dx,.51,dz,.065,.06,copper);
    }
    box(tx,.56,0,2.24,.06,.82,copper);
    box(tx,.94,0,2.14,.70,.74,darkAnodized);
    // Cylindrical corner stainless containment columns
    for(const dx of [-1.06,1.06])for(const dz of [-.36,.36]){
     cyl(tx+dx,.94,dz,.055,.72,titanium);
    }
    box(tx,1.32,0,2.22,.06,.82,titanium);
    // Glowing emerald dielectric liquid bath viewport on top & sides (strictly stepped!)
    box(tx,1.365,0,1.94,.03,.62,green);
    for(const sz of [-.382,.382]){
     box(tx,.94,sz,1.82,.42,.016,green);
    }
    // 8 Vertically Submerged Server Blades with Copper Cold-Plate Handles inside the bath
    for(let b=0;b<8;b++){
     const bx=tx-.77+b*.22;
     box(bx,1.40,0,.045,.04,.52,b%2===0?copper:chrome);
    }
    // Motorized Internal Gantry Blade-Scanner Bar sweeping back & forth across the immersion tank!
    const tankScanner=box(tx,1.44,0,.08,.035,.66,ice);
    motion.push({object:tankScanner,type:'sweepX',baseX:tx,amp:0.78,speed:2.4,phase:tIdx*1.7});
    // Hinged angled polycarbonate inspection lid & side copper heat-exchanger loops with spinning pump wheel
    const lid=box(tx,1.58,-.28,2.04,.03,.68,polyGuard);
    lid.rotation.x=0.58;
    pipe([tx-1.14,.62,-.20],[tx-1.14,1.26,-.20],.045,copper);
    pipe([tx+1.14,.62, .20],[tx+1.14,1.26, .20],.045,gasPipe);
    buildSpokedWheel(tx-1.14,.92,.18,.16,copper,chrome,0,Math.PI/2,0,5.2,'spinX');
    // End-mounted Floor HMI Telemetry Console on each immersion tank
    const hmiX=tx+(tIdx===0?-1.22:1.22);
    cyl(hmiX,.82,0,.045,.62,titanium);
    box(hmiX,1.18,0,.08,.26,.36,darkAnodized);
    const tDisp=new THREE.Mesh(shape(.012,.22,.32),hmiMat);
    tDisp.position.set(hmiX+(tIdx===0?-.048:.048),1.18,0);
    g.add(tDisp);
   }

   // 3) Mobile Dielectric Fluid Filtration & Coolant Assay Cart (x = 0.0, z = -1.12)
   const fcx=0.0,fcz=-1.12;
   box(fcx,.54,fcz,.72,.05,.46,copper);
   box(fcx,.92,fcz,.68,.04,.44,titanium);
   for(const dx of [-.30,.30])for(const dz of [-.18,.18]){
    pipe([fcx+dx,.50,fcz+dz],[fcx+dx,.92,fcz+dz],.020,chrome);
   }
   for(const sx of [-.16,.16]){
    cyl(fcx+sx,1.18,fcz,.085,.48,green);
    torus(fcx+sx,1.42,fcz,.09,.018,copper,Math.PI/2,0,0);
   }
   buildSpokedWheel(fcx,.72,fcz+.24,.15,copper,chrome,0,0,0,5.8,'spinZ');

   // 4) Two Autonomous Ultrasonic Leak-Sniffer & Hydro-Thermal Floor Crawler Robots Patrolling Both Lanes!
   buildFloorMonitoringRobot(-7.2,-.88,-10.2,10.2,1.32,0.0);
   buildFloorMonitoringRobot( 5.8, .88,-10.2,10.2,1.42,9.5);

   // 5) Overhead Heavy Twin-Pipe Copper & Emerald Hydro-Thermal Truss Bridge with Spinning Valve Handwheels
   for(const side of [-1,1]){
    pipe([-12.5,4.78,side*2.92],[12.8,4.78,side*2.92],.115,copper);
    pipe([-12.5,5.04,side*2.92],[12.8,5.04,side*2.92],.105,gasPipe);
   }
   for(const x of [-9.5,-4.6,0,4.6,9.5]){
    pipe([x,4.70,-3.85],[x,4.70,3.85],.11,copper);
    pipe([x+.26,4.96,-3.85],[x+.26,4.96,3.85],.095,gasPipe);
    for(const side of [-1,1]){
     box(x,4.52,side*3.38,.72,.16,.38,green);
     buildSpokedWheel(x,4.70,side*2.18,.18,red,brass,0,Math.PI/2,0,3.4,'spinX');
     cyl(x+.26,4.96,side*1.62,.12,.20,brass,0,0,Math.PI/2);
    }
   }

   // 6) East-End Twin Giant Stainless-Steel CDU Heat-Exchanger Skids & Vertical Buffer Tanks
   for(const bz of [-1.78,1.78]){
    cyl(12.95,1.72,bz,.38,2.28,titanium);
    torus(12.95,2.38,bz,.40,.032,copper,Math.PI/2,0,0);
    torus(12.95,1.12,bz,.40,.032,green,Math.PI/2,0,0);
    cyl(12.55,1.72,bz,.04,1.65,green);
    buildSpokedWheel(12.52,1.05,bz,.22,copper,chrome,0,Math.PI/2,0,6.2,'spinX');
   }
   addPointLight(-7,4.8,0,0x7bf1a8,high?2.5:1.1,15);
   addPointLight(4,4.8,0,0xb8ffe0,high?2.5:1.1,15);
   addLabel('THERMAL MANAGEMENT',0,3.62,-depth-.035,3.3,'#c8ffe4','IMMERSION BATHS & CDU MANIFOLDS · PUE 1.04');

  }else{
   // ==========================================================================
   // COMPUTE HALL 03 EXCLUSIVE LOOK:
   // - Stepped Ribbed Dielectric HV Safety Walkway, Chevron Hazard Curbs & Copper Earthing Busbars
   // - 2 Autonomous 6-Wheeled HV Partial-Discharge, Arc-Flash & Busbar Inspection Rovers
   // - Floor-Mounted Ground-Fault Pedestals & Mobile 3-Phase Harmonic Analyzer Cart
   // - East-End 3-Coil Cast-Resin HV Transformer & Spinning Kinetic Flywheel UPS
   // ==========================================================================
   // 1) Stepped Ribbed Dielectric HV Safety Mat Runner & Chevron Hazard Curbs (Zero Z-Fighting!)
   box(0,.490,0,23.6,.012,1.28,carbon);
   // 36 Transverse anti-slip traction ribs strictly above the dielectric mat (y=[0.498, 0.504])
   for(let rx=-11.2;rx<=11.2;rx+=.64){
    box(rx,.501,0,.06,.006,1.18,darkAnodized);
   }
   for(const side of [-1,1]){
    // Stepped yellow/black chevron hazard curbs strictly outside the 1.28m mat (z = ±0.76, y=[0.488, 0.504])
    box(0,.496,side*.76,23.8,.016,.18,hazardMat);
    // Elevated Heavy Copper Earthing / Grounding Busbars along both rack rows (z = ±1.68, y=[0.490, 0.508])
    box(0,.499,side*1.68,24.6,.018,.075,copper);
    box(0,.512,side*1.68,24.4,.006,.028,warm);
   }

   // 2) Floor-Mounted Digital Ground-Fault & Phase-Load Monitoring Pedestals (z = ±1.62)
   for(const side of [-1,1])for(const px of [-6.1,0,6.1]){
    const pz=side*1.62,aisleDir=-side;
    box(px,.68,pz,.16,.38,.16,darkAnodized);
    box(px,.92,pz,.26,.20,.05,safety);
    const gDisp=new THREE.Mesh(shape(.22,.15,.008),hmiMat);
    gDisp.position.set(px,.92,pz+aisleDir*.030);
    g.add(gDisp);
   }

   // 3) Mobile 3-Phase Power-Quality & Harmonic Analyzer Floor Cart (x = 2.4, z = -1.42)
   const pqx=2.4,pqz=-1.42;
   box(pqx,.54,pqz,.68,.05,.46,safety);
   box(pqx,.90,pqz,.64,.04,.42,darkAnodized);
   box(pqx,1.18,pqz,.68,.05,.46,copper);
   for(const dx of [-.28,.28])for(const dz of [-.18,.18]){
    pipe([pqx+dx,.50,pqz+dz],[pqx+dx,1.18,pqz+dz],.020,titanium);
   }
   for(const [cIdx,cxOff] of [-.20,0,.20].entries()){
    torus(pqx+cxOff,.74,pqz+.22,.085,.020,cIdx===0?red:cIdx===1?safety:ice,0,0,0);
   }
   const pqMon=box(pqx,1.36,pqz-.06,.42,.26,.025,darkAnodized);
   pqMon.rotation.x=0.20;
   const pqScr=new THREE.Mesh(shape(.38,.22,.008),hmiMat);
   pqScr.position.set(pqx,1.36,pqz-.044);
   pqScr.rotation.x=0.20;
   g.add(pqScr);

   // 4) Two Autonomous 6-Wheeled HV Partial-Discharge & Arc-Flash Inspection Rovers Patrolling the Dielectric Walkway!
   buildFloorMonitoringRobot(-5.5,-.42,-9.8,9.8,1.28,0.0);
   buildFloorMonitoringRobot( 4.8, .42,-9.8,9.8,1.38,9.8);

   // 5) Overhead Triple-Phase (L1/L2/L3) Exposed Copper Busway on Ribbed Ceramic Insulators + Yellow Fiber Raceways
   for(const side of [-1,1]){
    box(0,4.22,side*2.18,25.2,.09,.34,safety);
    box(0,4.28,side*2.18,25.2,.03,.28,warm);
    for(const [bIdx,bz] of [-.18,0,.18].entries()){
     box(0,4.86,side*2.65+bz,25.4,.08,.055,bIdx===1?brass:copper);
    }
    for(let i=0;i<10;i++){
     const rx=-11+i*2.44;
     box(rx,4.64,side*2.65,.42,.22,.42,darkAnodized);
     box(rx,4.64,side*2.42,.24,.08,.02,ledBank[(i*3)%32]);
     cyl(rx,4.42,side*2.65,.055,.22,cleanWhite);
    }
   }
   for(const x of [-9,-3,3,9]){
    box(x,4.88,0,1.95,.16,.72,darkAnodized);
    for(let k=-2;k<=2;k++)box(x+k*.28,4.76,-.37,.12,.075,.03,k===0?red:warm);
   }

   // 6) East-End 3-Coil Cast-Resin Dry-Type HV Step-Down Transformer (z = -1.75) & Kinetic Flywheel UPS (z = +1.75)
   box(12.85,.62,-1.75,.86,.26,1.68,darkAnodized);
   for(const dz of [-2.25,-1.75,-1.25]){
    cyl(12.85,1.48,dz,.22,1.38,copper);
    torus(12.85,1.92,dz,.23,.025,safety,Math.PI/2,0,0);
    torus(12.85,1.04,dz,.23,.025,safety,Math.PI/2,0,0);
    cyl(12.85,2.35,dz,.055,.36,cleanWhite);
   }
   pipe([12.85,2.54,-2.35],[12.85,2.54,-1.15],.028,copper);

   cyl(12.85,1.38,1.75,.46,1.72,darkAnodized);
   torus(12.85,2.18,1.75,.48,.035,safety,Math.PI/2,0,0);
   buildSpokedWheel(12.85,2.28,1.75,.42,safety,chrome,Math.PI/2,0,0,8.5,'spinZ');
   box(12.95,.498,0,.92,.014,4.6,hazardMat);

   addPointLight(-7,4.8,0,0xffdfa8,high?2.5:1.1,15);
   addPointLight(4,4.8,0,0xffe8c0,high?2.5:1.1,15);
   addLabel('NETWORK & POWER',0,3.62,-depth-.035,3.3,'#fff0c8','480V 3Φ SWITCHGEAR · LFP BESS · CORE FIBER');
  }

 }else if(def.kind==='office'){
  // ============================================================================
  // 4. CONVALT ENERGY HQ & GRID CONTROL CENTER (Red-Circled Building in Screenshot 4)
  // ============================================================================
  const videoWallTex=createHqVideoWallTexture(textures);
  const videoWallMat=new THREE.MeshBasicMaterial({map:videoWallTex});
  const hmiTex=createHmiTexture(textures,0,1);
  const hmiMat=new THREE.MeshBasicMaterial({map:hmiTex});
  mats.push(videoWallMat,hmiMat);

  // 1. North Panoramic Microgrid SCADA & Energy Trading Video Wall (z = -4.75)
  box(0,2.35,-4.78,6.8,2.52,.14,darkAnodized);
  const wallScreen=new THREE.Mesh(shape(6.48,2.24,.02),videoWallMat);
  wallScreen.position.set(0,2.35,-4.69);
  g.add(wallScreen);
  box(0,3.66,-4.72,6.8,.05,.08,ice);
  box(0,1.04,-4.72,6.8,.05,.08,green);

  // 2. Interior Curtain-Wall Glazing Bays & Warm Timber Acoustic Louver Fins (matching exterior)
  for(const side of [-1,1]){
   const wx=side*5.08;
   for(let z=-3.8;z<=3.8;z+=.76){
    box(wx,2.45,z,.12,3.65,.09,timberWarm);
   }
   box(wx-side*.06,2.45,0,.025,3.4,8.2,glass);
  }
  // South Entrance Double-Glazed Vestibule Doors & Architectural Canopy Light
  for(const dx of [-.75,.75]){
   box(dx,1.72,5.06,1.38,2.45,.04,glass);
   pipe([dx+.45,1.25,4.98],[dx+.45,1.95,4.98],.024,chrome);
  }
  addLabel('AMERICAN MADE ENERGY',0,3.62,5.02,3.2,'#e8fff2','MANUFACTURING · SOLAR & WIND · AI COMPUTE · RECYCLING',Math.PI);

  // 3. Suspended Circular Brushed-Bronze & Warm-LED Architectural Halo Chandelier
  torus(0,4.12,-.35,2.35,.065,brass,Math.PI/2,0,0);
  torus(0,4.06,-.35,2.35,.038,warm,Math.PI/2,0,0);
  torus(0,4.24,-.35,1.25,.045,titanium,Math.PI/2,0,0);
  torus(0,4.20,-.35,1.25,.028,ice,Math.PI/2,0,0);

  // 4. Central Interactive 3D Campus Digital-Twin Hologram Table (x = 0, z = -0.35)
  cyl(0,.72,-.35,.96,.48,darkAnodized);
  cyl(0,.98,-.35,1.14,.08,titanium);
  torus(0,1.02,-.35,1.15,.032,ice,Math.PI/2,0,0);
  cyl(0,1.04,-.35,1.06,.025,glass);

  // Miniature 3D Holographic Scale Model of the Convalt Campus floating on the table!
  // Mini Manufacturing Plant
  box(-.38,1.12,.22,.34,.11,.20,ice);
  // Mini Solar Field Array
  for(let r=0;r<3;r++)for(let c=0;c<4;c++){
   const pv=box(-.36+c*.18,1.08,-.04-r*.12,.14,.012,.08,waferMat);
   pv.rotation.x=0.22;
  }
  // Mini Compute Halls 01–03
  for(let dc=0;dc<3;dc++){
   box(.28,1.10,-.16-dc*.14,.28,.08,.09,green);
  }
  // Mini Recycling Plant
  box(-.22,1.11,-.48,.26,.09,.16,warm);
  // 4 Miniature Wind Turbines with Spinning Rotors on the Hologram Table!
  for(const [tx,tz] of [[.42,.12],[-.52,-.22],[-.52,.08],[.42,-.22]]){
   cyl(tx,1.20,tz,.012,.28,chrome);
   const miniRotor=new THREE.Group();
   miniRotor.position.set(tx,1.34,tz+.015);
   g.add(miniRotor);
   for(let b=0;b<3;b++){
    const blade=new THREE.Mesh(shape(.014,.11,.006),ice);
    blade.rotation.z=b*Math.PI*2/3;
    miniRotor.add(blade);
   }
   motion.push({object:miniRotor,type:'spinZ',speed:-3.8,phase:tx*4});
  }
  // Rotating Holographic Telemetry Compass Ring floating above the model
  const holoRing=torus(0,1.48,-.35,.88,.012,green,Math.PI/2,0,0);
  motion.push({object:holoRing,type:'spinZ',speed:0.9,phase:0});

  // 5. Dual Curved Mission-Control Grid Operator Consoles (x = ±3.25, z = -1.55)
  for(const side of [-1,1]){
   const ox=side*3.25,oz=-1.55;
   box(ox,.84,oz,.78,.72,1.88,darkAnodized);
   box(ox,1.22,oz,.86,.05,1.96,timberWarm);
   // Triple ultrawide curved monitors on each console
   for(const dz of [-.56,0,.56]){
    const mon=new THREE.Mesh(shape(.04,.38,.50),hmiMat);
    mon.position.set(ox-side*.12,1.48,oz+dz);
    mon.rotation.y=side*0.15;
    g.add(mon);
   }
   // Ergonomic operator chair
   cyl(ox+side*.62,.68,oz,.22,.06,darkAnodized);
   pipe([ox+side*.62,.50,oz],[ox+side*.62,.84,oz],.035,chrome);
   box(ox+side*.62,.86,oz,.42,.06,.42,soft);
   box(ox+side*.80,1.12,oz,.06,.48,.40,soft);
  }

  // 6. Monocrystalline Silicon Ingot & HJT Wafer Display Cases in South Corners (x = ±3.8, z = +2.8)
  for(const side of [-1,1]){
   const cx=side*3.85,cz=2.85;
   box(cx,.82,cz,.76,.68,.76,darkAnodized);
   box(cx,1.52,cz,.68,.72,.68,glass);
   box(cx,1.90,cz,.72,.05,.72,titanium);
   if(side<0){
    // Hanging Czochralski monocrystalline silicon ingot boule
    const ingot=cyl(cx,1.52,cz,.14,.48,siliconMat);
    motion.push({object:ingot,type:'spinY',speed:1.2,phase:0});
   } else {
    // Rotating framed HJT solar cell & recycled copper/glass showcase
    const sample=box(cx,1.52,cz,.38,.38,.025,waferMat);
    motion.push({object:sample,type:'spinY',speed:1.2,phase:1.5});
   }
  }

  addPointLight(0,4.2,-.35,0xfff2d6,high?2.8:1.3,16);
  addPointLight(-3.2,3.8,-1.5,0xd8f6ff,high?2.0:0.9,12);
  addPointLight(3.2,3.8,-1.5,0xd8f6ff,high?2.0:0.9,12);

 }else{
  // ============================================================================
  // 3. MATERIAL RECYCLING PLANT — Sculpted, Non-Boxy, Dynamic Machinery Overhaul
  // ============================================================================
  const hmiTex=createHmiTexture(textures,2,1);
  const hmiMat=new THREE.MeshBasicMaterial({map:hmiTex});
  const cabDoorTex=createMachineCabinetTexture(textures,true);
  const cabDoorMat=new THREE.MeshStandardMaterial({map:cabDoorTex,metalness:.38,roughness:.36});
  const assayTex=createElMonitorTexture(textures,true);
  const assayMat=new THREE.MeshBasicMaterial({map:assayTex});
  mats.push(hmiMat,cabDoorMat,assayMat);

  // 1. Skylight Bays, Mezzanine Catwalk Gallery & Overhead Crane
  for(const sx of [-7.5,0,7.5])for(const sz of [-3.6,3.6]){
   box(sx,def.h-.34,sz,3.8,.05,1.8,darkAnodized);
   box(sx,def.h-.37,sz,3.5,.025,1.5,ice);
  }
  box(-12.15,3.35,0,1.35,.12,def.d-2.2,darkAnodized);
  box(-11.46,3.42,0,.06,.16,def.d-2.2,safety);
  pipe([-11.46,3.95,-7.2],[-11.46,3.95,7.2],.024,safety);
  pipe([-11.46,4.35,-7.2],[-11.46,4.35,7.2],.026,safety);
  for(let mz=-7.0;mz<=7.0;mz+=2.0){
   pipe([-11.46,3.42,mz],[-11.46,4.38,mz],.024,safety);
   pipe([-12.75,2.45,mz],[-11.55,3.32,mz],.045,titanium);
  }
  box(-11.85,3.82,0,.45,.82,2.2,darkAnodized);
  box(-11.61,4.02,0,.025,.42,1.85,assayMat);

  for(const side of [-1,1]){
   box(0,5.28,side*(depth-.38),def.w-2.0,.14,.16,safety);
  }
  const rCraneX=2.2;
  for(const dx of [-.38,.38]){
   box(rCraneX+dx,5.46,0,.20,.26,def.d-1.8,safety);
   box(rCraneX+dx,5.61,0,.24,.04,def.d-1.8,darkAnodized);
  }
  box(rCraneX,5.66,1.6,1.05,.22,.96,darkAnodized);
  cyl(rCraneX,5.66,1.6,.16,.76,copper,0,0,Math.PI/2);
  pipe([rCraneX-.10,5.45,1.6],[rCraneX-.10,3.95,1.6],.014,chrome);
  pipe([rCraneX+.10,5.45,1.6],[rCraneX+.10,3.95,1.6],.014,chrome);
  box(rCraneX,3.86,1.6,.34,.20,.22,safety);

  addLabel('RECOVERY PURITY 98.7%',-4.8,4.52,0,2.9,'#7bf1a8','THROUGHPUT: 4.2 T/HR · ZERO-LANDFILL');
  addLabel('XRF / EDDY / CORONA ONLINE',4.8,4.52,0,3.0,'#8de8f2','GLASS 99.4% · Al 99.6% · Cu 99.2% · Si 99.1%');

  // 2. East End-Wall XRF Assay Lab & Baled Material Staging
  box(12.22,2.22,-1.2,.36,3.35,4.6,darkAnodized);
  box(12.02,2.26,-1.2,.03,2.15,4.15,glass);
  box(11.99,2.26,-1.2,.02,1.28,2.5,assayMat);
  box(12.01,3.45,-1.2,.05,.12,4.2,green);
  addLabel('XRF MINERAL ASSAY LAB',11.92,3.88,-1.2,2.6,'#c8ffe4','SPECTROGRAPHIC PURITY CONTROL',-Math.PI/2);

  box(12.25,2.10,3.8,.22,3.20,2.9,titanium);
  for(const dz of [2.32,5.28])box(12.12,2.10,dz,.14,3.20,.16,safety);
  box(12.10,3.76,3.8,.26,.30,3.1,darkAnodized);
  for(let slat=0;slat<6;slat++)box(12.11,.82+slat*.46,3.8,.03,.055,2.65,carbon);
  cyl(12.04,4.02,3.8,.06,.14,amber,0,0,Math.PI/2);

  for(const side of [-1,1]){
   const bz=side*7.05;
   box(10.8,.54,bz,2.2,.10,1.15,darkAnodized);
   box(10.8,.490,bz,2.4,.008,1.35,hazardMat);
   for(let b=0;b<2;b++)for(let layer=0;layer<2;layer++){
    const bx=10.3+b*.95,by=.78+layer*.42;
    box(bx,by,bz,.82,.38,.82,b===0?chrome:copper);
    box(bx,by,bz,.84,.39,.04,darkAnodized);
   }
  }

  // 3. Rotary Trommel Screen & Twin-Shaft Shredder (x = -9, z = -6.1)
  const trommelCage=new THREE.Group();
  trommelCage.position.set(-9,2.3,-6.1);
  g.add(trommelCage);
  for(const dx of [-1.15,0,1.15]){
   const ring=new THREE.Mesh(geos.get('tor:.68:.045')||new THREE.TorusGeometry(.68,.045,8,24),safety);
   ring.position.set(dx,0,0);
   ring.rotation.y=Math.PI/2;
   trommelCage.add(ring);
  }
  for(let a=0;a<6;a++){
   const ang=a*Math.PI/3;
   const rib=new THREE.Mesh(shape(2.65,.045,.045),darkAnodized);
   rib.position.set(0,Math.cos(ang)*.66,Math.sin(ang)*.66);
   rib.rotation.x=ang;
   trommelCage.add(rib);
  }
  motion.push({object:trommelCage,type:'spinX',speed:1.15,phase:0});

  for(const tx of [-10.05,-7.95]){
   torus(tx,2.3,-6.1,.70,.055,safety,0,Math.PI/2,0);
   for(const tz of [-6.62,-5.58]){
    pipe([tx,.50,tz],[tx,1.82,tz],.065,darkAnodized);
    const tr=cyl(tx,1.82,tz,.14,.32,chrome,0,0,Math.PI/2);
    motion.push({object:tr,type:'spinX',speed:-2.8,phase:tx});
   }
  }
  // Conical feed hopper & Twin-Shaft Shredder with Spoked Drive Flywheel
  cone(-10.75,2.75,-6.1,.78,.42,.82,4,soft,0,Math.PI/4,0);
  for(const sz of [-6.32,-5.88]){
   const cutter=cyl(-10.75,2.35,sz,.16,.78,chrome,0,0,Math.PI/2);
   motion.push({object:cutter,type:'spinX',speed:sz<-6?3.6:-3.6,phase:0});
  }
  cyl(-7.35,2.05,-5.55,.24,.52,copper,0,0,Math.PI/2);
  buildSpokedWheel(-7.02,2.05,-5.55,.24,safety,chrome,0,Math.PI/2,0,5.5,'spinX');

  // 4. Four-Corner Conical Cyclone Dust Collectors & Baghouse Scrubbers
  for(const side of [-1,1])for(const cx of [-6.8,6.8]){
   const cz=side*7.38;
   cyl(cx,3.55,cz,.52,1.35,titanium);
   torus(cx,4.18,cz,.54,.035,safety,Math.PI/2,0,0);
   torus(cx,2.88,cz,.54,.035,darkAnodized,Math.PI/2,0,0);
   // True conical cyclone lower body!
   cone(cx,2.15,cz,.52,.16,1.45,16,titanium);
   const airlock=cyl(cx,1.32,cz,.18,.24,copper,0,0,Math.PI/2);
   motion.push({object:airlock,type:'spinX',speed:2.8,phase:cx});
   cyl(cx,.82,cz,.38,.68,darkAnodized);
   pipe([cx,4.24,cz],[cx,4.88,side*4.65],.105,titanium);
  }

  // 5. Central Spine Vertical Auger Screw Classifiers & Stepped Industrial Floor Plinths (x = -9, 0, 9, z = 0)
  for(const x of [-9,0,9]){
   box(x,.496,0,1.32,.016,1.32,hazardMat);
   cyl(x,.72,0,.38,.44,darkAnodized);
   torus(x,1.25,0,.28,.028,safety,Math.PI/2,0,0);
   torus(x,1.72,0,.28,.028,safety,Math.PI/2,0,0);
   const augerGroup=new THREE.Group();
   augerGroup.position.set(x,1.45,0);
   g.add(augerGroup);
   for(let f=0;f<5;f++){
    const fy=-.40+f*.20;
    const disc=new THREE.Mesh(geos.get('cyl:.24:.03')||new THREE.CylinderGeometry(.24,.24,.03,14),f%2===0?copper:chrome);
    disc.position.set(0,fy,0);
    disc.rotation.z=0.22;
    disc.rotation.y=f*0.9;
    augerGroup.add(disc);
   }
   motion.push({object:augerGroup,type:'spinY',speed:3.2,phase:x});

   cone(x,2.35,0,.38,.20,.68,16,soft);
   cyl(x,2.82,0,.22,.28,copper);
   pipe([x,2.96,0],[x,3.85,0],.085,titanium);
   pipe([x,3.85,-7.2],[x,3.85,7.2],.095,titanium);
   pipe([x+.22,3.62,-7.2],[x+.22,3.62,7.2],.045,bluePipe);
   box(x,4.12,0,2.1,.09,.46,darkAnodized);
   box(x,4.05,0,1.9,.035,.38,warm);
  }
  for(const side of [-1,1]){
   pipe([-10.8,3.85,side*4.65],[10.8,3.85,side*4.65],.125,titanium);
   pipe([-10.8,4.12,side*4.65],[10.8,4.12,side*4.65],.065,gasPipe);
  }

  // 6. Stepped Slurry & Cullet-Wash Floor Flume Trenches (z = ±2.85), Guarded Sorting Conveyors & 4 Floor-Running Hopper/XRF AGVs
  for(const side of [-1,1]){
   const z=side*4.65;
   const aisleDir=-side;
   for(const rz of [-.64,.64]){
    pipe([-10.8,1.24,z+rz],[10.8,1.24,z+rz],.042,titanium);
    pipe([-10.8,1.34,z+rz],[10.8,1.34,z+rz],.026,safety);
   }
   pipe([-10.6,1.52,z+aisleDir*.88],[10.6,1.52,z+aisleDir*.88],.014,red);
   // Non-coplanar stepped hazard & status curbs (strictly above y=0.480)
   box(0,.496,z+aisleDir*1.12,22.6,.016,.15,hazardMat);
   box(0,.502,z+aisleDir*1.32,22.4,.012,.055,side<0?ice:green);

   // Stepped Recessed Slurry & Cullet-Wash Floor Flume Trench at z = ±2.82
   const flumeZ=side*2.82;
   box(0,.490,flumeZ,22.8,.012,.48,darkAnodized);
   for(const fOff of [-.23,.23]){
    box(0,.508,flumeZ+fOff,22.8,.024,.04,safety);
   }
   box(0,.503,flumeZ-.08,22.4,.010,.06,culletGlass);
   box(0,.503,flumeZ+.08,22.4,.010,.06,copper);
   for(let fp=0;fp<10;fp++){
    const fpx=-10.2+fp*2.1;
    const fPulse=box(fpx,.514,flumeZ-.08,.42,.006,.05,side<0?ice:green);
    motion.push({object:fPulse,type:'conveyorX',baseX:fpx,minX:-10.6,span:21.2,speed:side<0?3.4:-3.4});
   }
   for(let gx=-10.4;gx<=10.4;gx+=.52){
    box(gx,.525,flumeZ,.04,.008,.42,chrome);
   }

   for(let mIdx=0;mIdx<18;mIdx++){
    const mx=-10.2+mIdx*1.18;
    const matType=mIdx%4===0?culletGlass:mIdx%4===1?copper:mIdx%4===2?chrome:siliconMat;
    const cluster=cyl(mx,1.26,z+(mIdx%2?.18:-.18),.16,.09,matType);
    motion.push({object:cluster,type:'conveyorX',baseX:mx,span:21.2,minX:-10.6,speed:side<0?.72:-.62});
   }
  }

  // 4 Autonomous Heavy-Duty Floor-Running Cullet/Copper Hopper & XRF Assay Rovers Patrolling Both Aisles!
  for(const [rIdx,[rx,rz,spd]] of [[-6.5,-1.78,1.38],[4.2,-1.78,1.28],[-3.8,1.78,1.42],[6.2,1.78,1.32]].entries()){
   const rBot=new THREE.Group();
   rBot.position.set(rx,.488,rz);
   g.add(rBot);
   // 6-wheeled heavy industrial chassis with chevron hazard bumpers
   const rBase=new THREE.Mesh(shape(.84,.12,.52),darkAnodized);rBase.position.set(0,.10,0);rBot.add(rBase);
   const rDeck=new THREE.Mesh(shape(.72,.08,.44),rIdx%2===0?copper:titanium);rDeck.position.set(-.04,.20,0);rBot.add(rDeck);
   for(const ex of [-1,1]){
    const hBump=new THREE.Mesh(shape(.04,.08,.50),hazardMat);hBump.position.set(ex*.43,.10,0);rBot.add(hBump);
   }
   for(const wx of [-.28,0,.28])for(const wz of [-.27,.27]){
    const wG=new THREE.Group();wG.position.set(wx,.085,wz);rBot.add(wG);
    const wh=new THREE.Mesh(geos.get('cyl:.085:.06')||new THREE.CylinderGeometry(.085,.085,.06,12),carbon);
    wh.rotation.x=Math.PI/2;wG.add(wh);
    const sp=new THREE.Mesh(shape(.13,.024,.065),safety);wG.add(sp);
    motion.push({object:wG,type:'spinZ',speed:-5.2,phase:rIdx+wx});
   }
   // Rear cylindrical recovered-material dump hopper + Front panning XRF spectrograph turret + Rear assay screen
   const hopper=new THREE.Mesh(geos.get('cone:.22:.14:.26:12')||new THREE.CylinderGeometry(.22,.14,.26,12),safety);
   hopper.position.set(-.14,.36,0);rBot.add(hopper);
   const oreLoad=new THREE.Mesh(geos.get('cyl:.19:.06')||new THREE.CylinderGeometry(.19,.19,.06,12),rIdx%2===0?culletGlass:copper);
   oreLoad.position.set(-.14,.48,0);rBot.add(oreLoad);

   const mast=new THREE.Mesh(geos.get('cyl:.03:.44')||new THREE.CylinderGeometry(.03,.03,.44,10),chrome);
   mast.position.set(.22,.44,0);rBot.add(mast);
   const xrfHead=new THREE.Group();xrfHead.position.set(.22,.68,0);rBot.add(xrfHead);
   xrfHead.add(new THREE.Mesh(shape(.20,.12,.22),darkAnodized));
   const xLens=new THREE.Mesh(geos.get('cyl:.04:.08')||new THREE.CylinderGeometry(.04,.04,.08,12),green);
   xLens.position.set(.12,0,0);xLens.rotation.z=Math.PI/2;xrfHead.add(xLens);
   motion.push({object:xrfHead,type:'robotYaw',baseYaw:0,amp:0.95,speed:1.9,phase:rIdx});

   const aBack=new THREE.Mesh(shape(.035,.18,.28),darkAnodized);aBack.position.set(-.38,.36,0);rBot.add(aBack);
   const aFace=new THREE.Mesh(shape(.012,.15,.24),assayMat);aFace.position.set(-.40,.36,0);rBot.add(aFace);
   motion.push({object:rBot,type:'patrolX',minX:-9.8,maxX:9.4,speed:spd,phase:rIdx*5.5});
  }

  // 7. 10 Sculpted, Non-Boxy, High-Motion Sorting & Material Recovery Cells (Screenshot 3 Overhaul!)
  for(let i=0;i<5;i++)for(const side of [-1,1]){
   const x=-9.2+i*4.6,z=side*4.65;
   const aisleDir=-side;

   // Stepped Heavy-Duty Foundation Plinth under each recovery cell (strictly above y=0.480)
   box(x,.492,z,3.26,.016,2.08,darkAnodized);
   // Textured electrical/pneumatic service panel on lower plinth
   const cellDoor=new THREE.Mesh(shape(2.24,.38,.016),cabDoorMat);
   cellDoor.position.set(x,.66,z+aisleDir*.83);
   g.add(cellDoor);
   // Reciprocating Vibratory Riffle Shaker Bed oscillating dynamically inside each cell
   const cellShaker=new THREE.Group();
   cellShaker.position.set(x,1.32,z);
   g.add(cellShaker);
   for(let rf=-3;rf<=3;rf++){
    const rBar=new THREE.Mesh(shape(.05,.04,1.36),rf%2===0?copper:chrome);
    rBar.position.set(rf*.34,0,0);
    cellShaker.add(rBar);
   }
   motion.push({object:cellShaker,type:'sweepX',baseX:x,amp:0.065,speed:14.0+i,phase:i+side});

   // Tubular yellow safety guardrails along aisle side (no boxy side slabs!)
   pipe([x-1.28,1.42,z+aisleDir*.76],[x+1.28,1.42,z+aisleDir*.76],.026,safety);
   pipe([x-1.28,1.68,z+aisleDir*.76],[x+1.28,1.68,z+aisleDir*.76],.028,safety);

   // Sculpted Tapered Pyramidal Exhaust Canopy + Horizontal Cylindrical Collector Drum (replaces flat box hood!)
   cone(x,2.44,z,.38,1.42,.46,4,soft,0,Math.PI/4,0);
   cyl(x,2.72,z,.22,1.95,darkAnodized,0,0,Math.PI/2);
   for(const dx of [-.75,0,.75]){
    torus(x+dx,2.72,z,.235,.022,titanium,0,Math.PI/2,0);
   }
   // Flanged spiral dust-extraction duct rising from cylindrical collector drum to overhead header
   cyl(x,3.30,z,.115,1.12,titanium);
   torus(x,2.88,z,.135,.022,safety,Math.PI/2,0,0);
   torus(x,3.72,z,.135,.022,darkAnodized,Math.PI/2,0,0);

   // Stage-Specific Sculpted Dynamic Separation Machinery inside each cell:
   if(i===0){
    // Cell 0: Twin-Drum Rotary Shear & Spoked Cast-Iron Flywheel Crusher
    for(const dx of [-.42,.42]){
     const drum=cyl(x+dx,1.54,z,.24,1.36,dx<0?copper:titanium,Math.PI/2,0,0);
     motion.push({object:drum,type:'spinZ',speed:dx<0?4.5:-4.5,phase:side});
     buildSpokedWheel(x+dx,1.54,z+aisleDir*.74,.30,safety,chrome,0,0,0,dx<0?4.5:-4.5,'spinZ');
    }
   } else if(i===1){
    // Cell 1: Multi-Roller Cleated Cross-Belt Electromagnetic Separator (replaces flat orange box!)
    for(const pz of [-.68,.68]){
     const magDrum=cyl(x,1.76,z+pz,.20,1.12,chrome,0,0,Math.PI/2);
     motion.push({object:magDrum,type:'spinX',speed:3.8,phase:pz});
     torus(x-.58,1.76,z+pz,.21,.028,safety,0,Math.PI/2,0);
     torus(x+.58,1.76,z+pz,.21,.028,safety,0,Math.PI/2,0);
    }
    // Cylindrical electromagnet core & finned oil-cooling radiators
    cyl(x,1.82,z,.22,1.08,robotOrange,Math.PI/2,0,0);
    for(const dx of [-.38,0,.38]){
     torus(x+dx,1.82,z,.24,.025,copper,0,Math.PI/2,0);
    }
    const extractor=cyl(x,1.58,z,.12,.85,ice,0,0,Math.PI/2);
    motion.push({object:extractor,type:'sweepX',baseX:x,amp:0.46,speed:2.8,phase:side});
   } else if(i===2){
    // Cell 2: Twin Conical Stainless Hydro-Cyclone Battery & High-Speed Eddy-Current Rotor
    for(const dx of [-.52,.12]){
     cyl(x+dx,1.98,z,.22,.32,titanium);
     cone(x+dx,1.58,z,.22,.06,.52,14,chrome);
     torus(x+dx,2.12,z,.23,.022,copper,Math.PI/2,0,0);
    }
    const eddyDrum=cyl(x+.68,1.52,z,.24,1.34,copper,Math.PI/2,0,0);
    motion.push({object:eddyDrum,type:'spinZ',speed:6.2,phase:0});
    buildSpokedWheel(x+.68,1.52,z+aisleDir*.74,.26,ice,chrome,0,0,0,6.2,'spinZ');
    buildRoboticArm(x-1.05,0.48,z+aisleDir*.72,aisleDir>0?0.3:-2.8,true,i+side,copper);
   } else if(i===3){
    // Cell 3: Rotating Optical Prism Turrets, Reciprocating Laser Scanner & Tilted XRF Spectrograph
    for(const dx of [-.55,.55]){
     const turret=cyl(x+dx,1.92,z,.18,.26,chrome);
     motion.push({object:turret,type:'spinY',speed:3.6,phase:dx});
    }
    const laserCarriage=cyl(x,1.86,z,.14,1.22,ice,Math.PI/2,0,0);
    motion.push({object:laserCarriage,type:'sweepX',baseX:x,amp:0.72,speed:3.4,phase:side});
    box(x,2.92,z+aisleDir*.48,1.46,.54,.08,darkAnodized);
    const monPlane=new THREE.Mesh(shape(1.36,.44,.015),assayMat);
    monPlane.position.set(x,2.92,z+aisleDir*.530);
    g.add(monPlane);
   } else {
    // Cell 4: Polished Titanium Corona Drum, Ribbed Ceramic HV Insulators & Robotic Sorter
    const coronaRoll=cyl(x-.32,1.58,z,.25,1.36,titanium,Math.PI/2,0,0);
    motion.push({object:coronaRoll,type:'spinZ',speed:4.2,phase:1.2});
    buildSpokedWheel(x-.32,1.58,z+aisleDir*.74,.27,amber,chrome,0,0,0,4.2,'spinZ');
    for(const cz of [-.42,0,.42]){
     cyl(x+.38,1.88,z+cz,.05,.36,cleanWhite);
     for(let r=0;r<3;r++)torus(x+.38,1.76+r*.11,z+cz,.07,.015,ice,Math.PI/2,0,0);
    }
    buildRoboticArm(x+1.02,0.48,z+aisleDir*.72,aisleDir>0?-0.4:2.6,false,i*1.3,culletGlass);
   }

   // Cylindrical Optical NIR / XRF Sensor Barrels under canopy
   for(let n=0;n<3;n++){
    cyl(x-.75+n*.75,2.14,z,.12,.22,darkAnodized);
    const scanner=cyl(x-.75+n*.75,2.02,z,.09,.04,n===1?green:ice);
    motion.push({object:scanner,type:'pulse',base:0.6,amp:0.38,speed:3.2+i*.4+n});
   }

   // Cylindrical Vacuum Material Collection Hopper & Swiveling HMI Pedestal
   const hx=x-1.22,hz=z+aisleDir*.76;
   const matStream=i===0?culletGlass:i===1?copper:i===2?siliconMat:i===3?chrome:culletGlass;
   cyl(hx,.88,hz,.26,.46,titanium);
   cone(hx,.58,hz,.26,.12,.24,14,darkAnodized);
   cyl(hx,1.12,hz,.23,.05,matStream);

   const ex=x+1.25,ez=z+aisleDir*.73;
   cyl(ex,.82,ez,.09,.68,red);
   box(ex,1.22,ez,.32,.26,.08,darkAnodized);
   const hmiPlane=new THREE.Mesh(shape(.28,.20,.012),hmiMat);
   hmiPlane.position.set(ex,1.22,ez+aisleDir*.048);
   g.add(hmiPlane);
   cyl(ex,1.38,ez,.034,.03,safety);
   cyl(ex,1.41,ez,.026,.035,red);

   // Multi-tier beacon stack on sorting canopy
   cyl(x+1.12,2.78,z+aisleDir*.38,.022,.24,chrome);
   cyl(x+1.12,2.92,z+aisleDir*.38,.042,.07,amber);
   const rBeacon=cyl(x+1.12,3.00,z+aisleDir*.38,.042,.08,green);
   motion.push({object:rBeacon,type:'pulse',base:0.55,amp:0.42,speed:2.8+i*.3});
  }

  addPointLight(-7,4.9,-2.2,0xffe9c4,high?2.5:1.1,17);
  addPointLight(0,4.9,0,0xdbf5ff,high?2.7:1.2,18);
  addPointLight(7,4.9,2.2,0xffe9c4,high?2.5:1.1,17);

  addLabel('SORTING & RECOVERY',0,3.58,-depth-.035,3.5,'#e8fff2','DELAMINATION · OPTICAL XRF · ILLUSTRATIVE');
  addLabel('GLASS & SILICON LINE',-6.8,3.45,depth+.02,2.8,'#c8f4ff','CRUSHED CULLET · WAFER RECOVERY',Math.PI);
  addLabel('METALS EXTRACTION',6.8,3.45,depth+.02,2.8,'#ffe6b8','ALUMINUM FRAMES · COPPER RIBBON',Math.PI);
 }

 return {
  revision:POLISH_REVISION,
  update(time){
   for(const m of motion){
    if(m.type==='sweepX'){
     m.object.position.x=m.baseX+Math.sin(time*m.speed+(m.phase||0))*m.amp;
    }else if(m.type==='sweepY'){
     m.object.position.y=m.baseY+Math.sin(time*m.speed+(m.phase||0))*m.amp;
    }else if(m.type==='conveyorX'){
     const offset=((time*m.speed)%m.span+m.span)%m.span;
     const rel=((m.baseX-m.minX+offset)%m.span+m.span)%m.span;
     m.object.position.x=m.minX+rel;
    }else if(m.type==='patrolX'){
     const span=m.maxX-m.minX;
     const cycle=((time*m.speed+(m.phase||0))%(span*2)+span*2)%(span*2);
     if(cycle<=span){
      m.object.position.x=m.minX+cycle;
      m.object.rotation.y=0;
     }else{
      m.object.position.x=m.maxX-(cycle-span);
      m.object.rotation.y=Math.PI;
     }
    }else if(m.type==='robotYaw'){
     m.object.rotation.y=m.baseYaw+Math.sin(time*m.speed+(m.phase||0))*m.amp;
    }else if(m.type==='robotPitch'){
     m.object.rotation.x=m.basePitch+Math.sin(time*m.speed+(m.phase||0))*m.amp;
    }else if(m.type==='spinX'){
     m.object.rotation.x=time*m.speed+(m.phase||0);
    }else if(m.type==='spinY'){
     m.object.rotation.y=time*m.speed+(m.phase||0);
    }else if(m.type==='spinZ'){
     m.object.rotation.z=time*m.speed+(m.phase||0);
    }else if(m.type==='randomBlink'&&m.object.material){
     const w=Math.sin(time*m.f1+m.seed)*Math.cos(time*m.f2-m.seed*1.3)+0.35*Math.sin(time*m.f3+m.seed*2.7);
     m.object.material.emissiveIntensity=w>0.12?m.high:(w<-0.35?m.low:0.45);
    }else if(m.type==='pulse'&&m.object.material){
     m.object.material.emissiveIntensity=m.base+Math.sin(time*m.speed+(m.phase||0))*m.amp;
    }
   }
  },
  dispose(){
   for(const entry of assets){entry.texture.dispose();entry.material.dispose();entry.plane.geometry.dispose();}
   for(const t of textures)t.dispose();
   for(const m of mats)m.dispose();
   for(const v of geos.values())v.dispose();
   for(const l of lights)l.dispose?.();
  }
 };
}
