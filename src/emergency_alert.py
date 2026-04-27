"""慢康智枢 — 紧急预警模块"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict
from enum import Enum


class AlertLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class AlertType(str, Enum):
    VITAL_ABNORMAL = "vital_abnormal"
    MEDICATION_MISSED = "medication_missed"
    RISK_THRESHOLD = "risk_threshold"
    DEVICE_ALERT = "device_alert"
    EMERGENCY_SOS = "emergency_sos"


@dataclass
class Alert:
    alert_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str = ""
    alert_type: str = ""
    level: str = AlertLevel.INFO.value
    title: str = ""
    message: str = ""
    data: Dict[str, Any] = field(default_factory=dict)
    acknowledged: bool = False
    acknowledged_by: str = ""
    acknowledged_at: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


class EmergencyAlertService:
    """紧急预警服务"""

    # 生命体征阈值
    VITAL_THRESHOLDS = {
        "systolic_bp": {"low": 80, "high": 180, "critical_low": 70, "critical_high": 200},
        "diastolic_bp": {"low": 50, "high": 110, "critical_low": 40, "critical_high": 130},
        "heart_rate": {"low": 45, "high": 120, "critical_low": 35, "critical_high": 150},
        "blood_sugar": {"low": 3.9, "high": 16.7, "critical_low": 2.8, "critical_high": 33.3},
        "temperature": {"low": 35.5, "high": 38.5, "critical_low": 35.0, "critical_high": 40.0},
        "spo2": {"low": 90, "high": 100, "critical_low": 85, "critical_high": 101},
    }

    def __init__(self):
        self._alerts: Dict[str, Alert] = {}

    def check_vital_signs(self, patient_id: str, vitals: Dict[str, float]) -> List[Dict[str, Any]]:
        """检查生命体征并生成预警"""
        alerts = []
        for metric, value in vitals.items():
            threshold = self.VITAL_THRESHOLDS.get(metric)
            if not threshold:
                continue
            if value <= threshold["critical_low"] or value >= threshold["critical_high"]:
                alert = self._create_alert(
                    patient_id=patient_id,
                    alert_type=AlertType.VITAL_ABNORMAL.value,
                    level=AlertLevel.CRITICAL.value,
                    title=f"危急值预警：{metric}",
                    message=f"{metric}={value}，超出危急值范围",
                    data={"metric": metric, "value": value, "threshold": threshold},
                )
                alerts.append(asdict(alert))
            elif value <= threshold["low"] or value >= threshold["high"]:
                alert = self._create_alert(
                    patient_id=patient_id,
                    alert_type=AlertType.VITAL_ABNORMAL.value,
                    level=AlertLevel.WARNING.value,
                    title=f"异常值提醒：{metric}",
                    message=f"{metric}={value}，偏离正常范围",
                    data={"metric": metric, "value": value, "threshold": threshold},
                )
                alerts.append(asdict(alert))
        return alerts

    def check_missed_medication(self, patient_id: str, med_name: str, hours_overdue: float) -> Optional[Dict[str, Any]]:
        """检查漏服药物"""
        if hours_overdue < 2:
            return None
        level = AlertLevel.CRITICAL.value if hours_overdue > 12 else AlertLevel.WARNING.value
        alert = self._create_alert(
            patient_id=patient_id,
            alert_type=AlertType.MEDICATION_MISSED.value,
            level=level,
            title=f"用药提醒：{med_name}",
            message=f"{med_name}已超过{hours_overdue:.1f}小时未服用",
            data={"med_name": med_name, "hours_overdue": hours_overdue},
        )
        return asdict(alert)

    def create_emergency_sos(self, patient_id: str, location: str = "", message: str = "") -> Dict[str, Any]:
        """创建紧急SOS预警"""
        alert = self._create_alert(
            patient_id=patient_id,
            alert_type=AlertType.EMERGENCY_SOS.value,
            level=AlertLevel.EMERGENCY.value,
            title="紧急求助",
            message=message or "患者发起紧急求助",
            data={"location": location},
        )
        return asdict(alert)

    def _create_alert(self, patient_id: str, alert_type: str, level: str,
                      title: str, message: str, data: Dict[str, Any] = None) -> Alert:
        alert = Alert(
            patient_id=patient_id,
            alert_type=alert_type,
            level=level,
            title=title,
            message=message,
            data=data or {},
        )
        self._alerts[alert.alert_id] = alert
        return alert

    def get_alerts(self, patient_id: str = "", level: str = "",
                   acknowledged: Optional[bool] = None, limit: int = 50) -> List[Dict[str, Any]]:
        items = list(self._alerts.values())
        if patient_id:
            items = [a for a in items if a.patient_id == patient_id]
        if level:
            items = [a for a in items if a.level == level]
        if acknowledged is not None:
            items = [a for a in items if a.acknowledged == acknowledged]
        items.sort(key=lambda a: a.created_at, reverse=True)
        return [asdict(a) for a in items[:limit]]

    def acknowledge_alert(self, alert_id: str, by: str = "") -> Optional[Dict[str, Any]]:
        alert = self._alerts.get(alert_id)
        if not alert:
            return None
        alert.acknowledged = True
        alert.acknowledged_by = by
        alert.acknowledged_at = datetime.utcnow().isoformat()
        return asdict(alert)

    def get_patient_alert_summary(self, patient_id: str) -> Dict[str, Any]:
        alerts = [a for a in self._alerts.values() if a.patient_id == patient_id]
        by_level = {}
        for a in alerts:
            by_level[a.level] = by_level.get(a.level, 0) + 1
        unacked = sum(1 for a in alerts if not a.acknowledged)
        return {
            "patient_id": patient_id,
            "total_alerts": len(alerts),
            "unacknowledged": unacked,
            "by_level": by_level,
        }
