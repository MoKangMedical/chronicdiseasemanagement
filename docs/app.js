const appConfig = window.__APP_CONFIG__ ?? {};
const pageMode = document.body.dataset.page || "home";
const pageQuery = new URLSearchParams(window.location.search);
const isHomePage = pageMode === "home";
const isHospitalFollowupsPage = pageMode === "followups-hospital";
const isClinicianFollowupsPage = pageMode === "followups-clinician";
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
  followupStatus: "overdue",
  followupClinician: "",
  clinicianTab: "my-todos"
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
    (total, plan) => total + (plan.todoList ?? []).filter((todo) => todo.status === "overdue").length,
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
  if (!hospitalFilter || !roleFilter) return;
  hospitalFilter.innerHTML = [
    `<option value="">栖霞区全域</option>`,
    ...state.hospitals.map((hospital) => `<option value="${hospital.id}">${hospital.name}</option>`)
  ].join("");
  hospitalFilter.value = state.filters.hospitalId;
  roleFilter.value = state.filters.workbenchRole;
  if (followupGroupFilter) followupGroupFilter.value = state.followupGroupBy;
  if (followupStatusFilter) followupStatusFilter.value = state.followupStatus;
}

function renderDashboard() {
  if (!state.dashboard || !summaryMetrics) return;
  summaryMetrics.innerHTML = "";
  const items = [
    ["患者", state.dashboard.summary.patients],
    ["文档", state.dashboard.summary.documents],
    ["开放 MDT", state.dashboard.summary.openMeetings],
    ["Care Plan", state.dashboard.summary.carePlans],
    ["当前角色资源", state.dashboard.clinicians]
  ];

  for (const [label, value] of items) {
    const card = document.createElement("div");
    card.className = "metric-card";
    card.innerHTML = `<span class="dim">${label}</span><strong>${value}</strong>`;
    summaryMetrics.append(card);
  }
}

function renderPatients() {
  if (!patientList || !patientTemplate) return;
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
}

function computeHospitalInsights() {
  const patients = getDistrictPopulationPatients();
  const rankingByHospitalId = new Map(
    (state.populationDistrictCohort?.hospitalPerformanceRanking ?? []).map((item) => [item.hospitalId, item])
  );

  return state.hospitals
    .map((hospital) => {
      const hospitalPatients = patients.filter((patient) => patient.hospitalId === hospital.id);
      const ranking = rankingByHospitalId.get(hospital.id);
      const patientCount = ranking?.patientCount ?? hospitalPatients.length;
      const domainCounts = (ranking?.topDomains ?? []).map((item) => ({
        ...item,
        ratio: percentage(item.count, patientCount)
      }));
      const packageRatios = (ranking?.topPackages ?? []).map((item) => ({
        title: item.title,
        count: item.count,
        ratio: percentage(item.count, patientCount)
      }));

      return {
        hospital,
        patientCount,
        effectiveCount: ranking ? Math.round((Number.parseFloat(ranking.effectiveRate) || 0) * patientCount) : 0,
        effectiveRate: ranking ? `${ranking.effectiveRate}%` : "0%",
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
    .sort((left, right) => right.patientCount - left.patientCount);
}

function resolveActiveHospitalInsight(insights) {
  if (!insights.length) return null;
  const selectedHospitalId = state.dynamicHospitalFocusId || state.filters.hospitalId || insights[0]?.hospital.id;
  return insights.find((item) => item.hospital.id === selectedHospitalId) ?? insights[0];
}

function renderDynamicCommandStage() {
  if (!districtLiveStage || !districtFlowStory) return;
  const cohort = state.populationDistrictCohort ?? state.populationCohort;
  if (!cohort) return;

  const insights = computeHospitalInsights();
  const activeInsight = resolveActiveHospitalInsight(insights);
  const selectedPatient =
    cohort.patients.find((patient) => patient.id === state.populationPatientId) ?? cohort.patients[0] ?? null;
  const activeCheckpoint = selectedPatient ? checkpointForWeek(selectedPatient, state.populationCheckpointWeek) : null;
  const funnel = (cohort.coordinationFunnel ?? []).slice(0, 6);
  const topDomains = (cohort.domainPrevalence ?? []).slice(0, 6);
  const maxDomainCount = Math.max(...topDomains.map((item) => item.count), 1);
  const spotlightHospitals = insights.slice(0, 6);
  const packageHighlights = (activeInsight?.packageRatios ?? []).slice(0, 4);
  const maxPackageCount = Math.max(...packageHighlights.map((item) => item.count), 1);
  const publicAssets = (cohort.publicProfile?.systemUsableAssets ?? []).slice(0, 4);

  districtLiveStage.innerHTML = `
    <div class="dynamic-stage-grid">
      <div class="dynamic-stage-metrics">
        <article class="dynamic-metric-card accent-blue">
          <span>常住人口底数</span>
          ${counterMarkup(cohort.publicProfile?.totalPopulation ?? 0, { format: "compact" })}
          <small>${cohort.publicProfile?.totalPopulationLabel ?? "-"}</small>
        </article>
        <article class="dynamic-metric-card accent-cyan">
          <span>全量仿真管理人数</span>
          ${counterMarkup(cohort.patientCount ?? 0, { format: "compact" })}
          <small>当前按栖霞区总人口作为管理口径</small>
        </article>
        <article class="dynamic-metric-card accent-indigo">
          <span>高风险慢病人群</span>
          ${counterMarkup((cohort.summary ?? {})?.highRiskCount ?? 0, { format: "compact" })}
          <small>区级优先队列与转诊会诊入口</small>
        </article>
        <article class="dynamic-metric-card accent-emerald">
          <span>闭环执行率</span>
          ${counterMarkup((cohort.summary ?? {})?.closedLoopRate ?? 0, { format: "percent", suffix: "%" })}
          <small>反映区级连续管理与复评执行情况</small>
        </article>
      </div>

      <div class="dynamic-stage-network">
        <div class="network-orbit">
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

        <div class="dynamic-stage-highlight">
          ${
            activeInsight
              ? `
                <div class="highlight-head">
                  <div>
                    <span class="mini-tag">${activeInsight.hospital.networkRole ?? activeInsight.hospital.level ?? "医院"}</span>
                    <h4>${activeInsight.hospital.name}</h4>
                  </div>
                  <strong>${coveragePercentage(activeInsight.patientCount, cohort.publicProfile?.totalPopulation ?? 0)}</strong>
                </div>
                <div class="highlight-bars">
                  <div class="highlight-bar-row">
                    <span>管理患者</span>
                    <div class="progress-track"><i data-progress-width="${coveragePercentage(activeInsight.patientCount, cohort.patientCount)}"></i></div>
                    <strong>${formatCompactMetric(activeInsight.patientCount)}</strong>
                  </div>
                  <div class="highlight-bar-row">
                    <span>病种聚焦</span>
                    <div class="progress-track"><i data-progress-width="${activeInsight.diseaseRatios[0]?.ratio ?? "0%"}"></i></div>
                    <strong>${activeInsight.diseaseRatios[0]?.label ?? "待补充"}</strong>
                  </div>
                  <div class="highlight-bar-row">
                    <span>起效率</span>
                    <div class="progress-track"><i data-progress-width="${activeInsight.effectiveRate}"></i></div>
                    <strong>${activeInsight.effectiveRate}</strong>
                  </div>
                </div>
                <div class="highlight-asset-strip">
                  ${publicAssets
                    .map(
                      (asset) => `
                        <div class="highlight-asset-card">
                          <span>${asset.title}</span>
                          <strong>${asset.value}</strong>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              `
              : `<div class="note-block">暂无医院聚焦数据。</div>`
          }
        </div>
      </div>
    </div>
  `;

  districtFlowStory.innerHTML = `
    <div class="dynamic-story-grid">
      <article class="story-card">
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

      <article class="story-card">
        <div class="story-head">
          <span class="mini-tag">协同漏斗</span>
          <strong>筛查到闭环</strong>
        </div>
        <div class="story-funnel">
          ${funnel
            .map(
              (stage, index) => `
                <div class="funnel-stage ${index === 0 ? "active" : ""}">
                  <span>${stage.stage}</span>
                  ${counterMarkup(stage.count ?? 0, { format: "compact" })}
                  <small>${stage.description ?? stage.note ?? "区级协同阶段"}</small>
                </div>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="story-card">
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

      <article class="story-card">
        <div class="story-head">
          <span class="mini-tag">阶段改善</span>
          <strong>${selectedPatient?.name ?? "当前患者"} 4/8/12 周</strong>
        </div>
        ${
          selectedPatient && activeCheckpoint
            ? `
              <div class="journey-stage-strip">
                ${selectedPatient.interventionProjection.timelineCheckpoints
                  .map(
                    (checkpoint) => `
                      <button class="journey-stage-card ${checkpoint.week === state.populationCheckpointWeek ? "active" : ""}" data-checkpoint-week="${checkpoint.week}">
                        <span>${checkpoint.label}</span>
                        <strong>${checkpoint.overallScore}</strong>
                        <small>${formatLevel(checkpoint.overallLevel)}</small>
                      </button>
                    `
                  )
                  .join("")}
              </div>
              <div class="journey-explainer">
                <div class="journey-track">
                  <i class="journey-track-progress" style="--journey-progress:${(activeCheckpoint.week / 12) * 100}%"></i>
                </div>
                <div class="journey-copy">
                  <strong>${selectedPatient.hospitalName}</strong>
                  <div class="dim">${selectedPatient.improvementRecords.find((item) => item.week === activeCheckpoint.week)?.explanation ?? selectedPatient.interventionProjection.recommendations[0]}</div>
                </div>
              </div>
            `
            : `<div class="note-block">暂无患者阶段改善数据。</div>`
        }
      </article>
    </div>
  `;

  districtLiveStage.querySelectorAll("[data-dynamic-hospital]").forEach((node) => {
    node.addEventListener("click", () => {
      state.dynamicHospitalFocusId = node.getAttribute("data-dynamic-hospital") || "";
      try { renderDynamicCommandStage(); } catch(e) { console.error("renderDynamicCommandStage failed:", e.message, e.stack?.split("\n")[1]); }
      renderHospitalOverview();
    });
  });

  districtFlowStory.querySelectorAll("[data-checkpoint-week]").forEach((node) => {
    node.addEventListener("click", () => {
      const nextWeek = Number(node.getAttribute("data-checkpoint-week"));
      if (!Number.isFinite(nextWeek)) return;
      state.populationCheckpointWeek = nextWeek;
      try { renderPopulation(); } catch(e) { console.error("renderPopulation failed:", e.message, e.stack?.split("\n")[1]); }
    });
  });

  animateCounters(districtLiveStage);
  animateCounters(districtFlowStory);
  activateProgressBars(districtLiveStage);
  activateProgressBars(districtFlowStory);
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
  const leadPatient =
    cohort.patients.find((patient) => patient.id === state.populationPatientId) ?? cohort.patients[0] ?? null;
  const topDomain = cohort.domainPrevalence?.[0];

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
      <span>演示患者窗口</span>
      <strong>${leadPatient?.name ?? "未选择患者"}</strong>
      <small>${leadPatient ? `${leadPatient.hospitalName} · ${leadPatient.nextFollowUpDate}` : "暂无患者"}</small>
    </div>
  `;

  animateCounters(wallboardHeroRibbon);
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
    try { renderDynamicCommandStage(); } catch(e) { console.error("renderDynamicCommandStage failed:", e.message, e.stack?.split("\n")[1]); }
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
    try { renderPopulation(); } catch(e) { console.error("renderPopulation failed:", e.message, e.stack?.split("\n")[1]); }
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
        <button class="hospital-card ${insight.hospital.id === selectedHospitalId ? "active" : ""}" data-hospital-card="${insight.hospital.id}">
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
      await loadWorkspace();
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
    const ops = (cohort.districtOperations ?? {});
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
          <li>闭环率：${formatRateValue((cohort.summary ?? {}).closedLoopRate)}</li>
          <li>建议转诊：${(cohort.referralMetrics ?? {}).referralSuggestedCount} 人</li>
          <li>完成转诊：${(cohort.referralMetrics ?? {}).referralCompletedCount} 人</li>
          <li>会诊触发：${(cohort.referralMetrics ?? {}).consultationCount} 人</li>
          <li>MDT 复核：${(cohort.referralMetrics ?? {}).mdtReviewCount} 人</li>
        </ul>
      </div>
    `;
  }

  if (hospitalBenchmarkPanel) {
    hospitalBenchmarkPanel.innerHTML = (cohort.hospitalPerformanceRanking ?? [])
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
    const governance = cohort.modelGovernance ?? {};
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
  const workload = (cohort.roleWorkload ?? []).find((item) => item.role === mapWorkbenchToFollowupRole(state.filters.workbenchRole));

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
          ${statChip("闭环率", formatRateValue((cohort.referralMetrics ?? {}).closedLoopRate))}
          ${statChip("转诊完成", `${(cohort.referralMetrics ?? {}).referralCompletedCount}/${(cohort.referralMetrics ?? {}).referralSuggestedCount}`)}
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
        ${(cohort.roleWorkload ?? [])
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
      try { renderFollowupCenter(); } catch(e) { console.error("renderFollowupCenter failed:", e.message); }
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
  if (!isFollowupsPage || !followupSummary || !followupGroups) return;

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
    node.addEventListener("click", () => {
      state.populationPatientId = node.getAttribute("data-followup-patient");
      try { renderPopulation(); } catch(e) { console.error("renderPopulation failed:", e.message, e.stack?.split("\n")[1]); }
      try { renderFollowupCenter(); } catch(e) { console.error("renderFollowupCenter failed:", e.message); }
    });
  });
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
        ${statChip("高风险", (cohort.summary ?? {}).highRiskCount)}
        ${statChip("危重", (cohort.summary ?? {}).criticalRiskCount)}
        ${statChip("强化管理", (cohort.summary ?? {}).intensiveManagementCount)}
        ${statChip("闭环率", `${(cohort.summary ?? {}).closedLoopRate}%`)}
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
  if (hospitalOverviewGrid && hospitalDetailPanel) renderHospitalOverview();
  if (qixiaPublicProfile) renderQixiaPublicProfile();
  try { renderDynamicCommandStage(); } catch(e) { console.error("renderDynamicCommandStage failed:", e.message, e.stack?.split("\n")[1]); }
  renderWallboardHero();
  renderExecutiveCockpit();
  if (reminderCenter) renderReminderCenter();

  setElementHtml(
    populationList,
    renderHierarchicalPatientList(cohort.patients, state.populationPatientId, {
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
    node.addEventListener("click", () => {
      state.populationPatientId = node.getAttribute("data-population-id");
      try { renderPopulation(); } catch(e) { console.error("renderPopulation failed:", e.message, e.stack?.split("\n")[1]); }
      try { renderFollowupCenter(); } catch(e) { console.error("renderFollowupCenter failed:", e.message); }
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
        ${(selectedPatient.diagnoses ?? []).map((item) => `<li>${item}</li>`).join("")}
        ${(selectedPatient.recommendedPackages ?? []).map((item) => `<li>推荐：${item}</li>`).join("")}
      </ul>
    </div>
    <div class="plan-block">
      <h4>当前管理缺口</h4>
      <ul class="mini-list">${(selectedPatient.careGaps ?? []).map((item) => `<li>${item}</li>`).join("")}</ul>
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
        ${(selectedPatient.interventionProjection?.packageTitles ?? []).map((item) => `<li>${item}</li>`).join("")}
        ${(selectedPatient.interventionProjection?.recommendations ?? []).map((item) => `<li>${item}</li>`).join("")}
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
      try { renderPopulation(); } catch(e) { console.error("renderPopulation failed:", e.message, e.stack?.split("\n")[1]); }
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
      <ul class="mini-list">${(cohort.modelDistribution ?? [])
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
  if (!commandCenterNetwork || !commandCenterQueue || !commandCenterKpis) return;
  const selectedHospital = state.hospitals.find((hospital) => hospital.id === state.filters.hospitalId);
  const networkHospitals = selectedHospital?.district
    ? state.hospitals.filter((hospital) => hospital.district === selectedHospital.district)
    : state.hospitals.filter((hospital) => hospital.district === "栖霞区");
  const cohortPatients = state.populationCohort?.patients ?? [];
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

  commandCenterQueue.innerHTML = queuePatients
    .map((patient, index) => {
      const topPrediction = [...patient.predictions].sort((left, right) => right.score - left.score)[0];
      return `
        <div class="queue-item">
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
        </div>
      `;
    })
    .join("");

  commandCenterKpis.innerHTML = `
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
      <h4>转诊与闭环</h4>
      <ul class="mini-list">
        <li>基层首诊与筛查后，进入区级慢病管理池。</li>
        <li>区医院对高风险患者发起专科升级、MDT 协调与护理路径统筹。</li>
        <li>三级医院承担复杂病例判断、专科路径修订与疑难会诊。</li>
        <li>健康管理师、家庭医生和患者端形成随访闭环。</li>
      </ul>
    </div>
    <div class="plan-block">
      <h4>当前筛选视图</h4>
      <div class="dim">${selectedHospital ? `当前医院：${selectedHospital.name}` : "当前展示：栖霞区三级诊疗协同网络"}</div>
    </div>
  `;
}

function renderWorkspace() {
  if (!isHomePage) return;
  if (!state.workspace) return;

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
      <ul class="mini-list">${(workspace.guardrails ?? []).map((item) => `<li>${item.title}：${item.description}</li>`).join("")}</ul>
    </div>
    <div class="plan-block">
      <h4>${labelWorkbenchRole((workspace.permissionBoundary?.role ?? "health-manager"))} 可读范围</h4>
      <ul class="mini-list">${(workspace.permissionBoundary?.scopes ?? []).map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
    <div class="plan-block">
      <h4>限制项</h4>
      <ul class="mini-list">${(workspace.permissionBoundary?.restrictions ?? []).map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
    <div class="note-block">
      <strong>审计事件</strong>
      <div class="dim">${(workspace.auditTrail ?? []).length} 条已记录</div>
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
      <ul class="mini-list">${(workspace.recordDraft?.diagnosis ?? []).map((item) => `<li>${item}</li>`)
        .concat((workspace.recordDraft?.plan ?? []).map((item) => `<li>${item}</li>`))
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
  try { renderWorkspace(); } catch(e) { console.error("renderWorkspace failed:", e.message, e.stack?.split("\n")[1]); }
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
  try { renderPopulation(); } catch(e) { console.error("renderPopulation failed:", e.message, e.stack?.split("\n")[1]); }
  renderCommandCenter();
  try { renderFollowupCenter(); } catch(e) { console.error("renderFollowupCenter failed:", e.message); }
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
    if (isHomePage) await loadWorkspace();
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
  if (isHomePage) await loadWorkspace();
});

hospitalFilter?.addEventListener("change", async () => {
  state.filters.hospitalId = hospitalFilter.value;
  state.dynamicHospitalFocusId = hospitalFilter.value;
  state.followupClinician = "";
  await refreshDashboard();
  await loadPopulation();
  if (isHomePage) await loadWorkspace();
});

roleFilter?.addEventListener("change", async () => {
  state.filters.workbenchRole = roleFilter.value;
  state.followupClinician = "";
  await refreshDashboard();
  await loadPopulation();
  if (isHomePage) await loadWorkspace();
});

followupGroupFilter?.addEventListener("change", () => {
  state.followupGroupBy = followupGroupFilter.value;
  renderFilters();
  try { renderFollowupCenter(); } catch(e) { console.error("renderFollowupCenter failed:", e.message); }
});

followupStatusFilter?.addEventListener("change", () => {
  state.followupStatus = followupStatusFilter.value;
  renderFilters();
  try { renderFollowupCenter(); } catch(e) { console.error("renderFollowupCenter failed:", e.message); }
});

followupClinicianFilter?.addEventListener("change", () => {
  state.followupClinician = followupClinicianFilter.value;
  try { renderFollowupCenter(); } catch(e) { console.error("renderFollowupCenter failed:", e.message); }
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
  if (isHospitalFollowupsPage) state.followupGroupBy = "hospital";
  if (isClinicianFollowupsPage) {
    state.followupGroupBy = "clinician";
    state.filters.workbenchRole = "specialist-doctor";
  }
  renderFilters();
  renderMappings();
  await refreshDashboard();
  await loadPopulation();
  state.patientId = state.dashboard?.patients[0]?.id ?? state.populationCohort?.patients?.[0]?.id ?? null;
  if (isHomePage) {
    await loadWorkspace();
  }
  if (isPublicDataConfigPage) {
    renderPublicDataConfig();
  }
}

init().catch((error) => {
  console.error("INIT FAILED:", error.message);
  console.error("Stack:", error.stack);
  if (heroSubtitle) heroSubtitle.textContent = `加载失败：${error.message}`;
});
