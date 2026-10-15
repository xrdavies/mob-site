# MOB 产品官网

MOB 品牌的静态产品网站：首页、下载、mobd 安装指南、更新日志和 404 页面。
原生 HTML/CSS/ES modules，无前端框架、无运行时依赖。由 **GitHub Pages** 托管。

## 本地预览

需要 Node.js 24+，无需 `npm install`：

```sh
npm test
npm run dev        # 构建并在 http://localhost:4321 预览（PORT=xxxx 可改端口）
```

构建时从 R2（默认 `https://mob-releases.0xd.app`）读取发布清单，把版本号、下载链接、
SHA-256 和更新日志直接写进 HTML。浏览器不需要访问 R2 的 JSON，因此**不需要配置 R2 CORS**。
离线时本地构建仍会成功，下载区显示“暂时无法获取版本信息”。

## 构建配置

| 变量 | 必填 | 内容 |
| --- | --- | --- |
| `SITE_URL` | 部署时必填 | 官网 HTTPS 根地址（自定义域名），用于 canonical、sitemap、og:image |
| `DOWNLOAD_BASE_URL` | 否 | R2 下载域名，默认 `https://mob-releases.0xd.app` |
| `IOS_APP_URL` | 否 | App Store 或 TestFlight 链接；未设置时 iOS 卡片显示“即将上线” |
| `REQUIRE_PUBLIC_CONFIG` | — | 设为 `1` 时要求 `SITE_URL`，且任一清单读取失败即中止构建（CI 部署使用） |

## 部署到 GitHub Pages

1. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
2. **Settings → Pages → Custom domain** 填写官网域名，并按提示在 DNS 中添加 CNAME
   指向 `xrdavies.github.io`；验证通过后勾选 **Enforce HTTPS**。
   （Actions 部署会忽略产物中的 `CNAME` 文件，域名只在这里配置。）
3. **Settings → Secrets and variables → Actions → Variables** 添加 `SITE_URL`
   （与上一步域名一致，如 `https://mob.0xd.app`），按需添加 `DOWNLOAD_BASE_URL`、`IOS_APP_URL`。
4. 推送到 `main`。

`.github/workflows/pages.yml` 在 PR 上测试和构建；在 `main` 推送、每小时定时、手动运行，
以及收到 `release-published` 事件时构建并部署。R2 不可达时构建失败，Pages 继续提供上一版站点，
不会把已有下载链接替换成“不可用”。

### 发布后立即更新官网

mob、mobd、mob-android 的 R2 发布工作流最后一步会触发本仓库重建。需要在这三个仓库的
`release` 环境中添加 Secret `SITE_DISPATCH_TOKEN`：对 `xrdavies/mob-site` 拥有
**Contents: Read and write** 权限的 fine-grained token。未配置时该步骤跳过，官网在一小时内的
定时构建中更新。

> GitHub 会在仓库 60 天无活动后暂停定时工作流；届时在 Actions 页面重新启用即可。

## 下载协议

```text
{DOWNLOAD_BASE_URL}/mob/releases.json        桌面客户端版本历史（mob 仓库发布）
{DOWNLOAD_BASE_URL}/mobd/releases.json       办公室端版本历史（mobd 仓库发布）
{DOWNLOAD_BASE_URL}/android/releases.json    Android 版本历史（mob-android 仓库发布）
{DOWNLOAD_BASE_URL}/mobd/install.sh          mobd 安装器
```

每条记录包含 `version`、`pub_date`、`notes`、`download.url`、`download.sha256` 和
`checksums_url`。官网只接受同一下载源、对应产品及版本路径的文件地址
（`mob_X.Y.Z_darwin_arm64.dmg`、`mobd_X.Y.Z_darwin_arm64.tar.gz`、`mob-android_X.Y.Z.apk`），
不合规的条目会被跳过。清单 404 表示尚未发布，对应按钮显示为禁用。

`notes` 以文本显示，只渲染 `**粗体**`、链接和换行。发布前请填写面向用户的说明，
避免直接使用带私有 PR 链接的自动生成说明。

## 文件位置

- `src/`：页面和共用 HTML 外壳；`{{download:mob|标签}}` 等标记由构建替换。
- `public/`：CSS、浏览器增强脚本（菜单、复制按钮、选项卡、设备推荐）、品牌资源。
- `lib/releases.mjs`：读取和校验发布清单。
- `build.mjs`：生成页面、CSP（`<meta>`，Pages 不支持自定义响应头）、robots 和 sitemap。
- `scripts/serve.mjs`：本地预览服务器。
- `test/`：使用模拟清单的构建与校验测试，不访问真实 R2。

品牌资源复制自 `../mob/apps/mob/public/logo.svg` 和 `app-icon.svg`。修改品牌时同步更新。
