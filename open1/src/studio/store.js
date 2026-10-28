// Projektmodelle im Browser merken (IndexedDB), damit sie nach dem Neuladen der Seite noch da sind.
// Alles ist optional: ohne IndexedDB (privates Fenster, gesperrt) arbeitet das Studio nur mit der laufenden Sitzung.
const DB = 'forge-studio', STORE = 'models';

function open() {
  return new Promise((res, rej) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
}
const run = async (mode, fn) => {
  const db = await open();
  try {
    return await new Promise((res, rej) => { const tx = db.transaction(STORE, mode), st = tx.objectStore(STORE), r = fn(st); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
  } finally { db.close(); }
};

export const modelStore = {
  all: () => run('readonly', (s) => s.getAll()).then((x) => x ?? []).catch(() => []),
  put: (rec) => run('readwrite', (s) => s.put(rec)).then(() => true).catch(() => false),
  del: (id) => run('readwrite', (s) => s.delete(id)).then(() => true).catch(() => false),
};
