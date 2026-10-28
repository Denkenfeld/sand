// core/zones.js – Zonen-Manager.  Der Kern lädt eine Zone beim Betreten nach und gibt sie beim Verlassen wieder frei.
//
// ZONEN-VERTRAG (jede Zone ist eine Datei zones/<id>/zone.js, die sich mit Zones.define({...}) anmeldet):
//   id            Kennung, muss zum Eintrag in zones/registry.js passen
//   enter(g, o)   Zone starten. g = Kern-Kontext (siehe PROJEKT.md), o = Optionen vom Aufrufer (z. B. {dome}).
//                 Pro Frame aufgerufen werden soll g.hook((dt, tt) => {...}) – das ist die update-Funktion der Zone.
//   leave()       Alles entfernen, was die Zone erzeugt hat (Szene, DOM, Listener). Wird von Zones.leave(id) gerufen.
//   save()        Liefert ein JSON-fähiges Objekt mit dem Spielstand der Zone (oder nichts).
// Eintrag in zones/registry.js (Ort + Radius auf der Kugel, für Radar und Freischaltung); src = Datei oder Liste von Dateien:
//   Zones.register({ id, name, src, at: () => Vector3 (Richtung auf der Kugel), radius: Meter, color: '#rrggbb' })
window.Zones = (() => {
  const reg = {}, defs = {}, act = {};
  let mkCtx = null, autoT = null;
  const Z = {
    register(r) { reg[r.id] = Object.assign({ radius: 60, color: '#40d0ff' }, r); },
    define(impl) { defs[impl.id] = impl; },
    setContext(f) { mkCtx = f; },
    list() { return Object.values(reg); },
    get(id) { return reg[id]; },
    active() { return Object.keys(act); },
    isActive(id) { return !!act[id]; },
    // Zone nachladen (nur beim ersten Mal; danach liegt sie im Speicher)
    load(id) {
      return new Promise((res, rej) => {
        if (defs[id]) return res(defs[id]);
        const r = reg[id]; if (!r) return rej(new Error('Zone „' + id + '“ ist nicht registriert'));
        const files = [].concat(r.src), name = files[files.length - 1];       // src: eine Datei oder eine Liste (die letzte meldet die Zone an)
        const next = k => {
          if (k >= files.length) return defs[id] ? res(defs[id]) : rej(new Error(name + ' meldet keine Zone „' + id + '“ an'));
          const s = document.createElement('script'); s.src = files[k]; s.dataset.zone = id;
          s.onload = () => next(k + 1); s.onerror = () => rej(new Error(files[k] + ' nicht gefunden – Datei neben die index.html legen')); document.body.appendChild(s);
        };
        next(0);
      });
    },
    enter(id, o) {
      if (act[id]) return Promise.resolve(act[id]);
      return Z.load(id).then(impl => {
        const rec = { id, impl, update: null };
        const g = Object.assign(mkCtx ? mkCtx() : {}, { hook: f => { rec.update = f; }, zones: Z, zoneId: id });
        act[id] = rec; Z.unlock(id);
        impl.enter(g, o || {});
        Z.startAuto(); return rec;
      }).catch(e => { delete act[id]; throw e; });
    },
    leave(id) {
      const rec = act[id]; if (!rec) return;
      try { if (rec.impl.save) Save.setZone(id, rec.impl.save()); } catch (e) { console.error('save', id, e); }
      try { rec.impl.leave && rec.impl.leave(); } catch (e) { console.error('leave', id, e); }
      delete act[id]; delete defs[id]; Save.flush();                    // Definition freigeben: nächstes Betreten lädt frisch nach
      document.querySelectorAll('script[data-zone="' + id + '"]').forEach(s => s.remove());
    },
    unlock(id) { Save.unlock(id); },
    // pro Frame vom Kern aufgerufen
    update(dt, tt) { for (const k in act) { const r = act[k]; if (r.update) r.update(dt, tt); } },
    saveAll() { for (const k in act) { const r = act[k]; try { if (r.impl.save) Save.setZone(k, r.impl.save()); } catch (e) { console.error('save', k, e); } } Save.flush(); },
    startAuto() {
      if (autoT) return; autoT = setInterval(Z.saveAll, 15000);
      addEventListener('pagehide', Z.saveAll); document.addEventListener('visibilitychange', () => { if (document.hidden) Z.saveAll(); });
    },
  };
  return Z;
})();
