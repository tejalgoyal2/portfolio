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
  // AI & agents
  'MCP servers': { brand: 'model-context-protocol' },
  LangChain: { brand: 'langchain' },
  RAG: { icon: 'search' },
  PyTorch: { brand: 'pytorch' },
  'Gemini API': { brand: 'google-gemini' },
  Ollama: { brand: 'ollama' },
  // Data
  Python: { brand: 'python' },
  SQL: { icon: 'database' },
  Pandas: { brand: 'pandas' },
  'Scikit-learn': { brand: 'scikit-learn' },
  'Azure Data Factory': { brand: 'azure-data-factories' },
  PostgreSQL: { brand: 'postgresql' },
  // Product & web
  TypeScript: { brand: 'typescript' },
  React: { brand: 'react' },
  'Next.js': { brand: 'nextjs' },
  'Tailwind CSS': { brand: 'tailwindcss' },
  'Cloudflare Workers': { brand: 'cloudflare-workers' },
  Supabase: { brand: 'supabase' },
  // Systems & tools
  Azure: { brand: 'azure' },
  'Power Platform': { brand: 'azure-power-platform' },
  Rust: { brand: 'rust' },
  PowerShell: { brand: 'powershell' },
  Docker: { brand: 'docker' },
  'IAM / Okta': { brand: 'okta' },
};
