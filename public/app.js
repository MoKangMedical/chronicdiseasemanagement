const appConfig = window.__APP_CONFIG__ ?? {};
const isStaticMode = appConfig.mode === "static";
const snapshotPath = appConfig.snapshotPath ?? "./demo-data/pages-snapshot.json";
let snapshotPromise = null;

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
  adapterOutput: null,
  predictionSuite: null,
  allClinicians: [],
  clinicians: [],
  activeMeetingId: null,
  filters: {
    hospitalId: "",
    workbenchRole: "health-manager"
  }
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
const adapterSummary = document.querySelector("#adapter-summary");
const predictionSummary = document.querySelector("#prediction-summary");
const patientTemplate = document.querySelector("#patient-item-template");
const runWorkflowBtn = document.querySelector("#run-workflow-btn");
const createMeetingBtn = document.querySelector("#create-meeting-btn");
const hospitalFilter = document.querySelector("#hospital-filter");
const roleFilter = document.querySelector("#role-filter");

function formatLevel(level) {
  return {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical"
  }[level] ?? level;
}

function labelWorkbenchRole(role) {
  return {
    "specialist-doctor": "专科医生",
    "general-practitioner": "全科医生",
    "health-manager": "健康管理师"
  }[role] ?? role;
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

function renderFilters() {
  hospitalFilter.innerHTML = [
    `<option value="">全部医院</option>`,
    ...state.hospitals.map((hospital) => `<option value="${hospital.id}">${hospital.name}</option>`)
  ].join("");
  hospitalFilter.value = state.filters.hospitalId;
  roleFilter.value = state.filters.workbenchRole;
}

function renderDashboard() {
  if (!state.dashboard) return;
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
  patientList.innerHTML = "";

  for (const patient of state.dashboard?.patients ?? []) {
    const node = patientTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".patient-item-name").textContent = patient.name;
    const pill = node.querySelector(".pill");
    pill.textContent = formatLevel(patient.riskLevel);
    pill.classList.add(patient.riskLevel);
    node.querySelector(".patient-item-body").textContent =
      `${patient.hospitalName} | ${patient.conditions.join(" / ")} | ${patient.topDomains.map((item) => item.label).join(" · ")}`;
    if (patient.id === state.patientId) node.classList.add("active");
    node.addEventListener("click", async () => {
      state.patientId = patient.id;
      await loadWorkspace();
    });
    patientList.append(node);
  }
}

function renderWorkspace() {
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

async function refreshDashboard() {
  const query = buildQuery(state.filters);
  const [dashboard, clinicians] = await Promise.all([
    api(`/api/dashboard${query}`),
    api(`/api/clinicians${query}`)
  ]);
  state.dashboard = dashboard;
  state.clinicians = clinicians;

  const patientIds = new Set((dashboard.patients ?? []).map((patient) => patient.id));
  if (!patientIds.has(state.patientId)) {
    state.patientId = dashboard.patients[0]?.id ?? null;
    state.activeMeetingId = null;
  }

  renderDashboard();
  renderPatients();
}

if (isStaticMode) {
  runWorkflowBtn.disabled = true;
  createMeetingBtn.disabled = true;
  runWorkflowBtn.textContent = "GitHub Pages 静态演示";
  createMeetingBtn.textContent = "只读模式";
}

runWorkflowBtn.addEventListener("click", async () => {
  if (!state.patientId) return;
  runWorkflowBtn.disabled = true;
  runWorkflowBtn.textContent = "工作流执行中...";
  try {
    await api(`/api/workflows/chronic-care/run/${state.patientId}`, { method: "POST" });
    await refreshDashboard();
    await loadWorkspace();
  } finally {
    runWorkflowBtn.disabled = false;
    runWorkflowBtn.textContent = "启动慢病工作流";
  }
});

createMeetingBtn.addEventListener("click", async () => {
  if (!state.patientId) return;
  const topic = window.prompt("请输入 MDT 会议主题", `${state.workspace.patient.name} 慢病管理 MDT 在线讨论`);
  if (!topic) return;
  await api(`/api/patients/${state.patientId}/mdt-meetings`, {
    method: "POST",
    body: JSON.stringify({ topic })
  });
  await refreshDashboard();
  await loadWorkspace();
});

hospitalFilter.addEventListener("change", async () => {
  state.filters.hospitalId = hospitalFilter.value;
  await refreshDashboard();
  await loadWorkspace();
});

roleFilter.addEventListener("change", async () => {
  state.filters.workbenchRole = roleFilter.value;
  await refreshDashboard();
  await loadWorkspace();
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
  state.hospitals = hospitals;
  state.mappings = mappings;
  state.allClinicians = allClinicians;
  state.medclawOverview = medclawOverview;
  state.ecosystemOverview = ecosystemOverview;
  state.githubOverview = githubOverview;
  renderFilters();
  renderMappings();
  await refreshDashboard();
  state.patientId = state.dashboard?.patients[0]?.id ?? null;
  await loadWorkspace();
}

init().catch((error) => {
  heroSubtitle.textContent = `加载失败：${error.message}`;
});
