// The layer made for machines, built from src/data/* on every deploy (build only; the dev
// server and the page itself are untouched):
//   dist/llms.txt        the short version, for language models (llmstxt.org)
//   dist/llms-full.txt   every write-up in one file
//   dist/sitemap.xml     with a real lastmod
//   index.html           schema.org JSON-LD in <head>, and the whole page as plain semantic HTML
//                        inside #root, hidden with inline style: crawlers that don't run
//                        scripts read it, and React replaces it the moment the page mounts,
//                        so a visitor never sees it.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  buildModel,
  toLlmsTxt,
  toMarkdown,
  toStaticHtml,
  toJsonLd,
  jsonLdScript,
} from '../lib/agent-content.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const load = async (rel) => import(pathToFileURL(path.join(root, rel)).href);

export async function loadModel() {
  const [{ PROFILE }, { PROJECTS, LEADS }, { EXPERIENCE }, { SKILL_NODES }, { BLOG_POSTS }] = await Promise.all([
    load('src/data/profile.js'),
    load('src/data/projects.js'),
    load('src/data/experience.js'),
    load('src/data/skills.js'),
    load('src/data/blog.js'),
  ]);
  return buildModel({ profile: PROFILE, projects: PROJECTS, leads: LEADS, experience: EXPERIENCE, skills: SKILL_NODES, posts: BLOG_POSTS });
}

export default function agentLayer() {
  let model;
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: 'agent-layer',
    apply: 'build',
    async buildStart() {
      model = await loadModel();
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const emptyRoot = '<div id="root"></div>';
        if (!html.includes(emptyRoot) || !html.includes('</head>')) {
          throw new Error('agent-layer: index.html no longer has an empty #root and a </head> to fill');
        }
        const ld = `<script type="application/ld+json">${jsonLdScript(toJsonLd(model, today))}</script>`;
        return html
          .replace('</head>', `    ${ld}\n  </head>`)
          .replace(emptyRoot, `<div id="root">${toStaticHtml(model)}</div>`);
      },
    },
    generateBundle() {
      const emit = (fileName, source) => this.emitFile({ type: 'asset', fileName, source });
      emit('llms.txt', toLlmsTxt(model));
      emit('llms-full.txt', toMarkdown(model));
      emit(
        'sitemap.xml',
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://tgoyal.me/</loc><lastmod>${today}</lastmod></url>\n</urlset>\n`,
      );
    },
  };
}
