/**
 * Extends the existing Free Explore glass panel without modifying the approved
 * header, hero, status card, chapter rail, index.html or styles.css.
 */
export function mountExploreUI(scene, panel){
  if(!scene||!panel)throw Error('Explore UI requires the EnergyScene and panel.');
  const section=document.createElement('section');
  section.className='facility-tools';
  section.innerHTML=[
    '<div class="facility-caption"><span class="facility-pip"></span> FACILITY NAVIGATOR</div>',
    '<label for="facility-picker">Choose an existing building</label>',
    '<select id="facility-picker" aria-label="Choose an existing building"></select>',
    '<p class="facility-description" aria-live="polite"></p>',
    '<div class="facility-actions" data-exterior-actions>',
    '  <button type="button" data-action="focus">Focus exterior</button>',
    '  <button type="button" data-action="enter">Enter interior</button>',
    '</div>',
    '<div class="facility-walk" data-walk-panel hidden>',
    '  <div class="facility-inside-title">INTERIOR WALKTHROUGH</div>',
    '  <p>W A S D / arrows to walk · Drag to look · Esc to exit</p>',
    '  <div class="facility-dpad" aria-label="Movement controls">',
    '    <span></span><button type="button" data-walk="w" aria-label="Move forward">↑</button><span></span>',
    '    <button type="button" data-walk="a" aria-label="Step left">←</button>',
    '    <button type="button" data-walk="s" aria-label="Step backward">↓</button>',
    '    <button type="button" data-walk="d" aria-label="Step right">→</button>',
    '  </div>',
    '  <button type="button" data-action="exit">Exit to exterior orbit</button>',
    '</div>',
    '<div class="facility-lighting" data-exterior-lighting>',
    '  <span>ATMOSPHERE</span>',
    '  <button type="button" data-mood="day" aria-pressed="true">Daylight</button>',
    '  <button type="button" data-mood="golden" aria-pressed="false">Golden hour</button>',
    '</div>',
    '<div class="facility-note">Illustrative interiors. No live facility telemetry.</div>'
  ].join('');
  const originalResume=panel.querySelector('#resume');
  panel.insertBefore(section,originalResume);
  panel.classList.add('with-facility-tools');
  const select=section.querySelector('#facility-picker');
  scene.interiors.spaces.forEach(space=>{
    const opt=document.createElement('option');opt.value=space.id;opt.textContent=space.label;select.appendChild(opt);
  });
  const description=section.querySelector('.facility-description');
  const walkPanel=section.querySelector('[data-walk-panel]');
  const exteriorActions=section.querySelector('[data-exterior-actions]');
  const lightingRow=section.querySelector('[data-exterior-lighting]');
  const update=()=>{
    const inside=!!scene.interiorMode;
    const def=scene.interiors.get(inside?scene.currentInterior:select.value);
    description.textContent=def?.description||'';
    exteriorActions.hidden=inside;
    lightingRow.hidden=inside;
    walkPanel.hidden=!inside;
    select.disabled=inside;
    panel.classList.toggle('inside-building',inside);
  };
  select.addEventListener('change',update);
  section.querySelector('[data-action=focus]').addEventListener('click',()=>{scene.focusFacility(select.value);update();});
  section.querySelector('[data-action=enter]').addEventListener('click',()=>{scene.enterInterior(select.value);update();});
  section.querySelector('[data-action=exit]').addEventListener('click',()=>{scene.exitInterior();update();});
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
  scene.onInteriorChange=update;
  update();
  return {update,dispose(){section.remove();stylesheet.remove();panel.classList.remove('with-facility-tools','inside-building');if(scene.onInteriorChange===update)scene.onInteriorChange=null;}};
}
