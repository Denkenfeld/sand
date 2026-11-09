import * as THREE from 'three';
import { sampleWave } from '../util/waves.js';
import { makeWaterAware } from '../util/waterMaterial.js';
import { makeWoodTexture, makeRustTexture, makeFrondTexture, mulberry32 } from '../util/textures.js';

/**
 * Drifting flotsam (planks, barrels, crates, bottles, palm fronds, coconuts) that streams
 * past the raft with the current. Items ride the real Gerstner surface (bob + tilt).
 *
 * This is the hook for the future gameplay loop: every item has `kind` and `collectable`,
 * so a hook/net tool can later call `debris.pickup(item)` to hand resources to the inventory.
 */
export class Debris {
  constructor(scene, raft) {
    this.raft = raft;
    this.rnd = mulberry32(77);
    const wood = makeWoodTexture(3), rust = makeRustTexture(8);
    const wa = (o, w = { wet: true }) => makeWaterAware(new THREE.MeshStandardMaterial(o), w);
    const woodM = wa({ map: wood, roughness: 0.8 }), rustM = wa({ map: rust, metalness: 0.4, roughness: 0.6 });
    const frondM = wa({ map: makeFrondTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 }, { wet: false, caustics: false });
    const cocoM = wa({ color: 0x9a6a3c, roughness: 0.95 }), botM = wa({ color: 0x9fd6ee, transparent: true, opacity: 0.75, roughness: 0.15 }, { caustics: false, wet: false });
    const plastic = wa({ color: 0xd8402e, roughness: 0.5 });

    const frond = new THREE.PlaneGeometry(0.6, 1.6, 2, 6).rotateX(-Math.PI / 2);
    this.kinds = [
      { kind: 'plank', mk: () => new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, R(this.rnd, 1.1, 2.2)), woodM), draft: 0.0 },
      { kind: 'log', mk: () => new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, R(this.rnd, 1.4, 2.6), 8).rotateX(Math.PI / 2), woodM), draft: 0.04 },
      { kind: 'barrel', mk: () => new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.9, 14).rotateX(Math.PI / 2), rustM), draft: 0.05 },
      { kind: 'crate', mk: () => new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.5), woodM), draft: 0.08 },
      { kind: 'frond', mk: () => new THREE.Mesh(frond, frondM), draft: 0.0 },
      { kind: 'coconut', mk: () => new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), cocoM), draft: 0.05 },
      { kind: 'bottle', mk: () => new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 8).rotateZ(Math.PI / 2), botM), draft: 0.03 },
      { kind: 'trash', mk: () => new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.22), plastic), draft: 0.0 },
    ];
    this.items = [];
    const n = 11;
    for (let i = 0; i < n; i++) this.items.push(this._spawn(true));
    this._tmp = new THREE.Vector3();
  }

  _spawn(initial) {
    const rnd = this.rnd, k = this.kinds[Math.floor(rnd() * this.kinds.length)];
    const mesh = k.mk(); mesh.castShadow = true; mesh.receiveShadow = true;
    // upstream of the drift (the raft moves along +drift, so flotsam arrives from the -drift side)
    const d = this.raft.drift.clone().normalize(), side = new THREE.Vector2(-d.y, d.x);
    const dist = initial ? 8 + rnd() * 90 : 85 + rnd() * 25;
    const lateral = (rnd() - 0.5) * (rnd() < 0.4 ? 8 : 50);         // 40 %: passes close to the raft
    const pos = new THREE.Vector2().copy(d).multiplyScalar(dist).add(side.multiplyScalar(lateral));
    const item = { mesh, kind: k.kind, draft: k.draft, collectable: true, x: pos.x, z: pos.y, spin: (rnd() - 0.5) * 0.15, yaw: rnd() * 6.28, ph: rnd() * 6, own: new THREE.Vector2((rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.12) };
    mesh.rotation.set(0, item.yaw, 0);
    this.raft.root.parent.add(mesh);
    return item;
  }

  update(dt, t, game) {
    const rel = this.raft.drift;
    const e = this._e ??= new THREE.Euler(0, 0, 0, 'YXZ');
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      // relative motion: the raft drifts along +drift, so the scene's flotsam slides the other way
      it.x += (-rel.x + it.own.x) * dt; it.z += (-rel.y + it.own.y) * dt;
      it.yaw += it.spin * dt;
      const w = sampleWave(it.x, it.z, t);
      const nx = w.nx, nz = w.nz, ny = Math.max(w.ny, 0.3);
      e.set(Math.atan2(nz, ny) * 0.9, it.yaw, -Math.atan2(nx, ny) * 0.9);
      it.mesh.position.set(it.x, w.height - it.draft, it.z);
      it.mesh.rotation.copy(e);
      // recycle: far behind us or too far away
      if (Math.hypot(it.x, it.z) > 120 && it.x * rel.x + it.z * rel.y > 0) {
        it.mesh.parent?.remove(it.mesh); it.mesh.geometry.dispose?.();
        this.items[i] = this._spawn(false);
      }
    }
  }

  /** Future gameplay hook: remove an item from the world and return its kind. */
  pickup(item) { item.mesh.parent?.remove(item.mesh); this.items.splice(this.items.indexOf(item), 1); this.items.push(this._spawn(false)); return item.kind; }
}

function R(rnd, a, b) { return a + (b - a) * rnd(); }
