# 社区工具目录新增六个产品入口

- 状态：Released
- 日期：2026-11-26
- Tag：`tools-directory-2026-11-26`
- Commit：`e2952773d53db00053230071ccbfbf7c830ecb9a`（运行源码）
- 关联 Issue/PR：[#68](https://github.com/CMI-Community/Website/issues/68) / [#70](https://github.com/CMI-Community/Website/pull/70)
- Runtime impact：仅 `tool.cmi.community` 的 `cmi-community-tools` Worker。

## Changes

- 六个入口包含用途、创作者和项目图片。水灯节的两个入口用分别表现灵感卡、水灯河和任务依赖的插图。
- PDD404、清迈交换橱窗、CMI Map 和 DaliTrip 使用官方标识。六张图作为同域 WebP 模块分发，合计 103,852 字节。
- 水灯河保留 `#river`。DaliTrip 使用官方英语规范地址 `/en`。
- 目录卡片适配窄屏，保留捎点的线上文案、署名、同源路径及旧书签。

## Data and Migration

此次发布涉及独立工具目录代码和入口图。数据库迁移为零。既有服务绑定、域名和 Worker 兼容设置经核对一致。

## Verification

- VERIFIED Cloudflare 运行版本 `e86001f6-9792-43da-91f7-c11dde34defb` 获 100% 流量，四个 JavaScript 模块和六张图片逐字节回读一致。
- VERIFIED 正式域名的目录 HTML、六张图片、捎点首屏、公开大厅 API、兼容静态地址、重定向和 404 通过。Playwright 从目录实际点击全部七个按钮，六个官网和捎点大厅均成功加载。
- VERIFIED 320、390、1280 像素宽度均无横向溢出，所有图可解码，键盘焦点可见。基线、候选、上线快照分别完成 10 个状态组合。基线与上线各含 8 个公开只读组合、2 个由相应 Worker 在缺失本地捎点绑定时生成的 503 组合。
- VERIFIED `npm run check`、123 个单元测试、42 表本机 D1 检查、构建及 staging dry-run 通过。工具目录专项路由检查 16 组通过。
- VERIFIED 官网 E2E 在隔离端口首轮 38 通过、3 跳过。桌面邀请注册受到本机端口改变后的受信 origin 配置影响，修正隔离配置后该用例通过。仓库原始配置的流水线见 [Foundation CI](https://github.com/CMI-Community/Website/actions/runs/45764922622)。

## Rollback

目录 Worker 的上一版本为 `a6e7a5fc-7db5-4d31-a50e-0ac96cd87d3b`，模块源码保存在 `987aabacb69ca3e940dcf94f69493a27e4ec50dc`。按需将目录流量退回上一版本。捎点服务版本为 `3387c76a-a6fe-4713-bc16-50d53065bba1`，目录回滚只涉及入口 Worker。

本机存档位于任务产物的 `output/playwright/releases/`。正式公开截图可在 [工具目录 GitHub Release](https://github.com/CMI-Community/Website/releases/tag/tools-directory-2026-11-26) 查看。
