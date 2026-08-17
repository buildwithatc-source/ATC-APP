import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { platform } from './lib/platform'
import './index.css'

// One-time host setup (mobile locks orientation to landscape; desktop no-op).
void platform.init?.()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
