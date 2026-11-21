// A stand-in for mobd with made-up conversations, so product screenshots show no real work.
// Usage: node tools/screens/fake-mobd.mjs PORT NAME SCREEN.jpg
// Serves the parts of mobd's API Mob Desktop reads; pairing accepts any invite. See shoot.py.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const [port, which, screenPath] = [Number(process.argv[2]), process.argv[3], process.argv[4]];
const screen = screenPath ? readFileSync(screenPath) : null;
const now = Date.now();
const at = (minAgo) => new Date(now - minAgo * 60_000).toISOString();

const RUNNERS = {
  claude: { label: "Claude Code", models: ["opus", "sonnet", "haiku"], efforts: ["low", "medium", "high"] },
  codex: { label: "Codex", models: ["gpt-5.5", "gpt-5.5-mini"], efforts: ["low", "medium", "high", "xhigh"] },
  pi: { label: "Pi", models: [], efforts: ["low", "medium", "high"] },
  opencode: { label: "OpenCode", models: [], efforts: [], protocol: "acp" },
};
// What each agent takes in config.json (feature agentOptions), as mobd's adapters list it.
const path = (key, label, help, value) => ({ key, label, help, type: "path", value, restart: true });
const OPTIONS = {
  claude: [path("bin", "Program", "Claude Code's executable", "/usr/local/bin/claude"), path("workdir", "Works in", "The folder Claude Code works in", "/Users/sam/Projects"),
    { key: "settingSources", label: "Settings it loads", type: "choice", value: "project", restart: true,
      choices: [{ value: "project", label: "Project" }, { value: "all", label: "All" }] }],
  codex: [path("bin", "Program", "Codex's executable", "/usr/local/bin/codex"),
    { key: "mode", label: "Mode", type: "choice", value: "app-server", restart: true, choices: [{ value: "app-server", label: "App server" }, { value: "exec", label: "Exec" }] }],
  pi: [path("bin", "Program", "Pi's executable", "/usr/local/bin/pi")],
  opencode: [path("bin", "Program", 'OpenCode\'s executable, started with "acp"', "opencode"), path("workdir", "Works in", "The folder OpenCode works in", "/Users/sam/Projects")],
  dsh: [path("bin", "Program", 'DeepSeek Harness\'s executable, started with "--profile acp"', "dsh"), path("workdir", "Works in", "The folder DeepSeek Harness works in", "/Users/sam/Projects")],
};

let seq = 0;
const id = (p) => `${p}${(++seq).toString(16).padStart(8, "0")}`;

/** A conversation: summary, its turns, messages, steps and questions. */
function conv({ title, runner, handle, model = "sonnet", effort = "high", ago, minutes = 3, status = "succeeded", pinned, prompt, reply, steps = [], question }) {
  const sid = id("s");
  const tid = id("t");
  const running = status === "running" || status === "queued";
  const started = at(ago + minutes);
  const task = {
    id: tid, sessionId: sid, eventId: 40, prompt, status, runner, model, effort,
    createdAt: started, startedAt: started, updatedAt: at(ago), finishedAt: running ? undefined : at(ago),
    usage: { inputTokens: 18_400 + minutes * 900, cachedInputTokens: 12_000, outputTokens: 2_100, reasoningOutputTokens: 600, costUsd: runner === "claude" ? 0.08 + minutes / 100 : undefined },
    waiting: !!question,
  };
  const messages = [{ id: id("m"), taskId: tid, role: "user", content: prompt, createdAt: started }];
  if (reply) messages.push({ id: id("m"), taskId: tid, role: "assistant", content: reply, createdAt: at(ago + 0.2) });
  const activities = steps.map(([kind, title, extra = {}], i) => ({
    id: id("a"), taskId: tid, kind, status: extra.failed ? "failed" : "completed", title,
    startedAt: at(ago + minutes - (i + 1) * (minutes / (steps.length + 1))), updatedAt: at(ago + minutes - (i + 1.5) * (minutes / (steps.length + 1))),
    ...extra.fields,
  }));
  const questions = question ? [{ id: id("q"), taskId: tid, status: "pending", allowText: true, createdAt: at(ago), ...question }] : [];
  const session = {
    id: sid, title, runner, model, effort, status, pinned, handle, waiting: !!question,
    activeTaskId: running ? tid : undefined, createdAt: started, updatedAt: at(ago), turns: 1,
  };
  return { session, tasks: [task], messages, activities, questions };
}

const cmd = (command, exitCode = 0, text) => ["command", command, { failed: exitCode !== 0, fields: { command, exitCode, text } }];
const edit = (path, kind = "update") => ["file_change", `Edited ${path}`, { fields: { changes: [{ path, kind }] } }];
const tool = (t, title) => ["tool", title, { fields: { tool: t } }];

const DATA = {
  local: {
    computerName: "This computer",
    workdir: "/Users/ana/Projects/web",
    sessions: [
      conv({
        title: "Fix the failing build", runner: "claude", handle: "web", ago: 4, minutes: 2, status: "running",
        prompt: "The CI build on main is failing. Fix it, run the tests and push.",
        reply: "The build broke because `StreamSession` changed its options type upstream. I updated the two call sites; all 141 tests pass now.\n\nReady to push one commit to `origin/main`.",
        steps: [
          cmd("gh run view 2214 --log-failed"),
          cmd("npm test", 1, "✕ stream.test.mjs › opens a session\n  TypeError: options.quality is not a function"),
          edit("src/lib/stream.ts"), edit("src/hooks/useLive.ts"),
          cmd("npm test", 0, "Tests: 141 passed, 141 total"),
        ],
        question: { kind: "approval", text: "Push 1 commit to origin/main?", details: "fix(stream): adapt to the new StreamSession options" },
      }),
      conv({
        title: "Release notes for 0.5.3", runner: "codex", model: "gpt-5.5", ago: 1, minutes: 6, status: "queued",
        prompt: "Write the release notes for 0.5.3 from the merged pull requests.",
        steps: [cmd("git log v0.5.2..main --oneline"), cmd("gh pr list --state merged --limit 40")],
      }),
      conv({ title: "Clean up Downloads", runner: "claude", ago: 120, prompt: "Sort my Downloads folder: installers to Trash, invoices into Documents/Invoices.", reply: "Moved 14 invoices to Documents/Invoices and 9 installers to the Trash. 3 files I wasn't sure about are in Downloads/Check." }),
      conv({ title: "Upgrade to React 19", runner: "codex", model: "gpt-5.5", ago: 300, pinned: true, prompt: "Upgrade the app to React 19 and fix what breaks.", reply: "Done: React 19, two deprecated APIs replaced, tests pass." }),
      conv({ title: "Explain the auth middleware", runner: "claude", ago: 1500, prompt: "How does the auth middleware decide who is signed in?", reply: "It reads the session cookie, then…" }),
      conv({ title: "Profile the slow search page", runner: "codex", model: "gpt-5.5", ago: 2900, prompt: "Why is /search slow?", reply: "Two N+1 queries; fixed one." }),
      conv({ title: "Draft the Q4 roadmap email", runner: "claude", ago: 4300, prompt: "Draft an email with the Q4 roadmap for the team.", reply: "Here's a draft…" }),
    ],
  },
  office: {
    computerName: "Studio Mac",
    workdir: "/Users/office/Mob",
    sessions: [
      conv({
        title: "Book flights to Tokyo", runner: "claude", handle: "travel", ago: 2, minutes: 7, status: "running",
        prompt: "Find the cheapest morning flight to Tokyo on Oct 20 and book it. Ask me before paying.",
        reply: "ANA NH10 at 10:25 is the cheapest morning option (¥84,200, refundable until Oct 18). The booking form is filled in.",
        steps: [tool("open_app", "Opened Safari"), tool("screenshot", "Took 6 screenshots of fare tables"), tool("click", "Clicked “10:25 NH10 · ¥84,200”"), tool("type_text", "Typed passenger details")],
        question: { kind: "approval", text: "Pay ¥84,200 to ANA for NH10?", details: "Economy · seat 34K · card ending 4421" },
      }),
      conv({ title: "Rotate staging certificates", runner: "codex", model: "gpt-5.5", ago: 1, minutes: 4, status: "queued", prompt: "Rotate the TLS certificates on staging.", steps: [cmd("certbot renew --cert-name staging")] }),
      conv({ title: "Weekly sales report", runner: "codex", model: "gpt-5.5", ago: 200, prompt: "Make this week's sales report from the CRM export and email it to the team.", reply: "Report sent: revenue up 6%, three deals closed. The spreadsheet is in mob-files." }),
      conv({ title: "Fill in the expense form", runner: "claude", ago: 1600, prompt: "Fill in last month's expense form from the receipts in mob-files/receipts.", reply: "Submitted: 11 receipts, €418.20." }),
      conv({ title: "Renew the domain", runner: "claude", ago: 3000, prompt: "Renew example.com for two years.", reply: "Renewed until 2028." }),
    ],
  },
  linux: { computerName: "Linux box", workdir: "/home/ci/work", sessions: [conv({ title: "Investigate memory leak", runner: "codex", model: "gpt-5.5", ago: 600, status: "failed", prompt: "Find the memory leak in the worker." })] },
}[which];

const serverId = `${which}-server`.padEnd(64, "0");
const sessions = DATA.sessions;
const byId = new Map(sessions.map((c) => [c.session.id, c]));

const health = () => ({
  ok: true, service: "mobd", apiVersion: 3, version: "0.5.3", runner: "claude", maxRunning: 1, workdir: DATA.workdir,
  features: ["queue", "activities", "sessionAdmin", "events", "screen", "uploads", "taskOptions", "runners", "questions", "steer", "pairing", "stream", "streamResize", "settings", "fileTransfers", "agentCollaboration", "unpair", "maintenance", "agentOptions"],
  runners: Object.entries(RUNNERS).map(([name, r]) => ({ name, ...r, images: true, resume: true, cost: name === "claude", steer: name !== "claude" && !r.protocol, available: true, default: name === "claude" })),
  agents: [
    ...Object.entries(RUNNERS).map(([name, r]) => ({ name, label: r.label, state: "ready", enabled: true, bin: `/usr/local/bin/${name}`, version: "1.0",
      protocol: r.protocol ?? "native", options: OPTIONS[name] })),
    { name: "dsh", label: "DeepSeek Harness", state: "missing", enabled: false, detail: "\"dsh\" not found", install: "npm install -g @deepseek-ai/dsh", protocol: "acp", options: OPTIONS.dsh },
  ],
  checks: { accessibility: { ok: true }, screenRecording: { ok: true }, claude: { ok: true }, codex: { ok: true } },
});
const settings = () => ({
  settings: {
    rev: 3, defaultAgent: "claude",
    agents: Object.fromEntries(Object.entries(RUNNERS).map(([n, r]) => [n, { models: r.models, defaultModel: r.models[1] ?? "", defaultEffort: r.efforts.length ? "high" : "", permissions: n === "claude" ? "approve" : "bypass" }])),
  },
  agents: Object.fromEntries(Object.entries(RUNNERS).map(([n, r]) => [n, { label: r.label, efforts: r.efforts }])),
  installed: health().agents,
});
const config = () => ({
  rev: "a1", values: { runners: ["claude", "codex", "pi", "opencode"] },
  editable: ["runners", "workdir", "maxRunning", "questionTimeout", "filesDir", ...Object.entries(OPTIONS).flatMap(([n, os]) => os.map((o) => `agents.${n}.${o.key}`))],
  effective: { runners: ["claude", "codex", "pi", "opencode"], workdir: DATA.workdir, claudeBin: "/usr/local/bin/claude", codexBin: "/usr/local/bin/codex", piBin: "/usr/local/bin/pi", claudeSettingSources: "project" },
  overridden: [], pendingRestart: false, canRestart: true,
});

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Expose-Headers", "ETag, X-Mob-Desktop-State");
  if (req.method === "OPTIONS") return send(res, 204, "", "text/plain");
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  let m;
  if (p === "/pair" && req.method === "POST") return send(res, 200, { token: "screenshots", clientId: id("c"), serverId, computerName: DATA.computerName });
  if (p === "/pair") return send(res, 200, {});
  if (p === "/health") return send(res, 200, health());
  if (p === "/events" || /^\/tasks\/[^/]+\/events$/.test(p)) {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store" });
    res.write(": open\n\n");
    const t = setInterval(() => res.write(": ping\n\n"), 15_000);
    return req.on("close", () => clearInterval(t));
  }
  if (p === "/sessions") return send(res, 200, { sessions: url.searchParams.get("archived") ? [] : sessions.map((c) => c.session) });
  if ((m = p.match(/^\/sessions\/([^/]+)$/))) {
    const c = byId.get(m[1]);
    if (!c) return send(res, 404, { error: "not found" });
    return send(res, 200, { session: { ...c.session, messages: c.messages }, tasks: c.tasks, activities: c.activities, questions: c.questions });
  }
  if (p === "/queue") {
    const tasks = sessions.map((c) => c.tasks[0]);
    return send(res, 200, {
      running: tasks.filter((t) => t.status === "running"),
      queued: tasks.filter((t) => t.status === "queued").map((t, i) => ({ ...t, queuePosition: i + 1 })),
    });
  }
  if (p === "/collab") return send(res, 200, { requests: [] });
  if (p === "/settings") return send(res, 200, settings());
  if (p === "/config") return send(res, 200, config());
  if (p === "/maintenance/latest") return send(res, 200, { current: "0.5.3", latest: "0.5.3", newer: false, canUpgrade: true });
  if (p === "/screen" && screen) {
    res.writeHead(200, { "Content-Type": "image/jpeg", ETag: '"s1"', "Cache-Control": "no-store" });
    return res.end(screen);
  }
  send(res, 404, { error: "not in the screenshot stand-in" });
}).listen(port, "127.0.0.1", () => console.log(`fake mobd ${which} on ${port}`));
