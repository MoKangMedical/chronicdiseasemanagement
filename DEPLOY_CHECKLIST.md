# 首次上线检查清单

这份清单用于把当前项目首次上线到 `GitHub + Render + Railway`。默认假设你使用主分支 `main`。

## 1. 代码仓库

- 已创建 GitHub 仓库
- 默认分支为 `main`
- 项目代码已推送到 GitHub
- 仓库包含以下文件：
  - `Dockerfile`
  - `render.yaml`
  - `railway.json`
  - `.github/workflows/ci.yml`
  - `.github/workflows/docker-publish.yml`
  - `.github/workflows/deploy-render.yml`
  - `.github/workflows/deploy-railway.yml`

## 2. GitHub Actions

在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 中配置：

### Render

- `RENDER_DEPLOY_HOOK_URL`

### Railway

- `RAILWAY_TOKEN`
- `RAILWAY_PROJECT_ID`
- `RAILWAY_ENVIRONMENT`
- `RAILWAY_SERVICE`

### 校验项

- `Actions` 已在仓库设置中启用
- 默认分支推送后可以触发 workflow
- `GITHUB_TOKEN` 对 packages 具备写权限

## 3. GitHub Container Registry

- 仓库允许发布 GitHub Packages
- 首次 push 到 `main` 后，`docker-publish.yml` 成功执行
- 在 GHCR 能看到镜像：
  - `ghcr.io/mokangmedical/chronicdiseasemanagement:latest`
  - `ghcr.io/mokangmedical/chronicdiseasemanagement:main`
  - `ghcr.io/mokangmedical/chronicdiseasemanagement:sha-...`

## 4. Render

### 创建方式

- 推荐使用 Blueprint
- 仓库已连接到 Render
- Render 读取根目录的 `render.yaml`

### 服务配置

- Service Name: `medical-agent-os`
- Runtime: Docker
- Region: `singapore`
- Health Check Path: `/health`
- Persistent Disk:
  - Mount Path: `/app/storage`
  - Size: `5 GB`

### 环境变量

- `NODE_ENV=production`
- `PORT`
  - 使用 Render 注入值
  - 不要手动写死成固定端口

### 部署触发

- 在服务设置中生成 Deploy Hook
- Deploy Hook 已写入 GitHub secret `RENDER_DEPLOY_HOOK_URL`
- `deploy-render.yml` 在 `docker-publish.yml` 成功后会调用该 Hook

### 验证项

- Render 服务状态为 `Live`
- `https://<render-domain>/health` 返回 200
- 首页可以正常打开控制台
- `/api/dashboard` 返回 JSON

## 5. Railway

### 项目结构

- 已创建 Railway Project
- 已创建目标 Environment
  - 例如 `production`
- 已创建目标 Service

### 部署方式

- 项目使用 GitHub 仓库源码部署
- Railway 能识别根目录 `Dockerfile`
- `railway.json` 存在于仓库根目录

### GitHub Secrets

- `RAILWAY_TOKEN`
  - 使用 Project Token
- `RAILWAY_PROJECT_ID`
- `RAILWAY_ENVIRONMENT`
- `RAILWAY_SERVICE`

### 验证项

- `deploy-railway.yml` 成功执行
- Railway 服务生成公网域名
- `https://<railway-domain>/health` 返回 200
- Railway 日志中没有 `No start command could be found`

## 6. 应用层自检

- 首页可以加载
- 医院切换可用
- 分角色视图可用
- 患者工作台可打开
- `POST /api/workflows/chronic-care/run/:patientId` 可执行
- MDT 会议可创建、发言、关闭
- 关闭会议后能生成 care plan 修订版

## 7. 存储与数据

- Render 上挂载持久化磁盘到 `/app/storage`
- Railway 若不使用卷，当前 `storage/*.json` 为容器内数据
- 如果 Railway 需要跨重启持久化：
  - 增加 Railway Volume
  - 或改造为数据库存储

## 8. 上线前确认

- 当前仍是模拟 HIS 数据
- 尚未接入真实身份权限
- 尚未接入真实医院网络与接口
- 尚未接入数据库
- 尚未接入正式 LLM 服务
- 如需正式生产，至少补：
  - RBAC
  - 审计日志
  - 数据脱敏
  - 数据库存储
  - 真实 HIS 映射
