import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(process.argv[2]||new URL('../campus.js',import.meta.url),'utf8');

assert.ok(source.includes("['front-approach-clear-zone',-3.5,22.0,10.5,5.5]"),'front approach clear zone must exist');
for (const point of ["[-5,21]","[-10,22]","[3,22]"]) {
  assert.ok(!source.includes(point),`explicit front-approach tree must stay removed: ${point}`);
}
assert.ok(source.includes("if(treeHitsHardscape(x,z))return null;\n    const y=groundY(x,z),g=group('ornamental-tree'"),'ornamental trees must honor clear zones');
assert.ok(source.includes("Keep the user-marked front approach completely clear of trees."),'front approach intent must remain documented');

console.log(JSON.stringify({passed:true,removedExplicitTrees:3,frontApproachClearZone:true}));
