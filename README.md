# 🏥 慢康智枢

**AI驱动的慢病管理平台** — HIS集成 · 风险分层 · 智能随访，让慢性病管理更精准、更高效。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10+-green.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-teal.svg)](https://fastapi.tiangolo.com)

---

## ✨ 核心功能

| # | 功能模块 | 说明 |
|---|---------|------|
| 1 | **HIS系统集成** | 无缝对接医院信息系统，自动同步患者基本信息、检验检查结果、处方数据 |
| 2 | **患者管理** | 慢病患者全生命周期管理，从筛查、诊断到长期随访的完整闭环 |
| 3 | **风险分层** | AI模型综合评估患者风险等级（低危/中危/高危/极高危），精准识别高危人群 |
| 4 | **智能随访** | 自动生成个性化随访计划，支持AI电话、微信、短信多通道智能提醒 |
| 5 | **用药管理** | 药物依从性实时监测，药物相互作用智能提醒，处方合理性审核 |
| 6 | **数据看板** | 科室/医院/区域多维度数据展示，实时监控慢病管理核心指标 |
| 7 | **质控报告** | 慢病管理质量指标自动统计，一键生成符合卫健委要求的质控报告 |
| 8 | **科研支持** | 脱敏数据安全导出，支持临床回顾性研究和真实世界研究 |

---

## 🩺 6种慢病管理详解

### 🫀 高血压管理

**风险模型：** 基于Framingham评分 + 中国人群修正因子，综合评估10年心血管事件风险。

- **分级管理：** 1级/2级/3级高血压差异化随访频率
- **靶器官监测：** 心脏超声、肾功能、眼底检查自动提醒
- **药物方案：** 基于指南的阶梯式用药推荐（CCB→ACEI→联合）
- **家庭血压：** 对接智能血压计，自动采集家庭血压数据
- **质控指标：** 血压达标率、服药依从性、随访完成率

### 🍬 糖尿病管理

**风险模型：** UKPDS风险引擎 + 中国2型糖尿病风险评分，预测微血管/大血管并发症风险。

- **血糖监控：** HbA1c趋势分析，血糖波动预警
- **并发症筛查：** 糖尿病视网膜病变、肾病、周围神经病变定期筛查提醒
- **饮食管理：** AI营养师个性化饮食方案，食物GI值查询
- **运动处方：** 基于患者体能的个性化运动建议
- **质控指标：** HbA1c达标率、并发症筛查率、低血糖发生率

### ❤️ 冠心病管理

**风险模型：** GRACE评分 + SYNTAX评分，综合评估急性冠脉事件风险与冠脉病变严重程度。

- **二级预防：** ABCDE方案自动提醒（抗血小板、β受体阻滞、胆固醇管理）
- **心脏康复：** 分期运动处方、心理干预、营养指导
- **危险因素管理：** 血压/血糖/血脂三达标管理
- **紧急预警：** 胸痛症状识别，自动触发急救流程
- **质控指标：** LDL-C达标率、双抗依从性、心脏康复参与率

### 🫁 慢阻肺管理

**风险模型：** GOLD分级 + mMRC呼吸困难评分 + CAT评分，综合评估病情严重程度。

- **肺功能监测：** FEV1趋势分析，急性加重风险预警
- **吸入装置管理：** 吸入技术视频指导，用药依从性监测
- **急性加重管理：** 症状日记自动分析，加重早期识别
- **戒烟支持：** AI戒烟助手，尼古丁替代方案推荐
- **质控指标：** 肺功能检查率、吸入装置使用正确率、急性加重率

### 🫘 慢性肾病管理

**风险模型：** KDIGO风险矩阵，基于eGFR和蛋白尿水平分层。

- **肾功能监测：** eGFR趋势分析，肾功能恶化预警
- **用药调整：** 肾功能不全时药物剂量自动调整提醒
- **饮食管理：** 低蛋白饮食方案，钾/磷/钠摄入监控
- **透析准备：** eGFR<20时自动启动透析教育和通路准备
- **质控指标：** eGFR监测频率、贫血纠正率、透析准备率

### 🧠 脑卒中管理

**风险模型：** CHA₂DS₂-VASc评分（房颤相关）+ ABCD²评分（TIA后卒中风险）。

- **复发预防：** 抗血小板/抗凝方案管理，血压达标监控
- **功能康复：** 肢体功能、语言功能、认知功能康复训练提醒
- **心理支持：** 卒中后抑郁筛查与干预
- **生活指导：** 吞咽障碍管理、跌倒预防、家庭环境改造建议
- **质控指标：** 复发率、功能恢复率、抗凝达标率

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────┐
│                   前端层                      │
│         Vue 3 + Element Plus + ECharts       │
├─────────────────────────────────────────────┤
│                  API 网关                     │
│              Nginx / Kong                    │
├─────────────────────────────────────────────┤
│                后端服务层                     │
│        FastAPI + Celery + WebSocket          │
├──────────┬──────────┬───────────────────────┤
│ 风险引擎  │ 随访引擎  │   HIS适配器           │
│ (Python) │ (Python) │  (HL7/FHIR/REST)     │
├──────────┴──────────┴───────────────────────┤
│               数据层                         │
│   PostgreSQL + Redis + MinIO(文件存储)        │
├─────────────────────────────────────────────┤
│               AI 模型层                      │
│     scikit-learn / XGBoost / LLM API        │
└─────────────────────────────────────────────┘
```

**技术栈：**
- **后端：** Python 3.10+ / FastAPI / Celery / SQLAlchemy
- **数据库：** PostgreSQL 15+ / Redis 7+
- **前端：** Vue 3 / Element Plus / ECharts
- **AI：** scikit-learn / XGBoost / OpenAI API
- **消息队列：** Redis / RabbitMQ
- **部署：** Docker / Docker Compose / Kubernetes

---

## 📡 API 文档

### 认证

```bash
# JWT Token 认证
curl -X POST https://api.chronic-care.io/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "doctor01", "password": "xxx"}'
```

### 核心端点

#### GET /v1/patients — 获取患者列表

```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://api.chronic-care.io/v1/patients?disease=hypertension&risk_level=high&page=1"
```

**响应：**
```json
{
  "patients": [
    {
      "id": "pat_001",
      "name": "张三",
      "diseases": ["hypertension", "diabetes"],
      "risk_level": "high",
      "last_visit": "2026-04-20",
      "next_followup": "2026-05-04",
      "bp_controlled": false,
      "hba1c": 8.2
    }
  ],
  "total": 156,
  "page": 1
}
```

#### POST /v1/patients/{id}/risk-assessment — 执行风险评估

```json
{
  "patient_id": "pat_001",
  "disease": "hypertension",
  "data": {
    "age": 65,
    "gender": "male",
    "sbp": 165,
    "dbp": 95,
    "total_cholesterol": 6.2,
    "hdl": 1.1,
    "smoking": true,
    "diabetes": true,
    "family_history": true
  }
}
```

**响应：**
```json
{
  "risk_level": "very_high",
  "10_year_cvd_risk": 0.342,
  "recommendations": [
    "立即启动降压治疗，目标<130/80mmHg",
    "推荐联合用药：ACEI + CCB",
    "建议戒烟干预",
    "1个月后复查"
  ],
  "next_followup": "2026-05-26"
}
```

#### POST /v1/followups — 创建随访任务

```json
{
  "patient_id": "pat_001",
  "type": "phone",
  "scheduled_date": "2026-05-04",
  "template": "hypertension_monthly",
  "remind_before": [1440, 60]
}
```

#### GET /v1/dashboard/metrics — 获取数据看板

```json
{
  "period": "2026-04",
  "metrics": {
    "total_patients": 2450,
    "controlled_rate": 0.68,
    "followup_completion": 0.85,
    "high_risk_patients": 312,
    "medication_adherence": 0.79
  },
  "by_disease": {
    "hypertension": {"controlled": 0.72, "total": 1200},
    "diabetes": {"controlled": 0.65, "total": 850}
  }
}
```

#### POST /v1/reports/quality — 生成质控报告

```json
{
  "period": "2026-Q1",
  "scope": "department",
  "department_id": "dept_cardiology",
  "format": "pdf"
}
```

---

## 🔒 数据安全说明

### 数据加密

- **传输层：** 全链路TLS 1.3加密，API通信HTTPS强制
- **存储层：** AES-256加密敏感字段（身份证号、手机号、病历号）
- **数据库：** PostgreSQL TDE透明加密，Redis AUTH认证

### 访问控制

- **RBAC权限模型：** 院级管理员/科级管理员/医生/护士/药师5级权限
- **最小权限原则：** 医生仅可访问自己管理的患者数据
- **操作审计：** 所有数据访问记录完整审计日志，保留3年
- **会话管理：** 30分钟自动登出，异常登录实时告警

### 合规认证

- **等保三级：** 符合国家信息安全等级保护三级要求
- **HIPAA兼容：** 患者隐私数据管理符合国际医疗信息标准
- **数据脱敏：** 科研数据导出自动脱敏，去除个人身份信息
- **知情同意：** 电子签署数据使用知情同意书

### 备份与容灾

- **实时备份：** PostgreSQL WAL归档 + 流复制
- **异地容灾：** 数据每日同步至异地灾备中心
- **RPO/RTO：** RPO<15分钟，RTO<1小时
- **恢复演练：** 每季度执行一次灾难恢复演练

---

## 🔗 集成方案

### HIS系统集成

```
┌──────────┐     HL7/FHIR      ┌──────────┐
│  HIS系统  │ ←──────────────→  │  慢康智枢  │
│  (院内)   │     REST API      │  适配器    │
└──────────┘                   └──────────┘
```

**支持的集成方式：**
- **HL7 v2.x：** ADT（入出转）、ORM（医嘱）、ORU（检验结果）
- **FHIR R4：** Patient、Observation、MedicationRequest等资源
- **REST API：** 标准RESTful接口，支持JSON数据交换
- **数据库直连：** 支持Oracle/SQL Server/MySQL数据库直连（需授权）

**已对接HIS系统：**
- 卫宁健康 WiNEX
- 东华医为 HOS
- 创业慧康 HCIS
- 东软望海 NeuSoft

### 智能设备集成

- **血压计：** 欧姆龙/鱼跃/九安，蓝牙自动上传
- **血糖仪：** 三诺/怡成/罗氏，数据自动同步
- **智能手表：** 华为/Apple Watch，心率/血氧/运动数据
- **体脂秤：** 小米/华为，体重/BMI趋势追踪

### 第三方服务集成

- **短信网关：** 阿里云短信/腾讯云短信
- **微信服务号：** 随访提醒、健康报告推送
- **AI外呼：** 智能电话随访，自动记录通话内容
- **电子签名：** 法大大/e签宝，知情同意电子签署

---

## 🚀 快速开始

### 一键启动 (推荐)

```bash
# 克隆项目
git clone https://github.com/MoKangMedical/chronicdiseasemanagement.git
cd chronicdiseasemanagement

# 安装依赖
pip install -r requirements.txt

# 一键启动
./start.sh          # macOS / Linux
# start.bat          # Windows
```

启动后访问：
- **前端首页：** http://localhost:8000
- **API 文档：** http://localhost:8000/docs
- **健康检查：** http://localhost:8000/health

### 手动启动

```bash
python3.12 -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

### Docker 部署

```bash
docker build -t chronicare .
docker run -p 8000:8000 chronicare
# 或使用 docker-compose
docker-compose up -d
```

---

## 📁 项目结构

```
chronicdiseasemanagement/
├── src/
│   ├── main.py              # FastAPI 入口
│   ├── risk_engine.py       # 风险评估引擎
│   ├── follow_up.py         # 随访管理模块
│   ├── models/              # 数据模型
│   ├── api/                 # API 路由
│   ├── services/            # 业务逻辑
│   └── adapters/            # HIS 适配器
├── data/
│   ├── disease-models.json  # 疾病风险模型配置
│   └── follow-up-templates.json  # 随访模板
├── docs/
│   ├── product-spec.md      # 产品需求文档
│   └── business-model.md    # 商业模式文档
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

---

## 📊 部署方式

| 方式 | 适用场景 | 说明 |
|------|---------|------|
| **私有化部署** | 三甲医院/大型医疗集团 | 部署在医院内网，数据不出院，符合等保三级要求 |
| **SaaS 模式** | 基层医疗机构/社区卫生中心 | 开箱即用，按年付费，无需运维 |
| **混合云** | 医联体/区域医疗中心 | 核心数据本地，AI计算云端 |

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 🔗 相关项目

| 项目 | 定位 |
|------|------|
| [OPC Platform](https://github.com/MoKangMedical/opcplatform) | 一人公司全链路学习平台 |
| [Digital Sage](https://github.com/MoKangMedical/digital-sage) | 与100位智者对话 |
| [Cloud Memorial](https://github.com/MoKangMedical/cloud-memorial) | AI思念亲人平台 |
| [天眼 Tianyan](https://github.com/MoKangMedical/tianyan) | 市场预测平台 |
| [MediChat-RD](https://github.com/MoKangMedical/medichat-rd) | 罕病诊断平台 |
| [MedRoundTable](https://github.com/MoKangMedical/medroundtable) | 临床科研圆桌会 |
| [DrugMind](https://github.com/MoKangMedical/drugmind) | 药物研发数字孪生 |
| [MediPharma](https://github.com/MoKangMedical/medi-pharma) | AI药物发现平台 |
| [Minder](https://github.com/MoKangMedical/minder) | AI知识管理平台 |
| [Biostats](https://github.com/MoKangMedical/Biostats) | 生物统计分析平台 |

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源许可证。

---

**慢康智枢** — 让每一位慢病患者都能获得持续、精准的健康管理 🏥✨
