import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";

export default function App() {
  const editor = useCreateBlockNote();
  return <BlockNoteView editor={editor} theme="light" />;
}
