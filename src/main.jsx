import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { fontsReady } from './life/fonts'

// Hold the type that's set first back until its faces have loaded, so nothing
// re-wraps or slides when they swap in for the fallbacks (it all sits under
// the loader sheet meanwhile). Never waits more than 2.5 s.
const html = document.documentElement
html.classList.add('fonts-pending')
fontsReady(2500, ['400 1em Anton', '400 1em Newsreader', '900 1em Fraunces', '700 1em "JetBrains Mono"']).finally(() =>
  html.classList.remove('fonts-pending'),
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
