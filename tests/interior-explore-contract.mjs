import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const gitBlob=txt=>createHash('sha1').update('blob '+Buffer.byteLength(txt)+'\0').update(txt).digest('hex');
const campus=read('campus.js'),index=read('index.html'),css=read('styles.css');
const interiors=read('campus-interiors.js'),scene=read('scene.js'),app=read('app.js');
const explore=read('explore-ui.js'),styles=read('explore-enhancements.css');

assert.equal(gitBlob(campus),'7bcd4ea716879d3525a272eb8a6812dd63f0affa','Approved campus geometry must remain byte-identical.');
assert.equal(gitBlob(index),'f7c5baa8bbcc856dd776aebd4776847c2c4f02fd','Approved HTML must remain byte-identical.');
assert.equal(gitBlob(css),'e75303165de4674aa9bdd4fd5a9ccc4a8e8115ff','Approved exterior stylesheet must remain byte-identical.');

const expected=[
  ['manufacturing',-16,35,34,18,7],
  ['compute-01',11,-45,29,9,6.4],
  ['compute-02',11,-58,29,9,6.4],
  ['compute-03',11,-71,29,9,6.4],
  ['recycling',-12,-89,27,17,6.8]
];
for(const [id,x,z,w,d,h] of expected){
  assert.ok(interiors.includes("id:'"+id+"'"),id+' entry missing');
  assert.ok(interiors.includes('x:'+x+',z:'+z+',w:'+w+',d:'+d+',h:'+h),id+' hall geometry differs from the original.');
}
assert.ok(interiors.includes("entrance:[0,0]"),'Manufacturing entry must be in the clear central aisle.');
assert.ok(interiors.includes("entrance:[-1.8,0]"),'Recycling entry must be in the clear central aisle.');
assert.ok(interiors.includes('function withinInterior')||interiors.includes('export function withinInterior'),'Interior wall/collision contract missing.');
assert.ok(interiors.includes('register(zone,'),'Interior equipment must register collision footprints.');
assert.ok(interiors.includes('setActive(id)'),'Interior isolation/visibility contract missing.');
assert.ok(interiors.includes('canMove(id,x,z)'),'Movement constraints missing.');
assert.ok(scene.includes('createCampusInteriors(this.scene'),'Real Three.js interior builder not connected.');
assert.ok(scene.includes('enterInterior(id)')&&scene.includes('exitInterior()'),'Enter/exit camera lifecycle missing.');
assert.ok(scene.includes('updateInteriorWalk(dt)'),'Interactive walk camera must exist.');
assert.ok(scene.includes('enablePan=true'),'Bouned free navigation missing.');
assert.ok(scene.includes('updateExteriorNavigation(dt)'),'Campus navigation bounds missing.');
assert.ok(scene.includes('setLightingMode(mode)'),'Optional premium exterior mood missing.');
assert.ok(app.includes('mountExploreUI(scene, explorePanel)'),'Explore controls must be mounted.');
assert.ok(explore.includes("data-action=\"enter\""),'Enter interior button missing.');
assert.ok(explore.includes("data-action=\"exit\""),'Exit interior button missing.');
assert.ok(styles.includes('.facility-dpad'),'Mobile controls should be styled.');

console.log(JSON.stringify({
  status:'PASS',protectedExterior:{campus:gitBlob(campus),html:gitBlob(index),css:gitBlob(css)},
  interiors:expected.map(item=>item[0]),navigation:'orbit+bounded-pan+walk+exit',
  limitation:'This source contract is not a rendered WebGL browser check.'
},null,2));
