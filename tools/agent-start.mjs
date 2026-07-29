#!/usr/bin/env node
// Prepares an agent worktree so the operator only has to say "start".
//
// Writes an untracked START.md into the target worktree naming which agent it
// is and which workstream it owns. AGENTS.md, CLAUDE.md, and GEMINI.md all
// instruct an agent to read START.md first, so every vendor picks up its
// assignment from the file its own toolchain already auto-loads.
//
// START.md is deliberately untracked: it is per-worktree scaffolding, and
// committing it would collide across branches at merge time.
//
// Usage:
//   node tools/agent-start.mjs            # status for every agent
//   node tools/agent-start.mjs codex      # prepare one agent
//   node tools/agent-start.mjs --all      # prepare every unblocked agent

import { access, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const worktreeRoot = resolve(
  repositoryRoot,
  "../../.worktrees/signbridge-overlay",
);

const agents = [
  {
    id: "claude",
    label: "Claude (Opus 5)",
    worktree: "w2-renderer",
    workstream: "W2",
    briefSection: "Claude — W2, renderer and overlay",
    owns: ["packages/sign-renderer/", "apps/pwa/", "tools/"],
    summary:
      "Sign renderer, accessible overlay, build-time size assertion, and the " +
      "abstract synthetic-motion generator.",
    blockedBy: null,
  },
  {
    id: "codex",
    label: "Codex",
    worktree: "w3-extension",
    workstream: "W3",
    briefSection: "Codex — W3, extension and YouTube adapter",
    owns: ["packages/video-adapters/", "apps/extension/"],
    summary:
      "Manifest V3 extension with YouTube-only host access, the YouTube " +
      "adapter, and the permission and CSP release tests.",
    blockedBy: null,
  },
  {
    id: "fable",
    label: "Fable 5",
    worktree: "w5-reviewer",
    workstream: "W5",
    briefSection: "Fable 5 — W5, reviewer console",
    owns: ["apps/reviewer/", "tests/"],
    summary:
      "The reviewer console: every decision visible, fully keyboard operable, " +
      "and honest about its empty and blocked states.",
    blockedBy: null,
  },
  {
    id: "gemini",
    label: "Gemini / Antigravity",
    worktree: "w0-authoring",
    workstream: "W0.1",
    briefSection: "Gemini / Antigravity — W0.1, deployed authoring service",
    owns: ["services/authoring/"],
    summary:
      "The deployed authoring service that makes the live Gemini call, with " +
      "structured output and a first-class unsupported result.",
    blockedBy:
      "Owner must confirm Google Cloud billing, provide a Gemini API key, and " +
      "approve @google/genai as a production dependency for services/authoring.",
  },
];

function renderStartFile(agent) {
  return `# START — ${agent.label}

You are the **${agent.label}** agent on this project. This file is your
assignment. It is untracked scaffolding, not part of the product.

## Your workstream: ${agent.workstream}

${agent.summary}

## Do this now

1. Read \`AGENTS.md\` in full. It is the authoritative contract and it
   overrides anything in this file.
2. Read \`docs/agent-briefs.md\` and find the section titled
   **"${agent.briefSection}"**. That is your complete brief — task,
   acceptance criteria, and hard rules.
3. Read \`docs/execution-plan.md\` §1 and the ${agent.workstream} entry in §6.
4. Begin.

## You own only these paths

${agent.owns.map((path) => `- \`${path}\``).join("\n")}

Anything outside them: report it, do not change it. Another agent owns it and
is working in it right now.

## Done means exactly this

\`\`\`bash
node /Users/omar/Downloads/Claude/Workspace/scripts/ws.mjs verify \\
  signbridge-overlay --worktree ${agent.worktree}
\`\`\`

passes. Not "nearly passes". Not "passes except one test". Then update
\`HANDOFF.md\` with what landed and what remains.

## The rules that matter most

These are not boilerplate. Each one describes something a capable agent does in
good faith, trying to be helpful, that would damage this project:

- **Never fabricate signing.** No video of a human appearing to sign, no
  avatar, no generated or synthesised sign language, no motion presented as
  American Sign Language. The reviewer and rights gates are closed, so no such
  media may exist here.
- **Never fake an approval.** No invented reviewer identity, consent record,
  rights grant, review event, or approval — not even as a placeholder to make a
  screen look populated. An empty queue is the truthful state.
- **Never use \`ase\` or any real signed-language code** in a fixture. Synthetic
  fixtures use the reserved \`zxx\`/\`ZZ\` markers only.
- **Never weaken a test to go green.** If a check blocks you, it is working.
  Fix the code, not the check. Escalate if you disagree.
- **Never add a production dependency** unless your brief explicitly grants one.
- **Never push to \`main\`, deploy, or send anything outward.**

\`tools/verify-baseline.mjs\` enforces most of this mechanically, with tests
proving each check fires. It will catch you. That is the point.
`;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const requested = process.argv[2];
const prepareAll = requested === "--all";
const selected = prepareAll
  ? agents
  : requested
    ? agents.filter((agent) => agent.id === requested)
    : [];

if (requested && !prepareAll && selected.length === 0) {
  console.error(
    `Unknown agent "${requested}". Known: ${agents.map((a) => a.id).join(", ")}`,
  );
  process.exit(1);
}

if (selected.length === 0) {
  console.log("SignBridge agents\n");

  for (const agent of agents) {
    const path = join(worktreeRoot, agent.worktree);
    const ready = await exists(path);
    const started = ready && (await exists(join(path, "START.md")));

    const state = !ready
      ? "NO WORKTREE"
      : agent.blockedBy
        ? "BLOCKED"
        : started
          ? "ready — START.md written"
          : "needs preparing";

    console.log(`  ${agent.id.padEnd(8)} ${agent.workstream.padEnd(5)} ${state}`);
    if (agent.blockedBy) {
      console.log(`           └─ ${agent.blockedBy}`);
    }
  }

  console.log("\nPrepare one:  node tools/agent-start.mjs <id>");
  console.log("Prepare all:  node tools/agent-start.mjs --all");
  process.exit(0);
}

for (const agent of selected) {
  const path = join(worktreeRoot, agent.worktree);

  if (!(await exists(path))) {
    console.error(`${agent.id}: worktree missing at ${path}`);
    console.error(
      `  create it: node Workspace/scripts/ws.mjs task start signbridge-overlay ${agent.worktree}`,
    );
    process.exitCode = 1;
    continue;
  }

  if (agent.blockedBy && !prepareAll) {
    console.log(`${agent.id}: BLOCKED — ${agent.blockedBy}`);
    console.log("  Preparing anyway so it is ready the moment that clears.\n");
  } else if (agent.blockedBy) {
    console.log(`${agent.id}: BLOCKED — ${agent.blockedBy}\n`);
  }

  await writeFile(join(path, "START.md"), renderStartFile(agent), "utf8");

  console.log(`${agent.label} — ${agent.workstream}`);
  console.log(`  Open:  ${path}`);
  console.log(`  Say:   start`);
  console.log("");
}

// Guard against START.md ever being committed.
const gitignore = await readFile(join(repositoryRoot, ".gitignore"), "utf8");
if (!gitignore.includes("START.md")) {
  console.error(
    "WARNING: .gitignore does not exclude START.md; it must stay untracked.",
  );
  process.exitCode = 1;
}
