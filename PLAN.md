# Plan: Editor A4 minimalista con BlockNote

## Objetivo
Una app web de una sola pantalla: una **hoja blanca tamaño A4** donde escribo texto e inserto imágenes como **bloques movibles al estilo Notion** (asa ⋮⋮ para arrastrar, imágenes lado a lado con texto mediante columnas), y **un único botón "PDF"** arriba a la derecha que exporta la hoja a PDF. Nada más.

Boceto de referencia:
- Botón `PDF` en la esquina superior derecha.
- Párrafo de texto a todo el ancho.
- Imagen a la izquierda + texto a la derecha (2 columnas).
- Párrafo a todo el ancho.
- Texto + imagen al centro + texto (3 columnas).

## Stack
- Vite + React + TypeScript
- `@blocknote/core`, `@blocknote/react`, `@blocknote/mantine` (UI del editor)
- `@blocknote/xl-multi-column` (columnas al arrastrar un bloque al costado de otro)
- Sin backend. Sin login. Sin base de datos.

> Antes de escribir código, revisa la documentación actual de BlockNote (blocknotejs.org) y las versiones instaladas en `node_modules`, porque la API cambia entre versiones. No inventes nombres de funciones: verifica `withMultiColumn`, `multiColumnDropCursor`, `getMultiColumnSlashMenuItems` y el diccionario/locale en la versión instalada.

## Alcance

### Incluido
1. **Hoja A4**: contenedor de 210 mm × 297 mm (mínimo), fondo blanco, sombra suave, centrado sobre un fondo gris claro. Márgenes internos de ~20 mm. Si el contenido supera una página, la hoja crece hacia abajo.
2. **Tipografía**: Arial (fallback `"Arial", "Arimo", "Liberation Sans", sans-serif`), 11–12 pt, color negro.
3. **Editor BlockNote** dentro de la hoja con:
   - Bloques de párrafo, títulos e imagen.
   - Asa lateral para arrastrar bloques (viene por defecto).
   - Multi-columna: arrastrar un bloque al lado de otro crea columnas; ancho de columnas ajustable.
   - Imágenes redimensionables.
   - Interfaz en español (`locales.es` de BlockNote, combinado con el diccionario de multi-column).
4. **Imágenes sin servidor**: `uploadFile` convierte el archivo a data URL (base64). Permitir también pegar y arrastrar imágenes desde el escritorio.
5. **Botón PDF**: usa `window.print()` con CSS de impresión:
   - `@page { size: A4; margin: 0; }`
   - En `@media print`: ocultar botón, fondo gris, sombra, asas de arrastre, menús y placeholders; la hoja ocupa toda la página.
   - Resultado: PDF idéntico a lo que se ve, con texto seleccionable. El usuario elige "Guardar como PDF" en el diálogo.
6. **Autoguardado** en `localStorage` (el documento como JSON) para no perder el trabajo al recargar.

### Fuera de alcance (no agregar)
Barra lateral, varios documentos, colaboración, comentarios, IA, temas oscuros, login, exportar a otros formatos.

## Pasos
1. Crear proyecto: `npm create vite@latest editor-a4 -- --template react-ts`, instalar dependencias.
2. Montar un editor BlockNote básico a pantalla completa y comprobar que funciona.
3. Agregar el esquema multi-columna (esquema, drop cursor, items del slash menu, diccionario) y probar arrastrar un bloque al costado de otro.
4. Envolver el editor en la hoja A4 con su CSS. Ajustar el editor para que no tenga padding extra propio que rompa los márgenes.
5. Configurar `uploadFile` con data URL y probar insertar, redimensionar y mover imágenes.
6. Botón PDF fijo arriba a la derecha + CSS de impresión. Verificar en Chrome que el PDF sale en A4, sin elementos de interfaz y con las columnas intactas.
7. Autoguardado en `localStorage` (con debounce de ~500 ms y try/catch).
8. Opcional: líneas guía punteadas cada 297 mm para ver dónde cortará cada página al imprimir.

## Criterios de aceptación
- [ ] Al abrir, veo solo una hoja A4 blanca y el botón PDF.
- [ ] Puedo escribir párrafos en Arial.
- [ ] Puedo insertar una imagen y moverla con el asa a otra posición.
- [ ] Puedo soltar una imagen al lado de un párrafo y quedan en columnas (2 y 3 columnas).
- [ ] Puedo cambiar el tamaño de las imágenes.
- [ ] El botón PDF genera un PDF A4 que se ve igual que la pantalla, sin asas ni botones.
- [ ] Al recargar la página, el contenido sigue ahí.

## Notas
- Los paquetes `@blocknote/xl-*` son GPL-3.0 (gratis para uso personal/académico u open source).
- Si más adelante se quiere un PDF descargable directo (sin diálogo de impresión), evaluar `@blocknote/xl-pdf-exporter`, sabiendo que su diseño puede diferir un poco de la pantalla.
