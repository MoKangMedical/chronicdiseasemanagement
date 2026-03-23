import { HISSimulator } from "../adapters/his-simulator.js";
import { buildPatientEcosystemJourney, ecosystemOverviewSeed, partnerAccounts } from "../data/ecosystem.js";
import type { EcosystemOverview, PatientEcosystemJourney, PartnerAccount } from "../types.js";

export class EcosystemService {
  private readonly his = new HISSimulator();

  getOverview(): EcosystemOverview {
    return ecosystemOverviewSeed;
  }

  listPartners(): PartnerAccount[] {
    return partnerAccounts;
  }

  getPatientJourney(patientId: string): PatientEcosystemJourney {
    const patient = this.his.getPatient(patientId);
    const journey = buildPatientEcosystemJourney(patientId);

    if (!journey) {
      return {
        patientId,
        sponsor: partnerAccounts[0],
        userSegment: `${patient.hospitalName} 默认健康管理会员`,
        lifecycleStage: ["预防", "诊疗协同", "康复管理"],
        activePrograms: ["慢病会员管理", "AI全科医生", "MDT 协作"],
        aiTouchpoints: ["AI全科医生", "AI精准就医"],
        serviceModules: ["随访提醒", "风险复评", "行为干预执行追踪"],
        offlineCoordination: ["医院门诊复查协调", "健康管理师电话随访"],
        valueSignals: ["提升服务触达率", "缩短复诊准备时间"]
      };
    }

    return journey;
  }
}
