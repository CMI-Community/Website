# 社区工具入口

`tool.cmi.community/` 提供工具目录；`/shaodian/` 连接现有捎点服务。此目录只管理入口适配，不包含捎点应用、后端或数据库。

## 文件与验证

- `worker.mjs`：目录、项目路径路由、旧地址兼容。
- `pages.mjs`：工具目录与错误页面。
- `projects.mjs`：每个项目的路由和展示配置，包括可选的 `creator` 创作者名称。
- `verify-routing.mjs`：使用合成服务绑定检查请求透传和重定向，不向生产写入数据。

```sh
node tools/community-tools/verify-routing.mjs
```

## 部署约定

目标 Worker 为 `cmi-community-tools`。保留现有 `SHAODIAN → cmi-tool-shaodian` 服务绑定、自定义域名与配置，上传 `worker.mjs`、`pages.mjs` 两个模块，主模块为 `worker.mjs`。可使用 Cloudflare 的 Replace Worker Script Content API 更新内容并保留配置。

捎点浏览器地址使用 `/shaodian/`，入口去掉该前缀后将原方法、正文、Cookie、Origin 和查询参数交给现有捎点代理。同源 Location 改写回项目路径。Cookie 名称和值及 Path 保持原样，浏览器存储仍使用同一 origin。不要把捎点代理替换成旧占位页。

旧根目录的 `/api/` 和已发布的静态资源继续兼容，以便已打开的页面完成请求；旧 `#board`、`#composer`、`#mine` 书签转到 `/shaodian/`。未知项目路径返回目录 404。

## 配置创作者

在 `projects.mjs` 的对应项目中设置 `creator: '不器@CMI'`。这是可选的纯文本字段；未填或空白时整行隐藏。显示内容会经过 HTML 转义。`renderHome(projects)` 接收项目数组，未来可接入其他配置或数据来源，当前不新增数据库或管理接口。

## 接入其他工具

在 `projects.mjs` 的 `PROJECTS` 注册独立的 `/项目名/` 前缀与服务绑定，并在目录页面增加入口。工具应使用相对资源和接口地址；需要根路径的既有应用可由入口做前缀适配。为新工具增加对应检查，避免占用根目录或覆盖其他项目。

回退时恢复该 Worker 的上一版本或已备份模块。不要回滚捎点代理、修改 Secret 或操作业务数据库。
