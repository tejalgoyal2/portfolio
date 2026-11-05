// /mcp — a read-only MCP server about me (lib/agent-mcp.js has the protocol and the tools).
// Nothing to configure: no bindings, no secrets, no writes. Its facts come from src/data/*,
// bundled in at deploy, so a new project or post reaches it with the same push that shows it.
import { PROFILE } from '../src/data/profile.js';
import { PROJECTS, LEADS } from '../src/data/projects.js';
import { EXPERIENCE } from '../src/data/experience.js';
import { SKILL_NODES } from '../src/data/skills.js';
import { BLOG_POSTS } from '../src/data/blog.js';
import { buildModel } from '../lib/agent-content.js';
import { handleRequest } from '../lib/agent-mcp.js';

const model = buildModel({ profile: PROFILE, projects: PROJECTS, leads: LEADS, experience: EXPERIENCE, skills: SKILL_NODES, posts: BLOG_POSTS });

export const onRequest = ({ request }) => handleRequest(model, request);
