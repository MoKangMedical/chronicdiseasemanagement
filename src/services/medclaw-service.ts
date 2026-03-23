import { HISSimulator } from "../adapters/his-simulator.js";
import { AuditStore } from "../core/audit-store.js";
import { seedImagingReports } from "../data/imaging-reports.js";
import { kgActiveIclLibrary, kgConceptNodes, kgDiagnosisProfiles } from "../data/kg-followup.js";
import type {
  AuditEvent,
  ClinicalPrediction,
  DataPipelineOutput,
  DiagnosticSuggestion,
  ImagingComparisonFinding,
  ImagingComparisonResult,
  ImagingReportEntry,
  KGFollowupResult,
  KgFollowupQuestion,
  KgIclExample,
  KgReasoningPath,
  MedicalRecordDraft,
  MedClawPatientWorkspace,
  PermissionBoundary,
  ReadOnlyGuardrail,
  WorkbenchRole
} from "../types.js";

export class MedClawService {
  private readonly his = new HISSimulator();
  private readonly audit = new AuditStore();
  private readonly reports = seedImagingReports;

  reset(): void {
    this.audit.reset();
  }

  getPlatformOverview() {
    return {
      name: "MedClaw",
      tagline: "全球首款面向医院级应用的 OpenClaw 医疗智能平台",
      principles: this.guardrails(),
      modules: [
        "影像报告智能解析与时序对比",
        "AI 病历全自动生成",
        "智能辅助诊断与病情预测",
        "医疗数据全链路处理",
        "只读审计与权限边界"
      ]
    };
  }

  getPatientWorkspace(patientId: string, role: WorkbenchRole = "health-manager"): MedClawPatientWorkspace {
    const patient = this.his.getPatient(patientId);
    const comparison = this.compareImaging(patientId);
    const workspace: MedClawPatientWorkspace = {
      overview: {
        name: patient.name,
        hospitalName: patient.hospitalName,
        mission: "让 AI 真正服务临床，让医生回归诊疗本身"
      },
      guardrails: this.guardrails(),
      permissionBoundary: this.permissionBoundary(role),
      imaging: {
        reports: this.getImagingReports(patientId),
        comparison
      },
      recordDraft: this.generateMedicalRecordDraft(patientId),
      diagnosisSupport: {
        suggestions: this.buildDiagnosticSuggestions(patientId),
        predictions: this.buildPredictions(patientId)
      },
      kgFollowup: this.generateKgFollowup(patientId),
      dataPipeline: this.buildDataPipelineOutput(patientId),
      auditTrail: this.audit.list(patientId)
    };

    return workspace;
  }

  getImagingReports(patientId: string): ImagingReportEntry[] {
    const reports = this.reports
      .filter((report) => report.patientId === patientId)
      .sort((left, right) => left.studyDate.localeCompare(right.studyDate));

    this.audit.append({
      patientId,
      category: "image-parse",
      actor: "medclaw-image-parser",
      detail: `读取并结构化 ${reports.length} 份影像报告`
    });

    return reports;
  }

  compareImaging(patientId: string): ImagingComparisonResult | null {
    const reports = this.reports
      .filter((report) => report.patientId === patientId)
      .sort((left, right) => left.studyDate.localeCompare(right.studyDate));

    if (reports.length < 2) {
      return null;
    }

    const previous = reports[reports.length - 2];
    const current = reports[reports.length - 1];
    const previousByLesionId = new Map(previous.lesions.map((lesion) => [lesion.id, lesion]));
    const findings: ImagingComparisonFinding[] = current.lesions.map((lesion) => {
      const prev = previousByLesionId.get(lesion.id) ?? null;
      let trend: ImagingComparisonFinding["trend"] = "new";

      if (prev) {
        const delta = lesion.sizeMm - prev.sizeMm;
        if (Math.abs(delta) <= 1) trend = "stable";
        else if (delta > 0) trend = "larger";
        else trend = "smaller";
      }

      return {
        lesionId: lesion.id,
        site: lesion.site,
        previousSizeMm: prev?.sizeMm ?? null,
        currentSizeMm: lesion.sizeMm,
        trend,
        summary: this.summarizeTrend(lesion.site, prev?.sizeMm ?? null, lesion.sizeMm, trend)
      };
    });

    const result: ImagingComparisonResult = {
      patientId,
      modality: current.modality,
      currentStudyDate: current.studyDate,
      previousStudyDate: previous.studyDate,
      findings,
      narrativeConclusion: findings.map((finding) => finding.summary).join("；")
    };

    this.audit.append({
      patientId,
      category: "timeline-compare",
      actor: "medclaw-timeline-engine",
      detail: `完成 ${current.modality} 时序对比，输出 ${findings.length} 条病灶演变结论`
    });

    return result;
  }

  generateMedicalRecordDraft(
    patientId: string,
    encounterType: MedicalRecordDraft["encounterType"] = "outpatient"
  ): MedicalRecordDraft {
    const patient = this.his.getPatient(patientId);
    const latestEncounter = patient.recentEncounters[0];
    const draft: MedicalRecordDraft = {
      patientId,
      encounterType,
      chiefComplaint: latestEncounter?.reason ?? `${patient.chronicConditions[0]?.name ?? "慢病"}随访`,
      presentIllness: `${patient.name} 因 ${patient.alerts.join("、")} 来诊。既往有 ${patient.chronicConditions
        .map((condition) => condition.name)
        .join("、")} 病史，近期家庭监测提示血压/睡眠/活动量仍需干预。`,
      physicalExam: `神志清，生命体征平稳。血压 ${patient.vitals.systolicBp}/${patient.vitals.diastolicBp} mmHg，BMI ${patient.vitals.bmi}。`,
      auxiliaryExams: this.buildAuxiliaryExamSummary(patientId),
      assessment: `当前属于以 ${patient.chronicConditions.map((condition) => condition.name).join("、")} 为主的慢病管理阶段，需继续进行分层干预与动态随访。`,
      diagnosis: patient.chronicConditions.map((condition) => `${condition.code} ${condition.name}`),
      plan: [
        "继续执行智能生成的行为干预疗法包",
        "保留 MDT 协作路径并按需发起会诊",
        "关键指标异常时优先回顾影像、检验与随访记录"
      ]
    };

    this.audit.append({
      patientId,
      category: "record-generate",
      actor: "medclaw-record-engine",
      detail: `生成 ${encounterType} 病历草案`
    });

    return draft;
  }

  buildDiagnosticSuggestions(patientId: string): DiagnosticSuggestion[] {
    const patient = this.his.getPatient(patientId);
    const suggestions: DiagnosticSuggestion[] = [];

    if (patient.chronicConditions.some((condition) => condition.code === "E11")) {
      suggestions.push({
        diagnosis: "糖尿病控制不佳伴代谢风险升高",
        rationale: [
          `HbA1c ${patient.labs.hba1c ?? "未提供"}%`,
          `空腹血糖 ${patient.labs.fastingGlucose ?? "未提供"} mmol/L`,
          `BMI ${patient.vitals.bmi}`
        ],
        confidence: 0.9
      });
    }

    if (patient.chronicConditions.some((condition) => condition.code === "I50")) {
      suggestions.push({
        diagnosis: "慢性心衰再入院高风险状态",
        rationale: [
          `NT-proBNP ${patient.labs.ntProbnp ?? "未提供"}`,
          "近期活动耐量低",
          "药物依从性波动"
        ],
        confidence: 0.87
      });
    }

    if (patient.chronicConditions.some((condition) => condition.code === "G30")) {
      suggestions.push({
        diagnosis: "认知障碍进展期，需联合睡眠与照护干预",
        rationale: [
          "MMSE / MoCA 下降",
          "海马区萎缩时序进展",
          "家属照护负担上升"
        ],
        confidence: 0.92
      });
    }

    if (patient.chronicConditions.some((condition) => condition.code === "J44")) {
      suggestions.push({
        diagnosis: "慢阻肺合并影像炎症活动风险",
        rationale: [
          `SpO2 ${patient.vitals.oxygenSaturation ?? "未提供"}%`,
          "胸部影像病灶较前增大",
          "存在吸烟暴露"
        ],
        confidence: 0.81
      });
    }

    this.audit.append({
      patientId,
      category: "diagnosis-assist",
      actor: "medclaw-dx-engine",
      detail: `输出 ${suggestions.length} 条辅助诊断建议`
    });

    return suggestions;
  }

  buildPredictions(patientId: string): ClinicalPrediction[] {
    const patient = this.his.getPatient(patientId);
    const predictions: ClinicalPrediction[] = [
      {
        metric: "disease-risk",
        value: patient.alerts.length >= 3 ? "高" : "中",
        explanation: "基于慢病数量、关键指标异常、依从性和影像时序趋势综合评估"
      },
      {
        metric: "length-of-stay",
        value: patient.chronicConditions.length >= 3 ? "5-7 天（若入院）" : "3-5 天（若入院）",
        explanation: "基于合并症数量和专科协同需求估算"
      },
      {
        metric: "prognosis",
        value: patient.lifestyle.averageDailySteps < 3000 ? "需强化干预后再评估" : "短期稳定",
        explanation: "主要受生活方式执行度和随访完成率影响"
      }
    ];

    return predictions;
  }

  buildDataPipelineOutput(patientId: string): DataPipelineOutput {
    const patient = this.his.getPatient(patientId);
    const output: DataPipelineOutput = {
      patientId,
      parsedSources: ["HIS", "LIS", "Vitals Platform", "Wearable", "Imaging Reports"],
      normalizedFields: [
        "patient.demographics",
        "condition.icd10",
        "observation.timeline",
        "medication.adherence",
        "imaging.lesion.features"
      ],
      deidentifiedPreview: {
        patientName: `${patient.name[0]}**`,
        mrn: `${patient.mrn.slice(0, 3)}****`,
        hospitalName: `${patient.hospitalName.slice(0, 2)}***`
      },
      codingMappings: patient.chronicConditions.map((condition) => ({
        source: condition.name,
        code: condition.code,
        system: "ICD-10"
      })),
      researchSnapshot: {
        age: patient.age,
        conditions: patient.chronicConditions.length,
        averageDailySteps: patient.lifestyle.averageDailySteps,
        averageSleepHours: patient.lifestyle.averageSleepHours
      }
    };

    this.audit.append({
      patientId,
      category: "data-pipeline",
      actor: "medclaw-data-engine",
      detail: "完成多源数据解析、脱敏与编码归一化"
    });

    return output;
  }

  permissionBoundary(role: WorkbenchRole): PermissionBoundary {
    const policy: Record<WorkbenchRole, PermissionBoundary> = {
      "specialist-doctor": {
        role,
        scopes: ["read:patient-record", "read:imaging", "read:diagnosis-support", "read:mdt"],
        restrictions: ["no-write:emr", "no-write:raw-imaging", "audit-required"]
      },
      "general-practitioner": {
        role,
        scopes: ["read:patient-record", "read:care-plan", "read:diagnosis-support", "read:mdt"],
        restrictions: ["no-write:raw-emr", "no-write:orders", "audit-required"]
      },
      "health-manager": {
        role,
        scopes: ["read:care-plan", "read:lifestyle-package", "read:followup", "read:mdt-summary"],
        restrictions: ["no-read:sensitive-imaging-raw", "no-write:diagnosis", "audit-required"]
      }
    };

    this.audit.append({
      patientId: null,
      category: "policy-check",
      actor: "medclaw-policy-engine",
      detail: `加载 ${role} 权限边界`
    });

    return policy[role];
  }

  listAuditEvents(patientId?: string): AuditEvent[] {
    return this.audit.list(patientId);
  }

  generateKgFollowup(patientId: string): KGFollowupResult {
    const patient = this.his.getPatient(patientId);
    const comparison = this.compareImaging(patientId);
    const extractedEntities = Array.from(
      new Set(
        [
          ...patient.chronicConditions.map((condition) => condition.name),
          ...patient.alerts,
          ...patient.recentEncounters.map((encounter) => encounter.reason),
          comparison?.narrativeConclusion ?? ""
        ].filter(Boolean)
      )
    );

    const preliminaryQuestions = this.buildPreliminaryQuestions(patientId);
    const matchedProfiles = kgDiagnosisProfiles.filter((profile) =>
      profile.triggers.some((trigger) => extractedEntities.some((entity) => entity.includes(trigger)))
    );

    const ehrKgQuestions = matchedProfiles
      .flatMap((profile) => profile.questions)
      .filter((question) => question.source === "ehr-kg");
    const ddxQuestions = matchedProfiles
      .flatMap((profile) => profile.questions)
      .filter((question) => question.source === "ddx");
    const ddxKgQuestions = matchedProfiles
      .flatMap((profile) => profile.questions)
      .filter((question) => question.source === "ddx-kg");

    const fallbackDiagnoses =
      matchedProfiles.length > 0
        ? []
        : patient.chronicConditions.slice(0, 2).map((condition) => `${condition.name} 相关风险待进一步排查`);
    const candidateDiagnoses = matchedProfiles.length
      ? matchedProfiles.map((profile) => profile.diagnosis)
      : fallbackDiagnoses;

    const ehrConcepts = Array.from(
      new Set(
        matchedProfiles
          .flatMap((profile) => profile.conceptIds)
          .map((conceptId) => kgConceptNodes.find((node) => node.id === conceptId)?.label)
          .filter((label): label is string => Boolean(label))
      )
    );

    const reasoningPaths: KgReasoningPath[] = matchedProfiles.map((profile) => ({
      diagnosis: profile.diagnosis,
      path: profile.reasoningPath,
      rationale: profile.rationale
    }));

    const activeIclExamples = this.selectActiveIclExamples(patientId, extractedEntities, matchedProfiles.length);
    const allQuestions = [
      ...preliminaryQuestions,
      ...ehrKgQuestions,
      ...ddxQuestions,
      ...ddxKgQuestions
    ];
    const consolidation = this.buildConsolidationSummary(allQuestions);
    const questions = this.refineQuestions(allQuestions);

    const result: KGFollowupResult = {
      patientId,
      extractedEntities,
      candidateDiagnoses,
      ehrConcepts,
      reasoningPaths,
      moduleBreakdown: {
        preliminary: preliminaryQuestions.length,
        "ehr-kg": ehrKgQuestions.length,
        ddx: ddxQuestions.length,
        "ddx-kg": ddxKgQuestions.length
      },
      activeIclExamples,
      consolidation,
      questions
    };

    this.audit.append({
      patientId,
      category: "followup-generate",
      actor: "medclaw-kg-followup",
      detail: `生成 ${questions.length} 条 KG-Followup 追问，包含 DDX 推理、hard-case ICL 与问题整合`
    });

    return result;
  }

  private guardrails(): ReadOnlyGuardrail[] {
    return [
      {
        title: "只读不写",
        description: "不改动原始病历、检验或影像数据，仅生成衍生分析结果。"
      },
      {
        title: "可审计",
        description: "每次影像解析、病历生成、辅助诊断与数据处理均留痕。"
      },
      {
        title: "科室级权限隔离",
        description: "按医生、医技、质控、管理角色提供不同读权限边界。"
      },
      {
        title: "院内部署优先",
        description: "设计面向私有化和医院合规部署，不依赖外部写入链路。"
      }
    ];
  }

  private summarizeTrend(
    site: string,
    previousSizeMm: number | null,
    currentSizeMm: number,
    trend: ImagingComparisonFinding["trend"]
  ): string {
    const verbs: Record<ImagingComparisonFinding["trend"], string> = {
      new: "新增",
      resolved: "已吸收",
      larger: "较前增大",
      smaller: "较前缩小",
      stable: "较前稳定"
    };

    if (previousSizeMm === null) {
      return `${site}病灶${verbs[trend]}，当前约 ${currentSizeMm} mm。`;
    }

    return `${site}病灶${verbs[trend]}，由 ${previousSizeMm} mm 变化至 ${currentSizeMm} mm。`;
  }

  private buildAuxiliaryExamSummary(patientId: string): string {
    const comparison = this.compareImaging(patientId);

    if (!comparison) {
      return "已整合检验与生命体征数据，暂无连续影像对比。";
    }

    return `已完成${comparison.modality}时序对比：${comparison.narrativeConclusion}`;
  }

  private buildPreliminaryQuestions(patientId: string): KgFollowupQuestion[] {
    const patient = this.his.getPatient(patientId);
    const questions: KgFollowupQuestion[] = [];

    for (const condition of patient.chronicConditions) {
      if (condition.code === "E11" || condition.code === "R73") {
        questions.push({
          question: "近期餐后血糖波动如何，是否出现低血糖不适或夜间饥饿感？",
          source: "preliminary",
          clinicalIntent: "快速了解近期血糖波动和治疗安全性"
        });
      }

      if (condition.code === "I50" || condition.code === "I10") {
        questions.push({
          question: "最近活动耐量是否下降，爬楼或平地行走时是否更容易气短或乏力？",
          source: "preliminary",
          clinicalIntent: "先行识别心血管症状变化"
        });
      }

      if (condition.code === "J44") {
        questions.push({
          question: "咳嗽、气促和喘鸣较平时是否加重，是否影响日常活动？",
          source: "preliminary",
          clinicalIntent: "初筛呼吸症状急性变化"
        });
      }

      if (condition.code === "G30") {
        questions.push({
          question: "最近记忆、定向或情绪方面是否较前更差，家属是否观察到新变化？",
          source: "preliminary",
          clinicalIntent: "快速了解认知行为变化趋势"
        });
      }
    }

    if (patient.lifestyle.averageSleepHours < 6) {
      questions.push({
        question: "入睡困难、早醒还是夜间多次醒来更明显，最近一周平均能睡多久？",
        source: "preliminary",
        clinicalIntent: "补充睡眠障碍模式和严重度"
      });
    }

    return this.refineQuestions(questions).slice(0, 4);
  }

  private refineQuestions(questions: KgFollowupQuestion[]): KgFollowupQuestion[] {
    const deduped = new Map<string, KgFollowupQuestion>();
    const intentClusters = new Map<string, KgFollowupQuestion>();

    for (const question of questions) {
      const signature = this.normalizeQuestion(question.question);
      if (!deduped.has(signature)) {
        deduped.set(signature, question);
      }
    }

    for (const question of deduped.values()) {
      const clusterKey = `${question.source}:${this.clusterIntent(question.clinicalIntent)}`;
      if (!intentClusters.has(clusterKey)) {
        intentClusters.set(clusterKey, question);
      }
    }

    return Array.from(intentClusters.values()).slice(0, 10);
  }

  private selectActiveIclExamples(
    patientId: string,
    extractedEntities: string[],
    matchedProfileCount: number
  ): KgIclExample[] {
    const patient = this.his.getPatient(patientId);
    const examples: KgIclExample[] = [];

    if (matchedProfileCount === 0 || extractedEntities.length <= 3) {
      examples.push(kgActiveIclLibrary[0]);
    }

    if (patient.chronicConditions.some((condition) => condition.code === "G30")) {
      examples.push(kgActiveIclLibrary[2]);
    }

    if (patient.chronicConditions.some((condition) => condition.code === "J44" || condition.code === "I50")) {
      examples.push(kgActiveIclLibrary[3]);
    }

    if (patient.alerts.some((alert) => alert.includes("筛查") || alert.includes("接种"))) {
      examples.push(kgActiveIclLibrary[1]);
    }

    if (examples.length === 0) {
      examples.push(kgActiveIclLibrary[0]);
    }

    return Array.from(new Map(examples.map((example) => [example.title, example])).values()).slice(0, 2);
  }

  private buildConsolidationSummary(questions: KgFollowupQuestion[]) {
    const uniqueQuestions = new Set(questions.map((question) => this.normalizeQuestion(question.question)));
    const clusters = new Set(
      questions.map((question) => `${question.source}:${this.clusterIntent(question.clinicalIntent)}`)
    );

    return {
      before: uniqueQuestions.size,
      after: Math.min(clusters.size, 10),
      clusters: clusters.size,
      strategy: "先按问题文本归一化去重，再按临床意图做轻量聚类，模拟论文中的聚类合并与 LLM 精炼。"
    };
  }

  private normalizeQuestion(question: string): string {
    return question.replace(/[，。？！、\s]/g, "").toLowerCase();
  }

  private clusterIntent(intent: string): string {
    if (intent.includes("并发症") || intent.includes("受累")) return "complication";
    if (intent.includes("依从") || intent.includes("行为")) return "adherence";
    if (intent.includes("安全") || intent.includes("照护")) return "safety";
    if (intent.includes("感染") || intent.includes("炎症")) return "infection";
    if (intent.includes("严重度") || intent.includes("症状")) return "severity";
    if (intent.includes("诊断") || intent.includes("排除")) return "diagnostic";
    return "general";
  }
}
