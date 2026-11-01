import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createFenceSegment } from '../campus-fence.js';

// Read the production fence endpoints so this test cannot drift from the site.
const source = readFileSync(new URL('../campus.js', import.meta.url),'utf8');
const runs = [...source.matchAll(/fenceRun\(field,\[([^\]]+)\],\[([^\]]+)\],1\.28\)/g)];
assert.equal(runs.length,4);
const corners = runs.map(r=>r[1].split(',').map(Number));
for(let i=0;i<runs.length;i++) assert.deepEqual(runs[i][2].split(',').map(Number),corners[(i+1)%corners.length], 'Fence must close without gaps');
const material = new THREE.MeshStandardMaterial();
const root = new THREE.Group();
let vertices = 0, triangles = 0;
for (let i = 0; i < corners.length; i++) {
  const a = new THREE.Vector3(...corners[i]);
  const b = new THREE.Vector3(...corners[(i + 1) % corners.length]);
  const direction = b.clone().sub(a).normalize();
  const normal = new THREE.Vector3(-direction.z, 0, direction.x);
  const length = a.distanceTo(b);
  const fence = createFenceSegment(root, a.toArray(), b.toArray(), 1.28, material);
  root.updateMatrixWorld(true);
  fence.traverse(mesh => {
    if (!mesh.isMesh) return;
    assert.equal(mesh.geometry.type, 'BoxGeometry', 'No opaque fence plane');
    assert.equal(mesh.castShadow, false, 'Fine wire grid must not cast stripe shadows');
    const position = mesh.geometry.attributes.position;
    for (let n = 0; n < position.count; n++) {
      const world = new THREE.Vector3().fromBufferAttribute(position, n).applyMatrix4(mesh.matrixWorld);
      const offset = world.clone().sub(a);
      assert.ok(Math.abs(offset.dot(normal)) <= .035001, 'Fence escaped its 7cm boundary corridor');
      assert.ok(offset.dot(direction) >= -.035001 && offset.dot(direction) <= length + .035001);
      assert.ok(world.y >= .019999 && world.y <= 1.300001);
      vertices++;
    }
    triangles += mesh.geometry.index.count / 3;
  });
  // Shoot through an open cell to catch solid infill even if correctly aligned.
  const cell = new THREE.Vector3(-length / 2 + .11, .29, 0).applyMatrix4(fence.matrixWorld);
  const ray = new THREE.Raycaster(cell.clone().addScaledVector(normal, 1), normal.clone().negate(), 0, 2);
  assert.equal(ray.intersectObject(fence, true).length, 0, 'Fence cell must be open');
}
assert.ok(triangles < 8000, 'Four fence runs must remain inexpensive');
console.log(JSON.stringify({ passed: true, segments: 4, vertices, triangles, corridorMeters: .07 }));
