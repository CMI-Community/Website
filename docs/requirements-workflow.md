# 需求与贡献工作流

## 公开入口

GitHub Issues 是公开、可执行需求与内容纠错的唯一入口；GitHub Discussions 用于尚未收敛的想法和社区对话。外部贡献者不需要 Linear 账号，也不需要知道内部运营排期。

当前阶段、优先级、风险和交接从 [Project Workpad](./project-workpad.md) 进入；任务、思考和过程的权威边界见[三位一体可追溯协作协议](./collaboration/traceability.md)。工作台不复制 Issue 正文。

## 内部优先级

CMI 团队可以在 Linear 管理内部运营优先级、负责人和非公开依赖。Linear 不替代公开 Issue，也不成为外部贡献的门槛。涉及公开协作的决定需要回写 GitHub Issue、PR 或 ADR。

## 可以开始开发的条件

- 已创建 GitHub Issue，并分配 Milestone、领域、优先级和留痕等级；
- 有真实用户或社区场景，而不只是功能名称；
- 范围和暂不处理的部分清楚；
- 验收结果可以检查；
- 文案、图片、品牌、权限、合规或外部服务依赖已经标明；
- 涉及公开内容时，来源、创作者、许可与隐私边界可以被维护者核对。

## 完成标准

- `npm run check` 通过；
- 涉及用户路径时 `npm run test:e2e` 通过；
- UI 在桌面与 390px 检查；
- 变更具有迁移和回滚说明；
- 必要的工作台、Experiment、ADR 和 Release Record 已更新；
- 公开 Issue / PR 留下可复核的交付证据。
