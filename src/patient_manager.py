"""慢康智枢 — 患者管理模块"""
from __future__ import annotations
import uuid
from datetime import datetime, date
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class Patient:
    """患者实体"""
    patient_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    id_card: str = ""
    phone: str = ""
    gender: str = ""
    birth_date: str = ""
    blood_type: str = ""
    allergies: List[str] = field(default_factory=list)
    chronic_conditions: List[str] = field(default_factory=list)
    emergency_contact: str = ""
    emergency_phone: str = ""
    address: str = ""
    insurance_type: str = ""
    status: str = "active"
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def age(self) -> int:
        if not self.birth_date:
            return 0
        bd = datetime.strptime(self.birth_date, "%Y-%m-%d").date()
        today = date.today()
        return today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class PatientManager:
    """患者管理服务"""

    def __init__(self):
        self._patients: Dict[str, Patient] = {}

    def create_patient(self, data: Dict[str, Any]) -> Dict[str, Any]:
        patient = Patient(
            name=data["name"],
            id_card=data["id_card"],
            phone=data["phone"],
            gender=data["gender"],
            birth_date=data["birth_date"],
            blood_type=data.get("blood_type", ""),
            allergies=data.get("allergies", []),
            chronic_conditions=data.get("chronic_conditions", []),
            emergency_contact=data.get("emergency_contact", ""),
            emergency_phone=data.get("emergency_phone", ""),
            address=data.get("address", ""),
            insurance_type=data.get("insurance_type", ""),
        )
        self._patients[patient.patient_id] = patient
        return patient.to_dict()

    def get_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        patient = self._patients.get(patient_id)
        return patient.to_dict() if patient else None

    def update_patient(self, patient_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        patient = self._patients.get(patient_id)
        if not patient:
            return None
        for key in ["name", "phone", "blood_type", "allergies", "chronic_conditions",
                     "emergency_contact", "emergency_phone", "address", "insurance_type", "status"]:
            if key in data:
                setattr(patient, key, data[key])
        patient.updated_at = datetime.utcnow().isoformat()
        return patient.to_dict()

    def delete_patient(self, patient_id: str) -> bool:
        return self._patients.pop(patient_id, None) is not None

    def list_patients(self, page: int = 1, size: int = 20, keyword: str = "") -> Dict[str, Any]:
        items = list(self._patients.values())
        if keyword:
            items = [p for p in items if keyword in p.name or keyword in p.phone or keyword in p.id_card]
        total = len(items)
        start = (page - 1) * size
        page_items = [p.to_dict() for p in items[start:start + size]]
        return {"total": total, "page": page, "size": size, "items": page_items}

    def search_by_condition(self, condition: str) -> List[Dict[str, Any]]:
        return [p.to_dict() for p in self._patients.values() if condition in p.chronic_conditions]

    def get_statistics(self) -> Dict[str, Any]:
        patients = list(self._patients.values())
        gender_count = {"男": 0, "女": 0}
        condition_count: Dict[str, int] = {}
        for p in patients:
            gender_count[p.gender] = gender_count.get(p.gender, 0) + 1
            for c in p.chronic_conditions:
                condition_count[c] = condition_count.get(c, 0) + 1
        return {
            "total": len(patients),
            "gender_distribution": gender_count,
            "condition_distribution": condition_count,
        }
