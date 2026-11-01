import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';

// Execute the production placement block, retaining its actual loop coordinates.
const source = readFileSync(process.argv[2] || new URL('../campus.js', import.meta.url), 'utf8');
const panels = [], cabinets = [], pads = [], fences = [], utilityPads = [], equipment = [];
const bounds = (size, center) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(...center), new THREE.Vector3(...size));
const block = source.slice(source.indexOf("  const field=group('photovoltaic-park');"), source.indexOf('  // Shared-axis turbine assembly'));
vm.runInNewContext(block, {
  group: () => ({}),
  solarTable: (_p,x,y,z,w,d,angle) => {
    // Conservative footprint: frame and glass including tilt and frame height.
    panels.push(bounds([w+.08, .23*Math.cos(angle)+d*Math.sin(angle), d*Math.cos(angle)+.23*Math.sin(angle)], [x,y,z]));
  },
  box: (_p,size,p,mat) => {
    const b = bounds(size,p);
    if (size[0]===1.3 && size[1]===1.55) cabinets.push(b);
    if (size[0]===1.55 && size[1]===.14) pads.push(b);
    if (size[0]===2.2 && size[1]===2.6) equipment.push(b);
    return {};
  },
  fenceRun: (_p,a,b) => fences.push({a:new THREE.Vector3(...a), b:new THREE.Vector3(...b)}),
  apron:(_p,w,d,x,z)=>utilityPads.push(bounds([w+.22,1,d+.22],[x,0,z])),
  powerCabinet:(_p,x,y,z,w,d,h)=>equipment.push(bounds([w,h,d],[x,y+h/2,z])),
  mesh:()=>{}, geometry:()=>{},
  m:{white:1,grille:2,concrete:3}
});
assert.equal(cabinets.length,3);
assert.equal(pads.length,3);
assert.equal(utilityPads.length,2);
assert.equal(equipment.length,5);
assert.equal(fences.length,4);
const fenceMinX=Math.min(...fences.flatMap(f=>[f.a.x,f.b.x]));
const fenceMaxX=Math.max(...fences.flatMap(f=>[f.a.x,f.b.x]));
const fenceMinZ=Math.min(...fences.flatMap(f=>[f.a.z,f.b.z]));
const fenceMaxZ=Math.max(...fences.flatMap(f=>[f.a.z,f.b.z]));
const gaps=b=>[b.min.x-fenceMinX,fenceMaxX-b.max.x,b.min.z-fenceMinZ,fenceMaxZ-b.max.z].map(g=>g-.035);
for(const pad of utilityPads) assert.ok(Math.min(...gaps(pad))>=1, 'Utility apron and curb need 1m inside fence');
for(const unit of equipment) assert.ok(Math.min(...gaps(unit))>=1, 'Utility cabinet must remain inside fence with 1m clearance');
const maxPanelX = Math.max(...panels.map(p=>p.max.x));
for (let i=0;i<cabinets.length;i++) {
  const cabinet=cabinets[i], pad=pads[i];
  assert.ok(cabinet.min.x-maxPanelX >= 1, 'Inverter must have at least 1m clearance from PV edge');
  assert.ok(24-cabinet.max.x >= 1, 'Inverter must leave 1m to eastern fence');
  assert.ok(pad.min.y <= -.12+1e-8 && pad.max.y >= cabinet.min.y, 'Inverter pad must touch terrain and cabinet');
  assert.ok(!panels.some(panel=>panel.intersectsBox(cabinet)), 'Cabinet intersects a solar table');
}
const turbines = [...source.matchAll(/windTurbine\(([-\d.]+),([-\d.]+),([-\d.]+)\)/g)];
assert.equal(turbines.length,4);
const [,eastUpperXs,eastUpperZs,eastUpperSs] = turbines[0];
const [,westLowerXs,westLowerZs,westLowerSs] = turbines[1];
const [,westUpperXs,westUpperZs,westUpperSs] = turbines[2];
const [,eastLowerXs,eastLowerZs,eastLowerSs] = turbines[3];

const eastUpperX=+eastUpperXs, eastUpperZ=+eastUpperZs, eastUpperRadius=1.15*(+eastUpperSs);
const westLowerX=+westLowerXs, westLowerZ=+westLowerZs, westLowerRadius=1.15*(+westLowerSs);
const westUpperX=+westUpperXs, westUpperZ=+westUpperZs, westUpperRadius=1.15*(+westUpperSs);
const eastLowerX=+eastLowerXs, eastLowerZ=+eastLowerZs, eastLowerRadius=1.15*(+eastLowerSs);

// User-marked existing turbine: move backward only.
assert.equal(eastUpperX,28,'Existing circled east turbine x must remain unchanged');
assert.equal(eastUpperZ,2,'Existing circled east turbine must move backward to z=2');

// Opposite-side turbines stay untouched.
assert.equal(westLowerX,-34.5,'West lower turbine x must remain unchanged');
assert.equal(westLowerZ,-27,'West lower turbine z must remain unchanged');
assert.equal(westUpperX,-34.5,'West upper turbine x must remain unchanged');
assert.equal(westUpperZ,2,'West upper turbine z must remain unchanged');

// Newly created '+' turbine: outside the eastern fence and parallel to the pair opposite.
assert.equal(eastLowerX,28,'New east turbine must sit outside the solar east fence');
assert.equal(eastLowerZ,-27,'New east turbine must align with opposite west turbine at z=-27');
assert.equal(eastUpperZ,westUpperZ,'Upper east/west turbines must be parallel in z');
assert.equal(eastLowerZ,westLowerZ,'Lower east/west turbines must be parallel in z');

// East-side foundations stay between solar fence x=24 and eastern road curb x=34.475.
for(const [label,x,radius] of [
  ['east-upper',eastUpperX,eastUpperRadius],
  ['east-lower',eastLowerX,eastLowerRadius]
]){
  assert.ok(x-radius-24 >= 2.5, `${label} turbine needs 2.5m+ east-fence clearance`);
  assert.ok(34.475-(x+radius) >= 5, `${label} turbine needs 5m+ west of eastern road curb`);
}

// Moving the existing turbine backward must materially increase separation from office/pond.
assert.ok(Math.hypot(eastUpperX-13,eastUpperZ-18)-eastUpperRadius-8.9 >= 10,
  'Moved existing turbine must stay well clear of reflecting-water garden');

// The new pair needs generous longitudinal separation.
assert.ok(Math.abs(eastUpperZ-eastLowerZ)-eastUpperRadius-eastLowerRadius >= 25,
  'East turbine pair needs 25m+ foundation separation');

// West-side pair remains in its existing service strip.
const westRoadCurb=-37, solarWestFence=-32;
for (const [label,x,radius] of [
  ['west-lower',westLowerX,westLowerRadius],
  ['west-upper',westUpperX,westUpperRadius]
]) {
  assert.ok((x-radius)-westRoadCurb >= 1.25, `${label} turbine needs 1.25m+ clearance from west road curb`);
  assert.ok(solarWestFence-(x+radius) >= 1.25, `${label} turbine needs 1.25m+ clearance from solar west fence`);
}

for(const [,xs,zs,ss] of turbines) {
  const center=new THREE.Vector3(+xs,.02,+zs), radius=1.15*(+ss);
  for (const {a,b} of fences) {
    const closest=new THREE.Line3(a,b).closestPointToPoint(center,true,new THREE.Vector3());
    assert.ok(center.distanceTo(closest)-radius >= .5, 'Turbine foundation intersects fence clearance');
  }
  assert.ok(+xs+radius < 34.475, 'Turbine foundation encroaches on eastern road curb');
}
console.log(JSON.stringify({passed:true,inverters:3,turbines:4,utilityPads:2,utilityEquipment:5,minUtilityPadFenceGap:Math.min(...utilityPads.flatMap(gaps)),minPanelClearanceMeters:cabinets[0].min.x-maxPanelX}));
