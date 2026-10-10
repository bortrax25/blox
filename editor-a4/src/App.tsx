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
import { MODE2_PALETTE_CSS } from "./palette";
import { Companion } from "./companion/Companion";
import {
  loadMode,
  saveDocument,
  saveDocumentBeforeUnload,
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

// Título del manuscrito para el compañero: la primera línea, cortada en una palabra.
function shortTitle(name: string): string {
  if (name === "blox") return "Sin título";
  if (name.length <= 40) return name;
  const cut = name.slice(0, 40);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 20 ? cut.lastIndexOf(" ") : 40)}…`;
}

type TextBlock = { content?: unknown; children?: TextBlock[] };

// Palabras del documento (texto de todos los bloques, incluidos los anidados).
function countWords(blocks: TextBlock[]): number {
  let n = 0;
  for (const block of blocks) {
    if (Array.isArray(block.content)) {
      const text = block.content.map((c: { text?: string }) => c.text ?? "").join("");
      n += text.match(/\S+/g)?.length ?? 0;
    }
    n += countWords(block.children ?? []);
  }
  return n;
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

  const [words, setWords] = useState(() => countWords(editor.document));
  const [lastTypedAt, setLastTypedAt] = useState(0);

  // Autoguardado con debounce; al salir de la página se guarda lo pendiente.
  useEffect(() => {
    let timer: number | undefined;
    const flush = () => {
      if (timer === undefined) return;
      window.clearTimeout(timer);
      timer = undefined;
      void saveDocument(editor.document);
    };
    const flushBeforeUnload = () => {
      if (timer === undefined) return;
      window.clearTimeout(timer);
      timer = undefined;
      saveDocumentBeforeUnload(editor.document);
    };
    const unsubscribe = editor.onChange(() => {
      setWords(countWords(editor.document));
      setLastTypedAt(Date.now());
      window.clearTimeout(timer);
      timer = window.setTimeout(flush, AUTOSAVE_DELAY_MS);
    });
    window.addEventListener("pagehide", flushBeforeUnload);
    return () => {
      flush();
      unsubscribe();
      window.removeEventListener("pagehide", flushBeforeUnload);
    };
  }, [editor]);

  // El modo vive en <html> para que también pinte el fondo de la página.
  useEffect(() => {
    // El modo 3 es el 2 con otra tipografía: comparte todos sus estilos.
    document.documentElement.dataset.mode = mode === 1 ? "1" : "2";
    document.documentElement.dataset.font = mode === 3 ? "aptos" : "";
    saveMode(mode);
  }, [mode]);

  // Modo 1: escala de la hoja A4 para que quepa en el ancho disponible
  // (descontando el espacio de la tarjeta); ver index.css.
  useEffect(() => {
    const desk = document.querySelector<HTMLElement>(".desk");
    if (!desk) return;
    const sheetPx = (210 * 96) / 25.4;
    const fit = () => {
      const style = getComputedStyle(desk);
      const available = desk.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const scale = Math.min(1, available / sheetPx);
      document.documentElement.style.setProperty("--sheet-scale", scale.toFixed(4));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(desk);
    return () => observer.disconnect();
  }, []);

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

  const fileInput = useRef<HTMLInputElement>(null);

  // En local (servidor de Vite) el PDF lo genera un Chrome sin ventana y llega
  // como descarga; el formulario apunta a un iframe oculto para no navegar.
  // En la web no hay servidor: el PDF se arma en el navegador.
  const exportPdf = async () => {
    const name = pdfName(editor.document);
    if (!import.meta.env.DEV) {
      const { exportPdfInBrowser } = await import("./pdf-web");
      await exportPdfInBrowser(editor, mode, name);
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
          {([1, 2, 3] as const).map((m) => (
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
      <style>{MODE2_PALETTE_CSS}</style>
      {mode !== 1 && cursorBlockId && (
        <style>{`.a4-sheet .bn-block[data-id="${cursorBlockId}"] > .bn-block-content:not([data-background-color]) { background: var(--zed-active-line); box-shadow: 0 0 0 100vmax var(--zed-active-line); clip-path: inset(0 -100vmax); }`}</style>
      )}
      <Companion
        words={words}
        lastTypedAt={lastTypedAt}
        docTitle={shortTitle(pdfName(editor.document))}
        onPublish={exportPdf}
      />
      <iframe name="pdf-download" title="Descarga del PDF" hidden />
      <div className="a4-sheet">
        <BlockNoteView
          editor={editor}
          theme={mode === 1 ? "light" : "dark"}
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
