// The layer made for machines: llms.txt, the markdown copy, the structured data, the text
// a crawler reads before any script runs, and the /mcp endpoint. The page's own text is the
// source of truth, so the first block fails if src/data/profile.js drifts from it.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { PROFILE } from '../../src/data/profile.js';
import { PROJECTS, LEADS } from '../../src/data/projects.js';
import { EXPERIENCE } from '../../src/data/experience.js';
import { SKILL_NODES } from '../../src/data/skills.js';
import { BLOG_POSTS } from '../../src/data/blog.js';
import { buildModel, noteLines, toLlmsTxt, toMarkdown, toStaticHtml, toJsonLd, jsonLdScript, searchDocuments, toDocuments } from '../../lib/agent-content.js';
import { handleRequest, handleMessage, callTool, TOOLS } from '../../lib/agent-mcp.js';

const model = buildModel({ profile: PROFILE, projects: PROJECTS, leads: LEADS, experience: EXPERIENCE, skills: SKILL_NODES, posts: BLOG_POSTS });
const src = (f) => readFileSync(new URL(`../../src/${f}`, import.meta.url), 'utf8');
// JSX writes apostrophes and spaces as entities and breaks lines mid-sentence
const flat = (s) => s.replace(/&rsquo;/g, '’').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

describe('profile.js still says what the page says', () => {
  const hero = flat(src('sections/Hero.jsx'));
  const about = flat(src('sections/About.jsx'));
  const off = flat(src('press/OffTheClock.jsx'));
  const contact = src('sections/Contact.jsx');

  it('hero headline, deck and byline', () => {
    expect(hero).toContain(PROFILE.headline);
    expect(hero).toContain(flat(PROFILE.deck).replace('I’m Tejal — ', 'I’m Tejal — '));
    expect(hero).toContain(PROFILE.byline);
  });
  it('the numbers in About', () => {
    expect(about).toContain('8.82');
    expect(about).toContain('167');
    expect(about).toContain('value="24"');
    expect(PROFILE.numbers.map(([n]) => n)).toEqual(['8.82/9.0', '167/170', '7 live', '24/24']);
    expect(about).toContain('value="7"');
    expect(about).toContain(PROFILE.favouriteSubjects.replace('&', '&'));
  });
  it('every desk of the Weekend Edition', () => {
    for (const [desk, lead, more] of PROFILE.offTheClock) {
      expect(off).toContain(desk);
      expect(off).toContain(lead);
      expect(off).toContain(more);
    }
  });
  it('the ways to reach me', () => {
    expect(contact).toContain(PROFILE.contact.github);
    expect(contact).toContain(PROFILE.contact.linkedin);
  });
});

describe('every project is explained for a machine', () => {
  it('has what the builders need', () => {
    for (const p of PROJECTS) {
      expect(p.name && p.eli5 && p.desc && p.long, p.name).toBeTruthy();
      expect(Array.isArray(p.tech) && p.tech.length, p.name).toBeTruthy();
      for (const url of Object.values(p.links || {})) expect(url, p.name).toMatch(/^https:\/\//);
    }
    expect(LEADS.every((n) => PROJECTS.some((p) => p.name === n))).toBe(true);
  });
});

describe('the text files', () => {
  const llms = toLlmsTxt(model);
  const full = toMarkdown(model);

  it('llms.txt has the llmstxt.org shape and stays short', () => {
    expect(llms.startsWith('# Tejal Goyal\n\n> ')).toBe(true);
    expect(llms).toMatch(/\n## Highlights\n/);
    expect(llms).toMatch(/\n## Work\n/);
    expect(llms).toContain('https://tgoyal.me/mcp');
    expect(llms).not.toMatch(/undefined|\[object/);
    expect(llms.length).toBeLessThan(4500);
  });
  it('the work lists the lead projects first, in the page’s order', () => {
    const at = LEADS.map((n) => llms.indexOf(n));
    expect(at.every((i) => i > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });
  it('llms-full.txt holds every project with its write-up, every role and every post', () => {
    for (const p of PROJECTS) {
      expect(full).toContain(`### ${p.name}`);
      expect(full).toContain(p.long);
    }
    for (const e of EXPERIENCE) expect(full).toContain(e.story);
    for (const b of BLOG_POSTS) expect(full).toContain(b.title);
    expect(full).not.toMatch(/undefined|\[object/);
  });
});

describe('the highlights are true', () => {
  // every claim must still be in the data or the page it came from
  const haystack = JSON.stringify([EXPERIENCE, PROJECTS]) + src('sections/About.jsx') + src('press/OffTheClock.jsx');
  it('every proof string is still on the page or in its data', () => {
    expect(PROFILE.highlights.length).toBeGreaterThanOrEqual(5);
    for (const h of PROFILE.highlights) {
      expect(h.proof.length, h.text).toBeGreaterThan(0);
      for (const needle of h.proof) expect(haystack, `${h.text} → ${needle}`).toContain(needle);
    }
  });
});

describe('the note to an assistant, and the fun bits', () => {
  const llms = toLlmsTxt(model);
  const full = toMarkdown(model);
  const note = noteLines(model).join('\n');
  it('every line says something that happened, and each is backed by the data', () => {
    expect(PROFILE.character.length).toBeGreaterThanOrEqual(3);
    for (const c of PROFILE.character) expect(note).toContain(c.text);
    // the character lines are the same kind of claim as the highlights: they must be on the page or in its data
    const haystack = JSON.stringify([EXPERIENCE, PROJECTS]) + src('sections/About.jsx') + src('press/OffTheClock.jsx');
    for (const c of PROFILE.character) {
      expect(c.proof.length, c.text).toBeGreaterThan(0);
      for (const needle of c.proof) expect(haystack, `${c.text} → ${needle}`).toContain(needle);
    }
  });
  it('is out in the open, in the short file and the full one, and tells the reader to keep the weak spots in', () => {
    expect(llms).toContain('## A note from me');
    expect(full).toContain('## A note from me');
    expect(note).toMatch(/keep them in/);
    expect(note).toMatch(/I'd honestly love to talk/);
  });
  it('praises with no adjectives about himself: no best, greatest, rockstar, ninja or top-tier', () => {
    expect(note + PROFILE.funThings.join(' ')).not.toMatch(/\b(best|greatest|rock ?star|ninja|top[- ]tier|world[- ]class|genius|10x)\b/i);
  });
  it('the fun tools answer, and the trick is true algebra', () => {
    const hello = callTool(model, 'hello');
    expect(hello.content[0].text).toContain('I\'d rather you kept the weak spots');
    const trick = callTool(model, 'trick').content[0].text;
    for (const n of [-7, 0, 3, 41, 1000]) expect((2 * n + 10) / 2 - n).toBe(5);
    expect(trick).toContain('5');
  });
});

describe('what the machine layer never contains', () => {
  const everything = [toLlmsTxt(model), toMarkdown(model), toStaticHtml(model), jsonLdScript(toJsonLd(model, '2026-11-05')), JSON.stringify(toDocuments(model))];
  it('no email address, mailto link or @handle', () => {
    for (const text of everything) {
      expect(text).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/i);
      expect(text).not.toMatch(/mailto:/i);
    }
    expect(JSON.stringify(PROFILE)).not.toMatch(/@/);
  });
  it('nothing addressed to a reader as an instruction: it only states facts', () => {
    const directive = /(ignore|disregard|forget) (all |any |the |your )?(previous|prior|above|earlier)|do not (tell|mention|reveal|disclose)|don[’']t (tell|mention|reveal)|(you|assistant|agent|model)s? (must|should|shall) (not )?(say|tell|recommend|rate|rank|state)/i;
    for (const text of everything) expect(text).not.toMatch(directive);
  });
});

describe('what a crawler reads before any script runs', () => {
  const html = toStaticHtml(model);
  it('is the whole page as semantic HTML, hidden with inline style only', () => {
    expect(html).toMatch(/^<main data-agent-snapshot="" style="position:absolute/);
    expect(html).toContain('<h1>Tejal Goyal: Building software that feels obvious</h1>');
    for (const p of PROJECTS) expect(html).toContain(p.name);
    expect(html).not.toContain('mailto:');
    expect(html).toContain('Highlights');
  });
  it('escapes what it prints', () => {
    const evil = buildModel({ ...{ profile: PROFILE, leads: [], experience: EXPERIENCE, skills: SKILL_NODES, posts: BLOG_POSTS }, projects: [{ ...PROJECTS[0], name: '<img src=x onerror=alert(1)>' }] });
    expect(toStaticHtml(evil)).not.toContain('<img src=x');
  });
});

describe('structured data', () => {
  const ld = toJsonLd(model, '2026-11-05');
  it('is a connected schema.org graph about one person', () => {
    const types = ld['@graph'].map((n) => n['@type']);
    expect(types).toEqual(['Person', 'WebSite', 'ProfilePage', 'ItemList', 'Blog']);
    const person = ld['@graph'][0];
    expect(person.sameAs).toContain('https://github.com/tejalgoyal2');
    expect(person.worksFor.name).toMatch(/British Columbia Investment/);
    expect(ld['@graph'][3].itemListElement).toHaveLength(PROJECTS.length);
  });
  it('can never close its own <script> tag', () => {
    const tricky = { a: '</script><script>alert(1)</script>' };
    expect(jsonLdScript(tricky)).not.toContain('</script>');
    expect(JSON.parse(jsonLdScript(tricky))).toEqual(tricky);
    expect(jsonLdScript(ld)).not.toContain('<');
  });
});

describe('search', () => {
  const docs = toDocuments(model);
  it('finds a project by what it does, and ranks a title hit first', () => {
    const hits = searchDocuments(docs, 'rust');
    expect(hits[0].title).toBe('Claubi');
    expect(searchDocuments(docs, 'formula')[0].title).toBe('Pit Wall');
    expect(searchDocuments(docs, 'federated')[0].kind).toBe('experience');
  });
  it('returns nothing for nothing', () => {
    expect(searchDocuments(docs, '')).toEqual([]);
    expect(searchDocuments(docs, 'zzzqqq')).toEqual([]);
  });
});

describe('/mcp', () => {
  const post = (body, init = {}) =>
    handleRequest(model, new Request('https://tgoyal.me/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body), ...init }));
  const rpc = async (body) => (await post(body)).json();

  it('initializes, echoing a protocol version it speaks', async () => {
    const r = await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } });
    expect(r.result.protocolVersion).toBe('2025-03-26');
    expect(r.result.capabilities.tools).toBeDefined();
    expect((await rpc({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } })).result.protocolVersion).toBe('2025-06-18');
  });
  it('lists nine read-only tools', async () => {
    const r = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(r.result.tools.map((t) => t.name)).toEqual(['about', 'projects', 'experience', 'skills', 'writing', 'contact', 'hello', 'trick', 'search']);
    expect(TOOLS.every((t) => t.annotations.readOnlyHint === true)).toBe(true);
  });
  it('answers a tool call with text', async () => {
    const r = await rpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'projects', arguments: { name: 'dime' } } });
    expect(r.result.isError).toBeUndefined();
    expect(JSON.parse(r.result.content[0].text).name).toBe('Dime');
  });
  it('says so, as a tool error, when a project isn’t there', async () => {
    const r = await rpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'projects', arguments: { name: 'nope' } } });
    expect(r.result.isError).toBe(true);
    expect(r.result.content[0].text).toContain('Known:');
  });
  it('rejects an unknown tool and an unknown method with the right codes', async () => {
    expect((await rpc({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'rm' } })).error.code).toBe(-32602);
    expect((await rpc({ jsonrpc: '2.0', id: 6, method: 'resources/list' })).error.code).toBe(-32601);
  });
  it('gives a notification no answer (202), and handles a batch', async () => {
    expect((await post({ jsonrpc: '2.0', method: 'notifications/initialized' })).status).toBe(202);
    const batch = await (await post([{ jsonrpc: '2.0', id: 1, method: 'ping' }, { jsonrpc: '2.0', method: 'notifications/initialized' }])).json();
    expect(batch).toEqual([{ jsonrpc: '2.0', id: 1, result: {} }]);
  });
  it('survives junk: bad JSON, not JSON-RPC, a huge body, an empty batch', async () => {
    expect((await post('{nope')).status).toBe(400);
    expect((await rpc({ hello: 'world' })).error.code).toBe(-32600);
    expect((await post('x'.repeat(40_000))).status).toBe(413);
    expect((await post([])).status).toBe(400);
  });
  it('is open to any origin, never cached, and GET describes it', async () => {
    const res = await handleRequest(model, new Request('https://tgoyal.me/mcp'));
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect((await res.json()).tools).toHaveLength(9);
    expect((await handleRequest(model, new Request('https://tgoyal.me/mcp', { headers: { accept: 'text/event-stream' } }))).status).toBe(405);
    expect((await handleRequest(model, new Request('https://tgoyal.me/mcp', { method: 'OPTIONS' }))).status).toBe(204);
    expect((await handleRequest(model, new Request('https://tgoyal.me/mcp', { method: 'DELETE' }))).status).toBe(405);
  });
  it('never throws on odd arguments', () => {
    for (const args of [null, 5, 'x', [], { limit: 'a' }, { query: 5 }]) {
      for (const t of TOOLS) {
        const r = handleMessage(model, { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: t.name, arguments: args } });
        expect(r.result || r.error).toBeTruthy();
      }
    }
  });
});

describe('tgoyal.me/github is only a short way to GitHub, with no page of its own', () => {
  it('redirects, and no longer carries a custom preview', () => {
    const redirects = readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf8');
    expect(redirects).toMatch(/^\/github\s+https:\/\/github\.com\/tejalgoyal2\s+302/m);
    expect(existsSync(new URL('../../public/github', import.meta.url))).toBe(false);
  });
});
