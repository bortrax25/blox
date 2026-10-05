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
import { useMemo } from "react";

const schema = withMultiColumn(BlockNoteSchema.create());

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
    uploadFile: fileToDataUrl,
    dropCursor: multiColumnDropCursor,
    dictionary: {
      ...locales.es,
      multi_column: multiColumnLocales.es,
    },
  });

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

  return (
    <main className="desk">
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
