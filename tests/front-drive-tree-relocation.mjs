import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(process.argv[2]||new URL('../campus.js',import.meta.url),'utf8');

assert.ok(source.includes("['front-driveway',-5,45.5,27.0,4.2]"),'front driveway must be a no-tree zone');
assert.ok(!source.includes("[-25.8,46.2,2.9]"),'former road-side tree 1 must be removed');
assert.ok(!source.includes("[-20.8,46.2,3.1]"),'former road-side tree 2 must be removed');
assert.ok(!source.includes("[-15.8,46.2,3.0]"),'former road-side tree 3 must be removed');
assert.ok(!source.includes("[-10.8,46.2,3.1]"),'remaining road-side tree must be relocated');
assert.ok(source.includes("[-35.5,34.0,2.9]"),'relocated front-lawn tree 1 missing');
assert.ok(source.includes("[-32.0,31.0,3.1]"),'relocated front-lawn tree 2 missing');
assert.ok(source.includes("[-28.5,28.4,3.0]"),'relocated front-lawn tree 3 missing');
assert.ok(source.includes("[-25.0,25.8,3.1]"),'relocated front-lawn tree 4 missing');
assert.ok(!source.includes("[-23,46,15]"),'front-drive hedge must not remain on pavement');

console.log(JSON.stringify({passed:true,removedTrees:3,relocatedTrees:4,frontDrivewayClear:true}));
