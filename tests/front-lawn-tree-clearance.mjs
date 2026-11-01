import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(process.argv[2]||new URL('../campus.js',import.meta.url),'utf8');

assert.ok(source.includes("['front-lawn-clear-zone',-30.0,31.0,10.5,10.5]"),'front-lawn clear zone must exist');
for (const point of [
  "[-35.5,34.0,2.9]",
  "[-32.0,31.0,3.1]",
  "[-28.5,28.4,3.0]",
  "[-25.0,25.8,3.1]"
]) assert.ok(!source.includes(point),`removed front-lawn tree must stay absent: ${point}`);
assert.ok(source.includes("Only ornamental trees outside that zone remain."),'clear-zone intent must stay documented');

console.log(JSON.stringify({passed:true,removedExplicitTrees:4,frontLawnClearZone:true}));
