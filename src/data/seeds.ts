import type { AgentDefinition, Clinician, PatientProfile } from "../types.js";
import { qixiaClinicians } from "./qixia-network.js";

export const seedPatients: PatientProfile[] = [
  {
    id: "patient-zhang-001",
    hospitalId: "xiamen",
    hospitalName: "厦门大学附属慢病管理示范医院",
    mrn: "MRN-10001",
    name: "张淑兰",
    gender: "female",
    age: 62,
    chronicConditions: [
      { code: "I10", name: "高血压", severity: "moderate" },
      { code: "E11", name: "2 型糖尿病", severity: "moderate" },
      { code: "E66", name: "肥胖", severity: "mild" }
    ],
    vitals: {
      systolicBp: 152,
      diastolicBp: 94,
      restingHeartRate: 82,
      bmi: 29.8,
      weightKg: 74
    },
    labs: {
      hba1c: 8.9,
      ldl: 3.4,
      fastingGlucose: 9.6
    },
    lifestyle: {
      averageDailySteps: 2800,
      weeklyExerciseMinutes: 45,
      averageSleepHours: 5.8,
      dietPattern: "主食偏多，晚餐偏晚，外食频率高",
      smokingStatus: "never"
    },
    medications: [
      { name: "二甲双胍", dose: "0.5g bid", adherence: "partial" },
      { name: "缬沙坦", dose: "80mg qd", adherence: "good" }
    ],
    recentEncounters: [
      { date: "2026-03-04", department: "内分泌门诊", reason: "糖化血红蛋白升高" },
      { date: "2026-02-19", department: "健康管理中心", reason: "体重控制随访" }
    ],
    alerts: ["糖化血红蛋白未达标", "夜间睡眠不足", "活动量不足"]
  },
  {
    id: "patient-chen-002",
    hospitalId: "beijing",
    hospitalName: "北京清华长庚智慧医疗中心",
    mrn: "MRN-10002",
    name: "陈建国",
    gender: "male",
    age: 68,
    chronicConditions: [
      { code: "I50", name: "慢性心力衰竭", severity: "severe" },
      { code: "N18", name: "慢性肾病", severity: "moderate" },
      { code: "I10", name: "高血压", severity: "moderate" }
    ],
    vitals: {
      systolicBp: 146,
      diastolicBp: 88,
      restingHeartRate: 92,
      bmi: 26.4,
      weightKg: 69,
      oxygenSaturation: 95
    },
    labs: {
      egfr: 53,
      ntProbnp: 520,
      ldl: 2.1
    },
    lifestyle: {
      averageDailySteps: 1900,
      weeklyExerciseMinutes: 20,
      averageSleepHours: 6.3,
      dietPattern: "偏咸，饮水管理不稳定",
      smokingStatus: "former"
    },
    medications: [
      { name: "沙库巴曲缬沙坦", dose: "50mg bid", adherence: "good" },
      { name: "呋塞米", dose: "20mg qd", adherence: "partial" }
    ],
    recentEncounters: [
      { date: "2026-03-11", department: "心衰门诊", reason: "轻度气促复诊" }
    ],
    alerts: ["心衰再入院风险", "步数过低", "利尿剂依从性波动"]
  },
  {
    id: "patient-li-003",
    hospitalId: "jiangyin",
    hospitalName: "江阴区域健康协同医院",
    mrn: "MRN-10003",
    name: "李敏",
    gender: "female",
    age: 55,
    chronicConditions: [
      { code: "J44", name: "慢阻肺", severity: "moderate" },
      { code: "G47.33", name: "阻塞性睡眠呼吸暂停", severity: "moderate" },
      { code: "R73", name: "糖代谢异常", severity: "mild" }
    ],
    vitals: {
      systolicBp: 134,
      diastolicBp: 84,
      restingHeartRate: 88,
      bmi: 27.9,
      weightKg: 66,
      oxygenSaturation: 93
    },
    labs: {
      fastingGlucose: 6.7,
      ldl: 3.1
    },
    lifestyle: {
      averageDailySteps: 3200,
      weeklyExerciseMinutes: 50,
      averageSleepHours: 5.1,
      dietPattern: "夜宵较多，咖啡摄入偏高",
      smokingStatus: "current"
    },
    medications: [
      { name: "噻托溴铵", dose: "18mcg qd", adherence: "good" }
    ],
    recentEncounters: [
      { date: "2026-03-16", department: "呼吸门诊", reason: "夜间憋醒与咳嗽加重" }
    ],
    alerts: ["疑似低氧风险", "睡眠质量差", "仍在吸烟"]
  }
];

export const seedClinicians: Clinician[] = [
  {
    id: "doc-lin-001",
    name: "林晓岚",
    role: "case-manager",
    workbenchRole: "health-manager",
    department: "健康管理中心",
    title: "慢病管理师",
    hospitalIds: ["xiamen", "jiangyin"]
  },
  {
    id: "doc-wang-002",
    name: "王泽",
    role: "primary-physician",
    workbenchRole: "general-practitioner",
    department: "全科医学科",
    title: "主任医师",
    hospitalIds: ["xiamen", "jiangyin"]
  },
  {
    id: "doc-chen-003",
    name: "陈瑜",
    role: "endocrinologist",
    workbenchRole: "specialist-doctor",
    department: "内分泌科",
    title: "副主任医师",
    hospitalIds: ["xiamen"]
  },
  {
    id: "doc-zhou-003a",
    name: "周宁",
    role: "neurologist",
    workbenchRole: "specialist-doctor",
    department: "神经内科",
    title: "主任医师",
    hospitalIds: ["beijing"]
  },
  {
    id: "doc-li-004",
    name: "李嵩",
    role: "cardiologist",
    workbenchRole: "specialist-doctor",
    department: "心血管内科",
    title: "主任医师",
    hospitalIds: ["beijing", "jiangyin"]
  },
  {
    id: "doc-zhao-005",
    name: "赵航",
    role: "pulmonologist",
    workbenchRole: "specialist-doctor",
    department: "呼吸与危重症医学科",
    title: "主任医师",
    hospitalIds: ["jiangyin"]
  },
  {
    id: "doc-sun-006",
    name: "孙悦",
    role: "dietician",
    workbenchRole: "health-manager",
    department: "临床营养科",
    title: "营养师",
    hospitalIds: ["xiamen", "beijing", "jiangyin"]
  },
  {
    id: "doc-xu-007",
    name: "徐峰",
    role: "exercise-therapist",
    workbenchRole: "health-manager",
    department: "康复医学科",
    title: "运动治疗师",
    hospitalIds: ["xiamen", "jiangyin"]
  },
  {
    id: "doc-he-008",
    name: "何清",
    role: "sleep-coach",
    workbenchRole: "health-manager",
    department: "睡眠医学中心",
    title: "睡眠管理师",
    hospitalIds: ["beijing", "jiangyin"]
  },
  ...qixiaClinicians
];

export const agentRegistry: AgentDefinition[] = [
  {
    id: "agent-his-ingest",
    name: "HIS 接诊代理",
    role: "system",
    namespace: "his",
    subscribesTo: [],
    writes: ["intake-note"]
  },
  {
    id: "agent-triage",
    name: "慢病风险分层代理",
    role: "system",
    namespace: "triage",
    subscribesTo: ["intake-note"],
    writes: ["risk-assessment"]
  },
  {
    id: "agent-mdt-coordinator",
    name: "MDT 协调代理",
    role: "case-manager",
    namespace: "mdt",
    subscribesTo: ["risk-assessment"],
    writes: ["mdt-tasklist", "care-coordination-note", "integrated-care-plan"]
  },
  {
    id: "agent-physician",
    name: "临床医生代理",
    role: "primary-physician",
    namespace: "clinical",
    subscribesTo: ["mdt-tasklist"],
    writes: ["medical-plan"]
  },
  {
    id: "agent-diet",
    name: "营养处方代理",
    role: "dietician",
    namespace: "lifestyle",
    subscribesTo: ["mdt-tasklist"],
    writes: ["diet-prescription"]
  },
  {
    id: "agent-exercise",
    name: "运动处方代理",
    role: "exercise-therapist",
    namespace: "lifestyle",
    subscribesTo: ["mdt-tasklist"],
    writes: ["exercise-prescription"]
  },
  {
    id: "agent-lifestyle",
    name: "生活方式干预代理",
    role: "case-manager",
    namespace: "lifestyle",
    subscribesTo: ["mdt-tasklist"],
    writes: ["lifestyle-prescription"]
  },
  {
    id: "agent-sleep",
    name: "睡眠干预代理",
    role: "sleep-coach",
    namespace: "lifestyle",
    subscribesTo: ["mdt-tasklist"],
    writes: ["sleep-prescription"]
  }
];
