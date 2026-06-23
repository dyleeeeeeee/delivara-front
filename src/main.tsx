import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import LiquidGlassDefs from './components/LiquidGlassDefs'
import './styles/global.css'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LiquidGlassDefs />
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
