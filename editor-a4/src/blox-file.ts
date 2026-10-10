import { toMode, type Mode } from "./storage";

// Archivo .blox: el documento editable (texto + imágenes) para llevarlo entre
// la web y el Mac, o guardarlo en Drive.

type BloxFile = { app: "blox"; version: 1; mode: Mode; document: unknown[] };

export function downloadBlox(document_: unknown[], mode: Mode, name: string): void {
  const file: BloxFile = { app: "blox", version: 1, mode, document: document_ };
  const blob = new Blob([JSON.stringify(file)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.blox`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function readBlox(file: File): Promise<{ mode: Mode; document: unknown[] }> {
  let data: Partial<BloxFile>;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("El archivo no es un documento de blox.");
  }
  if (data?.app !== "blox" || !Array.isArray(data.document)) {
    throw new Error("El archivo no es un documento de blox.");
  }
  return { mode: toMode(data.mode), document: data.document };
}
