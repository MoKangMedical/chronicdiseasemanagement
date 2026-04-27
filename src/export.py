"""慢康智枢 — 导出功能模块"""
from __future__ import annotations
import json
import csv
import io
from datetime import datetime
from typing import Any, Dict, List, Optional


class ExportService:
    """数据导出服务"""

    SUPPORTED_FORMATS = ["json", "csv", "excel", "pdf"]

    def export_patient_data(self, patient: Dict[str, Any], vitals: List[Dict],
                             medications: List[Dict], format: str = "json") -> Dict[str, Any]:
        """导出患者数据"""
        data = {
            "patient_info": patient,
            "vital_signs": vitals,
            "medications": medications,
            "exported_at": datetime.utcnow().isoformat(),
        }
        if format == "json":
            return {"format": "json", "data": json.dumps(data, ensure_ascii=False, indent=2)}
        elif format == "csv":
            return {"format": "csv", "data": self._to_csv_flat(data)}
        else:
            return {"format": "json", "data": json.dumps(data, ensure_ascii=False, indent=2)}

    def export_vitals_report(self, vitals: List[Dict], format: str = "csv") -> Dict[str, Any]:
        """导出生命体征报告"""
        if not vitals:
            return {"format": format, "data": ""}
        if format == "csv":
            output = io.StringIO()
            if vitals:
                writer = csv.DictWriter(output, fieldnames=vitals[0].keys())
                writer.writeheader()
                writer.writerows(vitals)
            return {"format": "csv", "data": output.getvalue()}
        else:
            return {"format": "json", "data": json.dumps(vitals, ensure_ascii=False, indent=2)}

    def export_medication_list(self, medications: List[Dict], format: str = "csv") -> Dict[str, Any]:
        """导出用药清单"""
        if format == "csv":
            fields = ["drug_name", "dosage", "frequency", "route", "start_date", "status"]
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(medications)
            return {"format": "csv", "data": output.getvalue()}
        return {"format": "json", "data": json.dumps(medications, ensure_ascii=False, indent=2)}

    def export_alerts(self, alerts: List[Dict], format: str = "json") -> Dict[str, Any]:
        """导出预警记录"""
        if format == "csv":
            fields = ["alert_id", "patient_id", "alert_type", "level", "title", "message", "created_at"]
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(alerts)
            return {"format": "csv", "data": output.getvalue()}
        return {"format": "json", "data": json.dumps(alerts, ensure_ascii=False, indent=2)}

    def export_population_summary(self, patients: List[Dict]) -> Dict[str, Any]:
        """导出群体统计摘要"""
        total = len(patients)
        conditions = {}
        for p in patients:
            for c in p.get("chronic_conditions", []):
                conditions[c] = conditions.get(c, 0) + 1
        summary = {
            "total_patients": total,
            "condition_distribution": conditions,
            "exported_at": datetime.utcnow().isoformat(),
        }
        return {"format": "json", "data": json.dumps(summary, ensure_ascii=False, indent=2)}

    def _to_csv_flat(self, data: Dict[str, Any]) -> str:
        """将嵌套数据展平为CSV"""
        output = io.StringIO()
        flat = {}
        for key, value in data.items():
            if isinstance(value, (str, int, float, bool)):
                flat[key] = value
            elif isinstance(value, dict):
                for k, v in value.items():
                    flat[f"{key}.{k}"] = v
            elif isinstance(value, list):
                flat[key] = json.dumps(value, ensure_ascii=False)
            else:
                flat[key] = str(value)
        writer = csv.DictWriter(output, fieldnames=flat.keys())
        writer.writeheader()
        writer.writerow(flat)
        return output.getvalue()

    def get_export_history(self) -> List[Dict[str, Any]]:
        """获取导出历史（模拟）"""
        return [
            {"export_id": "exp_001", "type": "patient_data", "format": "json",
             "timestamp": "2024-01-15T10:30:00", "status": "completed"},
            {"export_id": "exp_002", "type": "vitals_report", "format": "csv",
             "timestamp": "2024-01-14T14:20:00", "status": "completed"},
        ]
