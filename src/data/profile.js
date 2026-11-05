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
  contact: {
    email: "itejalgoyal@gmail.com",
    github: "https://github.com/tejalgoyal2",
    linkedin: "https://www.linkedin.com/in/tejalgoyal",
    blog: "https://tejalgoyal2.github.io",
    resume: "https://tgoyal.me/resume.pdf",
  },
};
