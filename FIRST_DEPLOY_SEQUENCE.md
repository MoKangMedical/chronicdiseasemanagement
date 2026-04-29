# 首次推送前后的完整操作顺序

这份顺序把 `GitHub -> Render -> Railway` 串起来。建议按顺序做，不要跳步。

## A. 推送前

### 1. 本地准备

```bash
cd "/Users/linzhang/Desktop/      OPC/medical-agent-os"
pnpm install
pnpm build
```

### 2. 首次推送到 GitHub

```bash
cd "/Users/linzhang/Desktop/      OPC/medical-agent-os"
bash scripts/01_first_push.sh
```

如果你想用 HTTPS 远程地址：

```bash
REMOTE_URL="https://github.com/MoKangMedical/chronicdiseasemanagement.git" \
bash scripts/01_first_push.sh
```

## B. 推送后先做 GitHub 检查

### 3. 看 GitHub Actions

检查 GitHub 仓库：

- `CI` 是否成功
- `Docker Publish` 是否成功
- GHCR 是否生成镜像

如果你装了 `gh`：

```bash
gh run list --repo MoKangMedical/chronicdiseasemanagement
```

## C. Render 配置顺序

### 4. 在 Render 创建 Blueprint

控制台操作顺序：

1. 登录 Render
2. `New +`
3. 选择 `Blueprint`
4. 连接 GitHub 仓库 `MoKangMedical/chronicdiseasemanagement`
5. 让 Render 读取根目录 `render.yaml`
6. 确认服务名 `medical-agent-os`

### 5. 在 Render 获取 Deploy Hook

控制台操作顺序：

1. 打开服务
2. 进入 `Settings`
3. 找到 `Deploy Hook`
4. 创建 hook
5. 复制 URL

## D. Railway 配置顺序

### 6. 在 Railway 创建项目和服务

控制台操作顺序：

1. 登录 Railway
2. 新建 Project
3. 连接 GitHub 仓库 `MoKangMedical/chronicdiseasemanagement`
4. 确认使用仓库根目录 `Dockerfile`
5. 创建目标 Environment
   - 建议 `production`
6. 记录：
   - Project ID
   - Environment 名称
   - Service 名称
7. 创建或获取 Project Token

## E. 配置 GitHub Secrets

### 7. 创建本地 secrets 文件

在项目根目录新建 `.env.github.local`：

```bash
cat > .env.github.local <<'EOF'
RENDER_DEPLOY_HOOK_URL=你的_render_hook
RAILWAY_TOKEN=你的_railway_token
RAILWAY_PROJECT_ID=你的_project_id
RAILWAY_ENVIRONMENT=production
RAILWAY_SERVICE=medical-agent-os
EOF
```

### 8. 把 secrets 写入 GitHub

```bash
cd "/Users/linzhang/Desktop/      OPC/medical-agent-os"
bash scripts/02_set_github_secrets.sh
```

## F. 触发自动部署

### 9. 手动触发一轮部署验证

```bash
cd "/Users/linzhang/Desktop/      OPC/medical-agent-os"
bash scripts/03_trigger_and_verify.sh
```

### 10. 检查结果

GitHub：

```bash
gh run list --repo MoKangMedical/chronicdiseasemanagement
```

Render:

- 打开服务状态页
- 确认最新 deploy 成功
- 打开 `/health`

Railway:

- 打开 deploy 日志
- 确认没有构建或启动错误
- 打开 `/health`

## G. 上线验收

### 11. 验证接口

把域名换成你的实际地址：

```bash
curl https://<render-or-railway-domain>/health
curl https://<render-or-railway-domain>/api/dashboard
```

### 12. 验证控制台

打开首页并检查：

- 三家医院切换
- 分角色工作台切换
- 患者列表
- 风险卡片
- HIS 映射预览
- MDT 面板

## H. 后续更新

之后每次更新代码，正常流程就是：

```bash
git add .
git commit -m "your message"
git push origin main
```

推送后：

- GitHub CI 自动跑
- Docker 镜像自动发布到 GHCR
- Render 自动被 Deploy Hook 拉起
- Railway 自动执行发布 workflow
