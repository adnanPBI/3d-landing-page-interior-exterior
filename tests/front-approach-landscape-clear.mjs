import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(process.argv[2]||new URL('../campus.js',import.meta.url),'utf8');

assert.ok(!source.includes("planter(-15.8,26.0,23,.96,16)"),'front road-side planter must be removed');
assert.ok(!source.includes("[-8,24,18]"),'front road-side hedge must be removed');
assert.ok(source.includes("if(treeHitsHardscape(x,z))return null;\n    const y=groundY(x,z);box(planting,[w,.16,d]"),'planter() must honor exclusion zones');
assert.ok(source.includes("Front approach intentionally clear"),'front approach clear intent must remain documented');

console.log(JSON.stringify({passed:true,frontPlanterRemoved:true,frontHedgeRemoved:true,planterHonorsClearZones:true}));
