// The four lead stories on the Projects front page, in order (src/sections/Projects.jsx).
// Everything else runs in the rows below. Every project has an `eli5`: what it
// is in one or two plain lines, the way you'd explain it to a ten-year-old.
// `status` is the stamp: LIVE if you can use it now, otherwise one plain word
// for what it is.
// The four leads also have a `why`: what it is and why I made it, in a line or
// two, told as a story rather than a pitch — that's the front of their tile,
// with a few `facts` under it (only the ones worth a number: one, two or three);
// `desc` and `long` are the back (the full file). `from` is the side of the
// page each one is dealt in from, so the four meet in the middle.
// `wave` is how the tile turns over (src/press/Story.jsx): rows, ripple,
// spread or scan, each picked to suit the project.
export const LEADS = ["type", "Dime", "IAM Threat Mapper", "Claubi"];

export const PROJECTS = [
  {
    tier: 1, name: "Dime", status: "LIVE", color: "#00ff88",
    why: "I wanted to log spending the way I’d text a friend: \u201c$16 sandwich.\u201d A friend would also tell me that’s a crime. I didn’t have one on call, so I built a tracker that does both: it gets what I mean, and roasts me for it.",
    facts: [["0", "database writes from the browser"], ["1", "roast per questionable purchase"]],
    wave: "rows", from: "top",
    eli5: "Tell it what you spent, the way you’d tell a friend, and it keeps track of your money — and teases you about it.",
    desc: "An expense tracker you text like a friend. It reads plain English (and Hinglish), files it, and has opinions.",
    long: "A ground-up rewrite of my first tracker, WalletRIP, on Cloudflare Workers with Next.js 16. The browser never writes to the database: every change goes through an API route with auth, Zod validation and Upstash rate limits. Gemini reads what you type, writes the insights, and delivers the roasts. There’s a Quick Add endpoint for Siri and Shortcuts, a CSV export that’s safe from formula injection, and optimistic updates that roll back if the server says no.",
    tech: ["React 19", "TypeScript", "Tailwind CSS", "Cloudflare Workers", "Supabase", "Gemini API"],
    links: { live: "https://dime.tgoyal.me", github: "https://github.com/tejalgoyal2/Dime" },
  },
  {
    tier: 1, name: "IAM Threat Mapper", status: "LIVE", color: "#8b8eff",
    why: "I wanted to understand how real systems get broken into: where each piece is weak, how an attacker walks from one to the next, and what would have shut the door. So I took five real breaches apart, step by step, from both sides.",
    facts: [["5", "real breaches"], ["32", "attack steps"], ["17", "ATT&CK techniques"]],
    wave: "spread", from: "bottom",
    eli5: "Shows, step by step, how hackers broke into real companies by stealing logins, and what would have stopped them.",
    desc: "Five real breaches, taken apart one login at a time and mapped to the attacker’s playbook, MITRE ATT&CK.",
    long: "MGM and Caesars, Uber and Lapsus$, Twilio and 0ktapus, Midnight Blizzard at Microsoft, and M365 token theft: 32 steps across 17 ATT&CK techniques, drawn as interactive Cytoscape.js graphs and coloured by severity. Then it turns the lens on you: a 20-question IAM maturity check, aligned to NIST 800-63 and the CIS Controls and scored across seven categories, where every gap links to the breach that used it.",
    tech: ["React 19", "Cytoscape.js", "Tailwind CSS", "Cloudflare Pages"],
    links: { live: "https://iam.tgoyal.me", github: "https://github.com/tejalgoyal2/iam-threat-mapper" },
  },
  {
    tier: 1, name: "Claubi", status: "OFFLINE", color: "#f97316",
    why: "I like AI writing code. I’m less keen on it running questionable commands on my machine without asking. So I’m building one that runs offline, has to ask first, and writes down every answer.",
    facts: [["0", "cloud calls: every model runs on your machine"]],
    wave: "scan", from: "right",
    eli5: "A coding helper that lives on your own computer and has to ask permission before it touches anything.",
    desc: "A coding agent in Rust that lives on your own machine, treats AI-written code as untrusted, and asks before it acts.",
    long: "Any model runs locally through Ollama, so nothing leaves the laptop and no vendor holds the keys. Permissions are deny-first, modelled on AWS IAM and CrowdStrike prevention policies: the agent has to ask, and every ask and answer goes into an append-only audit log (JSONL). Today it has a full Ollama client with streaming chat, model switching and a CLI REPL. Next: routing between models, a planner, executor and reviewer pipeline, a Ratatui TUI, and a local MCP server.",
    note: "where my weekends go",
    tech: ["Rust", "Ollama"],
    links: { github: "https://github.com/tejalgoyal2/claubi" },
  },
  {
    tier: 2, name: "ThreatScope", status: "CHATBOT", color: "#67e8f9",
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
    tier: 2, name: "SmartHire", status: "SCREENER", color: "#a78bfa",
    eli5: "Reads a pile of resumes and tells a recruiter which ones fit the job best, in seconds.",
    desc: "AI resume screening system. Matches applicants to job descriptions using NLP similarity scoring in under 15 seconds.",
    long: "Two-sided marketplace for applicants and recruiters with role-based auth. TF-IDF vectorization + cosine similarity scoring between parsed resumes and JDs. spaCy/NLTK extraction of skills, education, experience from PDF/DOCX. Detailed match insights with matched/missing skills per applicant. Tested on 2,000 resumes from 8,000-record dataset against 50+ job descriptions.",
    tech: ["Flask", "MongoDB", "spaCy", "NLTK", "TF-IDF"],
    links: { github: "https://github.com/tejalgoyal2/SmartHire" },
  },
  {
    tier: 2, name: "Sudoku", status: "LIVE", color: "#6ee7b7",
    eli5: "Sudoku with no ads. That’s the whole feature.",
    desc: "Ad-free Sudoku PWA with 4 difficulty levels, offline play, and streak tracking. Built out of pure spite.",
    long: "Algorithmic puzzle generation with every puzzle guaranteed exactly one solution. Pencil marks, undo, mistake counter, timer, streak tracking, best times. Progressive Web App with service worker for offline play and home screen installation. No backend, no accounts. All stats in localStorage.",
    tech: ["React 19", "Vite", "PWA", "Cloudflare Pages"],
    links: { live: "https://sudoku.tgoyal.me" },
  },
  {
    tier: 2, name: "type", status: "LIVE", color: "#fda4af",
    why: "I got a new mechanical keyboard and wanted somewhere to just type. Notepad felt like a waste of a good keyboard, so I made a page where every letter lands like it has weight.",
    facts: [["6", "styles, a new one on F4"], ["0", "timers, scores or prompts"]],
    wave: "ripple", from: "left",
    eli5: "A blank page where every letter you type lands like it has weight. No score, no timer — it just feels nice.",
    desc: "A blank page for typing, just for the feel of it. No timer and no score: letters land with weight, the page has mass, and six styles answer your rhythm.",
    long: "Everything is hand-rolled on canvas, with no animation libraries: the renderer, the physics, the springs. How hard you strike a key sets that letter’s weight on a variable-font axis, and each glyph settles on a closed-form underdamped spring. Every keystroke kicks the page, which hangs on a spring of its own. Six styles (Print, Clean, Ember, Tide, Frost and Gale) cycle on F4 and shed matter as your flow builds. There are streaks, secret words that switch styles mid-sentence, a 12-second seismograph and a lifetime odometer, and all of it stays in your browser.",
    tech: ["TypeScript", "Canvas API", "Vite", "Cloudflare Workers"],
    links: { live: "https://type.tgoyal.me", github: "https://github.com/tejalgoyal2/type" },
  },
  {
    tier: 2, name: "Phishing Classifier", status: "MODEL", color: "#f87171",
    eli5: "Learned to spot scam emails by reading 82,000 of them, and gets it right 98% of the time.",
    desc: "ML pipeline achieving 98.2% accuracy classifying phishing emails across 82K+ samples.",
    long: "End-to-end ML pipeline on 82,486 emails. Custom preprocessing with regex URL/email stripping. Engineered features: urgency flags, caps ratio, punctuation patterns. TF-IDF with GridSearchCV best params. Logistic regression selected over RF/SVM/NB for precision-recall balance. Top phishing indicators: 'verify', 'restriction', 'suspended'.",
    tech: ["Python", "Scikit-learn", "Pandas", "NLTK"],
    links: {},
  },
  {
    tier: 3, name: "AI Smart Glasses", status: "WEARABLE", color: "#fbbf24",
    eli5: "Glasses that help someone who can’t see: they spot objects and read text out loud.",
    desc: "Assistive wearable for the visually impaired with real-time object detection, OCR, and text-to-speech on edge hardware.",
    long: "University-funded capstone. Camera + bone conduction speaker on spectacle frames. SIFT keypoint matching for 10 object classes, Tesseract OCR for document reading. Model quantized for Raspberry Pi with no cloud dependency. Led team of 5 across CS and Electronics departments.",
    tech: ["Raspberry Pi", "OpenCV", "Tesseract OCR", "Python"],
    links: { youtube: "https://youtu.be/N-yQPtAVEQw" },
  },
  {
    tier: 3, name: "OccluSense", status: "RESEARCH", color: "#67e8f9",
    eli5: "Helps self-driving cars spot people and vehicles even when they’re half hidden behind something.",
    desc: "Occluded object detection for autonomous vehicles using YOLOv5 transfer learning on custom traffic dataset.",
    long: "Improving AV perception for partially obstructed objects. 640 custom images with ~4,500 bounding box annotations across 6 classes. Transfer learning from MS COCO pretrained YOLOv5s. 0.85 precision detecting partially hidden pedestrians, vehicles, and rickshaws.",
    tech: ["YOLOv5", "PyTorch", "OpenCV", "Roboflow"],
    links: { github: "https://github.com/tejalgoyal2/OccluSense" },
  },
];
