// Physik: cannon-es Welt, Materialpaare (Reifen haften, Blech rutscht), Arena-Wand, Collider-Anzeige.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ARENA } from './atmosphere.js';

export const SURF = {
  ground: { f: 0.9, r: 0.02 },
  metal: { f: 0.45, r: 0.12 },
  clay: { f: 0.75, r: 0.03 },
  wood: { f: 0.6, r: 0.1 },
  rubber: { f: 1.4, r: 0.15 },
  cloth: { f: 0.9, r: 0.0 },
  body: { f: 0.0, r: 0.0 }, // Figuren: Bewegung und Bremsen steuert die Figur selbst, Kontaktreibung würde nur dagegenarbeiten
};

export class Physics {
  constructor() {
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true;
    world.solver.iterations = 14;
    world.defaultContactMaterial.friction = 0.5;
    world.defaultContactMaterial.restitution = 0.05;
    this.world = world;
    this.paused = false;
    this.timeScale = 1;
    this.gravity = 9.82;

    this.mats = {};
    for (const k of Object.keys(SURF)) this.mats[k] = new CANNON.Material(k);
    const names = Object.keys(SURF);
    for (let i = 0; i < names.length; i++) {
      for (let j = i; j < names.length; j++) {
        const a = SURF[names[i]], b = SURF[names[j]];
        world.addContactMaterial(
          new CANNON.ContactMaterial(this.mats[names[i]], this.mats[names[j]], {
            friction: Math.sqrt(a.f * b.f),
            restitution: Math.max(a.r, b.r),
            contactEquationStiffness: 1e8,
            contactEquationRelaxation: 3,
          })
        );
      }
    }

    const ground = new CANNON.Body({ mass: 0, material: this.mats.ground, shape: new CANNON.Plane() });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    ground.updateAABB(); // sonst bleibt die Plane-Box auf der unrotierten Lage stehen und Rays (Räder, Figuren) treffen den Boden nicht
    world.addBody(ground);
    this.groundBody = ground;

    // unsichtbare Arena-Wand, damit nichts in die Dünen fährt
    const wall = new CANNON.Body({ mass: 0, material: this.mats.metal });
    const n = 40, R = ARENA + 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const q = new CANNON.Quaternion();
      q.setFromEuler(0, a + Math.PI / 2, 0); // lange Achse (Z) tangential
      wall.addShape(new CANNON.Box(new CANNON.Vec3(1.2, 6, (Math.PI * 2 * R) / n / 2 + 0.3)), new CANNON.Vec3(Math.sin(a) * R + Math.sin(a) * 1.2, 6, Math.cos(a) * R + Math.cos(a) * 1.2), q);
    }
    world.addBody(wall);
    this.wallBody = wall;
  }

  // Arena-Wand der Werkstatt ein-/ausschalten (die Stadt ist größer als die Werkstatt-Arena)
  setWall(on) {
    const has = this.world.bodies.includes(this.wallBody);
    if (on && !has) this.world.addBody(this.wallBody);
    else if (!on && has) this.world.removeBody(this.wallBody);
  }

  setGravity(g) {
    this.gravity = g;
    this.world.gravity.set(0, -g, 0);
  }

  step(dt) {
    if (this.paused) return;
    this.world.step(1 / 60, Math.min(dt, 0.1) * this.timeScale, 5);
  }
  add(b) { b.updateAABB(); this.world.addBody(b); }
  remove(b) { this.world.removeBody(b); }
}

// Sichtbare Collider (grüne Gitter) – zeigt, was die Physik wirklich "sieht"
export class ColliderDebug {
  constructor(scene, physics) {
    this.physics = physics;
    this.group = new THREE.Group();
    this.group.renderOrder = 999;
    this.group.visible = false;
    scene.add(this.group);
    this.map = new Map();
    this.mat = new THREE.MeshBasicMaterial({ color: 0x45ffa8, wireframe: true, transparent: true, opacity: 0.7, depthTest: false });
  }
  get visible() { return this.group.visible; }
  set visible(v) {
    this.group.visible = v;
    if (!v) this.clear();
  }
  clear() {
    for (const g of this.map.values()) this.group.remove(g);
    this.map.clear();
  }
  _shapeMesh(shape) {
    let geo = null;
    if (shape instanceof CANNON.Box) geo = new THREE.BoxGeometry(shape.halfExtents.x * 2, shape.halfExtents.y * 2, shape.halfExtents.z * 2);
    else if (shape instanceof CANNON.Sphere) geo = new THREE.SphereGeometry(shape.radius, 10, 8);
    else if (shape instanceof CANNON.Cylinder) {
      const rt = shape.radiusTop ?? shape.radius ?? 0.5, rb = shape.radiusBottom ?? rt, h = shape.height ?? 1;
      geo = new THREE.CylinderGeometry(rt, rb, h, 12);
    } else return null;
    const m = new THREE.Mesh(geo, this.mat);
    m.renderOrder = 999;
    return m;
  }
  update() {
    if (!this.group.visible) return;
    const w = this.physics.world;
    for (const b of w.bodies) {
      if (b === this.physics.groundBody || b === this.physics.wallBody) continue;
      let g = this.map.get(b);
      if (!g) {
        g = new THREE.Group();
        for (let i = 0; i < b.shapes.length; i++) {
          const m = this._shapeMesh(b.shapes[i]);
          if (!m) continue;
          m.position.copy(b.shapeOffsets[i]);
          m.quaternion.copy(b.shapeOrientations[i]);
          g.add(m);
        }
        this.group.add(g);
        this.map.set(b, g);
      }
      g.position.copy(b.position);
      g.quaternion.copy(b.quaternion);
    }
    for (const [b, g] of this.map) {
      if (b.world !== w) {
        this.group.remove(g);
        this.map.delete(b);
      }
    }
  }
}
