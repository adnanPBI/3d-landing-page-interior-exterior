/**
 * Extends the existing Free Explore glass panel without modifying the approved
 * header, hero, status card, chapter rail, index.html or styles.css.
 */
import * as THREE from 'three';

export function mountExploreUI(scene, panel){
  if(!scene||!panel)throw Error('Explore UI requires the EnergyScene and panel.');
  const section=document.createElement('section');
  section.className='facility-tools';
  section.innerHTML=[
    '<div class="facility-caption"><span class="facility-pip"></span> FACILITY NAVIGATOR</div>',
    '<label for="facility-picker">Choose a building or infrastructure zone</label>',
    '<select id="facility-picker" aria-label="Choose a building or infrastructure zone"></select>',
    '<p class="facility-description" aria-live="polite"></p>',
    '<div class="facility-actions" data-exterior-actions>',
    '  <button type="button" data-action="focus">Focus exterior</button>',
    '  <button type="button" data-action="enter">Enter interior</button>',
    '</div>',
    '<div class="facility-orbit-tools" data-exterior-orbit>',
    '  <div class="facility-caption" style="margin-top:11px"><span class="facility-pip"></span> 360° ANY-ANGLE MAP ORBIT</div>',
    '  <div class="facility-orbit-grid" role="group" aria-label="360 degree map rotation controls">',
    '    <button type="button" data-ext-hold="q" title="Orbit Left (Q)">↶ Left</button>',
    '    <button type="button" data-ext-hold="r" title="Tilt Up toward 90° Top View (R)">↑ Tilt Up</button>',
    '    <button type="button" data-ext-hold="e" title="Orbit Right (E)">↷ Right</button>',
    '    <button type="button" data-ext-hold="+" title="Zoom In (+)">+ Zoom</button>',
    '    <button type="button" data-ext-hold="f" title="Tilt Down toward Eye-Level Horizon (F)">↓ Horizon</button>',
    '    <button type="button" data-ext-hold="-" title="Zoom Out (-)">− Out</button>',
    '  </div>',
    '  <div class="facility-preset-grid" role="group" aria-label="Camera angle presets">',
    '    <button type="button" data-ext-preset="top">90° Top</button>',
    '    <button type="button" data-ext-preset="horizon">Eye-Level</button>',
    '    <button type="button" data-ext-preset="north">North</button>',
    '    <button type="button" data-ext-preset="south">South</button>',
    '    <button type="button" data-ext-preset="east">East</button>',
    '    <button type="button" data-ext-preset="west">West</button>',
    '    <button type="button" data-ext-turntable aria-pressed="false">⟳ 360° Spin</button>',
    '    <button type="button" data-ext-preset="reset">Reset</button>',
    '  </div>',
    '</div>',
    '<div class="facility-walk" data-walk-panel hidden>',
    '  <div class="facility-inside-title">INTERIOR WALKTHROUGH</div>',
    '  <p>Wheel to glide · Drag to pivot · W A S D / arrows · Esc to exit</p>',
    '  <div class="facility-pivot-bar" role="group" aria-label="Camera pivot mode">',
    '    <button type="button" data-pivot-mode="look" aria-pressed="true">360° Look Pivot</button>',
    '    <button type="button" data-pivot-mode="orbit" aria-pressed="false">Orbit Pivot</button>',
    '    <button type="button" data-action="reset-view" title="Reset interior camera (R)">Reset</button>',
    '  </div>',
    '  <div class="facility-dpad" aria-label="Movement and pivot controls">',
    '    <button type="button" data-walk="q" aria-label="Pivot left" title="Pivot left (Q)">↶</button>',
    '    <button type="button" data-walk="w" aria-label="Move forward" title="Move forward (W)">↑</button>',
    '    <button type="button" data-walk="e" aria-label="Pivot right" title="Pivot right (E)">↷</button>',
    '    <button type="button" data-walk="a" aria-label="Step left" title="Step left (A)">←</button>',
    '    <button type="button" data-walk="s" aria-label="Step backward" title="Step backward (S)">↓</button>',
    '    <button type="button" data-walk="d" aria-label="Step right" title="Step right (D)">→</button>',
    '  </div>',
    '  <button type="button" data-action="exit">Exit to exterior orbit</button>',
    '</div>',
    '<div class="facility-lighting" data-exterior-lighting>',
    '  <span>ATMOSPHERE</span>',
    '  <button type="button" data-mood="day" aria-pressed="true">Daylight</button>',
    '  <button type="button" data-mood="golden" aria-pressed="false">Golden hour</button>',
    '</div>',
    '<div class="facility-note">Drag anywhere on map to rotate 360° · Right-drag or W A S D to pan.</div>'
  ].join('');
  const originalResume=panel.querySelector('#resume');
  panel.insertBefore(section,originalResume);
  panel.classList.add('with-facility-tools');
  const select=section.querySelector('#facility-picker');
  const allFacilities=[...scene.interiors.spaces];
  allFacilities.forEach(space=>{
    const opt=document.createElement('option');
    opt.value=space.id;
    opt.textContent=space.exteriorOnly?(space.label+' (Exterior)'):space.label;
    select.appendChild(opt);
  });
  const description=section.querySelector('.facility-description');
  const walkPanel=section.querySelector('[data-walk-panel]');
  const exteriorActions=section.querySelector('[data-exterior-actions]');
  const enterBtn=section.querySelector('[data-action=enter]');
  const exteriorOrbit=section.querySelector('[data-exterior-orbit]');
  const lightingRow=section.querySelector('[data-exterior-lighting]');
  const pivotButtons=section.querySelectorAll('[data-pivot-mode]');

  // Keep navigation controls exclusively within approved Explore card.
  const orbitDock=null;
  const turntableButtons=()=>section.querySelectorAll('[data-ext-turntable]');
  const syncTurntableUI=()=>{for(const b of turntableButtons())b.setAttribute('aria-pressed',String(!!scene.autoTurntable));};

  const bindExteriorControls=(rootEl)=>{
    for(const button of rootEl.querySelectorAll('[data-ext-hold]')){
      const key=button.dataset.extHold;
      const release=()=>scene.extKeys?.delete(key);
      button.addEventListener('pointerdown',e=>{
        e.preventDefault();button.setPointerCapture?.(e.pointerId);
        scene.extKeys?.add(key);
      });
      button.addEventListener('pointerup',release);
      button.addEventListener('pointercancel',release);
      button.addEventListener('lostpointercapture',release);
      button.addEventListener('blur',release);
      button.addEventListener('click',()=>{
        if(key==='q')scene.orbitExteriorBy?.(0.32,0,1);
        else if(key==='e')scene.orbitExteriorBy?.(-0.32,0,1);
        else if(key==='r')scene.orbitExteriorBy?.(0,-0.22,1);
        else if(key==='f')scene.orbitExteriorBy?.(0,0.22,1);
        else if(key==='+')scene.orbitExteriorBy?.(0,0,0.82);
        else if(key==='-')scene.orbitExteriorBy?.(0,0,1.22);
      });
    }
    for(const button of rootEl.querySelectorAll('[data-ext-preset]')){
      button.addEventListener('click',()=>{
        scene.setExteriorViewPreset?.(button.dataset.extPreset);
        syncTurntableUI();
      });
    }
    for(const button of rootEl.querySelectorAll('[data-ext-turntable]')){
      button.addEventListener('click',()=>{
        scene.toggleAutoTurntable?.();
        syncTurntableUI();
      });
    }
  };
  bindExteriorControls(section);


  const update=()=>{
    const inside=!!scene.interiorMode;
    const activeId=inside?scene.currentInterior:select.value;
    const def=scene.interiors.get(activeId);
    description.textContent=def?.description||'';
    exteriorActions.hidden=inside;
    if(enterBtn)enterBtn.hidden=!!def?.exteriorOnly;
    if(exteriorOrbit)exteriorOrbit.hidden=inside;
    lightingRow.hidden=inside;
    walkPanel.hidden=!inside;

    select.disabled=inside;
    panel.classList.toggle('inside-building',inside);
    pivotButtons.forEach(b=>{
      const isOrbit=b.dataset.pivotMode==='orbit';
      b.setAttribute('aria-pressed',String(isOrbit===!!scene.interiorPivotMode));
    });
    syncTurntableUI();
  };
  select.addEventListener('change',update);
  section.querySelector('[data-action=focus]').addEventListener('click',()=>{scene.focusFacility(select.value);update();});
  section.querySelector('[data-action=enter]').addEventListener('click',()=>{
    const def=scene.interiors.get(select.value);
    if(def&&!def.exteriorOnly){scene.enterInterior(select.value);update();}
  });
  section.querySelector('[data-action=exit]').addEventListener('click',()=>{scene.exitInterior();update();});
  section.querySelector('[data-action=reset-view]').addEventListener('click',()=>{scene.resetInteriorPose?.();update();});
  pivotButtons.forEach(button=>button.addEventListener('click',()=>{
    scene.setInteriorPivotMode?.(button.dataset.pivotMode==='orbit');
    update();
  }));
  section.querySelectorAll('[data-mood]').forEach(button=>button.addEventListener('click',()=>{
    scene.setLightingMode(button.dataset.mood);
    for(const b of section.querySelectorAll('[data-mood]'))b.setAttribute('aria-pressed',String(b===button));
  }));
  for(const button of section.querySelectorAll('[data-walk]')){
    const key=button.dataset.walk;
    const release=()=>scene.setWalkAction(key,false);
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);scene.setWalkAction(key,true);});
    button.addEventListener('pointerup',release);
    button.addEventListener('pointercancel',release);
    button.addEventListener('lostpointercapture',release);
    button.addEventListener('blur',release);
  }
  const stylesheet=document.createElement('link');
  stylesheet.rel='stylesheet';stylesheet.href='/explore-enhancements.css';stylesheet.dataset.convaltExplore='1';
  document.head.appendChild(stylesheet);
  // Clickable WebGL-linked POIs, visible only in exterior exploration.
  const pins=document.createElement('div');pins.className='facility-pin-layer';pins.hidden=true;
  (document.getElementById('app')||document.body).appendChild(pins);
  const vec=new THREE.Vector3(),hotspots=[];
  for(const def of allFacilities){
    const b=document.createElement('button');
    b.type='button';b.className='facility-pin';b.textContent=def.short;
    b.setAttribute('aria-label','Focus '+def.label);
    b.addEventListener('click',()=>{
      select.value=def.id;scene.focusFacility(def.id);update();
    });
    pins.appendChild(b);hotspots.push({def,button:b});
  }
  let lastProjection=0;
  const project=()=>{
    const visible=scene.getExploring()&&!scene.interiorMode;
    pins.hidden=!visible;
    if(!visible)return;
    for(const {def,button} of hotspots){
      vec.set(def.x,def.h+2.1,def.z).project(scene.camera);
      const inView=vec.z>-1&&vec.z<1&&Math.abs(vec.x)<.84&&Math.abs(vec.y)<.80;
      button.hidden=!inView;
      if(inView){
        button.style.left=((vec.x+1)*50)+'%';
        button.style.top=((1-vec.y)*50)+'%';
      }
    }
  };
  scene.onFrame=()=>{
    const now=performance.now();
    if(now-lastProjection>120){lastProjection=now;project();}
  };
  scene.onInteriorChange=()=>{update();project();};
  update();
  return {update,dispose(){
    section.remove();stylesheet.remove();pins.remove();scene.onFrame=null;
    panel.classList.remove('with-facility-tools','inside-building');
    scene.onInteriorChange=null;
  }};
}
