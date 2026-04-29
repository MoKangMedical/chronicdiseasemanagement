import { HISSimulator } from "../adapters/his-simulator.js";
import {
  buildPatientCapabilityPlan,
  githubCapabilities,
  githubCapabilityOverviewSeed
} from "../data/github-capabilities.js";
import type { GithubCapability, GithubCapabilityOverview, PatientCapabilityPlan } from "../types.js";

export class GithubCapabilityService {
  private readonly his = new HISSimulator();

  getOverview(): GithubCapabilityOverview {
    return githubCapabilityOverviewSeed;
  }

  listCapabilities(): GithubCapability[] {
    return githubCapabilities;
  }

  getPatientPlan(patientId: string): PatientCapabilityPlan {
    const patient = this.his.getPatient(patientId);
    const domains = patient.chronicConditions
      .map((condition) => {
        if (condition.code.startsWith("I")) return "cardiovascular";
        if (condition.code.startsWith("E11") || condition.code.startsWith("R73") || condition.code.startsWith("E66"))
          return "diabetes";
        if (condition.code.startsWith("G30")) return "dementia";
        if (condition.code.startsWith("J44")) return "respiratory";
        if (condition.code.startsWith("G47")) return "sleep";
        if (condition.code.startsWith("N18")) return "renal";
        return "metabolic";
      })
      .filter(Boolean);

    return buildPatientCapabilityPlan(patientId, domains, patient.alerts);
  }
}
