// The working set, cut to what I actually reach for, in four groups.
// Each skill's icon lives in src/data/skillIcons.js.
export const SKILL_NODES = [
  {
    id: "ai", label: "AI & agents",
    items: ["MCP servers", "LangChain", "RAG", "PyTorch", "Gemini API", "Ollama"],
  },
  {
    id: "data", label: "Data",
    items: ["Python", "SQL", "Pandas", "Scikit-learn", "Azure Data Factory", "PostgreSQL"],
  },
  {
    id: "web", label: "Product & web",
    items: ["TypeScript", "React", "Next.js", "Tailwind CSS", "Cloudflare Workers", "Supabase"],
  },
  {
    id: "systems", label: "Systems & tools",
    items: ["Azure", "Power Platform", "Rust", "PowerShell", "Docker", "IAM / Okta"],
  },
];
