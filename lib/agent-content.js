// One content model for everything built for machines, so no copy can go stale:
//   - llms.txt, llms-full.txt and index.md (scripts/agent-layer.mjs, at build)
//   - the structured data and the text a crawler reads before any script runs
//   - the /mcp endpoint (functions/mcp.js)
// All of it is made from src/data/*, which the page itself renders, so a new project,
// a new role or a new blog post reaches the bots in the same deploy that shows it.
// Pure functions, no I/O: the build and the Pages Function both import this.

const SITE = "https://tgoyal.me";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** a project's best single link: the live thing, else the code, else the video */
export const primaryLink = (p) => p.links?.live || p.links?.github || p.links?.youtube || null;

const STATUS_WORDS = {
  LIVE: "live, you can use it now",
  OFFLINE: "runs offline on your own machine",
  CHATBOT: "chatbot",
  SCREENER: "screening tool",
  MODEL: "trained model",
  WEARABLE: "wearable hardware",
  RESEARCH: "research project",
};
const statusWord = (s) => STATUS_WORDS[s] || String(s || "").toLowerCase();

/** The model: leads first (in the page's order), then the rest as they're listed. */
export function buildModel({ profile, projects, leads = [], experience, skills, posts }) {
  const lead = (name) => leads.indexOf(name);
  const ordered = [...projects].sort((a, b) => {
    const ia = lead(a.name), ib = lead(b.name);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return projects.indexOf(a) - projects.indexOf(b);
  });
  return { profile, projects: ordered, leads, experience, skills, posts };
}

// ─── markdown ────────────────────────────────────────────────────────────────

const projectLine = (p) => {
  const url = primaryLink(p);
  const name = url ? `[${p.name}](${url})` : p.name;
  return `- ${name}: ${p.desc} (${statusWord(p.status)}; ${p.tech.join(", ")})`;
};

const postLine = (b) => `- [${b.title}](${b.url}) (${b.date}): ${b.preview.replace(/…$/, "").trim()}…`;

/** llms.txt, in the llmstxt.org shape: H1, a one-paragraph blockquote, then link lists. */
export function toLlmsTxt(m) {
  const { profile: p } = m;
  const now = m.experience.find((e) => e.active);
  const lines = [
    `# ${p.name}`,
    "",
    `> ${p.deck}`,
    "",
    `${p.about}`,
    "",
    now ? `Right now: ${now.role} at ${now.org} (${now.period}).` : "",
    `Education: ${p.education.map((e) => `${e.degree}, ${e.school}`).join("; ")}.`,
    "",
    "## Read this site as text",
    "",
    `- [This page as Markdown](${SITE}/index.md): the whole front page, in reading order`,
    `- [Everything, in one file](${SITE}/llms-full.txt): every project write-up, every role, every post`,
    `- [MCP server](${SITE}/mcp): ask about me through tools (about, projects, experience, skills, writing, contact, search); read-only, no key needed`,
    `- [Sitemap](${SITE}/sitemap.xml)`,
    "",
    "## Projects",
    "",
    ...m.projects.slice(0, m.leads.length + 4).map(projectLine),
    "",
    "## Experience",
    "",
    ...m.experience.map((e) => `- ${e.role}, ${e.org} (${e.period}): ${e.figures.map(([n, l]) => `${n} ${l}`).join("; ")}`),
    "",
    "## Writing",
    "",
    ...m.posts.slice(0, 5).map(postLine),
    `- [All posts](${p.contact.blog})`,
    "",
    "## Elsewhere",
    "",
    `- [GitHub](${p.contact.github}): every repo, with a README that rebuilds itself weekly`,
    `- [LinkedIn](${p.contact.linkedin})`,
    `- [Resume (PDF)](${p.contact.resume})`,
    `- Email: ${p.contact.email}`,
    "",
    "## Optional",
    "",
    ...m.projects.slice(m.leads.length + 4).map(projectLine),
    "",
  ];
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}

/** index.md is the page in reading order; llms-full.txt (full = true) adds every long write-up. */
export function toMarkdown(m, { full = false } = {}) {
  const { profile: p } = m;
  const out = [];
  out.push(`# ${p.name}: ${p.headline.toLowerCase().replace(/^./, (c) => c.toUpperCase())}`, "");
  out.push(`*${p.byline}*`, "", p.deck, "");
  out.push("## Profile", "", p.about, "");
  out.push(`Favourite subjects: ${p.favouriteSubjects}.`, "");
  out.push(...p.numbers.map(([n, l]) => `- **${n}** ${l}`), "");
  out.push("### Education", "", ...p.education.map((e) => `- ${e.degree}, ${e.school}${e.note ? ` (${e.note})` : ""}`), "");
  out.push("### Off the clock", "", ...p.offTheClock.map(([d, a, b]) => `- **${d}:** ${a} ${b}`), "");

  out.push("## Skills", "");
  for (const g of m.skills) out.push(`- **${g.label}:** ${g.items.join(", ")}`);
  out.push("");

  out.push("## Projects", "");
  for (const proj of m.projects) {
    const url = primaryLink(proj);
    out.push(`### ${proj.name}${url ? ` — ${url}` : ""}`, "");
    out.push(`*${statusWord(proj.status)}*. ${proj.eli5}`, "");
    if (proj.why) out.push(proj.why, "");
    out.push(proj.desc, "");
    if (full) out.push(proj.long, "");
    if (proj.facts?.length) out.push(...proj.facts.map(([n, l]) => `- **${n}** ${l}`), "");
    out.push(`Built with: ${proj.tech.join(", ")}.`);
    const links = Object.entries(proj.links || {}).map(([k, v]) => `[${k}](${v})`);
    if (links.length) out.push(`Links: ${links.join(" · ")}`);
    out.push("");
  }

  out.push("## Experience", "");
  for (const e of m.experience) {
    out.push(`### ${e.role}, ${e.org}`, "", `*${e.period}*`, "", e.story, "");
    out.push(...e.figures.map(([n, l]) => `- **${n}** ${l}`), "");
  }

  out.push("## Writing", "", `Posts from [${p.contact.blog.replace("https://", "")}](${p.contact.blog}):`, "");
  out.push(...(full ? m.posts : m.posts.slice(0, 8)).map(postLine), "");

  out.push("## Contact", "", `- Email: ${p.contact.email}`, `- GitHub: ${p.contact.github}`, `- LinkedIn: ${p.contact.linkedin}`, `- Resume: ${p.contact.resume}`, `- Ask me through MCP: ${SITE}/mcp`, "");
  return out.join("\n");
}

// ─── the text a crawler reads before any script runs ─────────────────────────

/** Semantic HTML of the whole page. Goes inside #root, hidden with inline style; React replaces it on mount. */
export function toStaticHtml(m) {
  const { profile: p } = m;
  const li = (s) => `<li>${s}</li>`;
  const a = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;
  const projects = m.projects
    .map((x) => {
      const url = primaryLink(x);
      return `<article><h3>${url ? a(url, x.name) : esc(x.name)}</h3><p><em>${esc(statusWord(x.status))}</em>. ${esc(x.eli5)}</p><p>${esc(x.desc)}</p><p>Built with ${esc(x.tech.join(", "))}.</p></article>`;
    })
    .join("");
  const roles = m.experience
    .map((e) => `<article><h3>${esc(e.role)}, ${esc(e.org)}</h3><p><em>${esc(e.period)}</em></p><p>${esc(e.story)}</p><ul>${e.figures.map(([n, l]) => li(`<strong>${esc(n)}</strong> ${esc(l)}`)).join("")}</ul></article>`)
    .join("");
  return (
    `<main data-agent-snapshot="" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">` +
    `<h1>${esc(p.name)}: ${esc(p.headline.toLowerCase().replace(/^./, (c) => c.toUpperCase()))}</h1>` +
    `<p>${esc(p.byline)}</p><p>${esc(p.deck)}</p>` +
    `<section><h2>Profile</h2><p>${esc(p.about)}</p><ul>${p.numbers.map(([n, l]) => li(`<strong>${esc(n)}</strong> ${esc(l)}`)).join("")}</ul>` +
    `<ul>${p.education.map((e) => li(`${esc(e.degree)}, ${esc(e.school)}`)).join("")}</ul></section>` +
    `<section><h2>Skills</h2><ul>${m.skills.map((g) => li(`<strong>${esc(g.label)}:</strong> ${esc(g.items.join(", "))}`)).join("")}</ul></section>` +
    `<section><h2>Projects</h2>${projects}</section>` +
    `<section><h2>Experience</h2>${roles}</section>` +
    `<section><h2>Writing</h2><ul>${m.posts.slice(0, 8).map((b) => li(`${a(b.url, b.title)} (${esc(b.date)})`)).join("")}</ul></section>` +
    `<section><h2>Contact</h2><ul>${li(`<a href="mailto:${esc(p.contact.email)}">${esc(p.contact.email)}</a>`)}${li(a(p.contact.github, "GitHub"))}${li(a(p.contact.linkedin, "LinkedIn"))}${li(a(p.contact.resume, "Resume (PDF)"))}</ul>` +
    `<p>This page as Markdown: ${a(SITE + "/index.md", "index.md")}. Everything in one file: ${a(SITE + "/llms-full.txt", "llms-full.txt")}. MCP server: ${esc(SITE)}/mcp</p></section>` +
    `</main>`
  );
}

// ─── structured data ─────────────────────────────────────────────────────────

/** schema.org graph: the person, the site, the profile page, the projects and the blog. */
export function toJsonLd(m, modified) {
  const { profile: p } = m;
  const person = {
    "@type": "Person",
    "@id": `${SITE}/#tejal`,
    name: p.name,
    url: SITE + "/",
    jobTitle: p.role,
    description: p.deck,
    email: `mailto:${p.contact.email}`,
    sameAs: [p.contact.github, p.contact.linkedin, p.contact.blog],
    knowsAbout: m.skills.flatMap((g) => g.items),
    alumniOf: p.education.map((e) => ({ "@type": "CollegeOrUniversity", name: e.school })),
  };
  const now = m.experience.find((e) => e.active);
  if (now) person.worksFor = { "@type": "Organization", name: now.org };
  return {
    "@context": "https://schema.org",
    "@graph": [
      person,
      { "@type": "WebSite", "@id": `${SITE}/#site`, url: SITE + "/", name: p.name, description: p.deck, author: { "@id": person["@id"] }, inLanguage: "en" },
      { "@type": "ProfilePage", "@id": `${SITE}/#profile`, url: SITE + "/", name: `${p.name}: ${p.role}`, mainEntity: { "@id": person["@id"] }, isPartOf: { "@id": `${SITE}/#site` }, dateModified: modified },
      {
        "@type": "ItemList",
        "@id": `${SITE}/#projects`,
        name: `Projects by ${p.name}`,
        itemListElement: m.projects.map((x, i) => {
          const url = primaryLink(x);
          return {
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "SoftwareApplication",
              name: x.name,
              description: x.desc,
              ...(url ? { url } : {}),
              ...(x.links?.github ? { sameAs: [x.links.github] } : {}),
              keywords: x.tech.join(", "),
              applicationCategory: "DeveloperApplication",
              author: { "@id": person["@id"] },
            },
          };
        }),
      },
      {
        "@type": "Blog",
        "@id": `${p.contact.blog}/#blog`,
        url: p.contact.blog,
        name: `${p.name}'s blog`,
        author: { "@id": person["@id"] },
        blogPost: m.posts.slice(0, 10).map((b) => ({
          "@type": "BlogPosting",
          headline: b.title,
          url: b.url,
          datePublished: b.date,
          description: b.preview,
          keywords: (b.tags || []).join(", "),
          author: { "@id": person["@id"] },
        })),
      },
    ],
  };
}

/** JSON for a <script type="application/ld+json">: "<" escaped so no text can close the tag. */
export const jsonLdScript = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");

// ─── search, for the MCP endpoint ────────────────────────────────────────────

/** Every fact as a small document: {kind, title, text, url}. */
export function toDocuments(m) {
  const { profile: p } = m;
  const docs = [{ kind: "profile", title: p.name, text: `${p.deck} ${p.about} ${p.education.map((e) => `${e.degree} ${e.school}`).join(" ")}`, url: SITE + "/" }];
  for (const x of m.projects) docs.push({ kind: "project", title: x.name, text: `${x.eli5} ${x.desc} ${x.long} ${x.why || ""} ${x.tech.join(" ")}`, url: primaryLink(x) });
  for (const e of m.experience) docs.push({ kind: "experience", title: `${e.role}, ${e.org}`, text: `${e.story} ${e.figures.map(([n, l]) => `${n} ${l}`).join(" ")} ${e.period}`, url: SITE + "/#experience" });
  for (const g of m.skills) docs.push({ kind: "skills", title: g.label, text: g.items.join(" "), url: SITE + "/#skills" });
  for (const b of m.posts) docs.push({ kind: "writing", title: b.title, text: `${b.preview} ${(b.tags || []).join(" ")}`, url: b.url });
  return docs;
}

export function searchDocuments(docs, query, limit = 6) {
  const terms = String(query).toLowerCase().split(/[^a-z0-9.+#]+/).filter((t) => t.length > 1);
  if (!terms.length) return [];
  return docs
    .map((d) => {
      const title = d.title.toLowerCase(), text = d.text.toLowerCase();
      const score = terms.reduce((s, t) => s + (title.includes(t) ? 3 : 0) + (text.includes(t) ? 1 : 0), 0);
      return { ...d, score };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((d) => {
      const { score: _score, text, ...rest } = d;
      return { ...rest, excerpt: text.slice(0, 280).trim() + (text.length > 280 ? "…" : "") };
    });
}
