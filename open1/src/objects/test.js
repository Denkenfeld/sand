// Testgelände für Kollisionen: Mauer, Rampe, Felsbrocken (statisch, nicht in der Objektliste).
import * as THREE from 'three';
import { M } from '../core/materials.js';
import { box, sph } from '../core/helpers.js';

export const testCourse = {
  id: 'testCourse',
  label: 'Testgelände',
  category: 'intern',
  params: [],
  build(obj) {
    const clay = M.clay('adobe');
    const steel = M.metal('gray');
    // Mauer quer zur Fahrtrichtung
    obj.add(box(9, 2.6, 0.7, clay, { x: -9, y: 1.3, z: 24, dmg: 0.03, seed: 3 }), { mass: 500, surf: 'clay' });
    // Rampe, steigt in +Z
    obj.add(box(5, 0.3, 9, steel, { x: 11, y: 1.22, z: 14, rx: -0.25, dmg: 0.01 }), { mass: 300, collider: { type: 'box', size: [5, 0.3, 9] } });
    // Felsbrocken
    for (const [x, z, s] of [[-14, 10, 1.3], [-4, 30, 1.8], [5, 34, 1.1]]) {
      obj.add(sph(s, M.clay('dark'), { x, y: s * 0.55, z, sy: 0.8, dmg: 0.2, seed: x }), { mass: 900, surf: 'clay' });
    }
  },
};
