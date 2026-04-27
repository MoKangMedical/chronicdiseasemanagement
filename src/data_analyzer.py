"""
数据分析模块 (Data Analyzer)
慢病管理平台数据统计、趋势分析、质量报告
"""

import json
import logging
import math
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from collections import defaultdict
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# ============================================================
# 数据模型
# ============================================================

@dataclass
class TrendPoint:
    """趋势数据点"""
    date: str
    value: float
    label: str = ""

    def to_dict(self) -> Dict:
        return {"date": self.date, "value": self.value, "label": self.label}


@dataclass
class AnalysisReport:
    """分析报告"""
    report_id: str
    report_type: str          # population | patient | quality | trend
    title: str
    summary: str
    metrics: Dict = field(default_factory=dict)
    charts: List[Dict] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    generated_at: str = ""

    def to_dict(self) -> Dict:
        return {
            "report_id": self.report_id,
            "report_type": self.report_type,
            "title": self.title,
            "summary": self.summary,
            "metrics": self.metrics,
            "charts": self.charts,
            "recommendations": self.recommendations,
            "generated_at": self.generated_at,
        }


# ============================================================
# 数据分析器
# ============================================================

class DataAnalyzer:
    """慢病管理数据分析器"""

    def __init__(self):
        self.records: List[Dict] = []
        self.assessments: List[Dict] = []
        self.follow_ups: List[Dict] = []
        logger.info("DataAnalyzer 初始化")

    # ----------------------------------------------------------
    # 数据导入
    # ----------------------------------------------------------

    def load_patient_records(self, records: List[Dict]) -> None:
        self.records.extend(records)

    def load_assessments(self, assessments: List[Dict]) -> None:
        self.assessments.extend(assessments)

    def load_follow_ups(self, follow_ups: List[Dict]) -> None:
        self.follow_ups.extend(follow_ups)

    # ----------------------------------------------------------
    # 人群统计
    # ----------------------------------------------------------

    def population_overview(self) -> Dict:
        """人群概览统计"""
        if not self.assessments:
            return {"error": "无评估数据"}

        # 风险分布
        risk_dist: Dict[str, int] = defaultdict(int)
        disease_dist: Dict[str, int] = defaultdict(int)
        age_groups: Dict[str, int] = defaultdict(int)
        gender_dist: Dict[str, int] = defaultdict(int)

        for a in self.assessments:
            risk_dist[a.get("risk_level", "未知")] += 1
            disease_dist[a.get("disease_name", "未知")] += 1
            age = a.get("age", 0)
            if age < 40:
                age_groups["<40岁"] += 1
            elif age < 60:
                age_groups["40-59岁"] += 1
            else:
                age_groups["≥60岁"] += 1
            gender_dist[a.get("gender", "未知")] += 1

        total = len(self.assessments)
        return {
            "total_patients": total,
            "risk_distribution": dict(risk_dist),
            "disease_distribution": dict(disease_dist),
            "age_distribution": dict(age_groups),
            "gender_distribution": dict(gender_dist),
            "high_risk_rate": round(risk_dist.get("高危", 0) / max(total, 1) * 100, 1),
        }

    # ----------------------------------------------------------
    # 趋势分析
    # ----------------------------------------------------------

    def analyze_trend(self, patient_id: str, metric: str) -> List[TrendPoint]:
        """分析单个患者的指标趋势"""
        points = []
        patient_records = [r for r in self.records if r.get("patient_id") == patient_id]
        patient_records.sort(key=lambda r: r.get("date", ""))

        for r in patient_records:
            val = r.get("metrics", {}).get(metric)
            if val is not None:
                points.append(TrendPoint(date=r.get("date", ""), value=float(val)))

        return points

    def trend_summary(self, points: List[TrendPoint]) -> Dict:
        """趋势汇总"""
        if not points:
            return {"count": 0, "trend": "无数据"}

        values = [p.value for p in points]
        avg = sum(values) / len(values)
        min_val = min(values)
        max_val = max(values)

        # 简单趋势判断
        if len(values) >= 3:
            recent_avg = sum(values[-3:]) / 3
            early_avg = sum(values[:3]) / 3
            if recent_avg > early_avg * 1.05:
                trend = "上升"
            elif recent_avg < early_avg * 0.95:
                trend = "下降"
            else:
                trend = "平稳"
        else:
            trend = "数据不足"

        return {
            "count": len(values),
            "average": round(avg, 2),
            "min": round(min_val, 2),
            "max": round(max_val, 2),
            "latest": round(values[-1], 2),
            "trend": trend,
        }

    # ----------------------------------------------------------
    # 随访质量分析
    # ----------------------------------------------------------

    def follow_up_quality(self) -> Dict:
        """随访质量指标"""
        if not self.follow_ups:
            return {"error": "无随访数据"}

        total = len(self.follow_ups)
        completed = sum(1 for f in self.follow_ups if f.get("status") == "completed")
        overdue = sum(1 for f in self.follow_ups if f.get("status") == "overdue")
        cancelled = sum(1 for f in self.follow_ups if f.get("status") == "cancelled")

        # 按时完成率
        on_time = 0
        for f in self.follow_ups:
            if f.get("status") == "completed":
                scheduled = f.get("scheduled_date", "")
                completed_at = f.get("completed_at", "")
                if scheduled and completed_at:
                    if completed_at[:10] <= scheduled:
                        on_time += 1

        return {
            "total_follow_ups": total,
            "completed": completed,
            "overdue": overdue,
            "cancelled": cancelled,
            "completion_rate": round(completed / max(total, 1) * 100, 1),
            "on_time_rate": round(on_time / max(completed, 1) * 100, 1),
            "overdue_rate": round(overdue / max(total, 1) * 100, 1),
        }

    # ----------------------------------------------------------
    # 控制率分析
    # ----------------------------------------------------------

    def control_rate_analysis(self, disease_id: str) -> Dict:
        """慢病控制率分析"""
        disease_records = [a for a in self.assessments if a.get("disease_id") == disease_id]
        if not disease_records:
            return {"disease_id": disease_id, "error": "无数据"}

        control_thresholds = {
            "hypertension": {"metric": "sbp", "target": 140},
            "diabetes": {"metric": "hba1c", "target": 7.0},
            "coronary": {"metric": "ldl", "target": 2.6},
        }

        threshold = control_thresholds.get(disease_id)
        if not threshold:
            return {"disease_id": disease_id, "error": "不支持的疾病类型"}

        total = 0
        controlled = 0
        for r in disease_records:
            val = r.get("lab_results", {}).get(threshold["metric"])
            if val is not None:
                total += 1
                if val < threshold["target"]:
                    controlled += 1

        return {
            "disease_id": disease_id,
            "total_patients": total,
            "controlled_patients": controlled,
            "control_rate": round(controlled / max(total, 1) * 100, 1),
            "target": f"{threshold['metric']} < {threshold['target']}",
        }

    # ----------------------------------------------------------
    # 综合报告
    # ----------------------------------------------------------

    def generate_report(self, report_type: str = "population") -> AnalysisReport:
        """生成分析报告"""
        now = datetime.now().isoformat()

        if report_type == "population":
            overview = self.population_overview()
            return AnalysisReport(
                report_id=f"RPT-POP-{datetime.now().strftime('%Y%m%d')}",
                report_type="population",
                title="人群管理概览报告",
                summary=f"共管理 {overview.get('total_patients', 0)} 名患者，"
                        f"高危率 {overview.get('high_risk_rate', 0)}%",
                metrics=overview,
                generated_at=now,
            )

        elif report_type == "quality":
            quality = self.follow_up_quality()
            return AnalysisReport(
                report_id=f"RPT-QLT-{datetime.now().strftime('%Y%m%d')}",
                report_type="quality",
                title="随访质量报告",
                summary=f"随访完成率 {quality.get('completion_rate', 0)}%，"
                        f"按时率 {quality.get('on_time_rate', 0)}%",
                metrics=quality,
                recommendations=self._quality_recommendations(quality),
                generated_at=now,
            )

        return AnalysisReport(
            report_id=f"RPT-UNK-{datetime.now().strftime('%Y%m%d')}",
            report_type=report_type,
            title="未知报告类型",
            summary="",
            generated_at=now,
        )

    def _quality_recommendations(self, quality: Dict) -> List[str]:
        """根据质量指标生成建议"""
        recs = []
        if quality.get("overdue_rate", 0) > 20:
            recs.append("⚠️ 逾期率过高，建议加强随访提醒机制")
        if quality.get("completion_rate", 0) < 70:
            recs.append("📋 完成率偏低，建议优化随访流程或减少随访频次")
        if quality.get("on_time_rate", 0) < 60:
            recs.append("⏰ 按时率不足，建议增加提前提醒天数")
        if not recs:
            recs.append("✅ 随访质量指标良好，继续保持")
        return recs


# ============================================================
# CLI 入口
# ============================================================

def main():
    analyzer = DataAnalyzer()
    # 模拟数据
    analyzer.load_assessments([
        {"patient_id": "P001", "disease_id": "hypertension", "disease_name": "高血压",
         "risk_level": "高危", "age": 62, "gender": "male",
         "lab_results": {"sbp": 168}},
        {"patient_id": "P002", "disease_id": "diabetes", "disease_name": "2型糖尿病",
         "risk_level": "中危", "age": 55, "gender": "female",
         "lab_results": {"hba1c": 7.5}},
    ])
    print(json.dumps(analyzer.population_overview(), ensure_ascii=False, indent=2))
    print(json.dumps(analyzer.control_rate_analysis("hypertension"), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
