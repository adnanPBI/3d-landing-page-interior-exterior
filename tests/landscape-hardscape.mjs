import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(process.argv[2]||new URL('../campus.js',import.meta.url),'utf8');
const start=source.indexOf("  const treeHardscapeZones=");
const end=source.indexOf("  function tree(",start);
assert.ok(start>=0&&end>start,'tree hardscape helper must exist');

const helper=source.slice(start,end).replace(/^  /gm,'');
const context={};
vm.runInNewContext(helper+"\nglobalThis.out={treeHardscapeZones,treeHitsHardscape};",context);
const {treeHardscapeZones,treeHitsHardscape}=context.out;

assert.equal(treeHardscapeZones.length,5);
for(const [name,x,z] of [
  ['manufacturing-apron',-16,35],
  ['lobby-apron',9,34],
  ['east-service-apron',24,35],
  ['north-loading-court',-13,53],
  ['west-service-apron',-26,-27]
]){
  assert.ok(treeHitsHardscape(x,z),`${name} center must reject trees`);
}
assert.equal(treeHitsHardscape(0,10),false,'open lawn must remain plantable');
assert.ok(source.includes("if(treeHitsHardscape(x,z))return null;"),'tree() must enforce hardscape rejection');
assert.ok(!source.includes("planter(20.8,34.0,.96,7.0,6,'z')"),'east service apron must not contain the removed planter row');
assert.ok(source.includes("East service apron intentionally left clear"),'east service apron clearance intent must remain documented');

console.log(JSON.stringify({passed:true,zones:treeHardscapeZones.map(z=>z[0]),openLawn:[0,10],eastServiceApronPlanter:false}));
