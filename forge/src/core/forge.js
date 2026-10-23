// ForgeObject: ein Spielobjekt aus Teilen (Parts). Kann sich aufbauen, explodieren, zurücksetzen
// und bekommt automatisch Collider. Physik-Modi: static | rigid | vehicle | hover | character
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { localBounds, projectUV } from './helpers.js';
import { audio } from './audio.js';

export const env = { scene: null, physics: null, fx: null };

const rnd = (a, b) => a + Math.random() * (b - a);
const V = (x = 0, y = 0, z = 0) => new CANNON.Vec3(x, y, z);
const MIN_HALF = 0.035;
const _v = new THREE.Vector3();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

// Verhindert Physik-Ausreißer: ineinanderliegende Teile stoßen sich sonst mit dutzenden m/s ab.
const MAX_SPEED = 28;
function capSpeed(body) {
  const v = body.velocity, l = v.length();
  if (l > MAX_SPEED) v.scale(MAX_SPEED / l, v);
}

const EASE = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outBack: (t) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inQuad: (t) => t * t,
};

/* ───────────── Collider-Beschreibungen ───────────── */
// Beschreibung im lokalen Raum des Meshes (Skalierung eingerechnet): { type, half|r|rt|rb|h, off:[x,y,z], q:[x,y,z,w] }
function resolveCollider(mesh, spec, shrink = 1) {
  const s = mesh.scale;
  const sxz = Math.max(s.x, s.z);
  if (spec && spec !== 'auto') {
    const off = spec.offset ?? [0, 0, 0];
    let q = spec.q ?? [0, 0, 0, 1];
    if (spec.type === 'box') return { type: 'box', half: spec.size.map((v) => Math.max(v / 2, MIN_HALF)), off, q };
    if (spec.type === 'sph') return { type: 'sph', r: spec.r, off, q };
    if (spec.type === 'cyl') {
      if (spec.axis === 'x') q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)).toArray();
      if (spec.axis === 'z') q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)).toArray();
      return { type: 'cyl', rt: spec.r, rb: spec.r, h: spec.h, off, q };
    }
  }
  const g = mesh.geometry;
  if (g && g.type === 'CylinderGeometry' && g.parameters.radialSegments >= 5) {
    const p = g.parameters;
    return { type: 'cyl', rt: Math.max(p.radiusTop * sxz, 0.02), rb: Math.max(p.radiusBottom * sxz, 0.02), h: p.height * s.y, off: [0, 0, 0], q: [0, 0, 0, 1] };
  }
  if (g && g.type === 'SphereGeometry' && g.parameters.phiLength >= 6.28 && g.parameters.thetaLength >= 3.14) {
    return { type: 'sph', r: g.parameters.radius * Math.max(s.x, s.y, s.z), off: [0, 0, 0], q: [0, 0, 0, 1] };
  }
  const b = localBounds(mesh);
  const c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
  return {
    type: 'box',
    half: [Math.max((sz.x * s.x * shrink) / 2, MIN_HALF), Math.max((sz.y * s.y * shrink) / 2, MIN_HALF), Math.max((sz.z * s.z * shrink) / 2, MIN_HALF)],
    off: [c.x * s.x, c.y * s.y, c.z * s.z],
    q: [0, 0, 0, 1],
  };
}

function makeShape(d) {
  if (d.type === 'box') return new CANNON.Box(V(...d.half));
  if (d.type === 'sph') return new CANNON.Sphere(Math.max(d.r, 0.03));
  return new CANNON.Cylinder(Math.max(d.rt, 0.02), Math.max(d.rb, 0.02), Math.max(d.h, 0.04), 12);
}

export class Part {
  constructor(mesh, o = {}) {
    this.mesh = mesh;
    this.home = { pos: mesh.position.clone(), quat: mesh.quaternion.clone(), scale: mesh.scale.clone() };
    this.collider = o.collider ?? 'auto'; // 'auto' | 'none' | { type:'box'|'sph'|'cyl', ... }
    this.mass = o.mass ?? 10;
    this.surf = o.surf ?? 'metal';        // Physik-Material: metal clay wood rubber cloth body
    this.fracture = o.fracture ?? null;   // [nx,ny,nz] → zerbricht beim Explodieren in Brocken
    this.shrink = o.shrink ?? 1;          // verkleinert die automatische Box (gebogene Teile überlappen sonst ihre Nachbarn)
    this.group = o.group ?? 'body';
    this.order = o.order ?? null;         // Aufbau-Reihenfolge (Standard: von unten nach oben)
    this.vanish = o.vanish ?? false;      // verschwindet beim Explodieren (Energiefelder, Hologramme)
    this.bind = null;                     // Mesh↔Body Kopplung (rigid)
    this.chunks = [];
    this._desc = null;
  }
  desc() { return (this._desc ??= resolveCollider(this.mesh, this.collider === 'none' ? 'auto' : this.collider, this.shrink)); }
  // Collider für herumfliegende Trümmer: Teile ohne eigenen Collider (Rohre, Planen) bekommen eine kleine Box,
  // damit sich ihre großen Hüllkörper beim Explodieren nicht gegenseitig wegdrücken.
  debrisDesc() {
    const d = this.desc();
    if (this.solid) return d;
    // Dekor ohne eigenen Collider: kleine Box (egal ob die Hülle Quader, Kugel oder Zylinder ist)
    const half = d.type === 'box' ? d.half : d.type === 'sph' ? [d.r, d.r, d.r] : [Math.max(d.rt, d.rb), d.h / 2, Math.max(d.rt, d.rb)];
    return { type: 'box', half: half.map((h) => Math.min(h, 0.2)), off: d.off, q: d.q };
  }
  get solid() { return this.collider !== 'none'; }
}

// Kopplung: Body-Ursprung = Collidermitte, Body-Orientierung = Mesh-Orientierung
function makeBinding(mesh, desc, mass, surf, damp = [0.12, 0.6]) {
  mesh.updateWorldMatrix(true, false);
  mesh.matrixWorld.decompose(_p, _q, _s);
  const off = new THREE.Vector3(...desc.off);
  const center = _p.clone().add(off.clone().applyQuaternion(_q));
  const body = new CANNON.Body({
    mass,
    material: env.physics.mats[surf] ?? env.physics.mats.metal,
    allowSleep: true,
    sleepSpeedLimit: 0.3,
    sleepTimeLimit: 0.8,
    linearDamping: damp[0],
    angularDamping: damp[1],
  });
  body.addShape(makeShape(desc), V(), new CANNON.Quaternion(...desc.q));
  body.position.set(center.x, center.y, center.z);
  body.quaternion.set(_q.x, _q.y, _q.z, _q.w);
  return { mesh, body, off, surf };
}
function syncBinding(b) {
  const q = b.body.quaternion;
  b.mesh.quaternion.set(q.x, q.y, q.z, q.w);
  _v.copy(b.off).applyQuaternion(b.mesh.quaternion);
  b.mesh.position.set(b.body.position.x - _v.x, b.body.position.y - _v.y, b.body.position.z - _v.z);
}

export class ForgeObject {
  constructor(def, params) {
    this.def = def;
    this.params = params;
    this.root = new THREE.Group();
    this.root.name = def.id;
    this.parts = [];
    this.lights = [];
    this.mode = 'static';
    this.originY = 0;
    this.vehicle = null;   // Fahrzeug-Daten (siehe _makeVehicle)
    this.hover = null;     // Gleiter-Daten
    this.character = null; // Figuren-Daten
    this.body = null;
    this.vehicleObj = null;
    this.debris = [];
    this.state = 'idle';   // idle | building | active | exploded
    this.time = 0;
    this.controlled = false;
    this.input = null;
    this.placement = { x: 0, z: 0, ry: 0 };
    this.anim = {};        // freier Platz für Animationsdaten der Objekt-Definition
    this._pre = null;
    this._grounded = 0;
    this.yaw = 0;
    this.onBuilt = null;
  }

  /* ── Aufbau der Definition ── */
  add(obj, o = {}) {
    this.root.add(obj);
    const p = new Part(obj, o);
    this.parts.push(p);
    return p;
  }
  light(l) {
    this.root.add(l);
    this.lights.push({ light: l, base: l.intensity });
    return l;
  }
  finalize() {
    this.root.updateMatrixWorld(true);
    for (const p of this.parts) p.desc();
  }
  setLights(on) { for (const l of this.lights) l.light.intensity = on ? l.base : 0; }

  place(x = 0, z = 0, ry = 0) {
    this.placement = { x, z, ry };
    this.root.position.set(x, 0, z);
    this.root.rotation.set(0, ry, 0);
    this.yaw = ry;
  }

  spawn() {
    env.scene.add(this.root);
    this.root.updateMatrixWorld(true);
    this.activate();
  }

  // Hüllkörper aller Teile – auch wenn sie (Physik "rigid", Trümmer) nicht mehr unter dem Root hängen
  bounds() {
    const b = new THREE.Box3(), t = new THREE.Box3();
    this.root.updateMatrixWorld(true);
    for (const p of this.parts) {
      if (p.vanish && this.state !== 'exploded') continue; // Energiefelder, Strahlen: nicht fürs Einpassen der Kamera
      if (p.chunks.length) { for (const c of p.chunks) b.union(t.setFromObject(c)); continue; }
      if (!p.mesh.visible && this.state !== 'exploded') continue;
      b.union(t.setFromObject(p.mesh));
    }
    if (b.isEmpty()) b.setFromObject(this.root);
    return b;
  }

  /* ── Physik ein/aus ── */
  activate() {
    if (this.state === 'active') return;
    this.root.updateMatrixWorld(true);
    if (this.mode === 'static') this._makeStatic();
    else if (this.mode === 'rigid') this._makeRigid();
    else if (this.mode === 'vehicle') this._makeVehicle();
    else if (this.mode === 'hover') this._makeHover();
    else if (this.mode === 'character') this._makeCharacter();
    this.state = 'active';
    this.setLights(true);
  }

  _stopBodies() {
    const w = env.physics.world;
    if (this.vehicleObj) { this.vehicleObj.removeFromWorld(w); this.vehicleObj = null; }
    if (this._pre) { w.removeEventListener('preStep', this._pre); this._pre = null; }
    if (this.body) { w.removeBody(this.body); this.body = null; }
    for (const p of this.parts) if (p.bind) { w.removeBody(p.bind.body); p.bind = null; }
  }

  _restoreParts() {
    for (const p of this.parts) {
      if (p.mesh.parent !== this.root) this.root.add(p.mesh);
      p.mesh.visible = true;
      p.mesh.position.copy(p.home.pos);
      p.mesh.quaternion.copy(p.home.quat);
      p.mesh.scale.copy(p.home.scale);
    }
  }

  _rootPose() {
    this.root.updateMatrixWorld(true);
    this.root.getWorldPosition(_p);
    this.root.getWorldQuaternion(_q);
    const rp = _p.clone(), rq = _q.clone();
    const yo = new THREE.Vector3(0, this.originY, 0).applyQuaternion(rq);
    return { rp, rq, bp: rp.clone().add(yo) };
  }

  // Ein Body aus mehreren Teilen (Compound). Teile-Positionen relativ zum Body-Ursprung (= Root + originY).
  _compound(parts, mass, extra = {}) {
    const { rq, bp } = this._rootPose();
    const body = new CANNON.Body({
      mass,
      type: mass > 0 ? CANNON.Body.DYNAMIC : CANNON.Body.STATIC,
      allowSleep: true,
      sleepSpeedLimit: 0.25,
      sleepTimeLimit: 0.8,
      ...extra,
    });
    body.position.set(bp.x, bp.y, bp.z);
    body.quaternion.set(rq.x, rq.y, rq.z, rq.w);
    for (const p of parts) {
      if (!p.solid) continue;
      const d = p.desc();
      const pos = new THREE.Vector3(...d.off).applyQuaternion(p.home.quat).add(p.home.pos);
      pos.y -= this.originY;
      const q = p.home.quat.clone().multiply(new THREE.Quaternion(...d.q));
      const shape = makeShape(d);
      shape.material = env.physics.mats[p.surf] ?? env.physics.mats.metal;
      body.addShape(shape, V(pos.x, pos.y, pos.z), new CANNON.Quaternion(q.x, q.y, q.z, q.w));
    }
    return body;
  }

  _makeStatic() {
    const body = this._compound(this.parts, 0);
    if (body.shapes.length) {
      env.physics.add(body);
      this.body = body;
    }
  }

  _makeRigid() {
    for (const p of this.parts) {
      if (!p.solid) continue;
      env.scene.attach(p.mesh);
      p.bind = makeBinding(p.mesh, p.desc(), p.mass, p.surf);
      env.physics.add(p.bind.body);
      p.bind.body.sleep(); // Stapel stehen von Anfang an ruhig
      p.bind.body.addEventListener('collide', (e) => this._onImpact(e, p.surf));
    }
  }

  _makeHover() {
    const h = this.hover;
    const body = this._compound(this.parts, h.mass ?? 260, { linearDamping: 0.35, angularDamping: 0.85 });
    env.physics.add(body);
    this.body = body;
    this._pre = () => this._hoverForces();
    env.physics.world.addEventListener('preStep', this._pre);
  }

  _makeCharacter() {
    const c = this.character;
    const { bp } = this._rootPose();
    const r = c.radius ?? 0.32, hgt = c.height ?? 1.8;
    const body = new CANNON.Body({ mass: c.mass ?? 70, material: env.physics.mats.body, fixedRotation: true, allowSleep: false, linearDamping: 0.02 });
    body.addShape(new CANNON.Sphere(r), V(0, 0, 0));
    body.addShape(new CANNON.Sphere(r), V(0, hgt - 2 * r, 0));
    body.addShape(new CANNON.Sphere(r), V(0, (hgt - 2 * r) / 2, 0));
    body.position.set(bp.x, r, bp.z); // Füße auf y=0
    body.collisionFilterGroup = 2;
    body.updateMassProperties();
    this.originY = r;
    env.physics.add(body);
    this.body = body;
    this._ray = new CANNON.RaycastResult();
    this._pre = () => this._characterForces();
    env.physics.world.addEventListener('preStep', this._pre);
  }

  _makeVehicle() {
    const spec = this.vehicle;
    const chassisParts = this.parts.filter((p) => p.group !== 'wheel');
    const body = this._compound(chassisParts, spec.mass ?? 320, { linearDamping: 0.03, angularDamping: 0.4, allowSleep: false });
    const veh = new CANNON.RaycastVehicle({ chassisBody: body, indexRightAxis: 0, indexUpAxis: 1, indexForwardAxis: 2 });
    for (const w of spec.wheels) {
      veh.addWheel({
        radius: w.radius ?? spec.wheelRadius,
        directionLocal: V(0, -1, 0),
        suspensionStiffness: spec.stiffness ?? 32,
        suspensionRestLength: spec.rest ?? 0.35,
        frictionSlip: spec.grip ?? 3.2,
        dampingRelaxation: spec.relax ?? 2.4,
        dampingCompression: spec.compress ?? 4.6,
        maxSuspensionForce: 1e5,
        rollInfluence: spec.roll ?? 0.02,
        axleLocal: V(-1, 0, 0),
        chassisConnectionPointLocal: V(w.x, w.y - this.originY, w.z),
        maxSuspensionTravel: spec.travel ?? 0.35,
        customSlidingRotationalSpeed: -30,
        useCustomSlidingRotationalSpeed: true,
      });
      env.scene.attach(w.part.mesh);
    }
    veh.addToWorld(env.physics.world);
    this.vehicleObj = veh;
    this.body = body;
    body.addEventListener('collide', (e) => this._onImpact(e, 'metal', 6));
  }

  _onImpact(e, surf, min = 3.5) {
    const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
    if (v < min) return;
    if (surf === 'metal') audio.clank(v / 14);
    else audio.thud(v / 14);
    if (v > 5.5 && env.fx) env.fx.dust(e.target.position, 2, 0.8, 1);
  }

  /* ── Fahr-/Flug-/Lauf-Steuerung (jede Physik-Teilstufe) ── */
  _hoverForces() {
    const h = this.hover, body = this.body;
    if (!body) return;
    const inp = this.controlled && this.input ? this.input : null;
    const mass = body.mass;
    const up = body.vectorToWorldFrame(V(0, 1, 0), V());
    const fwd = body.vectorToWorldFrame(V(0, 0, 1), V());
    const right = body.vectorToWorldFrame(V(-1, 0, 0), V());
    const vel = V();
    let n = 0;
    for (const pt of h.points) {
      const local = V(pt[0], pt[1] - this.originY, pt[2]);
      const rel = body.vectorToWorldFrame(local, V());
      const world = V(body.position.x + rel.x, body.position.y + rel.y, body.position.z + rel.z);
      const height = world.y;
      if (height < h.height * 1.8) {
        body.getVelocityAtWorldPoint(world, vel);
        const compress = h.height - height;
        const f = Math.max(0, h.k * mass * compress - h.c * mass * vel.y);
        body.applyForce(V(0, f, 0), rel);
        n++;
      }
    }
    // Quergleiten dämpfen, Aufrichten
    const lat = body.velocity.dot(right);
    body.applyForce(right.scale(-lat * mass * 3.5, V()), V());
    const corr = up.cross(V(0, 1, 0), V());
    body.torque.vadd(corr.scale(mass * (h.level ?? 40), V()), body.torque);
    if (inp && n > 0) {
      body.wakeUp();
      body.applyForce(fwd.scale(inp.throttle * (h.thrust ?? 3200) * (inp.boost ? 1.6 : 1), V()), V());
      body.angularVelocity.y += (inp.steer * (h.turn ?? 1.6) - body.angularVelocity.y) * 0.08;
    }
    if (n === 0) body.applyForce(V(0, -mass * 2, 0), V()); // fällt etwas schneller, wenn weit oben
  }

  _characterForces() {
    const c = this.character, body = this.body;
    if (!body) return;
    const inp = this.controlled && this.input ? this.input : null;
    // am Boden?
    const from = V(body.position.x, body.position.y, body.position.z);
    const to = V(from.x, from.y - ((c.radius ?? 0.32) + 0.12), from.z);
    this._ray.reset();
    const hit = env.physics.world.raycastClosest(from, to, { collisionFilterMask: 1, skipBackfaces: true }, this._ray);
    this._grounded = hit ? 0.1 : Math.max(0, this._grounded - 1 / 60);
    const speed = (c.speed ?? 2.6) * (inp?.run ? 1.8 : 1);
    const tx = inp ? inp.moveX * speed : 0, tz = inp ? inp.moveZ * speed : 0;
    const k = this._grounded > 0 ? 0.28 : 0.06;
    body.velocity.x += (tx - body.velocity.x) * k;
    body.velocity.z += (tz - body.velocity.z) * k;
    if (inp && inp.jump && this._grounded > 0) {
      body.velocity.y = c.jump ?? 5;
      this._grounded = 0;
    }
  }

  /* ── pro Frame ── */
  update(dt, input) {
    this.time += dt;
    this.input = input;
    if (this.state === 'building') this._tickBuild(dt);
    else if (this.state === 'active') this._tickActive(dt);
    else if (this.state === 'exploded') {
      // Geisterphase: Trümmer kollidieren die ersten Zehntelsekunden nur mit dem Boden, sonst drücken sich überlappende Teile gegenseitig weg
      if (this._ghost > 0) {
        this._ghost -= dt;
        if (this._ghost <= 0) for (const b of this.debris) b.body.collisionFilterMask = -1;
      }
      for (const b of this.debris) {
        if (b.body.sleepState === CANNON.Body.SLEEPING) continue;
        capSpeed(b.body);
        syncBinding(b);
      }
    }
    if (this.def.onFrame) this.def.onFrame(this, dt, input);
  }

  _tickActive(dt) {
    if (this.mode === 'rigid') {
      for (const p of this.parts) if (p.bind && p.bind.body.sleepState !== CANNON.Body.SLEEPING) { capSpeed(p.bind.body); syncBinding(p.bind); }
      return;
    }
    if (!this.body) return;
    const body = this.body;
    if (this.mode === 'vehicle') {
      const v = this.vehicleObj, spec = this.vehicle;
      const inp = this.controlled && this.input ? this.input : null;
      const thr = inp ? inp.throttle : 0;
      const steer = inp ? inp.steer : 0;
      const spd = body.velocity.length();
      const vmax = spec.maxSpeed ?? 45;                       // Höchstgeschwindigkeit: Antrieb nimmt zum Limit hin ab
      const drive = Math.max(0, 1 - spd / (inp?.boost ? vmax * 1.4 : vmax));
      spec.wheels.forEach((w, i) => {
        v.applyEngineForce(w.drive ? -thr * (spec.engine ?? 900) * (inp?.boost ? 1.5 : 1) * drive : 0, i);
        v.setSteeringValue(w.steer ? steer * (spec.maxSteer ?? 0.5) * (1 / (1 + spd * (spec.steerK ?? 0.03))) : 0, i);
        const brake = inp && inp.brake ? (spec.brake ?? 60) : thr === 0 ? (spec.brake ?? 60) * 0.03 : 0;
        v.setBrake(brake, i);
      });
      if (inp && (thr !== 0 || steer !== 0)) body.wakeUp();
      this._syncRoot();
      spec.wheels.forEach((w, i) => {
        v.updateWheelTransform(i);
        const t = v.wheelInfos[i].worldTransform;
        w.part.mesh.position.set(t.position.x, t.position.y, t.position.z);
        w.part.mesh.quaternion.set(t.quaternion.x, t.quaternion.y, t.quaternion.z, t.quaternion.w);
      });
    } else if (this.mode === 'hover') {
      this._syncRoot();
    } else if (this.mode === 'character') {
      const vx = body.velocity.x, vz = body.velocity.z;
      const sp = Math.hypot(vx, vz);
      if (sp > 0.3) {
        const target = Math.atan2(vx, vz);
        let d = target - this.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        this.yaw += d * Math.min(1, dt * 10);
      }
      this.root.position.set(body.position.x, body.position.y - this.originY, body.position.z);
      this.root.rotation.y = this.yaw;
      this.character.speedNow = sp;
      this.character.grounded = this._grounded > 0;
    }
  }

  _syncRoot() {
    const b = this.body;
    this.root.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
    _v.set(0, this.originY, 0).applyQuaternion(this.root.quaternion);
    this.root.position.set(b.position.x - _v.x, b.position.y - _v.y, b.position.z - _v.z);
  }

  /* ── Aufbau-Animation ── */
  playBuild({ duration = 4, style = 'assemble' } = {}) {
    this._clearDebris();
    this._stopBodies();
    this._restoreParts();
    this.root.position.set(this.placement.x, 0, this.placement.z);
    this.root.rotation.set(0, this.placement.ry, 0);
    this.root.quaternion.setFromEuler(new THREE.Euler(0, this.placement.ry, 0));
    this.yaw = this.placement.ry;
    env.fx.clearOwner(this);
    this.setLights(false);
    this.state = 'building';
    this.bt = 0;
    const list = [...this.parts].sort((a, b) => (a.order ?? a.home.pos.y) - (b.order ?? b.home.pos.y));
    const n = list.length;
    list.forEach((p, i) => {
      const delay = (i / Math.max(1, n)) * duration * 0.62 + rnd(0, 0.06) * duration;
      const dur = duration * 0.34;
      const b = { delay, dur, done: false, pos0: p.home.pos.clone(), quat0: p.home.quat.clone(), scale0: p.home.scale.clone(), ease: EASE.outCubic };
      if (style === 'assemble') {
        b.pos0.add(new THREE.Vector3(rnd(-1, 1), rnd(0.4, 1.2), rnd(-1, 1)).normalize().multiplyScalar(rnd(5, 12)));
        b.quat0.setFromEuler(new THREE.Euler(rnd(-3, 3), rnd(-3, 3), rnd(-3, 3)));
        b.scale0.multiplyScalar(0.15);
      } else if (style === 'rise') {
        b.pos0.y = -4;
        b.quat0.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(-0.3, 0.3), rnd(-0.6, 0.6), rnd(-0.3, 0.3))));
      } else if (style === 'drop') {
        b.pos0.add(new THREE.Vector3(rnd(-1.5, 1.5), 14 + rnd(0, 12), rnd(-1.5, 1.5)));
        b.quat0.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(-0.8, 0.8), rnd(-1.2, 1.2), rnd(-0.8, 0.8))));
        b.ease = EASE.inQuad;
      } else {
        b.scale0.multiplyScalar(0.001);
        b.ease = EASE.outBack;
      }
      p.b = b;
      p.mesh.visible = false;
    });
  }

  _tickBuild(dt) {
    this.bt += dt;
    let all = true;
    for (const p of this.parts) {
      const b = p.b, m = p.mesh;
      const t = (this.bt - b.delay) / b.dur;
      if (t <= 0) { m.visible = false; all = false; continue; }
      m.visible = true;
      if (t >= 1) {
        if (!b.done) {
          b.done = true;
          m.position.copy(p.home.pos); m.quaternion.copy(p.home.quat); m.scale.copy(p.home.scale);
          m.getWorldPosition(_p);
          if (_p.y < 3.5 && Math.random() < 0.8) {
            env.fx.dust(new THREE.Vector3(_p.x, 0.1, _p.z), 3, 0.9, 1.4);
            if (Math.random() < 0.4) audio.clank(0.4);
          }
        }
        continue;
      }
      all = false;
      const e = b.ease(t);
      m.position.lerpVectors(b.pos0, p.home.pos, e);
      m.quaternion.slerpQuaternions(b.quat0, p.home.quat, e);
      m.scale.lerpVectors(b.scale0, p.home.scale, e);
    }
    if (all) {
      this.state = 'idle';
      this.activate();
      if (this.onBuilt) this.onBuilt(this);
    }
  }

  /* ── Explosion ── */
  explode({ strength = 1, point = null } = {}) {
    if (this.state === 'exploded') return;
    if (this.state === 'building') { this.state = 'idle'; this._restoreParts(); }
    this._stopBodies();
    this.root.updateMatrixWorld(true);
    const bb = this.bounds();
    const size = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3());
    const S = THREE.MathUtils.clamp(Math.max(size.x, size.z) / 5 + size.y / 10, 0.7, 3.5);
    const center = point ? point.clone() : new THREE.Vector3(ctr.x, Math.min(ctr.y, 1.2), ctr.z);
    env.fx.explosion(center, S, this);
    this.state = 'exploded';
    for (const p of this.parts) this._release(p, center, strength);
    for (const b of this.debris) { b.body.collisionFilterGroup = 2; b.body.collisionFilterMask = 1; }
    this._ghost = 0.45;
    this.setLights(false);
    env.fx.emitter(center, 10 + S * 4, S * 0.8, this);
  }

  _fracture(part) {
    const mesh = part.mesh;
    mesh.updateWorldMatrix(true, false);
    mesh.matrixWorld.decompose(_p, _q, _s);
    const wp = _p.clone(), wq = _q.clone(), ws = _s.clone();
    const b = localBounds(mesh);
    const size = b.getSize(new THREE.Vector3());
    const [nx, ny, nz] = part.fracture;
    const cuts = (n) => {
      const a = [0];
      for (let i = 1; i < n; i++) a.push(i / n + rnd(-0.18, 0.18) / n);
      a.push(1);
      return a;
    };
    const cx = cuts(nx), cy = cuts(ny), cz = cuts(nz);
    const tpm = mesh.material?.userData?.tpm ?? 1;
    const out = [];
    const total = size.x * size.y * size.z || 1;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
      const fx = cx[i + 1] - cx[i], fy = cy[j + 1] - cy[j], fz = cz[k + 1] - cz[k];
      const dx = fx * size.x * ws.x, dy = fy * size.y * ws.y, dz = fz * size.z * ws.z;
      const lc = new THREE.Vector3(
        b.min.x + size.x * (cx[i] + fx / 2),
        b.min.y + size.y * (cy[j] + fy / 2),
        b.min.z + size.z * (cz[k] + fz / 2)
      );
      const geo = new THREE.BoxGeometry(Math.max(dx, 0.05), Math.max(dy, 0.05), Math.max(dz, 0.05));
      projectUV(geo, tpm);
      const m = new THREE.Mesh(geo, mesh.material);
      m.castShadow = m.receiveShadow = true;
      m.position.copy(wp).add(lc.multiplyVectors(lc, ws).applyQuaternion(wq));
      m.quaternion.copy(wq);
      env.scene.add(m);
      part.chunks.push(m);
      out.push({
        mesh: m,
        desc: { type: 'box', half: [Math.max(dx / 2, MIN_HALF), Math.max(dy / 2, MIN_HALF), Math.max(dz / 2, MIN_HALF)], off: [0, 0, 0], q: [0, 0, 0, 1] },
        mass: Math.max(0.5, part.mass * fx * fy * fz),
      });
    }
    mesh.visible = false;
    return out;
  }

  _release(part, center, strength) {
    const mesh = part.mesh;
    if (part.vanish) { mesh.visible = false; return; }
    mesh.visible = true;
    let items;
    if (part.fracture && mesh.isMesh) items = this._fracture(part);
    else {
      env.scene.attach(mesh);
      items = [{ mesh, desc: part.debrisDesc(), mass: part.mass }];
    }
    for (const it of items) {
      const b = makeBinding(it.mesh, it.desc, it.mass, part.surf);
      const body = b.body;
      // Nichts darf im Boden starten (flache Dekorteile bei y≈0 würden sonst herausgeschleudert)
      body.updateAABB();
      if (body.aabb.lowerBound.y < 0) body.position.y -= body.aabb.lowerBound.y - 0.01;
      const dir = new THREE.Vector3(body.position.x - center.x, body.position.y - center.y, body.position.z - center.z);
      const dist = dir.length();
      if (dist < 0.3) dir.set(rnd(-1, 1), 0.5, rnd(-1, 1));
      dir.normalize();
      dir.y = Math.max(dir.y, 0.25);
      dir.normalize();
      const speed = ((strength * 15) / (1 + dist * 0.15)) * (0.55 + Math.random() * 0.9) / Math.pow(Math.max(it.mass, 1), 0.2);
      const vel = new THREE.Vector3(dir.x * speed, dir.y * speed + rnd(2, 7) * strength, dir.z * speed);
      const cap = 24 * Math.max(1, strength);
      if (vel.length() > cap) vel.setLength(cap);
      body.velocity.set(vel.x, vel.y, vel.z);
      const spin = 9 / Math.pow(Math.max(it.mass, 1), 0.15);
      body.angularVelocity.set(rnd(-1, 1) * spin, rnd(-1, 1) * spin, rnd(-1, 1) * spin);
      body.addEventListener('collide', (e) => this._onImpact(e, part.surf, 4.5));
      env.physics.add(body);
      this.debris.push(b);
    }
  }

  _clearDebris() {
    for (const b of this.debris) env.physics.world.removeBody(b.body);
    this.debris = [];
    for (const p of this.parts) {
      for (const c of p.chunks) {
        env.scene.remove(c);
        c.geometry.dispose();
      }
      p.chunks = [];
    }
  }

  reset() {
    this._clearDebris();
    this._stopBodies();
    env.fx.clearOwner(this);
    this._restoreParts();
    this.root.position.set(this.placement.x, 0, this.placement.z);
    this.root.rotation.set(0, this.placement.ry, 0);
    this.yaw = this.placement.ry;
    this.state = 'idle';
    this.root.updateMatrixWorld(true);
    this.activate();
  }

  dispose() {
    this._clearDebris();
    this._stopBodies();
    env.fx.clearOwner(this);
    env.scene.remove(this.root);
    this.root.traverse((c) => { if (c.geometry) c.geometry.dispose(); });
    for (const p of this.parts) env.scene.remove(p.mesh);
  }
}

export function defaultParams(def) {
  return Object.fromEntries(def.params.map((d) => [d.key, d.value]));
}

export function createObject(def, values = {}) {
  const p = { ...defaultParams(def), ...values };
  const obj = new ForgeObject(def, p);
  def.build(obj, p);
  obj.finalize();
  return obj;
}
