const appConfig = window.__APP_CONFIG__ ?? {};
const pageMode = document.body.dataset.page || "home";
const pageQuery = new URLSearchParams(window.location.search);
const isHomePage = pageMode === "home";
const isHospitalFollowupsPage = pageMode === "followups-hospital";
const isClinicianFollowupsPage = pageMode === "followups-clinician";
const isPatientAppPage = pageMode === "patient-app";
const isPublicDataConfigPage = pageMode === "public-data-config";
const isFollowupsPage = isHospitalFollowupsPage || isClinicianFollowupsPage || pageMode === "followups";
const isWallboardMode = isHomePage && pageQuery.get("display") === "wallboard";
const isStaticMode = appConfig.mode === "static";
const snapshotPath = appConfig.snapshotPath ?? "./demo-data/pages-snapshot.json";
const populationPath = appConfig.populationPath ?? "./demo-data/population-cohort.json";
const publicDataPath = appConfig.publicDataPath ?? "./demo-data/qixia-public-data.json";
const qixiaDistrictName = "栖霞区";
let snapshotPromise = null;
let populationPromise = null;
let publicDataPromise = null;

const state = {
  dashboard: null,
  hospitals: [],
  mappings: [],
  patientId: null,
  workspace: null,
  medclawOverview: null,
  medclawWorkspace: null,
  ecosystemOverview: null,
  ecosystemJourney: null,
  githubOverview: null,
  publicDataView: "source",
  publicDataSourceFilter: "all",
  publicDataModuleFilter: "all",
  publicDataDrafts: {},
  publicDataSelectedAsset: "",
  publicSourceData: null,
  dynamicHospitalFocusId: "",
  wallboardTimers: [],
  districtAgentTimer: null,
  districtAgentAutoplayPaused: pageQuery.get("autostart") === "0",
  districtAgentActiveIndex: 0,
  districtAgentPhaseIndex: 0,
  overviewSelectedDomain: "",
  overviewSelectedFunnelStage: "",
  githubPlan: null,
  populationDistrictCohort: null,
  populationCohort: null,
  populationPatientId: null,
  populationCheckpointWeek: 12,
  populationAnimatedRadar: null,
  populationAnimationFrom: null,
  populationLastPatientId: null,
  adapterOutput: null,
  predictionSuite: null,
  allClinicians: [],
  clinicians: [],
  activeMeetingId: null,
  filters: {
    hospitalId: "",
    workbenchRole: "health-manager"
  },
  followupGroupBy: "hospital",
  followupStatus: "active",
  followupClinician: "",
  clinicianTab: "my-todos",
  hospitalWorkbenchEntityView: "hospital",
  hospitalWorkbenchSelectedEntityType: "",
  hospitalWorkbenchSelectedEntity: "",
  patientViewMode: "anomaly",
  patientRiskFilter: "high",
  patientDiseaseFilter: "",
  patientSortBy: "priority",
  patientPage: 1,
  selectedPatientTableIds: []
};

function deepClone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function filterKey(hospitalId, workbenchRole) {
  return `${hospitalId || "all"}|${workbenchRole || "all"}`;
}

function workspaceKey(patientId, workbenchRole) {
  return `${patientId}|${workbenchRole || "all"}`;
}

function shouldLoadWorkspacePage() {
  return isHomePage || isClinicianFollowupsPage;
}

function syncActivePatient(patientId) {
  if (!patientId) return;
  state.populationPatientId = patientId;
  state.patientId = patientId;
}

async function loadSnapshot() {
  if (!snapshotPromise) {
    snapshotPromise = fetch(snapshotPath).then(async (response) => {
      if (!response.ok) {
        throw new Error(`无法加载静态演示快照：${response.status}`);
      }
      return response.json();
    });
  }

  return snapshotPromise;
}

async function loadPopulationSnapshot() {
  if (!populationPromise) {
    populationPromise = fetch(populationPath).then(async (response) => {
      if (!response.ok) {
        throw new Error(`无法加载人群快照：${response.status}`);
      }
      return response.json();
    });
  }

  return populationPromise;
}

async function loadPublicSourceSnapshot() {
  if (!publicDataPromise) {
    publicDataPromise = fetch(publicDataPath).then(async (response) => {
      if (!response.ok) {
        throw new Error(`无法加载公开资料快照：${response.status}`);
      }
      return response.json();
    });
  }

  return publicDataPromise;
}

async function resolveStaticApi(path, options = {}) {
  const method = (options.method ?? "GET").toUpperCase();
  const snapshot = await loadSnapshot();

  if (method !== "GET") {
    throw new Error(snapshot.meta?.readOnlyMessage ?? "GitHub Pages 演示站为只读模式");
  }

  const url = new URL(path, window.location.origin);
  const pathname = url.pathname;
  const hospitalId = url.searchParams.get("hospitalId") ?? "";
  const workbenchRole = url.searchParams.get("workbenchRole") ?? "";

  if (pathname === "/api/hospitals") return deepClone(snapshot.seed.hospitals);
  if (pathname === "/api/his/mappings") return deepClone(snapshot.seed.mappings);
  if (pathname === "/api/medclaw/overview") return deepClone(snapshot.seed.medclawOverview);
  if (pathname === "/api/ecosystem/overview") return deepClone(snapshot.seed.ecosystemOverview);
  if (pathname === "/api/github-capabilities/overview") return deepClone(snapshot.seed.githubOverview);
  if (pathname === "/api/population/cohort") {
    const populationSnapshot = await loadPopulationSnapshot();
    return deepClone(populationSnapshot);
  }
  if (pathname === "/api/public-sources/qixia") {
    const publicSourceSnapshot = await loadPublicSourceSnapshot();
    return deepClone(publicSourceSnapshot);
  }
  if (pathname === "/api/dashboard") {
    return deepClone(snapshot.dashboards[filterKey(hospitalId, workbenchRole)] ?? snapshot.dashboards["all|all"]);
  }
  if (pathname === "/api/clinicians") {
    return deepClone(snapshot.clinicians[filterKey(hospitalId, workbenchRole)] ?? snapshot.clinicians["all|all"]);
  }

  const patientWorkspaceMatch = pathname.match(/^\/api\/patients\/([^/]+)\/workspace$/);
  if (patientWorkspaceMatch) {
    return deepClone(
      snapshot.workspaces[workspaceKey(patientWorkspaceMatch[1], workbenchRole)] ??
        snapshot.workspaces[workspaceKey(patientWorkspaceMatch[1], "all")]
    );
  }

  const medclawWorkspaceMatch = pathname.match(/^\/api\/medclaw\/patients\/([^/]+)\/workspace$/);
  if (medclawWorkspaceMatch) {
    return deepClone(
      snapshot.medclawWorkspaces[workspaceKey(medclawWorkspaceMatch[1], workbenchRole)] ??
        snapshot.medclawWorkspaces[workspaceKey(medclawWorkspaceMatch[1], "all")]
    );
  }

  const ecosystemJourneyMatch = pathname.match(/^\/api\/ecosystem\/patients\/([^/]+)\/journey$/);
  if (ecosystemJourneyMatch) {
    return deepClone(snapshot.ecosystemJourneys[ecosystemJourneyMatch[1]]);
  }

  const githubPlanMatch = pathname.match(/^\/api\/github-capabilities\/patients\/([^/]+)\/plan$/);
  if (githubPlanMatch) {
    return deepClone(snapshot.githubPlans[githubPlanMatch[1]]);
  }

  const integrationMatch = pathname.match(/^\/api\/integrations\/patients\/([^/]+)\/adapted$/);
  if (integrationMatch) {
    return deepClone(snapshot.integrations[integrationMatch[1]]);
  }

  const predictionMatch = pathname.match(/^\/api\/predictions\/patients\/([^/]+)$/);
  if (predictionMatch) {
    return deepClone(snapshot.predictions[predictionMatch[1]]);
  }

  throw new Error(`静态演示未收录接口：${pathname}`);
}

const summaryMetrics = document.querySelector("#summary-metrics");
const overviewBandTag = document.querySelector("#overview-band-tag");
const overviewFilterReset = document.querySelector("#overview-filter-reset");
const overviewRiskRadar = document.querySelector("#overview-risk-radar");
const overviewCoverageTrend = document.querySelector("#overview-coverage-trend");
const overviewClosedLoopFunnel = document.querySelector("#overview-closed-loop-funnel");
const patientList = document.querySelector("#patient-list");
const patientName = document.querySelector("#patient-name");
const heroSubtitle = document.querySelector("#hero-subtitle");
const patientOverview = document.querySelector("#patient-overview");
const riskDomainGrid = document.querySelector("#risk-domain-grid");
const therapyPackageGrid = document.querySelector("#therapy-package-grid");
const carePlanSummary = document.querySelector("#care-plan-summary");
const meetingList = document.querySelector("#meeting-list");
const activeMeetingTitle = document.querySelector("#active-meeting-title");
const meetingDetail = document.querySelector("#meeting-detail");
const roleViewTitle = document.querySelector("#role-view-title");
const roleViewPanel = document.querySelector("#role-view-panel");
const clinicianSummary = document.querySelector("#clinician-summary");
const mappingGrid = document.querySelector("#mapping-grid");
const medclawOverviewPanel = document.querySelector("#medclaw-overview");
const medclawGuardrails = document.querySelector("#medclaw-guardrails");
const imagingComparison = document.querySelector("#imaging-comparison");
const recordDraft = document.querySelector("#record-draft");
const diagnosisSupport = document.querySelector("#diagnosis-support");
const dataPipeline = document.querySelector("#data-pipeline");
const ecosystemOverviewPanel = document.querySelector("#ecosystem-overview");
const ecosystemProducts = document.querySelector("#ecosystem-products");
const ecosystemJourney = document.querySelector("#ecosystem-journey");
const ecosystemPartners = document.querySelector("#ecosystem-partners");
const githubOverviewPanel = document.querySelector("#github-overview");
const githubCatalog = document.querySelector("#github-catalog");
const githubPlan = document.querySelector("#github-plan");
const populationSummary = document.querySelector("#population-summary");
const populationRadar = document.querySelector("#population-radar");
const districtLiveStage = document.querySelector("#district-live-stage");
const districtFlowStory = document.querySelector("#district-flow-story");
const wallboardHeroRibbon = document.querySelector("#wallboard-hero-ribbon");
const displayModeToggle = document.querySelector("#display-mode-toggle");
const interventionSpotlightPanel = document.querySelector("#intervention-spotlight-panel");
const hospitalOverviewGrid = document.querySelector("#hospital-overview-grid");
const hospitalDetailPanel = document.querySelector("#hospital-detail-panel");
const qixiaPublicProfile = document.querySelector("#qixia-public-profile");
const publicDataConfigSummary = document.querySelector("#public-data-config-summary");
const publicDataConfigToolbar = document.querySelector("#public-data-config-toolbar");
const publicDataSourceExplorer = document.querySelector("#public-data-source-explorer");
const publicDataModuleExplorer = document.querySelector("#public-data-module-explorer");
const publicDataAssetCatalog = document.querySelector("#public-data-asset-catalog");
const publicDataMappingDraft = document.querySelector("#public-data-mapping-draft");
const patientAppList = document.querySelector("#patient-app-list");
const patientAppTitle = document.querySelector("#patient-app-title");
const patientAppMeta = document.querySelector("#patient-app-meta");
const patientAppIdentity = document.querySelector("#patient-app-identity");
const patientAppTodayPlan = document.querySelector("#patient-app-today-plan");
const patientAppQuickActions = document.querySelector("#patient-app-quick-actions");
const patientAppCoach = document.querySelector("#patient-app-coach");
const patientAppTrends = document.querySelector("#patient-app-trends");
const patientAppActions = document.querySelector("#patient-app-actions");
const patientAppReminders = document.querySelector("#patient-app-reminders");
const patientAppPrograms = document.querySelector("#patient-app-programs");
const patientAppAgents = document.querySelector("#patient-app-agents");
const patientAppSupport = document.querySelector("#patient-app-support");
const districtExecutivePanel = document.querySelector("#district-executive-panel");
const hospitalBenchmarkPanel = document.querySelector("#hospital-benchmark-panel");
const modelGovernancePanel = document.querySelector("#model-governance-panel");
const reminderCenter = document.querySelector("#reminder-center");
const followupOpsPanel = document.querySelector("#followup-ops-panel");
const followupWorkloadPanel = document.querySelector("#followup-workload-panel");
const populationList = document.querySelector("#population-list");
const populationPatientTitle = document.querySelector("#population-patient-title");
const populationPatientProfile = document.querySelector("#population-patient-profile");
const populationPatientRadar = document.querySelector("#population-patient-radar");
const populationInterventionSummary = document.querySelector("#population-intervention-summary");
const populationInterventionRadar = document.querySelector("#population-intervention-radar");
const populationPredictions = document.querySelector("#population-predictions");
const populationEvidence = document.querySelector("#population-evidence");
const populationModelSummary = document.querySelector("#population-model-summary");
const populationProcess = document.querySelector("#population-process");
const populationImprovements = document.querySelector("#population-improvements");
const populationRoleFollowups = document.querySelector("#population-role-followups");
const commandCenterNetwork = document.querySelector("#command-center-network");
const commandCenterQueue = document.querySelector("#command-center-queue");
const commandCenterKpis = document.querySelector("#command-center-kpis");
const adapterSummary = document.querySelector("#adapter-summary");
const predictionSummary = document.querySelector("#prediction-summary");
const patientTemplate = document.querySelector("#patient-item-template");
const runWorkflowBtn = document.querySelector("#run-workflow-btn");
const createMeetingBtn = document.querySelector("#create-meeting-btn");
const hospitalFilter = document.querySelector("#hospital-filter");
const roleFilter = document.querySelector("#role-filter");
const followupSummary = document.querySelector("#followup-summary");
const followupGroups = document.querySelector("#followup-groups");
const followupGroupFilter = document.querySelector("#followup-group-filter");
const followupStatusFilter = document.querySelector("#followup-status-filter");
const followupClinicianFilter = document.querySelector("#followup-clinician-filter");
const exportFollowupsBtn = document.querySelector("#export-followups-btn");
const clinicianTabs = document.querySelector("#clinician-tabs");
const managementScopeSummary = document.querySelector("#management-scope-summary");
const managementUpdatedAt = document.querySelector("#management-updated-at");
const managementKpiCards = document.querySelector("#management-kpi-cards");
const managementTaskCards = document.querySelector("#management-task-cards");
const entityViewToggle = document.querySelector("#entity-view-toggle");
const managementFocusBoard = document.querySelector("#management-focus-board");
const managementFocusDetail = document.querySelector("#management-focus-detail");
const patientViewFilter = document.querySelector("#patient-view-filter");
const patientRiskFilter = document.querySelector("#patient-risk-filter");
const patientDiagnosisFilter = document.querySelector("#patient-diagnosis-filter");
const patientSortFilter = document.querySelector("#patient-sort-filter");
const patientTable = document.querySelector("#patient-table");
const patientTableSummary = document.querySelector("#patient-table-summary");
const patientTablePagination = document.querySelector("#patient-table-pagination");
const exportSelectedPatientsBtn = document.querySelector("#export-selected-patients-btn");
const clearPatientSelectionBtn = document.querySelector("#clear-patient-selection-btn");
const publicDataSummary = document.querySelector("#public-data-summary");
const publicDataSourcesNav = document.querySelector("#public-data-sources-nav");
const publicDataAssetsPanel = document.querySelector("#public-data-assets-panel");
const publicDataSourcesPanel = document.querySelector("#public-data-sources-panel");
const publicDataFilteredPanel = document.querySelector("#public-data-filtered-panel");
const publicDataMappingPanel = document.querySelector("#public-data-mapping-panel");
const publicDataViewFilter = document.querySelector("#public-data-view-filter");
const publicDataSourceFilter = document.querySelector("#public-data-source-filter");
const publicDataModuleFilter = document.querySelector("#public-data-module-filter");
const publicDataExportJsonBtn = document.querySelector("#public-data-export-json");
const publicDataExportXlsxBtn = document.querySelector("#public-data-export-xlsx");

const interactiveSurfaceSelector = [
  ".page-banner",
  ".hero",
  ".panel",
  ".metric-card",
  ".patient-item",
  ".population-row",
  ".overview-visual-card",
  ".dynamic-metric-card",
  ".story-card",
  ".wallboard-ribbon-card",
  ".hospital-card",
  ".entity-group",
  ".entity-subgroup",
  ".workspace-section",
  ".overview-funnel-stage",
  ".management-kpi-card",
  ".task-priority-card",
  ".focus-table-row",
  ".followup-group-card",
  ".followup-task",
  ".benchmark-row",
  ".patient-app-card",
  ".patient-app-action",
  ".patient-app-program-card",
  ".patient-app-agent-card"
].join(", ");

const interactiveSurfaceRegistry = new WeakSet();
let revealObserver = null;

if (typeof document !== "undefined" && document.body) {
  document.body.dataset.motionReady = "true";
}

function bindInteractiveSurfaces(root = document) {
  root.querySelectorAll(interactiveSurfaceSelector).forEach((node) => {
    if (interactiveSurfaceRegistry.has(node)) return;
    interactiveSurfaceRegistry.add(node);
    node.style.setProperty("--pointer-x", "50%");
    node.style.setProperty("--pointer-y", "50%");
    node.addEventListener("pointermove", (event) => {
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      node.style.setProperty("--pointer-x", `${Math.max(0, Math.min(100, x)).toFixed(1)}%`);
      node.style.setProperty("--pointer-y", `${Math.max(0, Math.min(100, y)).toFixed(1)}%`);
    });
    node.addEventListener("pointerleave", () => {
      node.style.setProperty("--pointer-x", "50%");
      node.style.setProperty("--pointer-y", "50%");
    });
  });
}

function ensureRevealObserver() {
  if (revealObserver || !("IntersectionObserver" in window)) return;
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -6% 0px"
    }
  );
}

function registerRevealTargets(root = document) {
  const targets = [...root.querySelectorAll("[data-reveal]")];
  if (!targets.length) return;
  if (!("IntersectionObserver" in window)) {
    targets.forEach((node) => node.classList.add("is-visible"));
    return;
  }
  ensureRevealObserver();
  targets.forEach((node, index) => {
    if (!node.dataset.revealRegistered) {
      node.dataset.revealRegistered = "true";
      node.style.transitionDelay = `${Math.min(index * 70, 280)}ms`;
      revealObserver.observe(node);
    }
  });
}

function refreshInterfacePolish() {
  bindInteractiveSurfaces(document);
  registerRevealTargets(document);
}

function formatLevel(level) {
  return {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical"
  }[level] ?? level;
}

function labelRiskDomain(domain) {
  return {
    cardiovascular: "心血管",
    diabetes: "糖尿病",
    dementia: "认知障碍",
    respiratory: "呼吸慢病",
    sleep: "睡眠",
    renal: "肾脏",
    metabolic: "代谢"
  }[domain] ?? domain;
}

function labelWorkbenchRole(role) {
  return {
    "specialist-doctor": "专科医生",
    "general-practitioner": "全科医生",
    "health-manager": "健康管理师"
  }[role] ?? role;
}

function mapWorkbenchToFollowupRole(role) {
  return {
    "specialist-doctor": "tertiary-specialist",
    "general-practitioner": "general-practitioner",
    "health-manager": "health-manager"
  }[role];
}

function formatTodoStatus(status) {
  return {
    pending: "待处理",
    "at-risk": "临近逾期",
    overdue: "已逾期",
    done: "已完成"
  }[status] ?? status;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function labelFollowupSource(source) {
  return {
    preliminary: "初步澄清",
    "ehr-kg": "EHR-KG",
    ddx: "DDX",
    "ddx-kg": "DDX-KG"
  }[source] ?? source;
}

function labelPartnerType(type) {
  return {
    insurance: "保险",
    bank: "银行",
    enterprise: "企业",
    "internet-health": "互联网医疗",
    "event-organizer": "赛事方"
  }[type] ?? type;
}

function labelCapabilityCategory(category) {
  return {
    "ehr-connectivity": "EHR 接入",
    "fhir-middleware": "FHIR 中间层",
    "disease-prediction": "疾病预测",
    "time-series-risk": "时序风险",
    benchmarking: "评测基线",
    "patient-generated-data": "患者生成数据"
  }[category] ?? category;
}

function renderRadarChart(title, vector) {
  const entries = Object.entries(vector ?? {});
  if (!entries.length) {
    return `<div class="note-block">暂无雷达图数据。</div>`;
  }

  const cx = 180;
  const cy = 180;
  const radius = 118;
  const levels = [20, 40, 60, 80, 100];
  const polar = (index, value) => {
    const angle = (Math.PI * 2 * index) / entries.length - Math.PI / 2;
    const currentRadius = (radius * value) / 100;
    return [cx + Math.cos(angle) * currentRadius, cy + Math.sin(angle) * currentRadius];
  };
  const polygonPoints = entries
    .map(([, value], index) => {
      const [x, y] = polar(index, value);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return `
    <div class="radar-card">
      <div class="radar-title">${title}</div>
      <svg viewBox="0 0 360 360" class="radar-chart" role="img" aria-label="${title}">
        ${levels
          .map((level) => {
            const points = entries
              .map(([, _value], index) => {
                const [x, y] = polar(index, level);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(" ");
            return `<polygon class="radar-grid" points="${points}"></polygon>`;
          })
          .join("")}
        ${entries
          .map(([, _value], index) => {
            const [x, y] = polar(index, 100);
            return `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"></line>`;
          })
          .join("")}
        <polygon class="radar-shape" points="${polygonPoints}"></polygon>
        ${entries
          .map(([domain, value], index) => {
            const [x, y] = polar(index, value);
            const [lx, ly] = polar(index, 118);
            return `
              <circle class="radar-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"></circle>
              <text class="radar-label" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}">${labelRiskDomain(domain)}</text>
              <text class="radar-value" x="${x.toFixed(1)}" y="${(y - 10).toFixed(1)}">${value}</text>
            `;
          })
          .join("")}
      </svg>
    </div>
  `;
}

function renderComparisonRadar(title, beforeVector, afterVector) {
  const entries = Object.entries(beforeVector ?? {});
  if (!entries.length) {
    return `<div class="note-block">暂无对比雷达图数据。</div>`;
  }

  const cx = 180;
  const cy = 180;
  const radius = 118;
  const levels = [20, 40, 60, 80, 100];
  const polar = (index, value) => {
    const angle = (Math.PI * 2 * index) / entries.length - Math.PI / 2;
    const currentRadius = (radius * value) / 100;
    return [cx + Math.cos(angle) * currentRadius, cy + Math.sin(angle) * currentRadius];
  };
  const buildPoints = (vector) =>
    entries
      .map(([domain], index) => {
        const [x, y] = polar(index, vector[domain]);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return `
    <div class="radar-card">
      <div class="comparison-head">
        <div class="radar-title">${title}</div>
        <div class="comparison-legend">
          <span><i class="legend-swatch before"></i>干预前</span>
          <span><i class="legend-swatch after"></i>干预后</span>
        </div>
      </div>
      <svg viewBox="0 0 360 360" class="radar-chart" role="img" aria-label="${title}">
        ${levels
          .map((level) => {
            const points = entries
              .map(([, _value], index) => {
                const [x, y] = polar(index, level);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(" ");
            return `<polygon class="radar-grid" points="${points}"></polygon>`;
          })
          .join("")}
        ${entries
          .map(([, _value], index) => {
            const [x, y] = polar(index, 100);
            return `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"></line>`;
          })
          .join("")}
        <polygon class="radar-shape before" points="${buildPoints(beforeVector)}"></polygon>
        <polygon class="radar-shape after" points="${buildPoints(afterVector)}"></polygon>
        ${entries
          .map(([domain], index) => {
            const [lx, ly] = polar(index, 118);
            return `<text class="radar-label" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}">${labelRiskDomain(domain)}</text>`;
          })
          .join("")}
      </svg>
    </div>
  `;
}

function renderOverviewBandRadar(vector) {
  const entries = Object.entries(vector ?? {});
  if (!entries.length) {
    return `<div class="note-block">暂无风险分布数据。</div>`;
  }

  const cx = 150;
  const cy = 128;
  const radius = 88;
  const levels = [25, 50, 75, 100];
  const polar = (index, value) => {
    const angle = (Math.PI * 2 * index) / entries.length - Math.PI / 2;
    const currentRadius = (radius * value) / 100;
    return [cx + Math.cos(angle) * currentRadius, cy + Math.sin(angle) * currentRadius];
  };

  const polygonPoints = entries
    .map(([, value], index) => {
      const [x, y] = polar(index, value);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return `
    <svg viewBox="0 0 300 256" class="overview-radar-chart" role="img" aria-label="区级风险分布雷达">
      ${levels
        .map((level) => {
          const points = entries
            .map(([, _value], index) => {
              const [x, y] = polar(index, level);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ");
          return `<polygon class="overview-radar-grid" points="${points}"></polygon>`;
        })
        .join("")}
      ${entries
        .map(([, _value], index) => {
          const [x, y] = polar(index, 100);
          return `<line class="overview-radar-axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"></line>`;
        })
        .join("")}
      <polygon class="overview-radar-shape" points="${polygonPoints}"></polygon>
      ${entries
        .map(([domain, value], index) => {
          const [x, y] = polar(index, value);
          const [lx, ly] = polar(index, 116);
          const active = state.overviewSelectedDomain === domain;
          return `
            <g class="overview-radar-node ${active ? "active" : ""}" data-overview-domain="${domain}">
              <circle class="overview-radar-hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="16"></circle>
              <circle class="overview-radar-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5"></circle>
              <text class="overview-radar-label" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}">${labelRiskDomain(domain)}</text>
              <text class="overview-radar-value" x="${x.toFixed(1)}" y="${(y - 10).toFixed(1)}">${value}</text>
            </g>
          `;
        })
        .join("")}
    </svg>
  `;
}

function renderOverviewCoverageTrend(ops, cohort) {
  if (!ops || !cohort) {
    return `<div class="note-block">暂无覆盖率趋势数据。</div>`;
  }

  const points = [
    { label: "医院接入", value: ops.hospitalCoverageRate },
    { label: "专科覆盖", value: ops.specialistDoctorCoverageRate },
    { label: "全科覆盖", value: ops.generalPractitionerCoverageRate },
    { label: "责任覆盖", value: ops.responsibleClinicianCoverageRate },
    { label: "闭环执行", value: cohort.summary?.closedLoopRate ?? 0 }
  ];

  const width = 320;
  const height = 210;
  const padX = 28;
  const padTop = 18;
  const padBottom = 38;
  const innerWidth = width - padX * 2;
  const innerHeight = height - padTop - padBottom;
  const maxValue = Math.max(100, ...points.map((point) => point.value));
  const stepX = innerWidth / Math.max(1, points.length - 1);

  const mappedPoints = points.map((point, index) => {
    const x = padX + stepX * index;
    const y = padTop + innerHeight - (point.value / maxValue) * innerHeight;
    return { ...point, x, y };
  });

  const path = mappedPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L ${mappedPoints[mappedPoints.length - 1].x.toFixed(1)} ${(height - padBottom).toFixed(1)} L ${
    mappedPoints[0].x.toFixed(1)
  } ${(height - padBottom).toFixed(1)} Z`;

  return `
    <svg viewBox="0 0 ${width} ${height}" class="overview-line-chart" role="img" aria-label="覆盖率进展图">
      <defs>
        <linearGradient id="overviewLineFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="rgba(103, 232, 249, 0.38)"></stop>
          <stop offset="100%" stop-color="rgba(103, 232, 249, 0.04)"></stop>
        </linearGradient>
      </defs>
      ${[0, 25, 50, 75, 100]
        .map((tick) => {
          const y = padTop + innerHeight - (tick / maxValue) * innerHeight;
          return `
            <line class="overview-line-grid" x1="${padX}" y1="${y.toFixed(1)}" x2="${width - padX}" y2="${y.toFixed(1)}"></line>
            <text class="overview-line-tick" x="0" y="${(y + 4).toFixed(1)}">${tick}%</text>
          `;
        })
        .join("")}
      <path class="overview-line-area" d="${areaPath}"></path>
      <path class="overview-line-path" d="${path}"></path>
      ${mappedPoints
        .map(
          (point) => `
            <circle class="overview-line-dot" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4"></circle>
            <text class="overview-line-value" x="${point.x.toFixed(1)}" y="${(point.y - 12).toFixed(1)}">${point.value}%</text>
            <text class="overview-line-label" x="${point.x.toFixed(1)}" y="${height - 10}">${point.label}</text>
          `
        )
        .join("")}
    </svg>
  `;
}

function renderOverviewClosedLoopFunnel(funnel) {
  const stages = funnel?.stages?.slice(0, 6) ?? [];
  if (!stages.length) {
    return `<div class="note-block">暂无闭环漏斗数据。</div>`;
  }

  const maxCount = Math.max(...stages.map((stage) => stage.count), 1);
  return `
    <div class="overview-funnel">
      ${stages
        .map(
          (stage, index) => `
            <button class="overview-funnel-stage ${index === stages.length - 1 ? "terminal" : ""} ${
              state.overviewSelectedFunnelStage === stage.key ? "active" : ""
            }" data-overview-funnel-stage="${stage.key}">
              <div class="overview-funnel-copy">
                <span>${stage.label}</span>
                <strong>${formatCompactMetric(stage.count)}</strong>
              </div>
              <div class="overview-funnel-track">
                <i style="width:${((stage.count / maxCount) * 100).toFixed(1)}%"></i>
              </div>
              <div class="overview-funnel-meta">
                <small>${formatRateValue(stage.rate)}</small>
                <small>${stage.note}</small>
              </div>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderOverviewBand() {
  const cohort = state.populationDistrictCohort ?? state.populationCohort;
  const ops = cohort?.districtOperations ?? null;

  if (summaryMetrics) {
    const items = cohort
      ? [
          ["纳管人数", `${cohort.patientCount.toLocaleString("zh-CN")} 人`],
          ["高风险", cohort.summary.highRiskCount],
          ["危重", cohort.summary.criticalRiskCount],
          ["闭环率", `${cohort.summary.closedLoopRate}%`],
          ["医院覆盖", formatRateValue(ops?.hospitalCoverageRate ?? 0)],
          ["责任覆盖", formatRateValue(ops?.responsibleClinicianCoverageRate ?? 0)]
        ]
      : [
          ["患者", state.dashboard?.summary?.patients ?? 0],
          ["文档", state.dashboard?.summary?.documents ?? 0],
          ["开放 MDT", state.dashboard?.summary?.openMeetings ?? 0],
          ["Care Plan", state.dashboard?.summary?.carePlans ?? 0],
          ["当前角色资源", state.dashboard?.clinicians ?? 0]
        ];

    summaryMetrics.innerHTML = items
      .map(
        ([label, value]) => `
          <div class="metric-card">
            <span class="dim">${label}</span>
            <strong>${value}</strong>
          </div>
        `
      )
      .join("");
  }

  if (overviewBandTag) {
    overviewBandTag.textContent = getOverviewSelectionLabel();
  }
  if (overviewFilterReset) {
    overviewFilterReset.hidden = !hasOverviewSelection();
  }
  if (heroSubtitle) {
    heroSubtitle.textContent = `${state.filters.hospitalId ? `${getHospitalById(state.filters.hospitalId)?.name ?? "指定医院"}` : "栖霞区全域"} · ${labelWorkbenchRole(state.filters.workbenchRole)}当前查看区级经营结果；患者级处理统一进入医院管理、医生工作台和患者端。`;
  }

  if (overviewRiskRadar) {
    setElementHtml(overviewRiskRadar, cohort ? renderOverviewBandRadar(cohort.averageRadar) : `<div class="note-block">暂无风险分布数据。</div>`);
    overviewRiskRadar.querySelectorAll("[data-overview-domain]").forEach((node) => {
      node.addEventListener("click", () => {
        const nextDomain = node.getAttribute("data-overview-domain") || "";
        state.overviewSelectedDomain = state.overviewSelectedDomain === nextDomain ? "" : nextDomain;
        renderPopulation();
        renderPatients();
      });
    });
  }

  if (overviewCoverageTrend) {
    setElementHtml(overviewCoverageTrend, renderOverviewCoverageTrend(ops, cohort));
  }

  if (overviewClosedLoopFunnel) {
    setElementHtml(overviewClosedLoopFunnel, renderOverviewClosedLoopFunnel(cohort?.coordinationFunnel));
    overviewClosedLoopFunnel.querySelectorAll("[data-overview-funnel-stage]").forEach((node) => {
      node.addEventListener("click", () => {
        const nextStage = node.getAttribute("data-overview-funnel-stage") || "";
        state.overviewSelectedFunnelStage = state.overviewSelectedFunnelStage === nextStage ? "" : nextStage;
        renderPopulation();
        renderPatients();
      });
    });
  }

  if (overviewFilterReset) {
    overviewFilterReset.onclick = () => {
      state.overviewSelectedDomain = "";
      state.overviewSelectedFunnelStage = "";
      renderPopulation();
      renderPatients();
    };
  }

  refreshInterfacePolish();
}

async function api(path, options = {}) {
  if (isStaticMode) {
    return resolveStaticApi(path, options);
  }

  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const raw = query.toString();
  return raw ? `?${raw}` : "";
}

function statChip(label, value) {
  return `<div class="stat-chip"><span class="dim">${label}</span><strong>${value}</strong></div>`;
}

function percentage(value, total) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function coveragePercentage(value, total) {
  if (!total) return "0%";
  const percent = (value / total) * 100;
  if (percent < 1) return `${percent.toFixed(2)}%`;
  return `${percent.toFixed(1)}%`;
}

function formatPersonCount(count) {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(2)} 万人`;
  }
  return `${count.toLocaleString("zh-CN")} 人`;
}

function formatCompactMetric(count) {
  if (!Number.isFinite(Number(count))) return String(count ?? "-");
  const value = Number(count);
  if (Math.abs(value) >= 100000000) return `${(value / 100000000).toFixed(2)} 亿`;
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(2)} 万`;
  return value.toLocaleString("zh-CN");
}

function counterMarkup(value, options = {}) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return `<strong>${value ?? "-"}</strong>`;
  }
  const { format = "integer", suffix = "", prefix = "" } = options;
  return `<strong class="counter-value" data-count-to="${numericValue}" data-count-format="${format}" data-count-suffix="${suffix}" data-count-prefix="${prefix}">0</strong>`;
}

function formatCounterFrame(value, format = "integer") {
  if (format === "percent") return Number(value).toFixed(value >= 100 ? 0 : 1);
  if (format === "decimal") return Number(value).toFixed(1);
  if (format === "compact") return formatCompactMetric(value);
  return Math.round(Number(value)).toLocaleString("zh-CN");
}

function animateCounters(root) {
  if (!root) return;
  const counters = root.querySelectorAll("[data-count-to]");
  counters.forEach((counter) => {
    const endValue = Number(counter.getAttribute("data-count-to"));
    if (!Number.isFinite(endValue)) return;
    const format = counter.getAttribute("data-count-format") || "integer";
    const suffix = counter.getAttribute("data-count-suffix") || "";
    const prefix = counter.getAttribute("data-count-prefix") || "";
    const start = performance.now();
    const duration = 1100;
    const animate = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = endValue * eased;
      counter.textContent = `${prefix}${formatCounterFrame(current, format)}${suffix}`;
      if (progress < 1) {
        window.requestAnimationFrame(animate);
      }
    };
    window.requestAnimationFrame(animate);
  });
}

function activateProgressBars(root) {
  if (!root) return;
  window.requestAnimationFrame(() => {
    root.querySelectorAll("[data-progress-width]").forEach((bar) => {
      bar.style.setProperty("--progress-width", bar.getAttribute("data-progress-width") || "0%");
    });
  });
}

function clearWallboardTimers() {
  state.wallboardTimers.forEach((timer) => window.clearInterval(timer));
  state.wallboardTimers = [];
}

function clearDistrictAgentTimer() {
  if (state.districtAgentTimer) {
    window.clearInterval(state.districtAgentTimer);
    state.districtAgentTimer = null;
  }
}

function getDistrictSelectedPatient(scopedPatients, cohort) {
  return scopedPatients.find((patient) => patient.id === state.populationPatientId) ?? scopedPatients[0] ?? cohort?.patients?.[0] ?? null;
}

function buildDistrictAgentMessage(agentKey, phaseKey, context) {
  const {
    selectedPatient,
    activeInsight,
    domainLabel,
    topPrediction,
    topPackage,
    evidenceTitle,
    focusHospitalName,
    nextFollowUpDate
  } = context;
  const patientName = selectedPatient?.name ?? "当前患者";
  const primaryDiagnosis = selectedPatient?.diagnoses?.[0] ?? "慢病管理对象";
  const target = topPrediction?.target ?? `${domainLabel} 风险`;
  const evidence = evidenceTitle ?? `${domainLabel} 指标变化`;
  const packageTitle = topPackage ?? "个体化干预包";

  if (agentKey === "risk-router") {
    return `已把 ${patientName} 从 ${primaryDiagnosis} 入口收进 ${domainLabel} 高优先级轨道，当前先盯 ${target} 的升级阈值。`;
  }

  if (agentKey === "indicator-reader") {
    return `围绕 ${evidence} 做轻预警，建议在 ${nextFollowUpDate || "下个随访窗口"} 前完成一次重点指标复核。`;
  }

  if (agentKey === "nutrition") {
    return `饮食侧优先执行 ${packageTitle}，先把三餐、外卖替换和盐糖控制收口，再看症状与化验回落。`;
  }

  if (agentKey === "exercise") {
    return `运动侧按照 4/8/12 周节奏推进，把步数、有氧与抗阻拆成可执行动作，避免一次给太重。`;
  }

  if (agentKey === "sleep") {
    return `睡眠侧把作息、饮水、睡前光照和夜间症状一起收进今日计划，降低 ${domainLabel} 风险放大。`;
  }

  if (agentKey === "adherence") {
    return `陪伴侧重点放在连续打卡和提醒，把 ${patientName} 的依从性维持到复评窗口，避免中途掉队。`;
  }

  if (agentKey === "mdt") {
    return `一旦 ${target} 持续抬升，就由 ${focusHospitalName} 触发 MDT 协同，把基层筛查、区级统筹和三级专科连起来。`;
  }

  if (phaseKey === "followup-close-loop") {
    return `${patientName} 当前进入闭环推进阶段，先把 ${packageTitle} 的执行率、异常提醒和复诊准备同步给责任团队。`;
  }

  return `${patientName} 当前围绕 ${domainLabel} 进入 ${phaseKey} 阶段，优先把 ${packageTitle} 和 ${target} 的处置顺序收住。`;
}

function getDistrictRoundtableModel() {
  const cohort = state.populationDistrictCohort ?? state.populationCohort;
  if (!cohort) return null;

  const scopedPatients = getOverviewFilteredDistrictPatients();
  const selectedPatient = getDistrictSelectedPatient(scopedPatients, cohort);
  const insights = computeHospitalInsights();
  const activeInsight = resolveActiveHospitalInsight(insights);
  const riskVector = selectedPatient?.radar ?? cohort.averageRadar ?? {};
  const domainKey =
    state.overviewSelectedDomain ||
    selectedPatient?.topDomains?.[0] ||
    Object.entries(riskVector).sort((left, right) => right[1] - left[1])[0]?.[0] ||
    "metabolic";
  const domainLabel = labelRiskDomain(domainKey);
  const topPrediction =
    selectedPatient?.predictions?.length
      ? [...selectedPatient.predictions].sort((left, right) => right.score - left.score)[0]
      : null;
  const topPackage =
    selectedPatient?.interventionProjection?.packageTitles?.[0] ??
    selectedPatient?.recommendedPackages?.[0] ??
    "个体化治疗包";
  const evidenceTitle = selectedPatient?.evidenceSources?.[0]?.title ?? "";
  const focusHospitalName = activeInsight?.hospital.name ?? selectedPatient?.hospitalName ?? "区级慢病中心";
  const phaseBlueprint = [
    {
      key: "risk-stratification",
      label: "风险分层",
      summary: `先围绕 ${domainLabel} 收紧人群，再判断谁需要升级。`
    },
    {
      key: "behavior-package",
      label: "行为干预",
      summary: `把 ${topPackage} 转成饮食、运动、睡眠的可执行疗法包。`
    },
    {
      key: "followup-close-loop",
      label: "随访推进",
      summary: `用 4/8/12 周节点盯执行率、异常提醒和复评节奏。`
    },
    {
      key: "mdt-upgrade",
      label: "MDT 协同",
      summary: `当 ${topPrediction?.target ?? domainLabel} 波动抬升时，立即升级到区级与三级专科协同。`
    }
  ];
  const phaseIndex = ((state.districtAgentPhaseIndex % phaseBlueprint.length) + phaseBlueprint.length) % phaseBlueprint.length;
  const activePhase = phaseBlueprint[phaseIndex];
  const agents = [
    {
      key: "risk-router",
      badge: "分",
      name: "分层 Agent",
      lane: "风险收紧",
      detail: `把 ${focusHospitalName} 与 ${domainLabel} 高风险患者拉进同一优先队列。`
    },
    {
      key: "indicator-reader",
      badge: "指",
      name: "指标解读 Agent",
      lane: "指标波动",
      detail: `盯住 ${evidenceTitle || "血糖、血压、体重、睡眠"} 的近期波动，避免漏掉升级信号。`
    },
    {
      key: "nutrition",
      badge: "饮",
      name: "营养评估 Agent",
      lane: "饮食建议",
      detail: `把 ${topPackage} 收到三餐、替换方案和外卖建议里。`
    },
    {
      key: "exercise",
      badge: "动",
      name: "运动干预 Agent",
      lane: "运动处方",
      detail: `基于 ${selectedPatient?.adherenceSummary ?? "当前依从性"} 推出更易执行的日常动作。`
    },
    {
      key: "sleep",
      badge: "眠",
      name: "睡眠管理 Agent",
      lane: "作息调整",
      detail: `把睡眠、光照、饮水和夜间症状串到同一条行为链里。`
    },
    {
      key: "adherence",
      badge: "随",
      name: "陪伴随访 Agent",
      lane: "依从督办",
      detail: `围绕 ${selectedPatient?.nextFollowUpDate ?? "近期"} 复评窗口做提醒、打卡和连续反馈。`
    },
    {
      key: "mdt",
      badge: "协",
      name: "MDT 协调 Agent",
      lane: "升级协同",
      detail: `把基层、区级和三级医院放到同一个升级协作链条里。`
    }
  ];
  const activeAgentIndex = ((state.districtAgentActiveIndex % agents.length) + agents.length) % agents.length;
  const activeAgent = agents[activeAgentIndex];
  const nextAgent = agents[(activeAgentIndex + 1) % agents.length];
  const transcript = Array.from({ length: 4 }, (_, offset) => {
    const agentIndex = (activeAgentIndex - offset + agents.length) % agents.length;
    const phase = phaseBlueprint[(phaseIndex - Math.floor(offset / 2) + phaseBlueprint.length) % phaseBlueprint.length];
    const agent = agents[agentIndex];
    return {
      id: `${phase.key}-${agent.key}-${offset}`,
      phase,
      agent,
      nextAgent: agents[(agentIndex + 1) % agents.length],
      conclusion: buildDistrictAgentMessage(agent.key, phase.key, {
        selectedPatient,
        activeInsight,
        domainLabel,
        topPrediction,
        topPackage,
        evidenceTitle,
        focusHospitalName,
        nextFollowUpDate: selectedPatient?.nextFollowUpDate
      }),
      tone: offset === 0 ? "live" : offset === 1 ? "warm" : "rest"
    };
  });

  return {
    cohort,
    scopedPatients,
    selectedPatient,
    activeInsight,
    domainLabel,
    topPrediction,
    topPackage,
    phaseBlueprint,
    phaseIndex,
    activePhase,
    agents,
    activeAgentIndex,
    activeAgent,
    nextAgent,
    transcript
  };
}

function setDistrictPhaseIndex(index) {
  const roundtable = getDistrictRoundtableModel();
  if (!roundtable) return;
  const phaseCount = roundtable.phaseBlueprint.length;
  state.districtAgentPhaseIndex = ((index % phaseCount) + phaseCount) % phaseCount;
}

function setDistrictAgentIndex(index) {
  const roundtable = getDistrictRoundtableModel();
  if (!roundtable) return;
  const agentCount = roundtable.agents.length;
  state.districtAgentActiveIndex = ((index % agentCount) + agentCount) % agentCount;
}

function advanceDistrictAgentState(step = 1) {
  const roundtable = getDistrictRoundtableModel();
  if (!roundtable) return;
  const nextAgentIndex = state.districtAgentActiveIndex + step;
  setDistrictAgentIndex(nextAgentIndex);
  if (Math.abs(step) >= 1 && state.districtAgentActiveIndex % 2 === 0) {
    setDistrictPhaseIndex(state.districtAgentPhaseIndex + Math.sign(step || 1));
  }
}

function refreshDistrictAgentStage() {
  renderDynamicCommandStage();
  renderCommandCenter();
  renderWallboardHero();
}

function startDistrictAgentAutoplay() {
  clearDistrictAgentTimer();
  if (!isHomePage) return;
  state.districtAgentTimer = window.setInterval(() => {
    if (state.districtAgentAutoplayPaused) return;
    advanceDistrictAgentState(1);
    refreshDistrictAgentStage();
  }, isWallboardMode ? 2600 : 3400);
}

function bindDistrictAgentInteractions(root) {
  if (!root) return;

  root.querySelectorAll("[data-stage-agent]").forEach((node) => {
    node.addEventListener("click", () => {
      state.districtAgentAutoplayPaused = true;
      setDistrictAgentIndex(Number(node.getAttribute("data-stage-agent-index") || 0));
      refreshDistrictAgentStage();
    });
  });

  root.querySelectorAll("[data-stage-phase]").forEach((node) => {
    node.addEventListener("click", () => {
      state.districtAgentAutoplayPaused = true;
      setDistrictPhaseIndex(Number(node.getAttribute("data-stage-phase-index") || 0));
      refreshDistrictAgentStage();
    });
  });

  root.querySelectorAll("[data-stage-action]").forEach((node) => {
    node.addEventListener("click", () => {
      const action = node.getAttribute("data-stage-action");
      if (action === "toggle") {
        state.districtAgentAutoplayPaused = !state.districtAgentAutoplayPaused;
      } else if (action === "advance") {
        state.districtAgentAutoplayPaused = true;
        advanceDistrictAgentState(1);
      } else if (action === "rewind") {
        state.districtAgentAutoplayPaused = true;
        advanceDistrictAgentState(-1);
      } else if (action === "resume") {
        state.districtAgentAutoplayPaused = false;
      }
      refreshDistrictAgentStage();
    });
  });

  root.querySelectorAll("[data-stage-patient]").forEach((node) => {
    node.addEventListener("click", async () => {
      const patientId = node.getAttribute("data-stage-patient");
      if (!patientId) return;
      syncActivePatient(patientId);
      const patient = (state.populationCohort?.patients ?? []).find((item) => item.id === patientId);
      if (patient?.hospitalId) state.dynamicHospitalFocusId = patient.hospitalId;
      renderPopulation();
      renderFollowupCenter();
      if (shouldLoadWorkspacePage()) await loadWorkspace();
    });
  });
}

function normalizeConditionName(name) {
  return String(name || "")
    .replace(/\s+/g, "")
    .replace(/Ⅱ/g, "2")
    .replace(/二/g, "2");
}

function interventionRecommendationCatalog(conditionName) {
  const normalized = normalizeConditionName(conditionName);
  if (normalized.includes("高血压")) {
    return [
      { title: "控压随访包", rationale: "用于固定血压监测、服药提醒与异常升级随访。" },
      { title: "心肺耐力训练包", rationale: "通过有氧运动改善血压控制、耐力和心血管风险。" }
    ];
  }

  if (normalized.includes("2型糖尿病") || normalized.includes("2型糖尿") || normalized.includes("糖尿病")) {
    return [
      { title: "控糖饮食包", rationale: "围绕低 GI 饮食、碳水分配和餐后血糖管理。" },
      { title: "餐后步行处方", rationale: "用于降低餐后血糖波动并提高胰岛素敏感性。" }
    ];
  }

  if (normalized.includes("肥胖") || normalized.includes("代谢")) {
    return [
      { title: "减重干预包", rationale: "围绕体重下降目标和生活方式协同减重。" },
      { title: "营养替换包", rationale: "用于优化总热量摄入与营养结构替换。" }
    ];
  }

  return [];
}

function buildInterventionSpotlight(patient, carePlan) {
  const chronicConditions = patient?.chronicConditions?.map((item) => item.name) ?? [];
  const curatedRecommendations = chronicConditions.flatMap((condition) => interventionRecommendationCatalog(condition));
  const therapyPackages = carePlan?.therapyPackages ?? [];
  const seen = new Set();
  const recommendations = [];

  curatedRecommendations.forEach((item) => {
    if (seen.has(item.title)) return;
    seen.add(item.title);
    recommendations.push(item);
  });

  therapyPackages.forEach((pkg) => {
    const normalizedTitle = String(pkg.title || "").replace(/：.*/, "");
    if (seen.has(normalizedTitle)) return;
    seen.add(normalizedTitle);
    recommendations.push({
      title: normalizedTitle,
      rationale: pkg.content?.rationale || (pkg.content?.interventions ?? [])[0] || "已纳入当前 care plan。"
    });
  });

  return {
    conditions: chronicConditions,
    recommendations
  };
}

function renderInterventionSpotlight(patient, carePlan) {
  if (!interventionSpotlightPanel) return;
  const spotlight = buildInterventionSpotlight(patient, carePlan);

  interventionSpotlightPanel.innerHTML = `
    <div class="intervention-spotlight-grid">
      <div class="spotlight-conditions-card">
        <div class="spotlight-card-head">
          <span class="mini-tag">重点慢病</span>
          <strong>${patient.name}</strong>
        </div>
        <div class="spotlight-condition-list">
          ${spotlight.conditions.map((item) => `<span class="spotlight-condition-pill">${item}</span>`).join("")}
        </div>
        <div class="dim">当前主页默认焦点患者的重点病种将直接驱动推荐干预包展示与后续随访动作。</div>
      </div>

      <div class="spotlight-recommend-card">
        <div class="spotlight-card-head">
          <span class="mini-tag">推荐干预包</span>
          <strong>优先执行顺序</strong>
        </div>
        <div class="spotlight-package-list">
          ${spotlight.recommendations
            .map(
              (item, index) => `
                <article class="spotlight-package-item">
                  <div class="spotlight-package-rank">${String(index + 1).padStart(2, "0")}</div>
                  <div class="spotlight-package-copy">
                    <h4>推荐：${item.title}</h4>
                    <div class="dim">${item.rationale}</div>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderPublicBreakdownRows(items) {
  return items
    .map(
      (item) => `
        <div class="public-breakdown-row">
          <div class="public-breakdown-copy">
            <strong>${item.label}</strong>
            <div class="dim">${formatPersonCount(item.count)}${item.note ? ` · ${item.note}` : ""}</div>
          </div>
          <div class="public-breakdown-bar">
            <span style="width:${Math.max(item.ratio, 3)}%"></span>
          </div>
          <strong class="public-breakdown-ratio">${item.ratio}%</strong>
        </div>
      `
    )
    .join("");
}

function renderBadgeList(items, className = "mini-tag") {
  return items.map((item) => `<span class="${className}">${item}</span>`).join("");
}

function normalizePublicData() {
  const data = state.publicSourceData ?? { sources: [], systemUsableAssets: [], district: qixiaDistrictName };
  const sources = data.sources ?? [];
  const assets = data.systemUsableAssets ?? [];
  const modules = [...new Set(assets.flatMap((asset) => asset.usableModules ?? []))].sort((left, right) =>
    left.localeCompare(right, "zh-CN")
  );

  return {
    district: data.district ?? qixiaDistrictName,
    updatedAt: data.updatedAt ?? "",
    summary: data.summary ?? null,
    sources,
    assets,
    modules
  };
}

function publicDataAssetMatchesSource(asset, sourceLabel) {
  return sourceLabel === "all" || asset.sourceLabel === sourceLabel;
}

function publicDataAssetMatchesModule(asset, moduleLabel) {
  return moduleLabel === "all" || (asset.usableModules ?? []).includes(moduleLabel);
}

function publicDataFilteredAssets(data) {
  return data.assets.filter(
    (asset) =>
      publicDataAssetMatchesSource(asset, state.publicDataSourceFilter) &&
      publicDataAssetMatchesModule(asset, state.publicDataModuleFilter)
  );
}

function renderPublicDataConfigLegacy() {
  const data = normalizePublicData();
  if (!publicDataConfigSummary || !publicDataSourceExplorer || !publicDataModuleExplorer || !publicDataAssetCatalog || !publicDataMappingDraft) {
    return;
  }

  const filteredAssets = publicDataFilteredAssets(data);
  const selectedSource = data.sources.find((source) => source.label === state.publicDataSourceFilter) ?? null;
  const selectedModule = data.modules.includes(state.publicDataModuleFilter) ? state.publicDataModuleFilter : null;
  const sourceStats = data.sources.map((source) => ({
    ...source,
    assetCount: data.assets.filter((asset) => asset.sourceLabel === source.label).length
  }));
  const moduleStats = data.modules.map((module) => ({
    label: module,
    assetCount: data.assets.filter((asset) => (asset.usableModules ?? []).includes(module)).length
  }));

  publicDataConfigSummary.innerHTML = `
    <div class="plan-block">
      <h4>${data.district} 公开资料接入字典</h4>
      <div class="stat-grid">
        ${statChip("来源数", data.sources.length)}
        ${statChip("资产数", data.assets.length)}
        ${statChip("模块数", data.modules.length)}
        ${statChip("更新时间", data.updatedAt ? data.updatedAt.slice(0, 10) : "未标注")}
      </div>
      <div class="dim">静态配置页，面向后续接入真实区卫健委/医院字段映射的占位目录。</div>
    </div>
    <div class="plan-block">
      <h4>当前选中</h4>
      <ul class="mini-list">
        <li>来源：${selectedSource?.label ?? "全部来源"}</li>
        <li>模块：${selectedModule ?? "全部模块"}</li>
        <li>筛选资产：${filteredAssets.length} 条</li>
      </ul>
    </div>
  `;

  publicDataConfigToolbar.innerHTML = `
    <div class="config-toggle-group">
      <button class="config-toggle ${state.publicDataView === "source" ? "active" : ""}" data-public-view="source">按来源查看</button>
      <button class="config-toggle ${state.publicDataView === "module" ? "active" : ""}" data-public-view="module">按模块查看</button>
    </div>
    <div class="config-filter-strip">
      <label class="filter-field">
        <span>来源</span>
        <select id="public-data-source-filter">
          <option value="all">全部来源</option>
          ${data.sources.map((source) => `<option value="${source.label}">${source.label}</option>`).join("")}
        </select>
      </label>
      <label class="filter-field">
        <span>模块</span>
        <select id="public-data-module-filter">
          <option value="all">全部模块</option>
          ${data.modules.map((module) => `<option value="${module}">${module}</option>`).join("")}
        </select>
      </label>
    </div>
  `;

  const sourceFilter = document.querySelector("#public-data-source-filter");
  const moduleFilter = document.querySelector("#public-data-module-filter");
  if (sourceFilter) sourceFilter.value = state.publicDataSourceFilter;
  if (moduleFilter) moduleFilter.value = state.publicDataModuleFilter;

  sourceFilter?.addEventListener("change", () => {
    state.publicDataSourceFilter = sourceFilter.value;
    renderPublicDataConfigLegacy();
  });
  moduleFilter?.addEventListener("change", () => {
    state.publicDataModuleFilter = moduleFilter.value;
    renderPublicDataConfigLegacy();
  });
  publicDataConfigToolbar.querySelectorAll("[data-public-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.publicDataView = button.getAttribute("data-public-view") || "source";
      renderPublicDataConfigLegacy();
    });
  });

  const sourceExplorerCards = sourceStats
    .map(
      (source) => `
        <button class="source-index-card ${state.publicDataSourceFilter === source.label ? "active" : ""}" data-source-label="${source.label}">
          <div class="source-index-head">
            <strong>${source.label}</strong>
            <span class="mini-tag">${source.assetCount} 条</span>
          </div>
          <div class="dim">${source.note}</div>
          <a class="source-link" href="${source.url}" target="_blank" rel="noreferrer">${source.url}</a>
        </button>
      `
    )
    .join("");

  const moduleExplorerCards = moduleStats
    .map(
      (module) => `
        <button class="module-index-card ${state.publicDataModuleFilter === module.label ? "active" : ""}" data-module-label="${module.label}">
          <div class="source-index-head">
            <strong>${module.label}</strong>
            <span class="mini-tag">${module.assetCount} 条</span>
          </div>
          <div class="dim">可接入该模块的公开资产集合</div>
        </button>
      `
    )
    .join("");

  const groupedAssets =
    state.publicDataView === "source"
      ? data.sources
          .map((source) => {
            const assets = data.assets.filter((asset) => asset.sourceLabel === source.label && publicDataAssetMatchesModule(asset, state.publicDataModuleFilter));
            if (!assets.length) return "";
            return `
              <article class="public-asset-group">
                <div class="public-asset-group-head">
                  <div>
                    <strong>${source.label}</strong>
                    <div class="dim">${source.note}</div>
                  </div>
                  <span class="mini-tag">${assets.length} 条资产</span>
                </div>
                <div class="public-asset-grid">
                  ${assets.map((asset) => renderPublicAssetCard(asset)).join("")}
                </div>
              </article>
            `;
          })
          .join("")
      : data.modules
          .map((module) => {
            const assets = data.assets.filter((asset) => (asset.usableModules ?? []).includes(module) && publicDataAssetMatchesSource(asset, state.publicDataSourceFilter));
            if (!assets.length) return "";
            return `
              <article class="public-asset-group">
                <div class="public-asset-group-head">
                  <div>
                    <strong>${module}</strong>
                    <div class="dim">可接入该模块的公开资产</div>
                  </div>
                  <span class="mini-tag">${assets.length} 条资产</span>
                </div>
                <div class="public-asset-grid">
                  ${assets.map((asset) => renderPublicAssetCard(asset)).join("")}
                </div>
              </article>
            `;
          })
          .join("");

  publicDataSourceExplorer.innerHTML = sourceExplorerCards || `<div class="note-block">暂无来源数据。</div>`;
  publicDataModuleExplorer.innerHTML = moduleExplorerCards || `<div class="note-block">暂无模块数据。</div>`;
  publicDataAssetCatalog.innerHTML = filteredAssets.length
    ? groupedAssets
    : `<div class="note-block">当前筛选下没有匹配的公开资产，请切换来源或模块。</div>`;
  publicDataMappingDraft.innerHTML = renderPublicMappingDraft(data);

  publicDataSourceExplorer.querySelectorAll("[data-source-label]").forEach((button) => {
    button.addEventListener("click", () => {
      state.publicDataSourceFilter = button.getAttribute("data-source-label") || "all";
      renderPublicDataConfigLegacy();
    });
  });

  publicDataModuleExplorer.querySelectorAll("[data-module-label]").forEach((button) => {
    button.addEventListener("click", () => {
      state.publicDataModuleFilter = button.getAttribute("data-module-label") || "all";
      renderPublicDataConfigLegacy();
    });
  });
}

function renderPublicAssetCard(asset) {
  return `
    <article class="public-asset-card public-asset-card-compact">
      <div class="public-indicator-head">
        <strong>${asset.title}</strong>
        <span class="mini-tag">${asset.value}</span>
      </div>
      <div class="asset-metadata">
        <div class="asset-meta">
          <span>来源</span>
          <div class="dim">${asset.sourceLabel}</div>
        </div>
        <div class="asset-meta">
          <span>可接入模块</span>
          <div class="asset-chip-list">${renderBadgeList(asset.usableModules, "asset-chip")}</div>
        </div>
        <div class="asset-meta">
          <span>目标字段</span>
          <div class="asset-code-list">${asset.usableFields.map((field) => `<code>${field}</code>`).join("")}</div>
        </div>
      </div>
      <div class="dim">${asset.integrationNote}</div>
      <a class="source-link" href="${asset.sourceUrl}" target="_blank" rel="noreferrer">${asset.sourceUrl}</a>
    </article>
  `;
}

function renderPublicMappingDraft(data) {
  const drafts = [
    {
      title: "区级人口底盘",
      sourceField: "publicProfile.totalPopulation",
      targetField: "区卫健委人口统计口径 / population.totalResident",
      note: "后续可替换为真实区卫健委年度人口统计接口。"
    },
    {
      title: "重点人群联系人数",
      sourceField: "publicProfile.healthIndicators",
      targetField: "区级重点人群联系系统 / followup.contactablePopulation",
      note: "后续可对接医院签约与家庭医生系统。"
    },
    {
      title: "医院网络拓扑",
      sourceField: "coordinationFunnel / hospitalNetwork",
      targetField: "医院编目表 / hospital.registry",
      note: "后续可替换为真实医院名录、科室目录和责任医生编目。"
    },
    {
      title: "协同闭环指标",
      sourceField: "districtOperations.closedLoopRate",
      targetField: "区级运营绩效 / ops.closedLoopRate",
      note: "后续可连接区级慢病管理、转诊和督办系统。"
    }
  ];

  return `
    <div class="plan-block">
      <h4>字段映射草案</h4>
      <div class="dim">静态占位，不持久化。用于后续替换为真实区卫健委 / 医院字段映射。</div>
      <div class="draft-table">
        ${drafts
          .map(
            (draft) => `
              <div class="draft-row">
                <div>
                  <strong>${draft.title}</strong>
                  <div class="dim">${draft.note}</div>
                </div>
                <div class="draft-mapping">
                  <code>${draft.sourceField}</code>
                  <span>→</span>
                  <strong>${draft.targetField}</strong>
                </div>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="source-list">
        ${data.sources.map((source) => `<a class="source-link" href="${source.url}" target="_blank" rel="noreferrer">${source.label}</a>`).join("")}
      </div>
    </div>
  `;
}

function formatRateValue(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric === 0) return "0%";
  return `${numeric < 1 ? numeric.toFixed(2) : numeric.toFixed(1)}%`;
}

function governanceStatusLabel(status) {
  return {
    stable: "稳定",
    watch: "观察",
    investigate: "排查"
  }[status] ?? status;
}

function qixiaHospitalsOnly(hospitals) {
  return (hospitals ?? []).filter((hospital) => hospital.district === qixiaDistrictName);
}

function getCurrentPopulationPatients() {
  return state.populationCohort?.patients ?? [];
}

function getDistrictPopulationPatients() {
  return state.populationDistrictCohort?.patients ?? [];
}

function hasOverviewSelection() {
  return Boolean(state.overviewSelectedDomain || state.overviewSelectedFunnelStage);
}

function matchesOverviewDomain(patient, domain = state.overviewSelectedDomain) {
  if (!domain) return true;
  return (patient.radar?.[domain] ?? 0) >= 60 || (patient.topDomains ?? []).includes(domain);
}

function matchesOverviewFunnelStage(patient, stage = state.overviewSelectedFunnelStage) {
  if (!stage || stage === "screened" || stage === "risk-stratified") return true;
  if (stage === "referral-suggested") {
    return patient.managementTier === "intensive" || patient.overallRiskLevel === "critical";
  }
  if (stage === "consultation") {
    return patient.overallRiskLevel !== "low" || (patient.topDomains?.length ?? 0) >= 2;
  }
  if (stage === "mdt-review") {
    return patient.managementTier !== "routine" || (patient.topDomains?.length ?? 0) >= 2;
  }
  if (stage === "closed-loop") {
    return (patient.careGaps?.length ?? 0) <= 2;
  }
  return true;
}

function getOverviewFilteredDistrictPatients() {
  return getDistrictPopulationPatients().filter(
    (patient) => matchesOverviewDomain(patient) && matchesOverviewFunnelStage(patient)
  );
}

function getOverviewScopedPatients() {
  const districtPatients = getOverviewFilteredDistrictPatients();
  if (!state.filters.hospitalId) {
    return districtPatients;
  }
  return districtPatients.filter((patient) => patient.hospitalId === state.filters.hospitalId);
}

function getOverviewSelectionLabel() {
  const parts = [];
  if (state.overviewSelectedDomain) {
    parts.push(labelRiskDomain(state.overviewSelectedDomain));
  }
  if (state.overviewSelectedFunnelStage) {
    const labels = {
      screened: "纳管筛查",
      "risk-stratified": "风险分层",
      "referral-suggested": "转诊建议",
      consultation: "会诊复核",
      "mdt-review": "MDT 复核",
      "closed-loop": "闭环复评"
    };
    parts.push(labels[state.overviewSelectedFunnelStage] ?? state.overviewSelectedFunnelStage);
  }
  return parts.length ? parts.join(" · ") : "栖霞区全域 · 三级协同";
}

function getHospitalById(hospitalId) {
  return state.hospitals.find((hospital) => hospital.id === hospitalId) ?? null;
}

function roundMetric(value) {
  return Math.max(0, Math.round(value));
}

function filterDashboardToQixia(dashboard, clinicians) {
  const qixiaHospitalIds = new Set(state.hospitals.map((hospital) => hospital.id));
  const scopedPatients = (dashboard?.patients ?? []).filter((patient) => qixiaHospitalIds.has(patient.hospitalId));
  const scopedClinicians = (clinicians ?? []).filter((clinician) =>
    clinician.hospitalIds.some((hospitalId) => qixiaHospitalIds.has(hospitalId))
  );
  const baselinePatientCount = dashboard?.summary?.patients ?? scopedPatients.length;
  const scaleMetric = (key) => {
    const baselineValue = dashboard?.summary?.[key] ?? 0;
    if (!baselinePatientCount) return 0;
    return roundMetric((baselineValue / baselinePatientCount) * scopedPatients.length);
  };

  return {
    ...dashboard,
    patients: scopedPatients,
    summary: {
      ...dashboard.summary,
      patients: scopedPatients.length,
      documents: scaleMetric("documents"),
      openMeetings: scaleMetric("openMeetings"),
      carePlans: scaleMetric("carePlans")
    },
    clinicians: scopedClinicians.length
  };
}

function interpolateRiskVector(fromVector, toVector, ratio) {
  const nextVector = {};
  const domains = Object.keys(toVector ?? {});
  for (const domain of domains) {
    const fromValue = fromVector?.[domain] ?? 0;
    const toValue = toVector?.[domain] ?? 0;
    nextVector[domain] = Number((fromValue + (toValue - fromValue) * ratio).toFixed(1));
  }
  return nextVector;
}

function checkpointForWeek(patient, week) {
  return (
    patient?.interventionProjection?.timelineCheckpoints?.find((checkpoint) => checkpoint.week === week) ??
    patient?.interventionProjection?.timelineCheckpoints?.at?.(-1) ??
    null
  );
}

function buildCheckpointButton(checkpoint, active) {
  return `
    <button class="checkpoint-card checkpoint-button ${checkpoint.overallLevel} ${active ? "active" : ""}" data-checkpoint-week="${checkpoint.week}">
      <div class="checkpoint-week">${checkpoint.label}</div>
      <strong>${checkpoint.overallScore}</strong>
      <div class="dim">${formatLevel(checkpoint.overallLevel)}</div>
      <ul class="mini-list">${checkpoint.keyChanges.map((item) => `<li>${item}</li>`).join("")}</ul>
    </button>
  `;
}

function setElementHtml(element, html) {
  if (element) {
    element.innerHTML = html;
  }
}

function setElementText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

function getPatientRiskLevel(patient) {
  return patient.riskLevel ?? patient.overallRiskLevel ?? "low";
}

function getPatientOverdueCount(patient) {
  return (patient.roleFollowupPlans ?? []).reduce(
    (total, plan) => total + plan.todoList.filter((todo) => todo.status === "overdue").length,
    0
  );
}

function summarizeHierarchyPatients(patients) {
  return {
    patientCount: patients.length,
    highRiskCount: patients.filter((patient) => {
      const level = getPatientRiskLevel(patient);
      return level === "high" || level === "critical";
    }).length,
    overdueCount: patients.reduce((total, patient) => total + getPatientOverdueCount(patient), 0)
  };
}

function getPatientOwner(patient, ownerMode = "primary") {
  const primaryDoctor = patient.primaryDoctor ?? null;
  const responsibleClinician = patient.responsibleClinician ?? null;
  const preferredOwner =
    ownerMode === "responsible"
      ? responsibleClinician ?? primaryDoctor
      : primaryDoctor ?? responsibleClinician;

  if (preferredOwner) {
    return {
      ...preferredOwner,
      displayRole: ownerMode === "responsible" ? "责任医生" : "主诊医生"
    };
  }

  return {
    name: ownerMode === "responsible" ? "待补充责任医生" : "待补充主诊医生",
    department: "院内待补充",
    role: ownerMode === "responsible" ? "case-manager" : "primary-physician",
    source: "encounter-derived",
    displayRole: ownerMode === "responsible" ? "责任医生" : "主诊医生"
  };
}

function buildPatientHierarchy(patients, options = {}) {
  const hospitals = new Map();
  const ownerMode = options.ownerMode ?? "primary";
  const selectedId = options.selectedId ?? null;

  for (const patient of patients ?? []) {
    const hospital = getHospitalById(patient.hospitalId) ?? { name: patient.hospitalName, id: patient.hospitalId };
    const attendingDoctor = getPatientOwner(patient, ownerMode);
    const hospitalEntry =
      hospitals.get(hospital.id) ??
      {
        id: hospital.id,
        name: hospital.name,
        level: hospital.level ?? hospital.category ?? "医院",
        doctors: new Map()
      };
    const doctorKey = `${attendingDoctor.name}|${attendingDoctor.department}`;
    const doctorEntry =
      hospitalEntry.doctors.get(doctorKey) ??
      {
        key: doctorKey,
        name: attendingDoctor.name,
        department: attendingDoctor.department,
        displayRole: attendingDoctor.displayRole,
        patients: []
      };

    doctorEntry.patients.push(patient);
    hospitalEntry.doctors.set(doctorKey, doctorEntry);
    hospitals.set(hospital.id, hospitalEntry);
  }

  return [...hospitals.values()]
    .map((hospital) => ({
      ...hospital,
      summary: summarizeHierarchyPatients([...hospital.doctors.values()].flatMap((doctor) => doctor.patients)),
      defaultOpen:
        [...hospital.doctors.values()].some((doctor) => doctor.patients.some((patient) => patient.id === selectedId)) ||
        hospital.doctors.size <= 2,
      doctors: [...hospital.doctors.values()]
        .map((doctor) => ({
          ...doctor,
          summary: summarizeHierarchyPatients(doctor.patients),
          defaultOpen:
            doctor.patients.some((patient) => patient.id === selectedId) || doctor.patients.length <= 4
        }))
        .sort((left, right) => right.patients.length - left.patients.length)
    }))
    .sort((left, right) => {
      return right.summary.patientCount - left.summary.patientCount;
    });
}

function renderHierarchicalPatientList(patients, selectedId, options) {
  const hierarchy = buildPatientHierarchy(patients, {
    ownerMode: options.ownerMode,
    selectedId
  });
  const renderPatient = options.renderPatient;

  return hierarchy
    .map(
      (hospital) => `
        <details class="entity-group" ${hospital.defaultOpen ? "open" : ""}>
          <summary class="entity-group-head">
            <div>
              <strong>${hospital.name}</strong>
              <div class="dim">${hospital.level}</div>
            </div>
            <div class="entity-counts">
              <span class="mini-tag">${hospital.summary.patientCount} 人</span>
              <span class="mini-tag ${hospital.summary.highRiskCount ? "high" : ""}">高风险 ${hospital.summary.highRiskCount}</span>
              <span class="mini-tag ${hospital.summary.overdueCount ? "critical" : ""}">逾期 ${hospital.summary.overdueCount}</span>
            </div>
          </summary>
          <div class="entity-subgroup-list">
            ${hospital.doctors
              .map(
                (doctor) => `
                  <details class="entity-subgroup" ${doctor.defaultOpen ? "open" : ""}>
                    <summary class="entity-subgroup-head">
                      <div>
                        <strong>${doctor.name}</strong>
                        <div class="dim">${doctor.displayRole} · ${doctor.department}</div>
                      </div>
                      <div class="entity-counts">
                        <span class="mini-tag">${doctor.summary.patientCount} 人</span>
                        <span class="mini-tag ${doctor.summary.highRiskCount ? "high" : ""}">高风险 ${doctor.summary.highRiskCount}</span>
                        <span class="mini-tag ${doctor.summary.overdueCount ? "critical" : ""}">逾期 ${doctor.summary.overdueCount}</span>
                      </div>
                    </summary>
                    <div class="entity-patient-list">
                      ${doctor.patients.map((patient) => renderPatient(patient, patient.id === selectedId)).join("")}
                    </div>
                  </details>
                `
              )
              .join("")}
          </div>
        </details>
      `
    )
    .join("");
}

function renderFilters() {
  if (!hospitalFilter && !roleFilter) return;
  if (hospitalFilter) {
    hospitalFilter.innerHTML = [
      `<option value="">栖霞区全域</option>`,
      ...state.hospitals.map((hospital) => `<option value="${hospital.id}">${hospital.name}</option>`)
    ].join("");
    hospitalFilter.value = state.filters.hospitalId;
  }
  if (roleFilter) {
    roleFilter.value = state.filters.workbenchRole;
  }
  if (followupGroupFilter) followupGroupFilter.value = state.followupGroupBy;
  if (followupStatusFilter) followupStatusFilter.value = state.followupStatus;
  if (patientViewFilter) patientViewFilter.value = state.patientViewMode;
  if (patientSortFilter) patientSortFilter.value = state.patientSortBy;
}

function renderDashboard() {
  if (!state.dashboard) return;
  renderOverviewBand();
}

function renderPatients() {
  if (!patientList || !patientTemplate) return;

  if (isHomePage) {
    const patients = getOverviewScopedPatients();
    patientList.innerHTML = patients.length
      ? renderHierarchicalPatientList(patients, state.populationPatientId, {
          ownerMode: state.filters.workbenchRole === "health-manager" ? "responsible" : "primary",
          renderPatient: (patient, isActive) => `
            <div class="population-row overview-queue-row ${isActive ? "active" : ""}">
              <div class="population-row-main">
                <strong>${patient.name}</strong>
                <span class="status-pill ${patient.overallRiskLevel}">${formatLevel(patient.overallRiskLevel)}</span>
              </div>
              <div class="dim">${patient.hospitalName}</div>
              <div class="population-row-meta">
                <span>${patient.age} 岁</span>
                <span>${patient.topDomains.map((domain) => labelRiskDomain(domain)).join(" · ")}</span>
              </div>
            </div>
          `
        })
      : `<div class="note-block">当前联动筛选下暂无患者队列。</div>`;
    refreshInterfacePolish();
    return;
  }

  patientList.innerHTML = renderHierarchicalPatientList(state.dashboard?.patients ?? [], state.patientId, {
    ownerMode: state.filters.workbenchRole === "health-manager" ? "responsible" : "primary",
    renderPatient: (patient, isActive) => `
      <button class="patient-item ${isActive ? "active" : ""}" data-dashboard-patient="${patient.id}">
        <div class="patient-item-head">
          <strong class="patient-item-name">${patient.name}</strong>
          <span class="pill ${patient.riskLevel}">${formatLevel(patient.riskLevel)}</span>
        </div>
        <div class="patient-item-body">${patient.conditions.join(" / ")} | ${patient.topDomains.map((item) => item.label).join(" · ")}</div>
      </button>
    `
  });

  patientList.querySelectorAll("[data-dashboard-patient]").forEach((node) => {
    node.addEventListener("click", async () => {
      state.patientId = node.getAttribute("data-dashboard-patient");
      await loadWorkspace();
    });
  });

  refreshInterfacePolish();
}

function renderPatientApp() {
  if (!isPatientAppPage) return;
  const cohort = state.populationCohort ?? state.populationDistrictCohort;
  const patients = cohort?.patients ?? [];
  const selectedPatient = patients.find((patient) => patient.id === state.populationPatientId) ?? patients[0] ?? null;

  if (selectedPatient && state.populationPatientId !== selectedPatient.id) {
    state.populationPatientId = selectedPatient.id;
  }

  if (patientAppList) {
    patientAppList.innerHTML = patients.length
      ? renderHierarchicalPatientList(patients, state.populationPatientId, {
          ownerMode: "primary",
          renderPatient: (patient, isActive) => `
            <button class="patient-item ${isActive ? "active" : ""}" data-patient-app-id="${patient.id}">
              <div class="patient-item-head">
                <strong class="patient-item-name">${patient.name}</strong>
                <span class="pill ${patient.overallRiskLevel}">${formatLevel(patient.overallRiskLevel)}</span>
              </div>
              <div class="patient-item-body">${patient.diagnoses.slice(0, 2).join(" / ")} · ${patient.recommendedPackages[0] ?? "待生成治疗包"}</div>
            </button>
          `
        })
      : `<div class="note-block">当前医院范围内暂无患者端样本。</div>`;

    patientAppList.querySelectorAll("[data-patient-app-id]").forEach((node) => {
      node.addEventListener("click", () => {
        syncActivePatient(node.getAttribute("data-patient-app-id"));
        renderPatientApp();
      });
    });
  }

  if (!selectedPatient) {
    setElementText(patientAppTitle, "暂无患者端样本");
    setElementHtml(patientAppMeta, `<div class="note-block">请先选择一个接入医院或等待人群快照加载完成。</div>`);
    setElementHtml(patientAppIdentity, "");
    setElementHtml(patientAppTodayPlan, "");
    setElementHtml(patientAppQuickActions, "");
    setElementHtml(patientAppCoach, "");
    setElementHtml(patientAppTrends, "");
    setElementHtml(patientAppActions, "");
    setElementHtml(patientAppReminders, "");
    setElementHtml(patientAppPrograms, "");
    setElementHtml(patientAppAgents, "");
    setElementHtml(patientAppSupport, "");
    refreshInterfacePolish();
    return;
  }

  const workspace = selectedPatient.patientWorkspace;
  const primaryDoctor = getPatientOwner(selectedPatient, "primary");
  const responsibleClinician = getPatientOwner(selectedPatient, "responsible");

  setElementText(patientAppTitle, `${selectedPatient.name} · 患者端管理首页`);
  setElementHtml(
    patientAppMeta,
    `
      <div class="stat-grid">
        ${statChip("所属医院", selectedPatient.hospitalName)}
        ${statChip("主诊医生", primaryDoctor.name)}
        ${statChip("责任医生/管理师", responsibleClinician.name)}
        ${statChip("下次随访", selectedPatient.nextFollowUpDate)}
      </div>
    `
  );

  setElementHtml(
    patientAppIdentity,
    `
      <div class="patient-app-identity-strip">
        <div>
          <span class="panel-kicker">顶部身份条</span>
          <h3>${workspace.identityBar.nickname}</h3>
          <div class="patient-app-tag-row">
            ${workspace.identityBar.diseaseTags.map((tag) => `<span class="asset-chip">${tag}</span>`).join("")}
          </div>
        </div>
        <div class="patient-app-identity-stats">
          <div class="patient-app-identity-stat">
            <span>当前目标</span>
            <strong>${workspace.identityBar.currentGoal}</strong>
          </div>
          <div class="patient-app-identity-stat">
            <span>连续打卡</span>
            <strong>${workspace.identityBar.streakDays} 天</strong>
          </div>
        </div>
      </div>
    `
  );

  setElementHtml(
    patientAppTodayPlan,
    `
      <article class="patient-app-card patient-app-card-primary">
        <div class="panel-kicker">今日健康计划主卡</div>
        <h3>从今天开始，只做最关键的 4 件事</h3>
        <ul class="mini-list">
          <li>${workspace.todayPlan.breakfastSuggestion}</li>
          <li>${workspace.todayPlan.activityGoal}</li>
          <li>今日需记录：${workspace.todayPlan.recordTargets.join(" / ")}</li>
          <li>注意事项：${workspace.todayPlan.attentionItem}</li>
        </ul>
      </article>
    `
  );

  setElementHtml(
    patientAppQuickActions,
    workspace.quickActions
      .map(
        (action) => `
          <button class="patient-app-action" type="button">
            <strong>${action.label}</strong>
            <span>${action.hint}</span>
          </button>
        `
      )
      .join("")
  );

  setElementHtml(
    patientAppCoach,
    `
      <article class="patient-app-card">
        <div class="panel-kicker">AI 教练卡</div>
        <h3>一句建议 + 一键追问</h3>
        <p>${workspace.aiCoach.message}</p>
        <div class="patient-app-coach-prompt">${workspace.aiCoach.followUpPrompt}</div>
      </article>
    `
  );

  setElementHtml(
    patientAppTrends,
    workspace.trendSnapshots
      .map(
        (item) => `
          <article class="patient-app-card">
            <div class="patient-app-card-head">
              <strong>${item.label}</strong>
              <span class="status-pill ${item.trend === "improved" ? "low" : item.trend === "stable" ? "medium" : "high"}">${item.change}</span>
            </div>
            <h3>${item.current}</h3>
          </article>
        `
      )
      .join("")
  );

  setElementHtml(
    patientAppActions,
    `
      <article class="patient-app-card">
        <div class="panel-kicker">今日小行动</div>
        <h3>把建议拆成能执行的小动作</h3>
        <ul class="mini-list">
          ${workspace.miniActions.map((item) => `<li><strong>${item.title}</strong>：${item.detail}</li>`).join("")}
        </ul>
      </article>
    `
  );

  setElementHtml(
    patientAppReminders,
    workspace.reminders
      .map(
        (item) => `
          <article class="patient-app-card">
            <div class="patient-app-card-head">
              <strong>${item.title}</strong>
              <span class="status-pill ${item.level === "urgent" ? "high" : item.level === "watch" ? "medium" : "low"}">${item.level === "urgent" ? "重点" : item.level === "watch" ? "关注" : "提示"}</span>
            </div>
            <p>${item.detail}</p>
          </article>
        `
      )
      .join("")
  );

  setElementHtml(
    patientAppPrograms,
    workspace.managementPrograms
      .map(
        (program) => `
          <article class="patient-app-program-card">
            <div class="patient-app-card-head">
              <strong>${program.title}</strong>
              <span class="mini-tag">${program.targetConditions.length} 类对象</span>
            </div>
            <p>${program.summary}</p>
            <div class="patient-app-tag-row">
              ${program.targetConditions.map((condition) => `<span class="asset-chip">${condition}</span>`).join("")}
            </div>
            <div class="dim">${program.emphasis}</div>
          </article>
        `
      )
      .join("")
  );

  setElementHtml(
    patientAppAgents,
    workspace.supportAgents
      .map(
        (agent) => `
          <article class="patient-app-agent-card">
            <div class="panel-kicker">Patient Agent</div>
            <h3>${agent.name}</h3>
            <p>${agent.purpose}</p>
            <ul class="mini-list">
              ${agent.outputs.map((output) => `<li>${output}</li>`).join("")}
            </ul>
          </article>
        `
      )
      .join("")
  );

  setElementHtml(
    patientAppSupport,
    `
      <div class="plan-block">
        <h4>患者端接入说明</h4>
        <ul class="mini-list">
          <li>患者端首页只保留身份条、今日计划、快捷记录、AI 教练、趋势快照、小行动和关键提醒。</li>
          <li>医院与医生端看到的是督办与复评，患者端看到的是可执行的日常管理内容。</li>
          <li>当前患者绑定主诊医生 ${primaryDoctor.name}，责任支持为 ${responsibleClinician.name}。</li>
        </ul>
      </div>
    `
  );

  if (heroSubtitle) {
    heroSubtitle.textContent = `${state.filters.hospitalId ? `${getHospitalById(state.filters.hospitalId)?.name ?? "指定医院"} · ` : `${qixiaDistrictName}全域 · `}患者只看今天要做什么、要记录什么，以及什么时候复评。`;
  }

  refreshInterfacePolish();
}

function computeHospitalInsights() {
  const patients = getOverviewFilteredDistrictPatients();
  const hasSelection = hasOverviewSelection();
  const rankingByHospitalId = new Map(
    (state.populationDistrictCohort?.hospitalPerformanceRanking ?? []).map((item) => [item.hospitalId, item])
  );

  return state.hospitals
    .map((hospital) => {
      const hospitalPatients = patients.filter((patient) => patient.hospitalId === hospital.id);
      const ranking = rankingByHospitalId.get(hospital.id);
      const patientCount = hasSelection ? hospitalPatients.length : (ranking?.patientCount ?? hospitalPatients.length);
      const domainCounts = hasSelection
        ? Object.keys(hospitalPatients[0]?.radar ?? {})
            .map((domain) => ({
              domain,
              label: labelRiskDomain(domain),
              count: hospitalPatients.filter((patient) => (patient.radar?.[domain] ?? 0) >= 60).length
            }))
            .filter((item) => item.count > 0)
            .sort((left, right) => right.count - left.count)
            .slice(0, 4)
            .map((item) => ({
              ...item,
              ratio: percentage(item.count, patientCount)
            }))
        : (ranking?.topDomains ?? []).map((item) => ({
            ...item,
            ratio: percentage(item.count, patientCount)
          }));
      const packageRatios = hasSelection
        ? [...new Map(
            hospitalPatients
              .flatMap((patient) => patient.interventionProjection.packageTitles ?? [])
              .map((title) => [title, hospitalPatients.filter((patient) => (patient.interventionProjection.packageTitles ?? []).includes(title)).length])
          ).entries()]
            .sort((left, right) => right[1] - left[1])
            .slice(0, 4)
            .map(([title, count]) => ({
              title,
              count,
              ratio: percentage(count, patientCount)
            }))
        : (ranking?.topPackages ?? []).map((item) => ({
            title: item.title,
            count: item.count,
            ratio: percentage(item.count, patientCount)
          }));

      return {
        hospital,
        patientCount,
        effectiveCount: hasSelection
          ? hospitalPatients.filter((patient) => {
              const before = patient.interventionProjection.beforeOverallScore;
              const after = patient.interventionProjection.afterOverallScore;
              return after <= before - 8 || patient.interventionProjection.afterLevel !== patient.interventionProjection.beforeLevel;
            }).length
          : ranking ? Math.round((Number.parseFloat(ranking.effectiveRate) || 0) * patientCount) : 0,
        effectiveRate: hasSelection
          ? percentage(
              hospitalPatients.filter((patient) => {
                const before = patient.interventionProjection.beforeOverallScore;
                const after = patient.interventionProjection.afterOverallScore;
                return after <= before - 8 || patient.interventionProjection.afterLevel !== patient.interventionProjection.beforeLevel;
              }).length,
              patientCount
            )
          : ranking ? `${ranking.effectiveRate}%` : "0%",
        diseaseRatios: domainCounts,
        packageRatios,
        averageBefore: hospitalPatients.length
          ? Number(
              (
                hospitalPatients.reduce((total, patient) => total + patient.interventionProjection.beforeOverallScore, 0) /
                hospitalPatients.length
              ).toFixed(1)
            )
          : 0,
        averageAfter: hospitalPatients.length
          ? Number(
              (
                hospitalPatients.reduce((total, patient) => total + patient.interventionProjection.afterOverallScore, 0) /
                hospitalPatients.length
              ).toFixed(1)
            )
          : 0
      };
    })
    .filter((item) => !hasOverviewSelection() || item.patientCount > 0)
    .sort((left, right) => right.patientCount - left.patientCount);
}

function resolveActiveHospitalInsight(insights) {
  if (!insights.length) return null;
  const selectedHospitalId = state.dynamicHospitalFocusId || state.filters.hospitalId || insights[0]?.hospital.id;
  return insights.find((item) => item.hospital.id === selectedHospitalId) ?? insights[0];
}

function renderDynamicCommandStage() {
  if (!districtLiveStage || !districtFlowStory) return;
  const roundtable = getDistrictRoundtableModel();
  if (!roundtable) return;

  const { cohort, scopedPatients, activeInsight, phaseBlueprint, activePhase, agents, activeAgent, nextAgent, transcript, selectedPatient, topPrediction, topPackage, domainLabel } = roundtable;
  const insights = computeHospitalInsights();
  const funnel = (cohort.coordinationFunnel?.stages ?? []).slice(0, 6);
  const topDomains = Object.keys(scopedPatients[0]?.radar ?? cohort.averageRadar ?? {})
    .map((domain) => ({
      domain,
      label: labelRiskDomain(domain),
      count: scopedPatients.filter((patient) => (patient.radar?.[domain] ?? 0) >= 60).length
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);
  const maxDomainCount = Math.max(...topDomains.map((item) => item.count), 1);
  const spotlightHospitals = insights.slice(0, 6);
  const packageHighlights = (activeInsight?.packageRatios ?? []).slice(0, 4);
  const maxPackageCount = Math.max(...packageHighlights.map((item) => item.count), 1);
  const publicAssets = (cohort.publicProfile?.systemUsableAssets ?? []).slice(0, 4);

  districtLiveStage.innerHTML = `
    <div class="dynamic-stage-grid">
      <div class="dynamic-stage-metrics">
        <article class="dynamic-metric-card accent-blue" data-reveal="fast">
          <span>常住人口底数</span>
          ${counterMarkup(cohort.publicProfile?.totalPopulation ?? 0, { format: "compact" })}
          <small>${cohort.publicProfile?.totalPopulationLabel ?? "-"}</small>
        </article>
        <article class="dynamic-metric-card accent-cyan" data-reveal="fast">
          <span>当前联动纳管人数</span>
          ${counterMarkup(scopedPatients.length ?? 0, { format: "compact" })}
          <small>${hasOverviewSelection() ? "已按顶部联动筛选收敛" : "当前按栖霞区总人口作为管理口径"}</small>
        </article>
        <article class="dynamic-metric-card accent-indigo" data-reveal="fast">
          <span>高风险慢病人群</span>
          ${counterMarkup(
            scopedPatients.filter((patient) => patient.overallRiskLevel === "high" || patient.overallRiskLevel === "critical").length,
            { format: "compact" }
          )}
          <small>区级优先队列与转诊会诊入口</small>
        </article>
        <article class="dynamic-metric-card accent-emerald" data-reveal="fast">
          <span>闭环执行率</span>
          ${counterMarkup(cohort.summary?.closedLoopRate ?? 0, { format: "percent", suffix: "%" })}
          <small>反映区级连续管理与复评执行情况</small>
        </article>
      </div>

      <div class="dynamic-stage-network immersive-stage-body">
        <div class="network-orbit immersive-network-orbit">
          <div class="network-core">
            <div class="network-core-ring"></div>
            <div class="network-core-copy">
              <span>栖霞区慢病指挥中枢</span>
              <strong>${activeInsight?.hospital.name ?? "全区协同"}</strong>
              <small>${activeInsight ? `${activeInsight.patientCount.toLocaleString("zh-CN")} 人管理中 · 起效率 ${activeInsight.effectiveRate}` : "点击节点切换医院焦点"}</small>
            </div>
          </div>
          <div class="orbit-node-list">
            ${spotlightHospitals
              .map((insight, index) => {
                const angle = (Math.PI * 2 * index) / Math.max(spotlightHospitals.length, 1) - Math.PI / 2;
                const x = 50 + Math.cos(angle) * 36;
                const y = 50 + Math.sin(angle) * 36;
                const topDomain = insight.diseaseRatios[0];
                return `
                  <button
                    class="orbit-node ${activeInsight?.hospital.id === insight.hospital.id ? "active" : ""}"
                    data-dynamic-hospital="${insight.hospital.id}"
                    style="left:${x}%;top:${y}%;--node-accent:${insight.hospital.accent || "#1e40af"}"
                  >
                    <span class="orbit-node-dot"></span>
                    <span class="orbit-node-name">${insight.hospital.name}</span>
                    <span class="orbit-node-meta">${topDomain ? `${topDomain.label} ${topDomain.ratio}` : `${insight.patientCount} 人`}</span>
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>

        <section class="dynamic-stage-highlight immersive-transcript-panel">
          <div class="immersive-panel-head">
            <div>
              <span class="mini-tag">${activePhase.label}</span>
              <h4>${activeAgent.name} 正在接力</h4>
              <div class="dim">${activeAgent.detail}</div>
            </div>
            <div class="immersive-control-strip">
              <button class="ghost-button" type="button" data-stage-action="rewind">上一棒</button>
              <button class="ghost-button primary" type="button" data-stage-action="${state.districtAgentAutoplayPaused ? "resume" : "toggle"}">
                ${state.districtAgentAutoplayPaused ? "继续自动推进" : "暂停自动推进"}
              </button>
              <button class="ghost-button primary" type="button" data-stage-action="advance">下一棒</button>
            </div>
          </div>

          <div class="immersive-stage-spotlight">
            <div class="immersive-focus-card">
              <span>当前患者</span>
              <strong>${selectedPatient?.name ?? "未选择患者"}</strong>
              <small>${selectedPatient?.diagnoses?.join(" / ") ?? "等待患者焦点"} · 下次随访 ${selectedPatient?.nextFollowUpDate ?? "待定"}</small>
            </div>
            <div class="immersive-focus-card">
              <span>当前焦点</span>
              <strong>${domainLabel}</strong>
              <small>${topPrediction ? `${topPrediction.model} ${topPrediction.score} · ${topPrediction.target}` : "等待模型判读"}</small>
            </div>
            <div class="immersive-focus-card">
              <span>下一棒</span>
              <strong>${nextAgent.name}</strong>
              <small>${activeInsight?.hospital.name ?? "区级协同"} · ${topPackage ?? "治疗包待补充"}</small>
            </div>
          </div>

          <div class="immersive-transcript-list">
            ${transcript
              .map(
                (entry, index) => `
                  <article class="immersive-transcript-card ${index === 0 ? "is-live" : ""}">
                    <div class="immersive-transcript-head">
                      <div class="transcript-avatar">${entry.agent.badge}</div>
                      <div class="immersive-transcript-copy">
                        <div class="immersive-transcript-meta">
                          <strong>${entry.agent.name}</strong>
                          <span>${entry.phase.label}</span>
                        </div>
                        <p>${entry.conclusion}</p>
                        <small>下一棒：${entry.nextAgent.name}</small>
                      </div>
                    </div>
                    ${index === 0 ? `<div class="typing-ribbon"></div>` : ""}
                  </article>
                `
              )
              .join("")}
          </div>
        </section>

        <aside class="immersive-agent-rail">
          <div class="roundtable-shell">
            <div class="roundtable-spotlight">
              <div>
                <span class="mini-tag">Agent 舞台</span>
                <h4>${activeAgent.name}</h4>
              </div>
              <strong>${activePhase.label}</strong>
            </div>
            <div class="roundtable-seat-grid">
              ${agents
                .map(
                  (agent, index) => `
                    <button
                      class="roundtable-seat ${index === roundtable.activeAgentIndex ? "is-active" : index === (roundtable.activeAgentIndex + 1) % agents.length ? "is-upnext" : ""}"
                      type="button"
                      data-stage-agent="${agent.key}"
                      data-stage-agent-index="${index}"
                    >
                      <span class="roundtable-seat-badge">${agent.badge}</span>
                      <div class="roundtable-seat-copy">
                        <strong>${agent.name}</strong>
                        <small>${agent.lane}</small>
                      </div>
                    </button>
                  `
                )
                .join("")}
            </div>
          </div>

          <div class="immersive-phase-list">
            ${phaseBlueprint
              .map(
                (phase, index) => `
                  <button
                    class="stage-control ${index === roundtable.phaseIndex ? "is-active" : ""}"
                    type="button"
                    data-stage-phase="${phase.key}"
                    data-stage-phase-index="${index}"
                  >
                    <span>Phase ${index + 1}</span>
                    <strong>${phase.label}</strong>
                    <small>${phase.summary}</small>
                  </button>
                `
              )
              .join("")}
          </div>
        </aside>
      </div>
    </div>
  `;

  districtFlowStory.innerHTML = `
    <div class="dynamic-story-grid">
      <article class="story-card" data-reveal="fast">
        <div class="story-head">
          <span class="mini-tag">病种热力</span>
          <strong>区级慢病负荷</strong>
        </div>
        <div class="story-bar-list">
          ${topDomains
            .map(
              (item) => `
                <div class="story-bar-item">
                  <div class="story-bar-copy">
                    <span>${item.label}</span>
                    <strong>${formatCompactMetric(item.count)} 人</strong>
                  </div>
                  <div class="story-bar-track">
                    <i data-progress-width="${((item.count / maxDomainCount) * 100).toFixed(1)}%"></i>
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="story-card" data-reveal="fast">
        <div class="story-head">
          <span class="mini-tag">协同漏斗</span>
          <strong>筛查到闭环</strong>
        </div>
        <div class="story-funnel">
          ${funnel
            .map(
              (stage, index) => `
                <div class="funnel-stage ${state.overviewSelectedFunnelStage === stage.key || (!state.overviewSelectedFunnelStage && index === 0) ? "active" : ""}">
                  <span>${stage.label}</span>
                  ${counterMarkup(stage.count ?? 0, { format: "compact" })}
                  <small>${stage.note ?? "区级协同阶段"}</small>
                </div>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="story-card" data-reveal="fast">
        <div class="story-head">
          <span class="mini-tag">治疗包响应</span>
          <strong>${activeInsight?.hospital.name ?? "当前医院"}重点包型</strong>
        </div>
        <div class="story-bar-list">
          ${packageHighlights
            .map(
              (item) => `
                <div class="story-bar-item">
                  <div class="story-bar-copy">
                    <span>${item.title}</span>
                    <strong>${item.ratio}</strong>
                  </div>
                  <div class="story-bar-track warm">
                    <i data-progress-width="${((item.count / maxPackageCount) * 100).toFixed(1)}%"></i>
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="story-card" data-reveal="fast">
        <div class="story-head">
          <span class="mini-tag">联动说明</span>
          <strong>筛选结果与首页作用域</strong>
        </div>
        <div class="plan-block">
          <div class="stat-grid">
            ${statChip("联动医院", insights.length)}
            ${statChip("联动患者", scopedPatients.length)}
            ${statChip("当前焦点", activeInsight?.hospital.name ?? "全区协同")}
            ${statChip("当前筛选", getOverviewSelectionLabel())}
          </div>
        </div>
        <div class="plan-block">
          <ul class="mini-list">
            <li>首页只保留区级总览与医院网络，患者级详细随访已收敛到二级页。</li>
            <li>顶部风险雷达用于按病种域筛选，闭环漏斗用于按管理阶段筛选。</li>
            <li>筛选结果会联动医院卡片、左侧患者队列和当前区级焦点医院。</li>
          </ul>
        </div>
      </article>
    </div>
  `;

  districtLiveStage.querySelectorAll("[data-dynamic-hospital]").forEach((node) => {
    node.addEventListener("click", () => {
      state.dynamicHospitalFocusId = node.getAttribute("data-dynamic-hospital") || "";
      renderDynamicCommandStage();
      renderHospitalOverview();
      renderCommandCenter();
      renderPatients();
      renderWallboardHero();
    });
  });

  bindDistrictAgentInteractions(districtLiveStage);

  animateCounters(districtLiveStage);
  animateCounters(districtFlowStory);
  activateProgressBars(districtLiveStage);
  activateProgressBars(districtFlowStory);
  refreshInterfacePolish();
  startDistrictAgentAutoplay();
}

function renderWallboardHero() {
  if (!wallboardHeroRibbon) return;
  const cohort = state.populationDistrictCohort ?? state.populationCohort;
  if (!cohort) {
    wallboardHeroRibbon.innerHTML = "";
    return;
  }

  const insights = computeHospitalInsights();
  const activeInsight = resolveActiveHospitalInsight(insights);
  const scopedPatients = getOverviewFilteredDistrictPatients();
  const topDomain =
    Object.keys(scopedPatients[0]?.radar ?? cohort.averageRadar ?? {})
      .map((domain) => ({
        domain,
        label: labelRiskDomain(domain),
        count: scopedPatients.filter((patient) => (patient.radar?.[domain] ?? 0) >= 60).length
      }))
      .sort((left, right) => right.count - left.count)[0] ?? cohort.domainPrevalence?.[0];

  wallboardHeroRibbon.innerHTML = `
    <div class="wallboard-ribbon-card">
      <span>区级底数</span>
      ${counterMarkup(cohort.publicProfile?.totalPopulation ?? 0, { format: "compact" })}
      <small>${cohort.publicProfile?.totalPopulationLabel ?? "-"}</small>
    </div>
    <div class="wallboard-ribbon-card">
      <span>实时焦点医院</span>
      <strong>${activeInsight?.hospital.name ?? "栖霞区全域"}</strong>
      <small>${activeInsight ? `${formatCompactMetric(activeInsight.patientCount)} 人 · 起效率 ${activeInsight.effectiveRate}` : "等待数据"}</small>
    </div>
    <div class="wallboard-ribbon-card">
      <span>当前最高病种负荷</span>
      <strong>${topDomain?.label ?? "待补充"}</strong>
      <small>${topDomain ? `${formatCompactMetric(topDomain.count)} 人` : "暂无公开口径"}</small>
    </div>
    <div class="wallboard-ribbon-card">
      <span>联动患者队列</span>
      <strong>${formatCompactMetric(scopedPatients.length)} 人</strong>
      <small>${getOverviewSelectionLabel()}</small>
    </div>
  `;

  animateCounters(wallboardHeroRibbon);
  refreshInterfacePolish();
}

function startWallboardRotation() {
  clearWallboardTimers();
  if (!isWallboardMode) return;
  const cohort = state.populationDistrictCohort ?? state.populationCohort;
  if (!cohort?.patients?.length) return;

  const checkpointWeeks = [0, 4, 8, 12];
  let checkpointIndex = checkpointWeeks.indexOf(state.populationCheckpointWeek);
  if (checkpointIndex < 0) checkpointIndex = checkpointWeeks.length - 1;

  const hospitalTimer = window.setInterval(() => {
    const insights = computeHospitalInsights();
    if (!insights.length) return;
    const activeId = state.dynamicHospitalFocusId || state.filters.hospitalId || insights[0].hospital.id;
    const currentIndex = Math.max(
      0,
      insights.findIndex((item) => item.hospital.id === activeId)
    );
    const nextInsight = insights[(currentIndex + 1) % insights.length];
    state.dynamicHospitalFocusId = nextInsight.hospital.id;
    renderDynamicCommandStage();
    renderHospitalOverview();
    renderWallboardHero();
  }, 8000);

  const patientTimer = window.setInterval(() => {
    const patients = cohort.patients;
    const currentIndex = Math.max(
      0,
      patients.findIndex((patient) => patient.id === state.populationPatientId)
    );
    const nextPatient = patients[(currentIndex + 1) % patients.length];
    state.populationPatientId = nextPatient.id;
    checkpointIndex = (checkpointIndex + 1) % checkpointWeeks.length;
    state.populationCheckpointWeek = checkpointWeeks[checkpointIndex];
    renderPopulation();
    renderWallboardHero();
  }, 10000);

  state.wallboardTimers = [hospitalTimer, patientTimer];
}

function renderHospitalOverview() {
  const insights = computeHospitalInsights();
  const districtPopulation = state.populationDistrictCohort?.publicProfile?.totalPopulation ?? 0;
  const selectedHospitalId = state.dynamicHospitalFocusId || state.filters.hospitalId || insights[0]?.hospital.id;
  const activeInsight = insights.find((item) => item.hospital.id === selectedHospitalId) ?? insights[0] ?? null;

  hospitalOverviewGrid.innerHTML = insights
    .map(
      (insight) => `
        <button class="hospital-card ${insight.hospital.id === selectedHospitalId ? "active" : ""}" data-hospital-card="${insight.hospital.id}" data-reveal="fast">
          <div class="hospital-card-head">
            <div>
              <strong>${insight.hospital.name}</strong>
              <div class="dim">${insight.hospital.category ?? insight.hospital.level ?? "医院"} · ${insight.hospital.networkRole ?? "栖霞区接入机构"}</div>
            </div>
            <span class="hospital-dot" style="--hospital-accent:${insight.hospital.accent || "#1e40af"}"></span>
          </div>
          <div class="stat-grid">
            ${statChip("患者数", insight.patientCount)}
            ${statChip("起效率", insight.effectiveRate)}
          </div>
          <div class="hospital-card-section">
            <div class="dim">疾病比例</div>
            <div class="tag-strip">
              ${insight.diseaseRatios
                .slice(0, 3)
                .map((item) => `<span class="mini-tag">${item.label} ${item.ratio}</span>`)
                .join("")}
            </div>
          </div>
        </button>
      `
    )
    .join("");

  hospitalOverviewGrid.querySelectorAll("[data-hospital-card]").forEach((node) => {
    node.addEventListener("click", async () => {
      state.filters.hospitalId = node.getAttribute("data-hospital-card") || "";
      state.dynamicHospitalFocusId = state.filters.hospitalId;
      renderFilters();
      await refreshDashboard();
      await loadPopulation();
      if (patientName) await loadWorkspace();
    });
  });

  hospitalDetailPanel.innerHTML = activeInsight
    ? `
      <div class="plan-block">
        <h4>${activeInsight.hospital.name}</h4>
        <div class="dim">${activeInsight.hospital.level ?? "医院"} · ${activeInsight.hospital.category ?? ""} · ${activeInsight.hospital.networkRole ?? ""}</div>
        <div class="stat-grid">
          ${statChip("管理患者", activeInsight.patientCount)}
          ${statChip("全区覆盖", districtPopulation ? coveragePercentage(activeInsight.patientCount, districtPopulation) : "0%")}
          ${statChip("起效率", activeInsight.effectiveRate)}
          ${statChip("干预前均分", activeInsight.averageBefore)}
          ${statChip("干预后均分", activeInsight.averageAfter)}
        </div>
      </div>
      <div class="plan-block">
        <h4>疾病比例</h4>
        <ul class="mini-list">
          ${activeInsight.diseaseRatios.map((item) => `<li>${item.label}：${item.count} 人，占 ${item.ratio}</li>`).join("")}
        </ul>
      </div>
      <div class="plan-block">
        <h4>治疗包类型与比例</h4>
        <ul class="mini-list">
          ${activeInsight.packageRatios.map((item) => `<li>${item.title}：${item.count} 人，占 ${item.ratio}</li>`).join("")}
        </ul>
      </div>
      <div class="plan-block">
        <h4>管理说明</h4>
        <ul class="mini-list">
          <li>点击左侧医院卡片，可直接切换到该院患者队列与工作台。</li>
          <li>起效率按风险分值下降至少 8 分或风险等级下降计算。</li>
          <li>疾病比例按慢病域高风险患者占比统计。</li>
        </ul>
      </div>
    `
    : `<div class="note-block">暂无栖霞区医院统计。</div>`;

  refreshInterfacePolish();
}

function renderQixiaPublicProfile() {
  if (!qixiaPublicProfile) return;
  const profile = state.populationDistrictCohort?.publicProfile ?? null;

  qixiaPublicProfile.innerHTML = profile
    ? `
      <div class="public-asset-ribbon">
        ${profile.systemUsableAssets
          .map(
            (asset) => `
              <article class="public-spotlight-card">
                <div class="public-spotlight-head">
                  <span class="mini-tag">${asset.title}</span>
                  <strong>${asset.value}</strong>
                </div>
                <div class="dim">${asset.integrationNote}</div>
              </article>
            `
          )
          .join("")}
      </div>
      <div class="public-visual-grid">
        <article class="public-topology-card">
          <div class="panel-kicker">三级协同公开结构</div>
          <h4>1+8+1+10 区域分级协同网络</h4>
          <div class="public-topology-flow">
            <div class="topology-node primary">
              <strong>1</strong>
              <span>省级牵头医院</span>
            </div>
            <div class="topology-arrow">→</div>
            <div class="topology-node tertiary">
              <strong>8</strong>
              <span>三级协作医院</span>
            </div>
            <div class="topology-arrow">→</div>
            <div class="topology-node district">
              <strong>1</strong>
              <span>区级牵头医院</span>
            </div>
            <div class="topology-arrow">→</div>
            <div class="topology-node community">
              <strong>10</strong>
              <span>社区卫生服务中心</span>
            </div>
          </div>
          <div class="dim">这组结构已映射到首页三级协同网络、医院分部展示和转诊拓扑模块。</div>
        </article>

        <article class="public-capacity-card">
          <div class="panel-kicker">基层触达与公共健康</div>
          <h4>重点公共健康能力带</h4>
          <div class="capacity-stat-grid">
            ${profile.systemUsableAssets
              .filter((asset) =>
                ["家庭医生签约服务对象", "重点人群联系人数", "医疗资源底盘", "慢病防控结果指标"].includes(asset.title)
              )
              .map(
                (asset) => `
                  <div class="capacity-stat-card">
                    <span>${asset.title}</span>
                    <strong>${asset.value}</strong>
                    <div class="dim">${asset.usableModules.slice(0, 2).join(" · ")}</div>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      </div>
      <div class="public-profile-grid">
        <div class="plan-block">
          <h4>${profile.districtName}人口底盘</h4>
          <div class="stat-grid">
            ${statChip("常住人口", profile.totalPopulationLabel)}
            ${statChip("纳管人数", `${profile.managedPatientCount} 人`)}
            ${statChip("纳管覆盖率", `${profile.managedCoverageRate}%`)}
            ${statChip("统计口径", profile.totalPopulationAsOf)}
          </div>
          <ul class="mini-list">
            ${profile.notes.map((note) => `<li>${note}</li>`).join("")}
          </ul>
        </div>
        <div class="plan-block">
          <h4>性别结构</h4>
          <div class="public-breakdown-list">${renderPublicBreakdownRows(profile.sexDistribution)}</div>
          <h4>年龄结构</h4>
          <div class="public-breakdown-list">${renderPublicBreakdownRows(profile.ageDistribution)}</div>
        </div>
        <div class="plan-block">
          <h4>公开健康指标</h4>
          <div class="public-indicator-list">
            ${profile.ageHighlights
              .concat(profile.healthIndicators)
              .map(
                (item) => `
                  <div class="public-indicator-card">
                    <div class="public-indicator-head">
                      <strong>${item.title}</strong>
                      <span class="mini-tag">${item.value}</span>
                    </div>
                    <div class="dim">${item.detail}</div>
                    <a class="source-link" href="${item.sourceUrl}" target="_blank" rel="noreferrer">${item.sourceLabel} · ${item.sourceDate}</a>
                  </div>
                `
              )
              .join("")}
          </div>
          <div class="plan-block public-assets-block">
            <h4>8 类公开资产接入字典</h4>
            <div class="public-assets-grid">
              ${profile.systemUsableAssets
                .map(
                  (asset) => `
                    <div class="public-asset-card">
                      <div class="public-indicator-head">
                        <strong>${asset.title}</strong>
                        <span class="mini-tag">${asset.value}</span>
                      </div>
                      <div class="dim">${asset.integrationNote}</div>
                      <div class="asset-meta">
                        <span>可进入模块</span>
                        <div class="asset-chip-list">
                          ${asset.usableModules.map((module) => `<span class="asset-chip">${module}</span>`).join("")}
                        </div>
                      </div>
                      <div class="asset-meta">
                        <span>目标字段</span>
                        <div class="asset-code-list">
                          ${asset.usableFields.map((field) => `<code>${field}</code>`).join("")}
                        </div>
                      </div>
                      <a class="source-link" href="${asset.sourceUrl}" target="_blank" rel="noreferrer">${asset.sourceLabel}</a>
                    </div>
                  `
                )
                .join("")}
            </div>
          </div>
          <div class="source-list">
            ${profile.sources
              .map(
                (source) => `
                  <a class="source-link" href="${source.url}" target="_blank" rel="noreferrer">${source.label}</a>
                `
              )
              .join("")}
          </div>
        </div>
      </div>
    `
    : `<div class="note-block">暂无公开区情人口画像数据。</div>`;
}

function buildPublicDataModules(publicData) {
  const counts = new Map();
  for (const asset of publicData?.systemUsableAssets ?? []) {
    for (const module of asset.usableModules) {
      counts.set(module, (counts.get(module) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, id: slugify(label) }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-CN"));
}

function publicDraftKey(asset) {
  return slugify(asset.title);
}

function buildDefaultPublicDraft(asset) {
  const baseField = asset.usableFields?.[0] ?? "pending.target";
  return {
    assetTitle: asset.title,
    publicAssetValue: asset.value,
    sourceLabel: asset.sourceLabel,
    districtAuthorityField: `wjw.${publicDraftKey(asset)}.official_metric`,
    hospitalHisField: `his.${publicDraftKey(asset)}.mapped_value`,
    systemTargetField: baseField,
    syncStrategy: "先保留公开口径，待真实区卫健委或医院字段确认后做覆盖映射。",
    owner: "区级数据治理",
    status: "draft"
  };
}

function ensurePublicDataDrafts(publicData) {
  for (const asset of publicData?.systemUsableAssets ?? []) {
    const key = publicDraftKey(asset);
    if (!state.publicDataDrafts[key]) {
      state.publicDataDrafts[key] = buildDefaultPublicDraft(asset);
    }
  }
}

function draftRowsForExport(publicData, filteredAssets) {
  return filteredAssets.map((asset) => {
    const key = publicDraftKey(asset);
    const draft = state.publicDataDrafts[key] ?? buildDefaultPublicDraft(asset);
    return {
      资产名称: asset.title,
      公开值: asset.value,
      来源: asset.sourceLabel,
      区卫健委字段: draft.districtAuthorityField,
      医院HIS字段: draft.hospitalHisField,
      系统目标字段: draft.systemTargetField,
      同步策略: draft.syncStrategy,
      责任归口: draft.owner,
      状态: draft.status
    };
  });
}

function downloadTextFile(fileName, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportPublicDataDraftsJson(publicData, filteredAssets) {
  const payload = {
    district: publicData.district,
    exportedAt: new Date().toISOString(),
    filters: {
      source: state.publicDataSourceFilter,
      module: state.publicDataModuleFilter
    },
    mappings: draftRowsForExport(publicData, filteredAssets)
  };
  downloadTextFile("qixia-public-data-mapping-drafts.json", JSON.stringify(payload, null, 2), "application/json");
}

function exportPublicDataDraftsExcel(publicData, filteredAssets) {
  if (typeof window.XLSX === "undefined") {
    window.alert("Excel 导出组件未加载，请稍后重试。");
    return;
  }

  const rows = draftRowsForExport(publicData, filteredAssets);
  const workbook = window.XLSX.utils.book_new();
  const sheet = window.XLSX.utils.json_to_sheet(rows);
  window.XLSX.utils.book_append_sheet(workbook, sheet, "字段映射草案");
  window.XLSX.writeFile(workbook, "qixia-public-data-mapping-drafts.xlsx");
}

function renderPublicDataConfig() {
  if (!isPublicDataConfigPage) return;
  const publicData = state.publicSourceData;
  if (!publicData) return;
  ensurePublicDataDrafts(publicData);

  const assets = publicData.systemUsableAssets ?? [];
  const sources = publicData.sources ?? [];
  const modules = buildPublicDataModules(publicData);
  const selectedView = publicDataViewFilter?.value ?? "asset";
  const selectedSource = publicDataSourceFilter?.value ?? "all";
  const selectedModule = publicDataModuleFilter?.value ?? "all";

  if (publicDataSummary) {
    publicDataSummary.innerHTML = `
      ${statChip("区县", publicData.district)}
      ${statChip("人口底数", publicData.summary.totalPopulationLabel)}
      ${statChip("公开来源", `${sources.length} 条`)}
      ${statChip("可接入资产", `${assets.length} 条`)}
      ${statChip("系统模块", `${modules.length} 个`)}
    `;
  }

  if (publicDataSourcesNav) {
    publicDataSourcesNav.innerHTML = sources
      .map(
        (source, index) => `
          <div class="metric-card">
            <div class="block-label">来源 ${index + 1}</div>
            <strong>${source.label}</strong>
            <div class="dim">${source.note}</div>
          </div>
        `
      )
      .join("");
  }

  if (publicDataSourceFilter && publicDataSourceFilter.options.length === 0) {
    publicDataSourceFilter.innerHTML = `
      <option value="all">全部来源</option>
      ${sources.map((source) => `<option value="${source.label}">${source.label}</option>`).join("")}
    `;
  }
  if (publicDataSourceFilter) {
    publicDataSourceFilter.value = selectedSource;
  }

  if (publicDataModuleFilter && publicDataModuleFilter.options.length === 0) {
    publicDataModuleFilter.innerHTML = `
      <option value="all">全部模块</option>
      ${modules.map((module) => `<option value="${module.label}">${module.label}</option>`).join("")}
    `;
  }
  if (publicDataModuleFilter) {
    publicDataModuleFilter.value = selectedModule;
  }

  if (publicDataAssetsPanel) {
    publicDataAssetsPanel.innerHTML = `
      <div class="plan-block">
        <h4>当前接入范围</h4>
        <div class="stat-grid">
          ${statChip("常住人口", publicData.summary.totalPopulationLabel)}
          ${statChip("年龄结构", `${publicData.ageDistribution.length} 档`)}
          ${statChip("公开指标", `${publicData.publicIndicators.length} 条`)}
          ${statChip("映射资产", `${assets.length} 条`)}
        </div>
      </div>
      <div class="plan-block">
        <h4>模块分布</h4>
        <div class="asset-chip-list">
          ${modules.map((module) => `<span class="asset-chip">${module.label} · ${module.count}</span>`).join("")}
        </div>
      </div>
      <div class="plan-block">
        <h4>整理原则</h4>
        <ul class="mini-list">
          ${publicData.summary.notes.map((note) => `<li>${note}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  if (publicDataSourcesPanel) {
    publicDataSourcesPanel.innerHTML = sources
      .map(
        (source) => `
          <div class="public-indicator-card">
            <div class="public-indicator-head">
              <strong>${source.label}</strong>
              <span class="mini-tag">${assets.filter((asset) => asset.sourceLabel === source.label).length} 条资产</span>
            </div>
            <div class="dim">${source.note}</div>
            <a class="source-link" href="${source.url}" target="_blank" rel="noreferrer">${source.url}</a>
          </div>
        `
      )
      .join("");
  }

  const filteredAssets = assets.filter((asset) => {
    if (selectedSource !== "all" && asset.sourceLabel !== selectedSource) return false;
    if (selectedModule !== "all" && !asset.usableModules.includes(selectedModule)) return false;
    return true;
  });

  if (!state.publicDataSelectedAsset && filteredAssets[0]) {
    state.publicDataSelectedAsset = filteredAssets[0].title;
  }

  if (publicDataFilteredPanel) {
    if (selectedView === "source") {
      const filteredSources = sources.filter((source) => selectedSource === "all" || source.label === selectedSource);
      publicDataFilteredPanel.innerHTML = filteredSources
        .map(
          (source) => `
            <div class="plan-block">
              <h4>${source.label}</h4>
              <div class="dim">${source.note}</div>
              <div class="asset-chip-list">
                ${assets
                  .filter((asset) => asset.sourceLabel === source.label)
                  .map((asset) => `<span class="asset-chip">${asset.title}</span>`)
                  .join("")}
              </div>
            </div>
          `
        )
        .join("");
    } else if (selectedView === "module") {
      const filteredModules = modules.filter((module) => selectedModule === "all" || module.label === selectedModule);
      publicDataFilteredPanel.innerHTML = filteredModules
        .map(
          (module) => `
            <div class="plan-block">
              <h4>${module.label}</h4>
              <div class="dim">当前共有 ${module.count} 条公开资料资产可进入该模块。</div>
              <div class="asset-chip-list">
                ${assets
                  .filter((asset) => asset.usableModules.includes(module.label))
                  .map((asset) => `<span class="asset-chip">${asset.title}</span>`)
                  .join("")}
              </div>
            </div>
          `
        )
        .join("");
    } else {
      publicDataFilteredPanel.innerHTML = filteredAssets.length
        ? `
            <div class="public-assets-grid">
              ${filteredAssets
                .map(
                  (asset) => `
                    <div class="public-asset-card public-asset-card-compact ${state.publicDataSelectedAsset === asset.title ? "active" : ""}">
                      <div class="public-indicator-head">
                        <strong>${asset.title}</strong>
                        <span class="mini-tag">${asset.value}</span>
                      </div>
                      <div class="dim">${asset.integrationNote}</div>
                      <div class="asset-meta">
                        <span>来源</span>
                        <a class="source-link" href="${asset.sourceUrl}" target="_blank" rel="noreferrer">${asset.sourceLabel}</a>
                      </div>
                      <div class="asset-meta">
                        <span>可进入模块</span>
                        <div class="asset-chip-list">
                          ${asset.usableModules.map((module) => `<span class="asset-chip">${module}</span>`).join("")}
                        </div>
                      </div>
                      <div class="asset-meta">
                        <span>目标字段</span>
                        <div class="asset-code-list">
                          ${asset.usableFields.map((field) => `<code>${field}</code>`).join("")}
                        </div>
                      </div>
                      <button class="ghost-button public-edit-button" type="button" data-public-asset="${asset.title}">编辑映射</button>
                    </div>
                  `
                )
                .join("")}
            </div>
          `
        : `<div class="note-block">当前筛选条件下没有匹配的公开资料资产。</div>`;
    }
  }

  if (publicDataMappingPanel) {
    publicDataMappingPanel.innerHTML = filteredAssets.length
      ? filteredAssets
          .map(
            (asset, index) => `
              <div class="mapping-form-card ${state.publicDataSelectedAsset === asset.title ? "active" : ""}">
                <div class="mapping-form-head">
                  <div>
                    <h4>映射草案 ${index + 1} · ${asset.title}</h4>
                    <div class="dim">${asset.sourceLabel} · 当前公开值 ${asset.value}</div>
                  </div>
                  <span class="mini-tag">${(state.publicDataDrafts[publicDraftKey(asset)] ?? buildDefaultPublicDraft(asset)).status}</span>
                </div>
                <div class="mapping-three-column">
                  <div class="mapping-column">
                    <span>区卫健委字段</span>
                    <input type="text" data-draft-key="${publicDraftKey(asset)}" data-draft-field="districtAuthorityField" value="${(state.publicDataDrafts[publicDraftKey(asset)] ?? buildDefaultPublicDraft(asset)).districtAuthorityField}" />
                  </div>
                  <div class="mapping-column">
                    <span>医院 HIS 字段</span>
                    <input type="text" data-draft-key="${publicDraftKey(asset)}" data-draft-field="hospitalHisField" value="${(state.publicDataDrafts[publicDraftKey(asset)] ?? buildDefaultPublicDraft(asset)).hospitalHisField}" />
                  </div>
                  <div class="mapping-column">
                    <span>系统目标字段</span>
                    <input type="text" data-draft-key="${publicDraftKey(asset)}" data-draft-field="systemTargetField" value="${(state.publicDataDrafts[publicDraftKey(asset)] ?? buildDefaultPublicDraft(asset)).systemTargetField}" />
                  </div>
                </div>
                <div class="mapping-form-grid">
                  <label class="mapping-field">
                    <span>同步策略</span>
                    <textarea rows="3" data-draft-key="${publicDraftKey(asset)}" data-draft-field="syncStrategy">${(state.publicDataDrafts[publicDraftKey(asset)] ?? buildDefaultPublicDraft(asset)).syncStrategy}</textarea>
                  </label>
                  <label class="mapping-field">
                    <span>责任归口</span>
                    <input type="text" data-draft-key="${publicDraftKey(asset)}" data-draft-field="owner" value="${(state.publicDataDrafts[publicDraftKey(asset)] ?? buildDefaultPublicDraft(asset)).owner}" />
                  </label>
                  <label class="mapping-field">
                    <span>状态</span>
                    <select data-draft-key="${publicDraftKey(asset)}" data-draft-field="status">
                      ${["draft", "review", "ready"].map((status) => `<option value="${status}" ${((state.publicDataDrafts[publicDraftKey(asset)] ?? buildDefaultPublicDraft(asset)).status === status) ? "selected" : ""}>${status}</option>`).join("")}
                    </select>
                  </label>
                </div>
                <div class="mapping-reference-grid">
                  <div class="mapping-reference-card">
                    <span>可进入模块</span>
                    <div class="asset-chip-list">${asset.usableModules.map((module) => `<span class="asset-chip">${module}</span>`).join("")}</div>
                  </div>
                  <div class="mapping-reference-card">
                    <span>当前目标字段建议</span>
                    <div class="asset-code-list">${asset.usableFields.map((field) => `<code>${field}</code>`).join("")}</div>
                  </div>
                </div>
              </div>
            `
          )
          .join("")
      : `<div class="note-block">当前筛选条件下没有可生成的映射草案。</div>`;
  }

  publicDataFilteredPanel?.querySelectorAll("[data-public-asset]").forEach((button) => {
    button.addEventListener("click", () => {
      state.publicDataSelectedAsset = button.getAttribute("data-public-asset") || "";
      renderPublicDataConfig();
    });
  });

  publicDataMappingPanel?.querySelectorAll("[data-draft-key][data-draft-field]").forEach((field) => {
    field.addEventListener("input", (event) => {
      const target = event.currentTarget;
      const key = target.getAttribute("data-draft-key");
      const draftField = target.getAttribute("data-draft-field");
      if (!key || !draftField) return;
      state.publicDataDrafts[key] = state.publicDataDrafts[key] ?? {};
      state.publicDataDrafts[key][draftField] = target.value;
      state.publicDataSelectedAsset = state.publicDataDrafts[key].assetTitle ?? state.publicDataSelectedAsset;
    });
    field.addEventListener("change", (event) => {
      const target = event.currentTarget;
      const key = target.getAttribute("data-draft-key");
      const draftField = target.getAttribute("data-draft-field");
      if (!key || !draftField) return;
      state.publicDataDrafts[key] = state.publicDataDrafts[key] ?? {};
      state.publicDataDrafts[key][draftField] = target.value;
    });
  });
}

function renderExecutiveCockpit() {
  const cohort = state.populationDistrictCohort ?? state.populationCohort;
  if (!cohort) return;

  if (districtExecutivePanel) {
    const ops = cohort.districtOperations;
    districtExecutivePanel.innerHTML = `
      <div class="plan-block">
        <h4>${ops.districtName} 区级慢病运营总览</h4>
        <div class="stat-grid">
          ${statChip("常住人口", cohort.publicProfile.totalPopulationLabel)}
          ${statChip("纳管人数", `${ops.managedPatientCount} 人`)}
          ${statChip("纳管覆盖率", formatRateValue(ops.managedCoverageRate))}
          ${statChip("医院覆盖率", formatRateValue(ops.hospitalCoverageRate))}
          ${statChip("主诊覆盖率", formatRateValue(ops.primaryDoctorCoverageRate))}
          ${statChip("责任覆盖率", formatRateValue(ops.responsibleClinicianCoverageRate))}
        </div>
      </div>
      <div class="plan-block">
        <h4>角色覆盖结构</h4>
        <div class="metric-ribbon">
          <div class="metric-ribbon-item">
            <span>专科医生覆盖</span>
            <strong>${formatRateValue(ops.specialistDoctorCoverageRate)}</strong>
          </div>
          <div class="metric-ribbon-item">
            <span>全科医生覆盖</span>
            <strong>${formatRateValue(ops.generalPractitionerCoverageRate)}</strong>
          </div>
          <div class="metric-ribbon-item">
            <span>健康管理师覆盖</span>
            <strong>${formatRateValue(ops.healthManagerCoverageRate)}</strong>
          </div>
        </div>
      </div>
      <div class="plan-block">
        <h4>协同闭环</h4>
        <ul class="mini-list">
          <li>闭环率：${formatRateValue(cohort.summary.closedLoopRate)}</li>
          <li>建议转诊：${cohort.referralMetrics.referralSuggestedCount} 人</li>
          <li>完成转诊：${cohort.referralMetrics.referralCompletedCount} 人</li>
          <li>会诊触发：${cohort.referralMetrics.consultationCount} 人</li>
          <li>MDT 复核：${cohort.referralMetrics.mdtReviewCount} 人</li>
        </ul>
      </div>
    `;
  }

  if (hospitalBenchmarkPanel) {
    hospitalBenchmarkPanel.innerHTML = cohort.hospitalPerformanceRanking
      .slice(0, 6)
      .map(
        (item) => `
          <div class="benchmark-row">
            <div class="benchmark-rank">${String(item.rank).padStart(2, "0")}</div>
            <div class="benchmark-copy">
              <strong>${item.hospitalName}</strong>
              <div class="dim">${item.patientCount} 人 · 高风险 ${item.highRiskCount} · 强化管理 ${item.intensiveManagementCount}</div>
              <div class="tag-strip">
                <span class="mini-tag">起效率 ${formatRateValue(item.effectiveRate)}</span>
                <span class="mini-tag">闭环率 ${formatRateValue(item.closedLoopRate)}</span>
                <span class="mini-tag">人均负荷 ${item.averagePatientsPerClinician}</span>
              </div>
            </div>
          </div>
        `
      )
      .join("");
  }

  if (modelGovernancePanel) {
    const governance = cohort.modelGovernance;
    modelGovernancePanel.innerHTML = `
      <div class="plan-block">
        <h4>模型治理摘要</h4>
        <div class="stat-grid">
          ${statChip("模型数", governance.modelCount)}
          ${statChip("一致性均分", governance.consensusScore)}
          ${statChip("分歧率", formatRateValue(governance.disagreementRate))}
          ${statChip("稳定模型", governance.stableModelCount)}
          ${statChip("观察模型", governance.watchModelCount)}
          ${statChip("排查模型", governance.investigateModelCount)}
        </div>
      </div>
      <div class="governance-grid">
        ${governance.items
          .map(
            (item) => `
              <article class="governance-card ${item.governanceStatus}">
                <div class="governance-head">
                  <strong>${item.model}</strong>
                  <span class="mini-tag ${item.governanceStatus === "investigate" ? "critical" : item.governanceStatus === "watch" ? "high" : ""}">${governanceStatusLabel(item.governanceStatus)}</span>
                </div>
                <div class="dim">${item.note}</div>
                <ul class="mini-list">
                  <li>均分：${item.averageScore}</li>
                  <li>高风险：${item.highRiskCount} 人</li>
                  <li>覆盖率：${formatRateValue(item.coverageRate)}</li>
                  <li>分歧率：${formatRateValue(item.disagreementRate)}</li>
                </ul>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }
}

function renderFollowupOps(assignments, filteredAssignments) {
  const cohort = state.populationCohort ?? state.populationDistrictCohort;
  if (!cohort) return;
  const workload = cohort.roleWorkload.find((item) => item.role === mapWorkbenchToFollowupRole(state.filters.workbenchRole));

  if (followupOpsPanel) {
    const overdueCount = filteredAssignments.filter((item) => item.status === "overdue").length;
    const atRiskCount = filteredAssignments.filter((item) => item.status === "at-risk").length;
    const doneCount = filteredAssignments.filter((item) => item.status === "done").length;
    followupOpsPanel.innerHTML = `
      <div class="plan-block">
        <h4>${isClinicianFollowupsPage ? "医生执行中枢" : "医院督办中枢"}</h4>
        <div class="stat-grid">
          ${statChip("当前任务", filteredAssignments.length)}
          ${statChip("逾期", overdueCount)}
          ${statChip("临近逾期", atRiskCount)}
          ${statChip("已完成", doneCount)}
          ${statChip("闭环率", formatRateValue(cohort.referralMetrics.closedLoopRate))}
          ${statChip("转诊完成", `${cohort.referralMetrics.referralCompletedCount}/${cohort.referralMetrics.referralSuggestedCount}`)}
        </div>
      </div>
      <div class="plan-block">
        <h4>三级协同漏斗</h4>
        <div class="funnel-strip">
          ${cohort.coordinationFunnel.stages
            .map(
              (stage) => `
                <div class="funnel-step">
                  <span>${stage.label}</span>
                  <strong>${stage.count}</strong>
                  <div class="dim">${formatRateValue(stage.rate)}</div>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  if (followupWorkloadPanel) {
    followupWorkloadPanel.innerHTML = `
      <div class="governance-grid">
        ${cohort.roleWorkload
          .map(
            (item) => `
              <article class="governance-card ${workload?.role === item.role ? "active-workload" : ""}">
                <div class="governance-head">
                  <strong>${item.roleLabel}</strong>
                  <span class="mini-tag ${item.overdueTaskCount ? "critical" : item.atRiskTaskCount ? "high" : ""}">压力 ${item.pressureIndex}</span>
                </div>
                <ul class="mini-list">
                  <li>医生/管理师：${item.clinicianCount}</li>
                  <li>覆盖患者：${item.patientCount}</li>
                  <li>逾期：${item.overdueTaskCount}</li>
                  <li>临近逾期：${item.atRiskTaskCount}</li>
                  <li>人均患者：${item.averagePatientsPerClinician}</li>
                </ul>
                <div class="dim">重点责任人：${item.topClinicians
                  .slice(0, 2)
                  .map((clinician) => `${clinician.clinicianName}(${clinician.patientCount})`)
                  .join(" · ") || "暂无"}</div>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }
}

function renderReminderCenter() {
  if (!reminderCenter) return;
  const role = mapWorkbenchToFollowupRole(state.filters.workbenchRole);
  const patients = getCurrentPopulationPatients();
  const scopedTodos = patients.flatMap((patient) =>
    patient.roleFollowupPlans
      .filter((plan) => plan.role === role)
      .flatMap((plan) =>
        plan.todoList.map((todo) => ({
          ...todo,
          roleTitle: plan.title,
          patientName: patient.name,
          hospitalName: patient.hospitalName,
          patientId: patient.id,
          nextFollowUpDate: patient.nextFollowUpDate
        }))
      )
  );
  const overdueItems = scopedTodos.filter((todo) => todo.status === "overdue");
  const riskItems = scopedTodos.filter((todo) => todo.status === "at-risk");

  reminderCenter.innerHTML = `
    <div class="plan-block">
      <h4>${labelWorkbenchRole(state.filters.workbenchRole)} 提醒中心</h4>
      <div class="stat-grid">
        ${statChip("逾期待办", overdueItems.length)}
        ${statChip("临近逾期", riskItems.length)}
        ${statChip("当前视图患者", patients.length)}
      </div>
    </div>
    ${
      overdueItems.length
        ? overdueItems
            .map(
              (todo) => `
                <div class="reminder-item overdue">
                  <div class="reminder-head">
                    <div>
                      <strong>${todo.title}</strong>
                      <div class="dim">${todo.patientName} · ${todo.hospitalName}</div>
                    </div>
                    <span class="status-pill high">${formatTodoStatus(todo.status)}</span>
                  </div>
                  <div class="dim">截止：${todo.dueLabel} · 下次随访：${todo.nextFollowUpDate}</div>
                  <div class="dim">${todo.note}</div>
                </div>
              `
            )
            .join("")
        : `<div class="note-block">当前角色在此医院范围内没有逾期待办，已自动收敛到重点随访项。</div>`
    }
    ${
      riskItems.length
        ? `
          <div class="plan-block">
            <h4>临近逾期</h4>
            <ul class="mini-list">
              ${riskItems
                .slice(0, 6)
                .map((todo) => `<li>${todo.patientName} · ${todo.title} · ${todo.dueLabel}</li>`)
                .join("")}
            </ul>
          </div>
        `
        : ""
    }
  `;
}

function deriveFollowupAssignments() {
  const role = mapWorkbenchToFollowupRole(state.filters.workbenchRole);
  const patients = getCurrentPopulationPatients();

  return patients.flatMap((patient) => {
    const plan = patient.roleFollowupPlans.find((item) => item.role === role);
    if (!plan) return [];
    const assignedClinician =
      state.filters.workbenchRole === "health-manager"
        ? getPatientOwner(patient, "responsible")
        : getPatientOwner(patient, "primary");

    return plan.todoList.map((todo) => ({
      ...todo,
      patientId: patient.id,
      patientName: patient.name,
      hospitalId: patient.hospitalId,
      hospitalName: patient.hospitalName,
      clinicianName: assignedClinician.name,
      clinicianDepartment: assignedClinician.department,
      roleTitle: plan.title,
      nextFollowUpDate: patient.nextFollowUpDate,
      adherenceSummary: patient.adherenceSummary
    }));
  });
}

function isHighRiskLevel(level) {
  return level === "high" || level === "critical";
}

function riskRank(level) {
  return {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  }[level] ?? 0;
}

function taskStatusRank(status) {
  return {
    overdue: 4,
    "at-risk": 3,
    pending: 2,
    done: 1,
    none: 0
  }[status] ?? 0;
}

function getRoleFollowupPlan(patient) {
  const role = mapWorkbenchToFollowupRole(state.filters.workbenchRole);
  return patient.roleFollowupPlans?.find((item) => item.role === role) ?? null;
}

function summarizePatientFollowups(patient) {
  const plan = getRoleFollowupPlan(patient);
  const summary = {
    total: 0,
    overdue: 0,
    atRisk: 0,
    pending: 0,
    done: 0,
    overallStatus: "none"
  };

  for (const todo of plan?.todoList ?? []) {
    summary.total += 1;
    if (todo.status === "overdue") summary.overdue += 1;
    else if (todo.status === "at-risk") summary.atRisk += 1;
    else if (todo.status === "pending") summary.pending += 1;
    else if (todo.status === "done") summary.done += 1;
  }

  summary.overallStatus = summary.overdue
    ? "overdue"
    : summary.atRisk
      ? "at-risk"
      : summary.pending
        ? "pending"
        : summary.done
          ? "done"
          : "none";

  return summary;
}

function compactDiagnosis(patient) {
  const diagnoses = patient.diagnoses ?? [];
  return {
    primary: diagnoses[0] ?? "待补充诊断",
    extraCount: Math.max(0, diagnoses.length - 1)
  };
}

function getWorkbenchOwnerMode() {
  return state.filters.workbenchRole === "health-manager" ? "responsible" : "primary";
}

function getWorkbenchOwnerKey(patient) {
  const owner = getPatientOwner(patient, getWorkbenchOwnerMode());
  return `${owner.name}|${owner.department}`;
}

function getPatientPriorityScore(patient) {
  const followup = summarizePatientFollowups(patient);
  return riskRank(getPatientRiskLevel(patient)) * 100 + taskStatusRank(followup.overallStatus) * 20 + patient.age / 10;
}

function getPatientTaskStatusPill(status) {
  if (status === "overdue") return "critical";
  if (status === "at-risk") return "medium";
  if (status === "pending") return "low";
  if (status === "done") return "low";
  return "medium";
}

function getEntityAlertLevel({ overdueCount, highRiskCount, patientCount, alertCount }) {
  if (overdueCount > 0) return "critical";
  if (highRiskCount >= Math.max(2, Math.ceil(patientCount * 0.25)) || alertCount > 0) return "high";
  return "low";
}

function getSelectedEntityPatients(patients) {
  if (!state.hospitalWorkbenchSelectedEntity) return patients;

  if (state.hospitalWorkbenchSelectedEntityType === "hospital") {
    return patients.filter((patient) => patient.hospitalId === state.hospitalWorkbenchSelectedEntity);
  }

  if (state.hospitalWorkbenchSelectedEntityType === "doctor") {
    return patients.filter((patient) => getWorkbenchOwnerKey(patient) === state.hospitalWorkbenchSelectedEntity);
  }

  return patients;
}

function getClinicianScopedPatients(patients) {
  if (!isClinicianFollowupsPage || !state.followupClinician) return patients;
  return patients.filter((patient) => getPatientOwner(patient, getWorkbenchOwnerMode()).name === state.followupClinician);
}

function getWorkbenchScopedAssignments(assignments) {
  if (!isClinicianFollowupsPage || !state.followupClinician) return assignments;
  return assignments.filter((item) => item.clinicianName === state.followupClinician);
}

function hasCompletedReassessment(patient) {
  return (patient.careProcess ?? []).some((entry) => entry.phase === "reassessment");
}

function getDiagnosisOptions(patients) {
  return [...new Set(patients.flatMap((patient) => patient.diagnoses ?? []))].sort((left, right) =>
    left.localeCompare(right, "zh-CN")
  );
}

function patientMatchesViewMode(patient, followupSummary) {
  if (state.patientViewMode === "all") return true;
  return isHighRiskLevel(getPatientRiskLevel(patient)) || followupSummary.overdue > 0 || followupSummary.atRisk > 0;
}

function patientMatchesFollowupStatus(followupSummary) {
  if (state.followupStatus === "all") return true;
  if (state.followupStatus === "active") return followupSummary.overdue > 0 || followupSummary.atRisk > 0;
  return followupSummary.overallStatus === state.followupStatus || (state.followupStatus === "overdue" && followupSummary.overdue > 0);
}

function patientMatchesRiskFilter(patient) {
  if (!state.patientRiskFilter || state.patientRiskFilter === "all") return true;
  const level = getPatientRiskLevel(patient);
  if (state.patientRiskFilter === "high") return isHighRiskLevel(level);
  return level === state.patientRiskFilter;
}

function patientMatchesDiagnosisFilter(patient) {
  if (!state.patientDiseaseFilter || state.patientDiseaseFilter === "all") return true;
  return (patient.diagnoses ?? []).includes(state.patientDiseaseFilter);
}

function getHospitalWorkbenchPatients(patients) {
  let result = getSelectedEntityPatients(patients).filter((patient) => {
    const followupSummary = summarizePatientFollowups(patient);
    return (
      patientMatchesViewMode(patient, followupSummary) &&
      patientMatchesFollowupStatus(followupSummary) &&
      patientMatchesRiskFilter(patient) &&
      patientMatchesDiagnosisFilter(patient)
    );
  });

  if (isClinicianFollowupsPage) {
    if (state.clinicianTab === "completed-reassessments") {
      result = result.filter((patient) => hasCompletedReassessment(patient));
    } else if (state.clinicianTab === "my-patients") {
      result = result.filter((patient) => getClinicianScopedPatients([patient]).length > 0);
    }
  }

  result = result.sort((left, right) => {
    if (state.patientSortBy === "risk") {
      return riskRank(getPatientRiskLevel(right)) - riskRank(getPatientRiskLevel(left));
    }
    if (state.patientSortBy === "age") {
      return right.age - left.age;
    }
    if (state.patientSortBy === "doctor") {
      return getPatientOwner(left, getWorkbenchOwnerMode()).name.localeCompare(
        getPatientOwner(right, getWorkbenchOwnerMode()).name,
        "zh-CN"
      );
    }
    return getPatientPriorityScore(right) - getPatientPriorityScore(left);
  });

  return result;
}

function buildManagementEntityRows(patients, assignments) {
  if (state.hospitalWorkbenchEntityView === "doctor") {
    const grouped = new Map();
    for (const patient of patients) {
      const owner = getPatientOwner(patient, getWorkbenchOwnerMode());
      const key = `${owner.name}|${owner.department}`;
      const entry =
        grouped.get(key) ??
        {
          key,
          type: "doctor",
          name: owner.name,
          subtitle: `${owner.department} · ${patient.hospitalName}`,
          patientIds: new Set(),
          highRiskCount: 0,
          overdueCount: 0,
          alertCount: 0
        };
      entry.patientIds.add(patient.id);
      if (isHighRiskLevel(getPatientRiskLevel(patient))) entry.highRiskCount += 1;
      const followupSummary = summarizePatientFollowups(patient);
      entry.overdueCount += followupSummary.overdue;
      entry.alertCount += followupSummary.atRisk;
      grouped.set(key, entry);
    }

    return [...grouped.values()]
      .map((entry) => ({
        ...entry,
        patientCount: entry.patientIds.size,
        level: getEntityAlertLevel({
          overdueCount: entry.overdueCount,
          highRiskCount: entry.highRiskCount,
          patientCount: entry.patientIds.size,
          alertCount: entry.alertCount
        })
      }))
      .sort((left, right) => right.overdueCount - left.overdueCount || right.highRiskCount - left.highRiskCount);
  }

  const grouped = new Map();
  for (const patient of patients) {
    const hospital = getHospitalById(patient.hospitalId) ?? { id: patient.hospitalId, name: patient.hospitalName, level: "医院" };
    const entry =
      grouped.get(hospital.id) ??
      {
        key: hospital.id,
        type: "hospital",
        name: hospital.name,
        subtitle: hospital.level ?? hospital.category ?? "医院",
        patientIds: new Set(),
        highRiskCount: 0,
        overdueCount: 0,
        alertCount: 0
      };
    entry.patientIds.add(patient.id);
    if (isHighRiskLevel(getPatientRiskLevel(patient))) entry.highRiskCount += 1;
    const followupSummary = summarizePatientFollowups(patient);
    entry.overdueCount += followupSummary.overdue;
    entry.alertCount += followupSummary.atRisk;
    grouped.set(hospital.id, entry);
  }

  return [...grouped.values()]
    .map((entry) => ({
      ...entry,
      patientCount: entry.patientIds.size,
      level: getEntityAlertLevel({
        overdueCount: entry.overdueCount,
        highRiskCount: entry.highRiskCount,
        patientCount: entry.patientIds.size,
        alertCount: entry.alertCount
      })
    }))
    .sort((left, right) => right.overdueCount - left.overdueCount || right.highRiskCount - left.highRiskCount);
}

function getSelectedManagementEntity(rows) {
  if (!rows.length) return null;
  const selected = rows.find((row) => row.key === state.hospitalWorkbenchSelectedEntity);
  return selected ?? rows[0];
}

function buildTaskPriorityCards(patients, assignments, mode = "hospital") {
  const overdueAssignments = assignments.filter((item) => item.status === "overdue");
  const highRiskPatients = patients.filter((patient) => isHighRiskLevel(getPatientRiskLevel(patient)));
  const doctorRows = buildManagementEntityRows(patients, assignments).filter((row) => row.type === "doctor");
  const overloadedDoctors = doctorRows.filter((row) => row.overdueCount > 0 || row.patientCount >= 4);
  const completedReassessments = patients.filter((patient) => hasCompletedReassessment(patient));

  if (mode === "clinician") {
    return [
      {
        key: "overdue",
        title: "优先处理我的逾期随访",
        count: overdueAssignments.length,
        note: "先处理已过截止日的任务，避免患者脱落和复评延期。",
        level: overdueAssignments.length ? "critical" : "low",
        actionLabel: "立即查看",
        target: "patient"
      },
      {
        key: "high-risk",
        title: "关注高风险患者",
        count: highRiskPatients.length,
        note: "高风险对象优先进入干预、复评和 MDT 协同。",
        level: highRiskPatients.length ? "high" : "low",
        actionLabel: "查看患者",
        target: "patient"
      },
      {
        key: "completed-reassessments",
        title: "查看已完成复评",
        count: completedReassessments.length,
        note: "快速回顾已完成复评的人群，确认是否需要继续强化干预。",
        level: completedReassessments.length ? "low" : "low",
        actionLabel: "查看复评",
        target: "patient"
      }
    ];
  }

  return [
    {
      key: "overdue",
      title: "优先处理逾期随访",
      count: overdueAssignments.length,
      note: "先处理已过截止日的任务，避免管理闭环断点。",
      level: overdueAssignments.length ? "critical" : "low",
      actionLabel: "立即查看",
      target: "patient"
    },
    {
      key: "high-risk",
      title: "关注高风险患者",
      count: highRiskPatients.length,
      note: "高风险和多病共管对象需要优先进入干预与复评。",
      level: highRiskPatients.length ? "high" : "low",
      actionLabel: "查看患者",
      target: "patient"
    },
    {
      key: "workload",
      title: "查看医生工作负荷异常",
      count: overloadedDoctors.length,
      note: "优先关注逾期集中、患者负荷偏高的责任医生。",
      level: overloadedDoctors.length ? "high" : "low",
      actionLabel: "查看医生",
      target: "entity"
    }
  ];
}

function applyHospitalWorkbenchFocus(focus) {
  state.selectedPatientTableIds = [];
  state.patientPage = 1;

  if (focus === "overdue") {
    state.followupStatus = "overdue";
    state.patientViewMode = "anomaly";
    state.patientRiskFilter = "all";
  } else if (focus === "high-risk") {
    state.followupStatus = "active";
    state.patientViewMode = "anomaly";
    state.patientRiskFilter = "high";
  } else if (focus === "workload") {
    state.hospitalWorkbenchEntityView = "doctor";
    state.followupStatus = "active";
    state.patientViewMode = "anomaly";
  } else {
    state.followupStatus = "active";
    state.patientViewMode = "anomaly";
    state.patientRiskFilter = "high";
  }

  renderFilters();
  renderFollowupCenter();
}

function applyClinicianWorkbenchFocus(focus) {
  state.selectedPatientTableIds = [];
  state.patientPage = 1;

  if (focus === "overdue") {
    state.clinicianTab = "my-todos";
    state.followupStatus = "overdue";
    state.patientViewMode = "anomaly";
    state.patientRiskFilter = "all";
  } else if (focus === "high-risk") {
    state.clinicianTab = "my-patients";
    state.followupStatus = "active";
    state.patientViewMode = "anomaly";
    state.patientRiskFilter = "high";
  } else if (focus === "completed-reassessments") {
    state.clinicianTab = "completed-reassessments";
    state.followupStatus = "all";
    state.patientViewMode = "all";
    state.patientRiskFilter = "all";
  } else {
    state.clinicianTab = "my-todos";
    state.followupStatus = "active";
    state.patientViewMode = "anomaly";
    state.patientRiskFilter = "high";
  }

  renderFilters();
  renderFollowupCenter();
}

function scrollToWorkbenchSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function formatUpdatedAt() {
  const source = state.publicSourceData?.updatedAt;
  if (source) return `数据更新：${source}`;
  return `数据更新：${new Date().toLocaleString("zh-CN", { hour12: false })}`;
}

function renderManagementKpis(patients, assignments, options = {}) {
  if (!managementKpiCards) return;
  const mode = options.mode ?? "hospital";
  if (mode === "hospital") {
    const cohort = state.populationCohort ?? state.populationDistrictCohort;
    const insights = computeHospitalInsights();
    const activeInsight = resolveActiveHospitalInsight(insights);
    const scopedHospitalIds = state.filters.hospitalId
      ? [state.filters.hospitalId]
      : [...new Set((patients ?? []).map((patient) => patient.hospitalId))];
    const doctorAndManagerCount = state.allClinicians.filter(
      (clinician) =>
        clinician.hospitalIds.some((hospitalId) => scopedHospitalIds.includes(hospitalId)) &&
        ["specialist-doctor", "general-practitioner", "health-manager"].includes(clinician.workbenchRole)
    ).length;
    const cards = [
      {
        label: "患者数",
        value: formatCompactMetric(activeInsight?.patientCount ?? patients.length),
        note: activeInsight ? `${activeInsight.hospital.name} 当前纳管规模` : `${qixiaDistrictName}医院网络当前纳管规模`
      },
      {
        label: "起效率",
        value: activeInsight?.effectiveRate ?? "0%",
        note: "风险分值下降至少 8 分或风险等级下降"
      },
      {
        label: "覆盖率",
        value: cohort?.publicProfile?.totalPopulation
          ? coveragePercentage(activeInsight?.patientCount ?? patients.length, cohort.publicProfile.totalPopulation)
          : "0%",
        note: "基于区级公开人口底盘与当前纳管口径"
      },
      {
        label: "院内可用医生与管理师",
        value: formatCompactMetric(doctorAndManagerCount),
        note: state.filters.hospitalId ? "当前医院可调用角色数" : `${qixiaDistrictName}全域可调用角色数`
      }
    ];

    managementKpiCards.innerHTML = cards
      .map(
        (item) => `
          <article class="management-kpi-card low static">
            <div class="management-kpi-label">
              <span>${item.label}</span>
              <span class="status-pill low">概览</span>
            </div>
            <div class="management-kpi-value">
              <strong>${item.value}</strong>
            </div>
            <div class="management-kpi-note">${item.note}</div>
          </article>
        `
      )
      .join("");
    return;
  }

  const highRiskPatients = patients.filter((patient) => isHighRiskLevel(getPatientRiskLevel(patient))).length;
  const overdueAssignments = assignments.filter((item) => item.status === "overdue").length;
  const alertAssignments = assignments.filter((item) => item.status === "at-risk").length;
  const kpis = [
    {
      key: "patients",
      label: mode === "clinician" ? "我负责的患者数" : "管理患者数",
      value: patients.length,
      note:
        mode === "clinician"
          ? state.followupClinician
            ? `${state.followupClinician} 当前范围`
            : "当前医生工作范围"
          : state.filters.hospitalId
            ? "当前机构视图"
            : `${qixiaDistrictName}范围内`,
      level: "low"
    },
    {
      key: "high-risk",
      label: "高风险患者数",
      value: highRiskPatients,
      note: `${patients.length ? Math.round((highRiskPatients / patients.length) * 100) : 0}% 需优先干预`,
      level: highRiskPatients ? "high" : "low"
    },
    {
      key: "overdue",
      label: "逾期随访数",
      value: overdueAssignments,
      note: overdueAssignments ? "建议立即进入任务清单" : "当前无逾期",
      level: overdueAssignments ? "critical" : "low"
    },
    {
      key: "alerts",
      label: "待处理预警数",
      value: alertAssignments,
      note: alertAssignments ? "包含临近逾期和待干预对象" : "当前预警较少",
      level: alertAssignments ? "high" : "low"
    }
  ];

  managementKpiCards.innerHTML = kpis
    .map(
      (item) => `
        <button class="management-kpi-card ${item.level}" data-management-focus="${item.key}">
          <div class="management-kpi-label">
            <span>${item.label}</span>
            <span class="status-pill ${item.level === "critical" ? "critical" : item.level === "high" ? "high" : "low"}">${item.level === "critical" ? "优先" : item.level === "high" ? "关注" : "概览"}</span>
          </div>
          <div class="management-kpi-value">
            <strong>${formatCompactMetric(item.value)}</strong>
          </div>
          <div class="management-kpi-note">${item.note}</div>
        </button>
      `
    )
    .join("");

  managementKpiCards.querySelectorAll("[data-management-focus]").forEach((node) => {
    node.addEventListener("click", () => {
      const focus = node.getAttribute("data-management-focus");
      if (focus === "patients") {
        if (mode === "clinician") {
          state.clinicianTab = "my-patients";
        }
        state.patientViewMode = "all";
        state.followupStatus = "all";
        state.patientRiskFilter = "all";
        state.patientPage = 1;
        renderFilters();
        renderFollowupCenter();
        scrollToWorkbenchSection("patient-workbench-section");
        return;
      }
      if (mode === "clinician") applyClinicianWorkbenchFocus(focus);
      else applyHospitalWorkbenchFocus(focus);
      scrollToWorkbenchSection("patient-workbench-section");
    });
  });
}

function renderTaskPriorityZone(patients, assignments, options = {}) {
  if (!managementTaskCards) return;
  const mode = options.mode ?? "hospital";
  const cards = buildTaskPriorityCards(patients, assignments, mode);
  managementTaskCards.innerHTML = cards
    .map(
      (card) => `
        <article class="task-priority-card ${card.level}">
          <div class="task-priority-head">
            <div>
              <strong>${card.title}</strong>
              <p>${card.note}</p>
            </div>
            <div class="task-priority-count">${formatCompactMetric(card.count)}</div>
          </div>
          <div class="task-priority-footer">
            <span class="mini-tag ${card.level === "critical" ? "critical" : card.level === "high" ? "high" : ""}">
              ${card.level === "critical" ? "立即处理" : card.level === "high" ? "优先关注" : "常规"}
            </span>
            <button class="task-priority-button" data-priority-focus="${card.key}" data-priority-target="${card.target}">
              ${card.actionLabel}
            </button>
          </div>
        </article>
      `
    )
    .join("");

  managementTaskCards.querySelectorAll("[data-priority-focus]").forEach((node) => {
    node.addEventListener("click", () => {
      const focus = node.getAttribute("data-priority-focus");
      const target = node.getAttribute("data-priority-target");
      if (mode === "clinician") applyClinicianWorkbenchFocus(focus);
      else applyHospitalWorkbenchFocus(focus);
      scrollToWorkbenchSection(target === "entity" ? "management-focus-section" : "patient-workbench-section");
    });
  });
}

function renderEntityViewToggle() {
  if (!entityViewToggle) return;
  const views = [
    { key: "hospital", label: "按机构看" },
    { key: "doctor", label: "按医生看" }
  ];
  entityViewToggle.innerHTML = views
    .map(
      (view) => `
        <button class="entity-toggle-button ${state.hospitalWorkbenchEntityView === view.key ? "active" : ""}" data-entity-view="${view.key}">
          ${view.label}
        </button>
      `
    )
    .join("");

  entityViewToggle.querySelectorAll("[data-entity-view]").forEach((node) => {
    node.addEventListener("click", () => {
      const nextView = node.getAttribute("data-entity-view");
      if (!nextView || nextView === state.hospitalWorkbenchEntityView) return;
      state.hospitalWorkbenchEntityView = nextView;
      state.hospitalWorkbenchSelectedEntity = "";
      state.hospitalWorkbenchSelectedEntityType = "";
      state.selectedPatientTableIds = [];
      state.patientPage = 1;
      renderFollowupCenter();
    });
  });
}

function renderEntityPerformanceZone(patients, assignments, options = {}) {
  if (!managementFocusBoard || !managementFocusDetail) return;
  const mode = options.mode ?? "hospital";
  renderEntityViewToggle();
  const rows = buildManagementEntityRows(patients, assignments);
  const activeRow = getSelectedManagementEntity(rows);
  if (activeRow && activeRow.key !== state.hospitalWorkbenchSelectedEntity) {
    state.hospitalWorkbenchSelectedEntity = activeRow.key;
    state.hospitalWorkbenchSelectedEntityType = activeRow.type;
  }

  managementFocusBoard.innerHTML = rows.length
    ? `
      <div class="focus-table">
        <div class="focus-table-head">
          <span>${state.hospitalWorkbenchEntityView === "hospital" ? "机构" : "医生"}</span>
          <span>${state.hospitalWorkbenchEntityView === "hospital" ? "等级" : "科室"}</span>
          <span>患者</span>
          <span>高风险</span>
          <span>逾期</span>
          <span>操作</span>
        </div>
        ${rows
          .map(
            (row) => `
              <div class="focus-table-row ${activeRow?.key === row.key ? "active" : ""}" data-focus-row="${row.key}" data-focus-type="${row.type}">
                <div class="focus-entity-main">
                  <strong>${row.name}</strong>
                  <div class="dim">${row.subtitle}</div>
                </div>
                <span class="mini-tag ${row.level === "critical" ? "critical" : row.level === "high" ? "high" : ""}">
                  ${row.type === "hospital" ? row.subtitle : row.subtitle.split(" · ")[0]}
                </span>
                <strong>${row.patientCount}</strong>
                <strong>${row.highRiskCount}</strong>
                <strong>${row.overdueCount}</strong>
                <div class="focus-table-action">
                  <button class="focus-row-button" data-focus-detail="${row.key}" data-focus-type="${row.type}">查看详情</button>
                </div>
              </div>
            `
          )
          .join("")}
      </div>
    `
    : `<div class="note-block">当前范围内暂无可展示的机构或医生表现数据。</div>`;

  const selectedPatients = activeRow
    ? getSelectedEntityPatients(patients.filter((patient) => {
        if (activeRow.type === "hospital") return patient.hospitalId === activeRow.key;
        return getWorkbenchOwnerKey(patient) === activeRow.key;
      }))
    : [];

  managementFocusDetail.innerHTML = activeRow
    ? `
      <div class="focus-detail-card">
        <h4>${activeRow.name}</h4>
        <div class="dim">${activeRow.subtitle}</div>
        <div class="focus-stat-list">
          <div class="focus-stat-item"><span>管理患者</span><strong>${activeRow.patientCount}</strong></div>
          <div class="focus-stat-item"><span>高风险人数</span><strong>${activeRow.highRiskCount}</strong></div>
          <div class="focus-stat-item"><span>逾期任务</span><strong>${activeRow.overdueCount}</strong></div>
          <div class="focus-stat-item"><span>待处理预警</span><strong>${activeRow.alertCount}</strong></div>
        </div>
      </div>
      <div class="focus-detail-card">
        <h4>建议动作</h4>
        <ul class="mini-list">
          <li>优先查看 ${activeRow.overdueCount ? "逾期任务" : "高风险患者"}，避免管理闭环延迟。</li>
          <li>${activeRow.type === "hospital" ? "下钻到该机构患者列表" : "下钻到该医生名下患者列表"}，收敛当天处理范围。</li>
          <li>${mode === "clinician" ? "结合我的待办和复评结果，判断是否需要强化干预或升级 MDT。" : "必要时导出逾期待办，安排责任医生和健康管理师当天完成回访。"}</li>
        </ul>
        <button class="task-priority-button" data-open-selected-entity>只看该${activeRow.type === "hospital" ? "机构" : "医生"}患者</button>
      </div>
    `
    : `<div class="note-block">请选择一个机构或医生查看详细表现。</div>`;

  managementFocusBoard.querySelectorAll("[data-focus-detail], [data-focus-row]").forEach((node) => {
    node.addEventListener("click", () => {
      state.hospitalWorkbenchSelectedEntity = node.getAttribute("data-focus-detail") || node.getAttribute("data-focus-row") || "";
      state.hospitalWorkbenchSelectedEntityType = node.getAttribute("data-focus-type") || "";
      state.patientPage = 1;
      renderFollowupCenter();
    });
  });

  managementFocusDetail.querySelector("[data-open-selected-entity]")?.addEventListener("click", () => {
    state.patientPage = 1;
    scrollToWorkbenchSection("patient-workbench-section");
    renderFollowupCenter();
  });
}

function syncPatientWorkbenchFilters(patients) {
  if (patientViewFilter) patientViewFilter.value = state.patientViewMode;

  if (patientRiskFilter) {
    patientRiskFilter.innerHTML = `
      <option value="all">全部风险等级</option>
      <option value="critical">仅危急</option>
      <option value="high">高风险及以上</option>
      <option value="medium">仅中风险</option>
      <option value="low">仅低风险</option>
    `;
    patientRiskFilter.value = state.patientRiskFilter;
  }

  if (patientDiagnosisFilter) {
    const options = getDiagnosisOptions(patients);
    patientDiagnosisFilter.innerHTML = [
      `<option value="all">全部病种</option>`,
      ...options.map((item) => `<option value="${item}">${item}</option>`)
    ].join("");
    patientDiagnosisFilter.value = state.patientDiseaseFilter || "all";
  }

  if (patientSortFilter) patientSortFilter.value = state.patientSortBy;
  if (followupStatusFilter) followupStatusFilter.value = state.followupStatus;
}

function exportSelectedPatients(selectedPatients) {
  if (!selectedPatients.length) return;
  const exportDate = new Date().toISOString().slice(0, 10);
  const rows = [
    ["姓名", "机构", "责任医生", "风险等级", "主要诊断", "年龄", "随访状态", "下次随访"],
    ...selectedPatients.map((patient) => {
      const owner = getPatientOwner(patient, getWorkbenchOwnerMode());
      const diagnosis = compactDiagnosis(patient);
      const followup = summarizePatientFollowups(patient);
      return [
        patient.name,
        patient.hospitalName,
        owner.name,
        formatLevel(getPatientRiskLevel(patient)),
        diagnosis.primary,
        `${patient.age}`,
        formatTodoStatus(followup.overallStatus),
        patient.nextFollowUpDate
      ];
    })
  ];

  if (typeof window !== "undefined" && window.XLSX) {
    const worksheet = window.XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = [{ wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 24 }, { wch: 8 }, { wch: 12 }, { wch: 14 }];
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "患者清单");
    window.XLSX.writeFile(workbook, `patient-workbench-selected-${exportDate}.xlsx`);
    return;
  }

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  downloadTextFile(`patient-workbench-selected-${exportDate}.csv`, csv, "text/csv;charset=utf-8");
}

function renderPatientTableZone(patients, options = {}) {
  if (!patientTable || !patientTableSummary || !patientTablePagination) return;
  const mode = options.mode ?? "hospital";
  syncPatientWorkbenchFilters(patients);
  const visiblePatients = getHospitalWorkbenchPatients(patients);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(visiblePatients.length / pageSize));
  state.patientPage = Math.max(1, Math.min(state.patientPage, totalPages));
  const start = (state.patientPage - 1) * pageSize;
  const pageItems = visiblePatients.slice(start, start + pageSize);
  const selectedIds = new Set(state.selectedPatientTableIds);

  patientTableSummary.innerHTML = `
    <div class="entity-counts">
      <span class="mini-tag">${visiblePatients.length} 人</span>
      <span class="mini-tag ${state.patientViewMode === "anomaly" ? "high" : ""}">${state.patientViewMode === "anomaly" ? "异常优先" : "全部患者"}</span>
      <span class="mini-tag ${state.followupStatus !== "all" ? "critical" : ""}">${state.followupStatus === "all" ? "全部任务" : state.followupStatus === "active" ? "逾期 + 临近逾期" : "仅逾期"}</span>
      ${mode === "clinician" ? `<span class="mini-tag">${clinicianTabLabel(state.clinicianTab)}</span>` : ""}
    </div>
    <div class="dim">${mode === "clinician" ? "默认先显示与当前医生最相关的异常患者；可切到“我负责的患者”或“已完成复评”。" : "默认只显示异常患者。点击风险卡、任务卡或机构/医生行，可直接下钻到已筛选列表。"}</div>
  `;

  const selectedPatients = visiblePatients.filter((patient) => selectedIds.has(patient.id));
  clearPatientSelectionBtn && (clearPatientSelectionBtn.disabled = !selectedPatients.length);
  exportSelectedPatientsBtn && (exportSelectedPatientsBtn.disabled = !selectedPatients.length);

  patientTable.innerHTML = `
    <div class="patient-batch-bar">
      <div class="dim">已选择 ${selectedPatients.length} 位患者，可直接批量导出当前处理清单。</div>
      <div class="patient-batch-actions">
        <span class="mini-tag">${state.patientPage} / ${totalPages} 页</span>
      </div>
    </div>
    <div class="patient-table-frame">
      <table class="patient-table">
        <thead>
          <tr>
            <th style="width:40px;"></th>
            <th>姓名</th>
            <th>风险等级</th>
            <th>主要诊断</th>
            <th>年龄</th>
            <th>责任医生 / 所属机构</th>
            <th>最近随访状态</th>
            <th style="text-align:right;">操作</th>
          </tr>
        </thead>
        <tbody>
          ${
            pageItems.length
              ? pageItems
                  .map((patient) => {
                    const owner = getPatientOwner(patient, getWorkbenchOwnerMode());
                    const diagnosis = compactDiagnosis(patient);
                    const followup = summarizePatientFollowups(patient);
                    return `
                      <tr class="${state.populationPatientId === patient.id ? "selected" : ""}">
                        <td><input type="checkbox" data-patient-select="${patient.id}" ${selectedIds.has(patient.id) ? "checked" : ""} /></td>
                        <td>
                          <div class="patient-row-main">
                            <strong>${patient.name}</strong>
                            <div class="dim">${patient.managementTier} · 下次随访 ${patient.nextFollowUpDate}</div>
                          </div>
                        </td>
                        <td><span class="status-pill ${getPatientRiskLevel(patient)}">${formatLevel(getPatientRiskLevel(patient))}</span></td>
                        <td>
                          <div class="patient-diagnosis-cell">
                            <span>${diagnosis.primary}</span>
                            ${diagnosis.extraCount ? `<span class="diagnosis-more-tag">+${diagnosis.extraCount}</span>` : ""}
                          </div>
                        </td>
                        <td>${patient.age} 岁</td>
                        <td>
                          <div class="patient-row-main">
                            <strong>${owner.name}</strong>
                            <div class="dim">${patient.hospitalName}</div>
                          </div>
                        </td>
                        <td><span class="status-pill ${getPatientTaskStatusPill(followup.overallStatus)}">${formatTodoStatus(followup.overallStatus)}</span></td>
                        <td>
                          <div class="patient-row-actions">
                            <button class="patient-row-button secondary" data-open-patient="${patient.id}">查看</button>
                          </div>
                        </td>
                      </tr>
                    `;
                  })
                  .join("")
              : `<tr><td colspan="8"><div class="note-block">当前筛选条件下没有匹配患者。</div></td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;

  patientTablePagination.innerHTML = `
    <div class="dim">显示 ${visiblePatients.length ? start + 1 : 0}-${Math.min(start + pageSize, visiblePatients.length)} / ${visiblePatients.length}</div>
    <div class="pagination-controls">
      <button class="pagination-button" data-page-action="prev" ${state.patientPage <= 1 ? "disabled" : ""}>上一页</button>
      <button class="pagination-button" data-page-action="next" ${state.patientPage >= totalPages ? "disabled" : ""}>下一页</button>
    </div>
  `;

  patientTable.querySelectorAll("[data-open-patient]").forEach((node) => {
    node.addEventListener("click", async () => {
      syncActivePatient(node.getAttribute("data-open-patient"));
      renderPopulation();
      renderFollowupCenter();
      if (shouldLoadWorkspacePage()) await loadWorkspace();
    });
  });

  patientTable.querySelectorAll("[data-patient-select]").forEach((node) => {
    node.addEventListener("change", () => {
      const id = node.getAttribute("data-patient-select");
      if (!id) return;
      const next = new Set(state.selectedPatientTableIds);
      if (node.checked) next.add(id);
      else next.delete(id);
      state.selectedPatientTableIds = [...next];
      renderFollowupCenter();
    });
  });

  patientTablePagination.querySelectorAll("[data-page-action]").forEach((node) => {
    node.addEventListener("click", () => {
      const action = node.getAttribute("data-page-action");
      state.patientPage += action === "next" ? 1 : -1;
      renderFollowupCenter();
    });
  });

  if (exportSelectedPatientsBtn) {
    exportSelectedPatientsBtn.onclick = () => {
      exportSelectedPatients(selectedPatients);
    };
  }

  if (clearPatientSelectionBtn) {
    clearPatientSelectionBtn.onclick = () => {
      state.selectedPatientTableIds = [];
      renderFollowupCenter();
    };
  }
}

function renderHospitalWorkbench() {
  const assignments = deriveFollowupAssignments();
  const patients = getCurrentPopulationPatients();
  setElementText(
    heroSubtitle,
    `${state.filters.hospitalId ? `${getHospitalById(state.filters.hospitalId)?.name ?? "指定医院"} · ` : `${qixiaDistrictName}全域 · `}${labelWorkbenchRole(state.filters.workbenchRole)}视角，先处理逾期和高风险，再下钻到责任医生和患者。`
  );
  setElementText(
    managementScopeSummary,
    `当前视角：${state.filters.hospitalId ? getHospitalById(state.filters.hospitalId)?.name ?? "指定医院" : `${qixiaDistrictName}全域`} · ${labelWorkbenchRole(state.filters.workbenchRole)}`
  );
  setElementText(managementUpdatedAt, formatUpdatedAt());

  renderManagementKpis(patients, assignments, { mode: "hospital" });
  renderHospitalDashboardPanels();
  renderTaskPriorityZone(patients, assignments, { mode: "hospital" });
  renderEntityPerformanceZone(patients, assignments, { mode: "hospital" });
  renderPatientTableZone(patients, { mode: "hospital" });
  refreshInterfacePolish();
}

function renderClinicianWorkbench() {
  const allAssignments = deriveFollowupAssignments();
  syncFollowupClinicianFilter(allAssignments);
  const assignments = getWorkbenchScopedAssignments(allAssignments);
  const patients = getClinicianScopedPatients(getCurrentPopulationPatients());

  setElementText(
    heroSubtitle,
    `${state.filters.hospitalId ? `${getHospitalById(state.filters.hospitalId)?.name ?? "指定医院"} · ` : `${qixiaDistrictName}全域 · `}${labelWorkbenchRole(state.filters.workbenchRole)}${state.followupClinician ? ` · ${state.followupClinician}` : ""}，当前页面只保留今天需要执行的患者、证据和 MDT 动作。`
  );
  setElementText(
    managementScopeSummary,
    `当前视角：${state.filters.hospitalId ? getHospitalById(state.filters.hospitalId)?.name ?? "指定医院" : `${qixiaDistrictName}全域`} · ${labelWorkbenchRole(state.filters.workbenchRole)}${state.followupClinician ? ` · ${state.followupClinician}` : ""}`
  );
  setElementText(managementUpdatedAt, formatUpdatedAt());

  renderClinicianTabs();
  renderManagementKpis(patients, assignments, { mode: "clinician" });
  renderTaskPriorityZone(patients, assignments, { mode: "clinician" });
  renderEntityPerformanceZone(patients, assignments, { mode: "clinician" });
  renderPatientTableZone(patients, { mode: "clinician" });
  if (state.populationCohort) {
    renderPopulation();
  }
  renderClinicianClinicalWorkbench();
  refreshInterfacePolish();
}

function renderHospitalDashboardPanels() {
  const cohort = state.populationCohort ?? state.populationDistrictCohort;
  if (!cohort) return;
  const insights = computeHospitalInsights();
  const activeInsight = resolveActiveHospitalInsight(insights);

  if (hospitalDetailPanel) {
    hospitalDetailPanel.innerHTML = activeInsight
      ? `
        <div class="plan-block plan-block-highlight">
          <h4>${activeInsight.hospital.name}</h4>
          <div class="dim">${activeInsight.hospital.level ?? "医院"} · ${activeInsight.hospital.category ?? ""} · ${activeInsight.hospital.networkRole ?? ""}</div>
          <div class="stat-grid">
            ${statChip("管理患者", activeInsight.patientCount)}
            ${statChip("起效率", activeInsight.effectiveRate)}
            ${statChip("前评分均值", activeInsight.averageBefore)}
            ${statChip("后评分均值", activeInsight.averageAfter)}
          </div>
        </div>
        <div class="hospital-analytics-split">
          <div class="plan-block">
            <h4>疾病比例</h4>
            <div class="story-bar-list">
              ${activeInsight.diseaseRatios
                .map(
                  (item) => `
                    <div class="story-bar-item">
                      <div class="story-bar-copy">
                        <span>${item.label}</span>
                        <strong>${item.ratio}</strong>
                      </div>
                      <div class="story-bar-track"><i data-progress-width="${item.ratio}"></i></div>
                    </div>
                  `
                )
                .join("")}
            </div>
          </div>
          <div class="plan-block">
            <h4>治疗包类型与比例</h4>
            <div class="story-bar-list">
              ${activeInsight.packageRatios
                .map(
                  (item) => `
                    <div class="story-bar-item">
                      <div class="story-bar-copy">
                        <span>${item.title}</span>
                        <strong>${item.ratio}</strong>
                      </div>
                      <div class="story-bar-track warm"><i data-progress-width="${item.ratio}"></i></div>
                    </div>
                  `
                )
                .join("")}
            </div>
          </div>
        </div>
      `
      : `<div class="note-block">当前没有可展示的医院详情。</div>`;
    activateProgressBars(hospitalDetailPanel);
  }

  if (medclawOverviewPanel || medclawGuardrails) {
    const scopedHospital = activeInsight?.hospital?.name ?? `${qixiaDistrictName}医院网络`;
    setElementHtml(
      medclawOverviewPanel,
      `
        <div class="plan-block">
          <h4>${state.medclawOverview?.name ?? "MedClaw"}</h4>
          <div class="dim">${state.medclawOverview?.tagline ?? "面向医院级临床场景的智能边界平台"}</div>
          <ul class="mini-list">
            ${(state.medclawOverview?.modules ?? []).map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </div>
        <div class="plan-block">
          <h4>当前作用域</h4>
          <ul class="mini-list">
            <li>医院：${scopedHospital}</li>
            <li>角色：${labelWorkbenchRole(state.filters.workbenchRole)}</li>
            <li>定位：医院级智能边界、只读审计、临床协同增强</li>
          </ul>
        </div>
      `
    );
    setElementHtml(
      medclawGuardrails,
      `
        <div class="plan-block">
          <h4>临床边界</h4>
          <ul class="mini-list">
            <li>只读临床数据，不回写原始病历与检查。</li>
            <li>按院内角色隔离访问范围，管理台只展示当前医院范围。</li>
            <li>围绕影像解析、病历草拟、辅助诊断和审计留痕提供能力。</li>
          </ul>
        </div>
      `
    );
  }
}

function renderClinicianClinicalWorkbench() {
  if (!isClinicianFollowupsPage || !state.workspace) return;
  const workspace = state.workspace;
  const medclawWorkspace = state.medclawWorkspace;
  const patient = workspace.patient;
  const liveRisk = workspace.liveRiskAssessment;
  const carePlan = workspace.latestCarePlan?.content ?? null;
  const cohortPatient = (state.populationCohort?.patients ?? []).find((item) => item.id === state.populationPatientId) ?? null;

  setElementHtml(
    patientOverview,
    [
      statChip("姓名", patient.name),
      statChip("医院", patient.hospitalName),
      statChip("年龄", `${patient.age} 岁`),
      statChip("实时风险", formatLevel(liveRisk.level)),
      statChip("血压", `${patient.vitals.systolicBp}/${patient.vitals.diastolicBp}`),
      statChip("睡眠", `${patient.lifestyle.averageSleepHours}h`)
    ].join("")
  );

  setElementHtml(
    riskDomainGrid,
    liveRisk.domainAssessments
      .map(
        (domain) => `
          <article class="risk-card">
            <div class="status-pill ${domain.level}">${domain.label} · ${formatLevel(domain.level)}</div>
            <h4>${domain.score} 分</h4>
            <div class="dim">${domain.summary}</div>
            <ul class="mini-list">${domain.drivers.map((driver) => `<li>${driver}</li>`).join("")}</ul>
          </article>
        `
      )
      .join("")
  );

  const medications = patient.medications ?? [];
  const careGoals = carePlan?.careGoals ?? [];
  const rehabSignals = cohortPatient
    ? [
        cohortPatient.adherenceSummary,
        `下次随访：${cohortPatient.nextFollowUpDate}`,
        `管理层级：${cohortPatient.managementTier}`,
        ...(cohortPatient.topDomains ?? []).map((domain) => `重点慢病：${labelRiskDomain(domain)}`)
      ]
    : ["当前正在读取康复与随访信号"];

  setElementHtml(
    carePlanSummary,
    `
      <div class="plan-block">
        <h4>疗程</h4>
        <ul class="mini-list">${careGoals.length ? careGoals.map((goal) => `<li>${goal}</li>`).join("") : "<li>待生成整合疗程目标</li>"}</ul>
      </div>
      <div class="plan-block">
        <h4>用药</h4>
        <ul class="mini-list">
          ${
            medications.length
              ? medications.map((item) => `<li>${item.name} · ${item.dose} · 依从性 ${item.adherence}</li>`).join("")
              : "<li>当前未记录用药方案</li>"
          }
        </ul>
      </div>
      <div class="plan-block">
        <h4>康复情况</h4>
        <ul class="mini-list">${rehabSignals.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
    `
  );

  setElementHtml(
    therapyPackageGrid,
    (carePlan?.therapyPackages ?? []).length
      ? carePlan.therapyPackages
          .map(
            (pkg) => `
              <button class="package-card package-card-action">
                <div class="panel-kicker">${pkg.title}</div>
                <h4>${pkg.content.title ?? pkg.title}</h4>
                <div class="dim">${pkg.content.rationale ?? ""}</div>
                <ul class="mini-list">${(pkg.content.interventions ?? []).map((item) => `<li>${item}</li>`).join("")}</ul>
              </button>
            `
          )
          .join("")
      : `<div class="note-block">当前患者尚未生成行为干预疗法包。</div>`
  );

  const recordDraftContent = medclawWorkspace?.recordDraft ?? null;
  setElementHtml(
    recordDraft,
    recordDraftContent
      ? `
        <div class="plan-block">
          <h4>主诉</h4>
          <div class="dim">${recordDraftContent.chiefComplaint}</div>
        </div>
        <div class="plan-block">
          <h4>现病史</h4>
          <div class="dim">${recordDraftContent.presentIllness}</div>
        </div>
        <div class="plan-block">
          <h4>查体与检查</h4>
          <ul class="mini-list">
            <li>${recordDraftContent.physicalExam}</li>
            <li>${recordDraftContent.auxiliaryExams}</li>
          </ul>
        </div>
      `
      : `<div class="note-block">当前未生成 AI 病历草案。</div>`
  );

  const diagnosisSupportContent = medclawWorkspace?.diagnosisSupport ?? null;
  setElementHtml(
    diagnosisSupport,
    diagnosisSupportContent
      ? `
        <div class="plan-block">
          <h4>诊断建议</h4>
          <ul class="mini-list">
            ${diagnosisSupportContent.suggestions
              .map(
                (item) =>
                  `<li>${item.diagnosis}（置信度 ${Math.round(item.confidence * 100)}%）：${item.rationale.join("；")}</li>`
              )
              .join("")}
          </ul>
        </div>
        <div class="plan-block">
          <h4>病情预测</h4>
          <ul class="mini-list">${diagnosisSupportContent.predictions
            .map((item) => `<li>${item.metric}：${item.value}；${item.explanation}</li>`)
            .join("")}</ul>
        </div>
        ${
          medclawWorkspace?.kgFollowup
            ? `
              <div class="plan-block">
                <h4>KG-Followup 追问</h4>
                <ul class="mini-list">
                  ${medclawWorkspace.kgFollowup.questions.slice(0, 5).map((item) => `<li>${item.question}</li>`).join("")}
                </ul>
              </div>
            `
            : ""
        }
      `
      : `<div class="note-block">当前未生成辅助诊断与病情预测建议。</div>`
  );

  renderMeetings();
}

function getVisibleFollowupAssignments() {
  const assignments = deriveFollowupAssignments();
  return assignments.filter((item) => {
    if (isClinicianFollowupsPage && state.followupClinician && item.clinicianName !== state.followupClinician) {
      return false;
    }
    if (state.followupStatus === "all") return true;
    if (state.followupStatus === "active") return item.status === "overdue" || item.status === "at-risk";
    return item.status === state.followupStatus;
  });
}

function syncFollowupClinicianFilter(assignments) {
  if (!followupClinicianFilter) return;
  const clinicianNames = [...new Set(assignments.map((item) => item.clinicianName))].sort((left, right) =>
    left.localeCompare(right, "zh-CN")
  );

  if (state.followupClinician && !clinicianNames.includes(state.followupClinician)) {
    state.followupClinician = "";
  }
  if (isClinicianFollowupsPage && !state.followupClinician && clinicianNames.length) {
    state.followupClinician = clinicianNames[0];
  }

  followupClinicianFilter.innerHTML = [
    `<option value="">全部随访医生</option>`,
    ...clinicianNames.map((name) => `<option value="${name}">${name}</option>`)
  ].join("");
  followupClinicianFilter.value = state.followupClinician;
}

function clinicianTabLabel(tab) {
  return {
    "my-todos": "我的待办",
    "my-patients": "我负责的患者",
    "completed-reassessments": "已完成复评"
  }[tab] ?? tab;
}

function renderClinicianTabs() {
  if (!isClinicianFollowupsPage || !clinicianTabs) return;
  const tabs = ["my-todos", "my-patients", "completed-reassessments"];
  clinicianTabs.innerHTML = tabs
    .map(
      (tab) => `
        <button class="tab-button ${state.clinicianTab === tab ? "active" : ""}" data-clinician-tab="${tab}">
          ${clinicianTabLabel(tab)}
        </button>
      `
    )
    .join("");

  clinicianTabs.querySelectorAll("[data-clinician-tab]").forEach((node) => {
    node.addEventListener("click", () => {
      state.clinicianTab = node.getAttribute("data-clinician-tab") || "my-todos";
      state.selectedPatientTableIds = [];
      state.patientPage = 1;
      if (state.clinicianTab === "my-todos") {
        state.patientViewMode = "anomaly";
        state.followupStatus = "active";
      } else if (state.clinicianTab === "my-patients") {
        state.patientViewMode = "all";
        state.followupStatus = "all";
      } else if (state.clinicianTab === "completed-reassessments") {
        state.patientViewMode = "all";
        state.followupStatus = "all";
      }
      renderFilters();
      renderFollowupCenter();
    });
  });
}

function exportOverdueFollowups() {
  const overdueAssignments = deriveFollowupAssignments().filter((item) => {
    if (item.status !== "overdue") return false;
    if (isClinicianFollowupsPage && state.followupClinician && item.clinicianName !== state.followupClinician) {
      return false;
    }
    return true;
  });

  const scopeLabel = isClinicianFollowupsPage
    ? state.followupClinician || "all-clinicians"
    : state.filters.hospitalId || "qixia-all-hospitals";
  const exportDate = new Date().toISOString().slice(0, 10);
  const headerTitle = state.filters.hospitalId
    ? `${getHospitalById(state.filters.hospitalId)?.name ?? "指定医院"}逾期待办清单`
    : `${qixiaDistrictName}医院网络逾期待办清单`;
  const roleLabel = labelWorkbenchRole(state.filters.workbenchRole);
  const sheetRows = [
    [headerTitle],
    [`导出日期：${exportDate}`],
    [
      `角色：${roleLabel}${isClinicianFollowupsPage ? `；随访医生：${state.followupClinician || "全部"}` : ""}；范围：${
        state.filters.hospitalId ? getHospitalById(state.filters.hospitalId)?.name ?? "指定医院" : `${qixiaDistrictName}全域`
      }`
    ],
    [],
    ["患者", "医院", "随访医生", "角色", "任务", "状态", "截止日期", "下次随访", "说明"]
  ];
  const dataRows = overdueAssignments.map((item) => [
    item.patientName,
    item.hospitalName,
    item.clinicianName,
    roleLabel,
    item.title,
    formatTodoStatus(item.status),
    item.dueLabel,
    item.nextFollowUpDate,
    item.note
  ]);
  const workbookRows = [...sheetRows, ...dataRows];

  const xlsxAvailable = typeof window !== "undefined" && window.XLSX;
  if (xlsxAvailable) {
    const worksheet = window.XLSX.utils.aoa_to_sheet(workbookRows);
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }
    ];
    worksheet["!cols"] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 14 },
      { wch: 10 },
      { wch: 24 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 34 }
    ];
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "逾期待办");
    window.XLSX.writeFile(workbook, `followups-overdue-${scopeLabel}-${exportDate}.xlsx`);
    return;
  }

  const filename = `followups-overdue-${scopeLabel}-${exportDate}.csv`;
  const rows = [
    ["患者", "医院", "随访医生", "角色", "任务", "状态", "截止日期", "下次随访", "说明"].join(","),
    ...overdueAssignments.map((item) =>
      [
        item.patientName,
        item.hospitalName,
        item.clinicianName,
        labelWorkbenchRole(state.filters.workbenchRole),
        item.title,
        formatTodoStatus(item.status),
        item.dueLabel,
        item.nextFollowUpDate,
        item.note
      ]
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(",")
    )
  ].join("\n");

  downloadTextFile(filename, rows, "text/csv;charset=utf-8");
}

function ensureSidebarNavigation() {
  const navItems = [
    { href: "./index.html", label: "区级总览" },
    { href: "./followups-hospital.html", label: "医院管理视图" },
    { href: "./followups-clinician.html", label: "医生工作视图" },
    { href: "./patient-app.html", label: "患者端" },
    { href: "./public-data-config.html", label: "公开资料配置" }
  ];

  document.querySelectorAll(".sidebar-nav").forEach((nav) => {
    const existingLinks = new Set([...nav.querySelectorAll("a")].map((link) => link.getAttribute("href")));
    for (const item of navItems) {
      if (existingLinks.has(item.href)) continue;
      const link = document.createElement("a");
      link.className = "sidebar-nav-link";
      link.href = item.href;
      link.textContent = item.label;
      nav.append(link);
    }

    nav.querySelectorAll("a").forEach((link) => {
      const href = link.getAttribute("href") ?? "";
      const isActive = window.location.pathname.endsWith(href.replace("./", "/"));
      link.classList.toggle("active", isActive);
    });
  });
}

function renderFollowupCenter() {
  if (!isFollowupsPage) return;
  if (isHospitalFollowupsPage) {
    renderHospitalWorkbench();
    return;
  }
  if (isClinicianFollowupsPage) {
    renderClinicianWorkbench();
    return;
  }
  if (!followupSummary || !followupGroups) return;

  const assignments = deriveFollowupAssignments();
  syncFollowupClinicianFilter(assignments);
  renderClinicianTabs();
  const filteredAssignments = getVisibleFollowupAssignments();
  const patientById = new Map(getCurrentPopulationPatients().map((patient) => [patient.id, patient]));
  const clinicianScopedAssignments = filteredAssignments.filter((item) =>
    !isClinicianFollowupsPage || !state.followupClinician ? true : item.clinicianName === state.followupClinician
  );

  const groups = new Map();
  if (isClinicianFollowupsPage && state.clinicianTab === "my-patients") {
    for (const item of clinicianScopedAssignments) {
      const patient = patientById.get(item.patientId);
      if (!patient) continue;
      const key = `${item.patientId}`;
      const existing = groups.get(key) ?? {
        patient,
        clinicianName: item.clinicianName,
        items: []
      };
      existing.items.push(item);
      groups.set(key, existing);
    }
  } else if (isClinicianFollowupsPage && state.clinicianTab === "completed-reassessments") {
    for (const item of clinicianScopedAssignments.filter((entry) => entry.status === "done")) {
      const patient = patientById.get(item.patientId);
      if (!patient) continue;
      const completedReassessment = patient.careProcess.find((entry) => entry.phase === "reassessment");
      if (!completedReassessment) continue;
      const key = `${item.patientId}`;
      const existing = groups.get(key) ?? {
        patient,
        clinicianName: item.clinicianName,
        completedReassessment,
        items: []
      };
      existing.items.push(item);
      groups.set(key, existing);
    }
  } else {
    for (const item of filteredAssignments) {
      const key = state.followupGroupBy === "clinician" ? item.clinicianName : item.hospitalName;
      const existing = groups.get(key) ?? [];
      existing.push(item);
      groups.set(key, existing);
    }
  }

  const countGroupedItems = (entryValue) => {
    if (Array.isArray(entryValue)) return entryValue.length;
    return entryValue.items?.length ?? 0;
  };
  const orderedGroups = [...groups.entries()].sort((left, right) => countGroupedItems(right[1]) - countGroupedItems(left[1]));
  const overdueCount = assignments.filter((item) => item.status === "overdue").length;
  const atRiskCount = assignments.filter((item) => item.status === "at-risk").length;
  const doneCount = assignments.filter((item) => item.status === "done").length;

  setElementText(
    heroSubtitle,
    `${state.filters.hospitalId ? `${getHospitalById(state.filters.hospitalId)?.name ?? "指定医院"} · ` : "栖霞区全域 · "}${labelWorkbenchRole(state.filters.workbenchRole)}随访任务按${state.followupGroupBy === "clinician" ? "随访医生" : "医院"}归类${isClinicianFollowupsPage && state.followupClinician ? ` · ${state.followupClinician}` : ""}`
  );

  followupSummary.innerHTML = `
    <div class="plan-block">
      <h4>${labelWorkbenchRole(state.filters.workbenchRole)} 随访概览</h4>
      <div class="stat-grid">
        ${statChip("逾期", overdueCount)}
        ${statChip("临近逾期", atRiskCount)}
        ${statChip("已完成", doneCount)}
        ${statChip("分组数", orderedGroups.length)}
      </div>
    </div>
    <div class="plan-block">
      <h4>当前策略</h4>
      <ul class="mini-list">
        <li>归类方式：${state.followupGroupBy === "clinician" ? "按随访医生" : "按医院"}</li>
        <li>任务范围：${
          state.followupStatus === "all"
            ? "全部任务"
            : state.followupStatus === "active"
              ? "逾期 + 临近逾期"
              : "仅逾期"
        }</li>
        <li>当前医院：${state.filters.hospitalId ? getHospitalById(state.filters.hospitalId)?.name ?? "指定医院" : "栖霞区全域"}</li>
        ${isClinicianFollowupsPage ? `<li>当前医生：${state.followupClinician || "全部随访医生"}</li>` : ""}
        ${isClinicianFollowupsPage ? `<li>当前 tab：${clinicianTabLabel(state.clinicianTab)}</li>` : ""}
      </ul>
    </div>
  `;

  const orderedEntries = isClinicianFollowupsPage && state.clinicianTab !== "my-todos"
    ? [...groups.entries()].sort((left, right) => {
        const leftPatient = left[1].patient;
        const rightPatient = right[1].patient;
        return (rightPatient?.interventionProjection?.beforeOverallScore ?? 0) - (leftPatient?.interventionProjection?.beforeOverallScore ?? 0);
      })
    : orderedGroups;

  renderFollowupOps(assignments, filteredAssignments);

  followupGroups.innerHTML = orderedEntries.length
    ? orderedEntries
        .map(([groupName, items]) => {
          if (isClinicianFollowupsPage && state.clinicianTab === "my-patients") {
            const patient = items.patient;
            return `
              <article class="followup-group-card">
                <div class="followup-group-head">
                  <div>
                    <strong>${patient.name}</strong>
                    <div class="dim">${patient.hospitalName} · ${items.clinicianName}</div>
                  </div>
                  <span class="mini-tag">${patient.managementTier}</span>
                </div>
                <div class="followup-task-list">
                  <button class="followup-task" data-followup-patient="${patient.id}">
                    <div class="followup-task-head">
                      <strong>${patient.diagnoses.join(" / ")}</strong>
                      <span class="status-pill ${patient.overallRiskLevel}">${formatLevel(patient.overallRiskLevel)}</span>
                    </div>
                    <div class="dim">下次随访：${patient.nextFollowUpDate} · 依从性：${patient.adherenceSummary}</div>
                    <div class="dim">重点慢病：${patient.topDomains.map((domain) => labelRiskDomain(domain)).join(" · ")}</div>
                  </button>
                </div>
              </article>
            `;
          }

          if (isClinicianFollowupsPage && state.clinicianTab === "completed-reassessments") {
            const patient = items.patient;
            const reassessment = items.completedReassessment;
            return `
              <article class="followup-group-card">
                <div class="followup-group-head">
                  <div>
                    <strong>${patient.name}</strong>
                    <div class="dim">${patient.hospitalName} · ${items.clinicianName}</div>
                  </div>
                  <span class="mini-tag">已完成复评</span>
                </div>
                <div class="followup-task-list">
                  <button class="followup-task done" data-followup-patient="${patient.id}">
                    <div class="followup-task-head">
                      <strong>${reassessment.title}</strong>
                      <span class="status-pill low">${reassessment.weekLabel}</span>
                    </div>
                    <div class="dim">${reassessment.summary}</div>
                    <div class="dim">${reassessment.explanation}</div>
                  </button>
                </div>
              </article>
            `;
          }

          if (state.followupGroupBy === "hospital") {
            const itemsByDoctor = new Map();
            for (const item of items) {
              const doctorKey = `${item.clinicianName}|${item.clinicianDepartment}`;
              const existing = itemsByDoctor.get(doctorKey) ?? [];
              existing.push(item);
              itemsByDoctor.set(doctorKey, existing);
            }

            const hospitalPatientCount = new Set(items.map((item) => item.patientId)).size;
            const hospitalOverdueCount = items.filter((item) => item.status === "overdue").length;

            return `
              <article class="followup-group-card">
                <details class="entity-group" open>
                  <summary class="entity-group-head">
                    <div>
                      <strong>${groupName}</strong>
                      <div class="dim">患者与任务已按主诊/责任医生归集</div>
                    </div>
                    <div class="entity-counts">
                      <span class="mini-tag">${hospitalPatientCount} 人</span>
                      <span class="mini-tag">${items.length} 项</span>
                      <span class="mini-tag ${hospitalOverdueCount ? "critical" : ""}">逾期 ${hospitalOverdueCount}</span>
                    </div>
                  </summary>
                <div class="entity-subgroup-list">
                  ${[...itemsByDoctor.entries()]
                    .map(
                      ([doctorKey, doctorItems]) => `
                        <details class="entity-subgroup" open>
                          <summary class="entity-subgroup-head">
                            <div>
                              <strong>${doctorItems[0].clinicianName}</strong>
                              <div class="dim">${doctorItems[0].clinicianDepartment}</div>
                            </div>
                            <div class="entity-counts">
                              <span class="mini-tag">${new Set(doctorItems.map((item) => item.patientId)).size} 人</span>
                              <span class="mini-tag">${doctorItems.length} 项</span>
                              <span class="mini-tag ${
                                doctorItems.some((item) => item.status === "overdue") ? "critical" : ""
                              }">逾期 ${doctorItems.filter((item) => item.status === "overdue").length}</span>
                            </div>
                          </summary>
                          <div class="followup-task-list">
                            ${doctorItems
                              .slice(0, 8)
                              .map(
                                (item) => `
                                  <button class="followup-task ${item.status}" data-followup-patient="${item.patientId}">
                                    <div class="followup-task-head">
                                      <strong>${item.patientName} · ${item.title}</strong>
                                      <span class="status-pill ${
                                        item.status === "done" ? "low" : item.status === "pending" ? "medium" : "high"
                                      }">${formatTodoStatus(item.status)}</span>
                                    </div>
                                    <div class="dim">截止：${item.dueLabel} · 下次随访：${item.nextFollowUpDate}</div>
                                    <div class="dim">${item.note}</div>
                                  </button>
                                `
                              )
                              .join("")}
                          </div>
                        </details>
                      `
                    )
                    .join("")}
                </div>
                </details>
              </article>
            `;
          }

          return `
            <article class="followup-group-card">
              <div class="followup-group-head">
                <div>
                  <strong>${groupName}</strong>
                  <div class="dim">${items[0]?.clinicianDepartment ?? ""}</div>
                </div>
                <span class="mini-tag">${items.length} 项</span>
              </div>
              <div class="followup-task-list">
                ${items
                  .slice(0, 8)
                  .map(
                    (item) => `
                      <button class="followup-task ${item.status}" data-followup-patient="${item.patientId}">
                        <div class="followup-task-head">
                          <strong>${item.title}</strong>
                          <span class="status-pill ${
                            item.status === "done" ? "low" : item.status === "pending" ? "medium" : "high"
                          }">${formatTodoStatus(item.status)}</span>
                        </div>
                        <div class="dim">${item.patientName} · ${item.hospitalName}</div>
                        <div class="dim">截止：${item.dueLabel} · 下次随访：${item.nextFollowUpDate}</div>
                        <div class="dim">${item.note}</div>
                      </button>
                    `
                  )
                  .join("")}
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="note-block">当前筛选条件下没有匹配的${isClinicianFollowupsPage ? clinicianTabLabel(state.clinicianTab) : "随访任务"}。</div>`;

  followupGroups.querySelectorAll("[data-followup-patient]").forEach((node) => {
    node.addEventListener("click", async () => {
      syncActivePatient(node.getAttribute("data-followup-patient"));
      renderPopulation();
      renderFollowupCenter();
      if (shouldLoadWorkspacePage()) await loadWorkspace();
    });
  });

  refreshInterfacePolish();
}

function animateInterventionRadar(patient, fromVector, toVector, label) {
  const duration = 480;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const nextVector = interpolateRiskVector(fromVector, toVector, eased);
    populationInterventionRadar.innerHTML = renderComparisonRadar(
      `治疗包干预前 vs ${label}`,
      patient.interventionProjection.beforeRadar,
      nextVector
    );

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      state.populationAnimatedRadar = { ...toVector };
    }
  };

  requestAnimationFrame(tick);
}

function renderPopulation() {
  if (!state.populationCohort) return;

  const cohort = state.populationCohort;
  const districtCohort = state.populationDistrictCohort ?? cohort;
  const selectedPatient =
    cohort.patients.find((patient) => patient.id === state.populationPatientId) ?? cohort.patients[0] ?? null;

  if (selectedPatient && state.populationPatientId !== selectedPatient.id) {
    state.populationPatientId = selectedPatient.id;
  }

  if (selectedPatient && state.populationLastPatientId !== selectedPatient.id) {
    state.populationLastPatientId = selectedPatient.id;
    state.populationCheckpointWeek = 12;
    state.populationAnimatedRadar = null;
    state.populationAnimationFrom = null;
  }

  setElementHtml(
    populationSummary,
    `
    <div class="plan-block">
      <h4>${cohort.hospitalLabel}</h4>
      <div class="dim">当前按 ${cohort.patientCount.toLocaleString("zh-CN")} 人全量仿真，页面展示 ${cohort.displayedPatientCount.toLocaleString("zh-CN")} 位代表性管理样本；全区口径以 ${cohort.publicProfile.totalPopulationLabel} 常住人口为底数。</div>
      <div class="stat-grid">
        ${statChip("全量模拟人数", `${cohort.patientCount.toLocaleString("zh-CN")} 人`)}
        ${statChip("展示样本", `${cohort.displayedPatientCount.toLocaleString("zh-CN")} 人`)}
        ${statChip("纳管覆盖率", `${cohort.publicProfile.managedCoverageRate}%`)}
        ${statChip("高风险", cohort.summary.highRiskCount)}
        ${statChip("危重", cohort.summary.criticalRiskCount)}
        ${statChip("强化管理", cohort.summary.intensiveManagementCount)}
        ${statChip("闭环率", `${cohort.summary.closedLoopRate}%`)}
      </div>
    </div>
    <div class="plan-block">
      <h4>常见慢病分布</h4>
      <ul class="mini-list">${cohort.domainPrevalence
        .map((item) => `<li>${item.label}：${item.count} 人</li>`)
        .join("")}</ul>
    </div>
  `
  );

  setElementHtml(populationRadar, renderRadarChart("栖霞区慢病风险平均画像", districtCohort.averageRadar));
  renderOverviewBand();
  if (hospitalOverviewGrid && hospitalDetailPanel) renderHospitalOverview();
  if (qixiaPublicProfile) renderQixiaPublicProfile();
  renderDynamicCommandStage();
  renderCommandCenter();
  renderWallboardHero();
  renderExecutiveCockpit();
  if (reminderCenter) renderReminderCenter();
  if (isPatientAppPage) renderPatientApp();

  const queuePatients = isClinicianFollowupsPage
    ? getHospitalWorkbenchPatients(getClinicianScopedPatients(cohort.patients)).slice(0, 18)
    : cohort.patients;
  setElementHtml(
    populationList,
    renderHierarchicalPatientList(queuePatients, state.populationPatientId, {
      ownerMode: state.filters.workbenchRole === "health-manager" ? "responsible" : "primary",
      renderPatient: (patient, isActive) => `
        <button class="population-row ${isActive ? "active" : ""}" data-population-id="${patient.id}">
          <div class="population-row-main">
            <strong>${patient.name}</strong>
            <span class="status-pill ${patient.overallRiskLevel}">${formatLevel(patient.overallRiskLevel)}</span>
          </div>
          <div class="dim">${patient.diagnoses.join(" / ")}</div>
          <div class="population-row-meta">
            <span>${patient.age} 岁</span>
            <span>${patient.topDomains.map((domain) => labelRiskDomain(domain)).join(" · ")}</span>
          </div>
        </button>
      `
    })
  );

  populationList?.querySelectorAll("[data-population-id]").forEach((node) => {
    node.addEventListener("click", async () => {
      syncActivePatient(node.getAttribute("data-population-id"));
      renderPopulation();
      renderFollowupCenter();
      if (shouldLoadWorkspacePage()) await loadWorkspace();
    });
  });

  if (!selectedPatient) {
    setElementText(populationPatientTitle, "暂无患者");
    setElementHtml(populationPatientProfile, `<div class="note-block">当前没有可展示的人群数据。</div>`);
    setElementHtml(populationPatientRadar, "");
    setElementHtml(populationInterventionSummary, "");
    setElementHtml(populationInterventionRadar, "");
    setElementHtml(populationPredictions, "");
    setElementHtml(populationEvidence, "");
    setElementHtml(populationModelSummary, "");
    setElementHtml(populationProcess, "");
    setElementHtml(populationImprovements, "");
    setElementHtml(populationRoleFollowups, "");
    return;
  }

  const activeCheckpoint = checkpointForWeek(selectedPatient, state.populationCheckpointWeek);
  const currentRadar = state.populationAnimatedRadar ?? activeCheckpoint?.radar ?? selectedPatient.interventionProjection.afterRadar;
  const projectionRatio = activeCheckpoint ? activeCheckpoint.week / 12 : 1;

  setElementText(populationPatientTitle, `${selectedPatient.name} · ${selectedPatient.hospitalName}`);
  setElementHtml(
    populationPatientProfile,
    `
    <div class="plan-block">
      <h4>管理概览</h4>
      <div class="stat-grid">
        ${statChip("年龄", `${selectedPatient.age} 岁`)}
        ${statChip("层级", selectedPatient.managementTier)}
        ${statChip("复评日期", selectedPatient.nextFollowUpDate)}
        ${statChip("依从性", selectedPatient.adherenceSummary)}
      </div>
    </div>
    <div class="plan-block">
      <h4>重点慢病与干预包</h4>
      <ul class="mini-list">
        ${selectedPatient.diagnoses.map((item) => `<li>${item}</li>`).join("")}
        ${selectedPatient.recommendedPackages.map((item) => `<li>推荐：${item}</li>`).join("")}
      </ul>
    </div>
    <div class="plan-block">
      <h4>当前管理缺口</h4>
      <ul class="mini-list">${selectedPatient.careGaps.map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
  `
  );

  setElementHtml(populationPatientRadar, renderRadarChart("单患者慢病风险雷达图", selectedPatient.radar));
  setElementHtml(
    populationInterventionSummary,
    `
    <div class="plan-block">
      <h4>治疗包干预后风险变化</h4>
      <div class="stat-grid">
        ${statChip("干预前", `${selectedPatient.interventionProjection.beforeOverallScore} / ${formatLevel(selectedPatient.interventionProjection.beforeLevel)}`)}
        ${statChip(activeCheckpoint?.label ?? "12周", `${activeCheckpoint?.overallScore ?? selectedPatient.interventionProjection.afterOverallScore} / ${formatLevel(activeCheckpoint?.overallLevel ?? selectedPatient.interventionProjection.afterLevel)}`)}
        ${statChip("随访窗口", selectedPatient.interventionProjection.projectedFollowUpWindow)}
        ${statChip("执行假设", selectedPatient.interventionProjection.adherenceAssumption)}
      </div>
    </div>
    <div class="plan-block">
      <h4>阶段性时间轴与雷达切换</h4>
      <div class="checkpoint-strip">
        ${selectedPatient.interventionProjection.timelineCheckpoints
          .map((checkpoint) => buildCheckpointButton(checkpoint, checkpoint.week === activeCheckpoint?.week))
          .join("")}
      </div>
    </div>
    <div class="plan-block">
      <h4>主要治疗包与建议</h4>
      <ul class="mini-list">
        ${selectedPatient.interventionProjection.packageTitles.map((item) => `<li>${item}</li>`).join("")}
        ${selectedPatient.interventionProjection.recommendations.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </div>
    <div class="plan-block">
      <h4>分域变化</h4>
      <ul class="mini-list">
        ${selectedPatient.interventionProjection.domainEffects
          .map((item) => {
            const checkpointAfter = activeCheckpoint?.radar?.[item.domain] ?? item.after;
            return {
              ...item,
              after: checkpointAfter,
              delta: Number((checkpointAfter - item.before).toFixed(1))
            };
          })
          .filter((item) => item.delta < 0)
          .sort((left, right) => left.delta - right.delta)
          .slice(0, 4)
          .map(
            (item) =>
              `<li>${labelRiskDomain(item.domain)}：${item.before} -> ${item.after}（${item.delta}）· ${item.reasons[0]}</li>`
          )
          .join("")}
      </ul>
    </div>
    <div class="plan-block">
      <h4>模型变化</h4>
      <ul class="mini-list">
        ${selectedPatient.interventionProjection.modelProjection
          .map((item) => {
            const currentScore = Number((item.beforeScore + (item.afterScore - item.beforeScore) * projectionRatio).toFixed(1));
            const currentDelta = Number((currentScore - item.beforeScore).toFixed(1));
            return `<li>${item.model}：${item.beforeScore} -> ${currentScore}（${currentDelta}）</li>`;
          })
          .join("")}
      </ul>
    </div>
  `
  );
  setElementHtml(
    populationInterventionRadar,
    renderComparisonRadar(
    `治疗包干预前 vs ${activeCheckpoint?.label ?? "12周"}`,
    selectedPatient.interventionProjection.beforeRadar,
    currentRadar
  )
  );
  populationInterventionSummary?.querySelectorAll("[data-checkpoint-week]").forEach((node) => {
    node.addEventListener("click", () => {
      const nextWeek = Number(node.getAttribute("data-checkpoint-week"));
      if (!Number.isFinite(nextWeek) || nextWeek === state.populationCheckpointWeek) return;
      state.populationAnimationFrom = { ...(state.populationAnimatedRadar ?? currentRadar) };
      state.populationCheckpointWeek = nextWeek;
      renderPopulation();
    });
  });

  setElementHtml(
    populationPredictions,
    selectedPatient.predictions
    .map(
      (prediction) => `
        <article class="package-card">
          <div class="panel-kicker">${prediction.model}</div>
          <h4>${prediction.target}</h4>
          <div class="status-pill ${prediction.level}">${prediction.horizon} · ${prediction.score}</div>
          <div class="dim">${prediction.explanation}</div>
          <ul class="mini-list">${prediction.evidenceIds
            .map((id) => selectedPatient.evidenceSources.find((item) => item.id === id))
            .filter(Boolean)
            .map((item) => `<li>${item.title}：${item.detail}</li>`)
            .join("")}</ul>
        </article>
      `
    )
    .join("")
  );

  setElementHtml(
    populationEvidence,
    selectedPatient.evidenceSources
    .map(
      (source) => `
        <article class="mapping-card">
          <div class="panel-kicker">${source.type}</div>
          <h4>${source.title}</h4>
          <div class="dim">${source.detail}</div>
          <div class="dim">相关度 ${source.relevance}</div>
        </article>
      `
    )
    .join("")
  );

  setElementHtml(
    populationModelSummary,
    `
    <div class="plan-block">
      <h4>全队列模型均值</h4>
      <ul class="mini-list">${cohort.modelDistribution
        .map((item) => `<li>${item.model}：均分 ${item.averageScore} / 高风险 ${item.highRiskCount} 人</li>`)
        .join("")}</ul>
    </div>
    <div class="plan-block">
      <h4>患者关联源</h4>
      <div class="dim">原型锚点：${selectedPatient.anchorPatientId}，用于延展生成 ${cohort.patientCount.toLocaleString("zh-CN")} 人全量仿真，并在页面中展示 ${cohort.displayedPatientCount.toLocaleString("zh-CN")} 位样本。</div>
    </div>
  `
  );

  setElementHtml(
    populationProcess,
    selectedPatient.careProcess
    .map(
      (entry) => `
        <div class="timeline-entry">
          <div class="timeline-date">
            <div>${entry.weekLabel}</div>
            <div>${entry.date}</div>
          </div>
          <div class="timeline-body">
            <strong>${entry.title}</strong>
            <div class="dim">${entry.phase} · ${entry.actor}</div>
            <div class="dim">${entry.summary}</div>
            <div class="timeline-explainer">${entry.explanation}</div>
          </div>
        </div>
      `
    )
    .join("")
  );

  setElementHtml(
    populationImprovements,
    selectedPatient.improvementRecords
    .map(
      (record) => `
        <article class="mapping-card">
          <div class="panel-kicker">${record.weekLabel} · ${record.metric}</div>
          <h4>${record.before} -> ${record.current}</h4>
          <div class="status-pill ${record.trend === "improved" ? "low" : record.trend === "stable" ? "medium" : "high"}">
            ${record.trend}
          </div>
          <div class="dim">${record.explanation}</div>
        </article>
      `
    )
    .join("")
  );

  setElementHtml(
    populationRoleFollowups,
    selectedPatient.roleFollowupPlans
    .map(
      (plan) => `
        <article class="package-card">
          <div class="panel-kicker">${plan.title}</div>
          <h4>${plan.focus.join(" / ")}</h4>
          <ul class="mini-list">
            ${plan.followUpTasks.map((item) => `<li>${item}</li>`).join("")}
            ${plan.supervisionTips.map((item) => `<li>督办：${item}</li>`).join("")}
          </ul>
          <div class="todo-list">
            ${plan.todoList
              .map(
                (todo) => `
                  <div class="todo-item ${todo.status}">
                    <div class="todo-head">
                      <strong>${todo.title}</strong>
                      <span class="status-pill ${todo.status === "done" ? "low" : todo.status === "pending" ? "medium" : "high"}">${todo.status}</span>
                    </div>
                    <div class="dim">截止：${todo.dueLabel}</div>
                    <div class="dim">${todo.note}</div>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      `
    )
    .join("")
  );

  if (state.populationAnimationFrom && activeCheckpoint) {
    const fromVector = state.populationAnimationFrom;
    state.populationAnimationFrom = null;
    animateInterventionRadar(selectedPatient, fromVector, activeCheckpoint.radar, activeCheckpoint.label);
  } else if (activeCheckpoint) {
    state.populationAnimatedRadar = { ...activeCheckpoint.radar };
  }

  startWallboardRotation();
}

function renderCommandCenter() {
  if (!commandCenterNetwork && !commandCenterQueue && !commandCenterKpis) return;
  const roundtable = getDistrictRoundtableModel();
  if (!roundtable) return;
  const selectedHospital = state.hospitals.find((hospital) => hospital.id === state.filters.hospitalId);
  const networkHospitals = selectedHospital?.district
    ? state.hospitals.filter((hospital) => hospital.district === selectedHospital.district)
    : state.hospitals.filter((hospital) => hospital.district === "栖霞区");
  const cohortPatients = roundtable.scopedPatients;
  const tiers = [
    {
      title: "基层筛查",
      subtitle: "社区卫生服务中心",
      items: networkHospitals.filter((hospital) => hospital.level === "基层")
    },
    {
      title: "区级统筹",
      subtitle: "区医院与区域慢病中心",
      items: networkHospitals.filter((hospital) => hospital.networkRole?.includes("区级") || hospital.level === "二级")
    },
    {
      title: "三级专科",
      subtitle: "驻区三级医院与专病中心",
      items: networkHospitals.filter((hospital) => hospital.level === "三级")
    }
  ];

  const queuePatients = [...cohortPatients]
    .sort((left, right) => {
      const leftScore = Math.max(...left.predictions.map((item) => item.score));
      const rightScore = Math.max(...right.predictions.map((item) => item.score));
      return rightScore - leftScore;
    })
    .slice(0, 6);

  const openMeetings = state.workspace?.mdtMeetings?.filter((meeting) => meeting.status === "open").length ?? 0;
  const intensiveCount = cohortPatients.filter((patient) => patient.managementTier === "intensive").length;
  const tertiaryCount = tiers[2].items.length;
  const communityCount = tiers[0].items.length;
  const highRiskCount = cohortPatients.filter(
    (patient) => patient.overallRiskLevel === "high" || patient.overallRiskLevel === "critical"
  ).length;
  const specialists = state.allClinicians.filter((clinician) => clinician.workbenchRole === "specialist-doctor").length;
  const healthManagers = state.allClinicians.filter((clinician) => clinician.workbenchRole === "health-manager").length;

  if (commandCenterNetwork) {
    commandCenterNetwork.innerHTML = `
    <div class="network-stage">
      ${tiers
        .map(
          (tier, index) => `
            <div class="network-tier tier-${index + 1}">
              <div class="network-tier-head">
                <span>${tier.title}</span>
                <strong>${tier.items.length} 家</strong>
              </div>
              <div class="dim">${tier.subtitle}</div>
              <div class="network-nodes">
                ${tier.items
                  .map(
                    (hospital) => `
                      <div class="network-node">
                        <div class="network-node-dot" style="--node-accent:${hospital.accent || "#1e40af"}"></div>
                        <div>
                          <strong>${hospital.name}</strong>
                          <div class="dim">${hospital.category ?? hospital.level ?? "医院"} · ${hospital.networkRole ?? ""}</div>
                        </div>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            </div>
          `
        )
        .join("")}
      <div class="network-flow-band">
        <div class="flow-chip">基层筛查上送 ${communityCount} 个站点</div>
        <div class="flow-chip">区级整合管理 ${intensiveCount} 位强化患者</div>
        <div class="flow-chip">三级专科会诊 ${tertiaryCount} 家联动机构</div>
      </div>
    </div>
  `;
  }

  if (commandCenterQueue) {
    commandCenterQueue.innerHTML = `
      <div class="plan-block">
        <h4>实时风险队列</h4>
        <div class="agent-queue-list">
          ${queuePatients
            .map((patient, index) => {
              const topPrediction = [...patient.predictions].sort((left, right) => right.score - left.score)[0];
              return `
                <button class="queue-item queue-item-button" type="button" data-stage-patient="${patient.id}">
                  <div class="queue-rank">${String(index + 1).padStart(2, "0")}</div>
                  <div class="queue-main">
                    <div class="queue-head">
                      <strong>${patient.name}</strong>
                      <span class="status-pill ${patient.overallRiskLevel}">${formatLevel(patient.overallRiskLevel)}</span>
                    </div>
                    <div class="dim">${patient.hospitalName}</div>
                    <div class="dim">${patient.topDomains.map((domain) => labelRiskDomain(domain)).join(" · ")} · 下次随访 ${patient.nextFollowUpDate}</div>
                    <div class="queue-model">${topPrediction.model}：${topPrediction.target} ${topPrediction.score}</div>
                  </div>
                </button>
              `;
            })
            .join("")}
        </div>
      </div>
      <div class="plan-block">
        <h4>接力摘要</h4>
        <ul class="mini-list">
          ${roundtable.transcript
            .slice(0, 3)
            .map((entry) => `<li>${entry.agent.name} · ${entry.phase.label}：${entry.conclusion}</li>`)
            .join("")}
        </ul>
      </div>
    `;
  }

  if (commandCenterKpis) {
    commandCenterKpis.innerHTML = `
      <div class="agent-command-deck">
        <div class="plan-block">
          <h4>协同总览</h4>
          <div class="stat-grid">
            ${statChip("高风险", highRiskCount)}
            ${statChip("强化管理", intensiveCount)}
            ${statChip("开放 MDT", openMeetings)}
            ${statChip("专科医生", specialists)}
            ${statChip("健康管理师", healthManagers)}
          </div>
        </div>
        <div class="plan-block">
          <h4>${roundtable.activePhase.label}</h4>
          <div class="agent-command-summary">
            <div>
              <strong>${roundtable.activeAgent.name}</strong>
              <div class="dim">${roundtable.activeAgent.detail}</div>
            </div>
            <div>
              <strong>${roundtable.selectedPatient?.name ?? "待选择患者"}</strong>
              <div class="dim">${roundtable.selectedPatient?.diagnoses?.join(" / ") ?? "暂无诊断标签"}</div>
            </div>
            <div>
              <strong>${roundtable.nextAgent.name}</strong>
              <div class="dim">下一棒补位</div>
            </div>
          </div>
        </div>
        <div class="immersive-phase-list compact">
          ${roundtable.phaseBlueprint
            .map(
              (phase, index) => `
                <button
                  class="stage-control ${index === roundtable.phaseIndex ? "is-active" : ""}"
                  type="button"
                  data-stage-phase="${phase.key}"
                  data-stage-phase-index="${index}"
                >
                  <span>Phase ${index + 1}</span>
                  <strong>${phase.label}</strong>
                  <small>${phase.summary}</small>
                </button>
              `
            )
            .join("")}
        </div>
        <div class="agent-action-grid">
          <button class="task-priority-button" type="button" data-stage-action="toggle">
            ${state.districtAgentAutoplayPaused ? "恢复自动推进" : "暂停自动推进"}
          </button>
          <button class="task-priority-button" type="button" data-stage-action="advance">下一棒</button>
          <a class="ghost-button nav-button" href="./followups-hospital.html">进入医院管理视图</a>
          <a class="ghost-button nav-button" href="./followups-clinician.html">进入医生工作台</a>
        </div>
        <div class="plan-block">
          <h4>转诊与闭环</h4>
          <ul class="mini-list">
            <li>基层首诊与筛查后，进入区级慢病管理池。</li>
            <li>区医院对高风险患者发起专科升级、MDT 协调与护理路径统筹。</li>
            <li>三级医院承担复杂病例判断、专科路径修订与疑难会诊。</li>
            <li>健康管理师、家庭医生和患者端形成随访闭环。</li>
            <li>${selectedHospital ? `当前医院：${selectedHospital.name}` : "当前展示：栖霞区三级诊疗协同网络"}</li>
            <li>基层筛查上送 ${communityCount} 个站点，三级专科协同 ${tertiaryCount} 家机构。</li>
          </ul>
        </div>
      </div>
    `;
  }

  bindDistrictAgentInteractions(commandCenterKpis);
  bindDistrictAgentInteractions(commandCenterQueue);
}

function renderWorkspace() {
  if (!isHomePage) return;
  if (!state.workspace) return;
  if (!patientName || !patientOverview || !riskDomainGrid || !roleViewTitle || !roleViewPanel || !clinicianSummary || !therapyPackageGrid || !carePlanSummary) return;

  const patient = state.workspace.patient;
  const liveRisk = state.workspace.liveRiskAssessment;
  const carePlan = state.workspace.latestCarePlan?.content;
  const roleView = state.workspace.roleView;

  patientName.textContent = `${patient.name} · ${patient.hospitalName}`;
  heroSubtitle.textContent = `${labelWorkbenchRole(state.filters.workbenchRole)}视图 | ${patient.age} 岁 | ${patient.chronicConditions.map((item) => item.name).join("、")} | 实时风险 ${formatLevel(liveRisk.level)}${isStaticMode ? " | GitHub Pages 只读演示" : ""}`;

  patientOverview.innerHTML = [
    statChip("医院", patient.hospitalName),
    statChip("MRN", patient.mrn),
    statChip("实时风险", formatLevel(liveRisk.level)),
    statChip("血压", `${patient.vitals.systolicBp}/${patient.vitals.diastolicBp}`),
    statChip("日均步数", `${patient.lifestyle.averageDailySteps}`),
    statChip("睡眠", `${patient.lifestyle.averageSleepHours}h`)
  ].join("");

  riskDomainGrid.innerHTML = liveRisk.domainAssessments
    .map(
      (domain) => `
        <article class="risk-card">
          <div class="status-pill ${domain.level}">${domain.label} · ${formatLevel(domain.level)}</div>
          <h4>${domain.score} 分</h4>
          <div class="dim">${domain.summary}</div>
          <ul class="mini-list">${domain.drivers.map((driver) => `<li>${driver}</li>`).join("")}</ul>
        </article>
      `
    )
    .join("");

  roleViewTitle.textContent = roleView.title;
  roleViewPanel.innerHTML = `
    <div class="plan-block">
      <h4>优先关注</h4>
      <ul class="mini-list">${roleView.priorities.map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
    <div class="plan-block">
      <h4>推荐动作</h4>
      <ul class="mini-list">${roleView.quickActions.map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
    <div class="plan-block">
      <h4>工作台面板</h4>
      <ul class="mini-list">${roleView.focusPanels.map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
  `;

  clinicianSummary.innerHTML = state.clinicians.length
    ? state.clinicians
        .map(
          (clinician) => `
            <div class="note-block">
              <strong>${clinician.name}</strong>
              <div class="dim">${labelWorkbenchRole(clinician.workbenchRole)} · ${clinician.department}</div>
              <div class="dim">${clinician.hospitalIds.join(" / ")}</div>
            </div>
          `
        )
        .join("")
    : `<div class="note-block">当前医院和角色下没有可用人员。</div>`;

  const therapyPackages = carePlan?.therapyPackages ?? [];
  renderInterventionSpotlight(patient, carePlan);
  therapyPackageGrid.innerHTML = therapyPackages.length
    ? therapyPackages
        .map(
          (pkg) => `
            <article class="package-card">
              <div class="panel-kicker">${pkg.title}</div>
              <h4>${pkg.content.title ?? pkg.title}</h4>
              <div class="dim">${pkg.content.rationale ?? ""}</div>
              <ul class="mini-list">${(pkg.content.interventions ?? []).map((item) => `<li>${item}</li>`).join("")}</ul>
            </article>
          `
        )
        .join("")
    : `<div class="note-block">先运行工作流生成疗法包。</div>`;

  carePlanSummary.innerHTML = carePlan
    ? `
      <div class="plan-block">
        <h4>核心目标</h4>
        <ul class="mini-list">${(carePlan.careGoals ?? []).map((goal) => `<li>${goal}</li>`).join("")}</ul>
      </div>
      <div class="plan-block">
        <h4>团队配置</h4>
        <ul class="mini-list">${(carePlan.assignedTeam ?? []).map((member) => `<li>${member.role} · ${member.clinician} / ${member.department}</li>`).join("")}</ul>
      </div>
      <div class="plan-block">
        <h4>会议状态</h4>
        <ul class="mini-list">${(carePlan.meetings ?? []).map((meeting) => `<li>${meeting.topic} · ${meeting.status}</li>`).join("")}</ul>
      </div>
    `
    : `<div class="note-block">尚未生成整合 care plan。</div>`;

  renderMeetings();
  renderMedClaw();
  renderEcosystem();
  renderGithubCapabilities();
  renderIntegrations();
}

function renderMedClaw() {
  if (!state.medclawWorkspace) return;

  const overview = state.medclawOverview;
  const workspace = state.medclawWorkspace;
  const comparison = workspace.imaging.comparison;

  medclawOverviewPanel.innerHTML = `
    <div class="plan-block">
      <h4>${overview?.name ?? "MedClaw"}</h4>
      <div class="dim">${overview?.tagline ?? workspace.overview.mission}</div>
      <ul class="mini-list">${(overview?.modules ?? []).map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
  `;

  medclawGuardrails.innerHTML = `
    <div class="plan-block">
      <h4>合规边界</h4>
      <ul class="mini-list">${workspace.guardrails.map((item) => `<li>${item.title}：${item.description}</li>`).join("")}</ul>
    </div>
    <div class="plan-block">
      <h4>${labelWorkbenchRole(workspace.permissionBoundary.role)} 可读范围</h4>
      <ul class="mini-list">${workspace.permissionBoundary.scopes.map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
    <div class="plan-block">
      <h4>限制项</h4>
      <ul class="mini-list">${workspace.permissionBoundary.restrictions.map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
    <div class="note-block">
      <strong>审计事件</strong>
      <div class="dim">${workspace.auditTrail.length} 条已记录</div>
    </div>
  `;

  imagingComparison.innerHTML = comparison
    ? `
      <div class="plan-block">
        <h4>${comparison.modality} ${comparison.previousStudyDate} -> ${comparison.currentStudyDate}</h4>
        <div class="dim">${comparison.narrativeConclusion}</div>
        <ul class="mini-list">${comparison.findings.map((item) => `<li>${item.summary}</li>`).join("")}</ul>
      </div>
      <div class="plan-block">
        <h4>最近影像报告</h4>
        <ul class="mini-list">${workspace.imaging.reports
          .slice(-2)
          .reverse()
          .map((report) => `<li>${report.studyDate} ${report.modality} ${report.bodyPart}：${report.interpretation}</li>`)
          .join("")}</ul>
      </div>
    `
    : `<div class="note-block">暂无连续影像报告，当前以结构化病历与检验数据为主。</div>`;

  recordDraft.innerHTML = `
    <div class="plan-block">
      <h4>主诉</h4>
      <div class="dim">${workspace.recordDraft.chiefComplaint}</div>
    </div>
    <div class="plan-block">
      <h4>现病史</h4>
      <div class="dim">${workspace.recordDraft.presentIllness}</div>
    </div>
    <div class="plan-block">
      <h4>查体与辅助检查</h4>
      <ul class="mini-list">
        <li>${workspace.recordDraft.physicalExam}</li>
        <li>${workspace.recordDraft.auxiliaryExams}</li>
      </ul>
    </div>
    <div class="plan-block">
      <h4>诊断与计划</h4>
      <ul class="mini-list">${workspace.recordDraft.diagnosis
        .map((item) => `<li>${item}</li>`)
        .concat(workspace.recordDraft.plan.map((item) => `<li>${item}</li>`))
        .join("")}</ul>
    </div>
  `;

  diagnosisSupport.innerHTML = `
    <div class="plan-block">
      <h4>辅助诊断建议</h4>
      ${
        workspace.diagnosisSupport.suggestions.length
          ? `<ul class="mini-list">${workspace.diagnosisSupport.suggestions
              .map(
                (item) =>
                  `<li>${item.diagnosis}（置信度 ${Math.round(item.confidence * 100)}%）：${item.rationale.join("；")}</li>`
              )
              .join("")}</ul>`
          : `<div class="dim">当前未生成诊断建议。</div>`
      }
    </div>
    <div class="plan-block">
      <h4>病情预测</h4>
      <ul class="mini-list">${workspace.diagnosisSupport.predictions
        .map((item) => `<li>${item.metric}：${item.value}；${item.explanation}</li>`)
        .join("")}</ul>
    </div>
    <div class="plan-block">
      <h4>KG-Followup 精准追问</h4>
      <div class="dim">候选诊断：${workspace.kgFollowup.candidateDiagnoses.join(" / ") || "待补充"}</div>
      <div class="dim">模块计数：初步 ${workspace.kgFollowup.moduleBreakdown.preliminary} / EHR-KG ${workspace.kgFollowup.moduleBreakdown["ehr-kg"]} / DDX ${workspace.kgFollowup.moduleBreakdown.ddx} / DDX-KG ${workspace.kgFollowup.moduleBreakdown["ddx-kg"]}</div>
      <ul class="mini-list">${workspace.kgFollowup.questions
        .map(
          (item) =>
            `<li>[${labelFollowupSource(item.source)}] ${item.question}；目的：${item.clinicalIntent}</li>`
        )
        .join("")}</ul>
    </div>
    <div class="plan-block">
      <h4>推理路径</h4>
      <ul class="mini-list">${workspace.kgFollowup.reasoningPaths
        .map((item) => `<li>${item.diagnosis}：${item.path.join(" -> ")}；${item.rationale}</li>`)
        .join("")}</ul>
    </div>
    <div class="plan-block">
      <h4>Hard-Case Active ICL</h4>
      <ul class="mini-list">${workspace.kgFollowup.activeIclExamples
        .map((item) => `<li>${item.title}：${item.whyHard}；示范要点：${item.takeaway}</li>`)
        .join("")}</ul>
    </div>
    <div class="plan-block">
      <h4>问题整合</h4>
      <ul class="mini-list">
        <li>原始问题数：${workspace.kgFollowup.consolidation.before}</li>
        <li>聚类数：${workspace.kgFollowup.consolidation.clusters}</li>
        <li>精炼后输出：${workspace.kgFollowup.consolidation.after}</li>
        <li>${workspace.kgFollowup.consolidation.strategy}</li>
      </ul>
    </div>
  `;

  dataPipeline.innerHTML = `
    <div class="plan-block">
      <h4>数据来源</h4>
      <ul class="mini-list">${workspace.dataPipeline.parsedSources.map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
    <div class="plan-block">
      <h4>归一化字段</h4>
      <ul class="mini-list">${workspace.dataPipeline.normalizedFields.map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
    <div class="plan-block">
      <h4>脱敏与编码</h4>
      <ul class="mini-list">
        ${Object.entries(workspace.dataPipeline.deidentifiedPreview).map(([key, value]) => `<li>${key}：${value}</li>`).join("")}
        ${workspace.dataPipeline.codingMappings.map((item) => `<li>${item.source} -> ${item.code} (${item.system})</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderEcosystem() {
  if (!state.ecosystemOverview) return;

  const overview = state.ecosystemOverview;
  const journey = state.ecosystemJourney;

  ecosystemOverviewPanel.innerHTML = `
    <div class="plan-block">
      <h4>${overview.brand}</h4>
      <div class="dim">${overview.positioning}</div>
      <ul class="mini-list">${overview.strategySummary.map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
    <div class="plan-block">
      <h4>规模指标</h4>
      <ul class="mini-list">
        <li>B端客户：${overview.metrics.bClients}</li>
        <li>覆盖用户：${overview.metrics.coveredUsers.toLocaleString("zh-CN")}</li>
        <li>合作医疗机构：${overview.metrics.partneredMedicalInstitutions}</li>
        <li>三甲医院网络：${overview.metrics.tertiaryHospitals}</li>
        <li>服务模块：${overview.metrics.serviceModules}</li>
        <li>AI 驱动模块：${overview.metrics.aiDrivenModules}</li>
      </ul>
    </div>
    <div class="plan-block">
      <h4>增长方向</h4>
      <ul class="mini-list">${overview.strategicDirections.map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
  `;

  ecosystemProducts.innerHTML = overview.productMatrix
    .map(
      (product) => `
        <article class="package-card">
          <div class="panel-kicker">${product.name}</div>
          <h4>${product.mode}</h4>
          <div class="dim">${product.description}</div>
          <ul class="mini-list">
            <li>目标对象：${product.targetUsers.join(" / ")}</li>
            ${product.scenarios.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </article>
      `
    )
    .join("");

  ecosystemPartners.innerHTML = overview.partners
    .map(
      (partner) => `
        <article class="mapping-card">
          <div class="panel-kicker">${labelPartnerType(partner.type)}</div>
          <h4>${partner.name}</h4>
          <div class="dim">${partner.coverageLabel}</div>
          <ul class="mini-list">
            <li>覆盖人数：${partner.coveredLives.toLocaleString("zh-CN")}</li>
            <li>服务模型：${partner.serviceModel}</li>
            <li>支付逻辑：${partner.paymentLogic}</li>
            <li>医院网络：${partner.linkedHospitals.join(" / ")}</li>
          </ul>
        </article>
      `
    )
    .join("");

  ecosystemJourney.innerHTML = journey
    ? `
      <div class="plan-block">
        <h4>${journey.userSegment}</h4>
        <div class="dim">付费方：${journey.sponsor.name} · ${labelPartnerType(journey.sponsor.type)}</div>
        <ul class="mini-list">${journey.lifecycleStage.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
      <div class="plan-block">
        <h4>活跃项目与 AI 触点</h4>
        <ul class="mini-list">
          ${journey.activePrograms.map((item) => `<li>${item}</li>`).join("")}
          ${journey.aiTouchpoints.map((item) => `<li>AI：${item}</li>`).join("")}
        </ul>
      </div>
      <div class="plan-block">
        <h4>服务模块与线下协同</h4>
        <ul class="mini-list">
          ${journey.serviceModules.map((item) => `<li>${item}</li>`).join("")}
          ${journey.offlineCoordination.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </div>
      <div class="plan-block">
        <h4>价值信号</h4>
        <ul class="mini-list">${journey.valueSignals.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
    `
    : `<div class="note-block">当前患者尚未配置 B2B2C 权益旅程。</div>`;
}

function renderGithubCapabilities() {
  if (!state.githubOverview) return;

  githubOverviewPanel.innerHTML = `
    <div class="plan-block">
      <h4>检索说明</h4>
      <div class="dim">${state.githubOverview.note}</div>
      <ul class="mini-list">
        <li>检索日期：${state.githubOverview.searchedAt}</li>
        <li>能力数：${state.githubOverview.capabilities.length}</li>
        <li>能力包：${state.githubOverview.packs.length}</li>
      </ul>
    </div>
    <div class="plan-block">
      <h4>能力包</h4>
      <ul class="mini-list">${state.githubOverview.packs
        .map((pack) => `<li>${pack.title}：${pack.focus}</li>`)
        .join("")}</ul>
    </div>
  `;

  githubCatalog.innerHTML = state.githubOverview.capabilities
    .map(
      (capability) => `
        <article class="mapping-card">
          <div class="panel-kicker">${labelCapabilityCategory(capability.category)}</div>
          <h4>${capability.name}</h4>
          <div class="dim">${capability.summary}</div>
          <ul class="mini-list">
            <li>仓库：${capability.repo}</li>
            <li><a href="${capability.repoUrl}" target="_blank" rel="noreferrer">GitHub 链接</a></li>
            <li>接入方式：${capability.integrationMode}</li>
            <li>适配原因：${capability.whyFit}</li>
            <li>输出：${capability.outputs.join(" / ")}</li>
          </ul>
        </article>
      `
    )
    .join("");

  githubPlan.innerHTML = state.githubPlan
    ? `
      <div class="plan-block">
        <h4>推荐能力</h4>
        <ul class="mini-list">${state.githubPlan.recommendedCapabilityIds.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
      <div class="plan-block">
        <h4>激活能力包</h4>
        <ul class="mini-list">${state.githubPlan.activatedPacks.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
      <div class="plan-block">
        <h4>预测用途</h4>
        <ul class="mini-list">${state.githubPlan.predictedUseCases.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
      <div class="plan-block">
        <h4>接入步骤</h4>
        <ul class="mini-list">${state.githubPlan.integrationSteps.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
      <div class="plan-block">
        <h4>目标风险</h4>
        <ul class="mini-list">${state.githubPlan.riskTargets.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
    `
    : `<div class="note-block">当前患者尚未生成开源能力接入计划。</div>`;
}

function renderIntegrations() {
  if (!state.adapterOutput || !state.predictionSuite) return;

  adapterSummary.innerHTML = `
    <div class="plan-block">
      <h4>适配链摘要</h4>
      <ul class="mini-list">
        <li>总资源数：${state.adapterOutput.mergedSummary.resourceCount}</li>
        <li>院内资源：${state.adapterOutput.mergedSummary.hospitalResourceCount}</li>
        <li>院外资源：${state.adapterOutput.mergedSummary.patientGeneratedResourceCount}</li>
        <li>覆盖类型：${state.adapterOutput.mergedSummary.coveredCategories.join(" / ")}</li>
      </ul>
    </div>
    <div class="plan-block">
      <h4>HealthChain</h4>
      <div class="dim">${state.adapterOutput.healthChain.bundleType} bundle · ${state.adapterOutput.healthChain.resources.length} 条 FHIR 风格资源</div>
    </div>
    <div class="plan-block">
      <h4>SMART on FHIR</h4>
      <ul class="mini-list">
        <li>FHIR Base：${state.adapterOutput.smart.fhirBaseUrl}</li>
        <li>Authorize：${state.adapterOutput.smart.authorizeUrl}</li>
        <li>Token：${state.adapterOutput.smart.tokenUrl}</li>
        <li>Scopes：${state.adapterOutput.smart.scopes.join(" / ")}</li>
      </ul>
    </div>
    <div class="plan-block">
      <h4>healthkit-on-fhir</h4>
      <ul class="mini-list">${state.adapterOutput.healthKit.rawObservations
        .map((item) => `<li>${item.kind} · ${item.value}${item.unit ? ` ${item.unit}` : ""}</li>`)
        .join("")}</ul>
    </div>
  `;

  predictionSummary.innerHTML = `
    <div class="plan-block">
      <h4>输入摘要</h4>
      <ul class="mini-list">
        <li>疾病：${state.predictionSuite.inputSummary.conditions.join(" / ")}</li>
        <li>告警：${state.predictionSuite.inputSummary.alerts.join(" / ")}</li>
        <li>使用观测：${state.predictionSuite.inputSummary.observationsUsed.join(" / ")}</li>
        <li>时序点数：${state.predictionSuite.featureEngineering.temporalSeriesPoints}</li>
        <li>时序信号：${state.predictionSuite.featureEngineering.temporalSignals.join(" / ")}</li>
        <li>文本特征：${state.predictionSuite.featureEngineering.textFeatureTerms.join(" / ")}</li>
      </ul>
    </div>
    ${
      state.predictionSuite.pipelines?.temporai
        ? `
          <div class="plan-block">
            <h4>TemporAI 插件链</h4>
            <ul class="mini-list">
              <li>插件：${state.predictionSuite.pipelines.temporai.plugin ?? "未运行"}</li>
              <li>预处理：${(state.predictionSuite.pipelines.temporai.preprocessors ?? []).join(" / ") || "无"}</li>
              <li>Cohort：${state.predictionSuite.pipelines.temporai.cohortSize ?? 0} 人</li>
              <li>时序行数：${state.predictionSuite.pipelines.temporai.timeSeriesRows ?? 0}</li>
              <li>时序特征：${state.predictionSuite.pipelines.temporai.timeSeriesFeatureCount ?? 0}</li>
              <li>TTE 插件：${state.predictionSuite.pipelines.temporai.timeToEventPlugin ?? "未运行"}</li>
              <li>TTE 时间窗：${(state.predictionSuite.pipelines.temporai.timeToEventHorizons ?? []).join(" / ") || "无"}</li>
              <li>TTE 风险：${
                state.predictionSuite.pipelines.temporai.timeToEventHorizonScores
                  ? Object.entries(state.predictionSuite.pipelines.temporai.timeToEventHorizonScores)
                      .map(([horizon, score]) => `${horizon}d=${score}`)
                      .join(" / ")
                  : "无"
              }</li>
              <li>TTE 分域：${
                state.predictionSuite.pipelines.temporai.timeToEventByDomain
                  ? Object.entries(state.predictionSuite.pipelines.temporai.timeToEventByDomain)
                      .map(
                        ([domain, info]) =>
                          `${domain}(${info.sampleCount}/${info.eventCount}): ${Object.entries(info.horizonScores)
                            .map(([horizon, score]) => `${horizon}d=${score}`)
                            .join(", ")}`
                      )
                      .join(" / ")
                  : "无"
              }</li>
              <li>TTE 清单：${state.predictionSuite.pipelines.temporai.timeToEventManifest ?? "无"}</li>
              ${
                state.predictionSuite.pipelines.temporai.error
                  ? `<li>错误：${state.predictionSuite.pipelines.temporai.error}</li>`
                  : ""
              }
            </ul>
          </div>
        `
        : ""
    }
    ${
      state.predictionSuite.pipelines?.pyhealth
        ? `
          <div class="plan-block">
            <h4>PyHealth Dataset</h4>
            <ul class="mini-list">
              <li>数据集：${state.predictionSuite.pipelines.pyhealth.datasetName ?? "未生成"}</li>
              <li>任务：${state.predictionSuite.pipelines.pyhealth.taskName ?? "未生成"}</li>
              <li>模型：${state.predictionSuite.pipelines.pyhealth.model ?? "未训练"}${state.predictionSuite.pipelines.pyhealth.trainer ? ` / ${state.predictionSuite.pipelines.pyhealth.trainer}` : ""}</li>
              <li>样本/患者/就诊：${state.predictionSuite.pipelines.pyhealth.sampleCount ?? 0} / ${state.predictionSuite.pipelines.pyhealth.patientCount ?? 0} / ${state.predictionSuite.pipelines.pyhealth.visitCount ?? 0}</li>
              <li>阳性率：${state.predictionSuite.pipelines.pyhealth.positiveLabelRate ?? 0}</li>
              <li>训练：epoch ${state.predictionSuite.pipelines.pyhealth.epochs ?? 0} / batch ${state.predictionSuite.pipelines.pyhealth.batchSize ?? 0} / loss ${state.predictionSuite.pipelines.pyhealth.loss ?? 0}</li>
              <li>切分：train ${state.predictionSuite.pipelines.pyhealth.split?.train ?? 0} / val ${state.predictionSuite.pipelines.pyhealth.split?.val ?? 0} / test ${state.predictionSuite.pipelines.pyhealth.split?.test ?? 0}</li>
              <li>监控：${state.predictionSuite.pipelines.pyhealth.monitor ?? "无"} / best ${state.predictionSuite.pipelines.pyhealth.bestCheckpoint ?? "无"} / last ${state.predictionSuite.pipelines.pyhealth.lastCheckpoint ?? "无"}</li>
              <li>指标清单：${state.predictionSuite.pipelines.pyhealth.metricsManifest ?? "无"}</li>
              <li>验证指标：${
                state.predictionSuite.pipelines.pyhealth.validationMetrics
                  ? Object.entries(state.predictionSuite.pipelines.pyhealth.validationMetrics)
                      .map(([metric, value]) => `${metric}=${value}`)
                      .join(" / ")
                  : "无"
              }</li>
              <li>测试指标：${
                state.predictionSuite.pipelines.pyhealth.testMetrics
                  ? Object.entries(state.predictionSuite.pipelines.pyhealth.testMetrics)
                      .map(([metric, value]) => `${metric}=${value}`)
                      .join(" / ")
                  : "无"
              }</li>
              <li>特征键：${(state.predictionSuite.pipelines.pyhealth.featureKeys ?? []).join(" / ") || "无"}</li>
              <li>词表：疾病 ${state.predictionSuite.pipelines.pyhealth.conditionVocabularySize ?? 0} / 处置 ${state.predictionSuite.pipelines.pyhealth.procedureVocabularySize ?? 0} / 用药 ${state.predictionSuite.pipelines.pyhealth.drugVocabularySize ?? 0}</li>
              ${
                state.predictionSuite.pipelines.pyhealth.error
                  ? `<li>错误：${state.predictionSuite.pipelines.pyhealth.error}</li>`
                  : ""
              }
            </ul>
          </div>
        `
        : ""
    }
    <div class="plan-block">
      <h4>运行时</h4>
      <ul class="mini-list">
        <li>Python：${state.predictionSuite.runtime.python}</li>
        ${Object.entries(state.predictionSuite.runtime.packages)
          .map(
            ([name, info]) =>
              `<li>${name} · ${info.available ? `available ${info.version ?? ""}` : "unavailable"}${info.note ? ` · ${info.note}` : ""}</li>`
          )
          .join("")}
      </ul>
    </div>
    ${state.predictionSuite.predictions
      .map(
        (prediction) => `
          <div class="plan-block">
            <h4>${prediction.provider} · ${prediction.task}</h4>
            <div class="dim">风险 ${prediction.level} · 评分 ${prediction.score.toFixed(2)}</div>
            <div class="dim">${prediction.explanation}</div>
            <ul class="mini-list">${prediction.recommendedActions.map((item) => `<li>${item}</li>`).join("")}</ul>
          </div>
        `
      )
      .join("")}
  `;
}

function renderMappings() {
  if (!mappingGrid) return;
  mappingGrid.innerHTML = state.mappings
    .map(
      (mapping) => `
        <article class="mapping-card">
          <div class="panel-kicker">${mapping.hospitalName}</div>
          <h4>${mapping.sourceSchema}</h4>
          <div class="dim">${mapping.description}</div>
          <div class="mapping-table">
            ${mapping.fieldMappings
              .slice(0, 6)
              .map(
                (row) => `
                  <div class="mapping-row">
                    <code>${row.sourcePath}</code>
                    <strong>${row.targetField}</strong>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      `
    )
    .join("");
}

function renderMeetings() {
  if (!meetingList || !activeMeetingTitle || !meetingDetail) return;
  const meetings = state.workspace?.mdtMeetings ?? [];
  meetingList.innerHTML = meetings.length
    ? meetings
        .map(
          (meeting) => `
            <article class="meeting-card ${meeting.id === state.activeMeetingId ? "active" : ""}">
              <div class="status-pill ${meeting.status === "open" ? "medium" : "low"}">${meeting.status === "open" ? "Open" : "Closed"}</div>
              <h4>${meeting.topic}</h4>
              <div class="dim">${new Date(meeting.updatedAt).toLocaleString("zh-CN")}</div>
              <button data-meeting-id="${meeting.id}">查看会议</button>
            </article>
          `
        )
        .join("")
    : `<div class="note-block">还没有 MDT 会议。</div>`;

  meetingList.querySelectorAll("button[data-meeting-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeMeetingId = button.dataset.meetingId;
      renderMeetings();
      renderActiveMeeting();
    });
  });

  if (!state.activeMeetingId && meetings.length) {
    state.activeMeetingId = meetings[0].id;
  }

  renderActiveMeeting();
}

function clinicianOptions(meeting) {
  return meeting.participantIds
    .map((id) => state.allClinicians.find((clinician) => clinician.id === id))
    .filter(Boolean)
    .map((clinician) => `<option value="${clinician.id}">${clinician.name} · ${clinician.role}</option>`)
    .join("");
}

function renderActiveMeeting() {
  if (!activeMeetingTitle || !meetingDetail) return;
  const meeting = (state.workspace?.mdtMeetings ?? []).find((item) => item.id === state.activeMeetingId);

  if (!meeting) {
    activeMeetingTitle.textContent = "选择一个 MDT 会议";
    meetingDetail.className = "meeting-detail empty-state";
    meetingDetail.textContent = "会议消息、结论和追踪动作会显示在这里。";
    return;
  }

  activeMeetingTitle.textContent = meeting.topic;
  meetingDetail.className = "meeting-detail";
  meetingDetail.innerHTML = `
    <div class="note-block">
      <div class="status-pill ${meeting.status === "open" ? "medium" : "low"}">${meeting.status === "open" ? "Open" : "Closed"}</div>
      <p class="dim">参与者：${meeting.participantIds
        .map((id) => state.allClinicians.find((clinician) => clinician.id === id)?.name || id)
        .join("、")}</p>
      ${meeting.decision ? `<p><strong>结论：</strong>${meeting.decision}</p>` : ""}
    </div>
    <div class="message-stream">
      ${
        meeting.messages.length
          ? meeting.messages
              .map(
                (message) => `
                  <article class="message-card">
                    <header>
                      <strong>${message.clinicianName}</strong>
                      <span>${new Date(message.createdAt).toLocaleString("zh-CN")}</span>
                    </header>
                    <div class="dim">${message.role}</div>
                    <p>${message.message}</p>
                  </article>
                `
              )
              .join("")
          : `<div class="note-block">暂无发言，点击下方表单开始讨论。</div>`
      }
    </div>
    ${
      meeting.status === "open"
        ? isStaticMode
          ? `
          <div class="note-block">
            GitHub Pages 演示站为只读模式。会议发言、关闭会议和工作流执行请在 Render 或 Railway 的完整服务版中进行。
          </div>
        `
          : `
          <form id="message-form" class="meeting-form">
            <select name="clinicianId">${clinicianOptions(meeting)}</select>
            <textarea name="message" placeholder="输入 MDT 发言"></textarea>
            <div class="meeting-actions">
              <button class="primary-button" type="submit">发送发言</button>
            </div>
          </form>
          <form id="decision-form" class="decision-form">
            <textarea name="decision" placeholder="填写会议结论"></textarea>
            <input name="followUpActions" placeholder="追踪动作，多个用；分隔" />
            <div class="meeting-actions">
              <button class="ghost-button" type="submit">关闭会议并生成纪要</button>
            </div>
          </form>
        `
        : ""
    }
  `;

  const messageForm = document.querySelector("#message-form");
  if (messageForm) {
    messageForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(messageForm);
      await api(`/api/mdt-meetings/${meeting.id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          clinicianId: form.get("clinicianId"),
          message: form.get("message")
        })
      });
      await refreshDashboard();
      await loadWorkspace();
    });
  }

  const decisionForm = document.querySelector("#decision-form");
  if (decisionForm) {
    decisionForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(decisionForm);
      await api(`/api/mdt-meetings/${meeting.id}/close`, {
        method: "POST",
        body: JSON.stringify({
          decision: form.get("decision"),
          followUpActions: String(form.get("followUpActions") || "")
            .split("；")
            .map((item) => item.trim())
            .filter(Boolean)
        })
      });
      await refreshDashboard();
      await loadWorkspace();
    });
  }
}

async function loadWorkspace() {
  if (!state.patientId) return;
  const query = buildQuery({ workbenchRole: state.filters.workbenchRole });
  const [workspace, medclawWorkspace, patientJourney, patientGithubPlan, adapterOutput, predictionSuite] =
    await Promise.all([
    api(`/api/patients/${state.patientId}/workspace${query}`),
    api(`/api/medclaw/patients/${state.patientId}/workspace${query}`),
    api(`/api/ecosystem/patients/${state.patientId}/journey`),
    api(`/api/github-capabilities/patients/${state.patientId}/plan`),
    api(`/api/integrations/patients/${state.patientId}/adapted`),
    api(`/api/predictions/patients/${state.patientId}`)
  ]);
  state.workspace = workspace;
  state.medclawWorkspace = medclawWorkspace;
  state.ecosystemJourney = patientJourney;
  state.githubPlan = patientGithubPlan;
  state.adapterOutput = adapterOutput;
  state.predictionSuite = predictionSuite;
  renderPatients();
  if (isClinicianFollowupsPage) {
    renderClinicianClinicalWorkbench();
  } else {
    renderWorkspace();
  }
}

async function loadPopulation() {
  const districtCohortPromise = api("/api/population/cohort");
  const scopedCohortPromise = state.filters.hospitalId
    ? api(`/api/population/cohort${buildQuery({ hospitalId: state.filters.hospitalId })}`)
    : districtCohortPromise;
  const [districtCohort, scopedCohort] = await Promise.all([districtCohortPromise, scopedCohortPromise]);
  state.populationDistrictCohort = districtCohort;
  state.populationCohort = scopedCohort;
  const patientIds = new Set(state.populationCohort?.patients?.map((patient) => patient.id) ?? []);
  if (!patientIds.has(state.populationPatientId)) {
    state.populationPatientId = state.populationCohort?.patients?.[0]?.id ?? null;
  }
  renderPopulation();
  renderPatients();
  renderCommandCenter();
  renderFollowupCenter();
}

async function refreshDashboard() {
  const query = buildQuery(state.filters);
  const [dashboard, clinicians] = await Promise.all([
    api(`/api/dashboard${query}`),
    api(`/api/clinicians${query}`)
  ]);
  state.dashboard = filterDashboardToQixia(dashboard, clinicians);
  state.clinicians = clinicians.filter((clinician) => clinician.hospitalIds.some((hospitalId) => getHospitalById(hospitalId)));

  const patientIds = new Set((state.dashboard.patients ?? []).map((patient) => patient.id));
  if (!patientIds.has(state.patientId)) {
    state.patientId = state.dashboard.patients[0]?.id ?? null;
    state.activeMeetingId = null;
  }

  renderDashboard();
  renderPatients();
}

if (isStaticMode && runWorkflowBtn && createMeetingBtn) {
  runWorkflowBtn.disabled = true;
  createMeetingBtn.disabled = true;
  runWorkflowBtn.textContent = "GitHub Pages 静态演示";
  createMeetingBtn.textContent = "只读模式";
}

runWorkflowBtn?.addEventListener("click", async () => {
  if (!state.patientId) return;
  runWorkflowBtn.disabled = true;
  runWorkflowBtn.textContent = "工作流执行中...";
  try {
    await api(`/api/workflows/chronic-care/run/${state.patientId}`, { method: "POST" });
    await refreshDashboard();
    await loadPopulation();
    if (shouldLoadWorkspacePage()) await loadWorkspace();
  } finally {
    runWorkflowBtn.disabled = false;
    runWorkflowBtn.textContent = "启动慢病工作流";
  }
});

createMeetingBtn?.addEventListener("click", async () => {
  if (!state.patientId || !state.workspace) return;
  const topic = window.prompt("请输入 MDT 会议主题", `${state.workspace.patient.name} 慢病管理 MDT 在线讨论`);
  if (!topic) return;
  await api(`/api/patients/${state.patientId}/mdt-meetings`, {
    method: "POST",
    body: JSON.stringify({ topic })
  });
  await refreshDashboard();
  if (shouldLoadWorkspacePage()) await loadWorkspace();
});

hospitalFilter?.addEventListener("change", async () => {
  state.filters.hospitalId = hospitalFilter.value;
  state.dynamicHospitalFocusId = hospitalFilter.value;
  state.followupClinician = "";
  state.hospitalWorkbenchSelectedEntity = "";
  state.hospitalWorkbenchSelectedEntityType = "";
  state.selectedPatientTableIds = [];
  state.patientPage = 1;
  await refreshDashboard();
  await loadPopulation();
  if (shouldLoadWorkspacePage()) {
    state.patientId = state.populationPatientId ?? state.patientId;
    await loadWorkspace();
  }
});

roleFilter?.addEventListener("change", async () => {
  state.filters.workbenchRole = roleFilter.value;
  state.followupClinician = "";
  state.hospitalWorkbenchSelectedEntity = "";
  state.hospitalWorkbenchSelectedEntityType = "";
  state.selectedPatientTableIds = [];
  state.patientPage = 1;
  await refreshDashboard();
  await loadPopulation();
  if (shouldLoadWorkspacePage()) {
    state.patientId = state.populationPatientId ?? state.patientId;
    await loadWorkspace();
  }
});

followupGroupFilter?.addEventListener("change", () => {
  state.followupGroupBy = followupGroupFilter.value;
  renderFilters();
  renderFollowupCenter();
});

followupStatusFilter?.addEventListener("change", () => {
  state.followupStatus = followupStatusFilter.value;
  state.patientPage = 1;
  state.selectedPatientTableIds = [];
  renderFilters();
  renderFollowupCenter();
});

followupClinicianFilter?.addEventListener("change", () => {
  state.followupClinician = followupClinicianFilter.value;
  state.hospitalWorkbenchSelectedEntity = "";
  state.hospitalWorkbenchSelectedEntityType = "";
  state.selectedPatientTableIds = [];
  state.patientPage = 1;
  renderFollowupCenter();
});

patientViewFilter?.addEventListener("change", () => {
  state.patientViewMode = patientViewFilter.value;
  state.patientPage = 1;
  state.selectedPatientTableIds = [];
  renderFollowupCenter();
});

patientRiskFilter?.addEventListener("change", () => {
  state.patientRiskFilter = patientRiskFilter.value;
  state.patientPage = 1;
  state.selectedPatientTableIds = [];
  renderFollowupCenter();
});

patientDiagnosisFilter?.addEventListener("change", () => {
  state.patientDiseaseFilter = patientDiagnosisFilter.value === "all" ? "" : patientDiagnosisFilter.value;
  state.patientPage = 1;
  state.selectedPatientTableIds = [];
  renderFollowupCenter();
});

patientSortFilter?.addEventListener("change", () => {
  state.patientSortBy = patientSortFilter.value;
  state.patientPage = 1;
  renderFollowupCenter();
});

publicDataViewFilter?.addEventListener("change", () => {
  renderPublicDataConfig();
});

publicDataSourceFilter?.addEventListener("change", () => {
  renderPublicDataConfig();
});

publicDataModuleFilter?.addEventListener("change", () => {
  renderPublicDataConfig();
});

publicDataExportJsonBtn?.addEventListener("click", () => {
  const publicData = normalizePublicData();
  exportPublicDataDraftsJson(publicData, publicDataFilteredAssets(publicData));
});

publicDataExportXlsxBtn?.addEventListener("click", () => {
  const publicData = normalizePublicData();
  exportPublicDataDraftsExcel(publicData, publicDataFilteredAssets(publicData));
});

exportFollowupsBtn?.addEventListener("click", () => {
  exportOverdueFollowups();
});

async function init() {
  document.body.dataset.displayMode = isWallboardMode ? "wallboard" : "standard";
  if (displayModeToggle) {
    displayModeToggle.textContent = isWallboardMode ? "退出区级大屏模式" : "切换区级大屏模式";
    displayModeToggle.setAttribute("href", isWallboardMode ? "./index.html" : "./index.html?display=wallboard");
  }
  ensureSidebarNavigation();
  const [hospitals, mappings, allClinicians, medclawOverview, ecosystemOverview, githubOverview, publicSourceData] = await Promise.all([
    api("/api/hospitals"),
    api("/api/his/mappings"),
    api("/api/clinicians"),
    api("/api/medclaw/overview"),
    api("/api/ecosystem/overview"),
    api("/api/github-capabilities/overview"),
    api("/api/public-sources/qixia")
  ]);
  state.hospitals = qixiaHospitalsOnly(hospitals);
  state.mappings = mappings;
  state.allClinicians = allClinicians.filter((clinician) => clinician.hospitalIds.some((hospitalId) => getHospitalById(hospitalId)));
  state.medclawOverview = medclawOverview;
  state.ecosystemOverview = ecosystemOverview;
  state.githubOverview = githubOverview;
  state.publicSourceData = publicSourceData;
  if (isPublicDataConfigPage) {
    renderPublicDataConfig();
    return;
  }
  if (isHospitalFollowupsPage) {
    state.followupGroupBy = "hospital";
    state.followupStatus = "active";
    state.patientViewMode = "anomaly";
    state.patientRiskFilter = "high";
  }
  if (isClinicianFollowupsPage) {
    state.followupGroupBy = "clinician";
    state.filters.workbenchRole = "specialist-doctor";
    state.hospitalWorkbenchEntityView = "doctor";
    state.followupStatus = "active";
    state.patientViewMode = "anomaly";
    state.patientRiskFilter = "high";
  }
  renderFilters();
  renderMappings();
  await refreshDashboard();
  await loadPopulation();
  state.patientId = state.populationPatientId ?? state.dashboard?.patients[0]?.id ?? state.populationCohort?.patients?.[0]?.id ?? null;
  if (shouldLoadWorkspacePage()) {
    await loadWorkspace();
  }
  refreshInterfacePolish();
  if (isPublicDataConfigPage) {
    renderPublicDataConfig();
  }
}

init().catch((error) => {
  if (heroSubtitle) {
    heroSubtitle.textContent = `加载失败：${error.message}`;
  }
});
