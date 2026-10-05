const LEGACY_KEY = "editor-a4:document";
const DB_NAME = "blox";
const STORE = "kv";
const DOC_KEY = "document";

// IndexedDB en vez de localStorage: las imágenes van dentro del documento como
// data URL y localStorage se llena con ~5 MB.
let db: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
  db ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return db;
}

async function run<T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const store = (await openDb()).transaction(STORE, mode).objectStore(STORE);
  return new Promise((resolve, reject) => {
    const req = op(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function validBlocks<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) && value.length > 0 ? (value as T[]) : undefined;
}

// Lee el documento guardado; devuelve undefined si no hay nada válido.
// Lo que haya en localStorage (versiones anteriores, o el PDF local que lo deja
// ahí) tiene prioridad: se pasa a IndexedDB y se borra de localStorage.
export async function loadDocument<T>(): Promise<T[] | undefined> {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const blocks = validBlocks<T>(JSON.parse(legacy));
      if (blocks) await run("readwrite", (s) => s.put(blocks, DOC_KEY));
      localStorage.removeItem(LEGACY_KEY);
      return blocks;
    }
  } catch (error) {
    console.warn("No se pudo migrar el documento de localStorage", error);
  }
  try {
    return validBlocks<T>(await run("readonly", (s) => s.get(DOC_KEY)));
  } catch {
    return undefined;
  }
}

export async function saveDocument(blocks: unknown[]): Promise<void> {
  try {
    await run("readwrite", (s) => s.put(blocks, DOC_KEY));
  } catch (error) {
    // Disco lleno o almacenamiento bloqueado (p. ej. navegación privada).
    console.warn("No se pudo guardar el documento", error);
  }
}

// Al cerrar la página no da tiempo a terminar una escritura en IndexedDB:
// localStorage es síncrono, y loadDocument lo pasa a IndexedDB al volver.
// Si no cabe (imágenes grandes), se intenta igual con IndexedDB.
export function saveDocumentBeforeUnload(blocks: unknown[]): void {
  try {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(blocks));
  } catch {
    void saveDocument(blocks);
  }
}

export type Mode = 1 | 2;

const MODE_KEY = "editor-a4:mode";

export function loadMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === "2" ? 2 : 1;
  } catch {
    return 1;
  }
}

export function saveMode(mode: Mode): void {
  try {
    localStorage.setItem(MODE_KEY, String(mode));
  } catch {
    // Almacenamiento bloqueado: el modo solo dura esta sesión.
  }
}
