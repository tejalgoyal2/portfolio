export const SKILL_NODES = [
  { id: "sec", label: "Security", x: 0.18, y: 0.28, color: "#00ff41", r: 36,
    items: ["IAM Platforms", "EDR Solutions", "SIEM", "Vulnerability Mgmt", "Web Proxy / Zero Trust", "Knowledge Management"] },
  { id: "ml", label: "ML / AI", x: 0.5, y: 0.13, color: "#00d4ff", r: 32,
    items: ["PyTorch", "Scikit-learn", "TF-IDF", "YOLOv5", "spaCy", "NLTK", "Federated Learning"] },
  { id: "dev", label: "Development", x: 0.82, y: 0.28, color: "#ffb000", r: 32,
    items: ["React", "Next.js", "Flask", "Tailwind CSS", "Supabase", "MongoDB", "Python", "JS/TS"] },
  { id: "data", label: "Data Science", x: 0.32, y: 0.7, color: "#ff3333", r: 28,
    items: ["Pandas", "NumPy", "Matplotlib", "Seaborn", "Jupyter", "Google Colab", "Statistics"] },
  { id: "tools", label: "DevOps & Tools", x: 0.72, y: 0.7, color: "#9d4edd", r: 26,
    items: ["Git & GitHub", "Jira", "Roboflow", "Docker", "PowerShell", "Linux"] },
];

export const SKILL_EDGES = [
  ["sec", "ml"], ["sec", "dev"], ["ml", "data"],
  ["ml", "dev"], ["dev", "tools"], ["data", "tools"], ["sec", "tools"],
];
