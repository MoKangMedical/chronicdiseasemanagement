import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ChronicCarePlatform } from "../src/services/chronic-care-platform.js";
import { DataAdapterService } from "../src/services/data-adapter-service.js";
import { EcosystemService } from "../src/services/ecosystem-service.js";
import { GithubCapabilityService } from "../src/services/github-capability-service.js";
import { LocalPredictionService } from "../src/services/local-prediction-service.js";
import { MedClawService } from "../src/services/medclaw-service.js";
import { PopulationManagementService } from "../src/services/population-management-service.js";
import type { HospitalId, PatientProfile, RiskLevel, WorkbenchRole } from "../src/types.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "..");
const publicDir = path.join(projectRoot, "public");
const pagesDistDir = path.join(projectRoot, "pages-dist");
const publicSourcesDir = path.join(projectRoot, "src", "data", "public-sources");

const brand = {
  shortName: "慢康智枢",
  englishName: "ChroniCare OS",
  fullName: "慢康智枢 ChroniCare OS",
  tagline: "Hospital Chronic Care Command Console"
};

const workbenchRoles: Array<WorkbenchRole | undefined> = [
  undefined,
  "specialist-doctor",
  "general-practitioner",
  "health-manager"
];

function filterKey(hospitalId?: HospitalId, workbenchRole?: WorkbenchRole): string {
  return `${hospitalId ?? "all"}|${workbenchRole ?? "all"}`;
}

function workspaceKey(patientId: string, workbenchRole?: WorkbenchRole): string {
  return `${patientId}|${workbenchRole ?? "all"}`;
}

function toStaticHtml(source: string): string {
  return source
    .replace('data-app-mode="live"', 'data-app-mode="static"')
    .replace(
      "window.__APP_CONFIG__ = window.__APP_CONFIG__ || {",
      `window.__APP_CONFIG__ = {
        mode: "static",
        snapshotPath: "./demo-data/pages-snapshot.json",
        populationPath: "./demo-data/population-cohort.json",
        publicDataPath: "./demo-data/qixia-public-data.json",
        repo: "MoKangMedical/chronicdiseasemanagement",
        projectName: "${brand.fullName}",
        readOnlyMessage: "GitHub Pages 演示站为只读模式"
      };
      window.__APP_CONFIG__ = window.__APP_CONFIG__ || {`
    );
}

function riskScore(level: RiskLevel): number {
  return {
    low: 0.24,
    medium: 0.49,
    high: 0.76,
    critical: 0.91
  }[level];
}

function buildFallbackPredictionSuite(patient: PatientProfile, workspace: any, integratedOutput: any) {
  const liveRisk = workspace.liveRiskAssessment;
  const topDomain = liveRisk.domainAssessments[0];
  const score = riskScore(liveRisk.level);
  const sampleCount = 8;
  const positiveRate = Number((score * 0.55).toFixed(2));

  return {
    inputSummary: {
      conditions: patient.chronicConditions.map((item) => item.name),
      alerts: patient.alerts,
      observationsUsed: integratedOutput.healthChain.resources
        .filter((resource: any) => resource.resourceType === "Observation")
        .slice(0, 6)
        .map((resource: any) => resource.code?.text ?? resource.id)
    },
    featureEngineering: {
      temporalSeriesPoints: integratedOutput.healthKit.rawObservations.length,
      temporalSignals: integratedOutput.healthKit.rawObservations.map((item: any) => item.kind),
      textFeatureTerms: patient.alerts.concat(patient.chronicConditions.map((item) => item.name))
    },
    runtime: {
      python: "static-pages-snapshot",
      packages: {
        temporai: {
          available: true,
          version: "snapshot",
          note: "GitHub Pages 静态快照，完整训练链请访问 Render/Railway 部署版"
        },
        pyhealth: {
          available: true,
          version: "snapshot",
          note: "已导出训练摘要与指标"
        },
        "disease-prediction": {
          available: true,
          version: "snapshot",
          note: "文本疾病分类结果来自静态演示快照"
        }
      }
    },
    pipelines: {
      temporai: {
        plugin: "prediction.one_off.classification.nn_classifier",
        preprocessors: ["ffill", "ts_standard_scaler"],
        cohortSize: sampleCount,
        timeSeriesRows: integratedOutput.healthKit.rawObservations.length,
        timeSeriesFeatureCount: 4,
        timeToEventPlugin: "time_to_event.ts_xgb",
        timeToEventHorizons: [7, 30, 90],
        timeToEventHorizonScores: {
          7: Number(Math.max(0.12, score - 0.14).toFixed(2)),
          30: Number(score.toFixed(2)),
          90: Number(Math.min(0.98, score + 0.08).toFixed(2))
        },
        timeToEventByDomain: {
          [topDomain.domain]: {
            sampleCount,
            eventCount: Math.max(1, Math.round(sampleCount * positiveRate)),
            horizonScores: {
              7: Number(Math.max(0.12, score - 0.14).toFixed(2)),
              30: Number(score.toFixed(2)),
              90: Number(Math.min(0.98, score + 0.08).toFixed(2))
            }
          }
        },
        timeToEventManifest: `static-pages://temporai/${patient.id}/time-to-event.json`
      },
      pyhealth: {
        datasetName: "chronic_multimodal_dataset",
        taskName: "chronic_multimodal_risk",
        model: "RNN",
        trainer: "pyhealth.trainer.Trainer",
        sampleCount,
        patientCount: sampleCount,
        visitCount: sampleCount * 2,
        positiveLabelRate: positiveRate,
        epochs: 6,
        batchSize: 4,
        loss: Number((1 - score / 2).toFixed(4)),
        split: {
          train: 5,
          val: 2,
          test: 1
        },
        monitor: "pr_auc",
        bestCheckpoint: `static-pages://pyhealth/${patient.id}/best.ckpt`,
        lastCheckpoint: `static-pages://pyhealth/${patient.id}/last.ckpt`,
        metricsManifest: `static-pages://pyhealth/${patient.id}/metrics.json`,
        validationMetrics: {
          pr_auc: Number(Math.max(0.62, score).toFixed(3)),
          roc_auc: Number(Math.max(0.68, score + 0.04).toFixed(3))
        },
        testMetrics: {
          pr_auc: Number(Math.max(0.6, score - 0.03).toFixed(3)),
          roc_auc: Number(Math.max(0.66, score + 0.01).toFixed(3))
        },
        featureKeys: ["conditions", "procedures", "drugs"],
        conditionVocabularySize: patient.chronicConditions.length + 6,
        procedureVocabularySize: 9,
        drugVocabularySize: Math.max(3, patient.medications.length + 2)
      }
    },
    predictions: [
      {
        provider: "TemporAI",
        task: `${topDomain.label} time-to-event risk`,
        level: liveRisk.level,
        score,
        explanation: `${topDomain.label} 是当前最高风险领域，静态演示展示 7/30/90 天事件曲线。`,
        recommendedActions: topDomain.drivers.slice(0, 3)
      },
      {
        provider: "PyHealth",
        task: "chronic multimodal classification",
        level: liveRisk.level,
        score: Number(Math.min(0.98, score + 0.03).toFixed(2)),
        explanation: "RNN 基于多模态慢病样本输出综合风险分层。",
        recommendedActions: workspace.roleView.quickActions.slice(0, 3)
      },
      {
        provider: "disease-prediction",
        task: "text risk classification",
        level: topDomain.level,
        score: Number(Math.max(0.3, score - 0.05).toFixed(2)),
        explanation: `文本侧重点聚焦于${patient.alerts[0] ?? patient.chronicConditions[0]?.name ?? "慢病管理"}相关提示词。`,
        recommendedActions: ["补齐病史追问", "对齐重点随访字段", "生成专科复评建议"]
      }
    ]
  };
}

async function buildPredictionSuite(
  patientId: string,
  patient: PatientProfile,
  workspace: any,
  integratedOutput: any
) {
  if (process.env.PAGES_INCLUDE_LIVE_PREDICTIONS === "1") {
    try {
      const liveService = new LocalPredictionService();
      return await liveService.predictPatient(patientId);
    } catch (error) {
      console.warn(`[pages] live prediction unavailable for ${patientId}:`, error);
    }
  }

  return buildFallbackPredictionSuite(patient, workspace, integratedOutput);
}

async function seedDemoData(platform: ChronicCarePlatform) {
  platform.reset();
  const patients = platform.listPatients();

  for (const patient of patients) {
    await platform.runWorkflow({ patientId: patient.id });
  }

  const primaryPatient = patients[0];
  const meetings = platform.listMdtMeetings(primaryPatient.id);
  const firstMeeting = meetings[0];

  if (firstMeeting?.status === "open" && firstMeeting.participantIds.length >= 2) {
    platform.addMdtMeetingMessage(firstMeeting.id, {
      clinicianId: firstMeeting.participantIds[0],
      message: "建议优先处理血压、血糖和运动执行度三个主驱动因素。"
    });
    platform.addMdtMeetingMessage(firstMeeting.id, {
      clinicianId: firstMeeting.participantIds[1],
      message: "同步补充饮食与睡眠方案，并在两周后复评依从性。"
    });
    await platform.closeMdtMeeting(firstMeeting.id, {
      decision: "继续执行整合慢病管理计划，先完成两周强化干预，再做多学科复盘。",
      followUpActions: ["2 周内健康管理师电话随访", "4 周内复查关键指标", "必要时复开 MDT 会议"]
    });
  }

  platform.createMdtMeeting({
    patientId: primaryPatient.id,
    topic: `${primaryPatient.name} GitHub Pages 静态演示会诊`,
    workflowId: null
  });
}

async function main() {
  const platform = new ChronicCarePlatform();
  const medclaw = new MedClawService();
  const ecosystem = new EcosystemService();
  const githubCapabilities = new GithubCapabilityService();
  const adapters = new DataAdapterService();
  const population = new PopulationManagementService(platform);

  medclaw.reset();
  adapters.reset();
  await seedDemoData(platform);

  const hospitals = platform.listHospitals();
  const patients = platform.listPatients();
  const hospitalIds: Array<HospitalId | undefined> = [undefined, ...hospitals.map((item) => item.id)];

  const dashboards: Record<string, unknown> = {};
  const clinicians: Record<string, unknown> = {};
  const workspaces: Record<string, unknown> = {};
  const medclawWorkspaces: Record<string, unknown> = {};
  const ecosystemJourneys: Record<string, unknown> = {};
  const githubPlans: Record<string, unknown> = {};
  const integrations: Record<string, unknown> = {};
  const predictions: Record<string, unknown> = {};

  for (const hospitalId of hospitalIds) {
    for (const role of workbenchRoles) {
      dashboards[filterKey(hospitalId, role)] = platform.getDashboardData({
        hospitalId,
        workbenchRole: role
      });
      clinicians[filterKey(hospitalId, role)] = platform.listClinicians({
        hospitalId,
        workbenchRole: role
      });
    }

  }

  const populationCohort = population.getCohortSnapshot();

  for (const patient of patients) {
    ecosystemJourneys[patient.id] = ecosystem.getPatientJourney(patient.id);
    githubPlans[patient.id] = githubCapabilities.getPatientPlan(patient.id);

    const adapted = adapters.buildIntegratedOutput(patient.id);
    integrations[patient.id] = {
      ...adapted,
      smart: {
        ...adapted.smart,
        fhirBaseUrl: "完整 SMART on FHIR 服务需访问 Render / Railway 部署版",
        authorizeUrl: "完整 SMART on FHIR 服务需访问 Render / Railway 部署版",
        tokenUrl: "完整 SMART on FHIR 服务需访问 Render / Railway 部署版"
      }
    };

    for (const role of workbenchRoles) {
      workspaces[workspaceKey(patient.id, role)] = platform.getPatientWorkspace(patient.id, role);
      medclawWorkspaces[workspaceKey(patient.id, role)] = medclaw.getPatientWorkspace(patient.id, role ?? "health-manager");
    }

    predictions[patient.id] = await buildPredictionSuite(
      patient.id,
      patient,
      workspaces[workspaceKey(patient.id, "health-manager")],
      integrations[patient.id]
    );
  }

  const snapshot = {
    meta: {
      brand,
      repo: "MoKangMedical/chronicdiseasemanagement",
      deployedUrl: "https://mokangmedical.github.io/chronicdiseasemanagement/",
      exportedAt: new Date().toISOString(),
      defaultPatientId: patients[0]?.id ?? null,
      readOnlyMessage: "GitHub Pages 演示站为只读模式；工作流执行、SMART on FHIR 授权和模型训练请使用 Render 或 Railway 部署版。"
    },
    demoSummary: platform.getDemoSummary(),
    seed: {
      hospitals,
      mappings: platform.listHisMappings(),
      allClinicians: platform.listClinicians(),
      medclawOverview: medclaw.getPlatformOverview(),
      ecosystemOverview: ecosystem.getOverview(),
      githubOverview: githubCapabilities.getOverview()
    },
    dashboards,
    clinicians,
    workspaces,
    medclawWorkspaces,
    ecosystemJourneys,
    githubPlans,
    integrations,
    predictions
  };

  await rm(pagesDistDir, { recursive: true, force: true });
  await mkdir(path.join(pagesDistDir, "demo-data"), { recursive: true });
  await cp(publicDir, pagesDistDir, { recursive: true });

  const staticHtmlPages = ["index.html", "followups-hospital.html", "followups-clinician.html", "public-data-config.html"];
  let pagesIndex = "";

  for (const fileName of staticHtmlPages) {
    const filePath = path.join(pagesDistDir, fileName);
    const sourceHtml = await readFile(filePath, "utf8");
    const staticHtml = toStaticHtml(sourceHtml);
    await writeFile(filePath, staticHtml, "utf8");
    if (fileName === "index.html") {
      pagesIndex = staticHtml;
    }
  }

  await writeFile(path.join(pagesDistDir, "404.html"), pagesIndex, "utf8");
  await writeFile(path.join(pagesDistDir, "demo-data", "pages-snapshot.json"), JSON.stringify(snapshot, null, 2), "utf8");
  await writeFile(
    path.join(pagesDistDir, "demo-data", "population-cohort.json"),
    JSON.stringify(populationCohort, null, 2),
    "utf8"
  );
  await cp(path.join(publicSourcesDir, "qixia", "qixia-public-data.json"), path.join(pagesDistDir, "demo-data", "qixia-public-data.json"));
  await writeFile(path.join(pagesDistDir, ".nojekyll"), "", "utf8");

  console.log(`[pages] built static site for ${brand.fullName} at ${pagesDistDir}`);
}

main().catch((error) => {
  console.error("[pages] build failed", error);
  process.exitCode = 1;
});
