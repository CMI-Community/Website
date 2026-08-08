# ADR 0004：任务、思考、过程三位一体可追溯协作

- 状态：Accepted
- 日期：2026-08-08
- 关联 Issue：[CMI-Community/Website#11](https://github.com/CMI-Community/Website/issues/11)
- Supersedes：无

## 上下文

`VERIFIED`：仓库已经有 ADR、PR 模板、CI 和发布文档，但在 Issue #11 之前没有 Issue、Milestone 或唯一动态工作台。长期实验、回滚和跨会话开发会使当前状态与决策依据分散在聊天、PR 和外部系统中。

## 决策驱动因素

- 维护者需要一页看懂当前状态、风险和待决定事项。
- 新会话必须不依赖历史聊天恢复上下文。
- 记录必须公开安全、可复核并能由 required CI 防止遗漏。
- 日常开销必须与变更风险成比例。

## 备选方案

### 工作台 + GitHub Issues + 分级记录

- 优点：每类信息只有一个权威载体；无需额外付费服务或 Project 权限。
- 代价：人工 PR 需要填写结构化上下文，并在必要时更新工作台。

### GitHub Project 看板

- 优点：任务状态更可视化。
- 代价：引入额外权限、字段和重复维护；不能替代决策与发布记录。

### 公私双轨或完整聊天归档

- 优点：可以保存更多原始材料。
- 代价：形成第二真相源，并带来隐私、噪音和长期可读性风险。

## 决策

采用公开安全的三位一体系统：Issue/Milestone 负责任务，Issue/Experiment/ADR 负责可复核思考，PR/CI/Release Record 负责实施过程；`docs/project-workpad.md` 是唯一动态总览。按 T1、T2、T3 分级，人工 PR 由 `foundation` required check 强制满足记录合同。

思考留痕只保存假设、证据、备选方案、选择理由、代价和推翻条件，不保存模型内部推理或完整聊天。

## 后果

- 正面：维护者和新会话可以从仓库恢复真实状态，实验和回滚不会抹掉原因与证据。
- 正面：公开贡献者无需 Linear 或付费工具即可参与。
- 负面：人工 PR 增加少量结构化记录成本，工作台需要持续维护。
- 负面：自动检查只能防止结构遗漏，不能替代维护者对内容真实性的判断。

## 迁移与回滚

为 `v0.1.0-foundation` 回填工作台、ADR 索引和 Release Record；新增 Issue/PR 模板与检查器，不修改运行时 API、数据库或 production Worker。若检查器误判，维护者可用 `trace:override`；若检查器阻断协作，通过 revert PR 移除对应 CI 步骤，保留已产生的历史记录。

## 推翻条件

当团队规模或并行任务量使单一工作台产生持续冲突，或 GitHub 原生能力可以无重复维护地覆盖当前需求时，新增 ADR 评估 Project 看板或新的索引方式。
