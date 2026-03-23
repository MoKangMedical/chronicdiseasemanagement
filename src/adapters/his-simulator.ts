import { seedClinicians } from "../data/seeds.js";
import { hospitals } from "../data/hospitals.js";
import { seedHospitalRecords } from "../data/his-records.js";
import { buildHisMappingPreviews } from "../data/his-source-payloads.js";
import { readJsonFile, resolveStoragePath, writeJsonFile } from "../lib/storage.js";
import type {
  HisMappingPreview,
  HospitalDescriptor,
  HISObservationResource,
  HISPatientBundle,
  HospitalId,
  HospitalRecord,
  Medication,
  PatientProfile
} from "../types.js";

interface HospitalDatabase {
  records: HospitalRecord[];
}

export class HISSimulator {
  private readonly storagePath = resolveStoragePath("his-records.json");
  private database: HospitalDatabase;

  constructor() {
    this.database = readJsonFile<HospitalDatabase>(this.storagePath, {
      records: seedHospitalRecords
    });

    if (this.database.records.length === 0) {
      this.database.records = seedHospitalRecords;
      this.persist();
      return;
    }

    this.migrateLegacyRecords();
  }

  listPatients(): PatientProfile[] {
    return this.database.records.map((record) => this.mapRecordToProfile(record));
  }

  listHospitals(): HospitalDescriptor[] {
    return hospitals;
  }

  listPatientsByHospital(hospitalId?: HospitalId): PatientProfile[] {
    const records = hospitalId
      ? this.database.records.filter((record) => record.hospitalId === hospitalId)
      : this.database.records;
    return records.map((record) => this.mapRecordToProfile(record));
  }

  getMappingPreviews(): HisMappingPreview[] {
    return buildHisMappingPreviews();
  }

  getPatient(patientId: string): PatientProfile {
    return this.mapRecordToProfile(this.getRecord(patientId));
  }

  getHospitalRecord(patientId: string): HospitalRecord {
    return this.getRecord(patientId);
  }

  fetchPatientBundle(patientId: string): HISPatientBundle {
    const record = this.getRecord(patientId);
    const patient = this.mapRecordToProfile(record);
    const latestEncounter = record.encounters[0];
    const refillRisk = patient.medications.some((medication) => medication.adherence === "poor")
      ? "high"
      : patient.medications.some((medication) => medication.adherence === "partial")
        ? "medium"
        : "low";

    return {
      patient,
      hospitalRecord: record,
      sourceSystems: {
        his: {
          activeVisits: 1,
          primaryDoctor: latestEncounter?.department ?? "全科医学科",
          nextFollowUpDate: "2026-04-05"
        },
        lis: {
          latestLabs: patient.labs,
          sampleCollectedAt: this.findLatestObservation(record.observations, "lab")?.observedAt ?? "2026-03-20T08:00:00+08:00"
        },
        vitalsPlatform: {
          latestVitals: patient.vitals,
          deviceSyncAt: this.findLatestObservation(record.observations, "vital-signs")?.observedAt ?? "2026-03-21T08:30:00+08:00"
        },
        wearable: {
          averageDailySteps: patient.lifestyle.averageDailySteps,
          averageSleepHours: patient.lifestyle.averageSleepHours,
          syncStatus: "fresh"
        },
        pharmacy: {
          activeMedications: patient.medications,
          refillRisk
        }
      }
    };
  }

  assignCareTeam(patientId: string, clinicianIds: string[]): void {
    const record = this.getRecord(patientId);
    const matchedClinicians = clinicianIds
      .map((clinicianId) => seedClinicians.find((clinician) => clinician.id === clinicianId))
      .filter((clinician): clinician is (typeof seedClinicians)[number] => Boolean(clinician))
      .filter((clinician) => clinician.hospitalIds.includes(record.hospitalId));

    record.careTeam = matchedClinicians
      .map((clinician) => ({
        clinicianId: clinician.id,
        role: clinician.role,
        department: clinician.department,
        name: clinician.name
      }));
    this.persist();
  }

  private getRecord(patientId: string): HospitalRecord {
    const record = this.database.records.find((candidate) => candidate.patient.id === patientId);

    if (!record) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    return record;
  }

  private persist(): void {
    writeJsonFile(this.storagePath, this.database);
  }

  private migrateLegacyRecords(): void {
    let changed = false;

    this.database.records = this.database.records.map((record) => {
      const seed = seedHospitalRecords.find((candidate) => candidate.patient.id === record.patient.id);

      if (!seed) {
        return record;
      }

      const nextRecord: HospitalRecord = {
        ...seed,
        ...record,
        hospitalId: record.hospitalId ?? seed.hospitalId,
        hospitalName: record.hospitalName ?? seed.hospitalName,
        sourceSchema: record.sourceSchema ?? seed.sourceSchema,
        patient: {
          ...seed.patient,
          ...record.patient,
          hospitalId: record.patient.hospitalId ?? seed.patient.hospitalId
        }
      };

      if (
        nextRecord.hospitalId !== record.hospitalId ||
        nextRecord.hospitalName !== record.hospitalName ||
        nextRecord.sourceSchema !== record.sourceSchema ||
        nextRecord.patient.hospitalId !== record.patient.hospitalId
      ) {
        changed = true;
      }

      return nextRecord;
    });

    if (changed) {
      this.persist();
    }
  }

  private mapRecordToProfile(record: HospitalRecord): PatientProfile {
    const observationValue = (code: string): number | undefined => {
      const match = record.observations.find((observation) => observation.code === code);
      return typeof match?.value === "number" ? match.value : undefined;
    };

    const medications: Medication[] = record.medications.map((medication) => ({
      name: medication.name,
      dose: `${medication.dose} ${medication.frequency}`,
      adherence: medication.adherence
    }));

    return {
      id: record.patient.id,
      hospitalId: record.hospitalId,
      hospitalName: record.hospitalName,
      mrn: record.patient.mrn,
      name: record.patient.name,
      gender: record.patient.gender,
      age: record.patient.age,
      chronicConditions: record.conditions.map((condition) => ({
        code: condition.code,
        name: condition.name,
        severity: condition.severity
      })),
      vitals: {
        systolicBp: observationValue("bp-sys") ?? 0,
        diastolicBp: observationValue("bp-dia") ?? 0,
        restingHeartRate: observationValue("hr") ?? 80,
        bmi: observationValue("bmi") ?? 25,
        weightKg: observationValue("weight") ?? 65,
        oxygenSaturation: observationValue("spo2")
      },
      labs: {
        hba1c: observationValue("hba1c"),
        ldl: observationValue("ldl"),
        egfr: observationValue("egfr"),
        ntProbnp: observationValue("ntprobnp"),
        fastingGlucose: observationValue("fpg")
      },
      lifestyle: {
        averageDailySteps: observationValue("steps") ?? 0,
        weeklyExerciseMinutes: this.estimateWeeklyExerciseMinutes(observationValue("steps") ?? 0),
        averageSleepHours: observationValue("sleep-hours") ?? 0,
        dietPattern: this.inferDietPattern(record),
        smokingStatus: this.inferSmokingStatus(record)
      },
      medications,
      recentEncounters: record.encounters.map((encounter) => ({
        date: encounter.date,
        department: encounter.department,
        reason: encounter.reason
      })),
      alerts: record.alerts
    };
  }

  private estimateWeeklyExerciseMinutes(steps: number): number {
    if (steps < 2500) return 20;
    if (steps < 4000) return 50;
    if (steps < 6000) return 90;
    return 150;
  }

  private inferDietPattern(record: HospitalRecord): string {
    if (record.conditions.some((condition) => condition.domain === "diabetes")) {
      return "控糖需求明显，需限制精制碳水和夜间加餐";
    }

    if (record.conditions.some((condition) => condition.domain === "cardiovascular")) {
      return "控盐和液体管理优先";
    }

    return "需建立规律三餐与高纤维饮食结构";
  }

  private inferSmokingStatus(record: HospitalRecord): "never" | "former" | "current" {
    if (record.patient.id === "patient-li-003") {
      return "current";
    }

    if (record.patient.id === "patient-chen-002") {
      return "former";
    }

    return "never";
  }

  private findLatestObservation(
    observations: HISObservationResource[],
    category: HISObservationResource["category"]
  ): HISObservationResource | null {
    const filtered = observations.filter((observation) => observation.category === category);
    return filtered.at(-1) ?? null;
  }
}
