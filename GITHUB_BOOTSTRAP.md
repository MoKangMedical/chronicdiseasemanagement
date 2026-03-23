# GitHub 仓库初始化与首次提交清单

这份文档用于把当前项目第一次推到 GitHub，并确保后续的 CI、GHCR、Render、Railway 自动部署能正常工作。

## 1. 本地初始化仓库

如果当前目录还不是 Git 仓库：

```bash
cd "/Users/linzhang/Desktop/      OPC/medical-agent-os"
git init
git branch -M main
```

## 2. 检查忽略文件

当前 `.gitignore` 已覆盖这些常见运行期文件：

- `node_modules`
- `dist`
- `storage`
- `.env*`
- `coverage`
- `*.log`

## 3. 本地首次检查

```bash
cd "/Users/linzhang/Desktop/      OPC/medical-agent-os"
pnpm install
pnpm build
```

如果你要本地起服务再确认一遍：

```bash
pnpm start
```

## 4. 首次提交命令

```bash
git add .
git status
git commit -m "feat: bootstrap medical agent os demo"
```

## 5. 连接 GitHub 远程仓库

```bash
git remote add origin git@github.com:MoKangMedical/chronicdiseasemanagement.git
git push -u origin main
```

如果你用 HTTPS：

```bash
git remote add origin https://github.com/MoKangMedical/chronicdiseasemanagement.git
git push -u origin main
```

## 6. 推送后立即检查

推送到 GitHub 后检查：

- GitHub 仓库默认分支是 `main`
- `Actions` 页能看到 `CI` workflow
- `docker-publish.yml` 能在默认分支触发
- `ghcr.io/mokangmedical/chronicdiseasemanagement` 能看到镜像

## 7. GitHub Secrets

在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 中配置：

### Render

- `RENDER_DEPLOY_HOOK_URL`

### Railway

- `RAILWAY_TOKEN`
- `RAILWAY_PROJECT_ID`
- `RAILWAY_ENVIRONMENT`
- `RAILWAY_SERVICE`

## 8. 首次上线前建议

- 先在本地确认 `pnpm build` 成功
- 再推送到 GitHub
- 先让 `CI` 和 `Docker Publish` 成功
- 最后再打开 Render / Railway 自动部署
