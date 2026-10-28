// Modell-Cache für Spiel-Einheiten: jedes Modell wird einmal gebaut, animierte Teile erkannt, der Rest zu wenigen
// Meshes verschmolzen; danach entstehen Einheiten billig als Klone (gemeinsame Geometrie und Materialien).
import * as THREE from 'three';
import { createObject } from '../core/forge.js';
import { OBJECTS } from '../objects/index.js';
import { probeAndMerge } from '../gallery/index.js';
import { skitter } from './aliens.js';

const DEFS = { warrior: OBJECTS.warrior, wanderer: OBJECTS.wanderer, utilityDroid: OBJECTS.utilityDroid, skitter };

export const registerModel = (id, def) => { DEFS[id] = def; };

export class ModelCache {
  // compile(root): optional, übersetzt die Shader eines neuen Modells im Hintergrund (vermeidet Ruckler beim ersten Auftauchen)
  constructor(compile = null) { this.tpl = new Map(); this.compile = compile; }

  template(model, params = {}) {
    const key = model + JSON.stringify(params);
    let t = this.tpl.get(key);
    if (t) return t;
    const def = DEFS[model];
    if (!def) throw new Error(`Unbekanntes Modell „${model}“`);
    const obj = createObject(def, params);
    obj.state = 'active';
    for (const l of obj.lights) l.light.removeFromParent();
    obj.lights.length = 0;
    obj.character = { speedNow: 0, grounded: true, attack: 0, ...(obj.character ?? {}) };
    const run = (sp, atk, n) => (check) => {
      obj.character.speedNow = sp; obj.character.attack = atk;
      for (let i = 0; i < n; i++) { obj.time += 0.05; def.onFrame?.(obj, 0.05, null); check(); }
    };
    const info = probeAndMerge(obj.root, [run(0, 0, 12), run(3, 0, 40), run(6, 0, 30), run(0, 1, 6), run(0, 0, 6)]);
    obj.character.speedNow = 0; obj.character.attack = 0;
    t = { def, params, obj, info, height: obj.character.height ?? 1.8, radius: obj.character.radius ?? 0.35 };
    this.tpl.set(key, t);
    try { this.compile?.(obj.root); } catch (e) { /* ohne Vorübersetzung weiter */ }
    return t;
  }

  // Neue Instanz: { root, update(dt, speed, attack), height, radius }
  spawn(model, params = {}, scale = 1) {
    const t = this.template(model, params);
    const src = t.obj;
    const root = src.root.clone(true);
    const a = [], b = [];
    src.root.traverse((o) => a.push(o));
    root.traverse((o) => b.push(o));
    const map = new Map(a.map((o, i) => [o, b[i]]));
    const rebind = (v) => (v && v.isObject3D ? map.get(v) ?? v : Array.isArray(v) ? v.map(rebind) : v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rebind(x)])) : v);
    const anim = rebind(src.anim);
    if (typeof anim.phase === 'number') anim.phase = Math.random() * 6;
    const inst = {
      def: t.def, root, anim, time: Math.random() * 10, state: 'active', params: t.params,
      character: { speedNow: 0, grounded: true, attack: 0 },
      height: t.height * scale, radius: t.radius * scale, scale,
      update(dt, speed = 0, attack = 0) {
        this.time += dt;
        this.character.speedNow = speed / scale; // Beinschwung am Modellmaßstab messen
        this.character.attack = attack;
        t.def.onFrame?.(this, dt, null);
      },
    };
    root.scale.setScalar(scale);
    return inst;
  }
}
