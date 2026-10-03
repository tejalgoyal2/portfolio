import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Hold the hero's lead story back until its faces have loaded, so the headline
// never re-wraps in front of you when Anton swaps in for the fallback (it sits
// under the loader sheet meanwhile). Never waits more than 2.5 s.
const html = document.documentElement
html.classList.add('fonts-pending')
Promise.race([
  Promise.all(['400 1em Anton', '400 1em Newsreader'].map((f) => document.fonts?.load(f))),
  new Promise((r) => setTimeout(r, 2500)),
]).finally(() => html.classList.remove('fonts-pending'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
