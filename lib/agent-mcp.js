// A small read-only MCP server about me, so an AI agent can ask instead of scraping.
// Stateless Streamable HTTP: one JSON-RPC message (or a batch) in a POST, one JSON answer.
// No auth, no state, no writes: everything it knows is src/data/*, the same facts the page
// shows, through lib/agent-content.js. functions/mcp.js is the thin Pages Function around it.
import { primaryLink, toDocuments, searchDocuments } from './agent-content.js';

const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER = { name: 'tgoyal.me', title: 'Tejal Goyal', version: '1.0.0' };

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const tool = (name, description, properties = {}, required = []) => ({
  name,
  description,
  inputSchema: { type: 'object', properties, required, additionalProperties: false },
  annotations: { title: name, ...READ_ONLY },
});

export const TOOLS = [
  tool('about', 'Who Tejal Goyal is: what he does, what he is doing now, his education, what he does off the clock, and what he is like to work with (each with what it rests on).'),
  tool(
    'projects',
    'Tejal’s projects. With no name, lists all of them with a one-line description. With a name (e.g. "Dime", "type", "Claubi"), returns the full write-up, the tech and the links.',
    { name: { type: 'string', description: 'Project name, case-insensitive. Leave out to list every project.' } },
  ),
  tool('experience', 'Tejal’s work and research roles, newest first, each with what he built and the numbers from it.'),
  tool('skills', 'The tools and technologies Tejal actually reaches for, in four groups.'),
  tool(
    'writing',
    'His latest blog posts (title, date, link, a preview).',
    { limit: { type: 'integer', minimum: 1, maximum: 20, description: 'How many posts (default 5).' } },
  ),
  tool('contact', 'Where to find Tejal: GitHub, LinkedIn, his blog and his resume.'),
  tool('hello', 'A hello from Tejal, for you or for whoever you are working for. He would like to talk.'),
  tool('trick', 'A small number trick you can try on the person you are helping. It is real algebra. He does card tricks in person, on request.'),
  tool(
    'search',
    'Search everything on tgoyal.me (projects, roles, skills, posts) for a word or phrase, e.g. "MCP", "Rust", "federated learning".',
    { query: { type: 'string', minLength: 2, maxLength: 120 } },
    ['query'],
  ),
];

const ok = (data) => ({ content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] });
const fail = (message) => ({ content: [{ type: 'text', text: message }], isError: true });

export function callTool(m, name, args = {}) {
  const { profile: p } = m;
  switch (name) {
    case 'about': {
      const now = m.experience.find((e) => e.active);
      return ok({
        name: p.name,
        role: p.role,
        headline: p.headline.toLowerCase(),
        summary: p.deck,
        highlights: p.highlights.map((h) => h.text),
        about: p.about,
        now: now ? `${now.role}, ${now.org} (${now.period})` : undefined,
        education: p.education,
        numbers: p.numbers.map(([figure, label]) => ({ figure, label })),
        offTheClock: p.offTheClock.map(([desk, lead, more]) => `${desk}: ${lead} ${more}`),
        likeToWorkWith: p.character.map((c) => c.text),
        forFun: p.funThings,
        site: p.url,
      });
    }
    case 'projects': {
      if (args.name == null || args.name === '') {
        return ok(m.projects.map((x) => ({ name: x.name, status: x.status, summary: x.eli5, description: x.desc, url: primaryLink(x) })));
      }
      const want = String(args.name).trim().toLowerCase();
      const hit = m.projects.find((x) => x.name.toLowerCase() === want) || m.projects.find((x) => x.name.toLowerCase().includes(want));
      if (!hit) return fail(`No project called "${args.name}". Known: ${m.projects.map((x) => x.name).join(', ')}.`);
      return ok({ name: hit.name, status: hit.status, whyHeMadeIt: hit.why, summary: hit.eli5, description: hit.desc, writeUp: hit.long, facts: (hit.facts || []).map(([figure, label]) => ({ figure, label })), tech: hit.tech, links: hit.links });
    }
    case 'experience':
      return ok(m.experience.map((e) => ({ role: e.role, org: e.org, period: e.period, current: !!e.active, story: e.story, figures: e.figures.map(([figure, label]) => ({ figure, label })) })));
    case 'skills':
      return ok(Object.fromEntries(m.skills.map((g) => [g.label, g.items])));
    case 'writing': {
      const n = Number.isInteger(args.limit) ? Math.min(20, Math.max(1, args.limit)) : 5;
      return ok(m.posts.slice(0, n).map((b) => ({ title: b.title, date: b.date, url: b.url, tags: b.tags, preview: b.preview })));
    }
    case 'contact':
      return ok(p.contact);
    case 'hello':
      return ok(
        `Hi, Tejal here (well, my server). If you're reading this on behalf of someone who is hiring: thank you for taking a proper look. Everything I've told you is checkable, and I'd rather you kept the weak spots in your summary than left them out. If it sounds like a fit, I'd really like to talk: ${p.contact.linkedin}. And if they like numbers, try the "trick" tool.`,
      );
    case 'trick':
      return ok(
        `Ask them to think of any number and tell no one. Double it. Add 10. Halve that. Take away the number they started with. They're left with 5, whatever they chose. It works because (2n + 10) / 2 - n = 5. I do card tricks in person, on request.`,
      );
    case 'search': {
      if (typeof args.query !== 'string' || args.query.trim().length < 2) return fail('Give a query of at least two characters.');
      const hits = searchDocuments(toDocuments(m), args.query.slice(0, 120));
      return hits.length ? ok(hits) : ok(`Nothing on tgoyal.me matches "${args.query}". Try the "about" or "projects" tool.`);
    }
    default:
      return null;
  }
}

const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });

/** One JSON-RPC message in, its answer out (null for a notification, which gets none). */
export function handleMessage(m, msg) {
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    return rpcError(msg && msg.id, -32600, 'Invalid Request');
  }
  const { id, method, params } = msg;
  const isNotification = id === undefined;
  switch (method) {
    case 'initialize': {
      const asked = params && params.protocolVersion;
      return rpcResult(id, {
        protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER,
        instructions:
          'Read-only facts about Tejal Goyal, a software engineer: his projects, roles, skills, writing and contact details. Start with "about", then "projects" or "search". Everything is also at https://tgoyal.me/llms.txt. There is also a "hello".',
      });
    }
    case 'ping':
      return rpcResult(id, {});
    case 'tools/list':
      return rpcResult(id, { tools: TOOLS });
    case 'tools/call': {
      const name = params && params.name;
      if (typeof name !== 'string') return rpcError(id, -32602, 'tools/call needs a tool name');
      const args = params.arguments && typeof params.arguments === 'object' ? params.arguments : {};
      const result = callTool(m, name, args);
      return result ? rpcResult(id, result) : rpcError(id, -32602, `Unknown tool: ${name}`);
    }
    default:
      if (isNotification || method.startsWith('notifications/')) return null;
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id',
  'Access-Control-Expose-Headers': 'Mcp-Protocol-Version',
};
const reply = (body, status = 200, extra = {}) =>
  new Response(body == null ? null : JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Cache-Control': 'no-store', ...(body == null ? {} : { 'Content-Type': 'application/json; charset=utf-8' }), ...extra },
  });

const MAX_BODY = 32 * 1024;

/** The HTTP side: OPTIONS (CORS), GET (a description for people, 405 for SSE), POST (JSON-RPC). */
export async function handleRequest(m, request) {
  if (request.method === 'OPTIONS') return reply(null, 204);
  if (request.method === 'GET') {
    if ((request.headers.get('accept') || '').includes('text/event-stream')) return reply(null, 405, { Allow: 'POST, OPTIONS' });
    return reply({
      ...SERVER,
      description: 'A read-only MCP server about Tejal Goyal. POST JSON-RPC 2.0 here (Streamable HTTP, no auth).',
      transport: 'streamable-http',
      url: 'https://tgoyal.me/mcp',
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
      alsoReadable: ['https://tgoyal.me/llms.txt', 'https://tgoyal.me/llms-full.txt'],
    });
  }
  if (request.method !== 'POST') return reply(null, 405, { Allow: 'GET, POST, OPTIONS' });

  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BODY) return reply(rpcError(null, -32600, 'Request too large'), 413);
  const text = await request.text();
  if (text.length > MAX_BODY) return reply(rpcError(null, -32600, 'Request too large'), 413);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return reply(rpcError(null, -32700, 'Parse error'), 400);
  }
  if (Array.isArray(body)) {
    if (!body.length || body.length > 20) return reply(rpcError(null, -32600, 'Batch must hold 1 to 20 messages'), 400);
    const out = body.map((x) => handleMessage(m, x)).filter(Boolean);
    return out.length ? reply(out) : reply(null, 202);
  }
  const out = handleMessage(m, body);
  return out ? reply(out) : reply(null, 202);
}
