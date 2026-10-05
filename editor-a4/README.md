# editor-a4

App del editor A4 (Vite + React + TypeScript + BlockNote 0.55).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build de producción en dist/
npm run lint
```

- `src/App.tsx`: editor BlockNote con multi-columna, interfaz en español, imágenes como data URL y botón PDF.
- `src/storage.ts`: autoguardado del documento en `localStorage`.
- `src/index.css`: hoja A4, guías de salto de página y estilos de impresión.
