"""慢康智枢 — 家属联动模块"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class FamilyMember:
    """家属成员"""
    link_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str = ""
    name: str = ""
    phone: str = ""
    relationship: str = ""  # 配偶/子女/父母/其他
    is_primary: bool = False
    notify_vital_alert: bool = True
    notify_medication_alert: bool = True
    notify_emergency: bool = True
    notify_follow_up: bool = False
    status: str = "active"
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


class FamilyLinkService:
    """家属联动服务"""

    def __init__(self):
        self._links: Dict[str, FamilyMember] = {}

    def add_family_member(self, data: Dict[str, Any]) -> Dict[str, Any]:
        member = FamilyMember(
            patient_id=data["patient_id"],
            name=data["name"],
            phone=data["phone"],
            relationship=data.get("relationship", ""),
            is_primary=data.get("is_primary", False),
            notify_vital_alert=data.get("notify_vital_alert", True),
            notify_medication_alert=data.get("notify_medication_alert", True),
            notify_emergency=data.get("notify_emergency", True),
            notify_follow_up=data.get("notify_follow_up", False),
        )
        if member.is_primary:
            for m in self._links.values():
                if m.patient_id == member.patient_id and m.is_primary:
                    m.is_primary = False
        self._links[member.link_id] = member
        return asdict(member)

    def get_family_members(self, patient_id: str) -> List[Dict[str, Any]]:
        return [asdict(m) for m in self._links.values() if m.patient_id == patient_id]

    def update_notification_settings(self, link_id: str, settings: Dict[str, bool]) -> Optional[Dict[str, Any]]:
        member = self._links.get(link_id)
        if not member:
            return None
        for key in ["notify_vital_alert", "notify_medication_alert", "notify_emergency", "notify_follow_up"]:
            if key in settings:
                setattr(member, key, settings[key])
        return asdict(member)

    def remove_family_member(self, link_id: str) -> bool:
        return self._links.pop(link_id, None) is not None

    def get_notification_recipients(self, patient_id: str, alert_type: str) -> List[Dict[str, str]]:
        """根据预警类型获取应通知的家属列表"""
        type_map = {
            "vital": "notify_vital_alert",
            "medication": "notify_medication_alert",
            "emergency": "notify_emergency",
            "follow_up": "notify_follow_up",
        }
        attr = type_map.get(alert_type, "notify_emergency")
        recipients = []
        for m in self._links.values():
            if m.patient_id == patient_id and m.status == "active" and getattr(m, attr, False):
                recipients.append({"name": m.name, "phone": m.phone, "relationship": m.relationship})
        return recipients

    def get_family_health_view(self, patient_id: str) -> Dict[str, Any]:
        """生成家属健康视图（脱敏）"""
        members = self.get_family_members(patient_id)
        return {
            "patient_id": patient_id,
            "family_members_count": len(members),
            "primary_contact": next((m["name"] for m in members if m["is_primary"]), ""),
            "notification_enabled": any(m["notify_emergency"] for m in members),
        }

    def generate_family_report(self, patient_id: str, health_data: Dict[str, Any]) -> Dict[str, Any]:
        """生成给家属的健康简报"""
        return {
            "patient_id": patient_id,
            "report_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "health_status": health_data.get("status", "正常"),
            "latest_vitals": {
                k: v for k, v in health_data.get("vitals", {}).items()
                if k in ["blood_sugar", "systolic_bp", "diastolic_bp"]
            },
            "medication_adherence": health_data.get("adherence_rate", "N/A"),
            "next_follow_up": health_data.get("next_follow_up", ""),
            "alerts_count": health_data.get("alerts_count", 0),
            "message": "请关注患者健康状况，如有异常请及时联系医生",
        }
