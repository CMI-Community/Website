# 参与 CMI 官网

感谢你愿意让这个公共地基更好。公开需求、内容纠错和功能建议请使用 GitHub Issues；尚未收敛的讨论使用 GitHub Discussions。外部贡献者不需要加入 CMI 的 Linear 工作区。

## 开发流程

1. 未收敛想法先进入 Discussions；可执行工作创建 GitHub Issue，并补齐场景、范围和验收条件。
2. 阅读 [Project Workpad](./docs/project-workpad.md) 和相关决策记录，从 `main` 创建 `codex/<issue-number>-<slug>` 分支。
3. 按[三位一体可追溯协作协议](./docs/collaboration/traceability.md)选择 T1/T2/T3；T2 建立 Experiment，T3 建立 ADR。
4. 使用 Node.js 24 和锁文件安装：`npm ci`。任何数据结构变化都新增 D1 migration，不修改已经发布的 migration。
5. 提交前运行 `npm run check`；涉及用户路径时同时运行 `npm run test:e2e`。
6. PR 使用 `Closes #N` 或 `Refs #N`，并填写实际改动、偏离、验证、迁移/回滚和上下文更新。

Dependabot 不需要另建 Issue；安全修复可以关联私密 Security Advisory。`trace:override` 只供维护者处理检查器误判或紧急修复，不能绕过代码、安全或 production 发布检查。

## 不可跨越的边界

- 不提交真实 Secret、OAuth 凭据、邮箱名单、私有路径或生产数据库导出。
- 不提交原始海报归档、未授权媒体、SQLite、构建产物或大文件。
- 公共 API 只增加显式白名单字段，不直接序列化数据库行或私有目录对象。
- 权限必须在服务端验证；隐藏按钮不构成权限控制。
- 文化与社区内容需保留来源、创作者署名和许可判断，但这些内部判断不应进入公共 API。
- 不提交完整聊天、模型内部推理、个人邮箱名单、生产数据导出或本机绝对路径；只保留可复核的公开安全摘要。

提交贡献即表示你有权提交该内容，并同意按照仓库的 Apache-2.0 许可分发贡献。
