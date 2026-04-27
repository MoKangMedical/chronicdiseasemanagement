"""慢康智枢 — 通知服务模块"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict
from enum import Enum


class NotificationChannel(str, Enum):
    SMS = "sms"
    WECHAT = "wechat"
    APP_PUSH = "app_push"
    EMAIL = "email"
    VOICE = "voice"


class NotificationType(str, Enum):
    MEDICATION_REMINDER = "medication_reminder"
    FOLLOW_UP_REMINDER = "follow_up_reminder"
    VITAL_ALERT = "vital_alert"
    EMERGENCY = "emergency"
    HEALTH_TIP = "health_tip"
    REPORT_READY = "report_ready"
    APPOINTMENT = "appointment"


@dataclass
class Notification:
    notification_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str = ""
    channel: str = NotificationChannel.SMS.value
    notification_type: str = NotificationType.MEDICATION_REMINDER.value
    title: str = ""
    content: str = ""
    data: Dict[str, Any] = field(default_factory=dict)
    status: str = "pending"  # pending / sent / delivered / failed / read
    sent_at: str = ""
    delivered_at: str = ""
    read_at: str = ""
    retry_count: int = 0
    error_message: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


class NotificationService:
    """通知服务"""

    # 通知模板
    TEMPLATES = {
        NotificationType.MEDICATION_REMINDER.value: {
            "title": "用药提醒",
            "template": "亲爱的{patient_name}，该服用{drug_name}了（{dosage}），请及时用药。",
        },
        NotificationType.FOLLOW_UP_REMINDER.value: {
            "title": "随访提醒",
            "template": "亲爱的{patient_name}，您有一场{follow_up_type}随访，时间：{date}，请及时就诊。",
        },
        NotificationType.VITAL_ALERT.value: {
            "title": "健康预警",
            "template": "亲爱的{patient_name}，您的{metric}值为{value}，偏离正常范围，请注意监测。",
        },
        NotificationType.EMERGENCY.value: {
            "title": "紧急通知",
            "template": "紧急：{patient_name}的{metric}出现危急值（{value}），请立即处理！",
        },
        NotificationType.HEALTH_TIP.value: {
            "title": "健康小贴士",
            "template": "{tip_content}",
        },
        NotificationType.REPORT_READY.value: {
            "title": "报告已生成",
            "template": "亲爱的{patient_name}，您的{report_type}报告已生成，请查看。",
        },
    }

    def __init__(self):
        self._notifications: Dict[str, Notification] = {}
        self._subscriptions: Dict[str, List[str]] = {}  # patient_id -> [channels]

    def send_notification(self, patient_id: str, notification_type: str,
                          channel: str = "sms", params: Dict[str, str] = None) -> Dict[str, Any]:
        """发送通知"""
        template = self.TEMPLATES.get(notification_type, {})
        title = template.get("title", "系统通知")
        content = template.get("template", "").format(**(params or {}))

        notification = Notification(
            patient_id=patient_id,
            channel=channel,
            notification_type=notification_type,
            title=title,
            content=content,
            data=params or {},
        )
        # 模拟发送
        notification.status = "sent"
        notification.sent_at = datetime.utcnow().isoformat()
        self._notifications[notification.notification_id] = notification
        return asdict(notification)

    def send_medication_reminder(self, patient_id: str, patient_name: str,
                                  drug_name: str, dosage: str, channel: str = "sms") -> Dict[str, Any]:
        return self.send_notification(
            patient_id=patient_id,
            notification_type=NotificationType.MEDICATION_REMINDER.value,
            channel=channel,
            params={"patient_name": patient_name, "drug_name": drug_name, "dosage": dosage},
        )

    def send_vital_alert(self, patient_id: str, patient_name: str,
                          metric: str, value: str, channel: str = "sms") -> Dict[str, Any]:
        ntype = NotificationType.EMERGENCY.value if "危急" in metric else NotificationType.VITAL_ALERT.value
        return self.send_notification(
            patient_id=patient_id,
            notification_type=ntype,
            channel=channel,
            params={"patient_name": patient_name, "metric": metric, "value": value},
        )

    def send_follow_up_reminder(self, patient_id: str, patient_name: str,
                                 follow_up_type: str, date: str, channel: str = "sms") -> Dict[str, Any]:
        return self.send_notification(
            patient_id=patient_id,
            notification_type=NotificationType.FOLLOW_UP_REMINDER.value,
            channel=channel,
            params={"patient_name": patient_name, "follow_up_type": follow_up_type, "date": date},
        )

    def send_batch(self, patient_ids: List[str], notification_type: str,
                   channel: str = "sms", params: Dict[str, str] = None) -> Dict[str, Any]:
        """批量发送"""
        results = []
        for pid in patient_ids:
            result = self.send_notification(pid, notification_type, channel, params)
            results.append(result)
        sent = sum(1 for r in results if r["status"] == "sent")
        return {"total": len(results), "sent": sent, "failed": len(results) - sent}

    def get_patient_notifications(self, patient_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        notifs = [n for n in self._notifications.values() if n.patient_id == patient_id]
        notifs.sort(key=lambda n: n.created_at, reverse=True)
        return [asdict(n) for n in notifs[:limit]]

    def mark_as_read(self, notification_id: str) -> Optional[Dict[str, Any]]:
        notif = self._notifications.get(notification_id)
        if not notif:
            return None
        notif.status = "read"
        notif.read_at = datetime.utcnow().isoformat()
        return asdict(notif)

    def subscribe(self, patient_id: str, channels: List[str]) -> Dict[str, Any]:
        self._subscriptions[patient_id] = channels
        return {"patient_id": patient_id, "subscribed_channels": channels}

    def get_subscription(self, patient_id: str) -> Dict[str, Any]:
        channels = self._subscriptions.get(patient_id, [])
        return {"patient_id": patient_id, "subscribed_channels": channels}

    def get_statistics(self) -> Dict[str, Any]:
        notifs = list(self._notifications.values())
        by_channel = {}
        by_type = {}
        by_status = {}
        for n in notifs:
            by_channel[n.channel] = by_channel.get(n.channel, 0) + 1
            by_type[n.notification_type] = by_type.get(n.notification_type, 0) + 1
            by_status[n.status] = by_status.get(n.status, 0) + 1
        return {
            "total": len(notifs),
            "by_channel": by_channel,
            "by_type": by_type,
            "by_status": by_status,
        }
