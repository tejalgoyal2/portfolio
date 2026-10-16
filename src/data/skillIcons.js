/**
 * The icon each skill pops out when you click it (src/sections/Skills.jsx).
 *
 *   { brand: '<slug>' } → a tool's own mark, src/life/brands/<slug>.svg
 *                          (from thesvg, @thesvg/icons 3.3.9 — see that
 *                          folder's README.md for where they come from and
 *                          how to add one)
 *   { icon: '<name>' }  → a hand-drawn generic icon, src/life/icons/<name>.svg
 *                          (matita.dev, MIT), for things that aren't a product
 *
 * Adding a skill in src/data/skills.js? Add its line here too; anything
 * missing simply has no pop-out.
 */
export const SKILL_ICONS = {
  // Security
  'CrowdStrike Falcon': { brand: 'crowdstrike' },
  'LogScale SIEM': { icon: 'chart-line' },
  EDR: { icon: 'shield-check' },
  'IAM / Okta': { brand: 'okta' },
  'MITRE ATT&CK': { icon: 'crosshair' },
  'Incident Response': { icon: 'triangle-alert' },
  VirusTotal: { brand: 'virustotal' },
  'Device Trust': { icon: 'laptop' },
  'Conditional Access': { icon: 'key' },
  'Shadow IT Detection': { icon: 'eye' },
  'Zero Trust': { icon: 'lock' },
  'DNS Analysis': { icon: 'globe' },
  // Languages
  JavaScript: { brand: 'javascript' },
  TypeScript: { brand: 'typescript' },
  Python: { brand: 'python' },
  Rust: { brand: 'rust' },
  Swift: { brand: 'swift' },
  PowerShell: { brand: 'powershell' },
  SQL: { icon: 'database' },
  Bash: { brand: 'bash' },
  R: { brand: 'r-lang' },
  'HTML / CSS': { brand: 'html5' },
  // Frontend
  'React 19': { brand: 'react' },
  'Next.js 16': { brand: 'nextjs' },
  'Tailwind CSS v4': { brand: 'tailwindcss' },
  'Framer Motion': { brand: 'framer' },
  'Three.js / R3F': { brand: 'threejs' },
  GSAP: { brand: 'gsap' },
  Recharts: { icon: 'chart-bar' },
  'Cytoscape.js': { brand: 'cytoscapedotjs' },
  // Backend & APIs
  'Cloudflare Workers': { brand: 'cloudflare-workers' },
  Flask: { brand: 'flask' },
  'REST APIs': { icon: 'link' },
  Supabase: { brand: 'supabase' },
  PostgreSQL: { brand: 'postgresql' },
  MongoDB: { brand: 'mongodb' },
  'Upstash Redis': { brand: 'upstash' },
  'Zod v4': { brand: 'zod' },
  'Gemini API': { brand: 'google-gemini' },
  // ML & Data
  PyTorch: { brand: 'pytorch' },
  'Scikit-learn': { brand: 'scikit-learn' },
  Pandas: { brand: 'pandas' },
  NumPy: { brand: 'numpy' },
  'TF-IDF': { icon: 'hash' },
  spaCy: { brand: 'spacy' },
  NLTK: { icon: 'book' },
  OpenCV: { brand: 'opencv' },
  YOLOv5: { brand: 'ultralytics' },
  'Federated Learning': { icon: 'layers' },
  LangChain: { brand: 'langchain' },
  ChromaDB: { brand: 'chroma' },
  RAG: { icon: 'search' },
  BM25: { icon: 'sliders' },
  // CV & Embedded
  'Raspberry Pi': { brand: 'raspberry-pi' },
  CUDA: { brand: 'nvidia' },
  'Tesseract OCR': { icon: 'scan-line' },
  'Model Quantization': { icon: 'sliders' },
  'Text-to-Speech': { icon: 'volume-2' },
  SIFT: { icon: 'crosshair' },
  // DevOps & Tools
  Git: { brand: 'git' },
  Vite: { brand: 'vite' },
  'Cloudflare Pages': { brand: 'cloudflare-pages' },
  Vercel: { brand: 'vercel' },
  Linux: { brand: 'linux' },
  Docker: { brand: 'docker' },
  'Azure DevOps': { brand: 'azure-azure-devops' },
  'Confluence API': { brand: 'confluence' },
  Ollama: { brand: 'ollama' },
  'Google Colab': { brand: 'google-colab' },
};
