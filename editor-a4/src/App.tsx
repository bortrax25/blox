import "@blocknote/mantine/style.css";
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
import { useEffect, useMemo } from "react";
import { loadDocument, saveDocument } from "./storage";

const schema = withMultiColumn(BlockNoteSchema.create());

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

export default function App() {
  const editor = useCreateBlockNote({
    schema,
    initialContent: loadDocument<typeof schema.PartialBlock>(),
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
      saveDocument(editor.document);
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

  const exportPdf = () => {
    // Quita el foco para que no se impriman cursor ni menús flotantes.
    (document.activeElement as HTMLElement | null)?.blur();
    window.print();
  };

  return (
    <main className="desk">
      <button type="button" className="pdf-button" onClick={exportPdf}>
        PDF
      </button>
      <div className="a4-sheet">
        <BlockNoteView editor={editor} theme="light" slashMenu={false}>
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={getSlashMenuItems}
          />
        </BlockNoteView>
      </div>
    </main>
  );
}
