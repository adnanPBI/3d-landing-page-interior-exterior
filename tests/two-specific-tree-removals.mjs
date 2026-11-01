import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(process.argv[2]||new URL('../campus.js',import.meta.url),'utf8');

assert.ok(
  source.includes("['ev-service-front-tree',22.87,43.79,1.8]"),
  'tree #1 must be removed at the screenshot-mapped EV/service-front world location'
);
assert.ok(
  source.includes("['pond-rear-tree',25.00,12.00,1.8]"),
  'tree #2 must be removed at the screenshot-mapped pond-rear world location'
);
assert.ok(
  source.includes("if(Math.hypot(child.position.x-cx,child.position.z-cz)<=r)"),
  'marked tree removal must operate on actual generated tree world positions'
);
assert.ok(!source.includes('[25,12]'),'explicit pond-rear tree placement must stay absent');

for(const turbine of [
  'windTurbine(28,2,1.05);',
  'windTurbine(-34.5,-27,.96);',
  'windTurbine(-34.5,2,.9);',
  'windTurbine(28,-27,.96);'
]){
  assert.ok(source.includes(turbine),`windmill changed unexpectedly: ${turbine}`);
}

console.log(JSON.stringify({
  passed:true,
  mappedRemovalZones:[
    {label:1,center:[22.87,43.79],radius:1.8},
    {label:2,center:[25,12],radius:1.8}
  ],
  windmillsUnchanged:true
}));
