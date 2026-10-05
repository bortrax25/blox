import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App, { type AppBlock } from './App.tsx'
import { loadDocument } from './storage.ts'

// Pide al navegador no borrar el documento cuando le falte espacio.
void navigator.storage?.persist?.()

// El editor necesita el contenido inicial al crearse, así que se lee antes de pintar.
const initialContent = await loadDocument<AppBlock>()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App initialContent={initialContent} />
  </StrictMode>,
)
