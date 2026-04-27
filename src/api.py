"""慢康智枢 — REST API 接口"""
from __future__ import annotations
from flask import Flask, request, jsonify, Blueprint
from datetime import datetime
from typing import Any, Dict

from .patient_manager import PatientManager
from .medication_tracker import MedicationTracker
from .risk_engine import RiskEngine
from .follow_up import FollowUpManager
from .data_analyzer import DataAnalyzer
from .validator import PatientValidator, ValidationError
from .config import get_config

api_bp = Blueprint("api", __name__, url_prefix="/api/v1")

# 服务实例
patient_mgr = PatientManager()
med_tracker = MedicationTracker()
risk_engine = RiskEngine()
follow_up_mgr = FollowUpManager()
analyzer = DataAnalyzer()


def _ok(data: Any = None, message: str = "success", code: int = 200):
    return jsonify({"code": code, "message": message, "data": data}), code


def _err(message: str, code: int = 400, errors=None):
    return jsonify({"code": code, "message": message, "errors": errors}), code


# ── 患者管理 ──────────────────────────────────
@api_bp.route("/patients", methods=["GET"])
def list_patients():
    page = request.args.get("page", 1, type=int)
    size = request.args.get("size", 20, type=int)
    keyword = request.args.get("keyword", "")
    result = patient_mgr.list_patients(page=page, size=size, keyword=keyword)
    return _ok(result)


@api_bp.route("/patients", methods=["POST"])
def create_patient():
    data = request.get_json(force=True)
    errors = PatientValidator.validate_create(data)
    if errors:
        return _err("数据验证失败", errors=[e.message for e in errors])
    patient = patient_mgr.create_patient(data)
    return _ok(patient, code=201)


@api_bp.route("/patients/<patient_id>", methods=["GET"])
def get_patient(patient_id: str):
    patient = patient_mgr.get_patient(patient_id)
    if not patient:
        return _err("患者不存在", code=404)
    return _ok(patient)


@api_bp.route("/patients/<patient_id>", methods=["PUT"])
def update_patient(patient_id: str):
    data = request.get_json(force=True)
    errors = PatientValidator.validate_update(data)
    if errors:
        return _err("数据验证失败", errors=[e.message for e in errors])
    patient = patient_mgr.update_patient(patient_id, data)
    if not patient:
        return _err("患者不存在", code=404)
    return _ok(patient)


# ── 用药追踪 ──────────────────────────────────
@api_bp.route("/patients/<patient_id>/medications", methods=["GET"])
def list_medications(patient_id: str):
    meds = med_tracker.get_medications(patient_id)
    return _ok(meds)


@api_bp.route("/patients/<patient_id>/medications", methods=["POST"])
def add_medication(patient_id: str):
    data = request.get_json(force=True)
    data["patient_id"] = patient_id
    med = med_tracker.add_medication(data)
    return _ok(med, code=201)


@api_bp.route("/patients/<patient_id>/medications/<med_id>/adherence", methods=["GET"])
def medication_adherence(patient_id: str, med_id: str):
    result = med_tracker.get_adherence(patient_id, med_id)
    return _ok(result)


# ── 风险评估 ──────────────────────────────────
@api_bp.route("/patients/<patient_id>/risk", methods=["GET"])
def get_risk(patient_id: str):
    risk = risk_engine.assess(patient_id)
    return _ok(risk)


@api_bp.route("/patients/<patient_id>/risk/history", methods=["GET"])
def risk_history(patient_id: str):
    history = risk_engine.get_history(patient_id)
    return _ok(history)


# ── 随访管理 ──────────────────────────────────
@api_bp.route("/patients/<patient_id>/follow-ups", methods=["GET"])
def list_follow_ups(patient_id: str):
    items = follow_up_mgr.list_by_patient(patient_id)
    return _ok(items)


@api_bp.route("/patients/<patient_id>/follow-ups", methods=["POST"])
def create_follow_up(patient_id: str):
    data = request.get_json(force=True)
    data["patient_id"] = patient_id
    item = follow_up_mgr.create(data)
    return _ok(item, code=201)


# ── 数据分析 ──────────────────────────────────
@api_bp.route("/analytics/overview", methods=["GET"])
def analytics_overview():
    result = analyzer.overview()
    return _ok(result)


@api_bp.route("/analytics/trends", methods=["GET"])
def analytics_trends():
    metric = request.args.get("metric", "blood_sugar")
    days = request.args.get("days", 30, type=int)
    result = analyzer.trends(metric=metric, days=days)
    return _ok(result)


# ── 健康检查 ──────────────────────────────────
@api_bp.route("/health", methods=["GET"])
def health():
    return _ok({"status": "healthy", "version": get_config().app.VERSION, "timestamp": datetime.utcnow().isoformat()})
