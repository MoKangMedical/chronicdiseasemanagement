import type { HospitalRecord } from "../types.js";

export const seedHospitalRecords: HospitalRecord[] = [
  {
    hospitalId: "xiamen",
    hospitalName: "厦门大学附属慢病管理示范医院",
    sourceSchema: "MedSphere/v1",
    patient: {
      id: "patient-zhang-001",
      hospitalId: "xiamen",
      mrn: "MRN-10001",
      name: "张淑兰",
      gender: "female",
      birthDate: "1964-06-08",
      age: 62
    },
    conditions: [
      { id: "cond-zh-1", code: "I10", name: "高血压", clinicalStatus: "active", severity: "moderate", domain: "cardiovascular" },
      { id: "cond-zh-2", code: "E11", name: "2 型糖尿病", clinicalStatus: "active", severity: "moderate", domain: "diabetes" },
      { id: "cond-zh-3", code: "E66", name: "肥胖", clinicalStatus: "active", severity: "mild", domain: "metabolic" }
    ],
    observations: [
      { id: "obs-zh-1", category: "vital-signs", code: "bp-sys", name: "收缩压", value: 152, unit: "mmHg", observedAt: "2026-03-21T08:30:00+08:00", source: "nurse-station", interpretation: "high" },
      { id: "obs-zh-2", category: "vital-signs", code: "bp-dia", name: "舒张压", value: 94, unit: "mmHg", observedAt: "2026-03-21T08:30:00+08:00", source: "nurse-station", interpretation: "high" },
      { id: "obs-zh-3", category: "vital-signs", code: "bmi", name: "BMI", value: 29.8, unit: "kg/m2", observedAt: "2026-03-21T08:30:00+08:00", source: "nurse-station", interpretation: "high" },
      { id: "obs-zh-4", category: "lab", code: "hba1c", name: "糖化血红蛋白", value: 8.9, unit: "%", observedAt: "2026-03-20T08:00:00+08:00", source: "lis", interpretation: "high" },
      { id: "obs-zh-5", category: "lab", code: "ldl", name: "低密度脂蛋白", value: 3.4, unit: "mmol/L", observedAt: "2026-03-20T08:00:00+08:00", source: "lis", interpretation: "high" },
      { id: "obs-zh-6", category: "lab", code: "fpg", name: "空腹血糖", value: 9.6, unit: "mmol/L", observedAt: "2026-03-20T08:00:00+08:00", source: "lis", interpretation: "high" },
      { id: "obs-zh-7", category: "wearable", code: "steps", name: "平均日步数", value: 2800, unit: "steps", observedAt: "2026-03-21T20:00:00+08:00", source: "wearable", interpretation: "low" },
      { id: "obs-zh-8", category: "wearable", code: "sleep-hours", name: "平均睡眠时长", value: 5.8, unit: "hours", observedAt: "2026-03-21T20:00:00+08:00", source: "wearable", interpretation: "low" }
    ],
    medications: [
      { id: "med-zh-1", name: "二甲双胍", dose: "0.5g", frequency: "bid", adherence: "partial" },
      { id: "med-zh-2", name: "缬沙坦", dose: "80mg", frequency: "qd", adherence: "good" }
    ],
    encounters: [
      { id: "enc-zh-1", date: "2026-03-04", department: "内分泌门诊", reason: "糖化血红蛋白升高", clinician: "陈瑜", encounterType: "outpatient" },
      { id: "enc-zh-2", date: "2026-02-19", department: "健康管理中心", reason: "体重控制随访", clinician: "林晓岚", encounterType: "follow-up" }
    ],
    careTeam: [],
    alerts: ["糖化血红蛋白未达标", "夜间睡眠不足", "活动量不足"]
  },
  {
    hospitalId: "beijing",
    hospitalName: "北京清华长庚智慧医疗中心",
    sourceSchema: "SmartEMR/v3",
    patient: {
      id: "patient-chen-002",
      hospitalId: "beijing",
      mrn: "MRN-10002",
      name: "陈建国",
      gender: "male",
      birthDate: "1958-01-16",
      age: 68
    },
    conditions: [
      { id: "cond-ch-1", code: "I50", name: "慢性心力衰竭", clinicalStatus: "active", severity: "severe", domain: "cardiovascular" },
      { id: "cond-ch-2", code: "N18", name: "慢性肾病", clinicalStatus: "active", severity: "moderate", domain: "renal" },
      { id: "cond-ch-3", code: "I10", name: "高血压", clinicalStatus: "active", severity: "moderate", domain: "cardiovascular" }
    ],
    observations: [
      { id: "obs-ch-1", category: "vital-signs", code: "bp-sys", name: "收缩压", value: 146, unit: "mmHg", observedAt: "2026-03-21T08:30:00+08:00", source: "nurse-station", interpretation: "borderline" },
      { id: "obs-ch-2", category: "vital-signs", code: "bp-dia", name: "舒张压", value: 88, unit: "mmHg", observedAt: "2026-03-21T08:30:00+08:00", source: "nurse-station", interpretation: "borderline" },
      { id: "obs-ch-3", category: "lab", code: "ntprobnp", name: "NT-proBNP", value: 520, unit: "pg/mL", observedAt: "2026-03-20T08:00:00+08:00", source: "lis", interpretation: "high" },
      { id: "obs-ch-4", category: "lab", code: "egfr", name: "eGFR", value: 53, unit: "mL/min/1.73m2", observedAt: "2026-03-20T08:00:00+08:00", source: "lis", interpretation: "low" },
      { id: "obs-ch-5", category: "wearable", code: "steps", name: "平均日步数", value: 1900, unit: "steps", observedAt: "2026-03-21T20:00:00+08:00", source: "wearable", interpretation: "low" },
      { id: "obs-ch-6", category: "wearable", code: "sleep-hours", name: "平均睡眠时长", value: 6.3, unit: "hours", observedAt: "2026-03-21T20:00:00+08:00", source: "wearable" },
      { id: "obs-ch-7", category: "vital-signs", code: "spo2", name: "血氧", value: 95, unit: "%", observedAt: "2026-03-21T08:30:00+08:00", source: "nurse-station" }
    ],
    medications: [
      { id: "med-ch-1", name: "沙库巴曲缬沙坦", dose: "50mg", frequency: "bid", adherence: "good" },
      { id: "med-ch-2", name: "呋塞米", dose: "20mg", frequency: "qd", adherence: "partial" }
    ],
    encounters: [
      { id: "enc-ch-1", date: "2026-03-11", department: "心衰门诊", reason: "轻度气促复诊", clinician: "李嵩", encounterType: "outpatient" }
    ],
    careTeam: [],
    alerts: ["心衰再入院风险", "步数过低", "利尿剂依从性波动"]
  },
  {
    hospitalId: "jiangyin",
    hospitalName: "江阴区域健康协同医院",
    sourceSchema: "CareBridge/v2",
    patient: {
      id: "patient-li-003",
      hospitalId: "jiangyin",
      mrn: "MRN-10003",
      name: "李敏",
      gender: "female",
      birthDate: "1971-09-03",
      age: 55
    },
    conditions: [
      { id: "cond-li-1", code: "J44", name: "慢阻肺", clinicalStatus: "active", severity: "moderate", domain: "respiratory" },
      { id: "cond-li-2", code: "G47.33", name: "阻塞性睡眠呼吸暂停", clinicalStatus: "active", severity: "moderate", domain: "sleep" },
      { id: "cond-li-3", code: "R73", name: "糖代谢异常", clinicalStatus: "active", severity: "mild", domain: "diabetes" }
    ],
    observations: [
      { id: "obs-li-1", category: "vital-signs", code: "spo2", name: "血氧", value: 93, unit: "%", observedAt: "2026-03-21T08:30:00+08:00", source: "nurse-station", interpretation: "low" },
      { id: "obs-li-2", category: "wearable", code: "sleep-hours", name: "平均睡眠时长", value: 5.1, unit: "hours", observedAt: "2026-03-21T20:00:00+08:00", source: "wearable", interpretation: "low" },
      { id: "obs-li-3", category: "wearable", code: "steps", name: "平均日步数", value: 3200, unit: "steps", observedAt: "2026-03-21T20:00:00+08:00", source: "wearable" },
      { id: "obs-li-4", category: "lab", code: "fpg", name: "空腹血糖", value: 6.7, unit: "mmol/L", observedAt: "2026-03-20T08:00:00+08:00", source: "lis", interpretation: "borderline" },
      { id: "obs-li-5", category: "lab", code: "ldl", name: "低密度脂蛋白", value: 3.1, unit: "mmol/L", observedAt: "2026-03-20T08:00:00+08:00", source: "lis", interpretation: "high" }
    ],
    medications: [
      { id: "med-li-1", name: "噻托溴铵", dose: "18mcg", frequency: "qd", adherence: "good" }
    ],
    encounters: [
      { id: "enc-li-1", date: "2026-03-16", department: "呼吸门诊", reason: "夜间憋醒与咳嗽加重", clinician: "赵航", encounterType: "outpatient" }
    ],
    careTeam: [],
    alerts: ["疑似低氧风险", "睡眠质量差", "仍在吸烟"]
  },
  {
    hospitalId: "beijing",
    hospitalName: "北京清华长庚智慧医疗中心",
    sourceSchema: "SmartEMR/v3",
    patient: {
      id: "patient-wu-004",
      hospitalId: "beijing",
      mrn: "MRN-10004",
      name: "吴美芳",
      gender: "female",
      birthDate: "1952-04-12",
      age: 74
    },
    conditions: [
      { id: "cond-wu-1", code: "G30", name: "阿尔茨海默病早期", clinicalStatus: "active", severity: "moderate", domain: "dementia" },
      { id: "cond-wu-2", code: "I10", name: "高血压", clinicalStatus: "active", severity: "mild", domain: "cardiovascular" },
      { id: "cond-wu-3", code: "G47", name: "失眠障碍", clinicalStatus: "active", severity: "moderate", domain: "sleep" }
    ],
    observations: [
      { id: "obs-wu-1", category: "cognitive", code: "mmse", name: "MMSE", value: 22, unit: "score", observedAt: "2026-03-19T10:00:00+08:00", source: "memory-clinic", interpretation: "low" },
      { id: "obs-wu-2", category: "cognitive", code: "moca", name: "MoCA", value: 18, unit: "score", observedAt: "2026-03-19T10:00:00+08:00", source: "memory-clinic", interpretation: "low" },
      { id: "obs-wu-3", category: "wearable", code: "sleep-hours", name: "平均睡眠时长", value: 4.9, unit: "hours", observedAt: "2026-03-21T20:00:00+08:00", source: "wearable", interpretation: "low" },
      { id: "obs-wu-4", category: "wearable", code: "steps", name: "平均日步数", value: 2400, unit: "steps", observedAt: "2026-03-21T20:00:00+08:00", source: "wearable", interpretation: "low" },
      { id: "obs-wu-5", category: "vital-signs", code: "bp-sys", name: "收缩压", value: 148, unit: "mmHg", observedAt: "2026-03-21T08:30:00+08:00", source: "nurse-station", interpretation: "borderline" },
      { id: "obs-wu-6", category: "vital-signs", code: "bp-dia", name: "舒张压", value: 86, unit: "mmHg", observedAt: "2026-03-21T08:30:00+08:00", source: "nurse-station", interpretation: "borderline" }
    ],
    medications: [
      { id: "med-wu-1", name: "多奈哌齐", dose: "5mg", frequency: "qn", adherence: "partial" },
      { id: "med-wu-2", name: "氨氯地平", dose: "5mg", frequency: "qd", adherence: "good" }
    ],
    encounters: [
      { id: "enc-wu-1", date: "2026-03-19", department: "记忆门诊", reason: "近记忆减退与夜间睡眠差", clinician: "周宁", encounterType: "outpatient" }
    ],
    careTeam: [],
    alerts: ["认知功能下降", "睡眠片段化", "家庭照护负担升高"]
  }
];
