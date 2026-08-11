import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/space-grotesk'
import App from './App.tsx'
import './styles.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root-Element fehlt')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
