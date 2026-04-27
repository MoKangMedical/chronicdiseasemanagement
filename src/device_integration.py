"""慢康智枢 — 设备接入模块"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class Device:
    """医疗设备"""
    device_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str = ""
    device_type: str = ""  # blood_pressure / blood_sugar / weight / spo2 / ecg
    brand: str = ""
    model: str = ""
    serial_number: str = ""
    status: str = "active"  # active / inactive / error
    last_sync: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class DeviceReading:
    """设备读数"""
    reading_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str = ""
    patient_id: str = ""
    metric: str = ""
    value: float = 0.0
    unit: str = ""
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    raw_data: Dict[str, Any] = field(default_factory=dict)


class DeviceIntegrationService:
    """设备接入服务"""

    SUPPORTED_DEVICES = {
        "blood_pressure": {"metrics": ["systolic_bp", "diastolic_bp", "heart_rate"], "unit": "mmHg"},
        "blood_sugar": {"metrics": ["blood_sugar"], "unit": "mmol/L"},
        "weight": {"metrics": ["weight", "bmi"], "unit": "kg"},
        "spo2": {"metrics": ["spo2", "heart_rate"], "unit": "%"},
        "ecg": {"metrics": ["heart_rate", "ecg_data"], "unit": "bpm"},
        "temperature": {"metrics": ["temperature"], "unit": "°C"},
    }

    def __init__(self):
        self._devices: Dict[str, Device] = {}
        self._readings: List[DeviceReading] = []

    def register_device(self, data: Dict[str, Any]) -> Dict[str, Any]:
        device_type = data.get("device_type", "")
        if device_type not in self.SUPPORTED_DEVICES:
            raise ValueError(f"不支持的设备类型: {device_type}，支持: {list(self.SUPPORTED_DEVICES.keys())}")
        device = Device(
            patient_id=data["patient_id"],
            device_type=device_type,
            brand=data.get("brand", ""),
            model=data.get("model", ""),
            serial_number=data.get("serial_number", ""),
        )
        self._devices[device.device_id] = device
        return asdict(device)

    def get_patient_devices(self, patient_id: str) -> List[Dict[str, Any]]:
        return [asdict(d) for d in self._devices.values() if d.patient_id == patient_id]

    def record_reading(self, data: Dict[str, Any]) -> Dict[str, Any]:
        device = self._devices.get(data.get("device_id", ""))
        if not device:
            raise ValueError("设备不存在")
        reading = DeviceReading(
            device_id=data["device_id"],
            patient_id=device.patient_id,
            metric=data["metric"],
            value=float(data["value"]),
            unit=data.get("unit", ""),
            raw_data=data.get("raw_data", {}),
        )
        self._readings.append(reading)
        device.last_sync = datetime.utcnow().isoformat()
        return asdict(reading)

    def get_readings(self, patient_id: str, metric: str = "", limit: int = 100) -> List[Dict[str, Any]]:
        readings = [r for r in self._readings if r.patient_id == patient_id]
        if metric:
            readings = [r for r in readings if r.metric == metric]
        readings.sort(key=lambda r: r.timestamp, reverse=True)
        return [asdict(r) for r in readings[:limit]]

    def sync_device(self, device_id: str) -> Dict[str, Any]:
        """模拟设备同步"""
        device = self._devices.get(device_id)
        if not device:
            raise ValueError("设备不存在")
        device.last_sync = datetime.utcnow().isoformat()
        device.status = "active"
        return {"device_id": device_id, "status": "synced", "timestamp": device.last_sync}

    def get_device_status(self, device_id: str) -> Optional[Dict[str, Any]]:
        device = self._devices.get(device_id)
        if not device:
            return None
        return {
            "device_id": device_id,
            "status": device.status,
            "last_sync": device.last_sync,
            "device_type": device.device_type,
        }

    def get_supported_devices(self) -> Dict[str, Any]:
        return self.SUPPORTED_DEVICES

    def deactivate_device(self, device_id: str) -> bool:
        device = self._devices.get(device_id)
        if not device:
            return False
        device.status = "inactive"
        return True
