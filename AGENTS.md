# CMI 官网协作入口

本文件适用于整个仓库，也同时写给开发者和 AI。它不是隐藏指令；所有协作规则都必须能由维护者阅读、检查和修改。

## 开始任何任务前

1. 阅读 [README.md](./README.md) 和唯一动态总览 [docs/project-workpad.md](./docs/project-workpad.md)。
2. 打开当前 GitHub Issue；没有 Issue 时，除 Dependabot 或私密 Security Advisory 外，不开始会改变仓库或外部状态的工作。
3. 根据 Issue 打开的相关 ADR、Experiment 和 Release Record 恢复上下文，不把历史聊天当作项目真相源。
4. 重新核对分支、部署目标、数据源和外部资源；工作台中的运行信息可能随时间变化，低成本可验证的事实必须现场验证。

## 工作过程中

- 分支使用 `codex/<issue-number>-<slug>`，PR 使用 `Closes #N` 或 `Refs #N` 关联任务。
- 按 [三位一体可追溯协作协议](./docs/collaboration/traceability.md) 选择 T1、T2 或 T3。
- 普通选择记录在 Issue/PR；可撤销实验新增 Experiment；架构、数据、权限、平台或难回滚决策新增 ADR。
- 使用 `VERIFIED`、`OBSERVED`、`ASSUMED`、`UNKNOWN` 标记证据强度。失败尝试只记录会影响后续判断的部分。
- 不保存完整聊天、模型内部推理、Secret、个人数据、私有社区内容、原始授权材料、生产数据导出或本机绝对路径。
- 不复制任务全文到工作台；工作台只提供当前状态、链接、风险、决策请求和交接信息。

## 交付任何任务前

1. 运行与风险相称的验证；代码变更至少运行 `npm run check`，用户路径同时运行 `npm run test:e2e`。
2. 更新工作台，或在 PR 中明确说明为什么当前变更不影响长期上下文。
3. PR 必须记录基线与目标、实际改动、偏离和失败、验证证据、迁移/发布/回滚以及上下文更新。
4. production 发布必须新增 Release Record，并由 GitHub Release 链接它；回滚不得删除失败历史。
5. 不把“已编码”“CI 已启动”或“部署命令成功”当作交付完成；完成结论必须有可复核证据。

## 权威记录

| 问题 | 权威载体 |
| --- | --- |
| 当前在哪里、下一步是什么 | [Project Workpad](./docs/project-workpad.md) |
| 要做什么、验收与优先级 | GitHub Issue / Milestone |
| 为什么这样选择 | Issue 决策段、Experiment、[ADR](./docs/adr/README.md) |
| 实际怎么做、哪里偏离 | Pull Request |
| production 发生了什么 | [Release Records](./docs/releases/README.md) 与 GitHub Release |
| 固定架构和运行边界 | [docs/architecture.md](./docs/architecture.md) |

遇到矛盾时，以最新用户指令和可验证的外部事实为先，并在同一项工作中修正文档。
