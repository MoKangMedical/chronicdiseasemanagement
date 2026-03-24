import type {
  Clinician,
  ClinicianRole,
  HISConditionResource,
  HISMedicationResource,
  HISObservationResource,
  HospitalDescriptor,
  HospitalId,
  HospitalRecord,
  WorkbenchRole
} from "../types.js";

type Gender = "male" | "female";

interface QixiaCaseSpec {
  hospitalId: HospitalId;
  patientId: string;
  mrn: string;
  name: string;
  gender: Gender;
  birthDate: string;
  age: number;
  conditions: HISConditionResource[];
  observations: HISObservationResource[];
  medications: HISMedicationResource[];
  encounter: {
    date: string;
    department: string;
    reason: string;
    clinician: string;
    encounterType: "outpatient" | "inpatient" | "follow-up";
  };
  alerts: string[];
}

export const qixiaHospitals: HospitalDescriptor[] = [
  {
    id: "qixia-hospital",
    name: "南京市栖霞区医院",
    city: "南京",
    district: "栖霞区",
    level: "二级",
    category: "综合医院",
    networkRole: "区级牵头医院",
    hisVendor: "Qixia Regional HIS",
    accent: "#1d4ed8",
    integrationStatus: "simulated",
    sourceNote: "基于栖霞区区级医疗服务网络演示接入"
  },
  {
    id: "jiangsu-integrated",
    name: "江苏省中西医结合医院",
    city: "南京",
    district: "栖霞区",
    level: "三级",
    category: "中西医结合医院",
    networkRole: "驻区三级医院",
    hisVendor: "Jiangsu Fusion EMR",
    accent: "#0f766e",
    integrationStatus: "simulated",
    sourceNote: "基于驻区三级医院协同场景演示接入"
  },
  {
    id: "jiangsu-tcm-zidong",
    name: "江苏省中医院紫东院区",
    city: "南京",
    district: "栖霞区",
    level: "三级",
    category: "中医医院",
    networkRole: "驻区三级医院",
    hisVendor: "ZiDong TCM HIS",
    accent: "#7c3aed",
    integrationStatus: "simulated",
    sourceNote: "基于栖霞区中医专科协同场景演示接入"
  },
  {
    id: "njmu2-maigaoqiao",
    name: "南京医科大学第二附属医院迈皋桥院区",
    city: "南京",
    district: "栖霞区",
    level: "三级",
    category: "综合医院",
    networkRole: "驻区三级医院",
    hisVendor: "NMU2 SmartEMR",
    accent: "#0369a1",
    integrationStatus: "simulated",
    sourceNote: "基于驻区大型医院慢病协同场景演示接入"
  },
  {
    id: "taikang-xianlin-gulou",
    name: "泰康仙林鼓楼医院",
    city: "南京",
    district: "栖霞区",
    level: "三级",
    category: "综合医院",
    networkRole: "社会办三级医院",
    hisVendor: "Taikang MedOS",
    accent: "#b45309",
    integrationStatus: "simulated",
    sourceNote: "基于仙林片区高端医疗协同场景演示接入"
  },
  {
    id: "maigaoqiao-chsc",
    name: "迈皋桥社区卫生服务中心",
    city: "南京",
    district: "栖霞区",
    level: "基层",
    category: "社区卫生服务中心",
    networkRole: "基层慢病管理站点",
    hisVendor: "CHSC Connect",
    accent: "#2563eb",
    integrationStatus: "simulated",
    sourceNote: "基于栖霞区社区卫生服务网络演示接入"
  },
  {
    id: "yanziji-chsc",
    name: "燕子矶社区卫生服务中心",
    city: "南京",
    district: "栖霞区",
    level: "基层",
    category: "社区卫生服务中心",
    networkRole: "基层慢病管理站点",
    hisVendor: "CHSC Connect",
    accent: "#0891b2",
    integrationStatus: "simulated",
    sourceNote: "基于栖霞区社区卫生服务网络演示接入"
  },
  {
    id: "yaohua-chsc",
    name: "尧化社区卫生服务中心",
    city: "南京",
    district: "栖霞区",
    level: "基层",
    category: "社区卫生服务中心",
    networkRole: "基层慢病管理站点",
    hisVendor: "CHSC Connect",
    accent: "#7c2d12",
    integrationStatus: "simulated",
    sourceNote: "基于栖霞区社区卫生服务网络演示接入"
  },
  {
    id: "maqun-chsc",
    name: "马群社区卫生服务中心",
    city: "南京",
    district: "栖霞区",
    level: "基层",
    category: "社区卫生服务中心",
    networkRole: "基层慢病管理站点",
    hisVendor: "CHSC Connect",
    accent: "#4338ca",
    integrationStatus: "simulated",
    sourceNote: "基于栖霞区社区卫生服务网络演示接入"
  },
  {
    id: "xianlin-chsc",
    name: "仙林社区卫生服务中心",
    city: "南京",
    district: "栖霞区",
    level: "基层",
    category: "社区卫生服务中心",
    networkRole: "基层慢病管理站点",
    hisVendor: "CHSC Connect",
    accent: "#0f766e",
    integrationStatus: "simulated",
    sourceNote: "基于栖霞区社区卫生服务网络演示接入"
  },
  {
    id: "xigang-chsc",
    name: "西岗社区卫生服务中心",
    city: "南京",
    district: "栖霞区",
    level: "基层",
    category: "社区卫生服务中心",
    networkRole: "基层慢病管理站点",
    hisVendor: "CHSC Connect",
    accent: "#0f766e",
    integrationStatus: "simulated",
    sourceNote: "基于栖霞区社区卫生服务网络演示接入"
  },
  {
    id: "qixia-chsc",
    name: "栖霞社区卫生服务中心",
    city: "南京",
    district: "栖霞区",
    level: "基层",
    category: "社区卫生服务中心",
    networkRole: "基层慢病管理站点",
    hisVendor: "CHSC Connect",
    accent: "#1d4ed8",
    integrationStatus: "simulated",
    sourceNote: "基于栖霞区社区卫生服务网络演示接入"
  },
  {
    id: "longtan-chsc",
    name: "龙潭社区卫生服务中心",
    city: "南京",
    district: "栖霞区",
    level: "基层",
    category: "社区卫生服务中心",
    networkRole: "基层慢病管理站点",
    hisVendor: "CHSC Connect",
    accent: "#b91c1c",
    integrationStatus: "simulated",
    sourceNote: "基于栖霞区社区卫生服务网络演示接入"
  },
  {
    id: "jingan-chsc",
    name: "靖安社区卫生服务中心",
    city: "南京",
    district: "栖霞区",
    level: "基层",
    category: "社区卫生服务中心",
    networkRole: "基层慢病管理站点",
    hisVendor: "CHSC Connect",
    accent: "#a16207",
    integrationStatus: "simulated",
    sourceNote: "基于栖霞区社区卫生服务网络演示接入"
  },
  {
    id: "baguazhou-chsc",
    name: "八卦洲社区卫生服务中心",
    city: "南京",
    district: "栖霞区",
    level: "基层",
    category: "社区卫生服务中心",
    networkRole: "基层慢病管理站点",
    hisVendor: "CHSC Connect",
    accent: "#2563eb",
    integrationStatus: "simulated",
    sourceNote: "基于栖霞区社区卫生服务网络演示接入"
  }
];

export const qixiaHospitalIds = qixiaHospitals.map((hospital) => hospital.id) as HospitalId[];

const qixiaCaseSpecs: QixiaCaseSpec[] = [
  {
    hospitalId: "qixia-hospital",
    patientId: "patient-qx-001",
    mrn: "QX-10001",
    name: "周桂芳",
    gender: "female",
    birthDate: "1963-02-14",
    age: 63,
    conditions: [
      { id: "cond-qx-001-1", code: "I10", name: "高血压", clinicalStatus: "active", severity: "moderate", domain: "cardiovascular" },
      { id: "cond-qx-001-2", code: "E11", name: "2 型糖尿病", clinicalStatus: "active", severity: "moderate", domain: "diabetes" }
    ],
    observations: [
      { id: "obs-qx-001-1", category: "vital-signs", code: "bp-sys", name: "收缩压", value: 156, unit: "mmHg", observedAt: "2026-03-23T08:20:00+08:00", source: "nurse-station", interpretation: "high" },
      { id: "obs-qx-001-2", category: "vital-signs", code: "bp-dia", name: "舒张压", value: 96, unit: "mmHg", observedAt: "2026-03-23T08:20:00+08:00", source: "nurse-station", interpretation: "high" },
      { id: "obs-qx-001-3", category: "vital-signs", code: "bmi", name: "BMI", value: 28.6, unit: "kg/m2", observedAt: "2026-03-23T08:20:00+08:00", source: "nurse-station", interpretation: "high" },
      { id: "obs-qx-001-4", category: "lab", code: "hba1c", name: "糖化血红蛋白", value: 8.4, unit: "%", observedAt: "2026-03-22T07:50:00+08:00", source: "lis", interpretation: "high" },
      { id: "obs-qx-001-5", category: "lab", code: "fpg", name: "空腹血糖", value: 9.1, unit: "mmol/L", observedAt: "2026-03-22T07:50:00+08:00", source: "lis", interpretation: "high" },
      { id: "obs-qx-001-6", category: "wearable", code: "steps", name: "平均日步数", value: 3100, unit: "steps", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable", interpretation: "low" },
      { id: "obs-qx-001-7", category: "wearable", code: "sleep-hours", name: "平均睡眠时长", value: 5.7, unit: "hours", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable", interpretation: "low" }
    ],
    medications: [
      { id: "med-qx-001-1", name: "二甲双胍", dose: "0.5g", frequency: "bid", adherence: "partial" },
      { id: "med-qx-001-2", name: "氨氯地平", dose: "5mg", frequency: "qd", adherence: "good" }
    ],
    encounter: {
      date: "2026-03-23",
      department: "慢病联合门诊",
      reason: "血压与血糖双高复诊",
      clinician: "顾晨",
      encounterType: "outpatient"
    },
    alerts: ["血压未达标", "糖代谢控制不佳", "夜间睡眠不足"]
  },
  {
    hospitalId: "jiangsu-integrated",
    patientId: "patient-qx-002",
    mrn: "QX-10002",
    name: "韩立新",
    gender: "male",
    birthDate: "1959-11-09",
    age: 66,
    conditions: [
      { id: "cond-qx-002-1", code: "I50", name: "慢性心力衰竭", clinicalStatus: "active", severity: "moderate", domain: "cardiovascular" },
      { id: "cond-qx-002-2", code: "G47", name: "失眠障碍", clinicalStatus: "active", severity: "moderate", domain: "sleep" }
    ],
    observations: [
      { id: "obs-qx-002-1", category: "vital-signs", code: "bp-sys", name: "收缩压", value: 148, unit: "mmHg", observedAt: "2026-03-23T08:20:00+08:00", source: "nurse-station", interpretation: "borderline" },
      { id: "obs-qx-002-2", category: "vital-signs", code: "bp-dia", name: "舒张压", value: 88, unit: "mmHg", observedAt: "2026-03-23T08:20:00+08:00", source: "nurse-station", interpretation: "borderline" },
      { id: "obs-qx-002-3", category: "lab", code: "ntprobnp", name: "NT-proBNP", value: 436, unit: "pg/mL", observedAt: "2026-03-22T07:50:00+08:00", source: "lis", interpretation: "high" },
      { id: "obs-qx-002-4", category: "lab", code: "ldl", name: "低密度脂蛋白", value: 2.8, unit: "mmol/L", observedAt: "2026-03-22T07:50:00+08:00", source: "lis", interpretation: "borderline" },
      { id: "obs-qx-002-5", category: "wearable", code: "steps", name: "平均日步数", value: 2400, unit: "steps", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable", interpretation: "low" },
      { id: "obs-qx-002-6", category: "wearable", code: "sleep-hours", name: "平均睡眠时长", value: 5.2, unit: "hours", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable", interpretation: "low" }
    ],
    medications: [
      { id: "med-qx-002-1", name: "沙库巴曲缬沙坦", dose: "50mg", frequency: "bid", adherence: "good" },
      { id: "med-qx-002-2", name: "螺内酯", dose: "20mg", frequency: "qd", adherence: "partial" }
    ],
    encounter: {
      date: "2026-03-22",
      department: "心病科",
      reason: "活动后气促与睡眠差",
      clinician: "钱昊",
      encounterType: "outpatient"
    },
    alerts: ["心衰恶化风险", "活动量不足", "睡眠片段化"]
  },
  {
    hospitalId: "jiangsu-tcm-zidong",
    patientId: "patient-qx-003",
    mrn: "QX-10003",
    name: "钱爱华",
    gender: "female",
    birthDate: "1967-07-28",
    age: 58,
    conditions: [
      { id: "cond-qx-003-1", code: "E11", name: "2 型糖尿病", clinicalStatus: "active", severity: "moderate", domain: "diabetes" },
      { id: "cond-qx-003-2", code: "E66", name: "肥胖", clinicalStatus: "active", severity: "mild", domain: "metabolic" }
    ],
    observations: [
      { id: "obs-qx-003-1", category: "vital-signs", code: "bmi", name: "BMI", value: 30.1, unit: "kg/m2", observedAt: "2026-03-23T09:10:00+08:00", source: "nurse-station", interpretation: "high" },
      { id: "obs-qx-003-2", category: "lab", code: "hba1c", name: "糖化血红蛋白", value: 7.8, unit: "%", observedAt: "2026-03-22T08:40:00+08:00", source: "lis", interpretation: "high" },
      { id: "obs-qx-003-3", category: "lab", code: "fpg", name: "空腹血糖", value: 8.4, unit: "mmol/L", observedAt: "2026-03-22T08:40:00+08:00", source: "lis", interpretation: "high" },
      { id: "obs-qx-003-4", category: "wearable", code: "steps", name: "平均日步数", value: 3600, unit: "steps", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable", interpretation: "low" },
      { id: "obs-qx-003-5", category: "wearable", code: "sleep-hours", name: "平均睡眠时长", value: 6.0, unit: "hours", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable" }
    ],
    medications: [
      { id: "med-qx-003-1", name: "恩格列净", dose: "10mg", frequency: "qd", adherence: "good" },
      { id: "med-qx-003-2", name: "二甲双胍缓释片", dose: "0.5g", frequency: "bid", adherence: "good" }
    ],
    encounter: {
      date: "2026-03-21",
      department: "内分泌科",
      reason: "控糖与体重管理",
      clinician: "胡宁",
      encounterType: "outpatient"
    },
    alerts: ["体重管理需求", "血糖未达标", "运动量不足"]
  },
  {
    hospitalId: "njmu2-maigaoqiao",
    patientId: "patient-qx-004",
    mrn: "QX-10004",
    name: "沈德安",
    gender: "male",
    birthDate: "1956-05-17",
    age: 70,
    conditions: [
      { id: "cond-qx-004-1", code: "I10", name: "高血压", clinicalStatus: "active", severity: "moderate", domain: "cardiovascular" },
      { id: "cond-qx-004-2", code: "N18", name: "慢性肾病", clinicalStatus: "active", severity: "moderate", domain: "renal" }
    ],
    observations: [
      { id: "obs-qx-004-1", category: "vital-signs", code: "bp-sys", name: "收缩压", value: 150, unit: "mmHg", observedAt: "2026-03-23T08:20:00+08:00", source: "nurse-station", interpretation: "high" },
      { id: "obs-qx-004-2", category: "vital-signs", code: "bp-dia", name: "舒张压", value: 92, unit: "mmHg", observedAt: "2026-03-23T08:20:00+08:00", source: "nurse-station", interpretation: "high" },
      { id: "obs-qx-004-3", category: "lab", code: "egfr", name: "eGFR", value: 48, unit: "mL/min/1.73m2", observedAt: "2026-03-22T08:30:00+08:00", source: "lis", interpretation: "low" },
      { id: "obs-qx-004-4", category: "lab", code: "ldl", name: "低密度脂蛋白", value: 2.5, unit: "mmol/L", observedAt: "2026-03-22T08:30:00+08:00", source: "lis", interpretation: "borderline" },
      { id: "obs-qx-004-5", category: "wearable", code: "steps", name: "平均日步数", value: 2600, unit: "steps", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable", interpretation: "low" }
    ],
    medications: [
      { id: "med-qx-004-1", name: "厄贝沙坦", dose: "150mg", frequency: "qd", adherence: "good" },
      { id: "med-qx-004-2", name: "达格列净", dose: "10mg", frequency: "qd", adherence: "partial" }
    ],
    encounter: {
      date: "2026-03-22",
      department: "肾内科",
      reason: "高血压合并肾功能下降随访",
      clinician: "钱昊",
      encounterType: "outpatient"
    },
    alerts: ["肾功能下降", "血压控制欠佳", "日常活动量不足"]
  },
  {
    hospitalId: "taikang-xianlin-gulou",
    patientId: "patient-qx-005",
    mrn: "QX-10005",
    name: "陆美珍",
    gender: "female",
    birthDate: "1951-01-04",
    age: 75,
    conditions: [
      { id: "cond-qx-005-1", code: "G30", name: "阿尔茨海默病早期", clinicalStatus: "active", severity: "moderate", domain: "dementia" },
      { id: "cond-qx-005-2", code: "G47", name: "失眠障碍", clinicalStatus: "active", severity: "moderate", domain: "sleep" }
    ],
    observations: [
      { id: "obs-qx-005-1", category: "cognitive", code: "mmse", name: "MMSE", value: 23, unit: "score", observedAt: "2026-03-22T10:00:00+08:00", source: "memory-clinic", interpretation: "low" },
      { id: "obs-qx-005-2", category: "cognitive", code: "moca", name: "MoCA", value: 19, unit: "score", observedAt: "2026-03-22T10:00:00+08:00", source: "memory-clinic", interpretation: "low" },
      { id: "obs-qx-005-3", category: "wearable", code: "sleep-hours", name: "平均睡眠时长", value: 4.8, unit: "hours", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable", interpretation: "low" },
      { id: "obs-qx-005-4", category: "wearable", code: "steps", name: "平均日步数", value: 2200, unit: "steps", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable", interpretation: "low" }
    ],
    medications: [
      { id: "med-qx-005-1", name: "多奈哌齐", dose: "5mg", frequency: "qn", adherence: "partial" },
      { id: "med-qx-005-2", name: "褪黑素", dose: "3mg", frequency: "qn", adherence: "good" }
    ],
    encounter: {
      date: "2026-03-22",
      department: "记忆门诊",
      reason: "记忆下降与夜间睡眠差",
      clinician: "罗岚",
      encounterType: "outpatient"
    },
    alerts: ["认知下降", "夜间睡眠差", "家庭照护需求增加"]
  },
  {
    hospitalId: "maigaoqiao-chsc",
    patientId: "patient-qx-006",
    mrn: "QX-10006",
    name: "刘阿英",
    gender: "female",
    birthDate: "1962-09-03",
    age: 64,
    conditions: [
      { id: "cond-qx-006-1", code: "I10", name: "高血压", clinicalStatus: "active", severity: "moderate", domain: "cardiovascular" }
    ],
    observations: [
      { id: "obs-qx-006-1", category: "vital-signs", code: "bp-sys", name: "收缩压", value: 150, unit: "mmHg", observedAt: "2026-03-23T08:00:00+08:00", source: "family-doctor", interpretation: "high" },
      { id: "obs-qx-006-2", category: "vital-signs", code: "bp-dia", name: "舒张压", value: 90, unit: "mmHg", observedAt: "2026-03-23T08:00:00+08:00", source: "family-doctor", interpretation: "high" },
      { id: "obs-qx-006-3", category: "wearable", code: "steps", name: "平均日步数", value: 4200, unit: "steps", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable" },
      { id: "obs-qx-006-4", category: "wearable", code: "sleep-hours", name: "平均睡眠时长", value: 6.2, unit: "hours", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable" }
    ],
    medications: [{ id: "med-qx-006-1", name: "缬沙坦", dose: "80mg", frequency: "qd", adherence: "good" }],
    encounter: {
      date: "2026-03-23",
      department: "家庭医生门诊",
      reason: "季度血压随访",
      clinician: "顾晨",
      encounterType: "follow-up"
    },
    alerts: ["家庭血压波动", "需持续家庭随访"]
  },
  {
    hospitalId: "yanziji-chsc",
    patientId: "patient-qx-007",
    mrn: "QX-10007",
    name: "王金保",
    gender: "male",
    birthDate: "1961-04-20",
    age: 65,
    conditions: [
      { id: "cond-qx-007-1", code: "J44", name: "慢阻肺", clinicalStatus: "active", severity: "moderate", domain: "respiratory" },
      { id: "cond-qx-007-2", code: "G47.33", name: "阻塞性睡眠呼吸暂停", clinicalStatus: "active", severity: "moderate", domain: "sleep" }
    ],
    observations: [
      { id: "obs-qx-007-1", category: "vital-signs", code: "spo2", name: "血氧", value: 92, unit: "%", observedAt: "2026-03-23T08:00:00+08:00", source: "family-doctor", interpretation: "low" },
      { id: "obs-qx-007-2", category: "wearable", code: "sleep-hours", name: "平均睡眠时长", value: 5.0, unit: "hours", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable", interpretation: "low" },
      { id: "obs-qx-007-3", category: "wearable", code: "steps", name: "平均日步数", value: 2800, unit: "steps", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable", interpretation: "low" }
    ],
    medications: [{ id: "med-qx-007-1", name: "噻托溴铵", dose: "18mcg", frequency: "qd", adherence: "good" }],
    encounter: {
      date: "2026-03-23",
      department: "全科慢病门诊",
      reason: "夜间憋醒与血氧偏低",
      clinician: "任拓",
      encounterType: "outpatient"
    },
    alerts: ["低氧风险", "睡眠差", "肺康复需求"]
  },
  {
    hospitalId: "yaohua-chsc",
    patientId: "patient-qx-008",
    mrn: "QX-10008",
    name: "陈玉凤",
    gender: "female",
    birthDate: "1965-06-11",
    age: 61,
    conditions: [
      { id: "cond-qx-008-1", code: "E11", name: "2 型糖尿病", clinicalStatus: "active", severity: "moderate", domain: "diabetes" }
    ],
    observations: [
      { id: "obs-qx-008-1", category: "lab", code: "hba1c", name: "糖化血红蛋白", value: 7.9, unit: "%", observedAt: "2026-03-22T09:00:00+08:00", source: "lis", interpretation: "high" },
      { id: "obs-qx-008-2", category: "lab", code: "fpg", name: "空腹血糖", value: 8.2, unit: "mmol/L", observedAt: "2026-03-22T09:00:00+08:00", source: "lis", interpretation: "high" },
      { id: "obs-qx-008-3", category: "wearable", code: "steps", name: "平均日步数", value: 3400, unit: "steps", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable", interpretation: "low" }
    ],
    medications: [{ id: "med-qx-008-1", name: "格列美脲", dose: "2mg", frequency: "qd", adherence: "partial" }],
    encounter: {
      date: "2026-03-22",
      department: "全科慢病门诊",
      reason: "控糖方案调整",
      clinician: "胡宁",
      encounterType: "follow-up"
    },
    alerts: ["血糖未达标", "服药依从性波动"]
  },
  {
    hospitalId: "maqun-chsc",
    patientId: "patient-qx-009",
    mrn: "QX-10009",
    name: "邵志强",
    gender: "male",
    birthDate: "1970-03-16",
    age: 56,
    conditions: [
      { id: "cond-qx-009-1", code: "E66", name: "肥胖", clinicalStatus: "active", severity: "moderate", domain: "metabolic" },
      { id: "cond-qx-009-2", code: "R73", name: "糖调节受损", clinicalStatus: "active", severity: "mild", domain: "diabetes" }
    ],
    observations: [
      { id: "obs-qx-009-1", category: "vital-signs", code: "bmi", name: "BMI", value: 31.4, unit: "kg/m2", observedAt: "2026-03-23T08:40:00+08:00", source: "family-doctor", interpretation: "high" },
      { id: "obs-qx-009-2", category: "lab", code: "fpg", name: "空腹血糖", value: 6.5, unit: "mmol/L", observedAt: "2026-03-22T09:20:00+08:00", source: "lis", interpretation: "borderline" },
      { id: "obs-qx-009-3", category: "wearable", code: "steps", name: "平均日步数", value: 2900, unit: "steps", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable", interpretation: "low" }
    ],
    medications: [{ id: "med-qx-009-1", name: "奥利司他", dose: "120mg", frequency: "tid", adherence: "partial" }],
    encounter: {
      date: "2026-03-23",
      department: "体重管理门诊",
      reason: "肥胖与糖代谢异常干预",
      clinician: "沈凡",
      encounterType: "outpatient"
    },
    alerts: ["体重管理需求显著", "活动量不足"]
  },
  {
    hospitalId: "xianlin-chsc",
    patientId: "patient-qx-010",
    mrn: "QX-10010",
    name: "赵海霞",
    gender: "female",
    birthDate: "1974-10-05",
    age: 52,
    conditions: [
      { id: "cond-qx-010-1", code: "I10", name: "高血压", clinicalStatus: "active", severity: "mild", domain: "cardiovascular" },
      { id: "cond-qx-010-2", code: "G47", name: "失眠障碍", clinicalStatus: "active", severity: "mild", domain: "sleep" }
    ],
    observations: [
      { id: "obs-qx-010-1", category: "vital-signs", code: "bp-sys", name: "收缩压", value: 142, unit: "mmHg", observedAt: "2026-03-23T08:10:00+08:00", source: "family-doctor", interpretation: "borderline" },
      { id: "obs-qx-010-2", category: "vital-signs", code: "bp-dia", name: "舒张压", value: 86, unit: "mmHg", observedAt: "2026-03-23T08:10:00+08:00", source: "family-doctor", interpretation: "borderline" },
      { id: "obs-qx-010-3", category: "wearable", code: "sleep-hours", name: "平均睡眠时长", value: 5.5, unit: "hours", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable", interpretation: "low" }
    ],
    medications: [{ id: "med-qx-010-1", name: "缬沙坦", dose: "80mg", frequency: "qd", adherence: "good" }],
    encounter: {
      date: "2026-03-23",
      department: "家庭医生门诊",
      reason: "血压与睡眠联合管理",
      clinician: "陶舒",
      encounterType: "follow-up"
    },
    alerts: ["睡眠不足", "家庭血压波动"]
  },
  {
    hospitalId: "xigang-chsc",
    patientId: "patient-qx-011",
    mrn: "QX-10011",
    name: "许建平",
    gender: "male",
    birthDate: "1968-12-22",
    age: 57,
    conditions: [
      { id: "cond-qx-011-1", code: "R73", name: "糖调节受损", clinicalStatus: "active", severity: "mild", domain: "diabetes" },
      { id: "cond-qx-011-2", code: "E78.5", name: "血脂异常", clinicalStatus: "active", severity: "mild", domain: "metabolic" }
    ],
    observations: [
      { id: "obs-qx-011-1", category: "lab", code: "fpg", name: "空腹血糖", value: 6.3, unit: "mmol/L", observedAt: "2026-03-22T08:20:00+08:00", source: "lis", interpretation: "borderline" },
      { id: "obs-qx-011-2", category: "lab", code: "ldl", name: "低密度脂蛋白", value: 3.5, unit: "mmol/L", observedAt: "2026-03-22T08:20:00+08:00", source: "lis", interpretation: "high" },
      { id: "obs-qx-011-3", category: "wearable", code: "steps", name: "平均日步数", value: 3900, unit: "steps", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable", interpretation: "low" }
    ],
    medications: [{ id: "med-qx-011-1", name: "阿托伐他汀", dose: "10mg", frequency: "qn", adherence: "partial" }],
    encounter: {
      date: "2026-03-22",
      department: "慢病随访门诊",
      reason: "糖脂代谢异常复查",
      clinician: "胡宁",
      encounterType: "follow-up"
    },
    alerts: ["血脂异常", "糖代谢异常", "运动量偏低"]
  },
  {
    hospitalId: "qixia-chsc",
    patientId: "patient-qx-012",
    mrn: "QX-10012",
    name: "吴秀兰",
    gender: "female",
    birthDate: "1954-08-30",
    age: 72,
    conditions: [
      { id: "cond-qx-012-1", code: "G31.84", name: "轻度认知功能障碍", clinicalStatus: "active", severity: "moderate", domain: "dementia" },
      { id: "cond-qx-012-2", code: "I10", name: "高血压", clinicalStatus: "active", severity: "mild", domain: "cardiovascular" }
    ],
    observations: [
      { id: "obs-qx-012-1", category: "cognitive", code: "mmse", name: "MMSE", value: 25, unit: "score", observedAt: "2026-03-21T10:00:00+08:00", source: "memory-clinic", interpretation: "borderline" },
      { id: "obs-qx-012-2", category: "wearable", code: "sleep-hours", name: "平均睡眠时长", value: 5.4, unit: "hours", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable", interpretation: "low" }
    ],
    medications: [{ id: "med-qx-012-1", name: "尼莫地平", dose: "30mg", frequency: "tid", adherence: "good" }],
    encounter: {
      date: "2026-03-21",
      department: "老年记忆随访门诊",
      reason: "记忆下降筛查复诊",
      clinician: "罗岚",
      encounterType: "outpatient"
    },
    alerts: ["认知风险需持续评估", "睡眠不足"]
  },
  {
    hospitalId: "longtan-chsc",
    patientId: "patient-qx-013",
    mrn: "QX-10013",
    name: "马庆国",
    gender: "male",
    birthDate: "1960-02-02",
    age: 66,
    conditions: [
      { id: "cond-qx-013-1", code: "J44", name: "慢阻肺", clinicalStatus: "active", severity: "moderate", domain: "respiratory" }
    ],
    observations: [
      { id: "obs-qx-013-1", category: "vital-signs", code: "spo2", name: "血氧", value: 93, unit: "%", observedAt: "2026-03-23T08:00:00+08:00", source: "family-doctor", interpretation: "low" },
      { id: "obs-qx-013-2", category: "wearable", code: "steps", name: "平均日步数", value: 2500, unit: "steps", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable", interpretation: "low" }
    ],
    medications: [{ id: "med-qx-013-1", name: "布地奈德福莫特罗", dose: "160/4.5ug", frequency: "bid", adherence: "partial" }],
    encounter: {
      date: "2026-03-23",
      department: "呼吸慢病门诊",
      reason: "劳力后气促",
      clinician: "任拓",
      encounterType: "outpatient"
    },
    alerts: ["呼吸慢病恶化风险", "肺康复依从性不足"]
  },
  {
    hospitalId: "jingan-chsc",
    patientId: "patient-qx-014",
    mrn: "QX-10014",
    name: "郭素珍",
    gender: "female",
    birthDate: "1958-07-18",
    age: 68,
    conditions: [
      { id: "cond-qx-014-1", code: "N18", name: "慢性肾病", clinicalStatus: "active", severity: "moderate", domain: "renal" },
      { id: "cond-qx-014-2", code: "I10", name: "高血压", clinicalStatus: "active", severity: "moderate", domain: "cardiovascular" }
    ],
    observations: [
      { id: "obs-qx-014-1", category: "lab", code: "egfr", name: "eGFR", value: 50, unit: "mL/min/1.73m2", observedAt: "2026-03-22T08:10:00+08:00", source: "lis", interpretation: "low" },
      { id: "obs-qx-014-2", category: "vital-signs", code: "bp-sys", name: "收缩压", value: 146, unit: "mmHg", observedAt: "2026-03-23T08:00:00+08:00", source: "family-doctor", interpretation: "borderline" },
      { id: "obs-qx-014-3", category: "vital-signs", code: "bp-dia", name: "舒张压", value: 88, unit: "mmHg", observedAt: "2026-03-23T08:00:00+08:00", source: "family-doctor", interpretation: "borderline" }
    ],
    medications: [{ id: "med-qx-014-1", name: "厄贝沙坦", dose: "150mg", frequency: "qd", adherence: "good" }],
    encounter: {
      date: "2026-03-22",
      department: "家庭医生门诊",
      reason: "慢性肾病联合随访",
      clinician: "顾晨",
      encounterType: "follow-up"
    },
    alerts: ["肾功能下降", "血压需更严格控制"]
  },
  {
    hospitalId: "baguazhou-chsc",
    patientId: "patient-qx-015",
    mrn: "QX-10015",
    name: "朱长明",
    gender: "male",
    birthDate: "1957-09-25",
    age: 69,
    conditions: [
      { id: "cond-qx-015-1", code: "E11", name: "2 型糖尿病", clinicalStatus: "active", severity: "moderate", domain: "diabetes" },
      { id: "cond-qx-015-2", code: "I10", name: "高血压", clinicalStatus: "active", severity: "moderate", domain: "cardiovascular" }
    ],
    observations: [
      { id: "obs-qx-015-1", category: "lab", code: "hba1c", name: "糖化血红蛋白", value: 7.5, unit: "%", observedAt: "2026-03-22T08:35:00+08:00", source: "lis", interpretation: "high" },
      { id: "obs-qx-015-2", category: "vital-signs", code: "bp-sys", name: "收缩压", value: 144, unit: "mmHg", observedAt: "2026-03-23T08:00:00+08:00", source: "family-doctor", interpretation: "borderline" },
      { id: "obs-qx-015-3", category: "vital-signs", code: "bp-dia", name: "舒张压", value: 86, unit: "mmHg", observedAt: "2026-03-23T08:00:00+08:00", source: "family-doctor", interpretation: "borderline" },
      { id: "obs-qx-015-4", category: "wearable", code: "steps", name: "平均日步数", value: 3500, unit: "steps", observedAt: "2026-03-23T20:10:00+08:00", source: "wearable", interpretation: "low" }
    ],
    medications: [
      { id: "med-qx-015-1", name: "二甲双胍", dose: "0.5g", frequency: "bid", adherence: "good" },
      { id: "med-qx-015-2", name: "氯沙坦", dose: "50mg", frequency: "qd", adherence: "good" }
    ],
    encounter: {
      date: "2026-03-22",
      department: "家庭医生门诊",
      reason: "高血压糖尿病季度复评",
      clinician: "顾晨",
      encounterType: "follow-up"
    },
    alerts: ["控糖尚需加强", "基层双病共管中"]
  }
];

export const qixiaHospitalRecords: HospitalRecord[] = qixiaCaseSpecs.map((spec) => {
  const hospital = qixiaHospitals.find((candidate) => candidate.id === spec.hospitalId);

  if (!hospital) {
    throw new Error(`Unknown Qixia hospital: ${spec.hospitalId}`);
  }

  return {
    hospitalId: spec.hospitalId,
    hospitalName: hospital.name,
    sourceSchema: `${hospital.hisVendor}/virtual-fhir-v1`,
    patient: {
      id: spec.patientId,
      hospitalId: spec.hospitalId,
      mrn: spec.mrn,
      name: spec.name,
      gender: spec.gender,
      birthDate: spec.birthDate,
      age: spec.age
    },
    conditions: spec.conditions,
    observations: spec.observations,
    medications: spec.medications,
    encounters: [
      {
        id: `enc-${spec.patientId}`,
        ...spec.encounter
      }
    ],
    careTeam: [],
    alerts: spec.alerts
  };
});

function createQixiaClinician(
  id: string,
  name: string,
  role: ClinicianRole,
  workbenchRole: WorkbenchRole,
  department: string,
  title: string
): Clinician {
  return {
    id,
    name,
    role,
    workbenchRole,
    department,
    title,
    hospitalIds: qixiaHospitalIds
  };
}

export const qixiaClinicians: Clinician[] = [
  createQixiaClinician("doc-qx-001", "殷悦", "case-manager", "health-manager", "区域慢病管理中心", "高级健康管理师"),
  createQixiaClinician("doc-qx-002", "顾晨", "primary-physician", "general-practitioner", "全科医学科", "主任医师"),
  createQixiaClinician("doc-qx-003", "钱昊", "cardiologist", "specialist-doctor", "心血管内科", "主任医师"),
  createQixiaClinician("doc-qx-004", "胡宁", "endocrinologist", "specialist-doctor", "内分泌科", "副主任医师"),
  createQixiaClinician("doc-qx-005", "罗岚", "neurologist", "specialist-doctor", "神经内科", "主任医师"),
  createQixiaClinician("doc-qx-006", "任拓", "pulmonologist", "specialist-doctor", "呼吸与危重症医学科", "主任医师"),
  createQixiaClinician("doc-qx-007", "沈凡", "dietician", "health-manager", "临床营养科", "营养治疗师"),
  createQixiaClinician("doc-qx-008", "邵川", "exercise-therapist", "health-manager", "康复医学科", "运动治疗师"),
  createQixiaClinician("doc-qx-009", "陶舒", "sleep-coach", "health-manager", "睡眠医学中心", "睡眠管理师")
];
