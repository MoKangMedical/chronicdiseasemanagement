"""慢康智枢 — 数据验证模块"""
from __future__ import annotations
import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple


class ValidationError(Exception):
    """验证错误"""
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")


class PatientValidator:
    """患者数据验证器"""

    REQUIRED_FIELDS = ["name", "id_card", "phone", "gender", "birth_date"]
    GENDER_OPTIONS = {"男", "女"}
    PHONE_PATTERN = re.compile(r"^1[3-9]\d{9}$")
    ID_CARD_PATTERN = re.compile(r"^\d{17}[\dXx]$")

    @classmethod
    def validate_create(cls, data: Dict[str, Any]) -> List[ValidationError]:
        errors: List[ValidationError] = []
        for field in cls.REQUIRED_FIELDS:
            if not data.get(field):
                errors.append(ValidationError(field, "不能为空"))
        if data.get("phone") and not cls.PHONE_PATTERN.match(data["phone"]):
            errors.append(ValidationError("phone", "手机号格式不正确"))
        if data.get("id_card") and not cls.ID_CARD_PATTERN.match(data["id_card"]):
            errors.append(ValidationError("id_card", "身份证号格式不正确"))
        if data.get("gender") and data["gender"] not in cls.GENDER_OPTIONS:
            errors.append(ValidationError("gender", "性别只能为男或女"))
        if data.get("birth_date"):
            try:
                datetime.strptime(data["birth_date"], "%Y-%m-%d")
            except ValueError:
                errors.append(ValidationError("birth_date", "日期格式应为 YYYY-MM-DD"))
        return errors

    @classmethod
    def validate_update(cls, data: Dict[str, Any]) -> List[ValidationError]:
        errors: List[ValidationError] = []
        if "phone" in data and data["phone"] and not cls.PHONE_PATTERN.match(data["phone"]):
            errors.append(ValidationError("phone", "手机号格式不正确"))
        if "gender" in data and data["gender"] not in cls.GENDER_OPTIONS:
            errors.append(ValidationError("gender", "性别只能为男或女"))
        return errors


class MedicationValidator:
    """用药数据验证器"""

    FREQUENCY_OPTIONS = {"每日一次", "每日两次", "每日三次", "隔日一次", "每周一次", "需要时"}

    @classmethod
    def validate(cls, data: Dict[str, Any]) -> List[ValidationError]:
        errors: List[ValidationError] = []
        if not data.get("drug_name"):
            errors.append(ValidationError("drug_name", "药品名称不能为空"))
        if not data.get("dosage"):
            errors.append(ValidationError("dosage", "剂量不能为空"))
        if data.get("frequency") and data["frequency"] not in cls.FREQUENCY_OPTIONS:
            errors.append(ValidationError("frequency", f"频率应为: {', '.join(cls.FREQUENCY_OPTIONS)}"))
        return errors


class VitalSignValidator:
    """生命体征验证器"""

    RANGES = {
        "systolic_bp": (60, 250),
        "diastolic_bp": (30, 150),
        "heart_rate": (30, 220),
        "blood_sugar": (2.0, 35.0),
        "temperature": (34.0, 42.0),
        "weight": (20, 300),
        "bmi": (10.0, 60.0),
    }

    @classmethod
    def validate(cls, data: Dict[str, Any]) -> List[ValidationError]:
        errors: List[ValidationError] = []
        for key, (lo, hi) in cls.RANGES.items():
            if key in data and data[key] is not None:
                try:
                    val = float(data[key])
                    if val < lo or val > hi:
                        errors.append(ValidationError(key, f"值 {val} 超出合理范围 [{lo}, {hi}]"))
                except (TypeError, ValueError):
                    errors.append(ValidationError(key, "必须为数字"))
        return errors


def validate_required(data: Dict[str, Any], fields: List[str]) -> List[ValidationError]:
    """通用必填字段验证"""
    errors: List[ValidationError] = []
    for f in fields:
        if not data.get(f):
            errors.append(ValidationError(f, "不能为空"))
    return errors
