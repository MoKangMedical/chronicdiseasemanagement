import { HISSimulator } from "../adapters/his-simulator.js";
import { healthKitSeedObservations } from "../data/healthkit-seeds.js";
import { readJsonFile, resolveStoragePath, writeJsonFile } from "../lib/storage.js";
import type {
  FhirResource,
  HealthChainBundle,
  HealthKitFhirFeed,
  HealthKitObservation,
  IntegratedDataAdapterOutput
} from "../types.js";

interface AdapterDatabase {
  healthChainBundles: HealthChainBundle[];
  healthKitFeeds: HealthKitFhirFeed[];
}

export class DataAdapterService {
  private readonly his = new HISSimulator();
  private readonly storagePath = resolveStoragePath("integration-adapters.json");
  private database: AdapterDatabase;

  constructor() {
    this.database = readJsonFile<AdapterDatabase>(this.storagePath, {
      healthChainBundles: [],
      healthKitFeeds: []
    });
  }

  reset(): void {
    this.database = {
      healthChainBundles: [],
      healthKitFeeds: []
    };
    this.persist();
  }

  buildIntegratedOutput(patientId: string): IntegratedDataAdapterOutput {
    const healthChain = this.buildHealthChainBundle(patientId);
    const healthKit = this.buildHealthKitFeed(patientId);
    const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3010";

    return {
      patientId,
      healthChain,
      healthKit,
      mergedSummary: {
        resourceCount: healthChain.resources.length + healthKit.resources.length,
        hospitalResourceCount: healthChain.resources.length,
        patientGeneratedResourceCount: healthKit.resources.length,
        coveredCategories: Array.from(
          new Set([
            ...healthChain.resources.map((resource) => resource.resourceType),
            ...healthKit.resources.map((resource) => resource.resourceType)
          ])
        )
      },
      smart: {
        fhirBaseUrl: `${baseUrl}/fhir`,
        authorizeUrl: `${baseUrl}/oauth/authorize`,
        tokenUrl: `${baseUrl}/oauth/token`,
        scopes: ["launch", "patient/*.read", "patient/Observation.read"]
      }
    };
  }

  buildHealthChainBundle(patientId: string): HealthChainBundle {
    const cached = this.database.healthChainBundles.find((item) => item.patientId === patientId);
    if (cached) return cached;

    const bundle = this.his.fetchPatientBundle(patientId);
    const patient = bundle.patient;
    const resources: FhirResource[] = [
      {
        resourceType: "Patient",
        id: patient.id,
        identifier: [{ system: "urn:mrn", value: patient.mrn }],
        name: [{ text: patient.name }],
        gender: patient.gender,
        extension: [{ url: "urn:hospital", valueString: patient.hospitalName }]
      },
      ...bundle.hospitalRecord.conditions.map((condition) => ({
        resourceType: "Condition",
        id: condition.id,
        subject: { reference: `Patient/${patient.id}` },
        code: { coding: [{ system: "ICD-10", code: condition.code, display: condition.name }] },
        clinicalStatus: { text: condition.clinicalStatus }
      })),
      ...bundle.hospitalRecord.observations.map((observation) => ({
        resourceType: "Observation",
        id: observation.id,
        subject: { reference: `Patient/${patient.id}` },
        category: [{ text: observation.category }],
        code: { text: observation.name },
        effectiveDateTime: observation.observedAt,
        valueQuantity:
          typeof observation.value === "number" ? { value: observation.value, unit: observation.unit } : undefined,
        valueString: typeof observation.value === "string" ? observation.value : undefined
      })),
      ...bundle.hospitalRecord.medications.map((medication) => ({
        resourceType: "MedicationRequest",
        id: medication.id,
        subject: { reference: `Patient/${patient.id}` },
        medicationCodeableConcept: { text: medication.name },
        dosageInstruction: [{ text: `${medication.dose} ${medication.frequency}` }]
      })),
      ...bundle.hospitalRecord.encounters.map((encounter) => ({
        resourceType: "Encounter",
        id: encounter.id,
        subject: { reference: `Patient/${patient.id}` },
        period: { start: encounter.date },
        serviceType: { text: encounter.department },
        reasonCode: [{ text: encounter.reason }]
      })),
      {
        resourceType: "CareTeam",
        id: `careteam-${patient.id}`,
        subject: { reference: `Patient/${patient.id}` },
        participant: bundle.hospitalRecord.careTeam.map((member) => ({
          role: [{ text: member.role }],
          member: { display: member.name }
        }))
      }
    ];

    const next: HealthChainBundle = {
      patientId,
      generatedAt: new Date().toISOString(),
      source: "healthchain",
      bundleType: "collection",
      resources
    };

    this.database.healthChainBundles = [
      ...this.database.healthChainBundles.filter((item) => item.patientId !== patientId),
      next
    ];
    this.persist();
    return next;
  }

  buildHealthKitFeed(patientId: string): HealthKitFhirFeed {
    const cached = this.database.healthKitFeeds.find((item) => item.patientId === patientId);
    if (cached) return cached;

    const observations = healthKitSeedObservations.filter((item) => item.patientId === patientId);
    const resources: FhirResource[] = observations.map((observation) => this.mapHealthKitObservationToFhir(observation));

    const next: HealthKitFhirFeed = {
      patientId,
      generatedAt: new Date().toISOString(),
      source: "healthkit-on-fhir",
      resources,
      rawObservations: observations
    };

    this.database.healthKitFeeds = [
      ...this.database.healthKitFeeds.filter((item) => item.patientId !== patientId),
      next
    ];
    this.persist();
    return next;
  }

  private mapHealthKitObservationToFhir(observation: HealthKitObservation): FhirResource {
    return {
      resourceType: "Observation",
      id: observation.id,
      subject: { reference: `Patient/${observation.patientId}` },
      category: [{ text: "patient-generated" }],
      code: { text: observation.kind },
      effectiveDateTime: observation.effectiveAt,
      valueQuantity:
        typeof observation.value === "number" ? { value: observation.value, unit: observation.unit } : undefined,
      valueString: typeof observation.value === "string" ? observation.value : undefined,
      device: { display: "Apple Health / HealthKit" }
    };
  }

  private persist(): void {
    writeJsonFile(this.storagePath, this.database);
  }
}
