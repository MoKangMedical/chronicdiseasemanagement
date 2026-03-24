import type {
  DiseaseDomain,
  HospitalId,
  PatientProfile,
  PopulationCohortSnapshot,
  PopulationCoordinationFunnel,
  PopulationCoordinationFunnelStage,
  PopulationEvidenceSource,
  PopulationImprovementRecord,
  PopulationInterventionProjection,
  PopulationCareProcessEntry,
  PopulationDistrictOperationsSummary,
  PopulationHospitalPerformance,
  PopulationManagedPatient,
  PopulationModelPrediction,
  PopulationModelGovernanceItem,
  PopulationModelGovernanceSummary,
  PopulationPublicProfile,
  PopulationRoleWorkload,
  PopulationRoleFollowupPlan,
  PopulationRiskVector,
  RiskLevel
} from "../types.js";
import { ChronicCarePlatform } from "./chronic-care-platform.js";

const qixiaPublicPopulation = {
  totalPopulation: 1017800,
  totalPopulationLabel: "101.78 万人",
  totalPopulationAsOf: "2024 年末常住人口"
};

const districtDisplaySampleSize = 360;
const hospitalDisplaySampleSize = 90;

const qixiaSexDistribution2020 = [
  { label: "男性", count: 511258, ratio: 51.76, note: "七普口径" },
  { label: "女性", count: 476577, ratio: 48.24, note: "七普口径" }
];

const qixiaAgeDistribution2020 = [
  { label: "0-14 岁", count: 110406, ratio: 11.18, note: "七普年龄结构" },
  { label: "15-39 岁", count: 459235, ratio: 46.49, note: "七普年龄结构" },
  { label: "40-59 岁", count: 263739, ratio: 26.7, note: "七普年龄结构" },
  { label: "60-64 岁", count: 47835, ratio: 4.84, note: "七普年龄结构" },
  { label: "65 岁及以上", count: 106620, ratio: 10.79, note: "七普年龄结构" }
];

const domainOrder: DiseaseDomain[] = [
  "cardiovascular",
  "diabetes",
  "dementia",
  "respiratory",
  "sleep",
  "renal",
  "metabolic"
];

const domainLabels: Record<DiseaseDomain, string> = {
  cardiovascular: "心血管",
  diabetes: "糖尿病",
  dementia: "认知障碍",
  respiratory: "呼吸慢病",
  sleep: "睡眠",
  renal: "肾脏",
  metabolic: "代谢"
};

const guidelineSignals: Record<DiseaseDomain, string> = {
  cardiovascular: "院内高血压/心衰慢病路径规则",
  diabetes: "院内糖尿病分层管理路径规则",
  dementia: "老年记忆门诊认知评估路径",
  respiratory: "呼吸慢病随访与肺康复路径",
  sleep: "睡眠障碍行为干预路径",
  renal: "慢性肾病分层随访路径",
  metabolic: "体重管理与代谢综合征干预路径"
};

const interventionPackages: Record<DiseaseDomain, string[]> = {
  cardiovascular: ["控压随访包", "心肺耐力训练包", "限盐膳食包"],
  diabetes: ["控糖饮食包", "餐后步行处方", "血糖监测提醒包"],
  dementia: ["认知训练包", "照护者教育包", "睡眠稳定包"],
  respiratory: ["肺康复运动包", "呼吸训练包", "戒烟支持包"],
  sleep: ["睡眠改善包", "睡前行为干预包", "夜间监测包"],
  renal: ["肾病饮食包", "液体管理包", "血压复评包"],
  metabolic: ["减重干预包", "营养替换包", "周步数提升包"]
};

const familyNames = [
  "赵",
  "钱",
  "孙",
  "李",
  "周",
  "吴",
  "郑",
  "王",
  "冯",
  "陈",
  "褚",
  "卫",
  "蒋",
  "沈",
  "韩",
  "杨",
  "朱",
  "秦",
  "许",
  "何"
];

const givenNames = [
  "秀兰",
  "建国",
  "海霞",
  "玉凤",
  "志强",
  "美珍",
  "立新",
  "桂芳",
  "德安",
  "爱华",
  "长明",
  "金保",
  "春燕",
  "云松",
  "宁静",
  "文娟",
  "绍平",
  "晨辉",
  "晓梅",
  "国英"
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createSeededRandom(seed: string): () => number {
  let state = 0;
  for (let index = 0; index < seed.length; index += 1) {
    state = (state * 31 + seed.charCodeAt(index)) >>> 0;
  }

  if (state === 0) {
    state = 0x12345678;
  }

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function levelFromScore(score: number): RiskLevel {
  if (score >= 82) return "critical";
  if (score >= 66) return "high";
  if (score >= 42) return "medium";
  return "low";
}

function roundScore(value: number): number {
  return Number(value.toFixed(1));
}

function averageRiskVector(vectors: PopulationRiskVector[]): PopulationRiskVector {
  const totals = Object.fromEntries(domainOrder.map((domain) => [domain, 0])) as PopulationRiskVector;
  for (const vector of vectors) {
    for (const domain of domainOrder) {
      totals[domain] += vector[domain];
    }
  }
  for (const domain of domainOrder) {
    totals[domain] = roundScore(totals[domain] / Math.max(1, vectors.length));
  }
  return totals;
}

function averageFromVector(vector: PopulationRiskVector, domains: DiseaseDomain[]): number {
  return roundScore(domains.reduce((total, domain) => total + vector[domain], 0) / Math.max(1, domains.length));
}

function interpolateRadar(before: PopulationRiskVector, after: PopulationRiskVector, ratio: number): PopulationRiskVector {
  const next = { ...before };
  for (const domain of domainOrder) {
    next[domain] = roundScore(before[domain] + (after[domain] - before[domain]) * ratio);
  }
  return next;
}

const roleLabels: Record<PopulationRoleWorkload["role"], string> = {
  "tertiary-specialist": "三甲专科医生",
  "general-practitioner": "全科医生",
  "health-manager": "健康管理师"
};

function getOwnerForRole(patient: PopulationManagedPatient, role: PopulationRoleWorkload["role"]) {
  if (role === "health-manager") {
    return patient.responsibleClinician ?? patient.primaryDoctor ?? null;
  }
  return patient.primaryDoctor ?? patient.responsibleClinician ?? null;
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : roundScore((numerator / denominator) * 100);
}

function scaleCount(sampleCount: number, sampleSize: number, totalSize: number): number {
  if (sampleSize <= 0 || totalSize <= 0) return 0;
  return Math.round((sampleCount / sampleSize) * totalSize);
}

function hospitalPopulationWeight(hospital: ReturnType<ChronicCarePlatform["listHospitals"]>[number]): number {
  if (hospital.id === "qixia-hospital") return 2.4;
  if (hospital.level === "基层") return 1.35;
  if (hospital.id === "taikang-xianlin-gulou") return 1.2;
  return 1.6;
}

function distributeCounts<T extends { id: string }>(items: T[], total: number, getWeight: (item: T) => number): Map<string, number> {
  const weights = items.map((item) => Math.max(0.01, getWeight(item)));
  const weightSum = weights.reduce((sum, item) => sum + item, 0);
  const allocation = new Map<string, number>();
  const fractions: Array<{ id: string; fraction: number }> = [];
  let assigned = 0;

  items.forEach((item, index) => {
    const raw = (total * weights[index]) / weightSum;
    const base = Math.floor(raw);
    allocation.set(item.id, base);
    assigned += base;
    fractions.push({ id: item.id, fraction: raw - base });
  });

  let remainder = total - assigned;
  fractions.sort((left, right) => right.fraction - left.fraction);
  let index = 0;
  while (remainder > 0 && fractions.length > 0) {
    const target = fractions[index % fractions.length];
    allocation.set(target.id, (allocation.get(target.id) ?? 0) + 1);
    remainder -= 1;
    index += 1;
  }

  return allocation;
}

export class PopulationManagementService {
  constructor(private readonly platform: ChronicCarePlatform) {}

  getCohortSnapshot(hospitalId?: HospitalId): PopulationCohortSnapshot {
    const allHospitals = this.platform.listHospitals();
    const qixiaHospitals = allHospitals.filter((hospital) => hospital.district === "栖霞区");
    const qixiaHospitalIds = new Set(qixiaHospitals.map((hospital) => hospital.id));
    const scopedHospitals = hospitalId
      ? allHospitals.filter((hospital) => hospital.id === hospitalId)
      : qixiaHospitals;
    const templates = hospitalId
      ? this.platform.listPatients(hospitalId)
      : this.platform.listPatients().filter((patient) => qixiaHospitalIds.has(patient.hospitalId));
    const fallbackTemplates = templates.length ? templates : this.platform.listPatients();
    const hospitals = scopedHospitals.length ? scopedHospitals : qixiaHospitals.length ? qixiaHospitals : allHospitals;
    const simulatedPopulationCount = hospitalId
      ? distributeCounts(hospitals, qixiaPublicPopulation.totalPopulation, hospitalPopulationWeight).get(hospitalId) ??
        qixiaPublicPopulation.totalPopulation
      : qixiaPublicPopulation.totalPopulation;
    const displaySampleCount = Math.min(
      simulatedPopulationCount,
      hospitalId ? hospitalDisplaySampleSize : districtDisplaySampleSize
    );
    const hospitalSampleTargets = distributeCounts(hospitals, displaySampleCount, hospitalPopulationWeight);

    const patients = hospitals.flatMap((hospital) => {
      const targetCount = hospitalSampleTargets.get(hospital.id) ?? 0;
      const hospitalTemplates = fallbackTemplates.filter((patient) => patient.hospitalId === hospital.id);
      const scopedTemplates = hospitalTemplates.length ? hospitalTemplates : fallbackTemplates;

      return Array.from({ length: targetCount }, (_item, index) =>
        this.buildManagedPatient(index, scopedTemplates[index % scopedTemplates.length], hospital)
      );
    });

    const samplePatientCount = patients.length;
    const highRiskCount = scaleCount(
      patients.filter((patient) => patient.overallRiskLevel === "high").length,
      samplePatientCount,
      simulatedPopulationCount
    );
    const criticalRiskCount = scaleCount(
      patients.filter((patient) => patient.overallRiskLevel === "critical").length,
      samplePatientCount,
      simulatedPopulationCount
    );
    const intensiveManagementCount = scaleCount(
      patients.filter((patient) => patient.managementTier === "intensive").length,
      samplePatientCount,
      simulatedPopulationCount
    );
    const averageEvidencePerPatient = roundScore(
      patients.reduce((total, patient) => total + patient.evidenceSources.length, 0) / patients.length
    );
    const closedLoopRate = roundScore(
      (patients.filter((patient) => patient.careGaps.length <= 2).length / patients.length) * 100
    );

    const domainPrevalence = domainOrder.map((domain) => ({
      domain,
      label: domainLabels[domain],
      count: scaleCount(
        patients.filter((patient) => patient.radar[domain] >= 60).length,
        samplePatientCount,
        simulatedPopulationCount
      )
    }));

    const modelDistribution = ["TemporAI", "PyHealth", "Disease-Text"]
      .map((model) => {
        const modelScores = patients
          .map((patient) => patient.predictions.find((prediction) => prediction.model === model))
          .filter((prediction): prediction is PopulationModelPrediction => Boolean(prediction));
        return {
          model,
          averageScore: roundScore(
            modelScores.reduce((total, prediction) => total + prediction.score, 0) / Math.max(1, modelScores.length)
          ),
          highRiskCount: scaleCount(
            modelScores.filter((prediction) => prediction.level === "high" || prediction.level === "critical").length,
            Math.max(1, modelScores.length),
            simulatedPopulationCount
          )
        };
      })
      .filter((item) => item.averageScore > 0);

    return {
      generatedAt: "2026-03-24T12:00:00+08:00",
      hospitalId,
      hospitalLabel: hospitalId ? hospitals[0]?.name ?? "指定医院" : "栖霞区医院网络全人群慢病管理仿真",
      patientCount: simulatedPopulationCount,
      displayedPatientCount: samplePatientCount,
      publicProfile: this.buildPublicProfile(simulatedPopulationCount),
      districtOperations: this.buildDistrictOperationsSummary({
        patients,
        hospitals,
        managedPatientCount: simulatedPopulationCount
      }),
      summary: {
        highRiskCount,
        criticalRiskCount,
        intensiveManagementCount,
        averageEvidencePerPatient,
        closedLoopRate
      },
      hospitalPerformanceRanking: this.buildHospitalPerformanceRanking(
        patients,
        distributeCounts(hospitals, simulatedPopulationCount, hospitalPopulationWeight)
      ),
      coordinationFunnel: this.buildCoordinationFunnel(patients, simulatedPopulationCount),
      roleWorkload: this.buildRoleWorkload(patients, simulatedPopulationCount),
      modelGovernance: this.buildModelGovernanceSummary(patients),
      referralMetrics: this.buildReferralMetrics(patients, simulatedPopulationCount),
      averageRadar: averageRiskVector(patients.map((patient) => patient.radar)),
      domainPrevalence,
      modelDistribution,
      patients
    };
  }

  private buildDistrictOperationsSummary(input: {
    patients: PopulationManagedPatient[];
    hospitals: ReturnType<ChronicCarePlatform["listHospitals"]>;
    managedPatientCount: number;
  }): PopulationDistrictOperationsSummary {
    const activeHospitalIds = new Set(input.patients.map((patient) => patient.hospitalId));
    const primaryDoctorCoverage = input.patients.filter((patient) => Boolean(patient.primaryDoctor)).length;
    const responsibleCoverage = input.patients.filter((patient) => Boolean(patient.responsibleClinician)).length;
    const specialistCoverage = input.patients.filter(
      (patient) => Boolean(patient.primaryDoctor) && patient.primaryDoctor?.role !== "primary-physician"
    ).length;
    const gpCoverage = input.patients.filter((patient) => patient.primaryDoctor?.role === "primary-physician").length;
    const managerCoverage = input.patients.filter((patient) => patient.responsibleClinician?.role === "case-manager").length;

    return {
      districtName: "栖霞区",
      totalPopulation: qixiaPublicPopulation.totalPopulation,
      managedPatientCount: input.managedPatientCount,
      managedCoverageRate: Number(((input.managedPatientCount / qixiaPublicPopulation.totalPopulation) * 100).toFixed(3)),
      districtHospitalCount: input.hospitals.length,
      activeHospitalCount: activeHospitalIds.size,
      hospitalCoverageRate: safeDivide(activeHospitalIds.size, input.hospitals.length),
      primaryDoctorCoverageRate: safeDivide(primaryDoctorCoverage, input.patients.length),
      responsibleClinicianCoverageRate: safeDivide(responsibleCoverage, input.patients.length),
      specialistDoctorCoverageRate: safeDivide(specialistCoverage, input.patients.length),
      generalPractitionerCoverageRate: safeDivide(gpCoverage, input.patients.length),
      healthManagerCoverageRate: safeDivide(managerCoverage, input.patients.length)
    };
  }

  private buildHospitalPerformanceRanking(
    patients: PopulationManagedPatient[],
    populationTargets: Map<string, number>
  ): PopulationHospitalPerformance[] {
    const grouped = new Map<string, PopulationManagedPatient[]>();
    for (const patient of patients) {
      const existing = grouped.get(patient.hospitalId) ?? [];
      existing.push(patient);
      grouped.set(patient.hospitalId, existing);
    }

    return [...grouped.entries()]
      .map(([hospitalId, hospitalPatients]) => {
        const targetPopulation = populationTargets.get(hospitalId) ?? hospitalPatients.length;
        const highRiskCount = hospitalPatients.filter(
          (patient) => patient.overallRiskLevel === "high" || patient.overallRiskLevel === "critical"
        ).length;
        const criticalRiskCount = hospitalPatients.filter((patient) => patient.overallRiskLevel === "critical").length;
        const intensiveManagementCount = hospitalPatients.filter(
          (patient) => patient.managementTier === "intensive"
        ).length;
        const effectiveCount = hospitalPatients.filter(
          (patient) =>
            patient.interventionProjection.afterOverallScore <= patient.interventionProjection.beforeOverallScore - 8 ||
            patient.interventionProjection.afterLevel !== patient.interventionProjection.beforeLevel
        ).length;
        const closedLoopCount = hospitalPatients.filter((patient) => patient.careGaps.length <= 2).length;
        const referralCount = hospitalPatients.filter(
          (patient) => patient.managementTier === "intensive" || patient.overallRiskLevel === "critical"
        ).length;
        const consultationCount = hospitalPatients.filter((patient) => patient.overallRiskLevel !== "low").length;
        const mdtReviewCount = hospitalPatients.filter(
          (patient) => patient.managementTier !== "routine" || patient.topDomains.length >= 2
        ).length;
        const averageEvidencePerPatient = roundScore(
          hospitalPatients.reduce((total, patient) => total + patient.evidenceSources.length, 0) /
            Math.max(1, hospitalPatients.length)
        );
        const averageRiskScore = roundScore(
          hospitalPatients.reduce((total, patient) => total + patient.interventionProjection.afterOverallScore, 0) /
            Math.max(1, hospitalPatients.length)
        );
        const clinicians = new Set(
          hospitalPatients
            .flatMap((patient) => [patient.primaryDoctor?.name, patient.responsibleClinician?.name])
            .filter((name): name is string => Boolean(name))
        );
        const topDomains = domainOrder
          .map((domain) => ({
            domain,
            label: domainLabels[domain],
            count: hospitalPatients.filter((patient) => patient.radar[domain] >= 60).length
          }))
          .filter((item) => item.count > 0)
          .sort((left, right) => right.count - left.count)
          .slice(0, 3);
        const topPackages = new Map<string, number>();
        for (const patient of hospitalPatients) {
          for (const title of patient.recommendedPackages) {
            topPackages.set(title, (topPackages.get(title) ?? 0) + 1);
          }
        }

        return {
          rank: 0,
          hospitalId: hospitalId as HospitalId,
          hospitalName: hospitalPatients[0]?.hospitalName ?? hospitalId,
          patientCount: targetPopulation,
          highRiskCount: scaleCount(highRiskCount, hospitalPatients.length, targetPopulation),
          criticalRiskCount: scaleCount(criticalRiskCount, hospitalPatients.length, targetPopulation),
          intensiveManagementCount: scaleCount(intensiveManagementCount, hospitalPatients.length, targetPopulation),
          averageRiskScore,
          effectiveRate: safeDivide(effectiveCount, hospitalPatients.length),
          closedLoopRate: safeDivide(closedLoopCount, hospitalPatients.length),
          referralCount: scaleCount(referralCount, hospitalPatients.length, targetPopulation),
          consultationCount: scaleCount(consultationCount, hospitalPatients.length, targetPopulation),
          mdtReviewCount: scaleCount(mdtReviewCount, hospitalPatients.length, targetPopulation),
          averageEvidencePerPatient,
          averagePatientsPerClinician: Number((targetPopulation / Math.max(1, clinicians.size)).toFixed(1)),
          topDomains: topDomains.map((item) => ({
            ...item,
            count: scaleCount(item.count, hospitalPatients.length, targetPopulation)
          })),
          topPackages: [...topPackages.entries()]
            .sort((left, right) => right[1] - left[1])
            .slice(0, 3)
            .map(([title, count]) => ({ title, count: scaleCount(count, hospitalPatients.length, targetPopulation) }))
        };
      })
      .sort((left, right) =>
        right.effectiveRate - left.effectiveRate ||
        right.closedLoopRate - left.closedLoopRate ||
        right.patientCount - left.patientCount
      )
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }

  private buildCoordinationFunnel(patients: PopulationManagedPatient[], totalPatients: number): PopulationCoordinationFunnel {
    const sampleSize = Math.max(1, patients.length);
    const referralSuggestedCount = patients.filter(
      (patient) => patient.managementTier === "intensive" || patient.overallRiskLevel === "critical"
    ).length;
    const referralCompletedCount = patients.filter(
      (patient) =>
        patient.interventionProjection.afterOverallScore <= patient.interventionProjection.beforeOverallScore - 8 ||
        patient.interventionProjection.afterLevel !== patient.interventionProjection.beforeLevel
    ).length;
    const consultationCount = patients.filter(
      (patient) => patient.overallRiskLevel !== "low" || patient.topDomains.length >= 2
    ).length;
    const mdtReviewCount = patients.filter(
      (patient) => patient.managementTier !== "routine" || patient.topDomains.length >= 2
    ).length;
    const closedLoopCount = patients.filter((patient) => patient.careGaps.length <= 2).length;
    const scaledReferralSuggestedCount = scaleCount(referralSuggestedCount, sampleSize, totalPatients);
    const scaledReferralCompletedCount = scaleCount(referralCompletedCount, sampleSize, totalPatients);
    const scaledConsultationCount = scaleCount(consultationCount, sampleSize, totalPatients);
    const scaledMdtReviewCount = scaleCount(mdtReviewCount, sampleSize, totalPatients);
    const scaledClosedLoopCount = scaleCount(closedLoopCount, sampleSize, totalPatients);
    const stageRate = (count: number) => safeDivide(count, totalPatients);

    const stages: PopulationCoordinationFunnelStage[] = [
      { key: "screened", label: "纳管筛查", count: totalPatients, rate: 100, note: "纳入区级慢病管理池" },
      { key: "risk-stratified", label: "风险分层", count: totalPatients, rate: 100, note: "已完成统一风险画像" },
      {
        key: "referral-suggested",
        label: "转诊建议",
        count: scaledReferralSuggestedCount,
        rate: stageRate(scaledReferralSuggestedCount),
        note: "进入专科优先关注队列"
      },
      {
        key: "consultation",
        label: "会诊/专科复核",
        count: scaledConsultationCount,
        rate: stageRate(scaledConsultationCount),
        note: "需要专科进一步确认"
      },
      {
        key: "mdt-review",
        label: "MDT 复核",
        count: scaledMdtReviewCount,
        rate: stageRate(scaledMdtReviewCount),
        note: "进入多学科协同处置"
      },
      {
        key: "closed-loop",
        label: "闭环复评",
        count: scaledClosedLoopCount,
        rate: stageRate(scaledClosedLoopCount),
        note: "完成闭环管理或进入稳定随访"
      }
    ];

    return {
      totalPatients,
      referralSuggestedCount: scaledReferralSuggestedCount,
      referralCompletedCount: scaledReferralCompletedCount,
      consultationCount: scaledConsultationCount,
      mdtReviewCount: scaledMdtReviewCount,
      closedLoopCount: scaledClosedLoopCount,
      closedLoopRate: safeDivide(scaledClosedLoopCount, totalPatients),
      stages
    };
  }

  private buildRoleWorkload(patients: PopulationManagedPatient[], simulatedPopulationCount: number): PopulationRoleWorkload[] {
    const roles: PopulationRoleWorkload["role"][] = [
      "tertiary-specialist",
      "general-practitioner",
      "health-manager"
    ];

    return roles.map((role) => {
      const clinicianMap = new Map<
        string,
        { clinicianName: string; hospitalName: string; patientCount: number; overdueCount: number }
      >();
      let pendingTaskCount = 0;
      let atRiskTaskCount = 0;
      let overdueTaskCount = 0;
      let doneTaskCount = 0;
      let patientCount = 0;

      for (const patient of patients) {
        const plan = patient.roleFollowupPlans.find((item) => item.role === role);
        if (!plan) continue;
        patientCount += 1;
        const owner = getOwnerForRole(patient, role);
        const clinicianName = owner?.name ?? roleLabels[role];
        const hospitalName = patient.hospitalName;
        const key = `${clinicianName}|${hospitalName}`;
        const entry =
          clinicianMap.get(key) ?? {
            clinicianName,
            hospitalName,
            patientCount: 0,
            overdueCount: 0
          };
        entry.patientCount += 1;

        for (const todo of plan.todoList) {
          if (todo.status === "pending") pendingTaskCount += 1;
          if (todo.status === "at-risk") atRiskTaskCount += 1;
          if (todo.status === "overdue") {
            overdueTaskCount += 1;
            entry.overdueCount += 1;
          }
          if (todo.status === "done") doneTaskCount += 1;
        }

        clinicianMap.set(key, entry);
      }

      const clinicianCount = clinicianMap.size;
      const scaledPatientCount = scaleCount(patientCount, Math.max(1, patients.length), simulatedPopulationCount);
      const scaledPendingTaskCount = scaleCount(pendingTaskCount, Math.max(1, patients.length), simulatedPopulationCount);
      const scaledAtRiskTaskCount = scaleCount(atRiskTaskCount, Math.max(1, patients.length), simulatedPopulationCount);
      const scaledOverdueTaskCount = scaleCount(overdueTaskCount, Math.max(1, patients.length), simulatedPopulationCount);
      const scaledDoneTaskCount = scaleCount(doneTaskCount, Math.max(1, patients.length), simulatedPopulationCount);
      const averagePatientsPerClinician = Number((scaledPatientCount / Math.max(1, clinicianCount)).toFixed(1));
      const pressureIndex = roundScore(
        (scaledOverdueTaskCount * 2 + scaledAtRiskTaskCount + scaledPendingTaskCount * 0.5) / Math.max(1, clinicianCount)
      );

      return {
        role,
        roleLabel: roleLabels[role],
        clinicianCount,
        patientCount: scaledPatientCount,
        pendingTaskCount: scaledPendingTaskCount,
        atRiskTaskCount: scaledAtRiskTaskCount,
        overdueTaskCount: scaledOverdueTaskCount,
        doneTaskCount: scaledDoneTaskCount,
        averagePatientsPerClinician,
        pressureIndex,
        topClinicians: [...clinicianMap.values()]
          .sort((left, right) => right.patientCount - left.patientCount || right.overdueCount - left.overdueCount)
          .slice(0, 5)
          .map((item) => ({
            ...item,
            patientCount: scaleCount(item.patientCount, Math.max(1, patients.length), simulatedPopulationCount),
            overdueCount: scaleCount(item.overdueCount, Math.max(1, patients.length), simulatedPopulationCount)
          }))
      };
    });
  }

  private buildModelGovernanceSummary(patients: PopulationManagedPatient[]): PopulationModelGovernanceSummary {
    const models = ["TemporAI", "PyHealth", "Disease-Text"];
    const items: PopulationModelGovernanceItem[] = models.map((model) => {
      const scores = patients
        .map((patient) => patient.predictions.find((prediction) => prediction.model === model))
        .filter((prediction): prediction is PopulationModelPrediction => Boolean(prediction));
      const averageScore = roundScore(
        scores.reduce((total, prediction) => total + prediction.score, 0) / Math.max(1, scores.length)
      );
      const highRiskCount = scores.filter((prediction) => prediction.level === "high" || prediction.level === "critical")
        .length;
      const disagreementRate = safeDivide(
        patients.filter((patient) => {
          const patientScores = patient.predictions.map((prediction) => prediction.score);
          return Math.max(...patientScores) - Math.min(...patientScores) >= 15;
        }).length,
        patients.length
      );
      const governanceStatus: PopulationModelGovernanceItem["governanceStatus"] =
        disagreementRate >= 35 ? "investigate" : disagreementRate >= 20 ? "watch" : "stable";

      return {
        model,
        averageScore,
        highRiskCount,
        coverageRate: safeDivide(scores.length, patients.length),
        disagreementRate,
        governanceStatus,
        note:
          model === "TemporAI"
            ? "时序风险主导早期预警"
            : model === "PyHealth"
              ? "多模态 EHR 适合做综合分层"
              : "文本模型用于补充病历语义提示"
      };
    });

    const consensusScore = roundScore(items.reduce((total, item) => total + item.averageScore, 0) / Math.max(1, items.length));
    const disagreementRate = safeDivide(
      patients.filter((patient) => {
        const patientScores = patient.predictions.map((prediction) => prediction.score);
        return Math.max(...patientScores) - Math.min(...patientScores) >= 15;
      }).length,
      patients.length
    );
    const stableModelCount = items.filter((item) => item.governanceStatus === "stable").length;
    const watchModelCount = items.filter((item) => item.governanceStatus === "watch").length;
    const investigateModelCount = items.filter((item) => item.governanceStatus === "investigate").length;

    return {
      modelCount: items.length,
      consensusScore,
      disagreementRate,
      stableModelCount,
      watchModelCount,
      investigateModelCount,
      items
    };
  }

  private buildReferralMetrics(patients: PopulationManagedPatient[], simulatedPopulationCount: number) {
    const sampleSize = Math.max(1, patients.length);
    const referralSuggestedCount = patients.filter(
      (patient) => patient.managementTier === "intensive" || patient.overallRiskLevel === "critical"
    ).length;
    const referralCompletedCount = patients.filter(
      (patient) =>
        patient.interventionProjection.afterOverallScore <= patient.interventionProjection.beforeOverallScore - 8 ||
        patient.interventionProjection.afterLevel !== patient.interventionProjection.beforeLevel
    ).length;
    const consultationCount = patients.filter(
      (patient) => patient.overallRiskLevel !== "low" || patient.topDomains.length >= 2
    ).length;
    const mdtReviewCount = patients.filter(
      (patient) => patient.managementTier !== "routine" || patient.topDomains.length >= 2
    ).length;
    const closedLoopCount = patients.filter((patient) => patient.careGaps.length <= 2).length;

    return {
      referralSuggestedCount: scaleCount(referralSuggestedCount, sampleSize, simulatedPopulationCount),
      referralCompletedCount: scaleCount(referralCompletedCount, sampleSize, simulatedPopulationCount),
      consultationCount: scaleCount(consultationCount, sampleSize, simulatedPopulationCount),
      mdtReviewCount: scaleCount(mdtReviewCount, sampleSize, simulatedPopulationCount),
      closedLoopCount: scaleCount(closedLoopCount, sampleSize, simulatedPopulationCount),
      closedLoopRate: safeDivide(scaleCount(closedLoopCount, sampleSize, simulatedPopulationCount), simulatedPopulationCount)
    };
  }

  private buildPublicProfile(managedPatientCount: number): PopulationPublicProfile {
    const managedCoverageRate = Number(
      ((managedPatientCount / qixiaPublicPopulation.totalPopulation) * 100).toFixed(3)
    );

    return {
      districtName: "栖霞区",
      totalPopulation: qixiaPublicPopulation.totalPopulation,
      totalPopulationLabel: qixiaPublicPopulation.totalPopulationLabel,
      totalPopulationAsOf: qixiaPublicPopulation.totalPopulationAsOf,
      managedPatientCount,
      managedCoverageRate,
      sexDistribution: qixiaSexDistribution2020,
      ageDistribution: qixiaAgeDistribution2020,
      ageHighlights: [
        {
          title: "60 岁及以上人口",
          value: "16.58 万人",
          detail: "占常住人口 16.37%，为当前公开官方区级老龄人口口径。",
          sourceLabel: "栖霞区 2024 国民经济和社会发展统计公报",
          sourceUrl: "https://www.njqxq.gov.cn/qxqrmzf/qxqtjj/202504/t20250428_5137715.html",
          sourceDate: "2025-04-28"
        },
        {
          title: "0-6 岁儿童",
          value: "4.99 万人",
          detail: "占常住人口 4.92%，可用于评估家庭健康服务与早筛资源需求。",
          sourceLabel: "栖霞区 2024 国民经济和社会发展统计公报",
          sourceUrl: "https://www.njqxq.gov.cn/qxqrmzf/qxqtjj/202504/t20250428_5137715.html",
          sourceDate: "2025-04-28"
        }
      ],
      healthIndicators: [
        {
          title: "重大慢病过早死亡率",
          value: "8%",
          detail: "区级公开健康指标，可作为慢病防控总体成效参考，不等同于病种患病率。",
          sourceLabel: "栖霞区政府 2026 年卫生健康工作会议报道",
          sourceUrl: "https://www.njqxq.gov.cn/qxzx/zwyw/202603/t20260305_5800721.html",
          sourceDate: "2026-03-05"
        },
        {
          title: "家庭医生签约服务对象",
          value: "15.64 万人",
          detail: "公开报道口径，体现基层连续管理和慢病随访触达基础。",
          sourceLabel: "栖霞区 2025 年民生服务报道",
          sourceUrl: "https://www.njqxq.gov.cn/sjb2018/qxzx/zwyw/202507/t20250730_5618153.html",
          sourceDate: "2025-07-30"
        },
        {
          title: "重点人群联系率",
          value: "16.84 万人",
          detail: "区级基层健康联系人数，用于衡量慢病重点对象触达能力。",
          sourceLabel: "栖霞区 2025 年民生服务报道",
          sourceUrl: "https://www.njqxq.gov.cn/sjb2018/qxzx/zwyw/202507/t20250730_5618153.html",
          sourceDate: "2025-07-30"
        },
        {
          title: "医疗卫生机构",
          value: "313 家",
          detail: "包含医院、基层卫生机构与公共卫生机构，是区级医疗服务网络供给底盘。",
          sourceLabel: "栖霞区政府工作报告",
          sourceUrl: "https://www.njqxq.gov.cn/qxzx/zwyw/202603/t20260305_5800721.html",
          sourceDate: "2026-03-05"
        },
        {
          title: "社区卫生服务中心",
          value: "10 家",
          detail: "可直接映射为区级基层协同节点，是分级诊疗和慢病随访的基层入口能力。",
          sourceLabel: "栖霞区 2024 卫生健康工作会议报道",
          sourceUrl: "https://xl.nanjing.gov.cn/gzdt/202405/t20240506_4658517.html",
          sourceDate: "2024-05-06"
        },
        {
          title: "紧密型城市医疗集团结构",
          value: "1+8+1+10",
          detail: "省级牵头医院、8 家三级协作医院、1 家区医院、10 家社区卫生服务中心，适合做三级协同拓扑底图。",
          sourceLabel: "栖霞区紧密型城市医疗集团成立报道",
          sourceUrl: "https://www.njqxq.gov.cn/zmhd/xwfbh/20251229/",
          sourceDate: "2025-12-29"
        }
      ],
      systemUsableAssets: [
        {
          title: "常住人口底数",
          value: "101.78 万人",
          sourceLabel: "栖霞区 2024 国民经济和社会发展统计公报",
          sourceUrl: "https://www.njqxq.gov.cn/qxqrmzf/qxqtjj/202504/t20250428_5137715.html",
          usableModules: ["区级总览", "覆盖率驾驶舱", "医院绩效看板"],
          usableFields: ["publicProfile.totalPopulation", "districtOperations.managedCoverageRate", "hospitalCoverageRate"],
          integrationNote: "作为纳管覆盖率、医院覆盖率和随访触达率的统一分母口径。"
        },
        {
          title: "老年人口画像",
          value: "60 岁及以上 16.58 万人",
          sourceLabel: "栖霞区 2024 国民经济和社会发展统计公报",
          sourceUrl: "https://www.njqxq.gov.cn/qxqrmzf/qxqtjj/202504/t20250428_5137715.html",
          usableModules: ["认知障碍早筛", "老年慢病管理", "家庭医生优先队列"],
          usableFields: ["publicProfile.ageHighlights", "population.carePriority", "followup.priorityRules"],
          integrationNote: "可作为痴呆、心血管、复合慢病等老年重点对象的优先管理口径。"
        },
        {
          title: "儿童与家庭健康底数",
          value: "0-6 岁 4.99 万人",
          sourceLabel: "栖霞区 2024 国民经济和社会发展统计公报",
          sourceUrl: "https://www.njqxq.gov.cn/qxqrmzf/qxqtjj/202504/t20250428_5137715.html",
          usableModules: ["家庭健康服务", "基层签约触达", "健康宣教"],
          usableFields: ["publicProfile.ageHighlights", "operations.familyHealthCoverage"],
          integrationNote: "适合扩展母婴、家庭健康和社区宣教覆盖率口径。"
        },
        {
          title: "家庭医生签约服务对象",
          value: "15.64 万人",
          sourceLabel: "栖霞区 2025 年民生服务报道",
          sourceUrl: "https://www.njqxq.gov.cn/sjb2018/qxzx/zwyw/202507/t20250730_5618153.html",
          usableModules: ["基层触达率", "签约服务驾驶舱", "健康管理师工作台"],
          usableFields: ["districtOperations.generalPractitionerCoverageRate", "roleWorkload", "followup.contactablePopulation"],
          integrationNote: "可映射为基层连续管理能力和全科医生服务承载量的公开参照。"
        },
        {
          title: "重点人群联系人数",
          value: "16.84 万人",
          sourceLabel: "栖霞区 2025 年民生服务报道",
          sourceUrl: "https://www.njqxq.gov.cn/sjb2018/qxzx/zwyw/202507/t20250730_5618153.html",
          usableModules: ["提醒中心", "重点对象随访", "风险闭环追踪"],
          usableFields: ["followup.overdueBacklog", "coordinationFunnel.closedLoopCount", "publicProfile.healthIndicators"],
          integrationNote: "可作为重点对象池的公开基线，用于衡量区级提醒与随访闭环能力。"
        },
        {
          title: "医疗资源底盘",
          value: "313 家机构 / 10 家社区中心",
          sourceLabel: "栖霞区 2026 卫生健康工作会议 + 2024 卫生健康工作会议",
          sourceUrl: "https://www.njqxq.gov.cn/qxzx/zwyw/202603/t20260305_5800721.html",
          usableModules: ["医院网络地图", "三级协同拓扑", "资源分层展示"],
          usableFields: ["hospitalNetwork", "districtOperations.activeHospitalCount", "commandCenter.network"],
          integrationNote: "可作为首页医院网络、分层协同和区级资源分布的公开供给口径。"
        },
        {
          title: "慢病防控结果指标",
          value: "重大慢病过早死亡率 8%",
          sourceLabel: "栖霞区 2026 年卫生健康工作会议报道",
          sourceUrl: "https://www.njqxq.gov.cn/qxzx/zwyw/202603/t20260305_5800721.html",
          usableModules: ["区级绩效看板", "模型治理", "慢病防控总览"],
          usableFields: ["publicProfile.healthIndicators", "modelGovernance", "districtExecutivePanel"],
          integrationNote: "适合作为区级总体结果指标，不应用作单病种患病率或单患者预测特征。"
        },
        {
          title: "三级协同组织结构",
          value: "1+8+1+10 医疗集团",
          sourceLabel: "栖霞区紧密型城市医疗集团成立报道",
          sourceUrl: "https://www.njqxq.gov.cn/zmhd/xwfbh/20251229/",
          usableModules: ["三级诊疗协同", "转诊拓扑", "医院分层展示"],
          usableFields: ["coordinationFunnel", "referralMetrics", "commandCenter.network"],
          integrationNote: "可直接映射为省级牵头、三级协作、区医院与社区中心的网络拓扑。"
        }
      ],
      notes: [
        "人口总量采用 2024 年末官方常住人口 101.78 万人口径。",
        "年龄和性别结构采用第七次全国人口普查栖霞区口径，用于展示公开可获得的人口分层。",
        "未检索到栖霞区官方公开的分病种患病率表，页面中的病种比例仍来自本平台纳管队列模拟数据。",
        "公开资料接入字典只收录可直接进入本系统字段口径的公开数据，避免将宣传性文字误当成结构化业务指标。"
      ],
      sources: [
        {
          label: "栖霞区 2024 国民经济和社会发展统计公报",
          url: "https://www.njqxq.gov.cn/qxqrmzf/qxqtjj/202504/t20250428_5137715.html",
          note: "提供 2024 年末常住人口、60 岁及以上人口、0-6 岁儿童等官方口径。"
        },
        {
          label: "栖霞区第七次全国人口普查年龄金字塔",
          url: "https://www.hongheiku.com/xianjirank/jssxsq/9507.html",
          note: "提供 2020 年区级年龄与性别结构明细。"
        },
        {
          label: "栖霞区 2025 年民生服务报道",
          url: "https://www.njqxq.gov.cn/sjb2018/qxzx/zwyw/202507/t20250730_5618153.html",
          note: "提供家庭医生签约和重点人群联系等基层健康服务覆盖指标。"
        },
        {
          label: "栖霞区 2026 年卫生健康工作会议报道",
          url: "https://www.njqxq.gov.cn/qxzx/zwyw/202603/t20260305_5800721.html",
          note: "提供重大慢病过早死亡率和医疗卫生机构等公开指标。"
        },
        {
          label: "栖霞区 2024 年卫生健康工作会议报道",
          url: "https://xl.nanjing.gov.cn/gzdt/202405/t20240506_4658517.html",
          note: "提供社区卫生服务中心、床位数、卫生技术人员等资源供给指标。"
        },
        {
          label: "栖霞区紧密型城市医疗集团成立报道",
          url: "https://www.njqxq.gov.cn/zmhd/xwfbh/20251229/",
          note: "提供 1+8+1+10 紧密型城市医疗集团结构，适合映射为三级协同网络。"
        }
      ]
    };
  }

  private buildManagedPatient(index: number, template: PatientProfile, hospital: ReturnType<ChronicCarePlatform["listHospitals"]>[number]): PopulationManagedPatient {
    const sequence = index + 1;
    const seed = `${hospital.id}-${template.id}-${sequence}`;
    const random = createSeededRandom(seed);
    const age = clamp(template.age + Math.round(random() * 14 - 6), 42, 88);
    const systolicBp = clamp(template.vitals.systolicBp + Math.round(random() * 20 - 9), 108, 186);
    const diastolicBp = clamp(template.vitals.diastolicBp + Math.round(random() * 12 - 6), 66, 108);
    const bmi = roundScore(clamp(template.vitals.bmi + random() * 4 - 2, 20, 36));
    const steps = Math.round(clamp(template.lifestyle.averageDailySteps + random() * 2600 - 1300, 1200, 9200));
    const sleepHours = roundScore(clamp(template.lifestyle.averageSleepHours + random() * 1.6 - 0.8, 4.2, 8.4));
    const hba1c = roundScore(clamp((template.labs.hba1c ?? 6.1) + random() * 1.6 - 0.6, 5.4, 10.8));
    const fastingGlucose = roundScore(clamp((template.labs.fastingGlucose ?? 5.8) + random() * 1.8 - 0.5, 4.8, 12.2));
    const ldl = roundScore(clamp((template.labs.ldl ?? 2.4) + random() * 1.2 - 0.4, 1.4, 4.8));
    const egfr = roundScore(clamp((template.labs.egfr ?? 84) + random() * 18 - 9, 32, 105));
    const ntProbnp = Math.round(clamp((template.labs.ntProbnp ?? 120) + random() * 320 - 60, 40, 980));
    const mmseBase = template.chronicConditions.some((condition) => condition.name.includes("阿尔茨海默") || condition.name.includes("认知"))
      ? 24
      : 28;
    const mmse = roundScore(clamp(mmseBase + random() * 4 - 2, 16, 30));
    const spo2 = roundScore(clamp((template.vitals.oxygenSaturation ?? 97) + random() * 4 - 2, 89, 99));

    const cardio = roundScore(
      clamp(
        (systolicBp - 118) * 0.55 +
          (diastolicBp - 76) * 0.28 +
          (ldl - 2) * 12 +
          (ntProbnp / 30) +
          (template.chronicConditions.some((condition) => condition.code.startsWith("I")) ? 15 : 4) +
          (steps < 4000 ? 8 : 0),
        12,
        98
      )
    );
    const diabetes = roundScore(
      clamp(
        (hba1c - 5.8) * 17 +
          (fastingGlucose - 5.5) * 7 +
          (bmi - 24) * 2.4 +
          (template.chronicConditions.some((condition) => condition.code.startsWith("E11") || condition.code === "R73") ? 16 : 3),
        10,
        98
      )
    );
    const dementia = roundScore(
      clamp(
        (age - 55) * 1.25 +
          (27 - mmse) * 7 +
          (sleepHours < 6 ? 9 : 2) +
          (template.chronicConditions.some((condition) => condition.name.includes("阿尔茨海默") || condition.name.includes("认知")) ? 18 : 3),
        8,
        96
      )
    );
    const respiratory = roundScore(
      clamp(
        (95 - spo2) * 12 +
          (sleepHours < 6 ? 4 : 1) +
          (template.chronicConditions.some((condition) => condition.code.startsWith("J")) ? 18 : 2),
        6,
        95
      )
    );
    const sleep = roundScore(
      clamp(
        (6.8 - sleepHours) * 18 +
          (steps < 3500 ? 6 : 0) +
          (template.chronicConditions.some((condition) => condition.name.includes("睡眠") || condition.name.includes("失眠")) ? 18 : 4),
        12,
        97
      )
    );
    const renal = roundScore(
      clamp(
        (85 - egfr) * 1.4 +
          (systolicBp > 145 ? 8 : 0) +
          (template.chronicConditions.some((condition) => condition.name.includes("肾")) ? 16 : 3),
        8,
        96
      )
    );
    const metabolic = roundScore(
      clamp(
        (bmi - 23) * 4.4 +
          (ldl - 2) * 10 +
          (steps < 4500 ? 8 : 1) +
          (template.chronicConditions.some((condition) => condition.name.includes("肥胖") || condition.name.includes("代谢")) ? 14 : 3),
        10,
        98
      )
    );

    const radar: PopulationRiskVector = {
      cardiovascular: cardio,
      diabetes,
      dementia,
      respiratory,
      sleep,
      renal,
      metabolic
    };

    const topDomains = [...domainOrder].sort((left, right) => radar[right] - radar[left]).slice(0, 3);
    const overallScore = topDomains.reduce((total, domain) => total + radar[domain], 0) / topDomains.length;
    const overallRiskLevel = levelFromScore(overallScore);
    const managementTier =
      overallRiskLevel === "critical" || topDomains.some((domain) => radar[domain] >= 84)
        ? "intensive"
        : overallRiskLevel === "high"
          ? "enhanced"
          : "routine";

    const evidenceSources: PopulationEvidenceSource[] = [
      {
        id: "vital-bp",
        type: "vital",
        title: "生命体征",
        detail: `收缩压/舒张压 ${systolicBp}/${diastolicBp} mmHg，BMI ${bmi}`,
        relevance: roundScore((cardio + metabolic) / 2)
      },
      {
        id: "lab-core",
        type: "lab",
        title: "核心检验",
        detail: `HbA1c ${hba1c}% · 空腹血糖 ${fastingGlucose} mmol/L · LDL ${ldl} mmol/L`,
        relevance: roundScore((diabetes + metabolic) / 2)
      },
      {
        id: "wearable-behavior",
        type: "wearable",
        title: "行为证据",
        detail: `日均步数 ${steps}，平均睡眠 ${sleepHours}h，SpO2 ${spo2}%`,
        relevance: roundScore((sleep + respiratory + metabolic) / 3)
      },
      {
        id: "history-chronic",
        type: "history",
        title: "病史与慢病组合",
        detail: `${template.chronicConditions.map((condition) => condition.name).join("、")}；告警：${template.alerts.slice(0, 2).join("、")}`,
        relevance: roundScore((overallScore + cardio) / 2)
      },
      {
        id: "medication-adherence",
        type: "medication",
        title: "用药依从性",
        detail: `${template.medications.map((item) => `${item.name}(${item.adherence})`).join("，")}`,
        relevance: roundScore((overallScore + diabetes) / 2)
      },
      {
        id: `guideline-${topDomains[0]}`,
        type: "guideline",
        title: "临床路径规则",
        detail: guidelineSignals[topDomains[0]],
        relevance: radar[topDomains[0]]
      }
    ];

    const temporaiScore = roundScore(clamp(overallScore * 0.92 + (managementTier === "intensive" ? 4 : 0), 12, 99));
    const pyhealthScore = roundScore(clamp((cardio + diabetes + renal + metabolic) / 4, 10, 98));
    const diseaseTextScore = roundScore(clamp((sleep + dementia + respiratory) / 3 + 6, 10, 96));

    const predictions: PopulationModelPrediction[] = [
      {
        id: "temporai-30d",
        model: "TemporAI",
        target: `${domainLabels[topDomains[0]]} 30 天恶化风险`,
        horizon: "30 天",
        score: temporaiScore,
        level: levelFromScore(temporaiScore),
        explanation: `时间序列特征将 ${domainLabels[topDomains[0]]}、${domainLabels[topDomains[1]]} 风险放在主要恶化通道。`,
        evidenceIds: ["vital-bp", "lab-core", "wearable-behavior"]
      },
      {
        id: "pyhealth-90d",
        model: "PyHealth",
        target: "90 天综合再评估风险",
        horizon: "90 天",
        score: pyhealthScore,
        level: levelFromScore(pyhealthScore),
        explanation: "多模态 EHR 样本更强地捕捉到并病组合、依从性与既往慢病负担。",
        evidenceIds: ["history-chronic", "medication-adherence", "lab-core"]
      },
      {
        id: "disease-text",
        model: "Disease-Text",
        target: "病历文本慢病风险提示",
        horizon: "本次管理周期",
        score: diseaseTextScore,
        level: levelFromScore(diseaseTextScore),
        explanation: `文本症状、随访记录与告警提示更偏向 ${topDomains.map((domain) => domainLabels[domain]).join(" / ")}。`,
        evidenceIds: ["history-chronic", `guideline-${topDomains[0]}`]
      }
    ];

    const recommendedPackages = [...new Set(topDomains.flatMap((domain) => interventionPackages[domain].slice(0, 2)))];
    const careGaps = [
      steps < 4000 ? "运动执行不足" : null,
      sleepHours < 6 ? "睡眠干预待加强" : null,
      hba1c >= 7.0 ? "代谢指标仍未达标" : null,
      systolicBp >= 145 ? "血压复评频率需提升" : null,
      egfr < 60 ? "肾脏监测需纳入月度追踪" : null
    ].filter((item): item is string => Boolean(item));

    const interventionProjection = this.buildInterventionProjection({
      radar,
      topDomains,
      predictions,
      recommendedPackages,
      careGaps,
      sleepHours,
      steps,
      hba1c,
      systolicBp,
      egfr
    });

    return {
      id: `cohort-${String(sequence).padStart(3, "0")}`,
      name: `${familyNames[index % familyNames.length]}${givenNames[(index * 3) % givenNames.length]}`,
      gender: index % 2 === 0 ? "female" : "male",
      age,
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      primaryDoctor: template.primaryDoctor ?? null,
      responsibleClinician: template.responsibleClinician ?? template.primaryDoctor ?? null,
      managementTier,
      overallRiskLevel,
      topDomains,
      radar,
      diagnoses: template.chronicConditions.map((condition) => condition.name),
      nextFollowUpDate: `2026-04-${String((index % 18) + 6).padStart(2, "0")}`,
      recommendedPackages,
      careGaps,
      adherenceSummary: template.medications.some((item) => item.adherence !== "good") ? "存在依从性波动" : "依从性总体稳定",
      evidenceSources,
      predictions,
      interventionProjection,
      careProcess: this.buildCareProcess(topDomains, recommendedPackages),
      improvementRecords: this.buildImprovementRecords({
        systolicBp,
        hba1c,
        steps,
        sleepHours,
        beforeRadar: radar,
        afterRadar: interventionProjection.afterRadar
      }),
      roleFollowupPlans: this.buildRoleFollowupPlans(topDomains, recommendedPackages, careGaps),
      anchorPatientId: template.id
    };
  }

  private buildInterventionProjection(input: {
    radar: PopulationRiskVector;
    topDomains: DiseaseDomain[];
    predictions: PopulationModelPrediction[];
    recommendedPackages: string[];
    careGaps: string[];
    sleepHours: number;
    steps: number;
    hba1c: number;
    systolicBp: number;
    egfr: number;
  }): PopulationInterventionProjection {
    const baseImprovement: Record<DiseaseDomain, number> = {
      cardiovascular: 0,
      diabetes: 0,
      dementia: 0,
      respiratory: 0,
      sleep: 0,
      renal: 0,
      metabolic: 0
    };

    for (const domain of input.topDomains) {
      baseImprovement[domain] += 12;
    }

    if (input.recommendedPackages.some((item) => item.includes("运动") || item.includes("步行") || item.includes("肺康复"))) {
      baseImprovement.cardiovascular += 4;
      baseImprovement.diabetes += 5;
      baseImprovement.respiratory += 5;
      baseImprovement.metabolic += 6;
    }
    if (input.recommendedPackages.some((item) => item.includes("饮食") || item.includes("膳食") || item.includes("体重"))) {
      baseImprovement.diabetes += 6;
      baseImprovement.metabolic += 7;
      baseImprovement.cardiovascular += 3;
      baseImprovement.renal += 3;
    }
    if (input.recommendedPackages.some((item) => item.includes("睡眠"))) {
      baseImprovement.sleep += 9;
      baseImprovement.dementia += 4;
      baseImprovement.cardiovascular += 2;
    }
    if (input.recommendedPackages.some((item) => item.includes("照护者") || item.includes("认知"))) {
      baseImprovement.dementia += 7;
    }

    if (input.steps < 3500) {
      baseImprovement.metabolic += 2;
      baseImprovement.cardiovascular += 2;
    }
    if (input.sleepHours < 6) {
      baseImprovement.sleep += 3;
    }
    if (input.hba1c >= 7.5) {
      baseImprovement.diabetes += 3;
    }
    if (input.systolicBp >= 150) {
      baseImprovement.cardiovascular += 3;
    }
    if (input.egfr < 60) {
      baseImprovement.renal += 2;
    }

    const afterRadar = { ...input.radar };
    for (const domain of domainOrder) {
      const floor = domain === input.topDomains[0] ? 18 : 12;
      afterRadar[domain] = roundScore(clamp(input.radar[domain] - baseImprovement[domain], floor, 98));
    }

    const beforeOverallScore = averageFromVector(input.radar, input.topDomains);
    const afterOverallScore = averageFromVector(afterRadar, input.topDomains);
    const week4Radar = interpolateRadar(input.radar, afterRadar, 0.38);
    const week8Radar = interpolateRadar(input.radar, afterRadar, 0.72);

    return {
      packageTitles: input.recommendedPackages,
      adherenceAssumption: "假设治疗包执行率 70%，连续 12 周",
      projectedFollowUpWindow: "12 周复评",
      beforeRadar: input.radar,
      afterRadar,
      beforeOverallScore,
      afterOverallScore,
      beforeLevel: levelFromScore(beforeOverallScore),
      afterLevel: levelFromScore(afterOverallScore),
      domainEffects: domainOrder.map((domain) => ({
        domain,
        before: input.radar[domain],
        after: afterRadar[domain],
        delta: roundScore(afterRadar[domain] - input.radar[domain]),
        reasons: [
          input.topDomains.includes(domain) ? `重点执行 ${domainLabels[domain]} 领域治疗包` : `接受联动管理带来次级收益`,
          input.recommendedPackages[0] ? `主要依赖 ${input.recommendedPackages[0]}` : "依赖常规随访"
        ]
      })),
      timelineCheckpoints: [
        {
          week: 0,
          label: "启动前",
          overallScore: beforeOverallScore,
          overallLevel: levelFromScore(beforeOverallScore),
          radar: input.radar,
          keyChanges: ["完成风险分层与治疗包配置", "形成三方协同管理档案"]
        },
        {
          week: 4,
          label: "4 周",
          overallScore: averageFromVector(week4Radar, input.topDomains),
          overallLevel: levelFromScore(averageFromVector(week4Radar, input.topDomains)),
          radar: week4Radar,
          keyChanges: ["行为执行率进入稳定期", "血压/步数通常先出现早期改善"]
        },
        {
          week: 8,
          label: "8 周",
          overallScore: averageFromVector(week8Radar, input.topDomains),
          overallLevel: levelFromScore(averageFromVector(week8Radar, input.topDomains)),
          radar: week8Radar,
          keyChanges: ["睡眠与依从性进入巩固期", "全科与管理师联合复核 care gaps"]
        },
        {
          week: 12,
          label: "12 周",
          overallScore: afterOverallScore,
          overallLevel: levelFromScore(afterOverallScore),
          radar: afterRadar,
          keyChanges: ["达到本轮治疗包复评节点", "专科决定是否继续强化或降级管理"]
        }
      ],
      modelProjection: input.predictions.map((prediction) => {
        const afterScore = roundScore(
          clamp(
            prediction.model === "TemporAI"
              ? prediction.score - 12
              : prediction.model === "PyHealth"
                ? prediction.score - 10
                : prediction.score - 8,
            8,
            98
          )
        );
        return {
          model: prediction.model,
          beforeScore: prediction.score,
          afterScore,
          delta: roundScore(afterScore - prediction.score)
        };
      }),
      recommendations: [
        `优先执行：${input.recommendedPackages.slice(0, 2).join("、")}`,
        input.careGaps.length ? `首先弥补：${input.careGaps.slice(0, 2).join("、")}` : "优先维持已建立的依从性",
        `建议在 ${input.topDomains.map((domain) => domainLabels[domain]).join(" / ")} 领域做 12 周复评`
      ]
    };
  }

  private buildCareProcess(topDomains: DiseaseDomain[], recommendedPackages: string[]): PopulationCareProcessEntry[] {
    return [
      {
        date: "2026-03-10",
        week: 0,
        weekLabel: "Week 0",
        phase: "intake" as const,
        actor: "system" as const,
        title: "完成初筛建档",
        summary: `系统归集病史、检验、可穿戴和既往随访记录，识别 ${topDomains.map((domain) => domainLabels[domain]).join(" / ")} 风险。`,
        explanation: "用于形成统一纵向画像，避免专科、全科和管理师使用不同版本信息。"
      },
      {
        date: "2026-03-12",
        week: 0,
        weekLabel: "Week 0",
        phase: "risk-stratification" as const,
        actor: "general-practitioner" as const,
        title: "完成家庭医生分层",
        summary: "全科医生确认重点慢病、依从性和近期随访频率，纳入基层随访池。",
        explanation: "基层负责长期跟踪，先把高频问题和可执行缺口固定下来。"
      },
      {
        date: "2026-03-15",
        week: 0,
        weekLabel: "Week 0",
        phase: "package-initiation" as const,
        actor: "health-manager" as const,
        title: "启动治疗包",
        summary: `已启动 ${recommendedPackages.slice(0, 3).join("、")}。`,
        explanation: "健康管理师负责把建议转成患者能执行的日常动作和提醒机制。"
      },
      {
        date: "2026-04-12",
        week: 4,
        weekLabel: "Week 4",
        phase: "follow-up" as const,
        actor: "health-manager" as const,
        title: "4 周行为执行复盘",
        summary: `健康管理师复盘 ${recommendedPackages.slice(0, 2).join("、")} 的执行率，并记录早期改善。`,
        explanation: "4 周节点重点确认患者是否真正开始执行治疗包。"
      },
      {
        date: "2026-05-10",
        week: 8,
        weekLabel: "Week 8",
        phase: "mdt-review" as const,
        actor: "tertiary-specialist" as const,
        title: "8 周专科联合复核",
        summary: `三甲专科医生复核 ${topDomains[0] ? domainLabels[topDomains[0]] : "重点领域"} 风险轨迹，并决定是否维持当前路径。`,
        explanation: "8 周节点通常用于判断是否需要升级治疗或发起 MDT。"
      },
      {
        date: "2026-06-07",
        week: 12,
        weekLabel: "Week 12",
        phase: "reassessment" as const,
        actor: "system" as const,
        title: "12 周阶段性复评",
        summary: "系统对模型分值、关键指标和执行率做前后对比，输出本轮改善结论。",
        explanation: "12 周节点用于确认风险是否跨层下降，并决定后续随访策略。"
      }
    ];
  }

  private buildImprovementRecords(input: {
    systolicBp: number;
    hba1c: number;
    steps: number;
    sleepHours: number;
    beforeRadar: PopulationRiskVector;
    afterRadar: PopulationRiskVector;
  }): PopulationImprovementRecord[] {
    const improvedBp = Math.max(118, Math.round(input.systolicBp - 10));
    const improvedA1c = roundScore(Math.max(5.8, input.hba1c - 0.7));
    const improvedSteps = input.steps + 1800;
    const improvedSleep = roundScore(Math.min(7.4, input.sleepHours + 0.8));
    const week4Bp = Math.max(122, Math.round(input.systolicBp - 5));
    const week8Steps = input.steps + 1200;
    const week8Sleep = roundScore(Math.min(7.1, input.sleepHours + 0.5));
    const week12Risk = averageFromVector(input.afterRadar, domainOrder.slice(0, 3));

    return [
      {
        week: 4,
        weekLabel: "Week 4",
        metric: "收缩压",
        before: `${input.systolicBp} mmHg`,
        current: `${week4Bp} mmHg`,
        trend: week4Bp < input.systolicBp ? "improved" : "stable",
        explanation: "4 周时通常先看到家庭血压和体感症状的早期改善。"
      },
      {
        week: 8,
        weekLabel: "Week 8",
        metric: "日均步数",
        before: `${input.steps} 步`,
        current: `${week8Steps} 步`,
        trend: "improved",
        explanation: "8 周后运动处方执行更稳定，活动量进入可持续阶段。"
      },
      {
        week: 8,
        weekLabel: "Week 8",
        metric: "平均睡眠",
        before: `${input.sleepHours} h`,
        current: `${week8Sleep} h`,
        trend: week8Sleep > input.sleepHours ? "improved" : "stable",
        explanation: "睡眠改善包在 8 周节点更容易出现连续性提升。"
      },
      {
        week: 12,
        weekLabel: "Week 12",
        metric: "糖化血红蛋白",
        before: `${input.hba1c}%`,
        current: `${improvedA1c}%`,
        trend: improvedA1c < input.hba1c ? "improved" : "watch",
        explanation: "12 周复评更适合观察代谢指标的稳定下降。"
      },
      {
        week: 12,
        weekLabel: "Week 12",
        metric: "综合风险",
        before: `${averageFromVector(input.beforeRadar, domainOrder.slice(0, 3))}`,
        current: `${week12Risk}`,
        trend: "improved",
        explanation: "12 周综合复评用于判断是否从高风险降到中风险或常规管理层。"
      }
    ];
  }

  private buildRoleFollowupPlans(
    topDomains: DiseaseDomain[],
    recommendedPackages: string[],
    careGaps: string[]
  ): PopulationRoleFollowupPlan[] {
    return [
      {
        role: "tertiary-specialist" as const,
        title: "三甲专科医生",
        focus: [`重点盯住 ${domainLabels[topDomains[0]]}`, `复核 ${domainLabels[topDomains[1] ?? topDomains[0]]} 是否需要升级治疗`],
        followUpTasks: [
          "判定是否需要调整专科用药或追加检查",
          "对复杂病例给出路径修订意见",
          "对高风险患者决定是否再次 MDT"
        ],
        supervisionTips: ["重点看风险是否真正跨层下降", "如果 4 周内无改善，提前升级专科干预"],
        todoList: [
          {
            title: "复核 8 周风险轨迹",
            dueLabel: "2026-05-10",
            status: "pending",
            note: `重点查看 ${domainLabels[topDomains[0]]} 风险是否下降`
          },
          {
            title: "确认是否需要 MDT",
            dueLabel: "2026-05-12",
            status: "at-risk",
            note: "若改善不足则发起多学科会诊"
          }
        ]
      },
      {
        role: "general-practitioner" as const,
        title: "全科医生",
        focus: ["负责基层连续随访", careGaps[0] ?? "维持已建立随访节奏"],
        followUpTasks: [
          "每周核对家庭监测与症状变化",
          "根据执行情况调整复诊频率",
          "把基层随访结果及时回填到统一档案"
        ],
        supervisionTips: ["把异常趋势尽早上送区级/专科", "优先处理依从性与可执行性问题"],
        todoList: [
          {
            title: "完成 4 周基层随访",
            dueLabel: "2026-04-12",
            status: "done",
            note: "已记录血压、症状和家庭监测"
          },
          {
            title: "安排 8 周复诊",
            dueLabel: "2026-05-08",
            status: "pending",
            note: "对照治疗包执行率调整随访节奏"
          }
        ]
      },
      {
        role: "health-manager" as const,
        title: "健康管理师",
        focus: [`督促执行 ${recommendedPackages.slice(0, 2).join("、")}`, "追踪生活方式和服药执行率"],
        followUpTasks: [
          "电话/线上督促治疗包执行",
          "记录步数、睡眠、饮食和复诊完成情况",
          "对中断执行的患者做提醒和重启干预"
        ],
        supervisionTips: ["把建议转成患者可执行的日常动作", "每次随访都要留痕并说明改善原因"],
        todoList: [
          {
            title: "催办本周步数上传",
            dueLabel: "今天",
            status: "overdue",
            note: "患者连续 3 天未上传运动数据"
          },
          {
            title: "完成睡眠包执行回访",
            dueLabel: "本周五",
            status: "pending",
            note: "确认患者是否按计划执行睡前行为干预"
          }
        ]
      }
    ];
  }
}
