// core/save.js – Speicherstand (localStorage, versioniert). Einstellungen (Lautstärke, Grafik) liegen getrennt in "dp_cfg".
// Aufbau:  { v, res:{ore}, unlocked:[zoneIds], zones:{ <zoneId>: <was die Zone in save() liefert> } }
// Globale Ressourcen (res) gehören dem ganzen Planeten: Die Basis erzeugt Erz, spätere Zonen (z. B. Tower Defense) geben es aus.
window.Save = (() => {
  const KEY = 'dp_save', VER = 1;
  const fresh = () => ({ v: VER, res: { ore: 0 }, unlocked: [], zones: {} });
  let D = fresh(), dirty = false;
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.v === VER) D = Object.assign(fresh(), s); } catch (e) { /* kaputter Stand -> neu beginnen */ }
  const S = {
    get data() { return D; },
    get res() { return D.res; },
    zone(id) { return D.zones[id] || null; },
    setZone(id, data) { D.zones[id] = data; dirty = true; },
    unlocked(id) { return D.unlocked.includes(id); },
    unlock(id) { if (!S.unlocked(id)) { D.unlocked.push(id); dirty = true; } },
    flush() { if (!dirty) return; try { localStorage.setItem(KEY, JSON.stringify(D)); dirty = false; } catch (e) { /* Speicher voll/gesperrt: Spiel läuft weiter */ } },
    reset() { D = fresh(); dirty = false; try { localStorage.removeItem(KEY); } catch (e) { } },
  };
  return S;
})();
