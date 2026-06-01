# Requirements Workflow

This project uses Linear to drive CMI Community website development.

## Tools

- Linear project: <https://linear.app/cmi-community/project/cmi-community-website-官网-32eac175cbd5>
- GitHub repository: <https://github.com/CMI-Community/Website>

## Source of Truth

- Linear owns product intent: user need, scope, priority, acceptance criteria, and status.
- GitHub owns implementation: code, branches, commits, pull requests, release notes, and deployment history.
- Repository docs preserve durable decisions that should remain visible outside Linear.

## Issue Readiness

An issue is ready for development when it has:

- Clear user or community scenario.
- Page, module, content, or technical scope.
- Acceptance criteria that can be checked.
- Known dependencies, including copy, images, brand assets, approvals, or external services.

## Branch Naming

Use the Linear identifier at the front of the branch name:

```text
cmi-71-information-architecture
cmi-72-homepage-visual-direction
```

For generated Linear branch names, keep the issue identifier and shorten the rest if needed.

## Pull Requests

Every PR should include:

- Linked Linear issue.
- Summary of the user-facing or workflow change.
- Verification commands and browser checks.
- Screenshots or recordings for visual changes.
- Follow-up issues when scope is intentionally deferred.

## Status Flow

Use the CMI team status flow:

```text
Backlog -> Todo -> In Progress -> In Review -> Done
```

## Definition of Done

- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.
- Visual or interaction changes are checked in a browser at desktop and mobile widths.
- The Linear issue is updated with delivery notes.
