import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);

// plugins/claude/src/worker.mjs
import { spawn, execFile as execFile2 } from "node:child_process";
import { access, writeFile as writeFile2 } from "node:fs/promises";
import path2 from "node:path";

// plugins/claude/src/claude.mjs
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// plugins/claude/src/models.mjs
var family = "(opus|sonnet|haiku|fable)";
var namedModel = new RegExp(`^(?:claude[ -]+)?${family}[ -]*(\\d+(?:[.-]\\d+)*)(\\[1m\\])?$`, "i");
function normalizeModel(value) {
  if (value === void 0) return void 0;
  if (typeof value !== "string") throw new Error("Model must be a string");
  const name = value.trim();
  const match = namedModel.exec(name);
  if (match) return `claude-${match[1].toLowerCase()}-${match[2].replaceAll(".", "-")}${match[3]?.toLowerCase() || ""}`;
  if (!name || name.length > 150 || !/^[a-zA-Z0-9][a-zA-Z0-9._:/\[\]-]*$/.test(name)) {
    throw new Error("Invalid model. Use a Claude model ID or a name such as Opus 5 or Fable 5.1.");
  }
  return /^(opus|sonnet|haiku|fable)$/i.test(name) ? name.toLowerCase() : name;
}
function modelConfirmation(request) {
  const model = normalizeModel(request.model);
  if (!model || !/(?:^|[^a-z])fable(?:$|[^a-z])/i.test(model) || request.confirmFable === true) return null;
  return {
    state: "confirmation_required",
    code: "FABLE_CONFIRMATION_REQUIRED",
    model,
    warning: "Fable\u30B7\u30EA\u30FC\u30BA\u306FClaude Max\u7B49\u306E\u5BFE\u8C61\u30D7\u30E9\u30F3\u3001\u307E\u305F\u306F\u5229\u7528\u30AF\u30EC\u30B8\u30C3\u30C8\u304C\u5FC5\u8981\u3067\u3059\u3002Pro\u7B49\u3067\u306F\u5229\u7528\u30AF\u30EC\u30B8\u30C3\u30C8\u3092\u6D88\u8CBB\u3057\u3001API\u3067\u306F\u5F93\u91CF\u8AB2\u91D1\u306B\u306A\u308A\u307E\u3059\u3002\u5229\u7528\u6761\u4EF6\u3068\u30AF\u30EC\u30B8\u30C3\u30C8\u6D88\u8CBB\u306E\u53EF\u80FD\u6027\u3092\u4E86\u627F\u3057\u3066\u5B9F\u884C\u3057\u307E\u3059\u304B\uFF1F",
    instructions: "Wait for explicit user consent for this request, then retry with confirmFable:true. A user-provided -y or -yes flag also counts as consent. Do not set consent automatically or infer it from task text."
  };
}

// plugins/claude/src/claude.mjs
var exec = promisify(execFile);
var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function buildArgs(request) {
  const confirmation = modelConfirmation(request);
  if (confirmation) throw new Error(confirmation.warning);
  const write = request.command === "rescue" && request.write === true;
  const tools = request.command === "test" ? "" : "Read,Glob,Grep" + (write ? ",Edit,Write" : "");
  const args = [
    "--print",
    "--restricted",
    "--output-format",
    "json",
    "--permission-mode",
    "dontAsk",
    "--tools",
    tools,
    ...tools ? ["--allowedTools", tools] : [],
    "--disable-slash-commands",
    "--strict-mcp-config",
    "--mcp-config",
    '{"mcpServers":{}}',
    "--settings",
    '{"disableAllHooks":true}'
  ];
  if (request.model) args.push("--model", normalizeModel(request.model));
  if (request.effort) args.push("--effort", request.effort);
  if (request.resume) {
    if (!uuidPattern.test(request.resume)) throw new Error("Invalid Claude session UUID");
    args.push("--resume", request.resume);
  }
  return args;
}
function childEnvironment() {
  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  return env;
}

// plugins/claude/src/store.mjs
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, unlink, stat } from "node:fs/promises";
import path from "node:path";
async function atomicJson(file, value) {
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value, null, 2), { mode: 384 });
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        await rename(temp, file);
        break;
      } catch (error) {
        if (process.platform !== "win32" || !["EPERM", "EACCES", "EBUSY"].includes(error.code) || attempt >= 10) throw error;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  } finally {
    await unlink(temp).catch(() => {
    });
  }
}
async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}
async function releaseLease(dir, id) {
  const file = path.join(path.dirname(dir), "active.lock");
  if (await readFile(file, "utf8").catch(() => "") === id) await unlink(file).catch(() => {
  });
}

// plugins/claude/src/diagnostics.mjs
function failureDiagnostic(stdout, stderr, fallback) {
  let detail;
  try {
    const parsed = JSON.parse(stdout);
    const result = Array.isArray(parsed) ? parsed.findLast((item) => item?.type === "result") : parsed;
    if (result?.type === "result" && result.is_error) {
      detail = typeof result.result === "string" && result.result.trim() ? result.result.trim() : result.errors ? JSON.stringify(result.errors) : void 0;
    }
  } catch {
  }
  const errorText = stderr?.trim();
  return ([...new Set([detail, errorText].filter(Boolean))].join("\n") || fallback).slice(0, 4e3);
}

// plugins/claude/src/worker.mjs
async function run(dir) {
  const request = await readJson(path2.join(dir, "request.json"));
  const initial = await readJson(path2.join(dir, "state.json"));
  let child, stopReason, stdout = "", stderr = "", outputSize = 0;
  const stateFile = path2.join(dir, "state.json");
  const beat = () => writeFile2(path2.join(dir, "heartbeat"), String(Date.now()), { mode: 384 }).catch(() => {
  });
  await beat();
  const heartbeat = setInterval(beat, 1e3);
  const stop = (reason) => {
    if (stopReason) return;
    stopReason = reason;
    if (!child?.pid) return;
    if (process.platform === "win32") execFile2("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true }, () => {
    });
    else {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }
  };
  const cancellation = setInterval(() => access(path2.join(dir, "cancel")).then(() => stop("cancelled")).catch(() => {
  }), 200);
  const timeout = setTimeout(() => stop("timed_out"), request.timeoutSeconds * 1e3);
  let final;
  try {
    await atomicJson(stateFile, { ...initial, state: "running", startedAt: (/* @__PURE__ */ new Date()).toISOString() });
    if (await access(path2.join(dir, "cancel")).then(() => true, () => false)) stop("cancelled");
    if (stopReason) throw new Error(stopReason);
    child = spawn(request.executable, [...request.executableArgs, ...buildArgs(request)], { cwd: request.repo, env: childEnvironment(), windowsHide: true, detached: process.platform !== "win32", stdio: ["pipe", "pipe", "pipe"] });
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (data) => {
      outputSize += Buffer.byteLength(data);
      if (outputSize > 8 * 1024 * 1024) stop("output_limit");
      else stdout += data;
    });
    child.stderr.on("data", (data) => {
      stderr = (stderr + data).slice(-8e3);
    });
    child.stdin.on("error", () => {
    });
    const completion = new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => resolve({ code, signal }));
    });
    child.stdin.end(request.prompt);
    const exit = await completion;
    if (stopReason) final = { state: stopReason, error: stopReason === "cancelled" ? "Cancellation completed" : `Claude stopped: ${stopReason}` };
    else if (exit.code !== 0) final = { state: "failed", error: failureDiagnostic(stdout, stderr, `Claude exited with code ${exit.code}, signal ${exit.signal}`) };
    else {
      const parsed = JSON.parse(stdout);
      const result = Array.isArray(parsed) ? parsed.findLast((item) => item.type === "result") : parsed;
      if (!result || result.type !== "result") throw new Error("Claude returned no result envelope");
      const text = result.result ?? (result.structured_output ? JSON.stringify(result.structured_output) : void 0);
      if (result.is_error) final = { state: "failed", error: text || JSON.stringify(result.errors || "Claude reported an error") };
      else if (typeof text !== "string") throw new Error("Claude returned no text or structured result");
      else final = { state: "completed", result: text, ...uuidPattern.test(result.session_id || "") ? { sessionId: result.session_id } : {}, permissionDenials: result.permission_denials || [], costUsd: result.total_cost_usd ?? null };
    }
  } catch (error) {
    final = { state: stopReason || "failed", error: error.message };
  } finally {
    clearTimeout(timeout);
    clearInterval(cancellation);
    clearInterval(heartbeat);
    await releaseLease(dir, initial.id);
    await atomicJson(stateFile, { ...initial, ...final, finishedAt: (/* @__PURE__ */ new Date()).toISOString() });
  }
}
run(process.argv[2]).catch((error) => {
  process.stderr.write(`${error.message}
`);
  process.exitCode = 1;
});
