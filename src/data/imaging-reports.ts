import type { ImagingReportEntry } from "../types.js";

export const seedImagingReports: ImagingReportEntry[] = [
  {
    id: "img-chen-001",
    patientId: "patient-chen-002",
    hospitalId: "beijing",
    studyDate: "2026-02-05",
    modality: "CT",
    bodyPart: "胸部",
    narrative:
      "双肺纹理增多，右下肺后基底段可见斑片状实变影，范围约 28 mm，伴少量胸腔积液。",
    interpretation: "右下肺炎性渗出，建议结合治疗后复查。",
    lesions: [
      {
        id: "lesion-chen-lung",
        site: "右下肺后基底段",
        modality: "CT",
        sizeMm: 28,
        densityOrSignal: "实变密度",
        morphology: "斑片状",
        distribution: "局灶",
        impression: "炎性渗出影"
      }
    ]
  },
  {
    id: "img-chen-002",
    patientId: "patient-chen-002",
    hospitalId: "beijing",
    studyDate: "2026-03-18",
    modality: "CT",
    bodyPart: "胸部",
    narrative:
      "右下肺后基底段原斑片影较前明显吸收，残留条索状密度影约 14 mm，胸腔积液已消退。",
    interpretation: "右下肺病灶较前明显吸收，提示治疗有效。",
    lesions: [
      {
        id: "lesion-chen-lung",
        site: "右下肺后基底段",
        modality: "CT",
        sizeMm: 14,
        densityOrSignal: "条索样密度",
        morphology: "条索状",
        distribution: "局灶",
        impression: "吸收期残留影"
      }
    ]
  },
  {
    id: "img-li-001",
    patientId: "patient-li-003",
    hospitalId: "jiangyin",
    studyDate: "2026-01-20",
    modality: "CT",
    bodyPart: "胸部",
    narrative:
      "双肺透亮度增高，双下肺见散在小片状磨玻璃影，左下肺最大病灶约 12 mm。",
    interpretation: "慢阻肺基础上合并轻度炎症改变。",
    lesions: [
      {
        id: "lesion-li-lung",
        site: "左下肺",
        modality: "CT",
        sizeMm: 12,
        densityOrSignal: "磨玻璃密度",
        morphology: "小片状",
        distribution: "散在",
        impression: "炎性改变"
      }
    ]
  },
  {
    id: "img-li-002",
    patientId: "patient-li-003",
    hospitalId: "jiangyin",
    studyDate: "2026-03-17",
    modality: "CT",
    bodyPart: "胸部",
    narrative:
      "左下肺小片状磨玻璃影较前增大，范围约 18 mm，余双肺慢性阻塞性改变相仿。",
    interpretation: "左下肺炎性病灶较前增大，建议进一步随访。",
    lesions: [
      {
        id: "lesion-li-lung",
        site: "左下肺",
        modality: "CT",
        sizeMm: 18,
        densityOrSignal: "磨玻璃密度",
        morphology: "片状",
        distribution: "局灶",
        impression: "活动性炎性病灶"
      }
    ]
  },
  {
    id: "img-wu-001",
    patientId: "patient-wu-004",
    hospitalId: "beijing",
    studyDate: "2025-11-13",
    modality: "MRI",
    bodyPart: "颅脑",
    narrative:
      "双侧海马区轻度萎缩，侧脑室轻度扩大，未见急性梗死灶。",
    interpretation: "考虑神经退行性改变，建议结合认知评估。",
    lesions: [
      {
        id: "lesion-wu-hippocampus",
        site: "双侧海马区",
        modality: "MRI",
        sizeMm: 16,
        densityOrSignal: "T1 体积减低",
        morphology: "萎缩",
        distribution: "双侧",
        impression: "海马萎缩"
      }
    ]
  },
  {
    id: "img-wu-002",
    patientId: "patient-wu-004",
    hospitalId: "beijing",
    studyDate: "2026-03-19",
    modality: "MRI",
    bodyPart: "颅脑",
    narrative:
      "双侧海马区萎缩较前略进展，侧脑室较前轻度增宽，未见新增急性病灶。",
    interpretation: "海马萎缩较前进展，提示神经退行性改变持续。",
    lesions: [
      {
        id: "lesion-wu-hippocampus",
        site: "双侧海马区",
        modality: "MRI",
        sizeMm: 19,
        densityOrSignal: "T1 体积进一步减低",
        morphology: "萎缩",
        distribution: "双侧",
        impression: "海马萎缩进展"
      }
    ]
  }
];
