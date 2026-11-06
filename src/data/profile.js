// The facts the page says in its own JSX (Hero, About, OffTheClock, Contact) that no
// other data file holds. Nothing on the visible page reads this file: it feeds the
// layer made for machines (llms.txt, the markdown copy, the structured data, the
// text a crawler reads before any script runs, and the /mcp endpoint).
// tests/unit/agent.test.js checks every line below still appears in those components,
// so if you change a number or a sentence on the page, that test says where to change it here.
export const PROFILE = {
  name: "Tejal Goyal",
  url: "https://tgoyal.me/",
  role: "Software Engineer",
  headline: "BUILDING SOFTWARE THAT FEELS OBVIOUS",
  byline: "Software · AI · Data",
  deck: "I’m Tejal — a software engineer who turns new ideas into products: AI agents, data pipelines, and things that are fun to use. Right now I’m teaching AI agents to talk to real systems.",
  // About's standfirst, as plain text
  about:
    "I build software that feels obvious: AI agents that talk to real systems, data pipelines that hold up, and small things that are fun to use. Making something feel that simple is usually the hard part, and the hard part is what I like. So my weekends go to it too, on things nobody asked for: type, Dime, and a Sudoku with no ads.",
  favouriteSubjects: "math & quantum physics (and computers, obviously)",
  education: [
    { school: "University of Victoria", degree: "M.Eng., Applied Data Science", note: "GPA 8.82/9.0, GRE quant 167/170" },
    { school: "Thapar Institute of Engineering and Technology", degree: "B.Eng., Electronics & Computer Engineering" },
  ],
  numbers: [
    ["8.82/9.0", "M.Eng. GPA"],
    ["167/170", "GRE, quant"],
    ["5 live", "side projects, and counting"],
    ["24/24", "F1 race weekends, every one"],
  ],
  offTheClock: [
    ["Sports", "F1, every race weekend.", "State-level badminton, once. Finished the TC10K, slowly."],
    ["Puzzles", "Speedcubes. Hence the cube.", "Card tricks, on request."],
    ["Kitchen", "Bakes a serious banana bread.", "Brownies if you ask nicely."],
    ["Community", "1,000+ trees in the ground.", "From the NGO I co-founded with my brother."],
  ],
  // The short version, in numbers that are already on the page (Experience, About). Each `proof` is a
  // string that must still appear there: tests/unit/agent.test.js fails if one stops being true.
  highlights: [
    { text: "Built an AI-assisted Playwright suite that turned 40+ hours of click-through testing every cycle into a few clicks.", proof: ["40+"] },
    { text: "Shipped a service on the Anthropic API that matched 50 of 83 vendor records on its own, each with its reasoning.", proof: ["50", "83"] },
    { text: "Built shadow-AI detection that found 47 unsanctioned AI tools across 1,200+ endpoints.", proof: ["47", "1,200+"] },
    { text: "Wrote a federated-learning framework in PyTorch that ran up to 1M simulated clients; its data-splitting library became standard tooling in the lab.", proof: ["1M", "PyTorch"] },
    { text: "M.Eng. in Applied Data Science at the University of Victoria: GPA 8.82/9.0, GRE quant 167/170.", proof: ["8.82", "167"] },
    { text: "Ships things people use: type, Dime, IAM Threat Mapper and a Sudoku with no ads, and is building Claubi, a coding agent in Rust that asks before it acts.", proof: ["type", "Dime", "IAM Threat Mapper", "Claubi"] },
  ],
  contact: {
    github: "https://github.com/tejalgoyal2",
    linkedin: "https://www.linkedin.com/in/tejalgoyal",
    blog: "https://tejalgoyal2.github.io",
    resume: "https://tgoyal.me/resume.pdf",
  },
};
