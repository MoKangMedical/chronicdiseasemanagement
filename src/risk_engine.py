"""
风险评估引擎 (Risk Engine)
基于疾病模型的多维度风险评分与分层管理
"""

import json
import logging
import math
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# ============================================================
# 数据模型
# ============================================================

@dataclass
class PatientProfile:
    """患者档案"""
    patient_id: str
    name: str
    age: int
    gender: str               # male / female
    disease_id: str           # 对应 disease-models.json 中的 id
    risk_factors: Dict = field(default_factory=dict)  # 因子名称 -> 值
    lab_results: Dict = field(default_factory=dict)   # 检验指标 -> 数值
    vitals: Dict = field(default_factory=dict)        # 生命体征
    medications: List[str] = field(default_factory=list)
    comorbidities: List[str] = field(default_factory=list)
    lifestyle: Dict = field(default_factory=dict)     # smoking, drinking, exercise...


@dataclass
class RiskAssessment:
    """风险评估结果"""
    patient_id: str
    disease_id: str
    disease_name: str
    risk_score: float         # 0-100 综合评分
    risk_level: str           # 低危 / 中危 / 高危
    risk_factors_detail: List[Dict] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    assessment_time: str = ""
    confidence: float = 0.0

    def to_dict(self) -> Dict:
        return {
            "patient_id": self.patient_id,
            "disease_id": self.disease_id,
            "disease_name": self.disease_name,
            "risk_score": round(self.risk_score, 1),
            "risk_level": self.risk_level,
            "risk_factors_detail": self.risk_factors_detail,
            "recommendations": self.recommendations,
            "assessment_time": self.assessment_time,
            "confidence": round(self.confidence, 2),
        }


# ============================================================
# 风险评估引擎
# ============================================================

class RiskEngine:
    """多疾病风险评估引擎"""

    def __init__(self, disease_models_path: Optional[str] = None):
        self.disease_models: Dict[str, Dict] = {}
        if disease_models_path:
            self.load_models(disease_models_path)
        logger.info(f"RiskEngine 初始化完成: {len(self.disease_models)} 疾病模型")

    def load_models(self, path: str) -> None:
        """加载疾病模型"""
        with open(path, "r", encoding="utf-8") as f:
            models = json.load(f)
        for m in models:
            self.disease_models[m["id"]] = m
        logger.info(f"已加载疾病模型: {list(self.disease_models.keys())}")

    # ----------------------------------------------------------
    # 因子评分（各疾病特化）
    # ----------------------------------------------------------

    def _score_hypertension(self, profile: PatientProfile) -> Tuple[float, List[Dict]]:
        """高血压风险评分"""
        details = []
        score = 0.0

        # 血压值
        sbp = profile.vitals.get("sbp") or profile.vitals.get("systolic")
        dbp = profile.vitals.get("dbp") or profile.vitals.get("diastolic")
        if sbp:
            if sbp >= 180 or (dbp and dbp >= 110):
                score += 40
                details.append({"factor": "血压", "value": f"{sbp}/{dbp}", "impact": 40, "level": "高危"})
            elif sbp >= 160 or (dbp and dbp >= 100):
                score += 25
                details.append({"factor": "血压", "value": f"{sbp}/{dbp}", "impact": 25, "level": "中危"})
            elif sbp >= 140 or (dbp and dbp >= 90):
                score += 15
                details.append({"factor": "血压", "value": f"{sbp}/{dbp}", "impact": 15, "level": "低危"})

        # BMI
        bmi = profile.vitals.get("bmi")
        if bmi:
            if bmi >= 28:
                score += 15
                details.append({"factor": "BMI", "value": bmi, "impact": 15, "level": "肥胖"})
            elif bmi >= 24:
                score += 8
                details.append({"factor": "BMI", "value": bmi, "impact": 8, "level": "超重"})

        # 钠盐摄入
        sodium = profile.lifestyle.get("sodium_intake")
        if sodium == "high":
            score += 10
            details.append({"factor": "高钠饮食", "value": "高", "impact": 10, "level": "风险"})

        # 吸烟
        if profile.lifestyle.get("smoking"):
            score += 10
            details.append({"factor": "吸烟", "value": "是", "impact": 10, "level": "风险"})

        # 年龄
        if profile.age >= 65:
            score += 10
            details.append({"factor": "年龄", "value": profile.age, "impact": 10, "level": "高龄"})
        elif profile.age >= 55:
            score += 5
            details.append({"factor": "年龄", "value": profile.age, "impact": 5, "level": "中年"})

        # 家族史
        if profile.risk_factors.get("family_history"):
            score += 10
            details.append({"factor": "家族史", "value": "有", "impact": 10, "level": "风险"})

        return min(score, 100), details

    def _score_diabetes(self, profile: PatientProfile) -> Tuple[float, List[Dict]]:
        """2型糖尿病风险评分"""
        details = []
        score = 0.0

        # HbA1c
        hba1c = profile.lab_results.get("hba1c")
        if hba1c:
            if hba1c > 9:
                score += 40
                details.append({"factor": "HbA1c", "value": hba1c, "impact": 40, "level": "高危"})
            elif hba1c > 7:
                score += 25
                details.append({"factor": "HbA1c", "value": hba1c, "impact": 25, "level": "中危"})
            elif hba1c > 6.5:
                score += 10
                details.append({"factor": "HbA1c", "value": hba1c, "impact": 10, "level": "偏高"})

        # 空腹血糖
        fpg = profile.lab_results.get("fpg") or profile.lab_results.get("fasting_glucose")
        if fpg:
            if fpg >= 11.1:
                score += 20
                details.append({"factor": "空腹血糖", "value": fpg, "impact": 20, "level": "高危"})
            elif fpg >= 7.0:
                score += 12
                details.append({"factor": "空腹血糖", "value": fpg, "impact": 12, "level": "中危"})

        # BMI
        bmi = profile.vitals.get("bmi")
        if bmi and bmi >= 28:
            score += 12
            details.append({"factor": "BMI", "value": bmi, "impact": 12, "level": "肥胖"})

        # 家族史
        if profile.risk_factors.get("family_history"):
            score += 10
            details.append({"factor": "家族史", "value": "有", "impact": 10, "level": "风险"})

        # 缺乏运动
        if profile.lifestyle.get("exercise") == "sedentary":
            score += 8
            details.append({"factor": "缺乏运动", "value": "久坐", "impact": 8, "level": "风险"})

        return min(score, 100), details

    def _score_coronary(self, profile: PatientProfile) -> Tuple[float, List[Dict]]:
        """冠心病风险评分"""
        details = []
        score = 0.0

        # 高血压病史
        if "hypertension" in profile.comorbidities:
            score += 15
            details.append({"factor": "高血压", "value": "有", "impact": 15, "level": "共病"})

        # 糖尿病
        if "diabetes" in profile.comorbidities:
            score += 15
            details.append({"factor": "糖尿病", "value": "有", "impact": 15, "level": "共病"})

        # 血脂
        ldl = profile.lab_results.get("ldl")
        if ldl:
            if ldl >= 4.1:
                score += 15
                details.append({"factor": "LDL-C", "value": ldl, "impact": 15, "level": "高危"})
            elif ldl >= 3.4:
                score += 8
                details.append({"factor": "LDL-C", "value": ldl, "impact": 8, "level": "偏高"})

        # 吸烟
        if profile.lifestyle.get("smoking"):
            score += 12
            details.append({"factor": "吸烟", "value": "是", "impact": 12, "level": "风险"})

        # 年龄+性别
        age_risk = 0
        if profile.gender == "male" and profile.age >= 55:
            age_risk = 10
        elif profile.gender == "female" and profile.age >= 65:
            age_risk = 10
        elif profile.age >= 45:
            age_risk = 5
        if age_risk:
            score += age_risk
            details.append({"factor": "年龄/性别", "value": f"{profile.age}/{profile.gender}", "impact": age_risk, "level": "风险"})

        # BMI
        bmi = profile.vitals.get("bmi")
        if bmi and bmi >= 28:
            score += 8
            details.append({"factor": "肥胖", "value": bmi, "impact": 8, "level": "风险"})

        return min(score, 100), details

    def _score_generic(self, profile: PatientProfile, model: Dict) -> Tuple[float, List[Dict]]:
        """通用评分（基于 risk_factors 匹配）"""
        details = []
        score = 0.0
        model_factors = set(model.get("risk_factors", []))

        for factor_name, factor_val in profile.risk_factors.items():
            if factor_name in model_factors and factor_val:
                impact = 100 // max(len(model_factors), 1)
                score += impact
                details.append({"factor": factor_name, "value": str(factor_val), "impact": impact, "level": "风险"})

        # 归一化到 100
        return min(score, 100), details

    # ----------------------------------------------------------
    # 风险分层
    # ----------------------------------------------------------

    def _determine_level(self, score: float, model: Dict) -> str:
        """根据分数和模型确定风险等级"""
        levels = model.get("risk_levels", [])
        if not levels:
            if score >= 60:
                return "高危"
            elif score >= 30:
                return "中危"
            else:
                return "低危"
        # 按分数区间映射（简化：等分）
        step = 100 / len(levels)
        idx = min(int(score / step), len(levels) - 1)
        return levels[idx].get("level", f"等级{idx+1}")

    # ----------------------------------------------------------
    # 综合评估
    # ----------------------------------------------------------

    def assess(self, profile: PatientProfile) -> RiskAssessment:
        """对患者进行风险评估"""
        model = self.disease_models.get(profile.disease_id)
        if not model:
            return RiskAssessment(
                patient_id=profile.patient_id,
                disease_id=profile.disease_id,
                disease_name="未知",
                risk_score=0,
                risk_level="未知",
                assessment_time=datetime.now().isoformat(),
                confidence=0.0,
            )

        # 选择评分策略
        scorers = {
            "hypertension": self._score_hypertension,
            "diabetes": self._score_diabetes,
            "coronary": self._score_coronary,
        }
        scorer = scorers.get(profile.disease_id)
        if scorer:
            score, details = scorer(profile)
        else:
            score, details = self._score_generic(profile, model)

        risk_level = self._determine_level(score, model)

        # 生成建议
        recommendations = self._generate_recommendations(profile, model, risk_level, details)

        return RiskAssessment(
            patient_id=profile.patient_id,
            disease_id=profile.disease_id,
            disease_name=model.get("name", profile.disease_id),
            risk_score=score,
            risk_level=risk_level,
            risk_factors_detail=details,
            recommendations=recommendations,
            assessment_time=datetime.now().isoformat(),
            confidence=0.85,
        )

    def _generate_recommendations(self, profile: PatientProfile, model: Dict,
                                   risk_level: str, details: List[Dict]) -> List[str]:
        """根据评估结果生成干预建议"""
        recs = list(model.get("intervention_rules", []))

        # 根据具体因子追加建议
        factor_set = {d["factor"] for d in details}
        if "吸烟" in factor_set:
            recs.append("⚠️ 强烈建议戒烟")
        if "BMI" in factor_set or "肥胖" in factor_set:
            recs.append("📉 控制体重，目标 BMI < 24")
        if "高钠饮食" in factor_set:
            recs.append("🧂 限盐，每日 < 5g")
        if risk_level == "高危":
            recs.append("🏥 建议尽快专科就诊")
            recs.append("📋 缩短随访周期至 1-2 周")
        elif risk_level == "中危":
            recs.append("📅 定期随访，周期 2-4 周")

        return recs

    # ----------------------------------------------------------
    # 批量评估
    # ----------------------------------------------------------

    def assess_batch(self, profiles: List[PatientProfile]) -> List[RiskAssessment]:
        """批量评估"""
        results = []
        for p in profiles:
            results.append(self.assess(p))
        logger.info(f"批量评估完成: {len(results)} 人")
        return results

    # ----------------------------------------------------------
    # 群体统计
    # ----------------------------------------------------------

    def population_summary(self, assessments: List[RiskAssessment]) -> Dict:
        """群体风险分布统计"""
        level_counts: Dict[str, int] = {}
        disease_counts: Dict[str, int] = {}
        total_score = 0.0

        for a in assessments:
            level_counts[a.risk_level] = level_counts.get(a.risk_level, 0) + 1
            disease_counts[a.disease_name] = disease_counts.get(a.disease_name, 0) + 1
            total_score += a.risk_score

        return {
            "total_patients": len(assessments),
            "avg_risk_score": round(total_score / max(len(assessments), 1), 1),
            "risk_level_distribution": level_counts,
            "disease_distribution": disease_counts,
        }


# ============================================================
# CLI 入口
# ============================================================

def main():
    """演示"""
    base = Path(__file__).parent.parent / "data"
    engine = RiskEngine(str(base / "disease-models.json"))

    # 示例患者
    patient = PatientProfile(
        patient_id="P001",
        name="张三",
        age=62,
        gender="male",
        disease_id="hypertension",
        risk_factors={"family_history": True},
        vitals={"sbp": 168, "dbp": 102, "bmi": 27.5},
        lifestyle={"smoking": True, "sodium_intake": "high"},
        comorbidities=["diabetes"],
    )
    result = engine.assess(patient)
    print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
