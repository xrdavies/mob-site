# mob 产品官网

Screen Buddy 品牌的静态产品网站：首页、下载、快速开始、更新日志和 404 页面。
原生 HTML/CSS/ES modules，无前端框架和运行时服务。Cloudflare Workers Static Assets
负责托管，下载文件由 mob 仓库发布到 R2。源码仓库可以保持私有。

## 本地预览

需要 Node.js 24+：

```sh
npm ci
npm test
npm run dev
# http://localhost:4321
```

默认没有下载域名，下载区显示首个公开版本准备中。修改页面后重新执行 `npm run build`，
预览服务器读取 `dist/`。站点不读取 `.env`，需要时自行导出变量：

```sh
cp .env.example .env
# 替换示例域名，填写自己的 SITE_URL 和 DOWNLOAD_BASE_URL
set -a
. ./.env
set +a
npm run build
```

`.env` 只保存本机的公开构建配置，不要放任何上传密钥。示例域名会被构建拒绝。

## GitHub Actions / Cloudflare

将本目录推送到官网自己的 GitHub 仓库，默认分支为 `main`。
创建 `production` environment，配置：

| 类型 | 名称 | 内容 |
| --- | --- | --- |
| Variable | `SITE_URL` | 官网 HTTPS 根地址，无子路径 |
| Variable | `DOWNLOAD_BASE_URL` | mob 发布流程使用的 R2 自定义域名根地址 |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID |
| Secret | `CLOUDFLARE_API_TOKEN` | 限定目标账户、带 Workers Scripts Edit 的部署令牌 |

`.github/workflows/deploy.yml` 在 PR 上测试和构建；main 上通过检查后部署 `mob-site` Worker。
首次部署后，在 Cloudflare Workers → mob-site → Settings → Domains & Routes 中绑定
`SITE_URL` 对应的域名。也可以本地导出同样的配置后执行 `npm run deploy`。
工作流要求实际域名，配置缺失时不会部署带占位下载地址的站点。

R2 桶的 CORS 需允许官网 origin 的 GET/HEAD。静态网站没有下载 API 代理：
浏览器直接请求公开 JSON。HTML 的 CSP 仅允许本站资源和配置的下载源；不使用第三方字体、
追踪脚本或运行时 CDN。更新 CORS 后清理已有缓存。

官网不上传二进制。mob 私有仓库的 `.github/workflows/publish-r2.yml` 才负责构建产物的
上传与 stable 切换，操作步骤见同级 `../mob/docs/releases.md`。

## 下载协议

```text
{DOWNLOAD_BASE_URL}/mob/latest.json       当前桌面版本
{DOWNLOAD_BASE_URL}/mobd/latest.json      当前办公室端版本
{DOWNLOAD_BASE_URL}/mob/releases.json     桌面版本历史数组
{DOWNLOAD_BASE_URL}/mobd/releases.json    办公室端版本历史数组
{DOWNLOAD_BASE_URL}/mobd/install.sh       已填入正式域名和 Apple Team ID 的安装器
```

每条清单包含 `version`、`pub_date`、纯文本 `notes`、`download.url`、`download.sha256`
和 `checksums_url`。官网仅接受同一下载源、对应产品及版本路径的文件地址，校验失败时不提供
下载链接。404 显示“尚未发布”；超时、权限或网络错误显示暂不可用。首个版本发布后无需重建
官网即可显示版本和安装命令。

`notes` 作为文本显示，保留原始换行。发布前请填写面向用户的说明，避免直接使用带私有
GitHub PR 链接的自动生成说明。页面中的工作区是明确标注的功能示意，不是真实用户记录。

## 文件位置

- `src/`：页面和共用 HTML 外壳。
- `public/`：CSS、浏览器逻辑、品牌资源。
- `build.mjs`：生成页面、公开配置、CSP、robots 和 sitemap。
- `test/`：生产配置、下载地址校验和构建测试。
- `wrangler.jsonc`：静态站点托管配置；没有付费服务或数据库绑定。

品牌资源复制自 `../mob/apps/mob/public/logo.svg` 和 `app-icon.svg`。修改品牌时同步更新。
`npm test` 不依赖真实发布服务；真实发布验收需检查跨域清单、DMG 下载及办公室端安装。

官方参考：[Workers 静态资源](https://developers.cloudflare.com/workers/static-assets/)、
[R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/)。
