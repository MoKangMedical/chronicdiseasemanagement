"""慢康智枢 — 报告生成模块"""
from __future__ import annotations
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import json


class ReportGenerator:
    """健康报告生成服务"""

    def generate_patient_report(self, patient: Dict[str, Any], vitals: List[Dict],
                                 medications: List[Dict], risk: Dict) -> Dict[str, Any]:
        """生成患者综合健康报告"""
        report = {
            "report_type": "patient_comprehensive",
            "generated_at": datetime.utcnow().isoformat(),
            "patient_info": {
                "name": patient.get("name", ""),
                "age": patient.get("age", 0),
                "gender": patient.get("gender", ""),
                "chronic_conditions": patient.get("chronic_conditions", []),
            },
            "vital_signs_summary": self._summarize_vitals(vitals),
            "medication_summary": self._summarize_medications(medications),
            "risk_assessment": risk,
            "recommendations": self._generate_recommendations(patient, risk),
        }
        return report

    def generate_monthly_report(self, patient_id: str, month: str,
                                 daily_records: List[Dict]) -> Dict[str, Any]:
        """生成月度报告"""
        if not daily_records:
            return {"error": "无数据"}

        # 汇总指标
        metrics = {}
        for record in daily_records:
            for key, val in record.items():
                if isinstance(val, (int, float)):
                    metrics.setdefault(key, []).append(val)

        summaries = {}
        for key, vals in metrics.items():
            summaries[key] = {
                "avg": round(sum(vals) / len(vals), 2),
                "min": min(vals),
                "max": max(vals),
                "count": len(vals),
            }

        return {
            "report_type": "monthly",
            "patient_id": patient_id,
            "month": month,
            "generated_at": datetime.utcnow().isoformat(),
            "data_days": len(daily_records),
            "metric_summaries": summaries,
            "trends": self._analyze_trends(daily_records),
        }

    def generate_follow_up_report(self, follow_up: Dict, patient: Dict) -> Dict[str, Any]:
        """生成随访报告"""
        return {
            "report_type": "follow_up",
            "generated_at": datetime.utcnow().isoformat(),
            "patient_name": patient.get("name", ""),
            "follow_up_date": follow_up.get("date", ""),
            "follow_up_type": follow_up.get("type", ""),
            "findings": follow_up.get("findings", ""),
            "vitals_recorded": follow_up.get("vitals", {}),
            "medication_changes": follow_up.get("medication_changes", []),
            "next_follow_up": follow_up.get("next_date", ""),
            "doctor_notes": follow_up.get("notes", ""),
        }

    def generate_population_report(self, patients: List[Dict]) -> Dict[str, Any]:
        """生成群体统计报告"""
        total = len(patients)
        if total == 0:
            return {"total": 0}

        conditions: Dict[str, int] = {}
        age_groups = {"<40": 0, "40-60": 0, "60-80": 0, ">80": 0}
        gender_dist = {"男": 0, "女": 0}

        for p in patients:
            gender_dist[p.get("gender", "")] = gender_dist.get(p.get("gender", ""), 0) + 1
            age = p.get("age", 0)
            if age < 40:
                age_groups["<40"] += 1
            elif age < 60:
                age_groups["40-60"] += 1
            elif age < 80:
                age_groups["60-80"] += 1
            else:
                age_groups[">80"] += 1
            for c in p.get("chronic_conditions", []):
                conditions[c] = conditions.get(c, 0) + 1

        return {
            "report_type": "population",
            "generated_at": datetime.utcnow().isoformat(),
            "total_patients": total,
            "gender_distribution": gender_dist,
            "age_distribution": age_groups,
            "condition_distribution": dict(sorted(conditions.items(), key=lambda x: -x[1])),
        }

    def _summarize_vitals(self, vitals: List[Dict]) -> Dict[str, Any]:
        if not vitals:
            return {}
        latest = vitals[-1] if vitals else {}
        summary = {"latest_record": latest, "total_records": len(vitals)}
        for key in ["systolic_bp", "diastolic_bp", "blood_sugar", "heart_rate"]:
            vals = [v.get(key) for v in vitals if v.get(key) is not None]
            if vals:
                summary[f"{key}_avg"] = round(sum(vals) / len(vals), 1)
                summary[f"{key}_min"] = min(vals)
                summary[f"{key}_max"] = max(vals)
        return summary

    def _summarize_medications(self, medications: List[Dict]) -> Dict[str, Any]:
        active = [m for m in medications if m.get("status") == "active"]
        return {
            "total": len(medications),
            "active": len(active),
            "drug_list": [m.get("drug_name", "") for m in active],
        }

    def _generate_recommendations(self, patient: Dict, risk: Dict) -> List[str]:
        recs = []
        risk_level = risk.get("level", "low")
        if risk_level in ("high", "critical"):
            recs.append("建议增加随访频率，每2周随访一次")
        if "糖尿病" in patient.get("chronic_conditions", []):
            recs.append("定期监测糖化血红蛋白，建议每3个月一次")
        if "高血压" in patient.get("chronic_conditions", []):
            recs.append("坚持每日血压监测，记录早晚血压值")
        recs.append("保持健康生活方式，适量运动，均衡饮食")
        return recs

    def _analyze_trends(self, records: List[Dict]) -> Dict[str, str]:
        trends = {}
        if len(records) < 7:
            return trends
        for key in ["blood_sugar", "systolic_bp", "diastolic_bp"]:
            vals = [r.get(key) for r in records if r.get(key) is not None]
            if len(vals) < 7:
                continue
            first_half = sum(vals[:len(vals)//2]) / (len(vals)//2)
            second_half = sum(vals[len(vals)//2:]) / (len(vals) - len(vals)//2)
            diff_pct = (second_half - first_half) / first_half * 100
            if diff_pct > 5:
                trends[key] = "上升趋势"
            elif diff_pct < -5:
                trends[key] = "下降趋势"
            else:
                trends[key] = "稳定"
        return trends
