import type { BlockNoteEditor } from "@blocknote/core";
import arimoBold from "@fontsource/arimo/files/arimo-latin-700-normal.woff?url";
import arimoRegular from "@fontsource/arimo/files/arimo-latin-400-normal.woff?url";
import lilexBold from "@fontsource/lilex/files/lilex-latin-700-normal.woff?url";
import lilexRegular from "@fontsource/lilex/files/lilex-latin-400-normal.woff?url";
import type { Mode } from "./storage";

// PDF de la versión web (sin servidor): BlockNote rehace el documento con
// react-pdf, así el texto queda seleccionable. Se carga al primer clic en PDF.

const MM = 72 / 25.4; // puntos por milímetro

const FONTS = [
  { family: "Arimo", src: arimoRegular },
  { family: "Arimo", src: arimoBold, fontWeight: "bold" as const },
  { family: "Lilex", src: lilexRegular },
  { family: "Lilex", src: lilexBold, fontWeight: "bold" as const },
];

// Lo mismo que muestra la pantalla en cada modo (ver index.css).
const PAGE = {
  1: { fontFamily: "Arimo", fontSize: 12, lineHeight: 1.5, color: "#000000" },
  2: {
    fontFamily: "Lilex",
    fontSize: 15 * 0.75,
    lineHeight: 1.618,
    color: "#cccccc",
    backgroundColor: "#1f1f1f",
  },
};

export async function exportPdfInBrowser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>,
  mode: Mode,
  name: string,
): Promise<void> {
  const [{ PDFExporter, pdfDefaultSchemaMappings }, { pdf }] = await Promise.all([
    import("@blocknote/xl-pdf-exporter/react-pdf"),
    import("@react-pdf/renderer"),
  ]);

  const exporter = new PDFExporter(editor.schema, pdfDefaultSchemaMappings, {
    fonts: FONTS,
    // Las imágenes ya son data URL: nada de pasarlas por el proxy de BlockNote.
    resolveFileUrl: async (url) => url,
  });
  exporter.styles.page = {
    ...exporter.styles.page,
    paddingTop: 20 * MM,
    paddingBottom: 20 * MM,
    paddingHorizontal: 20 * MM,
    ...PAGE[mode],
  };

  const doc = await exporter.toReactPDFDocument(editor.document);
  const blob = await pdf(doc).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
