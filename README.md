# CMI Community Website

CMI 社区官方网站的开发仓库。

## Stack

- React
- Vite
- TypeScript
- ESLint

## Local Setup

```bash
nvm use
npm install
npm run dev
```

Default local URL:

```text
http://localhost:5173
```

## Scripts

```bash
npm run lint
npm run typecheck
npm run build
npm run preview
```

## Requirements Workflow

Linear is the source of truth for product requirements. GitHub is the source of truth for implementation.

- Linear project: <https://linear.app/cmi-community/project/cmi-community-website-官网-32eac175cbd5>
- GitHub repository: <https://github.com/CMI-Community/Website>

Start each meaningful change from a Linear issue. Use the issue identifier in the branch name and PR description.

Example:

```bash
git switch -c cmi-71-information-architecture
```

See [docs/requirements-workflow.md](docs/requirements-workflow.md) for the full workflow.
