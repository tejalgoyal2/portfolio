// Each role as a short dispatch in my own words, and a few figures from it
// (counted up as they arrive). "shadow AI" in a story stays redacted until it's
// scrolled into the clear (Experience.jsx).
export const EXPERIENCE = [
  {
    role: "Software Engineer Co-op", org: "British Columbia Investment Management Corporation (BCI)",
    period: "May 2026 – Present", active: true,
    story: "I build and fix the apps BCI’s finance and operations teams work in all day. I wrote an AI-assisted Playwright suite that runs an Appian app’s regression tests in a few clicks, shipped a service on the Anthropic API that matches new vendors against the existing hierarchy and explains every match, and prototyped Python MCP servers that let AI agents query SQL Server and Azure SQL on demand. Somewhere in between: a React rebuild of a vendor-locked .NET app, and a quarterly report that now runs itself.",
    figures: [
      ["40+", "hours of click-through testing a cycle, now a few clicks"],
      ["50", "of 83 vendor records matched on their own, each with its reasoning"],
      ["12", "feed-months a flow now checks every quarter, instead of me"],
    ],
  },
  {
    role: "Cybersecurity & Risk Co-op", org: "British Columbia Investment Management Corporation (BCI)",
    period: "Jan – Apr 2026",
    story: "Four months on the security team, mostly scripting my way out of manual work. I built shadow AI detection in CrowdStrike LogScale that reads DNS traffic and shows which AI tools people are actually using, wrote a PowerShell tool that walks a documentation tree over a REST API and turns it into clean exports, and set up tracking for every app record the team had to keep.",
    figures: [
      ["47", "unsanctioned tools found across 1,200+ endpoints"],
      ["10 min", "for an export that took 3 hours by hand"],
      ["163+", "app records tracked for a team of 12"],
    ],
  },
  {
    role: "Teaching Assistant", org: "University of Victoria",
    period: "Jan – Dec 2025",
    story: "Weekly embedded systems labs for first-year engineers on the Raspberry Pi Pico W: sensors, circuits, and the first time their own code made something blink. Then a term-long sensor project, with a dozen teams to get across the line.",
    figures: [
      ["30", "students in weekly labs"],
      ["12", "teams mentored through the term"],
    ],
  },
  {
    role: "Federated Learning Research Intern", org: "Indian Institute of Technology Ropar",
    period: "Jan – Jul 2024",
    story: "I built a federated learning framework in PyTorch where everything is a setting: how many clients join a round, batch sizes, local epochs. It trained ResNet and VGG across four datasets, up to a million simulated clients. The library I wrote for splitting data unevenly (non-IID, the realistic kind) became standard tooling in the lab, and I set up the shared Ubuntu server everyone trained on.",
    figures: [
      ["1M", "simulated clients at the largest run"],
      ["4", "PhD researchers using my data-splitting library"],
      ["6", "researchers on one server, one CUDA setup"],
    ],
  },
];
