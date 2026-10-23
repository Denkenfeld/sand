// Gemeinsame Parameter-Bausteine für Objekt-Definitionen.
export const damageParam = (value = 0.35) => ({
  key: 'damage', label: 'Beschädigung', type: 'range', min: 0, max: 1, step: 0.01, value,
  fmt: (v) => Math.round(v * 100) + ' %',
});
export const seedParam = (value = 7) => ({ key: 'seed', label: 'Zufall (Seed)', type: 'seed', value });
export const PAL_OPTIONS = [
  ['sand', 'Sand'], ['gray', 'Grau'], ['rust', 'Rost'], ['blue', 'Blau, verblasst'],
  ['white', 'Weiß, verwittert'], ['olive', 'Oliv'], ['red', 'Rot, verblasst'], ['black', 'Schwarz'],
];
export const CLAY_OPTIONS = [['sand', 'Sandstein'], ['ochre', 'Ocker'], ['adobe', 'Lehmbraun'], ['white', 'Gekalkt'], ['dark', 'Dunkel'], ['red', 'Rötlich']];
