const STORAGE_KEY = "editor-a4:document";

// Lee el documento guardado; devuelve undefined si no hay nada válido.
export function loadDocument<T>(): T[] | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const blocks: unknown = JSON.parse(raw);
    return Array.isArray(blocks) && blocks.length > 0 ? (blocks as T[]) : undefined;
  } catch {
    return undefined;
  }
}

export function saveDocument(blocks: unknown[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  } catch (error) {
    // Cuota llena (p. ej. imágenes muy grandes) o almacenamiento bloqueado.
    console.warn("No se pudo guardar el documento en localStorage", error);
  }
}
