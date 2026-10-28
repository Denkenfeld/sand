// Desert Forge – Skript-Schnittstelle 0.4.0 (API-Stufe 4). GENERIERT aus src/studio/spec.js (npm run docs) – nicht von Hand ändern.
// Im Skript ist `game` bereits vorhanden; die Typen helfen Editor und KI.

/** Punkt in der Ebene (Norden = −z, Osten = +x). */
export interface Vec2 {
  x: number;
  z: number;
}

/** Punkt im Raum. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Ein Objekt aus einem Prefab (Turm, Wurm, NPC …). */
export interface Thing {
  /** Stabile Nummer; bleibt beim Speichern/Laden gleich (game.byId). */
  id: number;
  /** Name des Prefabs. */
  readonly prefab: string;
  x: number;
  y: number;
  z: number;
  /** Drehung um die Hochachse (Bogenmaß). */
  yaw: number;
  /** Maßstab. */
  size: number;
  team: string | null;
  /** null = unverwundbar. */
  hp: number | null;
  maxHp: number | null;
  dead: boolean;
  removed: boolean;
  /** Geist (Vorschau, kein Spielobjekt). */
  ghost: boolean;
  /** Eigene Daten; werden mit gespeichert (nur Zahlen, Text, Listen, Objekte). */
  data: Record<string, any>;
  /** Blockier-Radius (0 = begehbar). */
  solid: number;
  height: number;
  radius: number;
  /** Benannte Teile. */
  parts: Record<string, Part>;
  readonly alive: boolean;
  /** Kompasswinkel der Blickrichtung (Vorn = +Z, heading = π − yaw). */
  heading: number;
  readonly forward: Vec2;
  visible: boolean;
  opacity: number;
  /** Einfärben (null = Original). */
  tint(color: string | number | null): void;
  /** Ohne Kollision versetzen. */
  move(x: number, z: number): Thing;
  /** Mehrere Werte setzen. */
  set(o: Partial<{ x: number; y: number; z: number; yaw: number; size: number; scale: number; heading: number; opacity: number; visible: boolean; data: object; team: string; hp: number; solid: number }>): Thing;
  /** Darstellung und Trefferzonen nach direkter Änderung von x/y/z/yaw/size aktualisieren. */
  sync(): void;
  /** Teil über Namen. */
  part(name: string): Part | null;
  /** Mündung eines Teils in Weltkoordinaten. */
  muzzle(partName?: string): { x: number; y: number; z: number; dx: number; dy: number; dz: number };
  /** Teile auf ein Ziel ausrichten. */
  aimAt(target: Vec2 & { y?: number; height?: number }, o?: { yawPart?: string; pitchPart?: string | null; rate?: number; tolerance?: number; minElev?: number; maxElev?: number; dt?: number }): { aligned: boolean; err: number };
  /** Mit Gebäudekollision bewegen; andere Objekte blockieren nicht. */
  walk(dx: number, dz: number, o?: { radius?: number }): { moved: number; blocked: boolean };
  /** Zu einem Punkt drehen. */
  face(x: number, z: number): Thing;
  /** Animationen (nur mit GLB-Modell). */
  readonly clips: { name: string; duration: number }[];
  /** Animation abspielen. */
  play(name: string, o?: { loop?: boolean; speed?: number; fade?: number; weight?: number }): any;
  /** Animation stoppen. */
  stop(name?: string): void;
  /** Aktuelle Trefferzonen in Weltkoordinaten (pro Bild zwischengespeichert). */
  hitVolumes(): HitVolume[];
  /** Strecke gegen die Zonen. */
  segHit(ax: number, ay: number, az: number, bx: number, by: number, bz: number, extra?: number): { zone: string | null; mult: number; u: number } | null;
  /** Strahl gegen die Zonen. */
  rayHit(origin: Vec3, dir: Vec3, maxT?: number): { zone: string | null; mult: number; t: number } | null;
  /** Schaden zufügen (ruft onDamage/onDestroy). */
  damage(n: number, by?: any, zone?: string | null): void;
  /** Zerstören. */
  kill(): void;
  /** Heilen. */
  heal(n: number): void;
  /** Entfernen (ohne Zerstörungs-Ereignis). */
  remove(): void;
}

/** Ein Teil eines Prefabs (drehbar/verschiebbar). Felder: x, y, z, yaw, pitch, roll, visible; Methode tip(). */
export interface Part {
  yaw: number;
  pitch: number;
  roll: number;
  x: number;
  y: number;
  z: number;
  visible: boolean;
  /** Spitze in Weltkoordinaten. */
  tip(): { x: number; y: number; z: number; dx: number; dy: number; dz: number };
}

/** Eine Trefferzone in Weltkoordinaten (Kapsel zwischen zwei Punkten oder Kugel). */
export interface HitVolume {
  name: string;
  x: number;
  y: number;
  z: number;
  /** Radius. */
  r: number;
  /** Schadensfaktor. */
  mult: number;
}

/** Eine Einheit (Gegner, Verbündeter) aus einem Einheitentyp. */
export interface Unit {
  /** Stabile Nummer (game.byId). */
  id: number;
  kind: string;
  team: string;
  hp: number;
  maxHp: number;
  x: number;
  z: number;
  y: number;
  yaw: number;
  dead: boolean;
  removed: boolean;
  height: number;
  radius: number;
  hitR: number;
  /** Eigene Daten; werden mit gespeichert. */
  data: Record<string, any>;
  readonly alive: boolean;
  /** Maßstab. */
  size: number;
  readonly heading: number;
  readonly forward: Vec2;
  /** Stand des Auftrags. */
  readonly status: 'idle' | 'moving' | 'arrived' | 'blocked' | 'unreachable';
  /** Aus dem Boden steigen. */
  emerge(sec?: number): Unit;
  damage(n: number, by?: any): void;
  kill(): void;
  remove(): void;
  /** Ziel mit Wegsuche anlaufen. */
  goTo(x: number | Vec2, z?: number | GoToOptions, o?: GoToOptions): Unit;
  /** Folgen. */
  follow(who?: 'player' | Unit): Unit;
}

/** Ein Oberflächen-Element. */
export interface Widget {
  id: string;
  anchor: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  visible: boolean;
  alpha: number;
  data: Record<string, any>;
  pointer: boolean;
  removed: boolean;
  hover: boolean;
  focused: boolean;
  down: boolean;
  disabled: boolean;
  focusable: boolean;
  cursor: string;
  margin: number;
  clip: boolean;
  /** Mausposition im Widget. */
  mouse: { x: number; y: number };
  /** Aktuelle Bildschirmfläche. */
  rect: { x: number; y: number; w: number; h: number };
  /** Zeichenfunktion: g.rect, g.text, g.measure … (siehe Handbuch „Oberfläche“). */
  draw: null | ((g: any) => void);
  onClick: null | ((e: any) => void);
  /** true = Taste verbraucht. */
  onKey: null | ((e: any) => boolean | void);
  onEnter: null | ((e: any) => void);
  onLeave: null | ((e: any) => void);
  onDown: null | ((e: any) => void);
  onUp: null | ((e: any) => void);
  onDisabledClick: null | ((e: any) => void);
  /** Eigenschaften setzen. */
  set(o: object): Widget;
  move(x: number, y: number): Widget;
  show(sec?: number): Widget;
  hide(sec?: number): Widget;
  remove(): void;
  focus(): Widget;
  readonly shown: boolean;
}

/** Menü / Dialog. */
export interface Menu extends Widget {
  /** Öffnen (pausiert das Spiel, wenn pause: true). */
  open(): Menu;
  close(): Menu;
  readonly isOpen: boolean;
}

/** Eine Kamera. position/quaternion sind THREE-Objekte. */
export interface Rig {
  name: string;
  type: 'perspective' | 'orthographic';
  /** THREE.Vector3 */
  position: any;
  /** THREE.Quaternion */
  quaternion: any;
  fov: number;
  /** Höhe des Sichtfelds (orthografisch). */
  size: number;
  near: number;
  far: number | null;
  /** true bei der Ich-Kamera der Engine. */
  native: boolean;
  removed: boolean;
  setPosition(x: number, y: number, z: number): Rig;
  lookAt(x: number, y: number, z: number): Rig;
  setAngles(yaw: number, pitch?: number): Rig;
  /** Blickrichtung. */
  readonly direction: Vec3;
  remove(): void;
}

/** Angaben zu einem geladenen Modell. */
export interface ModelInfo {
  id: string;
  clips: { name: string; duration: number }[];
  /** Maße in Metern. */
  size: Vec3;
  triangles: number;
  meshes: number;
  bytes: number;
  source: string;
  /** Standard-Einstellungen (leer, solange keine gesetzt sind). */
  defaults: ModelDefaults;
}

/** Standardwerte eines Modells (Studio-Vorschau). */
export interface ModelDefaults {
  /** Zielhöhe in Metern. */
  height: number;
  scale: number;
  forward: '+z' | '-z' | '+x' | '-x';
  origin: 'bottom' | 'center' | 'keep';
}

/** Eine Instanz eines Modells (teilt Geometrie/Materialien mit dem geladenen Modell). */
export interface ModelInstance {
  id: string;
  /** THREE.Object3D – in die Szene hängen (ctx.add). */
  object: any;
  clips: any[];
  mixer: any;
  actions: Record<string, any>;
  disposed: boolean;
  size: Vec3;
  play(name: string, o?: { loop?: boolean; speed?: number; fade?: number; weight?: number }): any;
  stop(name?: string): void;
  update(dt: number): void;
  dispose(): void;
}

/** Viele gleiche Objekte, ein Zeichenaufruf. */
export interface Instanced {
  /** THREE.InstancedMesh */
  mesh: any;
  max: number;
  removed: boolean;
  readonly count: number;
  set(i: number, o: { x?: number; y?: number; z?: number; yaw?: number; pitch?: number; roll?: number; scale?: number; sx?: number; sy?: number; sz?: number; color?: string | number }): void;
  remove(): void;
}

/** Kreisförmiger Bereich. */
export interface Zone {
  x: number;
  z: number;
  r: number;
  name: string;
  visible: boolean;
  removed: boolean;
}

/** Ring am Boden. */
export interface Ring {
  r: number;
  set(p: { x?: number; z?: number; r?: number; visible?: boolean; opacity?: number }): void;
  remove(): void;
}

/** Weiche Veränderung von Zahlen. */
export interface Tween {
  done: boolean;
  cancel(): void;
}

/** Zeitgeber. */
export interface Timer {
  dead: boolean;
  cancel(): void;
}

/** Ein Projektil im Flug. */
export interface Shot {
  /** THREE.Vector3 */
  pos: any;
  /** THREE.Vector3 */
  vel: any;
  dead: boolean;
  remove(): void;
}

/** Aufsammelbares Ding. */
export interface Pickup {
  type: string;
  x: number;
  z: number;
  taken: boolean;
}

/** Ergebnis einer Welt-Abfrage. */
export interface Hit {
  hit: boolean;
  type: 'none' | 'world' | 'ground' | 'unit' | 'thing' | 'player';
  dist: number;
  x: number;
  y: number;
  z: number;
  unit: Unit | null;
  thing: Thing | null;
  /** Name der getroffenen Trefferzone. */
  zone: string | null;
  /** Kopftreffer bei Einheiten. */
  head: boolean;
}

/** Was unter dem Zeiger liegt. */
export interface PickResult extends Hit {
  /** Punkt auf dem Boden unter dem Zeiger. */
  ground: Vec2 | null;
  screen: { x: number; y: number };
  origin: Vec3;
  dir: Vec3;
}

/** Zeiten. */
export interface Clock {
  /** Simulationszeit (Pause und Zeitfaktor berücksichtigt). */
  sim: number;
  /** Echte Zeit. */
  real: number;
  /** Simulationsschritt dieses Bildes. */
  dt: number;
  /** Echter Schritt dieses Bildes. */
  rdt: number;
  scale: number;
  frame: number;
  paused: boolean;
}

/** Messwerte (siehe Handbuch „Diagnose“). */
export interface Stats {
  fps: number;
  frameMs: { avg: number; p95: number; max: number };
  sim: object;
  objects: Record<string, number>;
  systems: Record<string, number>;
  render: Record<string, number | null>;
  assets: object;
  limits: Record<string, any>;
}

/** Griff auf ein registriertes Modul. */
export interface ModuleHandle {
  name: string;
  readonly state: 'new' | 'loading' | 'ready' | 'active' | 'failed' | 'disposed';
  readonly error: string | null;
  enable(): boolean;
  disable(): void;
  readonly ctx: ModuleCtx;
}

/** Das `ctx` eines Moduls: die ganze game-Schnittstelle, aber mit Eigentum – was darüber angelegt wird, räumt das Modul beim Ausschalten auf. */
export interface ModuleCtx extends Game {
  name: string;
  /** Die unveränderte Schnittstelle (ohne Eigentum). */
  game: Game;
  /** Wird automatisch gespeichert/geladen, wenn das Modul state: {…} deklariert. */
  state: Record<string, any>;
  /** Etwas dem Modul zuordnen (Funktion, Object3D, Objekt mit dispose/cancel). */
  own<T>(x: T, key?: any): T;
  /** Wie own. */
  track<T>(x: T, key?: any): T;
  /** Ein Eigentum sofort freigeben. */
  release(key: any): boolean;
  /** THREE-Objekt in ctx.root (oder parent) hängen; wird freigegeben. */
  add(obj: any, parent?: any): any;
  /** Eigene THREE.Group des Moduls (lazy). */
  readonly root: any;
  /** Läuft diese Aktivierung noch? */
  readonly alive: boolean;
  /** HUD-Zeile des Moduls. */
  hudSet(key: string, text: string): void;
  /** Instanz eines geladenen Modells; gehört dem Modul und wird mit ihm freigegeben. */
  model(id: string, o?: ModelOptions): ModelInstance | null;
}

/** Optionen für game.place. */
export interface PlaceOptions {
  x: number;
  z: number;
  y: number;
  /** Ort-Name oder Punkt. */
  at: string | Vec2;
  yaw: number;
  heading: number;
  scale: number;
  team: string;
  hp: number;
  data: object;
  ghost: boolean;
  opacity: number;
  id: number;
}

/** Beschreibung eines Prefabs: parts ODER build ODER model; dazu Werte und Hooks. */
export interface PrefabDef {
  /** Teile aus Grundkörpern. */
  parts: PartDef[];
  /** Eigene THREE.Object3D bauen (Geometrie gehört dem Objekt und wird mit ihm freigegeben). */
  build(thing: Thing, env: { THREE: any; game: Game }): any;
  /** Geladenes GLB-Modell. */
  model: string | { id: string; height?: number; scale?: number; forward?: '+z' | '-z' | '+x' | '-x'; origin?: 'bottom' | 'center' | 'keep' };
  /** Eigene Trefferzonen (sonst Zylinder aus radius/height). */
  hits: HitZoneDef[];
  solid: number;
  hp: number;
  team: string;
  height: number;
  radius: number;
  /** 0 = keine Explosion. */
  explode: number;
  /** Jedes Simulationsbild. */
  update(thing: Thing, dt: number): void;
  /** false = kein Schaden, Zahl = neuer Schaden. */
  onDamage(thing: Thing, e: { amount: number; by: any; zone: string | null }): void | false | number;
  onDestroy(thing: Thing, by: any): void;
  /** Eigene Daten für den Spielstand. */
  save(thing: Thing): object | undefined;
  /** Eigene Daten wiederherstellen. */
  load(thing: Thing, data: any): void;
}

/** Ein Teil eines Prefabs. */
export interface PartDef {
  name: string;
  shape: 'box' | 'sphere' | 'cylinder' | 'cone';
  size: number | number[];
  pos: number[];
  color: string;
  children: PartDef[];
  muzzle: number[];
}

/** Eine Trefferzone eines Prefabs. */
export interface HitZoneDef {
  name: string;
  /** Radius. */
  r: number;
  /** Mitte (lokal). */
  pos: number[];
  /** Zweiter Punkt (Kapsel). */
  to: number[];
  /** Folgt diesem Teil / diesem benannten Knoten. */
  part: string;
  /** Folgt diesem THREE-Objekt. */
  follow(thing: Thing): any;
  /** Schadensfaktor (Kopf = 3). */
  mult: number;
}

/** Optionen für Strahlen. */
export interface CastOptions {
  units: boolean;
  things: boolean;
  ignore: any;
}

/** Optionen für game.spawn. */
export interface SpawnOptions {
  x: number;
  z: number;
  at: string | Vec2;
  near: string | Vec2;
  minR: number;
  maxR: number;
  team: string;
  hp: number;
  ai: string;
  scale: number;
  params: object;
}

/** Optionen für Unit.goTo. */
export interface GoToOptions {
  reach: number;
  fight: boolean;
  direct: boolean;
  speed: number;
  onArrive(u: Unit): void;
  onFail(u: Unit, reason: string): void;
}

/** Optionen für game.shoot. */
export interface ShootOptions {
  from: Vec3;
  to: Vec3;
  dir: Vec3;
  target: Unit | Thing | 'player';
  speed: number;
  damage: number;
  splash: number;
  team: string;
  owner: any;
  shape: 'ball' | 'bolt' | 'rocket';
  gravity: number;
  homing: number;
  life: number;
  color: string;
  size: number;
  onHit(i: { x: number; y: number; z: number; zone: string | null; unit: Unit | null; thing: Thing | null; player: boolean; type: string }): void;
}

/** Optionen für game.explode. */
export interface ExplodeOptions {
  radius: number;
  damage: number;
  team: string;
  owner: any;
}

/** Einheitentyp für game.defineKind. */
export interface KindSpec {
  prefab: string;
  team: string;
  hp: number;
  speed: number;
  run: number;
  fly: number;
  hitR: number;
  height: number;
  score: number;
  animate(parts: Record<string, Part>, c: { dt: number; speed: number; attack: number; t: number; unit: Unit }): void;
}

/** Optionen für game.pickup. */
export interface PickupOptions {
  amount: number;
  weapon: string;
  stat: string;
  factor: number;
  respawn: number;
}

/** Optionen für game.zone. */
export interface ZoneOptions {
  x: number;
  z: number;
  at: string | Vec2;
  r: number;
  name: string;
  who: string;
  color: string | number;
  onEnter(who: any): void;
  onLeave(who: any): void;
}

/** Optionen für fx.ring. */
export interface RingOptions {
  color: string;
  opacity: number;
  /** Lebensdauer (0 = bleibt). */
  sec: number;
  y: number;
}

/** Optionen für game.tween. */
export interface TweenOptions {
  /** Standard inout. */
  ease: 'linear' | 'in' | 'out' | 'inout' | 'back' | 'bounce';
  delay: number;
  /** Startwerte (werden sofort gesetzt). */
  from: Record<string, number>;
  /** Echte Zeit statt Simulationszeit (bei Widgets Standard). */
  realtime: boolean;
  onDone(target: any): void;
}

/** Optionen für ui.widget. */
export interface WidgetOptions {
  id: string;
  anchor: string;
  x: number;
  y: number;
  w: number;
  h: number;
  margin: number;
  z: number;
  visible: boolean;
  /** Zeichnen mit g.rect/g.text/g.measure … */
  draw(g: any): void;
  data: object;
  pointer: boolean;
  focusable: boolean;
  onClick(e: any): void;
  onKey(e: any): boolean | void;
}

/** Optionen für ui.menu. */
export interface MenuOptions {
  id: string;
  title: string;
  /** Fließtext unter dem Titel (wird umbrochen). */
  text: string | (() => string);
  items: MenuItem[] | (() => MenuItem[]);
  hint: string;
  /** Spiel anhalten, solange offen (Standard true). */
  pause: boolean;
  closeOnSelect: boolean;
  onClose(): void;
  anchor: string;
  w: number;
}

/** Ein Menü-Eintrag. */
export interface MenuItem {
  label: string | (() => string);
  detail: string | (() => string);
  disabled: boolean | (() => boolean);
  reason: string;
  onSelect(item: MenuItem, i: number): void;
}

/** Optionen für input.action / input.axis. */
export interface InputDef {
  /** Quellen der Aktion ("w", "space", "Mouse0", "WheelUp" …); Kurzform für pos. */
  keys: string | string[];
  /** Achse: positive Richtung. */
  pos: string | string[];
  /** Achse: negative Richtung. */
  neg: string | string[];
  /** Nur in diesem Eingabe-Kontext (Standard "*" = jeder außer menu). */
  context: string;
  /** Faktor des Achsenwerts. */
  scale: number;
}

/** Optionen für camera.create. */
export interface RigOptions {
  type: 'perspective' | 'orthographic';
  fov: number;
  size: number;
  near: number;
  far: number;
  x: number;
  y: number;
  z: number;
}

/** Eigene Steuerung (game.controller.define). */
export interface ControllerDef {
  /** Eingabe-Kontext. */
  context: string;
  cursor: 'locked' | 'free';
  player: 'active' | 'idle' | 'off';
  viewmodel: boolean;
  input: Record<string, InputDef>;
  enter(cc: any, o: any): void;
  exit(cc: any): void;
  update(cc: any, dt: number): void;
  camera(cc: any, dt: number): void;
  pointer(cc: any, type: string, e: any): void;
  /** Wo die Stadt Details laden soll. */
  view(cc: any): { x: number; z: number; shadow?: number; near?: number };
}

/** Optionen für assets.model / ctx.model. */
export interface ModelOptions {
  /** Zielhöhe in Metern. */
  height: number;
  scale: number;
  /** Blickrichtung des Modells (Standard +z). */
  forward: '+z' | '-z' | '+x' | '-x';
  origin: 'bottom' | 'center' | 'keep';
  ownMaterials: boolean;
  shadows: boolean;
}

/** Optionen für game.instanced. */
export interface InstancedOptions {
  shape: 'box' | 'sphere' | 'cylinder' | 'cone';
  size: number | number[];
  color: string | number;
  /** THREE.BufferGeometry (statt shape) */
  geometry: any;
  material: any;
  max: number;
  castShadow: boolean;
}

/** Beschreibung eines Moduls. */
export interface ModuleDef {
  doc: string;
  /** Andere Module, die zuerst laufen müssen. */
  deps: string[];
  /** Anfangszustand; wird automatisch gespeichert (ctx.state). */
  state: Record<string, any>;
  /** Version des gespeicherten Zustands. */
  version: number;
  /** false = nicht automatisch einschalten. */
  auto: boolean;
  /** Einmal beim Registrieren; darf asynchron sein (Modelle laden). */
  init(ctx: ModuleCtx): void | Promise<void>;
  /** Einschalten. */
  enable(ctx: ModuleCtx): void;
  /** Jedes Simulationsbild (nicht in der Pause). */
  update(ctx: ModuleCtx, dt: number): void;
  /** Jedes Bild (auch in der Pause, echte Zeit). */
  frame(ctx: ModuleCtx, rdt: number): void;
  /** Ausschalten (Eigentum wird danach automatisch aufgeräumt). */
  disable(ctx: ModuleCtx): void;
  /** Eigener Zustand für den Spielstand. */
  save(ctx: ModuleCtx): object;
  /** Zustand wiederherstellen. */
  load(ctx: ModuleCtx, data: any, savedVersion: number): void;
  /** Endgültig entfernen. */
  dispose(ctx: ModuleCtx): void;
}

/** Spielstand (Format 2). Enthält keine Funktionen; Projektile, Partikel, Tweens und Aufträge (goTo) werden NICHT gespeichert. */
export interface SaveState {
  v: number;
  api: string;
  nextId: number;
  modules: Record<string, { v: number; data: any }>;
  score: number;
  kills: number;
  time: number;
  extra: any;
  player: object;
  units: object[];
  pickups: object[];
  things: object[];
}

export interface Player {
  /** Position Ost (+x). */
  readonly x: number;
  /** Position Süd (+z); Norden ist −z. */
  readonly z: number;
  /** Höhe. */
  readonly y: number;
  /** Blickwinkel (Bogenmaß; Kompasswinkel = −yaw). */
  readonly yaw: number;
  /** Lebt der Spieler? */
  readonly alive: boolean;
  /** Team des Spielers. */
  readonly team: string;
  /** Blickrichtung als Kompasswinkel (0 = Norden, Uhrzeigersinn). */
  readonly heading: number;
  /** Einheitsvektor nach vorn. */
  readonly forward: Vec2;
  /** Leben. */
  hp: number;
  /** Maximales Leben. */
  maxHp: number;
  /** Aktuelle Waffe. */
  readonly weapon: string | null;
  /** Alle Waffen. */
  readonly weapons: string[];
  /** Abschüsse. */
  readonly kills: number;
  /** Augenposition. */
  readonly eye: Vec3;
  /** Treffer-Abfrage durchs Fadenkreuz. */
  aim(maxDist?: number, o?: CastOptions): Hit;
  /** Leben auffüllen. */
  heal(n?: number): void;
  /** Spieler verletzen. */
  damage(n?: number): void;
  /** An einen (freien) Punkt setzen. */
  teleport(x: number | string | Vec2, z?: number, yaw?: number): void;
  /** Waffen festlegen. */
  loadout(ids: string[]): void;
  /** Waffe geben. */
  give(id: string): void;
  /** Munition auffüllen. */
  giveAmmo(frac?: number): void;
  /** Wert verbessern. */
  upgrade(stat: string, factor?: number): void;
  /** Wiederbeleben. */
  respawn(at?: string | Vec2): void;
  /** Munition einer Waffe. */
  ammo(id?: string): { mag: number; reserve: number } | null;
}

export interface MathHelpers {
  /** 2π. */
  readonly TAU: number;
  /** π. */
  readonly PI: number;
  /** Begrenzen. */
  clamp(x: number, a: number, b: number): number;
  /** Winkel auf −π … π bringen. */
  wrap(a: number): number;
  /** Mischen. */
  lerp(a: number, b: number, t: number): number;
  /** Abstand in der Ebene. */
  dist(a: Vec2, b: Vec2): number;
  /** Kompasswinkel von a nach b. */
  bearing(a: Vec2, b: Vec2): number;
  /** Einheitsvektor zu einem Kompasswinkel. */
  forward(heading: number): Vec2;
  /** Grad → Bogenmaß. */
  rad(deg: number): number;
  /** Bogenmaß → Grad. */
  deg(rad: number): number;
  /** Ziel aus Sicht von from (Standard: Spieler). */
  toLocal(target: Vec2, from?: Vec2 & { heading?: number }): { forward: number; right: number; dist: number; angle: number };
}

export interface UI {
  /** Eigenes Widget (gezeichnet mit draw(g)). */
  widget(o: WidgetOptions): Widget;
  /** Widget über ID. */
  get(id: string): Widget | null;
  /** Widget entfernen. */
  remove(id: string): void;
  /** Alle Widgets entfernen. */
  clear(): void;
  /** Größe des Spielbilds. */
  readonly screen: { w: number; h: number };
  /** Weltpunkt → Bildpunkt. */
  project(x: number, y: number, z: number): { x: number; y: number; visible: boolean } | null;
  /** Maus für Widgets freigeben bzw. fangen. */
  cursor(on?: boolean): void;
  /** Tastaturfokus. */
  focus(w: Widget): void;
  /** Fokus lösen. */
  blur(): void;
  /** Widget mit Fokus. */
  readonly focused: Widget | null;
  /** Vorlage Radar. */
  radar(o?: object): Widget;
  /** Vorlage Balken. */
  bar(o?: object): Widget;
  /** Vorlage Kompass. */
  compass(o?: object): Widget;
  /** Vorlage Schaltfläche. */
  button(o?: object): Widget;
  /** Vorlage Menü / Dialog (mit Titel, Fließtext und Einträgen). */
  menu(o?: MenuOptions): Menu;
}

export interface World {
  /** Strahl gegen Gebäude, Boden, Einheiten, Objekte (mit Zone). */
  cast(from: Vec3, dir: Vec3, max?: number, o?: CastOptions): Hit;
  /** Strahl von a nach b. */
  raycast(a: Vec3, b: Vec3, o?: CastOptions): Hit;
  /** Freie Sicht? */
  los(a: Vec3, b: Vec3): boolean;
  /** Bodenhöhe. */
  groundY(x: number, z: number): number;
  /** Darf hier gebaut werden? */
  canBuild(x: number, z: number, r: number, o?: object): { ok: boolean; reason?: string };
  /** Auf ein Raster einrasten. */
  snap(x: number, z: number, grid?: number): Vec2;
  /** Strahl durchs Fadenkreuz. */
  aim(max?: number, o?: CastOptions): Hit;
}

export interface Nav {
  /** Weg zwischen zwei Punkten. */
  path(a: Vec2, b: Vec2, o?: object): Vec2[] | null;
  /** Erreichbar? */
  reachable(a: Vec2, b: Vec2, o?: object): boolean;
  /** Ist die Stelle frei? */
  free(x: number, z: number, r?: number): boolean;
  /** Zähler der Wegsuche. */
  readonly stats: object;
}

export interface Fx {
  /** Explosionseffekt (ohne Schaden). */
  explosion(x: number, y: number, z: number, o?: object): void;
  /** Partikelstoß. */
  burst(x: number, y: number, z: number, o?: object): void;
  /** Mündungsfeuer. */
  muzzle(x: number, y: number, z: number, o?: object): void;
  /** Strahl. */
  beam(a: Vec3, b: Vec3, o?: object): object;
  /** Ring am Boden. */
  ring(x: number, z: number, r: number, o?: RingOptions): Ring;
}

export interface InputApi {
  /** Aktion (gedrückt/losgelassen) anlegen. */
  action(name: string, o?: InputDef): object | null;
  /** Achse (−1 … 1) anlegen. */
  axis(name: string, o?: InputDef): object | null;
  /** Quellen einer Aktion ersetzen (add: true = ergänzen); Achsen mit { pos, neg }. */
  bind(name: string, source: string | string[] | { pos?: string[]; neg?: string[] }, o?: { add?: boolean }): boolean;
  /** Bindungen einer Aktion. */
  bindings(name: string): string[];
  /** Alle Aktionen und Achsen. */
  list(): string[];
  /** Gedrückt gehalten? */
  down(name: string): boolean;
  /** In diesem Bild gedrückt? */
  pressed(name: string): boolean;
  /** In diesem Bild losgelassen? */
  released(name: string): boolean;
  /** Wert einer Achse / Aktion. */
  value(name: string): number;
  /** Eingabe-Kontext auf den Stapel. */
  push(context: string): void;
  /** Kontext vom Stapel. */
  pop(context?: string): void;
  /** Aktiver Kontext. */
  readonly context: string;
  /** Wert von außen setzen. */
  set(name: string, v: number | boolean): void;
  /** Wert einer virtuellen Quelle setzen (für spätere Touch-/Gamepad-Profile). */
  virtual(name: string, v: number | boolean): void;
  /** Alle gehaltenen Eingaben zurücksetzen. */
  reset(): void;
  /** Mausposition im Spielbild. */
  readonly mouse: { x: number; y: number; dx: number; dy: number; inside: boolean };
}

export interface CameraApi {
  /** Kamera anlegen. */
  create(name: string, o?: RigOptions): Rig;
  /** Kamera über Namen ("ego" = Standard). */
  get(name: string): Rig | null;
  /** Alle Kameras. */
  list(): string[];
  /** Kamera erzwingen (null = Controller bestimmt). */
  use(cam: string | Rig | null): boolean;
  /** Aktive Kamera. */
  readonly active: Rig;
  /** Weltpunkt → Bildpunkt. */
  project(x: number, y: number, z: number): { x: number; y: number; visible: boolean } | null;
  /** Strahl durch einen Bildpunkt (Standard: Mauszeiger). */
  ray(sx?: number, sy?: number): { origin: Vec3; dir: Vec3 };
  /** Was liegt unter dem Zeiger (Treffer + Bodenpunkt). */
  pick(sx?: number, sy?: number, o?: CastOptions): PickResult;
}

export interface ControllerApi {
  /** Eigene Steuerung definieren. */
  define(name: string, def: ControllerDef): void;
  /** Steuerung wechseln (ego, topdown, free, …). */
  use(name: string, o?: object): boolean;
  /** Gibt es die Steuerung? */
  has(name: string): boolean;
  /** Alle Steuerungen. */
  list(): string[];
  /** Name der aktiven Steuerung. */
  readonly active: string;
  /** Zwischen zwei Steuerungen umschalten. */
  toggle(a: string, b: string, o?: object): boolean;
}

export interface AssetsApi {
  /** GLB laden (gleiche ID = vorhandenes Modell). */
  load(id: string, src: string | ArrayBuffer | ArrayBufferView | Blob | { base64: string }, o?: { replace?: boolean; persist?: boolean; name?: string; defaults?: ModelDefaults }): Promise<ModelInfo>;
  /** Standard-Einstellungen (height, scale, forward, origin) eines Modells; gelten, wenn ein Aufruf sie nicht selbst nennt. Das Studio setzt sie aus der Vorschau. */
  setDefaults(id: string, def: ModelDefaults): boolean;
  /** Geladen? */
  has(id: string): boolean;
  /** Infos zu einem Modell. */
  get(id: string): ModelInfo | null;
  /** Alle Modell-IDs. */
  list(): string[];
  /** Instanz eines geladenen Modells (synchron). */
  model(id: string, o?: ModelOptions): ModelInstance | null;
  /** Modell aus dem Speicher nehmen. */
  release(id: string, o?: { force?: boolean }): boolean;
}

export interface CityApi {
  /** Mitte der Stadt. */
  readonly center: Vec2;
  /** Namen der Orte. */
  pois(): string[];
  /** Ort über Namen. */
  poi(name: string): { x: number; z: number; name: string } | null;
  /** Zufälliger freier Punkt. */
  randomOpenPoint(o?: { near?: string | Vec2; min?: number; max?: number }): Vec2 | null;
  /** Stadtteil an einer Stelle. */
  districtAt(x: number, z: number): string | null;
}

export interface WeaponsApi {
  /** Waffe definieren (base: "rifle" …). */
  define(id: string, spec: object): void;
  /** Alle Waffen. */
  list(): string[];
}

export interface ModulesApi {
  /** Modul-Griff. */
  get(name: string): ModuleHandle | null;
  /** Registriert? */
  has(name: string): boolean;
  /** Alle Module. */
  list(): { name: string; state: string; deps: string[] }[];
  /** Modul einschalten. */
  enable(name: string): boolean;
  /** Modul ausschalten (räumt auf). */
  disable(name: string): boolean;
  /** Modul ganz entfernen. */
  remove(name: string): boolean;
}

export interface Hud {
  /** Textzeile setzen. */
  set(key: string, text: string): void;
  /** Textzeile entfernen. */
  clear(key: string): void;
  /** Einblendung. */
  message(text: string, sec?: number): void;
}

export interface Ext {
  /** Vertragsstufe des Expertenzugangs. */
  readonly contract: number;
  /** Versionen. */
  readonly versions: { engine: string; three: string; renderer: string };
  /** Der three.js-Namensraum. */
  readonly THREE: any;
  /** Die Szene (gehört der Engine). */
  readonly scene: any;
  /** Der WebGLRenderer (gehört der Engine). */
  readonly renderer: any;
  /** Die Hauptkamera (gehört dem aktiven Controller). */
  readonly camera: any;
  /** Kreis gegen Gebäude schieben. */
  collide(x: number, z: number, r: number): { x: number; z: number; hit: boolean };
  /** Steht hier ein Gebäude? */
  obstacleAt(x: number, z: number, margin?: number): boolean;
}

export interface Game {
  /** Version der Schnittstelle (z. B. "0.4.0"). */
  readonly version: string;
  /** Ganzzahl-Stufe der Schnittstelle; steigt bei neuen Fähigkeiten. */
  readonly apiLevel: number;
  /** Fähigkeiten und ihre Stufen (siehe has). */
  readonly capabilities: Record<string, number | string[]>;
  /** Ausdrücklich noch NICHT umgesetzte Dinge. */
  readonly planned: string[];
  /** Gibt es diese Fähigkeit? z. B. game.has("camera.ortho"). */
  has(capability: string): boolean;
  /** Expertenzugang (three.js, Szene, Renderer) – siehe Expertenreferenz. */
  readonly ext: Ext;
  /** Der Spieler. */
  readonly player: Player;
  /** Mathe-Helfer (Kompasswinkel, Abstand, …). */
  readonly math: MathHelpers;
  /** Oberfläche: Widgets und Vorlagen (radar, bar, compass, button, menu). */
  readonly ui: UI;
  /** Abfragen an die Welt: Strahlen, Sichtlinie, Boden, Bauplatz. */
  readonly world: World;
  /** Wegsuche. */
  readonly nav: Nav;
  /** Sichtbare Effekte. */
  readonly fx: Fx;
  /** Eingabe-Aktionen und -Achsen. */
  readonly input: InputApi;
  /** Kameras (perspektivisch/orthografisch), Projektion, Bildpunkt → Welt. */
  readonly camera: CameraApi;
  /** Steuerungen (ego, topdown, free, eigene). */
  readonly controller: ControllerApi;
  /** Modelle (GLB) laden und als Instanz nutzen. */
  readonly assets: AssetsApi;
  /** Viele gleiche Objekte mit einem Zeichenaufruf. */
  instanced(o: InstancedOptions): Instanced;
  /** Spiel anhalten (Simulation steht, Oberfläche läuft). */
  pause(): void;
  /** Spiel fortsetzen. */
  resume(): void;
  /** Ist das Spiel angehalten? */
  readonly paused: boolean;
  /** Zahlen eines Objekts weich verändern. */
  tween(target: object, props: Record<string, number>, sec: number, o?: TweenOptions): Tween;
  /** Eigenen Objekttyp definieren (Teile, build, model, Trefferzonen, Hooks). */
  prefab(name: string, def: PrefabDef): string;
  /** Objekt aus einem Prefab in die Welt setzen. */
  place(name: string, o?: PlaceOptions): Thing | null;
  /** Alle (oder nur die eines Prefabs) lebenden Objekte. */
  things(prefab?: string): Thing[];
  /** Eigenen Einheitentyp (Gegner/Verbündete) definieren. */
  defineKind(id: string, spec: KindSpec): boolean;
  /** Sichtbares Projektil abfeuern. */
  shoot(o: ShootOptions): Shot | null;
  /** Flächenschaden mit Explosion. */
  explode(x: number, y: number, z: number, o?: ExplodeOptions): void;
  /** Spielstand als einfaches Objekt (mit slot zusätzlich im Browser). */
  save(slot?: string | null, extra?: object | null): SaveState;
  /** Spielstand laden (Objekt oder Platzname). */
  load(src: SaveState | string): boolean;
  /** Objekt oder Einheit über die stabile Nummer finden. */
  byId(id: number): Thing | Unit | null;
  /** Gibt es einen Spielstand in diesem Platz? */
  hasSave(slot: string): boolean;
  /** Spielstand im Platz löschen. */
  deleteSave(slot: string): void;
  /** Die Stadt als Inhalt (Orte, freie Punkte). */
  readonly city: CityApi;
  /** Punkte. */
  score: number;
  /** Abschüsse des Spielers (zählt nur Spieler-Treffer). */
  readonly kills: number;
  /** Punkte addieren. */
  addScore(n: number): void;
  /** Einheit erzeugen. */
  spawn(kind: string, o?: SpawnOptions): Unit | null;
  /** Mehrere Einheiten erzeugen. */
  spawnWave(kind: string, n: number, o?: SpawnOptions): Unit[];
  /** Lebende Einheiten (eines Teams). */
  units(team?: string): Unit[];
  /** Anzahl lebender Einheiten (eines Teams). */
  count(team?: string): number;
  /** Alle Einheitentypen. */
  kinds(): string[];
  /** Aufsammelbares Ding (health, ammo, weapon, upgrade …). */
  pickup(type: string, x: number | string | Vec2, z?: number | PickupOptions, o?: PickupOptions): Pickup;
  /** Kreisförmiger Bereich mit Betreten/Verlassen-Hooks. */
  zone(o: ZoneOptions): Zone;
  /** Eigene Waffen definieren. */
  readonly weapons: WeaponsApi;
  /** Auf ein Ereignis hören (siehe EVENTS). */
  on(event: string, fn: (e: any) => void): void;
  /** Ereignis-Handler entfernen. */
  off(event: string, fn: (e: any) => void): void;
  /** Eigenes Ereignis auslösen. */
  emit(event: string, e?: object): void;
  /** Feste Schrittweite (höchstens 5 Schritte pro Bild). */
  fixed(hz: number, fn: (step: number) => void): Timer;
  /** Modul registrieren (Lebenszyklus, Eigentum, Zustand). */
  module(name: string, def: ModuleDef | ((ctx: ModuleCtx) => void)): void;
  /** Module abfragen und schalten. */
  readonly modules: ModulesApi;
  /** Simulationszeit in Sekunden (steht in der Pause). */
  readonly time: number;
  /** Alle Zeiten: sim, real, dt, rdt, scale, frame, paused. */
  readonly clock: Clock;
  /** Zeitfaktor der Simulation (0 … 4). */
  timeScale: number;
  /** Messwerte (Bildzeiten, Objekte, Systeme, Zeichenaufrufe …). */
  stats(o?: { scene?: boolean }): Stats;
  /** Diagnose-Anzeige ein/aus. */
  diag(on?: boolean): void;
  /** Wiederholter Zeitgeber (Simulationszeit). */
  every(sec: number, fn: () => void): Timer;
  /** Einmaliger Zeitgeber (Simulationszeit). */
  after(sec: number, fn: () => void): Timer;
  /** Einfache Textanzeige. */
  readonly hud: Hud;
  /** Spiel gewonnen. */
  win(text?: string): void;
  /** Spiel verloren. */
  lose(text?: string): void;
  /** Spiel neu starten. */
  restart(): void;
  /** Feindschaft zwischen Teams festlegen. */
  setHostile(a: string, b: string, v?: boolean): void;
  /** Teamfarbe lesen oder setzen. */
  teamColor(team: string, color?: string | number): number | void;
  /** Sind die Teams verfeindet? */
  isHostile(a: string, b?: string): boolean;
  /** Tageszeit setzen (0–24). */
  hour(h: number): void;
  /** Klang abspielen. */
  sound(name: string, vol?: number): void;
  /** Zufallszahl von a bis b. */
  random(a?: number, b?: number): number;
  /** Text ins Protokollfeld des Studios schreiben. */
  log(...args: any[]): void;
}

/** Ereignisse für game.on(name, fn). */
export type GameEvent = 'start' | 'update' | 'kill' | 'spawn' | 'pickup' | 'use' | 'playerDeath' | 'key' | 'click' | 'cancel' | 'pause' | 'resume' | 'arrive' | 'unreachable' | 'thingDestroyed' | 'thingHit' | 'load' | 'module' | 'controller';

declare const game: Game;
export { game };
