import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(process.argv[2]||new URL('../campus.js',import.meta.url),'utf8');

assert.ok(source.includes("['east-service-south-tree-clear-zone',24.5,20.0,2.5,5.0]"),
  'east service south clear zone must exist');
assert.ok(!source.includes('[24,23]'),'first marked tree must be removed');
assert.ok(!source.includes('[25,17]'),'second marked tree must be removed');
assert.ok(source.includes('[25,12]'),'third east-side tree must remain unchanged');
assert.ok(source.includes('windTurbine(28,2,1.05)'),'existing circled turbine must be moved backward');
assert.ok(source.includes('windTurbine(28,-27,.96)'),'new plus-marked turbine must exist');

console.log(JSON.stringify({
  passed:true,
  removedTrees:[[24,23],[25,17]],
  preservedTree:[25,12],
  movedExistingTurbine:[28,2],
  newTurbine:[28,-27]
}));
