// zones/registry.js – Liste aller Zonen auf dem Planeten. Eine neue Zone = eine Zeile hier + eine Datei zones/<id>/zone.js.
// at() wird erst zur Laufzeit ausgewertet (CD = Kraterrichtung aus core/physics.js).
Zones.register({ id: 'level11', name: 'Notfallbasis-Mission', src: 'zones/level11.js' });
Zones.register({ id: 'basis', name: 'Notfallbasis', src: ['zones/basis/data.js', 'zones/basis/sim.js', 'zones/basis/models.js', 'zones/basis/zone.js'], at: () => CD, radius: 90, color: '#40d0ff' });
// Beispiel für später:
// Zones.register({ id: 'tower', name: 'Wachposten', src: 'zones/tower/zone.js', at: () => dirFromAngle(2.1, 600), radius: 70, color: '#ff5a40' });
