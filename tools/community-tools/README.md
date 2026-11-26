# 社区工具入口

`tool.cmi.community/` 提供社区项目目录。捎点通过 `/shaodian/` 连接现有服务，其他项目直接链接到各自的官网。

## 文件与验证

- `worker.mjs`：目录、项目路径路由、旧地址兼容。
- `pages.mjs`：工具目录与错误页面。
- `projects.mjs`：项目名称、介绍、署名、图片路径和链接。
- `project-images.mjs` 与 `images/*.webp`：目录入口图和同源图片映射。
- `verify-routing.mjs`：使用合成服务绑定检查请求透传和重定向，不向生产写入数据。

```sh
node tools/community-tools/verify-routing.mjs
```

## 部署约定

目标 Worker 为 `cmi-community-tools`，沿用 `SHAODIAN → cmi-tool-shaodian` 服务绑定、自定义域名与配置。使用 Cloudflare 的 Replace Worker Script Content API，将 `worker.mjs` 设为主模块，上传 `pages.mjs`、`projects.mjs`、`project-images.mjs` 和 `worker.mjs`。将每张 WebP 以上传路径 `images/<文件名>.webp` 提交为 `application/octet-stream` 数据模块。

捎点浏览器地址使用 `/shaodian/`，入口去掉该前缀后将原方法、正文、Cookie、Origin 和查询参数交给现有捎点代理。同源 Location 改写回项目路径。Cookie 名称和值及 Path 保持原样，浏览器存储仍使用同一 origin。不要把捎点代理替换成旧占位页。

旧根目录的 `/api/` 和已发布的静态资源继续兼容，以便已打开的页面完成请求；旧 `#board`、`#composer`、`#mine` 书签转到 `/shaodian/`。未知项目路径返回目录 404。

## 接入其他项目

在 `projects.mjs` 的 `PROJECTS` 中填写 `href`、名称、功能介绍、创作者、图片路径和按钮文案。把入口图放入 `images/`，并在 `project-images.mjs` 配置对应的 `/project-images/` 路径。创作者字段为空时隐藏署名行。接入站内服务时则填写 `prefix` 和 `binding`，由目录 Worker 转发请求。

## 入口图来源

- 水灯节灵感卡与水灯河、2026 水灯庆典任务看板的配图按项目用途生成。
- PDD404 的图来自 [官网页眉字标](https://pdd404.app/)。
- 清迈交换橱窗使用 [官网购物篮图标](https://cmiswap.com/favicon.svg)。
- CMI Map 使用 [官网应用图标](https://cmimap.com/apple-touch-icon.png)。
- DaliTrip 使用 [官网「苍」字产品标识](https://dalitrip.com/apple-touch-icon.png)。

回退时恢复该 Worker 的上一版本或已备份模块。不要回滚捎点代理、修改 Secret 或操作业务数据库。
