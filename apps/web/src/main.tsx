import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ToastProvider } from './components/ui/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'

// Habilita los estilos :active al tocar en iOS Safari (por defecto los ignora
// salvo que exista un listener táctil) — necesario para que los efectos de
// hover del sidebar/tarjetas también se sientan al tocar en celular.
document.addEventListener('touchstart', () => {}, true)

// Service worker: habilita "Instalar app" (PWA) y las notificaciones del
// sistema con vibración desde NotificacionesBell.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
