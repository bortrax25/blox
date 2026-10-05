import "@blocknote/mantine/style.css";
import "@fontsource/lilex/400.css";
import "@fontsource/lilex/700.css";
import {
  BlockNoteSchema,
  combineByGroup,
  filterSuggestionItems,
} from "@blocknote/core";
import * as locales from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  getMultiColumnSlashMenuItems,
  locales as multiColumnLocales,
  multiColumnDropCursor,
  withMultiColumn,
} from "@blocknote/xl-multi-column";
import { useEffect, useMemo, useRef, useState } from "react";
import { downloadBlox, readBlox } from "./blox-file";
import {
  loadMode,
  saveDocument,
  saveMode,
  type Mode,
} from "./storage";

const schema = withMultiColumn(BlockNoteSchema.create());

export type AppBlock = typeof schema.PartialBlock;

const AUTOSAVE_DELAY_MS = 500;

// Sin servidor: las imágenes se guardan dentro del documento como data URL.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

type DocBlock = { content?: unknown; children?: DocBlock[] };

// Nombre del archivo: la primera línea con texto del documento.
function pdfName(blocks: DocBlock[]): string {
  for (const block of blocks) {
    const text = Array.isArray(block.content)
      ? block.content
          .map((c: { text?: string }) => c.text ?? "")
          .join("")
          .trim()
      : "";
    if (text) return text.slice(0, 60);
    const inner = pdfName(block.children ?? []);
    if (inner !== "blox") return inner;
  }
  return "blox";
}

export default function App({ initialContent }: { initialContent?: AppBlock[] }) {
  const [mode, setMode] = useState<Mode>(loadMode);
  const [cursorBlockId, setCursorBlockId] = useState<string>();

  const editor = useCreateBlockNote({
    schema,
    initialContent,
    uploadFile: fileToDataUrl,
    dropCursor: multiColumnDropCursor,
    dictionary: {
      ...locales.es,
      multi_column: multiColumnLocales.es,
    },
  });

  // Autoguardado con debounce; al salir de la página se guarda lo pendiente.
  useEffect(() => {
    let timer: number | undefined;
    const flush = () => {
      if (timer === undefined) return;
      window.clearTimeout(timer);
      timer = undefined;
      void saveDocument(editor.document);
    };
    const unsubscribe = editor.onChange(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(flush, AUTOSAVE_DELAY_MS);
    });
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      unsubscribe();
      window.removeEventListener("pagehide", flush);
    };
  }, [editor]);

  // El modo vive en <html> para que también pinte el fondo de la página.
  useEffect(() => {
    document.documentElement.dataset.mode = String(mode);
    saveMode(mode);
  }, [mode]);

  // Bloque donde está el cursor, para resaltar la línea actual en el modo 2.
  useEffect(
    () =>
      editor.onSelectionChange(() =>
        setCursorBlockId(editor.getTextCursorPosition().block.id),
      ),
    [editor],
  );

  const getSlashMenuItems = useMemo(
    () => async (query: string) =>
      filterSuggestionItems(
        combineByGroup(
          getDefaultReactSlashMenuItems(editor),
          getMultiColumnSlashMenuItems(editor),
        ),
        query,
      ),
    [editor],
  );

  const [pdfBusy, setPdfBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // En local (servidor de Vite) el PDF lo genera un Chrome sin ventana y llega
  // como descarga; el formulario apunta a un iframe oculto para no navegar.
  // En la web no hay servidor: el PDF se arma en el navegador.
  const exportPdf = async () => {
    const name = pdfName(editor.document);
    if (!import.meta.env.DEV) {
      setPdfBusy(true);
      try {
        const { exportPdfInBrowser } = await import("./pdf-web");
        await exportPdfInBrowser(editor, mode, name);
      } catch (error) {
        console.error("No se pudo generar el PDF", error);
        window.alert("No se pudo generar el PDF.");
      } finally {
        setPdfBusy(false);
      }
      return;
    }
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/pdf";
    form.target = "pdf-download";
    const fields = {
      document: JSON.stringify(editor.document),
      mode: String(mode),
      name,
    };
    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.append(input);
    }
    document.body.append(form);
    form.submit();
    form.remove();
  };

  const openFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = await readBlox(file);
      const hasText = pdfName(editor.document) !== "blox";
      if (hasText && !window.confirm("¿Reemplazar el documento actual por el archivo abierto?")) {
        return;
      }
      editor.replaceBlocks(editor.document, data.document as AppBlock[]);
      setMode(data.mode);
    } catch (error) {
      window.alert((error as Error).message);
    }
  };

  return (
    <main className="desk">
      <div className="top-bar">
        <div className="mode-switch" role="group" aria-label="Modo">
          {([1, 2] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              title={`Modo ${m}`}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="file-buttons">
          <button type="button" onClick={() => fileInput.current?.click()}>
            Abrir
          </button>
          <button
            type="button"
            onClick={() => downloadBlox(editor.document, mode, pdfName(editor.document))}
          >
            Guardar
          </button>
        </div>
        <button
          type="button"
          className="pdf-button"
          onClick={exportPdf}
          disabled={pdfBusy}
          aria-busy={pdfBusy}
        >
          {pdfBusy ? "…" : "PDF"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".blox,application/json"
          hidden
          onChange={(e) => {
            void openFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {mode === 2 && cursorBlockId && (
        <style>{`.a4-sheet .bn-block[data-id="${cursorBlockId}"] > .bn-block-content { background: var(--zed-active-line); box-shadow: 0 0 0 100vmax var(--zed-active-line); clip-path: inset(0 -100vmax); }`}</style>
      )}
      <iframe name="pdf-download" title="Descarga del PDF" hidden />
      <div className="a4-sheet">
        <BlockNoteView
          editor={editor}
          theme={mode === 2 ? "dark" : "light"}
          slashMenu={false}
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={getSlashMenuItems}
          />
        </BlockNoteView>
      </div>
    </main>
  );
}
