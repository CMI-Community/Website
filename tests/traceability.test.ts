import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validatePrBody, validateRepository } from "../scripts/check-traceability.mjs";

const temporaryRoots: string[] = [];

function repositoryFixture() {
  const source = process.cwd();
  const root = mkdtempSync(path.join(tmpdir(), "cmi-traceability-"));
  temporaryRoots.push(root);
  cpSync(path.join(source, "AGENTS.md"), path.join(root, "AGENTS.md"));
  cpSync(path.join(source, "docs"), path.join(root, "docs"), { recursive: true });
  writeFileSync(path.join(root, "README.md"), "# Fixture\n");
  return root;
}

afterEach(() => {
  while (temporaryRoots.length) rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
});

function prBody(level: "T1" | "T2" | "T3") {
  return `## 关联

Closes #11

## 留痕等级

- [${level === "T1" ? "x" : " "}] T1：普通、局部、可逆变更
- [${level === "T2" ? "x" : " "}] T2：需要验证假设的实验
- [${level === "T3" ? "x" : " "}] T3：架构、数据、权限、平台或难回滚决策

- Experiment：${level === "T2" ? "[EXP-2026-001](docs/experiments/EXP-2026-001-test.md)" : "无"}
- Decision record：${level === "T3" ? "[ADR 0004](docs/adr/0004-traceability-governance.md)" : "无"}

## 基线与目标

已有可复核基线，需要完成目标。

## 实际改动

完成约定改动。

## 偏离与失败尝试

无。

## 验证

VERIFIED：相关检查通过。

## 迁移、发布与回滚

无运行时迁移；通过 revert PR 回滚。

## 上下文更新

- [x] 工作台已更新
- [ ] 无需更新

无需更新原因：不适用

## Trace Override

- 原因：不适用
- 风险：不适用
- 补录：不适用
`;
}

describe("traceability repository", () => {
  it("accepts the repository context spine", () => {
    expect(validateRepository(process.cwd())).toEqual([]);
  });

  it("rejects broken links and invalid record states", () => {
    const root = repositoryFixture();
    const workpad = path.join(root, "docs/project-workpad.md");
    writeFileSync(workpad, `${readFileSync(workpad, "utf8")}\n[broken](./missing-record.md)\n`);
    const adr = path.join(root, "docs/adr/0001-platform-foundation.md");
    writeFileSync(adr, readFileSync(adr, "utf8").replace("状态：Accepted", "状态：Unknown"));
    const failures = validateRepository(root);
    expect(failures.some((failure) => failure.includes("broken local link"))).toBe(true);
    expect(failures.some((failure) => failure.includes("invalid ADR status"))).toBe(true);
  });

  it("rejects duplicate record identifiers", () => {
    const root = repositoryFixture();
    const original = path.join(root, "docs/adr/0001-platform-foundation.md");
    writeFileSync(path.join(root, "docs/adr/0001-duplicate.md"), readFileSync(original, "utf8"));
    expect(validateRepository(root)).toContain("docs/adr: duplicate ADR id 0001");
  });
});

describe("traceability PR contract", () => {
  it.each(["T1", "T2", "T3"] as const)("accepts a complete %s record", (level) => {
    expect(validatePrBody({
      body: prBody(level),
      author: "maintainer",
      records: { experiments: ["EXP-2026-001"], adrs: ["0004"] },
    })).toEqual([]);
  });

  it("rejects a manual PR without an Issue", () => {
    const body = prBody("T1").replace("Closes #11", "No linked task");
    expect(validatePrBody({ body, author: "maintainer" })).toContain(
      "PR body: link an Issue with Closes/Refs #N or a Security Advisory",
    );
  });

  it("rejects T2 without an Experiment and T3 without an ADR", () => {
    expect(validatePrBody({ body: prBody("T2").replace("[EXP-2026-001](docs/experiments/EXP-2026-001-test.md)", "无"), author: "maintainer" }))
      .toContain("PR body: T2 requires a linked EXP-YYYY-NNN record");
    expect(validatePrBody({ body: prBody("T3").replace("[ADR 0004](docs/adr/0004-traceability-governance.md)", "无"), author: "maintainer" }))
      .toContain("PR body: T3 requires a linked ADR NNNN record");
  });

  it("rejects links to records that do not exist", () => {
    expect(validatePrBody({
      body: prBody("T2"),
      author: "maintainer",
      records: { experiments: [], adrs: ["0004"] },
    })).toContain("PR body: Experiment EXP-2026-001 does not exist in docs/experiments");
  });

  it("allows Dependabot to skip the human PR contract", () => {
    expect(validatePrBody({ body: "", author: "dependabot[bot]" })).toEqual([]);
  });

  it("requires an explicit, linked trace override", () => {
    const valid = `## 关联

Refs #11

## Trace Override

- 原因：检查器错误解析中文标题
- 风险：本次 PR 的上下文结构暂未自动验证
- 补录：#11
`;
    expect(validatePrBody({ body: valid, author: "maintainer", labels: ["trace:override"] })).toEqual([]);
    expect(validatePrBody({ body: valid.replace("#11\n", "待补录\n"), author: "maintainer", labels: ["trace:override"] }))
      .not.toEqual([]);
  });
});
