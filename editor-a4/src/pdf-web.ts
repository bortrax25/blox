import type { BlockNoteEditor } from "@blocknote/core";
import arimoBold from "@fontsource/arimo/files/arimo-latin-700-normal.woff?url";
import arimoRegular from "@fontsource/arimo/files/arimo-latin-400-normal.woff?url";
import lilexBold from "@fontsource/lilex/files/lilex-latin-700-normal.woff?url";
import lilexRegular from "@fontsource/lilex/files/lilex-latin-400-normal.woff?url";
import { createElement } from "react";
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
  1: {
    fontFamily: "Arimo",
    fontSize: 12,
    lineHeight: 1.5,
    color: "#000000",
    backgroundColor: "#ffffff",
  },
  2: {
    fontFamily: "Lilex",
    fontSize: 15 * 0.75,
    lineHeight: 1.618,
    color: "#cccccc",
    backgroundColor: "#1f1f1f",
  },
};

// Ancho útil de la hoja A4 (210 mm − 2 × 20 mm de margen) en px de pantalla.
const CONTENT_WIDTH_PX = (170 * 96) / 25.4;

type Block = {
  id?: string;
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: Block[];
};

// Ajustes para que el PDF se vea como la pantalla:
// - Sin previewWidth el exportador estira la imagen a todo el ancho de la
//   página, mientras la pantalla la muestra a su tamaño original: se usa el
//   ancho que se ve en pantalla (sin pasar del ancho de la hoja).
function matchScreen(blocks: Block[]): Block[] {
  return blocks.map((block) => {
    const children = matchScreen(block.children ?? []);
    if (block.type !== "image") return { ...block, children };
    const img = document.querySelector<HTMLImageElement>(
      `.bn-block[data-id="${block.id}"] img`,
    );
    const width = img?.getBoundingClientRect().width;
    if (!width) return { ...block, children };
    return {
      ...block,
      children,
      props: { ...block.props, previewWidth: Math.min(width, CONTENT_WIDTH_PX) },
    };
  });
}

export async function exportPdfInBrowser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>,
  mode: Mode,
  name: string,
): Promise<void> {
  const [{ PDFExporter, pdfDefaultSchemaMappings }, { pdf, View }] = await Promise.all([
    import("@blocknote/xl-pdf-exporter/react-pdf"),
    import("@react-pdf/renderer"),
  ]);

  // Un párrafo vacío mide 0 en el PDF; en pantalla ocupa una línea. Se dibuja
  // como un hueco del alto de una línea (un espacio dentro del texto cuelga a
  // react-pdf con Arimo).
  const page = PAGE[mode];
  const { blockMapping } = pdfDefaultSchemaMappings;
  const mappings = {
    ...pdfDefaultSchemaMappings,
    blockMapping: {
      ...blockMapping,
      paragraph: ((block, ...rest) =>
        Array.isArray(block.content) && block.content.length === 0
          ? createElement(View, { style: { height: page.fontSize * page.lineHeight } })
          : blockMapping.paragraph(block, ...rest)) as typeof blockMapping.paragraph,
    },
  };

  const exporter = new PDFExporter(editor.schema, mappings, {
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
  // El exportador separa cada bloque 3px arriba y abajo, como el modo 1 en
  // pantalla; el modo 2 pega las líneas igual que Zed.
  if (mode === 2) exporter.styles.block = { paddingVertical: 0 };

  const doc = await exporter.toReactPDFDocument(
    matchScreen(editor.document) as typeof editor.document,
  );
  const blob = await pdf(doc).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
