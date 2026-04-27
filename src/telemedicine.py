"""慢康智枢 — 远程问诊模块"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class TelemedicineSession:
    """远程问诊会话"""
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str = ""
    doctor_id: str = ""
    doctor_name: str = ""
    department: str = ""
    session_type: str = "video"  # video / audio / chat
    status: str = "scheduled"  # scheduled / in_progress / completed / cancelled
    scheduled_time: str = ""
    start_time: str = ""
    end_time: str = ""
    chief_complaint: str = ""
    diagnosis: str = ""
    prescription: List[Dict[str, Any]] = field(default_factory=list)
    notes: str = ""
    rating: int = 0
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


class TelemedicineService:
    """远程问诊服务"""

    def __init__(self):
        self._sessions: Dict[str, TelemedicineSession] = {}

    def schedule_session(self, data: Dict[str, Any]) -> Dict[str, Any]:
        session = TelemedicineSession(
            patient_id=data["patient_id"],
            doctor_id=data.get("doctor_id", ""),
            doctor_name=data.get("doctor_name", ""),
            department=data.get("department", ""),
            session_type=data.get("session_type", "video"),
            scheduled_time=data.get("scheduled_time", ""),
            chief_complaint=data.get("chief_complaint", ""),
        )
        self._sessions[session.session_id] = session
        return asdict(session)

    def start_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        session = self._sessions.get(session_id)
        if not session or session.status != "scheduled":
            return None
        session.status = "in_progress"
        session.start_time = datetime.utcnow().isoformat()
        return asdict(session)

    def complete_session(self, session_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        session = self._sessions.get(session_id)
        if not session:
            return None
        session.status = "completed"
        session.end_time = datetime.utcnow().isoformat()
        session.diagnosis = data.get("diagnosis", "")
        session.prescription = data.get("prescription", [])
        session.notes = data.get("notes", "")
        return asdict(session)

    def cancel_session(self, session_id: str, reason: str = "") -> Optional[Dict[str, Any]]:
        session = self._sessions.get(session_id)
        if not session:
            return None
        session.status = "cancelled"
        session.notes = f"取消原因: {reason}" if reason else session.notes
        return asdict(session)

    def get_patient_sessions(self, patient_id: str, status: str = "") -> List[Dict[str, Any]]:
        sessions = [s for s in self._sessions.values() if s.patient_id == patient_id]
        if status:
            sessions = [s for s in sessions if s.status == status]
        sessions.sort(key=lambda s: s.created_at, reverse=True)
        return [asdict(s) for s in sessions]

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        session = self._sessions.get(session_id)
        return asdict(session) if session else None

    def rate_session(self, session_id: str, rating: int, comment: str = "") -> Optional[Dict[str, Any]]:
        session = self._sessions.get(session_id)
        if not session:
            return None
        session.rating = max(1, min(5, rating))
        return asdict(session)

    def get_doctor_schedule(self, doctor_id: str, date: str) -> Dict[str, Any]:
        """获取医生排班"""
        sessions = [s for s in self._sessions.values()
                    if s.doctor_id == doctor_id and s.scheduled_time.startswith(date)]
        return {
            "doctor_id": doctor_id,
            "date": date,
            "appointments": len(sessions),
            "slots": [
                {"session_id": s.session_id, "time": s.scheduled_time, "status": s.status}
                for s in sessions
            ],
        }

    def get_statistics(self) -> Dict[str, Any]:
        sessions = list(self._sessions.values())
        status_count = {}
        for s in sessions:
            status_count[s.status] = status_count.get(s.status, 0) + 1
        completed = [s for s in sessions if s.status == "completed" and s.rating > 0]
        avg_rating = sum(s.rating for s in completed) / len(completed) if completed else 0
        return {
            "total_sessions": len(sessions),
            "by_status": status_count,
            "average_rating": round(avg_rating, 1),
        }
