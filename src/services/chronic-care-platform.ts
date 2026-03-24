import { z } from "zod";

import { HISSimulator } from "../adapters/his-simulator.js";
import { agentRegistry, seedClinicians } from "../data/seeds.js";
import { DocumentStore, type AppendDocumentInput } from "../core/document-store.js";
import { EventBroker } from "../core/event-broker.js";
import { MdtMeetingStore } from "../core/mdt-meeting-store.js";
import { createId } from "../lib/ids.js";
import type {
  Clinician,
  ClinicianRole,
  DiseaseDomain,
  DomainRiskAssessment,
  HISPatientBundle,
  HisMappingPreview,
  HospitalDescriptor,
  HospitalId,
  HospitalRecord,
  MdtMeeting,
  PatientProfile,
  RiskAssessment,
  RiskLevel,
  RoleAssignment,
  SharedDocumentEntry,
  TherapyPackage,
  WorkbenchRole,
  WorkflowSummary
} from "../types.js";

const runWorkflowInput = z.object({
  patientId: z.string().min(1)
});

const createMeetingInput = z.object({
  patientId: z.string().min(1),
  workflowId: z.string().nullable().optional(),
  topic: z.string().min(1),
  participantIds: z.array(z.string()).optional()
});

const addMeetingMessageInput = z.object({
  clinicianId: z.string().min(1),
  message: z.string().min(1)
});

const closeMeetingInput = z.object({
  decision: z.string().min(1),
  followUpActions: z.array(z.string()).default([])
});

export class ChronicCarePlatform {
  private readonly his = new HISSimulator();
  private readonly store = new DocumentStore();
  private readonly broker = new EventBroker();
  private readonly meetingStore = new MdtMeetingStore();
  private readonly clinicians = seedClinicians;

  constructor() {
    this.registerSubscriptions();
  }

  reset(): void {
    this.store.reset();
    this.meetingStore.reset();
  }

  listHospitals(): HospitalDescriptor[] {
    return this.his.listHospitals();
  }

  listPatients(hospitalId?: HospitalId): PatientProfile[] {
    return this.his.listPatientsByHospital(hospitalId);
  }

  getPatient(patientId: string): PatientProfile {
    return this.his.getPatient(patientId);
  }

  getHospitalRecord(patientId: string): HospitalRecord {
    return this.his.getHospitalRecord(patientId);
  }

  listClinicians(filters?: { hospitalId?: HospitalId; workbenchRole?: WorkbenchRole }): Clinician[] {
    return this.clinicians.filter((clinician) => {
      const matchesHospital = filters?.hospitalId ? clinician.hospitalIds.includes(filters.hospitalId) : true;
      const matchesRole = filters?.workbenchRole ? clinician.workbenchRole === filters.workbenchRole : true;
      return matchesHospital && matchesRole;
    });
  }

  listHisMappings(): HisMappingPreview[] {
    return this.his.getMappingPreviews();
  }

  listAgents() {
    return agentRegistry;
  }

  listDocuments(patientId?: string): SharedDocumentEntry[] {
    return patientId ? this.store.listByPatient(patientId) : this.store.list();
  }

  getPatientTimeline(patientId: string): SharedDocumentEntry[] {
    return this.store
      .listByPatient(patientId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  getLatestCarePlan(patientId: string): SharedDocumentEntry | null {
    return this.store.findLatest(patientId, "integrated-care-plan");
  }

  getLatestRiskAssessment(patientId: string): SharedDocumentEntry | null {
    return this.store.findLatest(patientId, "risk-assessment");
  }

  evaluatePatientRisk(patientId: string): RiskAssessment {
    return this.evaluateRisk(this.his.fetchPatientBundle(patientId));
  }

  getDashboardData(filters?: { hospitalId?: HospitalId; workbenchRole?: WorkbenchRole }) {
    const patients = this.listPatients(filters?.hospitalId);
    const documents = this.store.list();
    const meetings = this.meetingStore.list();
    const domainCounts = new Map<DiseaseDomain, number>();
    const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 } satisfies Record<RiskLevel, number>;

    const patientCards = patients.map((patient) => {
      const liveRisk = this.evaluatePatientRisk(patient.id);
      riskCounts[liveRisk.level] += 1;

      for (const domain of liveRisk.domainAssessments) {
        domainCounts.set(domain.domain, (domainCounts.get(domain.domain) ?? 0) + 1);
      }

      return {
        id: patient.id,
        hospitalId: patient.hospitalId,
        hospitalName: patient.hospitalName,
        name: patient.name,
        primaryDoctor: patient.primaryDoctor ?? null,
        responsibleClinician: patient.responsibleClinician ?? null,
        conditions: patient.chronicConditions.map((condition) => condition.name),
        riskLevel: liveRisk.level,
        topDomains: liveRisk.domainAssessments
          .sort((left, right) => right.score - left.score)
          .slice(0, 3)
          .map((domain) => ({ label: domain.label, level: domain.level }))
      };
    });

    return {
      project: "慢康智枢 ChroniCare OS Demo",
      hospitals: this.listHospitals(),
      workbenchRole: filters?.workbenchRole ?? null,
      summary: {
        patients: patients.length,
        documents: documents.length,
        openMeetings: meetings.filter((meeting) => meeting.status === "open").length,
        carePlans: documents.filter((document) => document.documentType === "integrated-care-plan").length
      },
      clinicians: this.listClinicians(filters).length,
      riskCounts,
      domainCounts: [...domainCounts.entries()].map(([domain, count]) => ({
        domain,
        label: this.domainLabel(domain),
        count
      })),
      patients: patientCards
    };
  }

  getPatientWorkspace(patientId: string, workbenchRole?: WorkbenchRole) {
    const patient = this.getPatient(patientId);
    const liveRiskAssessment = this.evaluatePatientRisk(patientId);
    const latestCarePlan = this.getLatestCarePlan(patientId);
    return {
      patient,
      hospitalRecord: this.getHospitalRecord(patientId),
      liveRiskAssessment,
      latestRiskAssessment: this.getLatestRiskAssessment(patientId),
      latestCarePlan,
      documents: this.getPatientTimeline(patientId),
      mdtMeetings: this.listMdtMeetings(patientId),
      roleView: this.buildRoleView(workbenchRole, patientId, liveRiskAssessment, latestCarePlan)
    };
  }

  getDemoSummary() {
    return {
      project: "慢康智枢 ChroniCare OS Demo",
      version: "0.2.0",
      capabilities: [
        "按疾病领域精准风险分层：心血管、糖尿病、认知/老年痴呆、呼吸、睡眠等",
        "行为干预疗法包：运动、饮食、生活方式、睡眠",
        "MDT 真人在线讨论与会议纪要",
        "共享文档库 + 事件驱动协作",
        "模拟 HIS 资源模型 + 文件持久化存储",
        "三家医院分角色工作台",
        "真实 HIS 字段映射预览",
        "B2B2C 健康管理生态层：保险、银行、企业、互联网平台协同",
        "GitHub 开源能力中台：EHR/FHIR、疾病预测、时序风险和评测能力映射"
      ],
      dashboard: this.getDashboardData()
    };
  }

  async runWorkflow(rawInput: unknown): Promise<WorkflowSummary> {
    const { patientId } = runWorkflowInput.parse(rawInput);
    const bundle = this.his.fetchPatientBundle(patientId);
    const workflowId = createId("wf");

    await this.writeDocument({
      workflowId,
      patientId,
      documentType: "intake-note",
      title: `慢病接诊快照：${bundle.patient.name}`,
      authorAgentId: "agent-his-ingest",
      authorRole: "system",
      namespace: "his",
      tags: ["ingest", "his", "snapshot"],
      content: {
        summary: this.buildIntakeSummary(bundle),
        sourceSystems: bundle.sourceSystems,
        hospitalRecord: bundle.hospitalRecord,
        alerts: bundle.patient.alerts
      }
    });

    const generatedDocuments = this.store.listByWorkflow(workflowId);
    const riskAssessment = generatedDocuments.find((document) => document.documentType === "risk-assessment");
    const carePlan =
      generatedDocuments.find((document) => document.documentType === "integrated-care-plan") ?? null;
    const riskLevel =
      ((riskAssessment?.content as RiskAssessment | undefined)?.level as WorkflowSummary["riskLevel"] | undefined) ??
      "medium";

    return {
      workflowId,
      patientId,
      patientName: bundle.patient.name,
      riskLevel,
      generatedDocuments,
      carePlan
    };
  }

  listMdtMeetings(patientId?: string): MdtMeeting[] {
    return this.meetingStore.list(patientId);
  }

  getMdtMeeting(meetingId: string): MdtMeeting {
    return this.meetingStore.get(meetingId);
  }

  createMdtMeeting(rawInput: unknown): MdtMeeting {
    const input = createMeetingInput.parse(rawInput);
    const defaultParticipants =
      input.participantIds && input.participantIds.length > 0
        ? input.participantIds
        : this.inferMdtParticipants(input.patientId, input.workflowId ?? null);

    return this.meetingStore.create({
      patientId: input.patientId,
      workflowId: input.workflowId ?? null,
      topic: input.topic,
      participantIds: defaultParticipants
    });
  }

  addMdtMeetingMessage(meetingId: string, rawInput: unknown): MdtMeeting {
    const input = addMeetingMessageInput.parse(rawInput);
    const clinician = this.findClinician(input.clinicianId);
    return this.meetingStore.addMessage(meetingId, clinician, input.message);
  }

  async closeMdtMeeting(meetingId: string, rawInput: unknown): Promise<MdtMeeting> {
    const input = closeMeetingInput.parse(rawInput);
    const meeting = this.meetingStore.close(meetingId, input.decision, input.followUpActions);

    if (meeting.workflowId) {
      await this.writeDocument({
        workflowId: meeting.workflowId,
        patientId: meeting.patientId,
        documentType: "mdt-meeting-summary",
        title: `MDT 会议纪要：${this.getPatient(meeting.patientId).name}`,
        authorAgentId: "agent-mdt-coordinator",
        authorRole: "case-manager",
        namespace: "mdt",
        tags: ["mdt", "meeting", "summary"],
        content: {
          topic: meeting.topic,
          participantIds: meeting.participantIds,
          messages: meeting.messages,
          decision: meeting.decision,
          followUpActions: meeting.followUpActions
        }
      });

      await this.publishCarePlanRevision(meeting.patientId, meeting.workflowId);
    }

    return meeting;
  }

  private registerSubscriptions(): void {
    this.broker.subscribe("intake-note", async (document) => {
      await this.handleIntakeNote(document);
    });

    this.broker.subscribe("risk-assessment", async (document) => {
      await this.handleRiskAssessment(document);
    });

    this.broker.subscribe("mdt-tasklist", async (document) => {
      await this.handleMdtTasklist(document);
    });

    this.broker.subscribe("*", async (document) => {
      if (
        document.documentType === "medical-plan" ||
        document.documentType === "diet-prescription" ||
        document.documentType === "exercise-prescription" ||
        document.documentType === "lifestyle-prescription" ||
        document.documentType === "sleep-prescription" ||
        document.documentType === "care-coordination-note" ||
        document.documentType === "mdt-meeting-summary"
      ) {
        await this.tryFinalizeIntegratedCarePlan(document);
      }
    });
  }

  private async writeDocument(input: AppendDocumentInput): Promise<SharedDocumentEntry> {
    const document = this.store.append(input);
    await this.broker.publish(document);
    return document;
  }

  private async handleIntakeNote(document: SharedDocumentEntry): Promise<void> {
    const bundle = this.his.fetchPatientBundle(document.patientId);
    const risk = this.evaluateRisk(bundle);

    await this.writeDocument({
      workflowId: document.workflowId,
      patientId: document.patientId,
      documentType: "risk-assessment",
      title: `风险分层结果：${bundle.patient.name}`,
      authorAgentId: "agent-triage",
      authorRole: "system",
      namespace: "triage",
      tags: ["risk", `risk:${risk.level}`],
      content: risk
    });
  }

  private async handleRiskAssessment(document: SharedDocumentEntry): Promise<void> {
    const bundle = this.his.fetchPatientBundle(document.patientId);
    const risk = document.content as RiskAssessment;
    const assignments = risk.requiredRoles.map((role) => this.createAssignment(role, bundle.patient, risk));

    this.his.assignCareTeam(
      document.patientId,
      assignments
        .map((assignment) => assignment.clinician?.id)
        .filter((id): id is string => Boolean(id))
    );

    if (risk.level === "high" || risk.level === "critical") {
      this.createMdtMeeting({
        patientId: document.patientId,
        workflowId: document.workflowId,
        topic: `${bundle.patient.name} 慢病管理 MDT 在线讨论`,
        participantIds: assignments
          .map((assignment) => assignment.clinician?.id)
          .filter((id): id is string => Boolean(id))
      });
    }

    await this.writeDocument({
      workflowId: document.workflowId,
      patientId: document.patientId,
      documentType: "mdt-tasklist",
      title: `MDT 任务单：${bundle.patient.name}`,
      authorAgentId: "agent-mdt-coordinator",
      authorRole: "case-manager",
      namespace: "mdt",
      tags: ["mdt", `risk:${risk.level}`],
      content: {
        assignments,
        expectedRoles: assignments.map((assignment) => assignment.role),
        recommendedMdtMode: risk.level === "high" || risk.level === "critical" ? "online-live-discussion" : "async-review",
        summary: `为 ${bundle.patient.name} 启动 ${assignments.length} 个 MDT 协作角色`
      }
    });
  }

  private async handleMdtTasklist(document: SharedDocumentEntry): Promise<void> {
    const bundle = this.his.fetchPatientBundle(document.patientId);
    const content = document.content as {
      assignments: RoleAssignment[];
      expectedRoles: ClinicianRole[];
    };
    const assignments = content.assignments;
    const riskAssessment = this.store.findLatest(document.patientId, "risk-assessment", document.workflowId);

    for (const assignment of assignments) {
      switch (assignment.role) {
        case "case-manager":
          await this.writeDocument({
            workflowId: document.workflowId,
            patientId: document.patientId,
            documentType: "care-coordination-note",
            title: `个案管理协调单：${bundle.patient.name}`,
            authorAgentId: "agent-mdt-coordinator",
            authorRole: "case-manager",
            namespace: "mdt",
            tags: ["coordination", `role:${assignment.role}`],
            content: this.buildCoordinationNote(bundle, assignment)
          });
          await this.writeDocument({
            workflowId: document.workflowId,
            patientId: document.patientId,
            documentType: "lifestyle-prescription",
            title: `生活方式疗法包：${bundle.patient.name}`,
            authorAgentId: "agent-lifestyle",
            authorRole: "case-manager",
            namespace: "lifestyle",
            tags: ["package", "lifestyle"],
            content: this.buildLifestylePackage(bundle, riskAssessment)
          });
          break;
        case "dietician":
          await this.writeDocument({
            workflowId: document.workflowId,
            patientId: document.patientId,
            documentType: "diet-prescription",
            title: `饮食疗法包：${bundle.patient.name}`,
            authorAgentId: "agent-diet",
            authorRole: "dietician",
            namespace: "lifestyle",
            tags: ["package", "nutrition"],
            content: this.buildNutritionPackage(bundle, assignment)
          });
          break;
        case "exercise-therapist":
          await this.writeDocument({
            workflowId: document.workflowId,
            patientId: document.patientId,
            documentType: "exercise-prescription",
            title: `运动疗法包：${bundle.patient.name}`,
            authorAgentId: "agent-exercise",
            authorRole: "exercise-therapist",
            namespace: "lifestyle",
            tags: ["package", "exercise"],
            content: this.buildExercisePackage(bundle, assignment)
          });
          break;
        case "sleep-coach":
          await this.writeDocument({
            workflowId: document.workflowId,
            patientId: document.patientId,
            documentType: "sleep-prescription",
            title: `睡眠改善包：${bundle.patient.name}`,
            authorAgentId: "agent-sleep",
            authorRole: "sleep-coach",
            namespace: "lifestyle",
            tags: ["package", "sleep"],
            content: this.buildSleepPackage(bundle, assignment)
          });
          break;
        default:
          await this.writeDocument({
            workflowId: document.workflowId,
            patientId: document.patientId,
            documentType: "medical-plan",
            title: `临床计划：${bundle.patient.name} / ${assignment.role}`,
            authorAgentId: "agent-physician",
            authorRole: assignment.role,
            namespace: "clinical",
            tags: ["plan", `role:${assignment.role}`],
            content: this.buildMedicalPlan(bundle, assignment, riskAssessment)
          });
          break;
      }
    }
  }

  private async tryFinalizeIntegratedCarePlan(document: SharedDocumentEntry): Promise<void> {
    const tasklist = this.store.findLatest(document.patientId, "mdt-tasklist", document.workflowId);

    if (!tasklist) {
      return;
    }

    const existingPlan = this.store.findLatest(
      document.patientId,
      "integrated-care-plan",
      document.workflowId
    );

    if (existingPlan) {
      return;
    }

    const tasklistContent = tasklist.content as {
      assignments: RoleAssignment[];
      expectedRoles: ClinicianRole[];
    };

    const workflowDocuments = this.store.listByPatientAndWorkflow(document.patientId, document.workflowId);
    const roleDocuments = workflowDocuments.filter(
      (entry) =>
        entry.documentType === "medical-plan" ||
        entry.documentType === "diet-prescription" ||
        entry.documentType === "exercise-prescription" ||
        entry.documentType === "lifestyle-prescription" ||
        entry.documentType === "sleep-prescription" ||
        entry.documentType === "care-coordination-note"
    );

    const completedRoles = new Set(roleDocuments.map((entry) => entry.authorRole as ClinicianRole));
    const allReady = tasklistContent.expectedRoles.every((role) => completedRoles.has(role));

    if (!allReady) {
      return;
    }

    const bundle = this.his.fetchPatientBundle(document.patientId);
    const riskAssessment = this.store.findLatest(document.patientId, "risk-assessment", document.workflowId);
    const meetings = this.listMdtMeetings(document.patientId).filter(
      (meeting) => meeting.workflowId === document.workflowId
    );

    await this.writeDocument({
      workflowId: document.workflowId,
      patientId: document.patientId,
      documentType: "integrated-care-plan",
      title: `整合慢病管理计划：${bundle.patient.name}`,
      authorAgentId: "agent-mdt-coordinator",
      authorRole: "case-manager",
      namespace: "mdt",
      tags: ["care-plan", "integrated"],
      content: this.buildIntegratedCarePlan(
        bundle,
        tasklistContent.assignments,
        roleDocuments,
        riskAssessment,
        meetings
      )
    });
  }

  private async publishCarePlanRevision(patientId: string, workflowId: string): Promise<void> {
    const tasklist = this.store.findLatest(patientId, "mdt-tasklist", workflowId);
    const riskAssessment = this.store.findLatest(patientId, "risk-assessment", workflowId);

    if (!tasklist || !riskAssessment) {
      return;
    }

    const tasklistContent = tasklist.content as {
      assignments: RoleAssignment[];
      expectedRoles: ClinicianRole[];
    };
    const bundle = this.his.fetchPatientBundle(patientId);
    const roleDocuments = this.store
      .listByPatientAndWorkflow(patientId, workflowId)
      .filter(
        (entry) =>
          entry.documentType === "medical-plan" ||
          entry.documentType === "diet-prescription" ||
          entry.documentType === "exercise-prescription" ||
          entry.documentType === "lifestyle-prescription" ||
          entry.documentType === "sleep-prescription" ||
          entry.documentType === "care-coordination-note"
      );
    const meetings = this.listMdtMeetings(patientId).filter((meeting) => meeting.workflowId === workflowId);

    await this.writeDocument({
      workflowId,
      patientId,
      documentType: "integrated-care-plan",
      title: `整合慢病管理计划修订版：${bundle.patient.name}`,
      authorAgentId: "agent-mdt-coordinator",
      authorRole: "case-manager",
      namespace: "mdt",
      tags: ["care-plan", "integrated", "revision"],
      content: this.buildIntegratedCarePlan(
        bundle,
        tasklistContent.assignments,
        roleDocuments,
        riskAssessment,
        meetings
      )
    });
  }

  private buildIntakeSummary(bundle: HISPatientBundle): string {
    const patient = bundle.patient;

    return [
      `${patient.name}，${patient.age} 岁，当前慢病包括 ${patient.chronicConditions.map((condition) => condition.name).join("、")}。`,
      `最新血压 ${patient.vitals.systolicBp}/${patient.vitals.diastolicBp} mmHg，BMI ${patient.vitals.bmi}，日均步数 ${patient.lifestyle.averageDailySteps}。`,
      `系统预警：${patient.alerts.join("；")}。`
    ].join(" ");
  }

  private evaluateRisk(bundle: HISPatientBundle): RiskAssessment {
    const patient = bundle.patient;
    const domainAssessments = [
      this.evaluateCardiovascularRisk(bundle),
      this.evaluateDiabetesRisk(bundle),
      this.evaluateDementiaRisk(bundle),
      this.evaluateRespiratoryRisk(bundle),
      this.evaluateSleepRisk(bundle),
      this.evaluateRenalRisk(bundle),
      this.evaluateMetabolicRisk(bundle)
    ].filter((assessment): assessment is DomainRiskAssessment => assessment !== null);

    const maxDomainScore = Math.max(...domainAssessments.map((assessment) => assessment.score), 0);
    const modifier = Math.min(
      3,
      Math.max(0, domainAssessments.length - 1) +
        domainAssessments.filter((assessment) => assessment.level === "high" || assessment.level === "critical").length
    );
    const score = maxDomainScore + modifier;
    const level = this.levelForScore(score);
    const drivers = domainAssessments.flatMap((assessment) => assessment.drivers).slice(0, 8);
    const goals = this.buildCareGoals(patient, domainAssessments, level);
    const requiredRoles = this.pickRequiredRoles(domainAssessments, level);

    return {
      score,
      level,
      drivers,
      goals,
      requiredRoles,
      domainAssessments
    };
  }

  private evaluateCardiovascularRisk(bundle: HISPatientBundle): DomainRiskAssessment | null {
    const conditionCodes = new Set(bundle.patient.chronicConditions.map((condition) => condition.code));
    const active = conditionCodes.has("I10") || conditionCodes.has("I50") || (bundle.patient.labs.ldl ?? 0) >= 3.4;

    if (!active) return null;

    let score = 0;
    const drivers: string[] = [];

    if (conditionCodes.has("I50")) {
      score += 4;
      drivers.push("存在慢性心衰病史");
    }
    if (conditionCodes.has("I10")) {
      score += 2;
      drivers.push("存在高血压");
    }
    if (bundle.patient.vitals.systolicBp >= 150) {
      score += 2;
      drivers.push("收缩压持续升高");
    }
    if ((bundle.patient.labs.ldl ?? 0) >= 3.4) {
      score += 1;
      drivers.push("LDL 偏高");
    }
    if ((bundle.patient.labs.ntProbnp ?? 0) >= 400) {
      score += 3;
      drivers.push("NT-proBNP 升高");
    }

    return this.buildDomainAssessment("cardiovascular", score, drivers, [
      "cardiologist",
      "primary-physician"
    ]);
  }

  private evaluateDiabetesRisk(bundle: HISPatientBundle): DomainRiskAssessment | null {
    const conditionCodes = new Set(bundle.patient.chronicConditions.map((condition) => condition.code));
    const active =
      conditionCodes.has("E11") ||
      conditionCodes.has("R73") ||
      (bundle.patient.labs.hba1c ?? 0) > 0 ||
      (bundle.patient.labs.fastingGlucose ?? 0) >= 6.1;

    if (!active) return null;

    let score = 0;
    const drivers: string[] = [];

    if (conditionCodes.has("E11")) {
      score += 3;
      drivers.push("已确诊糖尿病");
    }
    if (conditionCodes.has("R73")) {
      score += 1;
      drivers.push("存在糖代谢异常");
    }
    if ((bundle.patient.labs.hba1c ?? 0) >= 8) {
      score += 3;
      drivers.push("HbA1c 明显未达标");
    }
    if ((bundle.patient.labs.fastingGlucose ?? 0) >= 7) {
      score += 2;
      drivers.push("空腹血糖偏高");
    }
    if (bundle.patient.vitals.bmi >= 28) {
      score += 1;
      drivers.push("BMI 偏高增加胰岛素抵抗风险");
    }

    return this.buildDomainAssessment("diabetes", score, drivers, [
      "endocrinologist",
      "dietician",
      "exercise-therapist"
    ]);
  }

  private evaluateDementiaRisk(bundle: HISPatientBundle): DomainRiskAssessment | null {
    const record = bundle.hospitalRecord;
    const conditionCodes = new Set(bundle.patient.chronicConditions.map((condition) => condition.code));
    const mmse = this.getObservationValue(record, "mmse");
    const moca = this.getObservationValue(record, "moca");
    const active = conditionCodes.has("G30") || mmse !== undefined || moca !== undefined;

    if (!active) return null;

    let score = 0;
    const drivers: string[] = [];

    if (conditionCodes.has("G30")) {
      score += 4;
      drivers.push("已进入阿尔茨海默病管理路径");
    }
    if ((mmse ?? 30) <= 24) {
      score += 3;
      drivers.push("MMSE 下降");
    }
    if ((moca ?? 30) <= 20) {
      score += 2;
      drivers.push("MoCA 提示认知受损");
    }
    if (bundle.patient.age >= 70) {
      score += 1;
      drivers.push("高龄增加认知退化风险");
    }
    if (bundle.patient.lifestyle.averageSleepHours < 6) {
      score += 1;
      drivers.push("睡眠障碍可能加重认知问题");
    }

    return this.buildDomainAssessment("dementia", score, drivers, [
      "neurologist",
      "sleep-coach",
      "case-manager"
    ]);
  }

  private evaluateRespiratoryRisk(bundle: HISPatientBundle): DomainRiskAssessment | null {
    const conditionCodes = new Set(bundle.patient.chronicConditions.map((condition) => condition.code));
    const active = conditionCodes.has("J44") || (bundle.patient.vitals.oxygenSaturation ?? 98) <= 94;

    if (!active) return null;

    let score = 0;
    const drivers: string[] = [];

    if (conditionCodes.has("J44")) {
      score += 3;
      drivers.push("已确诊慢阻肺");
    }
    if ((bundle.patient.vitals.oxygenSaturation ?? 98) <= 93) {
      score += 2;
      drivers.push("血氧偏低");
    }
    if (bundle.patient.lifestyle.smokingStatus === "current") {
      score += 1;
      drivers.push("吸烟持续暴露");
    }

    return this.buildDomainAssessment("respiratory", score, drivers, [
      "pulmonologist",
      "exercise-therapist"
    ]);
  }

  private evaluateSleepRisk(bundle: HISPatientBundle): DomainRiskAssessment | null {
    const conditionCodes = new Set(bundle.patient.chronicConditions.map((condition) => condition.code));
    const active = [...conditionCodes].some((code) => code.startsWith("G47")) || bundle.patient.lifestyle.averageSleepHours < 6;

    if (!active) return null;

    let score = 0;
    const drivers: string[] = [];

    if ([...conditionCodes].some((code) => code.startsWith("G47"))) {
      score += 3;
      drivers.push("存在睡眠障碍诊断");
    }
    if (bundle.patient.lifestyle.averageSleepHours < 6) {
      score += 2;
      drivers.push("平均睡眠时长不足 6 小时");
    }
    if (bundle.patient.alerts.some((alert) => alert.includes("睡眠"))) {
      score += 1;
      drivers.push("平台已存在睡眠相关预警");
    }

    return this.buildDomainAssessment("sleep", score, drivers, ["sleep-coach"]);
  }

  private evaluateRenalRisk(bundle: HISPatientBundle): DomainRiskAssessment | null {
    const conditionCodes = new Set(bundle.patient.chronicConditions.map((condition) => condition.code));
    const active = conditionCodes.has("N18") || (bundle.patient.labs.egfr ?? 999) < 60;

    if (!active) return null;

    let score = 0;
    const drivers: string[] = [];

    if (conditionCodes.has("N18")) {
      score += 3;
      drivers.push("存在慢性肾病");
    }
    if ((bundle.patient.labs.egfr ?? 999) < 60) {
      score += 2;
      drivers.push("eGFR 下降");
    }

    return this.buildDomainAssessment("renal", score, drivers, ["primary-physician", "dietician"]);
  }

  private evaluateMetabolicRisk(bundle: HISPatientBundle): DomainRiskAssessment | null {
    const conditionCodes = new Set(bundle.patient.chronicConditions.map((condition) => condition.code));
    const active = conditionCodes.has("E66") || bundle.patient.vitals.bmi >= 28;

    if (!active) return null;

    let score = 0;
    const drivers: string[] = [];

    if (conditionCodes.has("E66")) {
      score += 2;
      drivers.push("已存在肥胖诊断");
    }
    if (bundle.patient.vitals.bmi >= 28) {
      score += 2;
      drivers.push("BMI 达到肥胖阈值");
    }
    if (bundle.patient.lifestyle.averageDailySteps < 3000) {
      score += 1;
      drivers.push("日常活动量不足");
    }

    return this.buildDomainAssessment("metabolic", score, drivers, [
      "dietician",
      "exercise-therapist"
    ]);
  }

  private buildDomainAssessment(
    domain: DiseaseDomain,
    score: number,
    drivers: string[],
    suggestedRoles: ClinicianRole[]
  ): DomainRiskAssessment {
    const level = this.levelForScore(score);

    return {
      domain,
      label: this.domainLabel(domain),
      score,
      level,
      drivers,
      suggestedRoles,
      summary: `${this.domainLabel(domain)}风险等级为 ${level}，主要驱动因素包括：${drivers.join("、")}`
    };
  }

  private pickRequiredRoles(
    domainAssessments: DomainRiskAssessment[],
    overallLevel: RiskAssessment["level"]
  ): ClinicianRole[] {
    const roles = new Set<ClinicianRole>(["case-manager", "primary-physician"]);

    for (const domainAssessment of domainAssessments) {
      for (const role of domainAssessment.suggestedRoles) {
        roles.add(role);
      }
    }

    roles.add("dietician");
    roles.add("exercise-therapist");
    roles.add("sleep-coach");

    if (overallLevel === "critical") {
      roles.add("cardiologist");
    }

    return [...roles];
  }

  private buildCareGoals(
    patient: PatientProfile,
    domainAssessments: DomainRiskAssessment[],
    riskLevel: RiskLevel
  ): string[] {
    const goals = [
      "建立 30 天可执行的慢病随访闭环",
      "完成 MDT 干预任务分发、讨论与回写"
    ];

    if (domainAssessments.some((assessment) => assessment.domain === "diabetes")) {
      goals.push("优先改善血糖达标与体重管理");
    }
    if (domainAssessments.some((assessment) => assessment.domain === "cardiovascular")) {
      goals.push("降低血压波动与心血管急性事件风险");
    }
    if (domainAssessments.some((assessment) => assessment.domain === "dementia")) {
      goals.push("延缓认知下降并增加家庭照护支持");
    }
    if (domainAssessments.some((assessment) => assessment.domain === "sleep")) {
      goals.push("改善睡眠时长和睡眠连续性");
    }
    if (riskLevel === "critical") {
      goals.push(`降低 ${patient.name} 的 30 天急性加重或再入院概率`);
    }

    return goals;
  }

  private createAssignment(
    role: ClinicianRole,
    patient: PatientProfile,
    risk: RiskAssessment
  ): RoleAssignment {
    const clinician = this.clinicians.find((candidate) => candidate.role === role) ?? null;
    const primaryDomain = risk.domainAssessments.sort((left, right) => right.score - left.score)[0];

    const objectiveByRole: Record<ClinicianRole, string> = {
      "case-manager": `建立 ${patient.name} 的随访节奏与跨部门协同清单`,
      "primary-physician": `完成 ${patient.name} 的总体临床评估与统一管理入口`,
      cardiologist: "识别心血管失代偿风险并优化路径",
      endocrinologist: "强化血糖控制并评估降糖方案",
      neurologist: "评估认知退化与照护需求",
      pulmonologist: "评估呼吸症状、吸入依从性与低氧风险",
      dietician: "输出可执行的饮食疗法包",
      "exercise-therapist": "制定安全的运动疗法包并逐步提高活动量",
      "sleep-coach": "输出睡眠改善包与行为干预建议"
    };

    return {
      role,
      clinician,
      objective: `${objectiveByRole[role]}；重点关注 ${primaryDomain?.label ?? "综合慢病"}；当前风险等级 ${risk.level}`
    };
  }

  private buildCoordinationNote(bundle: HISPatientBundle, assignment: RoleAssignment) {
    return {
      assignedClinician: assignment.clinician,
      followUpCadence: bundle.patient.alerts.length >= 3 ? "每周一次线上随访" : "每两周一次线上随访",
      coordinationChecklist: [
        "确认患者知情同意与管理目标",
        "同步医生、营养、运动、生活方式、睡眠计划到统一 care plan",
        "配置随访问卷、家庭监测与预警阈值"
      ],
      objective: assignment.objective
    };
  }

  private buildExercisePackage(bundle: HISPatientBundle, assignment: RoleAssignment): TherapyPackage {
    const patient = bundle.patient;
    const targetMinutes = patient.lifestyle.weeklyExerciseMinutes < 60 ? 90 : 150;

    return {
      kind: "exercise",
      title: "运动疗法包",
      rationale: "用于提升心肺耐力、改善胰岛素敏感性并增加功能活动量",
      targets: [
        `4 周内逐步提升到每周 ${targetMinutes} 分钟中等强度活动`,
        "日均步数周增 10%-15%"
      ],
      interventions: [
        "快走或骑车 5 次/周，每次 20-30 分钟",
        "抗阻训练 2 次/周，每次 15 分钟",
        patient.chronicConditions.some((condition) => condition.code === "J44")
          ? "增加呼吸训练与缩唇呼吸"
          : "每日 10 分钟拉伸与关节活动"
      ],
      metrics: [
        "运动前后记录心率、血压或血氧",
        "每周回收步数与运动完成率"
      ]
    };
  }

  private buildNutritionPackage(bundle: HISPatientBundle, assignment: RoleAssignment): TherapyPackage & { assignedClinician: Clinician | null } {
    const patient = bundle.patient;

    return {
      kind: "nutrition",
      title: "饮食疗法包",
      assignedClinician: assignment.clinician,
      rationale: "用于控糖、降压、减重并降低代谢性风险",
      targets: [
        patient.vitals.bmi >= 28 ? "8-12 周体重下降 3%-5%" : "维持当前体重并稳定血糖",
        "控制夜间加餐和精制碳水"
      ],
      interventions: [
        "主食定量分配到三餐，减少夜宵",
        "每日蔬菜 >= 500g，优先高纤维低 GI 组合",
        patient.chronicConditions.some((condition) => condition.code === "I50")
          ? "食盐摄入控制在 4-5g/日以内并注意液体管理"
          : "限制含糖饮料与精制碳水"
      ],
      metrics: [
        "每周上传 3 天饮食照片",
        "每周记录体重与腰围"
      ]
    };
  }

  private buildLifestylePackage(
    bundle: HISPatientBundle,
    riskAssessment: SharedDocumentEntry | null
  ): TherapyPackage & { riskContext: RiskAssessment | null } {
    const risk = (riskAssessment?.content as RiskAssessment | undefined) ?? null;
    const currentPatient = bundle.patient;

    return {
      kind: "lifestyle",
      title: "生活方式疗法包",
      riskContext: risk,
      rationale: "用于提升依从性、家庭监测质量和整体行为改变成功率",
      targets: [
        "建立晨间监测与晚间复盘习惯",
        "建立患者与照护者双向任务清单"
      ],
      interventions: [
        "每日完成血压/血糖/血氧监测打卡",
        currentPatient.lifestyle.smokingStatus === "current" ? "启动戒烟干预流程" : "保持无烟暴露环境",
        "建立药物服用提醒与异常预警反馈机制"
      ],
      metrics: [
        "每周依从性评分 >= 80%",
        "家庭监测漏报率 < 10%"
      ]
    };
  }

  private buildSleepPackage(bundle: HISPatientBundle, assignment: RoleAssignment): TherapyPackage & { assignedClinician: Clinician | null } {
    const patient = bundle.patient;

    return {
      kind: "sleep",
      title: "睡眠改善包",
      assignedClinician: assignment.clinician,
      rationale: "用于改善睡眠时长、连续性并降低夜间症状与认知负担",
      targets: [
        `当前平均睡眠 ${patient.lifestyle.averageSleepHours} 小时，目标提升到 6.5-7.5 小时`,
        "每周完成 3 次睡眠质量自评"
      ],
      interventions: [
        "睡前 2 小时不进食大量碳水",
        "睡前 1 小时停止手机和平板使用",
        patient.chronicConditions.some((condition) => condition.code === "G47.33")
          ? "核查呼吸机/睡眠监测设备使用依从性"
          : "设置固定就寝与起床时间"
      ],
      metrics: [
        "每周睡眠日志完成率",
        "夜间觉醒次数变化"
      ]
    };
  }

  private buildMedicalPlan(
    bundle: HISPatientBundle,
    assignment: RoleAssignment,
    riskAssessment: SharedDocumentEntry | null
  ) {
    const role = assignment.role;

    const actions = [
      "核对现有慢病用药与依从性",
      "根据家庭监测结果决定是否调整随访频率"
    ];

    if (role === "cardiologist") {
      actions.push("评估容量管理、利尿剂使用和再入院预警阈值");
    }
    if (role === "endocrinologist") {
      actions.push("评估 HbA1c 未达标原因，考虑强化降糖路径");
    }
    if (role === "neurologist") {
      actions.push("完善认知量表复评与照护者教育方案");
    }
    if (role === "pulmonologist") {
      actions.push("评估吸入装置使用正确性和夜间低氧风险");
    }
    if (role === "primary-physician") {
      actions.push("整合专科意见并形成统一随访入口");
    }

    return {
      assignedClinician: assignment.clinician,
      objective: assignment.objective,
      riskContext: (riskAssessment?.content as RiskAssessment | undefined) ?? null,
      actions,
      monitoring: [
        "复诊前回收家庭生命体征与主诉",
        "预警升级时 24 小时内回访"
      ]
    };
  }

  private buildIntegratedCarePlan(
    bundle: HISPatientBundle,
    assignments: RoleAssignment[],
    roleDocuments: SharedDocumentEntry[],
    riskAssessment: SharedDocumentEntry | null,
    meetings: MdtMeeting[]
  ) {
    const patient = bundle.patient;
    const risk = (riskAssessment?.content as RiskAssessment | undefined) ?? null;
    const therapyPackages = roleDocuments
      .filter((document) =>
        ["diet-prescription", "exercise-prescription", "lifestyle-prescription", "sleep-prescription"].includes(
          document.documentType
        )
      )
      .map((document) => ({
        documentType: document.documentType,
        title: document.title,
        content: document.content
      }));

    return {
      patient: {
        id: patient.id,
        name: patient.name,
        mrn: patient.mrn
      },
      risk,
      assignedTeam: assignments.map((assignment) => ({
        role: assignment.role,
        clinician: assignment.clinician?.name ?? "待分配",
        department: assignment.clinician?.department ?? "待定"
      })),
      careGoals: risk?.goals ?? [],
      domainRisks: risk?.domainAssessments ?? [],
      therapyPackages,
      clinicalPlans: roleDocuments
        .filter((document) => document.documentType === "medical-plan")
        .map((document) => ({
          title: document.title,
          role: document.authorRole,
          content: document.content
        })),
      meetings: meetings.map((meeting) => ({
        id: meeting.id,
        topic: meeting.topic,
        status: meeting.status,
        decision: meeting.decision,
        followUpActions: meeting.followUpActions
      })),
      operationalPlan: {
        daily: [
          "家庭生命体征采集与患者打卡",
          "执行饮食、运动、生活方式、睡眠干预"
        ],
        weekly: [
          "个案管理师回顾趋势与预警",
          "必要时发起线上 MDT 讨论"
        ],
        monthly: [
          "输出阶段性慢病管理报告回写 HIS",
          "医生复核是否需要调整处方"
        ]
      }
    };
  }

  private inferMdtParticipants(patientId: string, workflowId: string | null): string[] {
    const tasklist = workflowId
      ? this.store.findLatest(patientId, "mdt-tasklist", workflowId)
      : this.store.findLatest(patientId, "mdt-tasklist");

    if (!tasklist) {
      return this.clinicians.slice(0, 4).map((clinician) => clinician.id);
    }

    const content = tasklist.content as { assignments: RoleAssignment[] };
    return content.assignments
      .map((assignment) => assignment.clinician?.id)
      .filter((id): id is string => Boolean(id));
  }

  private findClinician(clinicianId: string): Clinician {
    const clinician = this.clinicians.find((candidate) => candidate.id === clinicianId);

    if (!clinician) {
      throw new Error(`Clinician not found: ${clinicianId}`);
    }

    return clinician;
  }

  private getObservationValue(record: HospitalRecord, code: string): number | undefined {
    const observation = record.observations.find((candidate) => candidate.code === code);
    return typeof observation?.value === "number" ? observation.value : undefined;
  }

  private levelForScore(score: number): RiskLevel {
    if (score >= 10) return "critical";
    if (score >= 7) return "high";
    if (score >= 4) return "medium";
    return "low";
  }

  private domainLabel(domain: DiseaseDomain): string {
    const labels: Record<DiseaseDomain, string> = {
      cardiovascular: "心血管",
      diabetes: "糖尿病",
      dementia: "认知/老年痴呆",
      respiratory: "呼吸",
      sleep: "睡眠",
      renal: "肾脏",
      metabolic: "代谢"
    };

    return labels[domain];
  }

  private buildRoleView(
    workbenchRole: WorkbenchRole | undefined,
    patientId: string,
    liveRisk: RiskAssessment,
    latestCarePlan: SharedDocumentEntry | null
  ) {
    const role = workbenchRole ?? "health-manager";
    const carePlan = latestCarePlan?.content as
      | {
          therapyPackages?: Array<{ title: string }>;
          clinicalPlans?: Array<{ title: string }>;
          meetings?: Array<{ topic: string; status: string }>;
          careGoals?: string[];
        }
      | undefined;

    if (role === "specialist-doctor") {
      return {
        role,
        title: "专科医生视图",
        priorities: liveRisk.domainAssessments
          .sort((left, right) => right.score - left.score)
          .slice(0, 3)
          .map((assessment) => `${assessment.label}：${assessment.summary}`),
        focusPanels: ["risk-domains", "clinical-plans", "mdt-meetings"],
        quickActions: ["查看领域风险", "审阅专科临床计划", "参与 MDT 讨论"]
      };
    }

    if (role === "general-practitioner") {
      return {
        role,
        title: "全科医生视图",
        priorities: [
          ...(carePlan?.careGoals ?? []).slice(0, 3),
          `当前需整合 ${liveRisk.domainAssessments.length} 个疾病领域风险`
        ],
        focusPanels: ["care-plan", "follow-up", "mdt-meetings"],
        quickActions: ["整合专科意见", "调整随访节奏", "查看患者全程计划"]
      };
    }

    return {
      role,
      title: "健康管理师视图",
      priorities: [
        `${carePlan?.therapyPackages?.length ?? 0} 个疗法包待执行`,
        `${this.listMdtMeetings(patientId).filter((meeting) => meeting.status === "open").length} 个开放 MDT 会议`,
        ...(liveRisk.drivers.slice(0, 2))
      ],
      focusPanels: ["therapy-packages", "adherence", "mdt-meetings"],
      quickActions: ["跟进打卡与依从性", "发起 MDT 会议", "分配生活方式任务"]
    };
  }
}
