import type { KgConceptNode, KgFollowupQuestion, KgIclExample } from "../types.js";

export interface KgDiagnosisProfile {
  diagnosis: string;
  triggers: string[];
  conceptIds: string[];
  reasoningPath: string[];
  rationale: string;
  questions: KgFollowupQuestion[];
}

export const kgConceptNodes: KgConceptNode[] = [
  { id: "exertional-dyspnea", label: "活动后气促", type: "symptom" },
  { id: "orthopnea", label: "端坐呼吸", type: "symptom" },
  { id: "leg-edema", label: "下肢水肿", type: "symptom" },
  { id: "weight-gain", label: "体重短期增加", type: "risk" },
  { id: "diuretic-adherence", label: "利尿剂依从性", type: "history" },
  { id: "hyperglycemia", label: "高血糖持续", type: "exam" },
  { id: "polyuria", label: "夜尿增多", type: "symptom" },
  { id: "polydipsia", label: "口渴多饮", type: "symptom" },
  { id: "vision-blur", label: "视物模糊", type: "symptom" },
  { id: "foot-numbness", label: "足部麻木", type: "symptom" },
  { id: "diet-adherence", label: "饮食执行度", type: "history" },
  { id: "exercise-adherence", label: "运动执行度", type: "history" },
  { id: "sputum-change", label: "痰量或痰色改变", type: "symptom" },
  { id: "fever", label: "发热", type: "symptom" },
  { id: "wheeze", label: "喘鸣加重", type: "symptom" },
  { id: "smoking-exposure", label: "吸烟暴露", type: "history" },
  { id: "nocturnal-awakening", label: "夜间憋醒", type: "symptom" },
  { id: "daytime-somnolence", label: "白天嗜睡", type: "symptom" },
  { id: "memory-decline", label: "近记忆下降", type: "symptom" },
  { id: "disorientation", label: "定向力下降", type: "symptom" },
  { id: "sleep-fragmentation", label: "睡眠片段化", type: "symptom" },
  { id: "caregiver-burden", label: "照护负担升高", type: "history" },
  { id: "wandering-risk", label: "走失风险", type: "risk" },
  { id: "fall-risk", label: "跌倒风险", type: "risk" }
];

export const kgDiagnosisProfiles: KgDiagnosisProfile[] = [
  {
    diagnosis: "糖尿病控制不佳伴代谢风险升高",
    triggers: ["2 型糖尿病", "糖代谢异常", "糖化血红蛋白未达标", "空腹血糖", "肥胖"],
    conceptIds: [
      "hyperglycemia",
      "polyuria",
      "polydipsia",
      "vision-blur",
      "foot-numbness",
      "diet-adherence",
      "exercise-adherence"
    ],
    reasoningPath: ["主诉或告警", "高血糖持续", "并发症线索", "糖尿病控制不佳伴代谢风险升高"],
    rationale: "先确认高血糖相关症状，再追问并发症表现和生活方式执行度，以判断是否需要升级干预。",
    questions: [
      {
        question: "最近两周是否出现夜尿增多、口渴多饮或体重变化明显？",
        source: "ehr-kg",
        clinicalIntent: "补全高血糖持续暴露的症状证据"
      },
      {
        question: "是否有视物模糊、足部麻木或伤口愈合变慢的情况？",
        source: "ddx-kg",
        clinicalIntent: "筛查糖尿病并发症和神经血管受累信号"
      },
      {
        question: "近一周控糖饮食和运动处方执行到什么程度，是否存在晚间加餐或运动中断？",
        source: "ddx",
        clinicalIntent: "判断行为因素对血糖失控的影响"
      }
    ]
  },
  {
    diagnosis: "慢性心衰失代偿或容量负荷波动",
    triggers: ["慢性心力衰竭", "心衰再入院风险", "利尿剂依从性波动", "轻度气促复诊"],
    conceptIds: [
      "exertional-dyspnea",
      "orthopnea",
      "leg-edema",
      "weight-gain",
      "diuretic-adherence"
    ],
    reasoningPath: ["气促或乏力", "容量负荷评估", "利尿剂依从性", "慢性心衰失代偿或容量负荷波动"],
    rationale: "围绕容量负荷、夜间症状和用药依从性追问，可更快识别心衰是否正在加重。",
    questions: [
      {
        question: "近三天活动后气促是否比平时明显，夜间平卧时会不会憋气或需要垫高枕头？",
        source: "ehr-kg",
        clinicalIntent: "判断心衰夜间症状和端坐呼吸线索"
      },
      {
        question: "近期体重是否在一周内增加 2 公斤以上，或者出现下肢水肿、尿量减少？",
        source: "ddx-kg",
        clinicalIntent: "识别液体潴留和容量负荷升高"
      },
      {
        question: "利尿剂和心衰药物是否有漏服、减量，或者因为不适自行停药？",
        source: "ddx",
        clinicalIntent: "确认心衰恶化是否与药物依从性相关"
      }
    ]
  },
  {
    diagnosis: "慢阻肺急性加重合并睡眠相关低氧风险",
    triggers: ["慢阻肺", "阻塞性睡眠呼吸暂停", "疑似低氧风险", "睡眠质量差", "仍在吸烟"],
    conceptIds: [
      "sputum-change",
      "fever",
      "wheeze",
      "smoking-exposure",
      "nocturnal-awakening",
      "daytime-somnolence"
    ],
    reasoningPath: ["夜间憋醒或咳嗽", "低氧与炎症线索", "吸烟暴露", "慢阻肺急性加重合并睡眠相关低氧风险"],
    rationale: "需要同时区分感染、气道阻塞加重和睡眠呼吸暂停导致的夜间低氧。",
    questions: [
      {
        question: "这次咳嗽是否伴随痰量增多、痰色变黄绿或发热？",
        source: "ehr-kg",
        clinicalIntent: "区分感染诱发的慢阻肺急性加重"
      },
      {
        question: "夜间是否频繁憋醒、打鼾更重，白天是否明显嗜睡或晨起头痛？",
        source: "ddx-kg",
        clinicalIntent: "识别睡眠呼吸暂停和夜间低氧程度"
      },
      {
        question: "最近一月吸烟量有没有变化，是否接触粉尘、冷空气或其他诱发因素？",
        source: "ddx",
        clinicalIntent: "确认可逆诱发因素和暴露史"
      }
    ]
  },
  {
    diagnosis: "阿尔茨海默病进展伴睡眠和照护问题",
    triggers: ["阿尔茨海默病早期", "认知功能下降", "睡眠片段化", "家庭照护负担升高", "失眠障碍"],
    conceptIds: [
      "memory-decline",
      "disorientation",
      "sleep-fragmentation",
      "caregiver-burden",
      "wandering-risk",
      "fall-risk"
    ],
    reasoningPath: ["近记忆下降", "睡眠和行为变化", "照护安全评估", "阿尔茨海默病进展伴睡眠和照护问题"],
    rationale: "需同时判断认知下降速度、夜间行为问题和家庭照护负荷，以决定是否升级 MDT 干预。",
    questions: [
      {
        question: "近一个月是否更容易忘事、重复提问，或者在熟悉环境中出现定向力下降？",
        source: "ehr-kg",
        clinicalIntent: "判断认知下降是否持续进展"
      },
      {
        question: "夜间是否频繁醒来、翻找物品、走动或出现走失倾向？",
        source: "ddx-kg",
        clinicalIntent: "评估夜间行为症状和家庭安全风险"
      },
      {
        question: "目前主要照护者是谁，最近是否觉得照护压力明显上升或患者有跌倒风险？",
        source: "ddx",
        clinicalIntent: "补全照护资源和安全管理信息"
      }
    ]
  }
];

export const kgActiveIclLibrary: KgIclExample[] = [
  {
    title: "非典型上下文补全",
    trigger: "患者表述宽泛、缺乏明确器官定位",
    whyHard: "无法直接映射到高置信 KG 实体，模型容易只重复泛化追问。",
    takeaway: "先补齐时间、场景、严重度和危险信号，再进入疾病导向追问。"
  },
  {
    title: "地域与政策相关追问",
    trigger: "疫苗、筛查或指南依赖地区政策",
    whyHard: "关键问题不一定来自症状，而是来自政策和人群背景。",
    takeaway: "主动补问国家、地区、年龄分层和既往接种史。"
  },
  {
    title: "照护者输入型病例",
    trigger: "记忆障碍、认知下降、儿童或失能老人",
    whyHard: "主诉并非患者本人完整表达，关键信息常隐藏在家属观察中。",
    takeaway: "把照护者负担、行为变化和安全风险纳入固定追问。"
  },
  {
    title: "低结构化呼吸症状",
    trigger: "仅描述气短、胸闷、睡不好等模糊表述",
    whyHard: "可能跨心衰、呼吸、睡眠多个方向，容易问散。",
    takeaway: "优先围绕 DDX 做排除式提问，而不是只扩展表面症状。"
  }
];
