// Colores de texto y de resaltado del modo 2: tonos tierra apagados, en la
// línea de la tarjeta del compañero, en vez de los saturados de BlockNote.
// Fondos = el tono al 24 % sobre #1f1f1f. Contraste (WCAG AA): cada color de
// texto ≥ 5.8:1 sobre la página y el texto normal ≥ 5.9:1 sobre cada fondo.
// La pantalla los usa como variables CSS y el PDF web como colores del exportador.

export const MODE2_COLORS = {
  gray: { text: "#a3a39c", background: "#3f3f3d" },
  brown: { text: "#b8917a", background: "#443a35" },
  red: { text: "#d98b7a", background: "#4c3935" },
  orange: { text: "#d9a066", background: "#4c3e30" },
  yellow: { text: "#d6c07a", background: "#4b4635" },
  green: { text: "#97b493", background: "#3c433b" },
  blue: { text: "#8aaccb", background: "#394148" },
  purple: { text: "#ad9bd0", background: "#413d49" },
  pink: { text: "#d197b6", background: "#4a3c43" },
};

const entries = Object.entries(MODE2_COLORS);

export const MODE2_PALETTE_CSS = `
[data-mode="2"] .bn-container {
${entries
  .map(
    ([name, c]) =>
      `  --bn-colors-highlights-${name}-text: ${c.text};\n  --bn-colors-highlights-${name}-background: ${c.background};`,
  )
  .join("\n")}
}
${entries
  .map(
    ([name, c]) =>
      `[data-mode="2"] .a4-sheet .bn-block:has(> .bn-block-content[data-background-color="${name}"]) { box-shadow: 0 0 0 5px ${c.background}; }`,
  )
  .join("\n")}
`;
