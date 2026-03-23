import type {
  GithubCapability,
  GithubCapabilityOverview,
  GithubCapabilityPack,
  PatientCapabilityPlan
} from "../types.js";

export const githubCapabilities: GithubCapability[] = [
  {
    id: "health-record-mcp",
    name: "Health Record MCP",
    category: "ehr-connectivity",
    repo: "jmandel/health-record-mcp",
    repoUrl: "https://github.com/jmandel/health-record-mcp",
    summary: "把 SMART Health Cards、Apple Health Export 等患者健康记录暴露为 MCP 资源，适合做只读型医疗数据接入。",
    whyFit: "适合把院外个人健康档案、安全地接到当前 MedClaw/AOS-H 的只读工作台里。",
    integrationMode: "adapter-ready",
    outputs: ["患者纵向健康记录", "个人健康摘要", "MCP 资源访问"],
    supportedDomains: ["cardiovascular", "diabetes", "sleep", "metabolic"]
  },
  {
    id: "healthchain",
    name: "HealthChain",
    category: "fhir-middleware",
    repo: "dotimplement/HealthChain",
    repoUrl: "https://github.com/dotimplement/HealthChain",
    summary: "围绕 FHIR 的医疗 AI 中间件，强调与 EHR 系统、FHIR 服务和临床数据流的集成。",
    whyFit: "适合把当前模拟 HIS 升级到 FHIR/医院集成层，作为多院数据接入骨架。",
    integrationMode: "adapter-ready",
    outputs: ["FHIR 资源适配", "EHR 数据桥接", "AI 工作流入口"],
    supportedDomains: ["cardiovascular", "diabetes", "dementia", "respiratory", "sleep", "renal", "metabolic"]
  },
  {
    id: "temporai",
    name: "TemporAI",
    category: "time-series-risk",
    repo: "vanderschaarlab/temporai",
    repoUrl: "https://github.com/vanderschaarlab/temporai",
    summary: "医疗时序与纵向表型建模工具箱，支持风险预测、时间序列建模和临床时间依赖任务。",
    whyFit: "适合做慢病纵向风险、再入院风险、病情进展预测。",
    integrationMode: "planned-runtime",
    outputs: ["时序风险评分", "病程趋势预测", "事件发生概率"],
    supportedDomains: ["cardiovascular", "diabetes", "dementia", "respiratory", "renal", "metabolic"]
  },
  {
    id: "pyhealth",
    name: "PyHealth",
    category: "disease-prediction",
    repo: "sunlabuiuc/PyHealth",
    repoUrl: "https://github.com/sunlabuiuc/PyHealth",
    summary: "面向医疗机器学习的统一库，覆盖 EHR、药物推荐、诊断预测、可解释建模等任务。",
    whyFit: "适合把疾病预测、风险分层和药物/诊断相关任务快速原型化。",
    integrationMode: "planned-runtime",
    outputs: ["疾病预测基线模型", "再入院/死亡率预测", "多任务健康建模"],
    supportedDomains: ["cardiovascular", "diabetes", "dementia", "respiratory", "sleep", "renal", "metabolic"]
  },
  {
    id: "disease-prediction",
    name: "ClinicalBERT Disease Prediction",
    category: "disease-prediction",
    repo: "oneapi-src/disease-prediction",
    repoUrl: "https://github.com/oneapi-src/disease-prediction",
    summary: "使用 ClinicalBERT 从临床文本中做疾病风险分类和预测的示例项目。",
    whyFit: "适合接到当前 AI 病历草案、追问结果和门诊摘要后，做文本侧疾病预测。",
    integrationMode: "planned-runtime",
    outputs: ["文本风险分类", "疾病标签预测", "门诊摘要分类"],
    supportedDomains: ["cardiovascular", "diabetes", "dementia", "respiratory", "sleep", "renal", "metabolic"]
  },
  {
    id: "ehrshot",
    name: "EHRShot Benchmark",
    category: "benchmarking",
    repo: "som-shahlab/ehrshot-benchmark",
    repoUrl: "https://github.com/som-shahlab/ehrshot-benchmark",
    summary: "针对 EHR foundation models 的评测基线和任务集合，覆盖多种临床预测任务。",
    whyFit: "适合给后续接入的疾病预测与慢病风险模型建立离线评测标准。",
    integrationMode: "catalogued",
    outputs: ["模型评测指标", "任务基线", "离线回测框架"],
    supportedDomains: ["cardiovascular", "diabetes", "dementia", "respiratory", "sleep", "renal", "metabolic"]
  },
  {
    id: "healthkit-on-fhir",
    name: "HealthKit on FHIR",
    category: "patient-generated-data",
    repo: "microsoft/healthkit-on-fhir",
    repoUrl: "https://github.com/microsoft/healthkit-on-fhir",
    summary: "把 Apple HealthKit 数据转换成 FHIR 资源，适合接步数、睡眠、活动等院外数据。",
    whyFit: "适合补齐健康管理和慢病随访中的患者生成数据链路。",
    integrationMode: "adapter-ready",
    outputs: ["步数/睡眠 FHIR 化", "患者生成健康数据", "院外行为数据接入"],
    supportedDomains: ["cardiovascular", "diabetes", "sleep", "metabolic"]
  }
];

export const githubCapabilityPacks: GithubCapabilityPack[] = [
  {
    id: "pack-chronic-core",
    title: "慢病管理核心包",
    focus: "院内 EHR + FHIR 中间层 + 疾病预测",
    capabilityIds: ["healthchain", "pyhealth", "disease-prediction"]
  },
  {
    id: "pack-longitudinal-risk",
    title: "纵向风险预测包",
    focus: "长期时序建模、病情进展和再入院风险",
    capabilityIds: ["temporai", "ehrshot"]
  },
  {
    id: "pack-patient-generated-data",
    title: "院外健康数据包",
    focus: "患者个人健康记录、穿戴设备和行为数据",
    capabilityIds: ["health-record-mcp", "healthkit-on-fhir"]
  }
];

export const githubCapabilityOverviewSeed: GithubCapabilityOverview = {
  searchedAt: "2026-03-22",
  note: "基于 GitHub 开源仓库筛选，优先保留可映射到当前医院慢病管理、MedClaw、HIS/FHIR 接入和风险预测的能力。",
  capabilities: githubCapabilities,
  packs: githubCapabilityPacks
};

export function buildPatientCapabilityPlan(
  patientId: string,
  domains: string[],
  alerts: string[]
): PatientCapabilityPlan {
  const recommended = new Set<string>(["healthchain", "health-record-mcp"]);
  const activatedPacks = new Set<string>(["pack-chronic-core"]);
  const predictedUseCases: string[] = ["院内 EHR / FHIR 统一接入", "患者纵向档案汇聚"];
  const integrationSteps: string[] = [
    "先用 HealthChain 把模拟 HIS 资源映射到 FHIR 风格接口",
    "再把 MedClaw / KG-Followup 输出接入预测特征层",
    "按患者领域激活时序预测或文本预测模型"
  ];
  const riskTargets = [...alerts];

  if (domains.includes("cardiovascular") || domains.includes("renal") || alerts.some((item) => item.includes("再入院"))) {
    recommended.add("temporai");
    recommended.add("ehrshot");
    activatedPacks.add("pack-longitudinal-risk");
    predictedUseCases.push("再入院风险预测", "长期病程恶化预警");
  }

  if (domains.includes("diabetes") || domains.includes("metabolic") || domains.includes("dementia")) {
    recommended.add("pyhealth");
    recommended.add("disease-prediction");
    predictedUseCases.push("门诊文本侧疾病预测", "多模态慢病风险分层");
  }

  if (domains.includes("sleep") || alerts.some((item) => item.includes("睡眠")) || alerts.some((item) => item.includes("步数"))) {
    recommended.add("healthkit-on-fhir");
    activatedPacks.add("pack-patient-generated-data");
    predictedUseCases.push("院外睡眠和活动数据接入");
  }

  return {
    patientId,
    recommendedCapabilityIds: Array.from(recommended),
    activatedPacks: Array.from(activatedPacks),
    predictedUseCases: Array.from(new Set(predictedUseCases)),
    integrationSteps,
    riskTargets
  };
}
