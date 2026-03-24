const appConfig = window.__APP_CONFIG__ ?? {};
const pageMode = document.body.dataset.page || "home";
const isHomePage = pageMode === "home";
const isHospitalFollowupsPage = pageMode === "followups-hospital";
const isClinicianFollowupsPage = pageMode === "followups-clinician";
const isFollowupsPage = isHospitalFollowupsPage || isClinicianFollowupsPage || pageMode === "followups";
const isStaticMode = appConfig.mode === "static";
const snapshotPath = appConfig.snapshotPath ?? "./demo-data/pages-snapshot.json";
const populationPath = appConfig.populationPath ?? "./demo-data/population-cohort.json";
const qixiaDistrictName = "栖霞区";
let snapshotPromise = null;
let populationPromise = null;

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
const hospitalOverviewGrid = document.querySelector("#hospital-overview-grid");
const hospitalDetailPanel = document.querySelector("#hospital-detail-panel");
const reminderCenter = document.querySelector("#reminder-center");
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

function stableIndex(seed, modulo) {
  if (!modulo) return 0;
  let total = 0;
  for (const char of String(seed)) {
    total = (total * 33 + char.charCodeAt(0)) >>> 0;
  }
  return total % modulo;
}

function getAttendingDoctor(hospitalId, patientId) {
  const doctors = state.allClinicians.filter(
    (clinician) =>
      clinician.hospitalIds.includes(hospitalId) &&
      (clinician.workbenchRole === "specialist-doctor" || clinician.workbenchRole === "general-practitioner")
  );
  const fallbackDoctors = doctors.length
    ? doctors
    : state.allClinicians.filter((clinician) => clinician.hospitalIds.includes(hospitalId));
  if (!fallbackDoctors.length) {
    return {
      name: "待分配医生",
      department: "院内待分配"
    };
  }
  return fallbackDoctors[stableIndex(`${hospitalId}-${patientId}`, fallbackDoctors.length)];
}

function buildPatientHierarchy(patients) {
  const hospitals = new Map();

  for (const patient of patients ?? []) {
    const hospital = getHospitalById(patient.hospitalId) ?? { name: patient.hospitalName, id: patient.hospitalId };
    const attendingDoctor = getAttendingDoctor(patient.hospitalId, patient.id);
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
        patients: []
      };

    doctorEntry.patients.push(patient);
    hospitalEntry.doctors.set(doctorKey, doctorEntry);
    hospitals.set(hospital.id, hospitalEntry);
  }

  return [...hospitals.values()]
    .map((hospital) => ({
      ...hospital,
      doctors: [...hospital.doctors.values()].sort((left, right) => right.patients.length - left.patients.length)
    }))
    .sort((left, right) => {
      const leftCount = left.doctors.reduce((total, doctor) => total + doctor.patients.length, 0);
      const rightCount = right.doctors.reduce((total, doctor) => total + doctor.patients.length, 0);
      return rightCount - leftCount;
    });
}

function renderHierarchicalPatientList(patients, selectedId, options) {
  const hierarchy = buildPatientHierarchy(patients);
  const renderPatient = options.renderPatient;

  return hierarchy
    .map(
      (hospital) => `
        <div class="entity-group">
          <div class="entity-group-head">
            <div>
              <strong>${hospital.name}</strong>
              <div class="dim">${hospital.level}</div>
            </div>
            <span class="mini-tag">${hospital.doctors.reduce((total, doctor) => total + doctor.patients.length, 0)} 人</span>
          </div>
          <div class="entity-subgroup-list">
            ${hospital.doctors
              .map(
                (doctor) => `
                  <div class="entity-subgroup">
                    <div class="entity-subgroup-head">
                      <div>
                        <strong>${doctor.name}</strong>
                        <div class="dim">${doctor.department}</div>
                      </div>
                      <span class="mini-tag">${doctor.patients.length} 人</span>
                    </div>
                    <div class="entity-patient-list">
                      ${doctor.patients.map((patient) => renderPatient(patient, patient.id === selectedId)).join("")}
                    </div>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
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

  return state.hospitals
    .map((hospital) => {
      const hospitalPatients = patients.filter((patient) => patient.hospitalId === hospital.id);
      const patientCount = hospitalPatients.length;
      const domainCounts = Object.keys(hospitalPatients[0]?.radar ?? {}).map((domain) => ({
        domain,
        label: labelRiskDomain(domain),
        count: hospitalPatients.filter((patient) => (patient.radar?.[domain] ?? 0) >= 60).length
      }));
      const packageCounts = new Map();

      for (const patient of hospitalPatients) {
        for (const title of patient.interventionProjection.packageTitles ?? []) {
          packageCounts.set(title, (packageCounts.get(title) ?? 0) + 1);
        }
      }

      const effectiveCount = hospitalPatients.filter((patient) => {
        const before = patient.interventionProjection.beforeOverallScore;
        const after = patient.interventionProjection.afterOverallScore;
        const levelChanged = patient.interventionProjection.beforeLevel !== patient.interventionProjection.afterLevel;
        return after <= before - 8 || levelChanged;
      }).length;

      return {
        hospital,
        patientCount,
        effectiveCount,
        effectiveRate: percentage(effectiveCount, patientCount),
        diseaseRatios: domainCounts
          .filter((item) => item.count > 0)
          .sort((left, right) => right.count - left.count)
          .slice(0, 4)
          .map((item) => ({
            ...item,
            ratio: percentage(item.count, patientCount)
          })),
        packageRatios: [...packageCounts.entries()]
          .sort((left, right) => right[1] - left[1])
          .slice(0, 4)
          .map(([title, count]) => ({
            title,
            count,
            ratio: percentage(count, patientCount)
          })),
        averageBefore: patientCount
          ? Number(
              (
                hospitalPatients.reduce((total, patient) => total + patient.interventionProjection.beforeOverallScore, 0) /
                patientCount
              ).toFixed(1)
            )
          : 0,
        averageAfter: patientCount
          ? Number(
              (
                hospitalPatients.reduce((total, patient) => total + patient.interventionProjection.afterOverallScore, 0) /
                patientCount
              ).toFixed(1)
            )
          : 0
      };
    })
    .sort((left, right) => right.patientCount - left.patientCount);
}

function renderHospitalOverview() {
  const insights = computeHospitalInsights();
  const selectedHospitalId = state.filters.hospitalId || insights[0]?.hospital.id;
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

function getRoleScopedClinicians(hospitalId) {
  return state.allClinicians.filter(
    (clinician) =>
      clinician.workbenchRole === state.filters.workbenchRole &&
      (!hospitalId || clinician.hospitalIds.includes(hospitalId))
  );
}

function deriveFollowupAssignments() {
  const role = mapWorkbenchToFollowupRole(state.filters.workbenchRole);
  const patients = getCurrentPopulationPatients();

  return patients.flatMap((patient, patientIndex) => {
    const plan = patient.roleFollowupPlans.find((item) => item.role === role);
    if (!plan) return [];
    const clinicians = getRoleScopedClinicians(patient.hospitalId);
    const assignedClinician = clinicians[patientIndex % Math.max(1, clinicians.length)] ?? null;

    return plan.todoList.map((todo) => ({
      ...todo,
      patientId: patient.id,
      patientName: patient.name,
      hospitalId: patient.hospitalId,
      hospitalName: patient.hospitalName,
      clinicianName: assignedClinician?.name ?? `${labelWorkbenchRole(state.filters.workbenchRole)}待分配`,
      clinicianDepartment: assignedClinician?.department ?? plan.title,
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
      renderFollowupCenter();
    });
  });
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
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

            return `
              <article class="followup-group-card">
                <div class="followup-group-head">
                  <div>
                    <strong>${groupName}</strong>
                    <div class="dim">患者与任务已按就诊医生归集</div>
                  </div>
                  <span class="mini-tag">${items.length} 项</span>
                </div>
                <div class="entity-subgroup-list">
                  ${[...itemsByDoctor.entries()]
                    .map(
                      ([doctorKey, doctorItems]) => `
                        <div class="entity-subgroup">
                          <div class="entity-subgroup-head">
                            <div>
                              <strong>${doctorItems[0].clinicianName}</strong>
                              <div class="dim">${doctorItems[0].clinicianDepartment}</div>
                            </div>
                            <span class="mini-tag">${doctorItems.length} 项</span>
                          </div>
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
                        </div>
                      `
                    )
                    .join("")}
                </div>
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
      renderPopulation();
      renderFollowupCenter();
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
      <div class="dim">已模拟 ${cohort.patientCount} 位慢病管理对象，每位患者均生成模型预测与证据链。</div>
      <div class="stat-grid">
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
  if (hospitalOverviewGrid && hospitalDetailPanel) renderHospitalOverview();
  if (reminderCenter) renderReminderCenter();

  setElementHtml(
    populationList,
    renderHierarchicalPatientList(cohort.patients, state.populationPatientId, {
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
      renderPopulation();
      renderFollowupCenter();
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
      <div class="dim">原型锚点：${selectedPatient.anchorPatientId}，用于延展生成 100 人慢病管理仿真队列。</div>
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
  renderWorkspace();
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
  renderFollowupCenter();
});

followupStatusFilter?.addEventListener("change", () => {
  state.followupStatus = followupStatusFilter.value;
  renderFilters();
  renderFollowupCenter();
});

followupClinicianFilter?.addEventListener("change", () => {
  state.followupClinician = followupClinicianFilter.value;
  renderFollowupCenter();
});

exportFollowupsBtn?.addEventListener("click", () => {
  exportOverdueFollowups();
});

async function init() {
  const [hospitals, mappings, allClinicians, medclawOverview, ecosystemOverview, githubOverview] = await Promise.all([
    api("/api/hospitals"),
    api("/api/his/mappings"),
    api("/api/clinicians"),
    api("/api/medclaw/overview"),
    api("/api/ecosystem/overview"),
    api("/api/github-capabilities/overview")
  ]);
  state.hospitals = qixiaHospitalsOnly(hospitals);
  state.mappings = mappings;
  state.allClinicians = allClinicians.filter((clinician) => clinician.hospitalIds.some((hospitalId) => getHospitalById(hospitalId)));
  state.medclawOverview = medclawOverview;
  state.ecosystemOverview = ecosystemOverview;
  state.githubOverview = githubOverview;
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
}

init().catch((error) => {
  heroSubtitle.textContent = `加载失败：${error.message}`;
});
