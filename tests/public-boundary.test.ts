import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { scanPublicBoundary } from "../scripts/check-public-boundary.mjs";

const temporaryRoots: string[] = [];

function fixture(file: string, body: string) {
  const root = mkdtempSync(path.join(tmpdir(), "cmi-public-boundary-"));
  temporaryRoots.push(root);
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), body);
  return { root, file };
}

afterEach(() => {
  while (temporaryRoots.length) rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
});

describe("public repository boundary", () => {
  it("allows public community and example email domains", () => {
    const { root, file } = fixture("docs/note.md", "community@auth.cmiswap.com and tester@example.com");
    expect(scanPublicBoundary([file], { root })).toEqual([]);
  });

  it("blocks local paths, personal email, OAuth codes, and production exports", () => {
    const local = fixture("docs/local.md", `source: /${"Users"}/someone/Documents/private-note.md`);
    expect(scanPublicBoundary([local.file], { root: local.root })[0]).toContain("local user");

    const email = fixture("docs/email.md", `owner: private.person${"@"}outside.test`);
    expect(scanPublicBoundary([email.file], { root: email.root })[0]).toContain("non-public email");

    const oauth = fixture("docs/oauth.md", `authorization_${"code"}=abcdefghijklmnop1234`);
    expect(scanPublicBoundary([oauth.file], { root: oauth.root })[0]).toContain("OAuth authorization code");

    const database = fixture("production-user-export.json", "{}");
    expect(scanPublicBoundary([database.file], { root: database.root })[0]).toContain("production export");
  });
});
