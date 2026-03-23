import type { HealthKitObservation } from "../types.js";

export const healthKitSeedObservations: HealthKitObservation[] = [
  {
    id: "hk-zh-steps-1",
    patientId: "patient-zhang-001",
    kind: "step_count",
    effectiveAt: "2026-03-21T20:00:00+08:00",
    value: 2840,
    unit: "count",
    source: "healthkit"
  },
  {
    id: "hk-zh-sleep-1",
    patientId: "patient-zhang-001",
    kind: "sleep_analysis",
    effectiveAt: "2026-03-21T07:00:00+08:00",
    value: 5.7,
    unit: "h",
    source: "healthkit"
  },
  {
    id: "hk-ch-steps-1",
    patientId: "patient-chen-002",
    kind: "step_count",
    effectiveAt: "2026-03-21T20:00:00+08:00",
    value: 1930,
    unit: "count",
    source: "healthkit"
  },
  {
    id: "hk-ch-hr-1",
    patientId: "patient-chen-002",
    kind: "heart_rate",
    effectiveAt: "2026-03-21T08:00:00+08:00",
    value: 91,
    unit: "bpm",
    source: "healthkit"
  },
  {
    id: "hk-li-sleep-1",
    patientId: "patient-li-003",
    kind: "sleep_analysis",
    effectiveAt: "2026-03-21T07:00:00+08:00",
    value: 5.0,
    unit: "h",
    source: "healthkit"
  },
  {
    id: "hk-li-workout-1",
    patientId: "patient-li-003",
    kind: "workout",
    effectiveAt: "2026-03-20T18:30:00+08:00",
    value: "中等强度步行 22 分钟",
    source: "healthkit"
  },
  {
    id: "hk-wu-steps-1",
    patientId: "patient-wu-004",
    kind: "step_count",
    effectiveAt: "2026-03-21T20:00:00+08:00",
    value: 2360,
    unit: "count",
    source: "healthkit"
  },
  {
    id: "hk-wu-sleep-1",
    patientId: "patient-wu-004",
    kind: "sleep_analysis",
    effectiveAt: "2026-03-21T07:00:00+08:00",
    value: 4.8,
    unit: "h",
    source: "healthkit"
  }
];
