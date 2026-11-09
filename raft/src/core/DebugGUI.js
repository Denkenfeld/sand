import GUI from 'lil-gui';
import { waveState } from '../util/waves.js';

/**
 * lil-gui debug / look-dev panel. Toggle with G (or open with ?debug).
 * Every control writes straight to the live objects, so tuning the look needs no reload.
 */
export function createDebugGUI(game) {
  const gui = new GUI({ title: 'Raft – Debug', width: 280 });
  gui.domElement.style.zIndex = 20;
  const { ocean, sky, raft, post } = game;

  const f1 = gui.addFolder('Ozean');
  f1.add(waveState, 'ampScale', 0.2, 3, 0.01).name('Wellenhöhe');
  f1.add(ocean.uniforms.uFoamAmount, 'value', 0, 2, 0.01).name('Schaum');
  f1.add(ocean.uniforms.uClarity, 'value', 0.2, 1, 0.01).name('Klarheit (alpha)');
  f1.addColor({ c: '#' + ocean.uniforms.uShallow.value.getHexString() }, 'c').name('Flachwasser').onChange((v) => ocean.uniforms.uShallow.value.set(v));
  f1.addColor({ c: '#' + ocean.uniforms.uDeep.value.getHexString() }, 'c').name('Tiefsee').onChange((v) => ocean.uniforms.uDeep.value.set(v));

  const f2 = gui.addFolder('Himmel / Zeit');
  const tod = { hours: sky.hours };
  f2.add(tod, 'hours', 0, 24, 0.05).name('Uhrzeit').onChange((v) => { sky.auto = false; sky.setTime(v); });
  f2.add(sky, 'auto').name('Tag-Nacht-Zyklus');
  f2.add(sky, 'daySeconds', 30, 900, 10).name('Tageslänge (s)');
  f2.add(sky.uniforms.uFogDensity, 'value', 0, 0.002, 0.00005).name('Nebel').onChange((v) => { sky.scene.fog.density = v; });

  const f3 = gui.addFolder('Floß-Physik');
  f3.add(raft, 'heaveFreq', 1.5, 6, 0.05).name('Federsteifigkeit');
  f3.add(raft, 'damping', 0.05, 1, 0.01).name('Dämpfung');
  f3.add(raft, 'rotRatio', 0.4, 1.2, 0.01).name('Kipp-Trägheit');
  f3.add(raft, 'weight', 0, 3, 0.05).name('Spielergewicht');
  f3.add({ v: raft.drift.length() }, 'v', 0, 3, 0.05).name('Drift (m/s)').onChange((v) => { raft.drift.setLength(v); raft.speed = v; });

  const f4 = gui.addFolder('Post-Processing');
  const P = post.params;
  f4.add(P, 'exposure', 0.2, 1.5, 0.01).name('Belichtung');
  f4.add(P, 'bloom', 0, 2, 0.01).name('Bloom');
  f4.add(P, 'bloomThreshold', 0.3, 4, 0.05).name('Bloom-Schwelle');
  f4.add(P, 'saturation', 0.6, 1.8, 0.01).name('Sättigung');
  f4.add(P, 'contrast', 0.7, 1.5, 0.01).name('Kontrast');
  f4.add(P, 'splitTone', 0, 1, 0.01).name('Teal/Orange');
  f4.add(P, 'vignette', 0, 1, 0.01).name('Vignette');
  f4.add(P, 'aberration', 0, 0.003, 0.0001).name('Chrom. Aberration');
  f4.add(P, 'grain', 0, 0.15, 0.001).name('Filmkorn');
  f4.add(P, 'dof').name('Tiefenschärfe');
  f4.add(P, 'dofFocus', 0.5, 30, 0.1).name('Fokus (m)');

  const f5 = gui.addFolder('Kamera');
  f5.add(game.camRig, 'sens', 0.0006, 0.006, 0.0001).name('Maus-Empfindl.');
  f5.add(game.camRig, 'fovBase', 40, 100, 1).name('FOV');

  f1.close(); f2.close(); f3.close(); f5.close();
  gui.show(false); gui._hidden = true;
  return gui;
}
