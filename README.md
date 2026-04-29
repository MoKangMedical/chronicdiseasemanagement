# 慢康智枢 ChroniCare OS

![Node.js](https://img.shields.io/badge/node.js-18+-green) ![Docker](https://img.shields.io/badge/docker-ready-blue)


这是一个面向医院慢病管理场景的本地可运行 PoC。当前项目的产品名定为 `慢康智枢 ChroniCare OS`。它不只是后端接口原型，而是一个带前端控制台、模拟 HIS 资源模型、文件持久化存储、精准风险分层、行为干预疗法包和 MDT 在线讨论的演示系统。

## 当前已实现

- 按疾病领域精准风险分层
  - 心血管
  - 糖尿病
  - 认知/老年痴呆
  - 呼吸
  - 睡眠
  - 肾脏
  - 代谢
- 行为干预疗法包
  - 运动疗法包
  - 饮食疗法包
  - 生活方式疗法包
  - 睡眠改善包
- MDT 协作
  - 自动生成 MDT 任务单
  - 真人在线讨论
  - 发言留痕
  - 关闭会议后生成会议纪要
  - 自动追加 care plan 修订版
- 更真实的医院接口模型
  - `patient / conditions / observations / medications / encounters / careTeam`
- 文件持久化存储
  - `storage/his-records.json`
  - `storage/documents.json`
  - `storage/mdt-meetings.json`
- 医院可演示前端控制台
  - 三家医院切换
  - 分角色工作台
    - 专科医生
    - 全科医生
    - 健康管理师
  - 患者队列
  - 领域风险卡片
  - 疗法包面板
  - 临床计划摘要
  - MDT 在线讨论区
- MedClaw 医疗智能能力
  - 影像报告结构化解析与时序对比
  - AI 病历自动生成草案
  - 辅助诊断与病情预测
  - 只读权限边界与审计事件留痕
- KG-Followup 追问能力
  - EHR 引导的实体抽取
  - DDX 驱动的候选诊断与推理路径
  - KG 感知的 hard-case active ICL 示例选择
  - 基于知识图谱的精准追问生成
  - 问题整合与去冗余摘要
  - 前端工作台可视化展示
- B2B2C 健康管理生态层
  - 保险、银行、企业、互联网平台、赛事方多类付费方模型
  - AI 全科医生、AI 精准就医、AI 体检报告解读等产品矩阵
  - 患者权益旅程与服务模块编排
  - 付费方-医院-用户三方联动演示视图
- GitHub 开源能力中台
  - 健康管理、慢病管理、疾病预测相关仓库目录
  - EHR/FHIR、时序风险、文本疾病预测、患者生成数据接入建议
  - 按患者自动生成开源能力接入计划
- 真实数据适配链与本地预测服务
  - HealthChain 风格 FHIR 资源整合
  - SMART on FHIR 配置、动态 client registration、授权码、refresh token 与 scope 校验
  - healthkit-on-fhir 风格患者生成数据接入
  - Python 微服务化的 TemporAI 真实插件链：`ffill -> ts_standard_scaler -> nn_classifier`
  - Python 微服务化的 TemporAI `time_to_event.ts_xgb` 时间到事件风险预测
  - Python 微服务化的 PyHealth `SampleEHRDataset + RNN + Trainer` 训练链
  - PyHealth `train / val / test split + pr_auc monitor + best.ckpt`
  - Python 微服务化的 disease-prediction 风格文本风险分类
- HIS 字段映射预览
  - `MedSphere/v1`
  - `SmartEMR/v3`
  - `CareBridge/v2`

## 项目结构

```text
medical-agent-os/
  .github/workflows/     # GitHub CI / Docker 发布
  public/                # 前端控制台
  src/
    adapters/            # HIS 适配层
    core/                # 文档库 / 事件代理 / 会议存储
    data/                # 模拟医院资源数据
    lib/                 # ID / 存储工具
    services/            # 慢病管理编排
  storage/               # 运行期持久化文件
```

## GitHub 与 Pages 部署说明

这个项目现在支持两条 GitHub 交付链，但要区分两件事：

- `GitHub Pages` 托管的是静态医院演示控制台
- `Render / Railway` 运行的是完整的 `Node + Express + Python` 服务

### 已提供

- [ci.yml](/Users/linzhang/Desktop/%20%20%20%20%20%20OPC/medical-agent-os/.github/workflows/ci.yml)
  - push / PR 自动执行 `pnpm build`
- [deploy-pages.yml](/Users/linzhang/Desktop/%20%20%20%20%20%20OPC/medical-agent-os/.github/workflows/deploy-pages.yml)
  - `main` 分支自动导出静态快照并发布到 GitHub Pages
- [docker-publish.yml](/Users/linzhang/Desktop/%20%20%20%20%20%20OPC/medical-agent-os/.github/workflows/docker-publish.yml)
  - 主分支或 tag 自动推送镜像到 `ghcr.io/mokangmedical/chronicdiseasemanagement`
- [deploy-render.yml](/Users/linzhang/Desktop/%20%20%20%20%20%20OPC/medical-agent-os/.github/workflows/deploy-render.yml)
  - Docker 镜像发布成功后自动触发 Render Deploy Hook
- [deploy-railway.yml](/Users/linzhang/Desktop/%20%20%20%20%20%20OPC/medical-agent-os/.github/workflows/deploy-railway.yml)
  - 主分支提交后自动通过 Railway CLI 发布
- [Dockerfile](/Users/linzhang/Desktop/%20%20%20%20%20%20OPC/medical-agent-os/Dockerfile)
- [docker-compose.yml](/Users/linzhang/Desktop/%20%20%20%20%20%20OPC/medical-agent-os/docker-compose.yml)
- [render.yaml](/Users/linzhang/Desktop/%20%20%20%20%20%20OPC/medical-agent-os/render.yaml)
- [railway.json](/Users/linzhang/Desktop/%20%20%20%20%20%20OPC/medical-agent-os/railway.json)
- [DEPLOY_CHECKLIST.md](/Users/linzhang/Desktop/%20%20%20%20%20%20OPC/medical-agent-os/DEPLOY_CHECKLIST.md)
- [GITHUB_BOOTSTRAP.md](/Users/linzhang/Desktop/%20%20%20%20%20%20OPC/medical-agent-os/GITHUB_BOOTSTRAP.md)
- [FIRST_DEPLOY_SEQUENCE.md](/Users/linzhang/Desktop/%20%20%20%20%20%20OPC/medical-agent-os/FIRST_DEPLOY_SEQUENCE.md)
- [RENDER_BLUEPRINT_SETUP.md](/Users/linzhang/Desktop/%20%20%20%20%20%20OPC/medical-agent-os/RENDER_BLUEPRINT_SETUP.md)
- [.env.github.example](/Users/linzhang/Desktop/%20%20%20%20%20%20OPC/medical-agent-os/.env.github.example)
- [scripts/01_first_push.sh](/Users/linzhang/Desktop/%20%20%20%20%20%20OPC/medical-agent-os/scripts/01_first_push.sh)
- [scripts/02_set_github_secrets.sh](/Users/linzhang/Desktop/%20%20%20%20%20%20OPC/medical-agent-os/scripts/02_set_github_secrets.sh)
- [scripts/03_trigger_and_verify.sh](/Users/linzhang/Desktop/%20%20%20%20%20%20OPC/medical-agent-os/scripts/03_trigger_and_verify.sh)

### 推荐发布方式

1. 把项目推到 GitHub 仓库
2. 在 GitHub `Settings -> Pages` 中将 Source 设为 `GitHub Actions`
3. 推送到 `main` 后自动发布静态演示站到：
   - `https://mokangmedical.github.io/chronicdiseasemanagement/`
4. 在 GitHub Actions 中自动跑 CI
5. 在主分支触发 Docker 发布到 GHCR
6. Render 自动触发 Deploy Hook
7. Railway 自动执行 `railway up`

### GitHub Pages 的边界

- Pages 版是只读静态演示
- Pages 版展示完整的患者视图、风险卡片、疗法包、MedClaw、KG-Followup、B2B2C 生态、FHIR 适配摘要和模型训练摘要
- 工作流执行、MDT 发言、SMART on FHIR 授权与真实 Python 推理服务，仍需访问 Render 或 Railway 的完整部署版

### GitHub Secrets

在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 中配置：

#### Render

- `RENDER_DEPLOY_HOOK_URL`

#### Railway

- `RAILWAY_TOKEN`
- `RAILWAY_PROJECT_ID`
- `RAILWAY_ENVIRONMENT`
- `RAILWAY_SERVICE`

### Render 建议配置

建议在 Render 中先创建一个 image-backed web service，并将镜像指向：

```text
ghcr.io/mokangmedical/chronicdiseasemanagement:main
```

然后把 Render 生成的 Deploy Hook 配到 GitHub secret `RENDER_DEPLOY_HOOK_URL`。

### Railway 建议配置

建议先在 Railway 中创建项目、环境和服务，然后把项目级部署参数配置进 GitHub secrets。当前 workflow 会在 `main/master` 推送后执行：

```bash
railway up --ci --service="$RAILWAY_SERVICE" --environment="$RAILWAY_ENVIRONMENT" --project="$RAILWAY_PROJECT_ID"
```

### 本地用 Docker 启动

```bash
docker compose up --build
```

## 本地启动

```bash
cd "/Users/linzhang/Desktop/      OPC/medical-agent-os"
pnpm install
pnpm run setup:predictor
pnpm start
```

如果你要本地预览 GitHub Pages 版本，再执行：

```bash
pnpm run build:pages
```

生成目录：

```text
pages-dist/
```

如果你要把 `TemporAI` 的完整插件运行时也装上，再执行：

```bash
pnpm run setup:predictor:tempor-runtime
```

这会补齐 `hyperimpute / tsai / fastai / torch*` 等依赖，让 `TemporAI` 不只是做 runtime probe，而是能在本地预测微服务里真实跑通 plugin registry 和 one-off classification 插件训练。

打开：

- 控制台: [http://localhost:3010](http://localhost:3010)
- 健康检查: [http://localhost:3010/health](http://localhost:3010/health)

## 核心接口

### Dashboard

```bash
curl http://localhost:3010/api/dashboard
```

### 三家医院 + 分角色 Dashboard

```bash
curl "http://localhost:3010/api/dashboard?hospitalId=beijing&workbenchRole=specialist-doctor"
```

### 患者工作台

```bash
curl http://localhost:3010/api/patients/patient-wu-004/workspace
```

### 分角色患者工作台

```bash
curl "http://localhost:3010/api/patients/patient-wu-004/workspace?workbenchRole=general-practitioner"
```

### HIS 字段映射预览

```bash
curl http://localhost:3010/api/his/mappings
```

### MedClaw 患者工作空间

```bash
curl "http://localhost:3010/api/medclaw/patients/patient-chen-002/workspace?workbenchRole=specialist-doctor"
```

### KG-Followup 精准追问

```bash
curl http://localhost:3010/api/medclaw/patients/patient-wu-004/kg-followup
```

### B2B2C 生态总览

```bash
curl http://localhost:3010/api/ecosystem/overview
```

### 患者权益旅程

```bash
curl http://localhost:3010/api/ecosystem/patients/patient-chen-002/journey
```

### GitHub 开源能力总览

```bash
curl http://localhost:3010/api/github-capabilities/overview
```

### 当前患者的开源能力接入计划

```bash
curl http://localhost:3010/api/github-capabilities/patients/patient-chen-002/plan
```

### HealthChain + HealthKit 适配输出

```bash
curl http://localhost:3010/api/integrations/patients/patient-chen-002/adapted
```

### SMART on FHIR 配置

```bash
curl http://localhost:3010/.well-known/smart-configuration
curl http://localhost:3010/fhir/metadata
```

### SMART on FHIR 动态客户端注册

```bash
curl -X POST http://localhost:3010/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Demo SMART App",
    "redirect_uris": ["http://127.0.0.1:8899/callback"],
    "scope": "launch patient/*.read patient/Observation.read offline_access",
    "grant_types": ["authorization_code", "refresh_token"]
  }'
```

### SMART on FHIR 授权码与 refresh token

```bash
curl -i "http://localhost:3010/oauth/authorize?client_id=demo-smart-app&redirect_uri=http://127.0.0.1:9999/callback&scope=launch%20patient/*.read%20offline_access&launch=patient-chen-002"

curl -X POST http://localhost:3010/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&client_id=demo-smart-app&code=<code>&redirect_uri=http://127.0.0.1:9999/callback"

curl -X POST http://localhost:3010/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&client_id=demo-smart-app&refresh_token=<refresh_token>"
```

### 本地预测服务输出

```bash
curl http://localhost:3010/api/predictions/patients/patient-chen-002
```

预测结果会额外返回：

- `featureEngineering`：静态特征、时序点数、时序信号、文本 top terms
- `pipelines.temporai`：真实 TemporAI 插件链、cohort、时序特征维度与当前患者概率
- `pipelines.temporai.timeToEvent*`：7/30/90 天时间到事件风险
- `pipelines.pyhealth`：真实 PyHealth `SampleEHRDataset`、RNN 训练链、split、monitor、best checkpoint、验证/测试指标
- `runtime.packages`：`temporai / pyhealth / pandas / numpy / scikit-learn` 运行时状态

### 运行慢病工作流

```bash
curl -X POST http://localhost:3010/api/workflows/chronic-care/run/patient-wu-004
```

### 获取患者实时风险

```bash
curl http://localhost:3010/api/patients/patient-wu-004/risk
```

### 创建 MDT 会议

```bash
curl -X POST http://localhost:3010/api/patients/patient-wu-004/mdt-meetings \
  -H "Content-Type: application/json" \
  -d '{"topic":"吴美芳 慢病管理 MDT 在线讨论"}'
```

### 会议发言

```bash
curl -X POST http://localhost:3010/api/mdt-meetings/<meetingId>/messages \
  -H "Content-Type: application/json" \
  -d '{"clinicianId":"doc-zhou-003a","message":"建议 4 周后完成认知量表复评。"}'
```

### 关闭会议并生成纪要

```bash
curl -X POST http://localhost:3010/api/mdt-meetings/<meetingId>/close \
  -H "Content-Type: application/json" \
  -d '{"decision":"继续以认知管理为主轴联合睡眠干预","followUpActions":["4 周后复测 MMSE/MoCA"]}'
```

## 业务编排

当前工作流如下：

1. `HIS 接诊代理` 读取模拟医院资源数据
2. 写入 `intake-note`
3. `风险分层代理` 输出疾病领域级 `risk-assessment`
4. `MDT 协调代理` 自动生成在线 MDT 会议与 `mdt-tasklist`
5. 角色代理分别产出：
   - `medical-plan`
   - `diet-prescription`
   - `exercise-prescription`
   - `lifestyle-prescription`
   - `sleep-prescription`
   - `care-coordination-note`
6. 汇总为 `integrated-care-plan`
7. MDT 真人讨论关闭后生成 `mdt-meeting-summary`
8. 自动追加 `integrated-care-plan` 修订版

## 模拟患者

当前内置 4 个演示患者：

- 厦门大学附属慢病管理示范医院
  - 张淑兰：高血压 + 糖尿病 + 肥胖
- 北京清华长庚智慧医疗中心
  - 陈建国：心衰 + 慢性肾病 + 高血压
  - 吴美芳：阿尔茨海默病早期 + 高血压 + 失眠障碍
- 江阴区域健康协同医院
  - 李敏：慢阻肺 + 睡眠呼吸暂停 + 糖代谢异常

其中 `吴美芳` 适合演示“认知/老年痴呆 + 睡眠 + MDT”路径。

## 下一步建议

如果你继续推进到医院 PoC，我建议下一阶段直接补这几块：

1. 用户/角色/权限体系
2. 患者端随访与打卡入口
3. 真实 HIS / EMR / LIS API 适配
4. 数据库存储替换文件存储
5. LLM 智能体接入
6. 会诊结论签发与医嘱回写
