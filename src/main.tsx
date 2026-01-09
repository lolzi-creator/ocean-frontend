import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Suppress MetaMask/browser extension errors in console (they're harmless)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (e.message?.includes('MetaMask') || e.message?.includes('Failed to connect')) {
      e.preventDefault()
      return false
    }
  })

  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason?.message?.includes('MetaMask') || e.reason?.message?.includes('Failed to connect')) {
      e.preventDefault()
      return false
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
