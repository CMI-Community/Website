import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const require = createRequire(import.meta.url);

describe("local picomatch security build", () => {
  it("replaces transitive build matchers and stops repeated-wildcard attacks within a bounded process", () => {
    const entry = require.resolve("picomatch");
    expect(entry.replaceAll("\\", "/")).toContain("vendor/picomatch-safe/");
    const output = execFileSync(process.execPath, ["-e", `
      const match = require(${JSON.stringify(entry)});
      for (const pattern of ['+(*)', '+(*a)', '*(*)', '*(a*)', '+(?*a)', '+(@(a|aa))']) {
        for (const options of [{}, { maxExtglobRecursion: false }]) {
          if (match(pattern, options)('a'.repeat(64) + '!')) throw Error('attack matched');
        }
      }
      if (!match('**/*.{ts,tsx}')('app/routes/home.tsx')) throw Error('normal build glob failed');
      if (!match('+(a|b)')('abba')) throw Error('safe alternatives failed');
      if (!match('!(*.test).ts')('index.ts')) throw Error('negation failed');
      process.stdout.write('safe');
    `], { encoding: "utf8", timeout: 2500 });
    expect(output).toBe("safe");
  });
});
