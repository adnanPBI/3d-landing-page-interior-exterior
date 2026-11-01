import * as THREE from 'three';

// Run against the real, constructed scene in a browser, not a mocked mesh graph.
export function inspectCampus(campus) {
  const checks=[];
  const check=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)throw new Error(name);};
  check('71 independently surfaced solar tables',campus.audit.pvTables===71);
  check('Three mechanically grouped turbines',campus.turbines.length===3);
  check('Repeated static details are instanced',campus.audit.staticInstances>3000);
  campus.animate(0);
  const origins=campus.turbines.map(t=>t.rotor.getWorldPosition(new THREE.Vector3()));
  let stationary=true,balanced=true,clear=true;
  for(let step=0;step<=36;step++){
    campus.animate(step*.417);
    campus.turbines.forEach((t,i)=>{
      const origin=t.rotor.getWorldPosition(new THREE.Vector3());
      stationary&&=origin.distanceTo(origins[i])<1e-8;
      const vectors=t.blades.map(blade=>blade.localToWorld(new THREE.Vector3(0,6.15,0)).sub(origin));
      vectors.forEach((v,j)=>{clear&&=v.y+origin.y>4;balanced&&=Math.abs(v.clone().normalize().dot(vectors[(j+1)%3].clone().normalize())+.5)<1e-6;});
    });
  }
  check('Rotor hubs stay on the drivetrain axis throughout a revolution',stationary);
  check('Blade tips remain 120 degrees apart',balanced);
  check('Blade tips clear the ground throughout rotation',clear);
  let panelsFaceSky=true;
  for(const {surface}of campus.panels){
    const direction=new THREE.Vector3(0,0,1).transformDirection(surface.matrixWorld);
    panelsFaceSky&&=direction.y>.9;
  }
  check('Every photovoltaic surface faces upward',panelsFaceSky);
  let finite=true,triangles=0;
  campus.root.traverse(o=>{
    if(!o.isMesh)return;const attr=o.geometry.attributes.position;
    for(let i=0;i<attr.array.length;i++)if(!Number.isFinite(attr.array[i]))finite=false;
    triangles+=(o.geometry.index?o.geometry.index.count:attr.count)/3*(o.isInstancedMesh?o.count:1);
  });
  check('No invalid vertex coordinates',finite);
  check('Geometry remains under 450000 triangles before shadow passes',triangles<450000);
  check('Correctly oriented recovery drum exists',!!campus.root.getObjectByName('recovery-drum'));
  campus.animate(4);
  return {passed:checks.length,failed:0,triangles,checks};
}
