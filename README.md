# Editor A4 (BlockNote)

Editor minimalista: una hoja blanca A4 con texto e imágenes como bloques movibles al estilo Notion, y un botón para exportar a PDF.

El plan de implementación está en [PLAN.md](PLAN.md). Para empezar con Claude Code: *"Lee PLAN.md y ejecútalo paso por paso"*.

## Uso

```bash
cd editor-a4
npm install
npm run dev
```

Abre http://localhost:5173. Escribe en la hoja, usa `/` para insertar títulos, imágenes o columnas, y arrastra los bloques con el asa ⋮⋮ (soltar en el borde derecho de un bloque, o en el margen a su izquierda, crea columnas). El botón **PDF** abre el diálogo de impresión: elige "Guardar como PDF". El documento se guarda solo en el navegador.

Las líneas punteadas grises marcan dónde cortará cada página al imprimir (los márgenes de 20 mm se repiten en cada página).
