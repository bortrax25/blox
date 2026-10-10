# blox

Editor minimalista: una hoja A4 con texto e imágenes como bloques movibles al estilo Notion, con dos modos de aspecto y descarga directa a PDF.

- **Web:** https://bortrax25.github.io/blox/ — para usarlo fuera de casa, también en el celular.
- **Local:** doble clic en `Abrir blox.command` (arranca el servidor y abre Chrome en http://localhost:5317). Cierra la ventana de Terminal para apagarlo.

El plan original de implementación está en [PLAN.md](PLAN.md).

## Uso

Escribe en la hoja, usa `/` para insertar títulos, imágenes o columnas, y arrastra los bloques con el asa ⋮⋮ (soltar en el borde derecho de un bloque, o en el margen a su izquierda, crea columnas).

- **1 · 2 · 3**: modo 1 (hoja blanca A4, Arial), modo 2 (editor oscuro estilo Zed, Lilex) o modo 3 (el 2 con Aptos en pantalla; su PDF va en Arial). Aptos solo se ve en equipos que la tienen instalada; si no, Arial.
- **PDF**: descarga el PDF con un clic. En local lo genera un Chrome sin ventana con la misma hoja de impresión que ves; en la web se arma en el navegador (texto seleccionable, los saltos de línea pueden variar un poco).
- **Guardar / Abrir**: descarga o abre un archivo `.blox` editable (texto + imágenes) para pasar un documento entre la web y el Mac, o guardarlo en Drive.

## Dónde se guardan los documentos

Solo en el navegador donde escribes (IndexedDB); las imágenes van dentro del documento. Nada se sube a GitHub ni a ningún servidor, y la web y el local tienen documentos separados. En iPhone/Safari, los datos de un sitio que no visitas en 7 días pueden borrarse (salvo que lo agregues a la pantalla de inicio): descarga lo importante.

## Desarrollo

```bash
cd editor-a4
npm install
npm run dev     # http://localhost:5317
npm run build   # versión web en dist/
```

Cada push a `main` publica la versión web con GitHub Actions (`.github/workflows/deploy.yml`).

Las líneas punteadas grises marcan dónde cortará cada página al imprimir (los márgenes de 20 mm se repiten en cada página).
