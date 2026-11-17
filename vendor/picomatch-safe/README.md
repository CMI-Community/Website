# Local picomatch security build

Derived from [micromatch/picomatch 4.0.7](https://github.com/micromatch/picomatch/tree/4.0.7), under its preserved MIT LICENSE. This is a private repository-local fork, not an official upstream release.

Upstream `lib/parse.js` SHA-256: `4e1e05447668aa1e94366c5516a2bcd8f5fff800cc92b1d0cd7d77703b8618c4`.

## Patch

[GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) currently has no patched npm release. Before the existing repeated-extglob analysis, treat a single repeated branch containing a wildcard, nested group, or repeat operator as risky. Reuse the upstream literalization path instead of emitting potentially ambiguous nested quantifiers. This safeguard cannot be disabled with `maxExtglobRecursion: false`.

Simple repeated alternatives such as `+(a|b)`, character classes, normal globstars, braces, negation, and Vite's path matching keep their original behavior. Complex repeated single branches intentionally match literally; the website does not use them in its configuration. Regression tests exercise the reported attack shapes in an isolated process with a hard timeout, along with ordinary build patterns.

The local npm override replaces all transitive picomatch copies. `npm audit` remains enabled with no advisory allowlist or severity change. Upstream advisory monitoring remains necessary because the local fork is not a registry package; remove the override after an official patched release is verified.
