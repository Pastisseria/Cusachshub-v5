// These records are local documents, never a queue of server mutations.
const DATABASE = 'cusachs-local-budgets';

function ownerKey(project, userId) {
  if (!project || !userId) throw new Error('Inicia sesión antes de guardar en este dispositivo.');
  return JSON.stringify([project, userId]);
}

async function transaction(mode, action) {
  if (typeof indexedDB === 'undefined') throw new Error('Este navegador no permite guardar documentos en el dispositivo. Mantén el formulario abierto.');
  return new Promise((resolve, reject) => {
    let db, result, activeTransaction, finished = false;
    const finish = (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (error) { try { activeTransaction?.abort(); } catch { /* Already complete. */ } }
      db?.close();
      if (error) reject(new Error('No se pudo guardar o leer el documento local. Comprueba el espacio disponible y mantén el formulario abierto.'));
      else resolve(result);
    };
    const timer = setTimeout(() => finish(true), 5000);
    let open;
    try { open = indexedDB.open(DATABASE, 1); } catch { finish(true); return; }
    open.onupgradeneeded = () => {
      const store = open.result.createObjectStore('budgets', { keyPath: 'key' });
      store.createIndex('owner', 'owner');
    };
    open.onerror = () => finish(true);
    open.onblocked = () => finish(true);
    open.onsuccess = () => {
      db = open.result;
      if (finished) { db.close(); return; }
      try {
        const tx = db.transaction('budgets', mode);
        activeTransaction = tx;
        const request = action(tx.objectStore('budgets'));
        request.onsuccess = () => { result = request.result; };
        tx.oncomplete = () => finish(false);
        tx.onerror = tx.onabort = () => finish(true);
      } catch { finish(true); }
    };
  });
}

export async function listLocalBudgets(project, userId) {
  const owner = ownerKey(project, userId);
  const records = await transaction('readonly', store => store.index('owner').getAll(owner));
  return records.map(record => record.document).sort((a,b) => b.updated_at.localeCompare(a.updated_at));
}

export async function saveLocalBudget(project, userId, data, lines, original = null) {
  const owner = ownerKey(project, userId);
  const id = original?.solo_local ? original.id : original?.id ? `local-${original.id}` : `local-${crypto.randomUUID()}`;
  const document = {
    ...data, id, solo_local: true,
    origen_id: original?.origen_id || (original?.solo_local ? null : original?.id) || null,
    numero: original?.numero || `LOCAL-${id.slice(-8).toUpperCase()}`,
    created_at: original?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    lineas_locales: structuredClone(lines),
  };
  await transaction('readwrite', store => store.put({ key: JSON.stringify([owner,id]), owner, document }));
  return document;
}

export async function deleteLocalBudget(project, userId, id) {
  const owner = ownerKey(project, userId);
  await transaction('readwrite', store => store.delete(JSON.stringify([owner,id])));
}
