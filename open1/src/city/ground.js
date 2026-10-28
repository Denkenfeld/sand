// Bodenkarte der Stadt: Straßen, Plätze, festgestampfte Höfe und Schmutzflecken werden einmal in eine RGBA-Textur
// gezeichnet (R Straße · G Pflaster · B Festerde · A Ruß/Öl) und vom Boden-Shader über die Weltkoordinaten gelesen.
import * as THREE from 'three';
import { mulberry32 } from '../core/noise.js';
import { KINDS } from './catalog.js';

export const MAP_EXTENT = 360; // Meter vom Mittelpunkt (Karte deckt −360…+360 ab)

function layer(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000';
  g.fillRect(0, 0, size, size);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  draw(g);
  return g.getImageData(0, 0, size, size).data;
}

export function buildCityMap(city, size = 2048) {
  const k = size / (2 * MAP_EXTENT);
  const X = (x) => (x + MAP_EXTENT) * k;
  const soft = (g, passes, fn) => { for (const [grow, a] of passes) { g.globalAlpha = a; fn(grow); } g.globalAlpha = 1; };

  const road = layer(size, (g) => {
    g.strokeStyle = '#fff';
    soft(g, [[1.6, 0.35], [0.6, 0.7], [0, 1]], (grow) => {
      for (const r of city.roads) {
        g.lineWidth = (r.hw * 2 + grow) * k;
        g.beginPath();
        r.pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), X(z)) : g.moveTo(X(x), X(z))));
        if (r.closed) g.closePath();
        g.stroke();
      }
    });
  });

  const plaza = layer(size, (g) => {
    g.fillStyle = '#fff';
    for (const p of city.plazas) {
      if (p.kind !== 'paving') continue;
      soft(g, [[1.2, 0.5], [0, 1]], (grow) => {
        g.beginPath();
        g.arc(X(p.x), X(p.z), (p.r + grow) * k, 0, Math.PI * 2);
        g.fill();
      });
    }
  });

  const rng = mulberry32(city.seed * 31 + 7);
  const dirt = layer(size, (g) => {
    g.fillStyle = '#fff';
    const obb = (o, grow) => {
      g.save();
      g.translate(X(o.x), X(o.z));
      g.rotate(-Math.atan2(o.s, o.c));
      g.fillRect(-(o.hx + grow) * k, -(o.hz + grow) * k, (o.hx + grow) * 2 * k, (o.hz + grow) * 2 * k);
      g.restore();
    };
    for (const p of city.plazas) {
      if (p.kind === 'paving') continue;
      soft(g, [[2.5, 0.4], [0, 0.95]], (grow) => {
        if (p.type === 'circle') { g.beginPath(); g.arc(X(p.x), X(p.z), (p.r + grow) * k, 0, Math.PI * 2); g.fill(); }
        else {
          g.save(); g.translate(X(p.x), X(p.z)); g.rotate(-p.rot);
          g.fillRect(-(p.w / 2 + grow) * k, -(p.d / 2 + grow) * k, (p.w + grow * 2) * k, (p.d + grow * 2) * k);
          g.restore();
        }
      });
    }
    for (const p of city.placements) {
      const info = KINDS[p.kind];
      if (!info || (info.type !== 'building' && info.type !== 'wall') || p.kind === 'wallSection' || p.kind === 'wallTower') continue;
      const big = info.group === 'industrie' || info.group === 'militaer' || p.kind === 'spaceport' || p.kind === 'fortress';
      soft(g, [[big ? 4.5 : 3.4, 0.28], [big ? 2.8 : 1.8, 0.45], [big ? 1.2 : 0.7, 0.55]], (grow) => obb(p.ob, grow));
    }
    // Karawanenwege vor den Toren: festgetreten
    g.strokeStyle = '#fff';
    soft(g, [[7, 0.3], [3, 0.4]], (grow) => {
      for (const r of city.roads) {
        if (r.cls !== 'out') continue;
        g.lineWidth = (r.hw * 2 + grow) * k;
        g.beginPath();
        r.pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), X(z)) : g.moveTo(X(x), X(z))));
        g.stroke();
      }
    });
  });

  const stain = layer(size, (g) => {
    g.fillStyle = '#fff';
    const blob = (x, z, r, a) => {
      const gr = g.createRadialGradient(X(x), X(z), 0, X(x), X(z), r * k);
      gr.addColorStop(0, `rgba(255,255,255,${a})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(X(x), X(z), r * k, 0, Math.PI * 2); g.fill();
    };
    for (const p of city.placements) {
      const info = KINDS[p.kind];
      if (!info) continue;
      if (info.group === 'industrie' && info.type === 'building') for (let i = 0; i < 3; i++) blob(p.ob.x + (rng() - 0.5) * p.ob.hx * 3, p.ob.z + (rng() - 0.5) * p.ob.hz * 3, 2 + rng() * 3.5, 0.55);
      else if (p.kind === 'brazier' || p.kind === 'torchTower') blob(p.x, p.z, 1.6, 0.7);
      else if (['smelter', 'refinery', 'factory', 'hangar', 'sandDriller'].includes(p.kind)) blob(p.ob.x, p.ob.z, 7, 0.5);
      else if (['duneBuggy', 'hoverSkiff', 'harvester', 'crawler', 'tank'].includes(p.kind)) blob(p.x, p.z, 2.2, 0.4);
      else if (p.kind === 'junkPile') blob(p.x, p.z, 2.5, 0.55);
    }
    // Zufällige Ölflecken und Ruß in Werks-/Garnisonsbezirk, an Wegrändern in der Stadt
    for (let i = 0; i < 160; i++) {
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * (city.wallR - 15);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const d = city.districtAt(x, z);
      if (d === 'industrial' || d === 'garrison' || d === 'slum' || d === 'port') blob(x, z, 1.5 + rng() * 3, 0.45);
    }
  });

  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = road[i * 4];
    data[i * 4 + 1] = plaza[i * 4];
    data[i * 4 + 2] = dirt[i * 4];
    data[i * 4 + 3] = stain[i * 4];
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.flipY = false;
  tex.needsUpdate = true;
  return { tex, box: [-MAP_EXTENT, -MAP_EXTENT, 2 * MAP_EXTENT] };
}
