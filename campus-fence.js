import * as THREE from 'three';

// Every element stays in the segment's local XY plane. A grille-textured plane
// rotated around Y used to project a solid wall across the lawn and road.
export function createFenceSegment(parent, a, b, height, material) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const delta = end.clone().sub(start);
  const length = delta.length();
  if (!Number.isFinite(length) || length <= 0 || !Number.isFinite(height) || height <= .3) {
    throw new Error('Fence needs distinct finite endpoints and height above 0.3m.');
  }
  const fence = new THREE.Group();
  fence.name = 'fence-segment';
  fence.position.copy(start).add(end).multiplyScalar(.5);
  fence.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), delta.normalize());
  parent.add(fence);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const bar = (w, h, d, x, y) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 0);
    mesh.scale.set(w, h, d);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    fence.add(mesh);
  };
  // Even spacing includes both corner posts; open cells are real empty space.
  const bays = Math.ceil(length / 2.25);
  for (let i = 0; i <= bays; i++) bar(.07, height, .07, -length / 2 + length * i / bays, height / 2);
  for (const y of [.18, height * .52, height - .15]) bar(length, .045, .04, 0, y);
  const wires = Math.ceil(length / .4);
  for (let i = 1; i < wires; i++) bar(.012, height - .3, .012, -length / 2 + length * i / wires, height / 2);
  for (let y = .38; y < height - .2; y += .2) {
    if (Math.abs(y - height * .52) > .03) bar(length, .012, .012, 0, y);
  }
  return fence;
}
