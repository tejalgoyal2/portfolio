// Each role as a short dispatch in my own words, and a few figures from it
// (counted up as they arrive). A C2 in a story stays redacted until it's
// scrolled into the clear (Experience.jsx).
export const EXPERIENCE = [
  {
    role: "Software Engineering Co-op", org: "British Columbia Investment Management Corporation (BCI)",
    period: "May 2026 – Present", active: true,
    story: "I’m on Enterprise Solutions, rebuilding the apps BCI’s investment and risk teams live in. Right now that means Python MCP servers so AI agents can query real financial databases and APIs directly, and helping move a vendor-locked .NET app onto React and Azure. Along the way I automated a quarterly commission report that used to be done by hand, once I’d found the two typos and the one DATE-type bug standing in its way.",
    figures: [],
  },
  {
    role: "Cybersecurity & Risk Co-op", org: "British Columbia Investment Management Corporation (BCI)",
    period: "Jan – Apr 2026",
    story: "Four months on the security team, mostly answering two questions: which AI tools are people actually using, and who can log in to what. I built Shadow AI detection in CrowdStrike LogScale, wrote breakglass docs for every SSO app we had, and ran an incident investigation solo, matching hashes, odd code signing and C2 indicators until there was no doubt it was malicious.",
    figures: [
      ["47", "unsanctioned AI tools found, across 1,200+ endpoints"],
      ["22%", "of 163+ SSO apps left undocumented, down from 86%"],
      ["10 min", "for a compliance report that used to take 3 hours"],
    ],
  },
  {
    role: "Teaching Assistant", org: "University of Victoria",
    period: "Jan – Dec 2025",
    story: "Two TA jobs in one year. First-years got weekly Raspberry Pi Pico W labs: sensors, circuits, and the first time their own code made something blink. ECE 260 got Fourier and Laplace transforms, broken into steps until they stopped feeling like a magic trick.",
    figures: [
      ["30", "students in weekly labs"],
      ["12", "design teams mentored through the term"],
    ],
  },
  {
    role: "Federated Learning Research Intern", org: "Indian Institute of Technology Ropar",
    period: "Jan – Jul 2024",
    story: "I built federated learning from scratch in PyTorch, starting with FedAvg, and kept scaling until fifty simulated clients became a million. Then I made the data unfair on purpose, with Dirichlet non-IID splits, and found ways to train through it. The implementations ended up in a published paper on game-theoretic federated learning.",
    figures: [
      ["1M", "simulated clients, up from 50"],
      ["~15%", "fewer communication rounds on skewed data"],
      ["~11%", "better accuracy on the classes it was starved of"],
    ],
  },
];
