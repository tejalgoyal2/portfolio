// The four lead stories on the Projects front page, in order (src/sections/Projects.jsx).
// Everything else runs in the rows below. Every project has an `eli5`: what it
// is in one or two plain lines, the way you'd explain it to a ten-year-old.
// The four leads also have a `why`: what it is and why I made it, in a line or
// two, told as a story rather than a pitch — that's the front of their tile;
// `desc` and `long` are the back (the technical file).
export const LEADS = ["type", "Dime", "IAM Threat Mapper", "Claubi"];

export const PROJECTS = [
  {
    tier: 1, name: "Dime", status: "LIVE", color: "#00ff88",
    why: "I wanted to log what I spend the way I'd text a friend — \"chai, 40\" — not fill in a form. So I built a tracker that just gets it, and roasts me for it.",
    eli5: "Tell it what you spent, the way you'd tell a friend, and it keeps track of your money — and teases you about it.",
    desc: "AI-powered expense tracker with natural language parsing, spending roasts, and zero client-side DB writes.",
    long: "Ground-up rewrite of WalletRIP on Cloudflare Workers. Next.js 16 with @opennextjs/cloudflare adapter. Zero client-side database writes. All mutations through API routes with auth, Zod v4 validation, and Upstash Redis rate limiting. 7 API routes including Gemini NLP parse, Quick Add for Siri/Shortcuts, AI insights, and Hinglish roast. Origin header checking, CSV export with formula injection protection, optimistic UI updates with rollback.",
    tech: ["React 19", "TypeScript", "Tailwind CSS", "Cloudflare Workers", "Supabase", "Gemini API"],
    links: { live: "https://dime.tgoyal.me", github: "https://github.com/tejalgoyal2/Dime" },
  },
  {
    tier: 1, name: "IAM Threat Mapper", status: "LIVE", color: "#8b8eff",
    why: "After a winter on a security desk, I wanted to see how the big breaches actually happened — one stolen login at a time, and the one fix that would have stopped each.",
    eli5: "Shows, step by step, how hackers broke into real companies by stealing logins, and what would have stopped them.",
    desc: "Interactive attack path visualizer mapping real-world breaches to MITRE ATT&CK techniques with IAM maturity assessment.",
    long: "5 breach case studies (MGM/Caesars, Uber Lapsus$, Twilio 0ktapus, Microsoft Midnight Blizzard, M365 token theft) mapped across 32 nodes to 17 ATT&CK techniques. Interactive Cytoscape.js graphs with severity-coded nodes. 20-question IAM maturity assessment aligned to NIST 800-63 and CIS Controls, with weighted scoring across 7 security categories. Assessment gaps link directly to exploitable attack scenarios.",
    tech: ["React 19", "Cytoscape.js", "Tailwind CSS", "Cloudflare Pages"],
    links: { live: "https://iam.tgoyal.me", github: "https://github.com/tejalgoyal2/iam-threat-mapper" },
  },
  {
    tier: 1, name: "Claubi", status: "REPO", color: "#f97316",
    why: "I like AI writing code. I don't like it running commands on my machine without asking. So I'm building one that has to ask first, and writes down every answer.",
    eli5: "A coding helper that lives on your own computer and has to ask permission before it touches anything.",
    desc: "Security-hardened, local-first AI coding agent in Rust. Deny-first permissions, append-only audit logging, no vendor lock-in.",
    long: "AI coding agent that treats AI-generated code as untrusted by default. Runs any model locally through Ollama. Deny-first permission model inspired by AWS IAM and CrowdStrike prevention policies. Append-only audit log (JSONL). Full Ollama client with streaming chat, model switching, CLI REPL. Planned: multi-model routing, planner-executor-reviewer pipeline, Ratatui TUI, local MCP server.",
    note: "where my weekends go",
    tech: ["Rust", "Ollama"],
    links: { github: "https://github.com/tejalgoyal2/claubi" },
  },
  {
    tier: 2, name: "ThreatScope", status: "REPO", color: "#67e8f9",
    eli5: "Ask about hacker tricks in plain English and get answers pulled straight from the official security databases.",
    desc: "AI threat intelligence chatbot indexing MITRE ATT&CK, NVD CVEs, and CISA KEV for natural language querying.",
    long: "Hybrid retrieval pipeline: BM25 keyword matching + ChromaDB vector search with HuggingFace embeddings (local, no API key). Indexes 500+ ATT&CK techniques + NVD CVEs + CISA KEV. IOC extraction from pasted threat reports using regex and NER. Config-driven model selection (Groq free tier or local Ollama). RAGAS evaluation pipeline measuring retrieval precision and hallucination rate.",
    tech: ["Python", "LangChain", "ChromaDB", "Groq API", "Streamlit", "BM25"],
    links: { github: "https://github.com/tejalgoyal2/threatscope" },
  },
  {
    tier: 2, name: "WalletRIP", status: "LIVE", color: "#fbbf24",
    eli5: "The first version of Dime: an expense tracker that never needs to know who you are.",
    desc: "The original expense tracker. Privacy-first with synthetic identities and zero PII. Evolved into Dime.",
    long: "Privacy-first tracker requiring zero PII. Synthetic identity system with callsigns. PostgreSQL Row Level Security, Supabase SSR auth, invite-code gating. 5 Gemini API integrations for NLP parsing, insights, subscription detection, and spending roasts. Self-directed security audit found 4 vulnerabilities. The findings led to Dime.",
    tech: ["Next.js", "Supabase", "Gemini API", "Tailwind CSS"],
    links: { live: "https://walletrip.vercel.app", github: "https://github.com/tejalgoyal2/WalletRIP" },
  },
  {
    tier: 2, name: "SmartHire", status: "REPO", color: "#a78bfa",
    eli5: "Reads a pile of resumes and tells a recruiter which ones fit the job best, in seconds.",
    desc: "AI resume screening system. Matches applicants to job descriptions using NLP similarity scoring in under 15 seconds.",
    long: "Two-sided marketplace for applicants and recruiters with role-based auth. TF-IDF vectorization + cosine similarity scoring between parsed resumes and JDs. spaCy/NLTK extraction of skills, education, experience from PDF/DOCX. Detailed match insights with matched/missing skills per applicant. Tested on 2,000 resumes from 8,000-record dataset against 50+ job descriptions.",
    tech: ["Flask", "MongoDB", "spaCy", "NLTK", "TF-IDF"],
    links: { github: "https://github.com/tejalgoyal2/SmartHire" },
  },
  {
    tier: 2, name: "Sudoku", status: "LIVE", color: "#6ee7b7",
    eli5: "Sudoku with no ads. That's the whole feature.",
    desc: "Ad-free Sudoku PWA with 4 difficulty levels, offline play, and streak tracking. Built out of pure spite.",
    long: "Algorithmic puzzle generation with every puzzle guaranteed exactly one solution. Pencil marks, undo, mistake counter, timer, streak tracking, best times. Progressive Web App with service worker for offline play and home screen installation. No backend, no accounts. All stats in localStorage.",
    tech: ["React 19", "Vite", "PWA", "Cloudflare Pages"],
    links: { live: "https://sudoku.tgoyal.me" },
  },
  {
    tier: 2, name: "type", status: "LIVE", color: "#fda4af",
    why: "I got a new mechanical keyboard and wanted somewhere to just type. Notepad felt like a waste of a good keyboard, so I made a page where every letter lands like it has weight.",
    eli5: "A blank page where every letter you type lands like it has weight. No score, no timer — it just feels nice.",
    desc: "A keyboard-only page where typing has real physics — glyphs land with spring weight, the page itself has mass, and six styles react to your rhythm. No timer, no prompts, no judging.",
    long: "Hand-rolled canvas renderer and physics engine, zero animation libraries. Variable font weight records how hard each key was struck; glyphs settle via closed-form underdamped springs. Six styles — Print, Clean, Ember, Tide, Frost, Gale — cycle on F4, each shedding matter proportional to flow. Every keystroke imparts a real impulse to a spring-mounted page. Streak tracking, secret words that swap styles mid-sentence, a 12-second seismograph, and a lifetime odometer — all local, nothing leaves the browser.",
    tech: ["TypeScript", "Canvas API", "Vite", "Cloudflare Workers"],
    links: { live: "https://type.tgoyal.me", github: "https://github.com/tejalgoyal2/type" },
  },
  {
    tier: 2, name: "Phishing Classifier", status: "REPO", color: "#f87171",
    eli5: "Learned to spot scam emails by reading 82,000 of them, and gets it right 98% of the time.",
    desc: "ML pipeline achieving 98.2% accuracy classifying phishing emails across 82K+ samples.",
    long: "End-to-end ML pipeline on 82,486 emails. Custom preprocessing with regex URL/email stripping. Engineered features: urgency flags, caps ratio, punctuation patterns. TF-IDF with GridSearchCV best params. Logistic regression selected over RF/SVM/NB for precision-recall balance. Top phishing indicators: 'verify', 'restriction', 'suspended'.",
    tech: ["Python", "Scikit-learn", "Pandas", "NLTK"],
    links: {},
  },
  {
    tier: 3, name: "AI Smart Glasses", status: "PROTOTYPE", color: "#fbbf24",
    eli5: "Glasses that help someone who can't see: they spot objects and read text out loud.",
    desc: "Assistive wearable for the visually impaired with real-time object detection, OCR, and text-to-speech on edge hardware.",
    long: "University-funded capstone. Camera + bone conduction speaker on spectacle frames. SIFT keypoint matching for 10 object classes, Tesseract OCR for document reading. Model quantized for Raspberry Pi with no cloud dependency. Led team of 5 across CS and Electronics departments.",
    tech: ["Raspberry Pi", "OpenCV", "Tesseract OCR", "Python"],
    links: { youtube: "https://youtu.be/N-yQPtAVEQw" },
  },
  {
    tier: 3, name: "OccluSense", status: "REPO", color: "#67e8f9",
    eli5: "Helps self-driving cars spot people and vehicles even when they're half hidden behind something.",
    desc: "Occluded object detection for autonomous vehicles using YOLOv5 transfer learning on custom traffic dataset.",
    long: "Improving AV perception for partially obstructed objects. 640 custom images with ~4,500 bounding box annotations across 6 classes. Transfer learning from MS COCO pretrained YOLOv5s. 0.85 precision detecting partially hidden pedestrians, vehicles, and rickshaws.",
    tech: ["YOLOv5", "PyTorch", "OpenCV", "Roboflow"],
    links: { github: "https://github.com/tejalgoyal2/OccluSense" },
  },
];
