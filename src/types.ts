export type RiskLevel = "low" | "medium" | "high" | "critical";

export type HospitalId =
  | "xiamen"
  | "beijing"
  | "jiangyin"
  | "qixia-hospital"
  | "jiangsu-integrated"
  | "jiangsu-tcm-zidong"
  | "njmu2-maigaoqiao"
  | "taikang-xianlin-gulou"
  | "maigaoqiao-chsc"
  | "yanziji-chsc"
  | "yaohua-chsc"
  | "maqun-chsc"
  | "xianlin-chsc"
  | "xigang-chsc"
  | "qixia-chsc"
  | "longtan-chsc"
  | "jingan-chsc"
  | "baguazhou-chsc";

export type WorkbenchRole = "specialist-doctor" | "general-practitioner" | "health-manager";

export type DiseaseDomain =
  | "cardiovascular"
  | "diabetes"
  | "dementia"
  | "respiratory"
  | "sleep"
  | "renal"
  | "metabolic";

export type ClinicianRole =
  | "case-manager"
  | "primary-physician"
  | "cardiologist"
  | "endocrinologist"
  | "neurologist"
  | "pulmonologist"
  | "dietician"
  | "exercise-therapist"
  | "sleep-coach";

export type DocumentType =
  | "intake-note"
  | "risk-assessment"
  | "mdt-tasklist"
  | "medical-plan"
  | "diet-prescription"
  | "exercise-prescription"
  | "lifestyle-prescription"
  | "sleep-prescription"
  | "care-coordination-note"
  | "mdt-meeting-summary"
  | "integrated-care-plan";

export interface ChronicCondition {
  code: string;
  name: string;
  severity: "mild" | "moderate" | "severe";
}

export interface VitalSnapshot {
  systolicBp: number;
  diastolicBp: number;
  restingHeartRate: number;
  bmi: number;
  weightKg: number;
  oxygenSaturation?: number;
}

export interface LabSnapshot {
  hba1c?: number;
  ldl?: number;
  egfr?: number;
  ntProbnp?: number;
  fastingGlucose?: number;
}

export interface LifestyleProfile {
  averageDailySteps: number;
  weeklyExerciseMinutes: number;
  averageSleepHours: number;
  dietPattern: string;
  smokingStatus: "never" | "former" | "current";
}

export interface Medication {
  name: string;
  dose: string;
  adherence: "good" | "partial" | "poor";
}

export interface EncounterSummary {
  date: string;
  department: string;
  reason: string;
  clinician?: string;
}

export interface PatientCareOwner {
  clinicianId?: string;
  name: string;
  department: string;
  role: ClinicianRole;
  title?: string;
  source: "care-team" | "encounter-derived";
}

export interface PatientProfile {
  id: string;
  hospitalId: HospitalId;
  hospitalName: string;
  mrn: string;
  name: string;
  gender: "male" | "female";
  age: number;
  chronicConditions: ChronicCondition[];
  vitals: VitalSnapshot;
  labs: LabSnapshot;
  lifestyle: LifestyleProfile;
  medications: Medication[];
  recentEncounters: EncounterSummary[];
  primaryDoctor?: PatientCareOwner | null;
  responsibleClinician?: PatientCareOwner | null;
  alerts: string[];
}

export interface HISPatientResource {
  id: string;
  hospitalId: HospitalId;
  mrn: string;
  name: string;
  gender: "male" | "female";
  birthDate: string;
  age: number;
}

export interface HISConditionResource {
  id: string;
  code: string;
  name: string;
  clinicalStatus: "active" | "resolved";
  severity: "mild" | "moderate" | "severe";
  domain: DiseaseDomain;
}

export interface HISObservationResource {
  id: string;
  category: "vital-signs" | "lab" | "lifestyle" | "cognitive" | "wearable";
  code: string;
  name: string;
  value: number | string;
  unit?: string;
  observedAt: string;
  source: string;
  interpretation?: string;
}

export interface HISMedicationResource {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  adherence: "good" | "partial" | "poor";
}

export interface HISEncounterResource {
  id: string;
  date: string;
  department: string;
  reason: string;
  clinician: string;
  encounterType: "outpatient" | "inpatient" | "follow-up";
}

export interface HISCareTeamMember {
  clinicianId: string;
  role: ClinicianRole;
  department: string;
  name: string;
}

export interface HospitalRecord {
  hospitalId: HospitalId;
  hospitalName: string;
  sourceSchema: string;
  patient: HISPatientResource;
  conditions: HISConditionResource[];
  observations: HISObservationResource[];
  medications: HISMedicationResource[];
  encounters: HISEncounterResource[];
  careTeam: HISCareTeamMember[];
  alerts: string[];
}

export interface HISPatientBundle {
  patient: PatientProfile;
  hospitalRecord: HospitalRecord;
  sourceSystems: {
    his: {
      activeVisits: number;
      primaryDoctor: string;
      nextFollowUpDate: string;
    };
    lis: {
      latestLabs: LabSnapshot;
      sampleCollectedAt: string;
    };
    vitalsPlatform: {
      latestVitals: VitalSnapshot;
      deviceSyncAt: string;
    };
    wearable: {
      averageDailySteps: number;
      averageSleepHours: number;
      syncStatus: "fresh" | "stale";
    };
    pharmacy: {
      activeMedications: Medication[];
      refillRisk: "low" | "medium" | "high";
    };
  };
}

export interface Clinician {
  id: string;
  name: string;
  role: ClinicianRole;
  workbenchRole: WorkbenchRole;
  department: string;
  title: string;
  hospitalIds: HospitalId[];
}

export interface AgentDefinition {
  id: string;
  name: string;
  role: ClinicianRole | "system";
  namespace: string;
  subscribesTo: DocumentType[];
  writes: DocumentType[];
}

export interface SharedDocumentEntry {
  id: string;
  workflowId: string;
  patientId: string;
  documentType: DocumentType;
  title: string;
  content: unknown;
  authorAgentId: string;
  authorRole: ClinicianRole | "system";
  namespace: string;
  tags: string[];
  createdAt: string;
}

export interface RoleAssignment {
  role: ClinicianRole;
  clinician: Clinician | null;
  objective: string;
}

export interface DomainRiskAssessment {
  domain: DiseaseDomain;
  label: string;
  score: number;
  level: RiskLevel;
  drivers: string[];
  suggestedRoles: ClinicianRole[];
  summary: string;
}

export interface TherapyPackage {
  kind: "exercise" | "nutrition" | "lifestyle" | "sleep";
  title: string;
  rationale: string;
  targets: string[];
  interventions: string[];
  metrics: string[];
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  drivers: string[];
  goals: string[];
  requiredRoles: ClinicianRole[];
  domainAssessments: DomainRiskAssessment[];
}

export interface MdtMessage {
  id: string;
  clinicianId: string;
  clinicianName: string;
  role: ClinicianRole;
  message: string;
  createdAt: string;
}

export interface MdtMeeting {
  id: string;
  patientId: string;
  workflowId: string | null;
  topic: string;
  status: "open" | "closed";
  participantIds: string[];
  messages: MdtMessage[];
  decision: string | null;
  followUpActions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowSummary {
  workflowId: string;
  patientId: string;
  patientName: string;
  riskLevel: RiskLevel;
  generatedDocuments: SharedDocumentEntry[];
  carePlan: SharedDocumentEntry | null;
}

export interface HospitalDescriptor {
  id: HospitalId;
  name: string;
  city: string;
  hisVendor: string;
  accent: string;
  district?: string;
  level?: string;
  category?: string;
  networkRole?: string;
  integrationStatus?: "live" | "simulated" | "planned";
  sourceNote?: string;
}

export interface HisFieldMappingRow {
  sourcePath: string;
  targetField: string;
  transform?: string;
}

export interface HisMappingPreview {
  hospitalId: HospitalId;
  hospitalName: string;
  sourceSchema: string;
  description: string;
  fieldMappings: HisFieldMappingRow[];
  sampleSource: unknown;
  sampleMapped: HospitalRecord;
}

export interface ImagingLesion {
  id: string;
  site: string;
  modality: "CT" | "MRI" | "X-ray" | "Ultrasound" | "Endoscopy";
  sizeMm: number;
  densityOrSignal: string;
  morphology: string;
  distribution: string;
  impression: string;
}

export interface ImagingReportEntry {
  id: string;
  patientId: string;
  hospitalId: HospitalId;
  studyDate: string;
  modality: ImagingLesion["modality"];
  bodyPart: string;
  narrative: string;
  interpretation: string;
  lesions: ImagingLesion[];
}

export interface ImagingComparisonFinding {
  lesionId: string;
  site: string;
  previousSizeMm: number | null;
  currentSizeMm: number;
  trend: "new" | "resolved" | "larger" | "smaller" | "stable";
  summary: string;
}

export interface ImagingComparisonResult {
  patientId: string;
  modality: ImagingLesion["modality"];
  currentStudyDate: string;
  previousStudyDate: string | null;
  findings: ImagingComparisonFinding[];
  narrativeConclusion: string;
}

export interface MedicalRecordDraft {
  patientId: string;
  encounterType: "outpatient" | "inpatient" | "progress-note";
  chiefComplaint: string;
  presentIllness: string;
  physicalExam: string;
  auxiliaryExams: string;
  assessment: string;
  diagnosis: string[];
  plan: string[];
}

export interface DiagnosticSuggestion {
  diagnosis: string;
  rationale: string[];
  confidence: number;
}

export interface ClinicalPrediction {
  metric: "disease-risk" | "length-of-stay" | "prognosis";
  value: string;
  explanation: string;
}

export interface DataPipelineOutput {
  patientId: string;
  parsedSources: string[];
  normalizedFields: string[];
  deidentifiedPreview: Record<string, string>;
  codingMappings: Array<{ source: string; code: string; system: string }>;
  researchSnapshot: Record<string, string | number>;
}

export interface ReadOnlyGuardrail {
  title: string;
  description: string;
}

export interface PermissionBoundary {
  role: WorkbenchRole;
  scopes: string[];
  restrictions: string[];
}

export interface AuditEvent {
  id: string;
  patientId: string | null;
  category:
    | "image-parse"
    | "timeline-compare"
    | "record-generate"
    | "diagnosis-assist"
    | "followup-generate"
    | "data-pipeline"
    | "policy-check";
  actor: string;
  detail: string;
  createdAt: string;
}

export interface MedClawPatientWorkspace {
  overview: {
    name: string;
    hospitalName: string;
    mission: string;
  };
  guardrails: ReadOnlyGuardrail[];
  permissionBoundary: PermissionBoundary;
  imaging: {
    reports: ImagingReportEntry[];
    comparison: ImagingComparisonResult | null;
  };
  recordDraft: MedicalRecordDraft;
  diagnosisSupport: {
    suggestions: DiagnosticSuggestion[];
    predictions: ClinicalPrediction[];
  };
  kgFollowup: KGFollowupResult;
  dataPipeline: DataPipelineOutput;
  auditTrail: AuditEvent[];
}

export interface KgConceptNode {
  id: string;
  label: string;
  type: "symptom" | "exam" | "history" | "risk" | "diagnosis";
}

export interface KgReasoningPath {
  diagnosis: string;
  path: string[];
  rationale: string;
}

export interface KgFollowupQuestion {
  question: string;
  source: "preliminary" | "ehr-kg" | "ddx" | "ddx-kg";
  clinicalIntent: string;
}

export interface KgIclExample {
  title: string;
  trigger: string;
  whyHard: string;
  takeaway: string;
}

export interface KgConsolidationSummary {
  before: number;
  after: number;
  clusters: number;
  strategy: string;
}

export interface KGFollowupResult {
  patientId: string;
  extractedEntities: string[];
  candidateDiagnoses: string[];
  ehrConcepts: string[];
  reasoningPaths: KgReasoningPath[];
  moduleBreakdown: Record<KgFollowupQuestion["source"], number>;
  activeIclExamples: KgIclExample[];
  consolidation: KgConsolidationSummary;
  questions: KgFollowupQuestion[];
}

export type PartnerType = "insurance" | "bank" | "enterprise" | "internet-health" | "event-organizer";

export interface PartnerAccount {
  id: string;
  name: string;
  type: PartnerType;
  coverageLabel: string;
  coveredLives: number;
  serviceModel: string;
  paymentLogic: string;
  activePrograms: string[];
  linkedHospitals: HospitalId[];
}

export interface AiHealthProduct {
  id: string;
  name: string;
  mode: "ai-first" | "ai-assisted" | "hybrid";
  targetUsers: string[];
  description: string;
  scenarios: string[];
}

export interface EcosystemOverview {
  brand: string;
  positioning: string;
  strategySummary: string[];
  metrics: {
    bClients: number;
    coveredUsers: number;
    partneredMedicalInstitutions: number;
    tertiaryHospitals: number;
    serviceModules: number;
    aiDrivenModules: number;
  };
  partners: PartnerAccount[];
  productMatrix: AiHealthProduct[];
  strategicDirections: string[];
}

export interface PatientEcosystemJourney {
  patientId: string;
  sponsor: PartnerAccount;
  userSegment: string;
  lifecycleStage: string[];
  activePrograms: string[];
  aiTouchpoints: string[];
  serviceModules: string[];
  offlineCoordination: string[];
  valueSignals: string[];
}

export type GithubCapabilityCategory =
  | "ehr-connectivity"
  | "fhir-middleware"
  | "disease-prediction"
  | "time-series-risk"
  | "benchmarking"
  | "patient-generated-data";

export interface GithubCapability {
  id: string;
  name: string;
  category: GithubCapabilityCategory;
  repo: string;
  repoUrl: string;
  summary: string;
  whyFit: string;
  integrationMode: "catalogued" | "adapter-ready" | "planned-runtime";
  outputs: string[];
  supportedDomains: DiseaseDomain[];
}

export interface GithubCapabilityPack {
  id: string;
  title: string;
  focus: string;
  capabilityIds: string[];
}

export interface GithubCapabilityOverview {
  searchedAt: string;
  note: string;
  capabilities: GithubCapability[];
  packs: GithubCapabilityPack[];
}

export interface PatientCapabilityPlan {
  patientId: string;
  recommendedCapabilityIds: string[];
  activatedPacks: string[];
  predictedUseCases: string[];
  integrationSteps: string[];
  riskTargets: string[];
}

export interface FhirResource {
  resourceType: string;
  id: string;
  [key: string]: unknown;
}

export interface HealthChainBundle {
  patientId: string;
  generatedAt: string;
  source: "healthchain";
  bundleType: "collection";
  resources: FhirResource[];
}

export interface HealthKitObservation {
  id: string;
  patientId: string;
  kind: "step_count" | "sleep_analysis" | "heart_rate" | "workout";
  effectiveAt: string;
  value: number | string;
  unit?: string;
  source: "healthkit";
}

export interface HealthKitFhirFeed {
  patientId: string;
  generatedAt: string;
  source: "healthkit-on-fhir";
  resources: FhirResource[];
  rawObservations: HealthKitObservation[];
}

export interface IntegratedDataAdapterOutput {
  patientId: string;
  healthChain: HealthChainBundle;
  healthKit: HealthKitFhirFeed;
  mergedSummary: {
    resourceCount: number;
    hospitalResourceCount: number;
    patientGeneratedResourceCount: number;
    coveredCategories: string[];
  };
  smart: {
    fhirBaseUrl: string;
    authorizeUrl: string;
    tokenUrl: string;
    scopes: string[];
  };
}

export type LocalPredictionProvider = "temporai" | "pyhealth" | "disease-prediction";

export interface LocalPrediction {
  provider: LocalPredictionProvider;
  task: string;
  score: number;
  level: RiskLevel;
  explanation: string;
  recommendedActions: string[];
}

export interface LocalPredictionSuite {
  patientId: string;
  generatedAt: string;
  inputSummary: {
    conditions: string[];
    alerts: string[];
    observationsUsed: string[];
  };
  featureEngineering: {
    staticFeatures: Record<string, number | string>;
    temporalSeriesPoints: number;
    temporalSignals: string[];
    textFeatureTerms: string[];
  };
  pipelines?: {
    temporai?: {
      plugin?: string;
      preprocessors?: string[];
      cohortSize?: number;
      timeSeriesRows?: number;
      timeSeriesFeatureCount?: number;
      trainedSampleIds?: string[];
      probabilityColumn?: string;
      timeToEventPlugin?: string;
      timeToEventHorizons?: number[];
      timeToEventHorizonScores?: Record<string, number>;
      timeToEventEventCount?: number;
      timeToEventCohortSize?: number;
      timeToEventFeatureCount?: number;
      timeToEventSampleIds?: string[];
      timeToEventByDomain?: Record<
        string,
        {
          sampleCount: number;
          eventCount: number;
          horizonScores: Record<string, number>;
        }
      >;
      timeToEventManifest?: string;
      score?: number | null;
      error?: string;
    };
    pyhealth?: {
      datasetName?: string;
      taskName?: string;
      model?: string;
      trainer?: string;
      batchSize?: number;
      epochs?: number;
      featureKeys?: string[];
      loss?: number;
      currentProbability?: number;
      positiveLabels?: number;
      score?: number | null;
      split?: {
        train: number;
        val: number;
        test: number;
      };
      monitor?: string;
      bestCheckpoint?: string;
      lastCheckpoint?: string;
      metricsManifest?: string;
      validationMetrics?: Record<string, number>;
      testMetrics?: Record<string, number>;
      sampleCount?: number;
      patientCount?: number;
      visitCount?: number;
      positiveLabelRate?: number;
      conditionVocabularySize?: number;
      procedureVocabularySize?: number;
      drugVocabularySize?: number;
      currentSample?: {
        conditionCount: number;
        procedureCount: number;
        drugCount: number;
        label: number;
      };
      error?: string;
    };
  };
  runtime: {
    python: string;
    packages: Record<
      string,
      {
        available: boolean;
        version?: string;
        note?: string;
      }
    >;
  };
  predictions: LocalPrediction[];
}

export type PopulationRiskVector = Record<DiseaseDomain, number>;

export interface PopulationEvidenceSource {
  id: string;
  type: "lab" | "vital" | "wearable" | "history" | "medication" | "guideline";
  title: string;
  detail: string;
  relevance: number;
}

export interface PopulationModelPrediction {
  id: string;
  model: string;
  target: string;
  horizon: string;
  score: number;
  level: RiskLevel;
  explanation: string;
  evidenceIds: string[];
}

export interface PopulationInterventionEffect {
  domain: DiseaseDomain;
  before: number;
  after: number;
  delta: number;
  reasons: string[];
}

export interface PopulationTimelineCheckpoint {
  week: 0 | 4 | 8 | 12;
  label: string;
  overallScore: number;
  overallLevel: RiskLevel;
  radar: PopulationRiskVector;
  keyChanges: string[];
}

export interface PopulationInterventionProjection {
  packageTitles: string[];
  adherenceAssumption: string;
  projectedFollowUpWindow: string;
  beforeRadar: PopulationRiskVector;
  afterRadar: PopulationRiskVector;
  beforeOverallScore: number;
  afterOverallScore: number;
  beforeLevel: RiskLevel;
  afterLevel: RiskLevel;
  domainEffects: PopulationInterventionEffect[];
  timelineCheckpoints: PopulationTimelineCheckpoint[];
  modelProjection: Array<{
    model: string;
    beforeScore: number;
    afterScore: number;
    delta: number;
  }>;
  recommendations: string[];
}

export interface PopulationCareProcessEntry {
  date: string;
  week: 0 | 4 | 8 | 12;
  weekLabel: string;
  phase: "intake" | "risk-stratification" | "package-initiation" | "follow-up" | "mdt-review" | "reassessment";
  actor: "tertiary-specialist" | "general-practitioner" | "health-manager" | "system";
  title: string;
  summary: string;
  explanation: string;
}

export interface PopulationImprovementRecord {
  week: 4 | 8 | 12;
  weekLabel: string;
  metric: string;
  before: string;
  current: string;
  trend: "improved" | "stable" | "watch";
  explanation: string;
}

export interface PopulationRoleTodo {
  title: string;
  dueLabel: string;
  status: "pending" | "at-risk" | "overdue" | "done";
  note: string;
}

export interface PopulationRoleFollowupPlan {
  role: "tertiary-specialist" | "general-practitioner" | "health-manager";
  title: string;
  focus: string[];
  followUpTasks: string[];
  supervisionTips: string[];
  todoList: PopulationRoleTodo[];
}

export interface PopulationManagedPatient {
  id: string;
  name: string;
  gender: "male" | "female";
  age: number;
  hospitalId: HospitalId;
  hospitalName: string;
  primaryDoctor?: PatientCareOwner | null;
  responsibleClinician?: PatientCareOwner | null;
  managementTier: "intensive" | "enhanced" | "routine";
  overallRiskLevel: RiskLevel;
  topDomains: DiseaseDomain[];
  radar: PopulationRiskVector;
  diagnoses: string[];
  nextFollowUpDate: string;
  recommendedPackages: string[];
  careGaps: string[];
  adherenceSummary: string;
  evidenceSources: PopulationEvidenceSource[];
  predictions: PopulationModelPrediction[];
  interventionProjection: PopulationInterventionProjection;
  careProcess: PopulationCareProcessEntry[];
  improvementRecords: PopulationImprovementRecord[];
  roleFollowupPlans: PopulationRoleFollowupPlan[];
  anchorPatientId: string;
}

export interface PopulationPublicBreakdown {
  label: string;
  count: number;
  ratio: number;
  note?: string;
}

export interface PopulationPublicIndicator {
  title: string;
  value: string;
  detail: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceDate: string;
}

export interface PopulationPublicSource {
  label: string;
  url: string;
  note: string;
}

export interface PopulationPublicAsset {
  title: string;
  value: string;
  sourceLabel: string;
  sourceUrl: string;
  usableModules: string[];
  usableFields: string[];
  integrationNote: string;
}

export interface PopulationPublicProfile {
  districtName: string;
  totalPopulation: number;
  totalPopulationLabel: string;
  totalPopulationAsOf: string;
  managedPatientCount: number;
  managedCoverageRate: number;
  sexDistribution: PopulationPublicBreakdown[];
  ageDistribution: PopulationPublicBreakdown[];
  ageHighlights: PopulationPublicIndicator[];
  healthIndicators: PopulationPublicIndicator[];
  systemUsableAssets: PopulationPublicAsset[];
  notes: string[];
  sources: PopulationPublicSource[];
}

export interface PopulationDistrictOperationsSummary {
  districtName: string;
  totalPopulation: number;
  managedPatientCount: number;
  managedCoverageRate: number;
  districtHospitalCount: number;
  activeHospitalCount: number;
  hospitalCoverageRate: number;
  primaryDoctorCoverageRate: number;
  responsibleClinicianCoverageRate: number;
  specialistDoctorCoverageRate: number;
  generalPractitionerCoverageRate: number;
  healthManagerCoverageRate: number;
}

export interface PopulationHospitalPerformance {
  rank: number;
  hospitalId: HospitalId;
  hospitalName: string;
  patientCount: number;
  highRiskCount: number;
  criticalRiskCount: number;
  intensiveManagementCount: number;
  averageRiskScore: number;
  effectiveRate: number;
  closedLoopRate: number;
  referralCount: number;
  consultationCount: number;
  mdtReviewCount: number;
  averageEvidencePerPatient: number;
  averagePatientsPerClinician: number;
  topDomains: Array<{
    domain: DiseaseDomain;
    label: string;
    count: number;
  }>;
  topPackages: Array<{
    title: string;
    count: number;
  }>;
}

export interface PopulationCoordinationFunnelStage {
  key: string;
  label: string;
  count: number;
  rate: number;
  note: string;
}

export interface PopulationCoordinationFunnel {
  totalPatients: number;
  referralSuggestedCount: number;
  referralCompletedCount: number;
  consultationCount: number;
  mdtReviewCount: number;
  closedLoopCount: number;
  closedLoopRate: number;
  stages: PopulationCoordinationFunnelStage[];
}

export interface PopulationRoleWorkload {
  role: "tertiary-specialist" | "general-practitioner" | "health-manager";
  roleLabel: string;
  clinicianCount: number;
  patientCount: number;
  pendingTaskCount: number;
  atRiskTaskCount: number;
  overdueTaskCount: number;
  doneTaskCount: number;
  averagePatientsPerClinician: number;
  pressureIndex: number;
  topClinicians: Array<{
    clinicianName: string;
    hospitalName: string;
    patientCount: number;
    overdueCount: number;
  }>;
}

export interface PopulationModelGovernanceItem {
  model: string;
  averageScore: number;
  highRiskCount: number;
  coverageRate: number;
  disagreementRate: number;
  governanceStatus: "stable" | "watch" | "investigate";
  note: string;
}

export interface PopulationModelGovernanceSummary {
  modelCount: number;
  consensusScore: number;
  disagreementRate: number;
  stableModelCount: number;
  watchModelCount: number;
  investigateModelCount: number;
  items: PopulationModelGovernanceItem[];
}

export interface PopulationCohortSnapshot {
  generatedAt: string;
  hospitalId?: HospitalId;
  hospitalLabel: string;
  patientCount: number;
  displayedPatientCount: number;
  publicProfile: PopulationPublicProfile;
  districtOperations: PopulationDistrictOperationsSummary;
  summary: {
    highRiskCount: number;
    criticalRiskCount: number;
    intensiveManagementCount: number;
    averageEvidencePerPatient: number;
    closedLoopRate: number;
  };
  hospitalPerformanceRanking: PopulationHospitalPerformance[];
  coordinationFunnel: PopulationCoordinationFunnel;
  roleWorkload: PopulationRoleWorkload[];
  modelGovernance: PopulationModelGovernanceSummary;
  referralMetrics: {
    referralSuggestedCount: number;
    referralCompletedCount: number;
    consultationCount: number;
    mdtReviewCount: number;
    closedLoopCount: number;
    closedLoopRate: number;
  };
  averageRadar: PopulationRiskVector;
  domainPrevalence: Array<{
    domain: DiseaseDomain;
    label: string;
    count: number;
  }>;
  modelDistribution: Array<{
    model: string;
    averageScore: number;
    highRiskCount: number;
  }>;
  patients: PopulationManagedPatient[];
}
