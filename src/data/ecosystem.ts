import type {
  AiHealthProduct,
  EcosystemOverview,
  PartnerAccount,
  PatientEcosystemJourney
} from "../types.js";

interface PatientEnrollmentSeed {
  patientId: string;
  sponsorId: string;
  userSegment: string;
  lifecycleStage: string[];
  activePrograms: string[];
  aiTouchpoints: string[];
  serviceModules: string[];
  offlineCoordination: string[];
  valueSignals: string[];
}

export const partnerAccounts: PartnerAccount[] = [
  {
    id: "partner-ins-001",
    name: "城市惠民保健康运营平台",
    type: "insurance",
    coverageLabel: "惠民保用户与慢病高风险人群",
    coveredLives: 1260000,
    serviceModel: "保险权益嵌入式健康管理",
    paymentLogic: "保险方按权益包和服务达成付费，不经过平台承担医疗费用",
    activePrograms: ["慢病会员管理", "中医理疗权益", "癌症早筛", "住院前后管理"],
    linkedHospitals: ["beijing", "jiangyin"]
  },
  {
    id: "partner-bank-001",
    name: "华东银行财富健康中心",
    type: "bank",
    coverageLabel: "高净值客户与家庭健康账户",
    coveredLives: 830000,
    serviceModel: "财富客户增值健康服务",
    paymentLogic: "银行采购年度健康服务包，平台提供 AI + 医疗资源协同",
    activePrograms: ["AI精准就医", "AI体检报告解读", "国际医疗协同", "家庭医生权益"],
    linkedHospitals: ["xiamen", "beijing"]
  },
  {
    id: "partner-ent-001",
    name: "华东智造集团员工健康计划",
    type: "enterprise",
    coverageLabel: "总部与园区员工",
    coveredLives: 162000,
    serviceModel: "企业员工全周期健康管理",
    paymentLogic: "企业按人群分层和年度服务模块采购",
    activePrograms: ["员工慢病管理", "AI心理支持", "年度体检报告解读", "运动健康激励"],
    linkedHospitals: ["xiamen", "jiangyin"]
  },
  {
    id: "partner-ih-001",
    name: "头部互联网医疗平台联合项目",
    type: "internet-health",
    coverageLabel: "线上问诊与复诊用户",
    coveredLives: 100000,
    serviceModel: "AI 辅助问诊与转诊协同",
    paymentLogic: "互联网平台按订单量和服务转化付费",
    activePrograms: ["AI辅助问诊", "AI全科医生", "专科转诊协同"],
    linkedHospitals: ["beijing", "jiangyin"]
  },
  {
    id: "partner-sport-001",
    name: "城市赛事运动健康保障项目",
    type: "event-organizer",
    coverageLabel: "赛事参与者与运动人群",
    coveredLives: 42000,
    serviceModel: "赛前到赛后全周期健康保障",
    paymentLogic: "赛事方按活动批次采购风险评估和康复服务",
    activePrograms: ["赛前 AI 风险评估", "赛中实时咨询", "赛后 AI 康复计划"],
    linkedHospitals: ["xiamen", "jiangyin"]
  }
];

export const aiHealthProducts: AiHealthProduct[] = [
  {
    id: "product-ai-gp",
    name: "AI全科医生",
    mode: "hybrid",
    targetUsers: ["保险用户", "企业员工", "互联网问诊用户"],
    description: "承接首问、分层分诊、行为干预和持续随访，不替代医生。",
    scenarios: ["在线初筛", "慢病随访", "权益激活", "复诊前准备"]
  },
  {
    id: "product-precise-care",
    name: "AI精准就医",
    mode: "ai-assisted",
    targetUsers: ["高净值客户", "复杂病种患者"],
    description: "结合病历、影像和医院资源，辅助匹配合适科室、医院和专家路径。",
    scenarios: ["疑难病转诊", "住院前协调", "国际医疗协同"]
  },
  {
    id: "product-report",
    name: "AI体检报告解读",
    mode: "ai-first",
    targetUsers: ["企业员工", "银行客户", "慢病高风险人群"],
    description: "快速解读体检异常项并输出个性化健康管理建议。",
    scenarios: ["年度体检", "检后管理", "复查提醒"]
  },
  {
    id: "product-community",
    name: "华美社区医疗助手",
    mode: "hybrid",
    targetUsers: ["社区医院", "基层全科医生"],
    description: "辅助基层医生处理复杂慢病和社区连续照护。",
    scenarios: ["社区门诊", "基层慢病建档", "家庭医生签约随访"]
  },
  {
    id: "product-village",
    name: "村医助手·慧医通",
    mode: "ai-assisted",
    targetUsers: ["村医", "卫生院医生"],
    description: "以自然语言采集随访信息并自动生成规范记录。",
    scenarios: ["入户随访", "高血压糖尿病管理", "乡村基层筛查"]
  },
  {
    id: "product-diet",
    name: "健康饮食 AI",
    mode: "ai-first",
    targetUsers: ["慢病用户", "运动人群"],
    description: "结合多模态识别和营养规则，输出膳食建议与配比提醒。",
    scenarios: ["拍照识别餐食", "慢病饮食控制", "运动营养"]
  }
];

const patientEnrollments: PatientEnrollmentSeed[] = [
  {
    patientId: "patient-zhang-001",
    sponsorId: "partner-ent-001",
    userSegment: "企业员工慢病管理会员",
    lifecycleStage: ["预防", "慢病干预", "复诊管理"],
    activePrograms: ["员工慢病管理", "AI体检报告解读", "健康饮食", "AI心理支持"],
    aiTouchpoints: ["AI全科医生", "AI体检报告解读", "健康饮食 AI"],
    serviceModules: ["血糖异常解读", "控重管理", "睡眠改善", "运动处方执行追踪"],
    offlineCoordination: ["对接厦门三甲内分泌门诊", "健康管理师月度随访", "必要时 MDT 协调"],
    valueSignals: ["降低糖化血红蛋白", "减少缺勤风险", "提升权益使用率"]
  },
  {
    patientId: "patient-chen-002",
    sponsorId: "partner-ins-001",
    userSegment: "惠民保高风险慢病会员",
    lifecycleStage: ["预防", "诊疗协同", "康复管理"],
    activePrograms: ["慢病会员管理", "住院前后管理", "AI精准就医"],
    aiTouchpoints: ["AI全科医生", "AI精准就医", "华医生AI智能体"],
    serviceModules: ["心衰再入院预警", "用药依从性管理", "肾功能监测", "家庭康复计划"],
    offlineCoordination: ["对接北京心衰门诊", "保险权益核验", "护理与康复协同"],
    valueSignals: ["降低再入院率", "减少赔付风险", "提高重症转归质量"]
  },
  {
    patientId: "patient-li-003",
    sponsorId: "partner-ih-001",
    userSegment: "互联网医疗连续问诊用户",
    lifecycleStage: ["症状初筛", "诊疗分流", "康复随访"],
    activePrograms: ["AI辅助问诊", "AI全科医生", "专科转诊协同"],
    aiTouchpoints: ["AI辅助问诊", "AI全科医生", "健康饮食 AI"],
    serviceModules: ["呼吸风险识别", "睡眠呼吸暂停筛查", "吸烟干预", "居家康复指导"],
    offlineCoordination: ["江阴呼吸门诊转诊", "睡眠中心复查提醒", "药房续方协调"],
    valueSignals: ["提高线上问诊转化", "缩短就医路径", "减少重复咨询成本"]
  },
  {
    patientId: "patient-wu-004",
    sponsorId: "partner-bank-001",
    userSegment: "银行家庭健康账户长者会员",
    lifecycleStage: ["预防", "诊疗协同", "照护支持"],
    activePrograms: ["AI精准就医", "家庭医生权益", "AI体检报告解读"],
    aiTouchpoints: ["AI全科医生", "AI精准就医", "华医生AI智能体"],
    serviceModules: ["认知衰退监测", "照护负担评估", "睡眠管理", "跌倒风险干预"],
    offlineCoordination: ["记忆门诊绿色通道", "家庭照护者教育", "跨院专家会诊协调"],
    valueSignals: ["提升家庭客户粘性", "提高重疾前置管理能力", "增强高价值客户服务感知"]
  }
];

export const ecosystemOverviewSeed: EcosystemOverview = {
  brand: "B2B2C 健康管理生态层",
  positioning: "借鉴中国健康管理平台模式，用 AI 赋能保险、银行、企业和互联网平台，让健康服务不重资产也能规模化触达。",
  strategySummary: [
    "不做保险承保、不卖药，保持技术与服务中立",
    "以医院合作为资源底座，以付费方作为规模入口",
    "围绕预防、诊疗、康复组织全链条健康管理"
  ],
  metrics: {
    bClients: 298,
    coveredUsers: 56000000,
    partneredMedicalInstitutions: 300,
    tertiaryHospitals: 1650,
    serviceModules: 156,
    aiDrivenModules: 74
  },
  partners: partnerAccounts,
  productMatrix: aiHealthProducts,
  strategicDirections: [
    "扩大 B 端付费方覆盖，提升存量客户的权益使用率",
    "深化 AI Agent 全科健康管理服务体系，形成预防到康复闭环",
    "与头部三甲医院共建心血管、慢病、运动康复等专科产品",
    "向企业与家庭用户延伸，强化技术驱动的健康价值创造"
  ]
};

export function buildPatientEcosystemJourney(patientId: string): PatientEcosystemJourney | null {
  const enrollment = patientEnrollments.find((item) => item.patientId === patientId);

  if (!enrollment) {
    return null;
  }

  const sponsor = partnerAccounts.find((partner) => partner.id === enrollment.sponsorId);

  if (!sponsor) {
    return null;
  }

  return {
    patientId,
    sponsor,
    userSegment: enrollment.userSegment,
    lifecycleStage: enrollment.lifecycleStage,
    activePrograms: enrollment.activePrograms,
    aiTouchpoints: enrollment.aiTouchpoints,
    serviceModules: enrollment.serviceModules,
    offlineCoordination: enrollment.offlineCoordination,
    valueSignals: enrollment.valueSignals
  };
}
