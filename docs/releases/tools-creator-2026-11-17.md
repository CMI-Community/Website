# 工具目录创作者字段

- 状态：Released
- 日期：2026-11-17
- Tag：tools-creator-2026-11-17
- Commit：`794f0e086eedd6184e0ba89bd21f747b062fd5e5`（实际运行源码；后续提交仅记录发布证据）
- GitHub Release：https://github.com/CMI-Community/Website/releases/tag/tools-creator-2026-11-17
- 关联 Issue/PR：[#58](https://github.com/CMI-Community/Website/issues/58) / [#59](https://github.com/CMI-Community/Website/pull/59)
- Runtime impact：仅 production 工具目录入口，不发布官网。

## Changes

捎点卡片增加「创作者 不器@CMI」。项目配置统一到 `tools/community-tools/projects.mjs`，`creator` 为可选纯文本字段；缺省或空白时隐藏整行，文本经过 HTML 转义。`renderHome(projects)` 接收项目数组，为未来其他配置来源保留渲染接口。

## Data and Migration

无数据库迁移、生产业务数据写入或成员权限变更。保留捎点代理、后端与鉴权。

## Verification

- VERIFIED：修改前源码与线上两个模块逐字节一致；发布后三个模块与候选源代码逐字节一致。
- VERIFIED：npm run check 通过，99 项单元、26 表本机 D1 smoke、类型与构建检查通过。
- VERIFIED：npm run test:e2e 为 29 passed / 3 skipped；14 组工具路由检查通过。
- VERIFIED：可选字段缺省、多项目配置及文本转义检查通过；错误页面保持原样。
- VERIFIED：320/390/1280px 正式目录显示正确，无横向溢出；实际点击捎点后大厅接口正常，0 页面脚本错误。
- VERIFIED：工具入口绑定和兼容配置保留；捎点代理仍为 `3387c76a-a6fe-4713-bc16-50d53065bba1`。

## Rollback

当前工具入口为 `f7082766-480f-4be6-a260-531ffcab28cb`，100% 流量。回退可恢复上一入口 `f356ef2b-4cc5-42b9-8fc2-dd02fd1a942a`；不操作捎点代理、Secret 或业务数据。独立工具标签不改变官网 v0.5.0 的 Latest 标记。
