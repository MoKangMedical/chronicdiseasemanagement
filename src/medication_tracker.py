"""慢康智枢 — 用药追踪模块"""
from __future__ import annotations
import uuid
from datetime import datetime, date, timedelta
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class MedicationRecord:
    """用药记录"""
    med_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str = ""
    drug_name: str = ""
    generic_name: str = ""
    dosage: str = ""
    frequency: str = ""
    route: str = "口服"
    start_date: str = ""
    end_date: str = ""
    prescribed_by: str = ""
    purpose: str = ""
    side_effects: List[str] = field(default_factory=list)
    status: str = "active"  # active / paused / discontinued
    notes: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class AdherenceLog:
    """服药依从性记录"""
    log_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    med_id: str = ""
    patient_id: str = ""
    scheduled_time: str = ""
    actual_time: str = ""
    taken: bool = False
    skipped_reason: str = ""
    recorded_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


class MedicationTracker:
    """用药追踪服务"""

    def __init__(self):
        self._medications: Dict[str, MedicationRecord] = {}
        self._logs: List[AdherenceLog] = []

    def add_medication(self, data: Dict[str, Any]) -> Dict[str, Any]:
        med = MedicationRecord(
            patient_id=data["patient_id"],
            drug_name=data["drug_name"],
            generic_name=data.get("generic_name", ""),
            dosage=data["dosage"],
            frequency=data.get("frequency", ""),
            route=data.get("route", "口服"),
            start_date=data.get("start_date", datetime.utcnow().strftime("%Y-%m-%d")),
            end_date=data.get("end_date", ""),
            prescribed_by=data.get("prescribed_by", ""),
            purpose=data.get("purpose", ""),
            side_effects=data.get("side_effects", []),
            notes=data.get("notes", ""),
        )
        self._medications[med.med_id] = med
        return asdict(med)

    def get_medications(self, patient_id: str) -> List[Dict[str, Any]]:
        return [asdict(m) for m in self._medications.values() if m.patient_id == patient_id]

    def update_medication(self, med_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        med = self._medications.get(med_id)
        if not med:
            return None
        for key in ["dosage", "frequency", "status", "notes", "end_date", "side_effects"]:
            if key in data:
                setattr(med, key, data[key])
        return asdict(med)

    def discontinue(self, med_id: str, reason: str = "") -> bool:
        med = self._medications.get(med_id)
        if not med:
            return False
        med.status = "discontinued"
        med.notes = f"停药原因: {reason}" if reason else med.notes
        return True

    def record_adherence(self, patient_id: str, med_id: str, taken: bool,
                         scheduled_time: str = "", actual_time: str = "", reason: str = "") -> Dict[str, Any]:
        log = AdherenceLog(
            med_id=med_id,
            patient_id=patient_id,
            scheduled_time=scheduled_time,
            actual_time=actual_time or datetime.utcnow().isoformat(),
            taken=taken,
            skipped_reason=reason,
        )
        self._logs.append(log)
        return asdict(log)

    def get_adherence(self, patient_id: str, med_id: str, days: int = 30) -> Dict[str, Any]:
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        relevant = [l for l in self._logs
                    if l.patient_id == patient_id and l.med_id == med_id and l.recorded_at >= cutoff]
        total = len(relevant)
        taken = sum(1 for l in relevant if l.taken)
        rate = (taken / total * 100) if total > 0 else 0.0
        return {
            "patient_id": patient_id,
            "med_id": med_id,
            "period_days": days,
            "total_records": total,
            "taken_count": taken,
            "adherence_rate": round(rate, 1),
        }

    def check_interactions(self, patient_id: str) -> List[Dict[str, Any]]:
        """简易药物相互作用检查"""
        meds = [m for m in self._medications.values()
                if m.patient_id == patient_id and m.status == "active"]
        interactions = []
        # 示例规则：华法林 + 阿司匹林
        drug_names = {m.drug_name for m in meds}
        known_pairs = [
            ("华法林", "阿司匹林", "出血风险增加", "高"),
            ("二甲双胍", "碘造影剂", "乳酸酸中毒风险", "高"),
            ("地高辛", "呋塞米", "低钾血症致地高辛中毒", "中"),
        ]
        for d1, d2, desc, severity in known_pairs:
            if d1 in drug_names and d2 in drug_names:
                interactions.append({"drug1": d1, "drug2": d2, "description": desc, "severity": severity})
        return interactions

    def get_summary(self, patient_id: str) -> Dict[str, Any]:
        meds = self.get_medications(patient_id)
        active = [m for m in meds if m["status"] == "active"]
        return {
            "total_medications": len(meds),
            "active_medications": len(active),
            "drugs": [m["drug_name"] for m in active],
        }
