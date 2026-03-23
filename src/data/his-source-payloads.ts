import type { HisMappingPreview, HospitalRecord } from "../types.js";

interface XiamenPayload {
  profile: {
    pat_id: string;
    mrn_no: string;
    full_name: string;
    sex: "F" | "M";
    birth_date: string;
  };
  disease_archive: Array<{
    icd10: string;
    diag_name: string;
    severity: "mild" | "moderate" | "severe";
    domain: HospitalRecord["conditions"][number]["domain"];
  }>;
  bedside_monitor: {
    sbp: number;
    dbp: number;
    bmi: number;
  };
  lab_center: {
    hba1c_pct: number;
    ldl_mmol: number;
    fpg_mmol: number;
  };
  wearable_sync: {
    steps_per_day: number;
    sleep_hour_avg: number;
  };
  med_orders: Array<{
    drug_name: string;
    dose_text: string;
    freq: string;
    adherence: "good" | "partial" | "poor";
  }>;
  alerts: string[];
}

interface BeijingPayload {
  demographics: {
    patientId: string;
    empi: string;
    name: string;
    gender: "female" | "male";
    dob: string;
  };
  problemList: Array<{
    code: string;
    display: string;
    severity: "mild" | "moderate" | "severe";
    domainTag: HospitalRecord["conditions"][number]["domain"];
  }>;
  observations: Array<{
    key: string;
    label: string;
    result: number;
    unit?: string;
    time: string;
    category: HospitalRecord["observations"][number]["category"];
  }>;
  medications: Array<{
    name: string;
    dose: string;
    frequency: string;
    compliance: "good" | "partial" | "poor";
  }>;
  visits: Array<{
    date: string;
    dept: string;
    chiefComplaint: string;
    doctor: string;
  }>;
  warnings: string[];
}

interface JiangyinPayload {
  patient_master: {
    patient_id: string;
    mrn: string;
    patient_name: string;
    gender_code: "1" | "2";
    birthday: string;
  };
  chronic_archive: Array<{
    disease_code: string;
    disease_name: string;
    level: "mild" | "moderate" | "severe";
    domain_tag: HospitalRecord["conditions"][number]["domain"];
  }>;
  device_stream: {
    spo2: number;
    steps: number;
    sleep_hours: number;
  };
  lab_panel: {
    fpg: number;
    ldl: number;
  };
  rx: Array<{
    medication: string;
    spec: string;
    usage: string;
    adherence: "good" | "partial" | "poor";
  }>;
  visit_log: Array<{
    visit_date: string;
    clinic: string;
    reason: string;
    doctor: string;
  }>;
  alert_tags: string[];
}

const xiamenPayload: XiamenPayload = {
  profile: {
    pat_id: "patient-zhang-001",
    mrn_no: "MRN-10001",
    full_name: "张淑兰",
    sex: "F",
    birth_date: "1964-06-08"
  },
  disease_archive: [
    { icd10: "I10", diag_name: "高血压", severity: "moderate", domain: "cardiovascular" },
    { icd10: "E11", diag_name: "2 型糖尿病", severity: "moderate", domain: "diabetes" },
    { icd10: "E66", diag_name: "肥胖", severity: "mild", domain: "metabolic" }
  ],
  bedside_monitor: { sbp: 152, dbp: 94, bmi: 29.8 },
  lab_center: { hba1c_pct: 8.9, ldl_mmol: 3.4, fpg_mmol: 9.6 },
  wearable_sync: { steps_per_day: 2800, sleep_hour_avg: 5.8 },
  med_orders: [
    { drug_name: "二甲双胍", dose_text: "0.5g", freq: "bid", adherence: "partial" },
    { drug_name: "缬沙坦", dose_text: "80mg", freq: "qd", adherence: "good" }
  ],
  alerts: ["糖化血红蛋白未达标", "夜间睡眠不足", "活动量不足"]
};

const beijingPayload: BeijingPayload = {
  demographics: {
    patientId: "patient-chen-002",
    empi: "MRN-10002",
    name: "陈建国",
    gender: "male",
    dob: "1958-01-16"
  },
  problemList: [
    { code: "I50", display: "慢性心力衰竭", severity: "severe", domainTag: "cardiovascular" },
    { code: "N18", display: "慢性肾病", severity: "moderate", domainTag: "renal" },
    { code: "I10", display: "高血压", severity: "moderate", domainTag: "cardiovascular" }
  ],
  observations: [
    { key: "bp-sys", label: "收缩压", result: 146, unit: "mmHg", time: "2026-03-21T08:30:00+08:00", category: "vital-signs" },
    { key: "bp-dia", label: "舒张压", result: 88, unit: "mmHg", time: "2026-03-21T08:30:00+08:00", category: "vital-signs" },
    { key: "ntprobnp", label: "NT-proBNP", result: 520, unit: "pg/mL", time: "2026-03-20T08:00:00+08:00", category: "lab" },
    { key: "egfr", label: "eGFR", result: 53, unit: "mL/min/1.73m2", time: "2026-03-20T08:00:00+08:00", category: "lab" },
    { key: "steps", label: "平均日步数", result: 1900, unit: "steps", time: "2026-03-21T20:00:00+08:00", category: "wearable" }
  ],
  medications: [
    { name: "沙库巴曲缬沙坦", dose: "50mg", frequency: "bid", compliance: "good" },
    { name: "呋塞米", dose: "20mg", frequency: "qd", compliance: "partial" }
  ],
  visits: [
    { date: "2026-03-11", dept: "心衰门诊", chiefComplaint: "轻度气促复诊", doctor: "李嵩" }
  ],
  warnings: ["心衰再入院风险", "步数过低", "利尿剂依从性波动"]
};

const jiangyinPayload: JiangyinPayload = {
  patient_master: {
    patient_id: "patient-li-003",
    mrn: "MRN-10003",
    patient_name: "李敏",
    gender_code: "2",
    birthday: "1971-09-03"
  },
  chronic_archive: [
    { disease_code: "J44", disease_name: "慢阻肺", level: "moderate", domain_tag: "respiratory" },
    { disease_code: "G47.33", disease_name: "阻塞性睡眠呼吸暂停", level: "moderate", domain_tag: "sleep" },
    { disease_code: "R73", disease_name: "糖代谢异常", level: "mild", domain_tag: "diabetes" }
  ],
  device_stream: { spo2: 93, steps: 3200, sleep_hours: 5.1 },
  lab_panel: { fpg: 6.7, ldl: 3.1 },
  rx: [{ medication: "噻托溴铵", spec: "18mcg", usage: "qd", adherence: "good" }],
  visit_log: [{ visit_date: "2026-03-16", clinic: "呼吸门诊", reason: "夜间憋醒与咳嗽加重", doctor: "赵航" }],
  alert_tags: ["疑似低氧风险", "睡眠质量差", "仍在吸烟"]
};

export function buildHisMappingPreviews(): HisMappingPreview[] {
  const xiamenMapped: HospitalRecord = {
    hospitalId: "xiamen",
    hospitalName: "厦门大学附属慢病管理示范医院",
    sourceSchema: "MedSphere/v1",
    patient: {
      id: xiamenPayload.profile.pat_id,
      hospitalId: "xiamen",
      mrn: xiamenPayload.profile.mrn_no,
      name: xiamenPayload.profile.full_name,
      gender: xiamenPayload.profile.sex === "F" ? "female" : "male",
      birthDate: xiamenPayload.profile.birth_date,
      age: 62
    },
    conditions: xiamenPayload.disease_archive.map((item, index) => ({
      id: `xm-cond-${index + 1}`,
      code: item.icd10,
      name: item.diag_name,
      clinicalStatus: "active",
      severity: item.severity,
      domain: item.domain
    })),
    observations: [
      { id: "xm-obs-1", category: "vital-signs", code: "bp-sys", name: "收缩压", value: xiamenPayload.bedside_monitor.sbp, unit: "mmHg", observedAt: "2026-03-21T08:30:00+08:00", source: "bedside_monitor" },
      { id: "xm-obs-2", category: "vital-signs", code: "bp-dia", name: "舒张压", value: xiamenPayload.bedside_monitor.dbp, unit: "mmHg", observedAt: "2026-03-21T08:30:00+08:00", source: "bedside_monitor" },
      { id: "xm-obs-3", category: "vital-signs", code: "bmi", name: "BMI", value: xiamenPayload.bedside_monitor.bmi, unit: "kg/m2", observedAt: "2026-03-21T08:30:00+08:00", source: "bedside_monitor" },
      { id: "xm-obs-4", category: "lab", code: "hba1c", name: "糖化血红蛋白", value: xiamenPayload.lab_center.hba1c_pct, unit: "%", observedAt: "2026-03-20T08:00:00+08:00", source: "lab_center" },
      { id: "xm-obs-5", category: "lab", code: "ldl", name: "低密度脂蛋白", value: xiamenPayload.lab_center.ldl_mmol, unit: "mmol/L", observedAt: "2026-03-20T08:00:00+08:00", source: "lab_center" },
      { id: "xm-obs-6", category: "lab", code: "fpg", name: "空腹血糖", value: xiamenPayload.lab_center.fpg_mmol, unit: "mmol/L", observedAt: "2026-03-20T08:00:00+08:00", source: "lab_center" },
      { id: "xm-obs-7", category: "wearable", code: "steps", name: "平均日步数", value: xiamenPayload.wearable_sync.steps_per_day, unit: "steps", observedAt: "2026-03-21T20:00:00+08:00", source: "wearable_sync" },
      { id: "xm-obs-8", category: "wearable", code: "sleep-hours", name: "平均睡眠时长", value: xiamenPayload.wearable_sync.sleep_hour_avg, unit: "hours", observedAt: "2026-03-21T20:00:00+08:00", source: "wearable_sync" }
    ],
    medications: xiamenPayload.med_orders.map((item, index) => ({
      id: `xm-med-${index + 1}`,
      name: item.drug_name,
      dose: item.dose_text,
      frequency: item.freq,
      adherence: item.adherence
    })),
    encounters: [],
    careTeam: [],
    alerts: xiamenPayload.alerts
  };

  const beijingMapped: HospitalRecord = {
    hospitalId: "beijing",
    hospitalName: "北京清华长庚智慧医疗中心",
    sourceSchema: "SmartEMR/v3",
    patient: {
      id: beijingPayload.demographics.patientId,
      hospitalId: "beijing",
      mrn: beijingPayload.demographics.empi,
      name: beijingPayload.demographics.name,
      gender: beijingPayload.demographics.gender,
      birthDate: beijingPayload.demographics.dob,
      age: 68
    },
    conditions: beijingPayload.problemList.map((item, index) => ({
      id: `bj-cond-${index + 1}`,
      code: item.code,
      name: item.display,
      clinicalStatus: "active",
      severity: item.severity,
      domain: item.domainTag
    })),
    observations: beijingPayload.observations.map((item, index) => ({
      id: `bj-obs-${index + 1}`,
      category: item.category,
      code: item.key,
      name: item.label,
      value: item.result,
      unit: item.unit,
      observedAt: item.time,
      source: "observations"
    })),
    medications: beijingPayload.medications.map((item, index) => ({
      id: `bj-med-${index + 1}`,
      name: item.name,
      dose: item.dose,
      frequency: item.frequency,
      adherence: item.compliance
    })),
    encounters: beijingPayload.visits.map((item, index) => ({
      id: `bj-enc-${index + 1}`,
      date: item.date,
      department: item.dept,
      reason: item.chiefComplaint,
      clinician: item.doctor,
      encounterType: "outpatient"
    })),
    careTeam: [],
    alerts: beijingPayload.warnings
  };

  const jiangyinMapped: HospitalRecord = {
    hospitalId: "jiangyin",
    hospitalName: "江阴区域健康协同医院",
    sourceSchema: "CareBridge/v2",
    patient: {
      id: jiangyinPayload.patient_master.patient_id,
      hospitalId: "jiangyin",
      mrn: jiangyinPayload.patient_master.mrn,
      name: jiangyinPayload.patient_master.patient_name,
      gender: jiangyinPayload.patient_master.gender_code === "2" ? "female" : "male",
      birthDate: jiangyinPayload.patient_master.birthday,
      age: 55
    },
    conditions: jiangyinPayload.chronic_archive.map((item, index) => ({
      id: `jy-cond-${index + 1}`,
      code: item.disease_code,
      name: item.disease_name,
      clinicalStatus: "active",
      severity: item.level,
      domain: item.domain_tag
    })),
    observations: [
      { id: "jy-obs-1", category: "vital-signs", code: "spo2", name: "血氧", value: jiangyinPayload.device_stream.spo2, unit: "%", observedAt: "2026-03-21T08:30:00+08:00", source: "device_stream" },
      { id: "jy-obs-2", category: "wearable", code: "steps", name: "平均日步数", value: jiangyinPayload.device_stream.steps, unit: "steps", observedAt: "2026-03-21T20:00:00+08:00", source: "device_stream" },
      { id: "jy-obs-3", category: "wearable", code: "sleep-hours", name: "平均睡眠时长", value: jiangyinPayload.device_stream.sleep_hours, unit: "hours", observedAt: "2026-03-21T20:00:00+08:00", source: "device_stream" },
      { id: "jy-obs-4", category: "lab", code: "fpg", name: "空腹血糖", value: jiangyinPayload.lab_panel.fpg, unit: "mmol/L", observedAt: "2026-03-20T08:00:00+08:00", source: "lab_panel" },
      { id: "jy-obs-5", category: "lab", code: "ldl", name: "低密度脂蛋白", value: jiangyinPayload.lab_panel.ldl, unit: "mmol/L", observedAt: "2026-03-20T08:00:00+08:00", source: "lab_panel" }
    ],
    medications: jiangyinPayload.rx.map((item, index) => ({
      id: `jy-med-${index + 1}`,
      name: item.medication,
      dose: item.spec,
      frequency: item.usage,
      adherence: item.adherence
    })),
    encounters: jiangyinPayload.visit_log.map((item, index) => ({
      id: `jy-enc-${index + 1}`,
      date: item.visit_date,
      department: item.clinic,
      reason: item.reason,
      clinician: item.doctor,
      encounterType: "outpatient"
    })),
    careTeam: [],
    alerts: jiangyinPayload.alert_tags
  };

  return [
    {
      hospitalId: "xiamen",
      hospitalName: "厦门大学附属慢病管理示范医院",
      sourceSchema: "MedSphere/v1",
      description: "门诊 HIS + 检验中心 + 可穿戴同步的传统院内集成格式",
      fieldMappings: [
        { sourcePath: "profile.pat_id", targetField: "patient.id" },
        { sourcePath: "profile.mrn_no", targetField: "patient.mrn" },
        { sourcePath: "disease_archive[].icd10", targetField: "conditions[].code" },
        { sourcePath: "bedside_monitor.sbp", targetField: "observations[bp-sys].value" },
        { sourcePath: "lab_center.hba1c_pct", targetField: "observations[hba1c].value" },
        { sourcePath: "wearable_sync.steps_per_day", targetField: "observations[steps].value" }
      ],
      sampleSource: xiamenPayload,
      sampleMapped: xiamenMapped
    },
    {
      hospitalId: "beijing",
      hospitalName: "北京清华长庚智慧医疗中心",
      sourceSchema: "SmartEMR/v3",
      description: "接近 FHIR 风格的问题列表与观察结果结构",
      fieldMappings: [
        { sourcePath: "demographics.patientId", targetField: "patient.id" },
        { sourcePath: "demographics.empi", targetField: "patient.mrn" },
        { sourcePath: "problemList[].code", targetField: "conditions[].code" },
        { sourcePath: "observations[].key", targetField: "observations[].code" },
        { sourcePath: "visits[].dept", targetField: "encounters[].department" },
        { sourcePath: "medications[].compliance", targetField: "medications[].adherence" }
      ],
      sampleSource: beijingPayload,
      sampleMapped: beijingMapped
    },
    {
      hospitalId: "jiangyin",
      hospitalName: "江阴区域健康协同医院",
      sourceSchema: "CareBridge/v2",
      description: "区域健康平台与设备流数据合并后的慢病档案格式",
      fieldMappings: [
        { sourcePath: "patient_master.patient_id", targetField: "patient.id" },
        { sourcePath: "chronic_archive[].disease_code", targetField: "conditions[].code" },
        { sourcePath: "device_stream.spo2", targetField: "observations[spo2].value" },
        { sourcePath: "lab_panel.fpg", targetField: "observations[fpg].value" },
        { sourcePath: "rx[].medication", targetField: "medications[].name" },
        { sourcePath: "visit_log[].clinic", targetField: "encounters[].department" }
      ],
      sampleSource: jiangyinPayload,
      sampleMapped: jiangyinMapped
    }
  ];
}
