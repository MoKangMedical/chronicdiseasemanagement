# Render Blueprint 一键起服务说明

目标是让项目推到 GitHub 后，可以在 Render 中尽量接近“一键起服务”。

## 已提供文件

- `render.yaml`
- `Dockerfile`
- `.github/workflows/ci.yml`
- `.github/workflows/docker-publish.yml`
- `.github/workflows/deploy-render.yml`

## 推荐方式

### 方式 A：Blueprint 直接从 GitHub 仓库创建

适合你第一次把项目接到 Render。

步骤：

1. 把代码推到 GitHub
2. 登录 Render
3. 选择 `New +`
4. 选择 `Blueprint`
5. 连接你的 GitHub 仓库
6. Render 会读取根目录 `render.yaml`
7. 确认创建 `medical-agent-os` 服务

这个方式的优势是：

- Render 会自动识别 Docker 服务
- 健康检查路径和磁盘挂载会跟随 `render.yaml`
- 后面修改 `render.yaml` 也更容易审计

### 方式 B：先手工建服务，再交给 GitHub Actions 触发更新

适合你已经在 Render 上手工建过服务。

步骤：

1. 在 Render 中创建一个 Docker Web Service
2. 仓库连接到 GitHub
3. 保证服务可正常启动
4. 在 Render 服务设置里生成 Deploy Hook
5. 把 Hook URL 写入 GitHub secret `RENDER_DEPLOY_HOOK_URL`
6. 以后主分支镜像更新后，GitHub Actions 自动触发 Render 部署

## render.yaml 当前含义

- `runtime: docker`
  说明 Render 用 Dockerfile 构建服务
- `branch: main`
  默认跟踪主分支
- `autoDeployTrigger: checksPass`
  等 GitHub 检查通过后再自动部署
- `healthCheckPath: /health`
  Render 用这个接口判断服务健康
- `disk.mountPath: /app/storage`
  给本地 JSON 持久化留磁盘挂载点

## 首次创建后必须检查

- 首页是否可打开
- `/health` 是否返回 200
- `/api/dashboard` 是否返回 JSON
- Render 日志是否显示 `Medical Agent OS demo listening`
- 磁盘是否已经挂载到 `/app/storage`

## 生产前提醒

当前仍使用文件持久化：

- Render 上因为有持久化磁盘，所以可以保留 `storage/*.json`
- 但如果未来并发变高，建议改成数据库

如果你后面准备正式接医院系统，建议把 Render 上线前再补：

- 权限认证
- 审计日志
- 数据库存储
- 真实 HIS 字段映射
