import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ADR_STATUSES = ["Proposed", "Accepted", "Rejected", "Superseded"];
const EXPERIMENT_STATUSES = ["Planned", "Running", "Concluded", "Abandoned"];
const RELEASE_STATUSES = ["Released", "Partially Rolled Back", "Rolled Back"];
const REQUIRED_FILES = [
  "AGENTS.md",
  "docs/project-workpad.md",
  "docs/collaboration/traceability.md",
  "docs/adr/README.md",
  "docs/experiments/README.md",
  "docs/releases/README.md",
];

function read(root, relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function requireText(body, needle, file, failures) {
  if (!body.includes(needle)) failures.push(`${file}: missing required text ${needle}`);
}

function statusFrom(body) {
  return body.match(/^- 状态：([^\n]+)$/m)?.[1]?.trim();
}

function markdownFiles(root, directory = root) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "build", "dist", ".wrangler", ".react-router"].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(root, absolute));
    if (entry.isFile() && entry.name.endsWith(".md")) files.push(path.relative(root, absolute));
  }
  return files;
}

function validateLocalLinks(root, files, failures) {
  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const file of files) {
    const body = read(root, file);
    for (const match of body.matchAll(linkPattern)) {
      let target = match[1].trim();
      if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
      if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
      target = target.split("#", 1)[0].split("?", 1)[0];
      if (!target) continue;
      const resolved = path.resolve(path.dirname(path.join(root, file)), decodeURIComponent(target));
      if (!resolved.startsWith(path.resolve(root) + path.sep) && resolved !== path.resolve(root)) {
        failures.push(`${file}: link escapes repository: ${match[1]}`);
      } else if (!existsSync(resolved)) {
        failures.push(`${file}: broken local link ${match[1]}`);
      }
    }
  }
}

function validateRecords(root, failures) {
  const adrDir = path.join(root, "docs/adr");
  const adrFiles = existsSync(adrDir)
    ? readdirSync(adrDir).filter((file) => /^\d{4}-.+\.md$/.test(file)).sort()
    : [];
  const adrIds = new Set();
  const adrRegistry = existsSync(path.join(adrDir, "README.md")) ? read(root, "docs/adr/README.md") : "";
  for (const file of adrFiles) {
    const id = file.slice(0, 4);
    if (adrIds.has(id)) failures.push(`docs/adr: duplicate ADR id ${id}`);
    adrIds.add(id);
    const relative = `docs/adr/${file}`;
    const body = read(root, relative);
    const status = statusFrom(body);
    if (!ADR_STATUSES.includes(status)) failures.push(`${relative}: invalid ADR status ${status ?? "missing"}`);
    requireText(body, "- 日期：", relative, failures);
    requireText(body, "## 决策", relative, failures);
    if (!adrRegistry.includes(`./${file}`)) failures.push(`docs/adr/README.md: ADR ${file} is not registered`);
  }

  const experimentDir = path.join(root, "docs/experiments");
  const experimentFiles = existsSync(experimentDir)
    ? readdirSync(experimentDir).filter((file) => /^EXP-\d{4}-\d{3}-.+\.md$/.test(file)).sort()
    : [];
  const experimentIds = new Set();
  for (const file of experimentFiles) {
    const id = file.match(/^(EXP-\d{4}-\d{3})-/)?.[1];
    if (id && experimentIds.has(id)) failures.push(`docs/experiments: duplicate Experiment id ${id}`);
    if (id) experimentIds.add(id);
    const relative = `docs/experiments/${file}`;
    const body = read(root, relative);
    const status = statusFrom(body);
    if (!EXPERIMENT_STATUSES.includes(status)) failures.push(`${relative}: invalid Experiment status ${status ?? "missing"}`);
    for (const heading of ["- 日期：", "- 关联 Issue：", "## 假设", "## 基线与变量", "## 成功与停止条件", "## 结果", "## 结论与后续处理"]) {
      requireText(body, heading, relative, failures);
    }
  }

  const releaseDir = path.join(root, "docs/releases");
  const releaseFiles = existsSync(releaseDir)
    ? readdirSync(releaseDir).filter((file) => /^v.+\.md$/.test(file)).sort()
    : [];
  const releaseIds = new Set();
  const releaseRegistry = existsSync(path.join(releaseDir, "README.md")) ? read(root, "docs/releases/README.md") : "";
  for (const file of releaseFiles) {
    const id = file.replace(/\.md$/, "");
    if (releaseIds.has(id)) failures.push(`docs/releases: duplicate release id ${id}`);
    releaseIds.add(id);
    const relative = `docs/releases/${file}`;
    const body = read(root, relative);
    const status = statusFrom(body);
    if (!RELEASE_STATUSES.includes(status)) failures.push(`${relative}: invalid release status ${status ?? "missing"}`);
    for (const heading of ["- 日期：", "- Tag：", "- Commit：", "- Runtime impact：", "## Changes", "## Data and Migration", "## Verification", "## Rollback"]) {
      requireText(body, heading, relative, failures);
    }
    if (!releaseRegistry.includes(`./${file}`)) failures.push(`docs/releases/README.md: release ${file} is not registered`);
  }
}

export function validateRepository(root = process.cwd()) {
  const failures = [];
  for (const file of REQUIRED_FILES) {
    if (!existsSync(path.join(root, file))) failures.push(`${file}: required traceability file is missing`);
  }
  if (failures.length) return failures;

  const agents = read(root, "AGENTS.md");
  for (const pointer of ["docs/project-workpad.md", "docs/collaboration/traceability.md", "GitHub Issue", "Release Record"]) {
    requireText(agents, pointer, "AGENTS.md", failures);
  }

  const workpad = read(root, "docs/project-workpad.md");
  if (!/^Last updated: \d{4}-\d{2}-\d{2} \d{2}:\d{2} Asia\/Bangkok$/m.test(workpad)) {
    failures.push("docs/project-workpad.md: Last updated must use YYYY-MM-DD HH:MM Asia/Bangkok");
  }
  for (const heading of ["## Snapshot", "## Commander View", "## Project Goal", "## Scope", "## Key Decisions", "## Task Board", "## Risks And Open Questions", "## Validation Log", "## Handoff Notes"]) {
    requireText(workpad, heading, "docs/project-workpad.md", failures);
  }

  const protocol = read(root, "docs/collaboration/traceability.md");
  for (const heading of ["## Source of Truth", "## Evidence Vocabulary", "## Trace Levels", "## Lifecycle", "## Required PR Contract", "## Emergency Override", "## Public Safety"]) {
    requireText(protocol, heading, "docs/collaboration/traceability.md", failures);
  }

  validateRecords(root, failures);
  validateLocalLinks(root, markdownFiles(root), failures);
  return failures;
}

function stripComments(value) {
  return value.replace(/<!--[\s\S]*?-->/g, "").trim();
}

function section(body, title) {
  const marker = `## ${title}`;
  const markerIndex = body.indexOf(marker);
  if (markerIndex === -1) return "";
  const remainder = body.slice(markerIndex + marker.length).replace(/^\s*\n/, "");
  const nextHeading = remainder.search(/^## /m);
  return stripComments(nextHeading === -1 ? remainder : remainder.slice(0, nextHeading));
}

function isDependabot(author) {
  return /^dependabot(?:\[bot\])?$/i.test(author) || /^app\/dependabot$/i.test(author);
}

function checked(body, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^- \\[x\\] ${escaped}`, "mi").test(body);
}

/**
 * @param {{
 *   body?: string;
 *   author?: string;
 *   labels?: string[];
 *   records?: { experiments?: string[]; adrs?: string[] };
 * }} input
 */
export function validatePrBody({ body = "", author = "", labels = [], records } = {}) {
  const failures = [];
  if (isDependabot(author)) return failures;

  const hasIssue = /\b(?:Closes|Fixes|Resolves|Refs?)\s+#\d+\b/i.test(body);
  const hasAdvisory = /\bGHSA-[0-9a-z-]+\b|\/security\/advisories\//i.test(body);
  if (!hasIssue && !hasAdvisory) failures.push("PR body: link an Issue with Closes/Refs #N or a Security Advisory");

  if (labels.includes("trace:override")) {
    const override = section(body, "Trace Override");
    const reason = override.match(/^- 原因：(.+)$/m)?.[1]?.trim();
    const risk = override.match(/^- 风险：(.+)$/m)?.[1]?.trim();
    const followup = override.match(/^- 补录：(.+)$/m)?.[1]?.trim();
    if (!reason || /^不适用$/i.test(reason)) failures.push("PR body: trace:override requires a concrete reason");
    if (!risk || /^不适用$/i.test(risk)) failures.push("PR body: trace:override requires a concrete risk statement");
    if (!followup || !/#\d+|GHSA-/i.test(followup)) failures.push("PR body: trace:override requires a follow-up Issue or Advisory");
    return failures;
  }

  const levels = ["T1：", "T2：", "T3："].filter((level) => checked(body, level));
  if (levels.length !== 1) failures.push("PR body: select exactly one trace level T1, T2, or T3");
  const experimentLink = body.match(/\[(EXP-\d{4}-\d{3})[^\]]*\]\([^)]+\)/);
  if (levels[0]?.startsWith("T2") && !experimentLink) {
    failures.push("PR body: T2 requires a linked EXP-YYYY-NNN record");
  } else if (levels[0]?.startsWith("T2") && records?.experiments && !records.experiments.includes(experimentLink?.[1] ?? "")) {
    failures.push(`PR body: Experiment ${experimentLink?.[1]} does not exist in docs/experiments`);
  }
  const adrLink = body.match(/\[(ADR\s+(\d{4}))[^\]]*\]\([^)]+\)/i);
  if (levels[0]?.startsWith("T3") && !adrLink) {
    failures.push("PR body: T3 requires a linked ADR NNNN record");
  } else if (levels[0]?.startsWith("T3") && records?.adrs && !records.adrs.includes(adrLink?.[2] ?? "")) {
    failures.push(`PR body: ADR ${adrLink?.[2]} does not exist in docs/adr`);
  }

  for (const title of ["基线与目标", "实际改动", "偏离与失败尝试", "验证", "迁移、发布与回滚", "上下文更新"]) {
    if (!section(body, title)) failures.push(`PR body: section ${title} must not be empty`);
  }
  if (!/\b(?:VERIFIED|OBSERVED|ASSUMED|UNKNOWN)\b/.test(section(body, "验证"))) {
    failures.push("PR body: 验证 must include VERIFIED, OBSERVED, ASSUMED, or UNKNOWN");
  }

  const workpadUpdated = checked(body, "工作台已更新");
  const workpadUnchanged = checked(body, "无需更新");
  if (Number(workpadUpdated) + Number(workpadUnchanged) !== 1) {
    failures.push("PR body: select exactly one workpad update option");
  }
  if (workpadUnchanged) {
    const reason = section(body, "上下文更新").match(/^无需更新原因：(.+)$/m)?.[1]?.trim();
    if (!reason || /^(?:不适用|具体原因)$/i.test(reason)) failures.push("PR body: 无需更新 requires a concrete reason");
  }
  return failures;
}

function parseLabels(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    return value.split(",").map((label) => label.trim()).filter(Boolean);
  }
  return [];
}

function repositoryRecordIds(root) {
  const experiments = existsSync(path.join(root, "docs/experiments"))
    ? readdirSync(path.join(root, "docs/experiments"))
      .map((file) => file.match(/^(EXP-\d{4}-\d{3})-/)?.[1])
      .filter(Boolean)
    : [];
  const adrs = existsSync(path.join(root, "docs/adr"))
    ? readdirSync(path.join(root, "docs/adr"))
      .map((file) => file.match(/^(\d{4})-/)?.[1])
      .filter(Boolean)
    : [];
  return { experiments, adrs };
}

function run() {
  const failures = validateRepository(process.cwd());
  if (process.env.TRACE_EVENT_NAME === "pull_request") {
    failures.push(...validatePrBody({
      body: process.env.TRACE_PR_BODY ?? "",
      author: process.env.TRACE_PR_AUTHOR ?? "",
      labels: parseLabels(process.env.TRACE_PR_LABELS),
      records: repositoryRecordIds(process.cwd()),
    }));
  }
  if (failures.length) {
    console.error(`Traceability check failed:\n- ${failures.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }
  console.log("Traceability check passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
