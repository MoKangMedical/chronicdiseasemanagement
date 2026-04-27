"""
慢病管理平台 FastAPI 后端主入口
============================================
启动方式:
    uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

数据来源:
    1. public/demo-data/pages-snapshot.json   (主快照, 前端静态演示同一份数据)
    2. public/demo-data/population-cohort.json
    3. public/demo-data/qixia-public-data.json
    4. data/*.json                            (业务模块原始数据)
"""

from __future__ import annotations

import json
import uuid
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# 项目根目录 & 数据文件路径
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEMO_DATA_DIR = PROJECT_ROOT / "public" / "demo-data"
DATA_DIR = PROJECT_ROOT / "data"

SNAPSHOT_PATH = DEMO_DATA_DIR / "pages-snapshot.json"
POPULATION_PATH = DEMO_DATA_DIR / "population-cohort.json"
PUBLIC_DATA_PATH = DEMO_DATA_DIR / "qixia-public-data.json"

# ---------------------------------------------------------------------------
# 辅助: 安全读取 JSON 文件
# ---------------------------------------------------------------------------

def _load_json(path: Path, default: Any = None) -> Any:
    """读取 JSON 文件, 文件不存在或解析失败时返回 default."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default if default is not None else {}


# ---------------------------------------------------------------------------
# 加载演示数据 (启动时一次性加载到内存)
# ---------------------------------------------------------------------------
snapshot: Dict[str, Any] = _load_json(SNAPSHOT_PATH, {})
population_cohort: Any = _load_json(POPULATION_PATH, [])
public_source_data: Any = _load_json(PUBLIC_DATA_PATH, {})

# data/ 目录下的原始业务数据
patient_records: List[dict] = _load_json(DATA_DIR / "patient-records.json", [])
medication_data: List[dict] = _load_json(DATA_DIR / "medication-data.json", [])
health_metrics: List[dict] = _load_json(DATA_DIR / "health-metrics.json", [])
disease_models: List[dict] = _load_json(DATA_DIR / "disease-models.json", [])
follow_up_templates: List[dict] = _load_json(DATA_DIR / "follow-up-templates.json", [])
emergency_contacts: List[dict] = _load_json(DATA_DIR / "emergency-contacts.json", [])

# 快照子集合 (方便访问)
seed: Dict[str, Any] = snapshot.get("seed", {})
dashboards: Dict[str, Any] = snapshot.get("dashboards", {})
clinicians_map: Dict[str, Any] = snapshot.get("clinicians", {})
workspaces: Dict[str, Any] = snapshot.get("workspaces", {})
medclaw_workspaces: Dict[str, Any] = snapshot.get("medclawWorkspaces", {})
ecosystem_journeys: Dict[str, Any] = snapshot.get("ecosystemJourneys", {})
github_plans: Dict[str, Any] = snapshot.get("githubPlans", {})
integrations: Dict[str, Any] = snapshot.get("integrations", {})
predictions: Dict[str, Any] = snapshot.get("predictions", {})

# ---------------------------------------------------------------------------
# 内存状态 (POST 端点写入, GET 端点读取)
# ---------------------------------------------------------------------------
# MDT 会议存储: { meeting_id: meeting_dict }
mdt_meetings_store: Dict[str, Dict[str, Any]] = {}

# ---------------------------------------------------------------------------
# FastAPI 应用实例
# ---------------------------------------------------------------------------
app = FastAPI(
    title="慢病管理平台 API",
    description="慢性病综合管理平台后端, 覆盖患者管理、风险评估、用药追踪、随访、MDT 多学科会诊等。",
    version="1.0.0",
)

# CORS: 允许前端从不同端口/域名访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic 请求体模型
# ---------------------------------------------------------------------------
class MdtMeetingCreate(BaseModel):
    topic: str


class MdtMessageCreate(BaseModel):
    clinicianId: str
    message: str


class MdtMeetingClose(BaseModel):
    decision: str
    followUpActions: List[str] = []


# ---------------------------------------------------------------------------
# 辅助函数
# ---------------------------------------------------------------------------

def _filter_key(hospital_id: str = "", workbench_role: str = "") -> str:
    """构建快照字典的 key, 与前端 filterKey() 一致."""
    return f"{hospital_id or 'all'}|{workbench_role or 'all'}"


def _workspace_key(patient_id: str, workbench_role: str = "") -> str:
    """构建 workspace 字典的 key, 与前端 workspaceKey() 一致."""
    return f"{patient_id}|{workbench_role or 'all'}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ===========================================================================
#  API 路由
# ===========================================================================

# ---------------------------------------------------------------------------
# 健康检查
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "timestamp": _now_iso(),
        "snapshot_loaded": bool(snapshot),
        "population_loaded": bool(population_cohort),
    }


# ---------------------------------------------------------------------------
# 医院列表
# ---------------------------------------------------------------------------
@app.get("/api/hospitals")
def get_hospitals():
    return seed.get("hospitals", [])


# ---------------------------------------------------------------------------
# HIS 映射
# ---------------------------------------------------------------------------
@app.get("/api/his/mappings")
def get_his_mappings():
    return seed.get("mappings", [])


# ---------------------------------------------------------------------------
# 仪表盘
# ---------------------------------------------------------------------------
@app.get("/api/dashboard")
def get_dashboard(
    hospitalId: str = Query("", description="医院 ID"),
    workbenchRole: str = Query("", description="角色: specialist-doctor | general-practitioner | health-manager"),
):
    key = _filter_key(hospitalId, workbenchRole)
    return dashboards.get(key) or dashboards.get("all|all", {})


# ---------------------------------------------------------------------------
# 医护人员列表
# ---------------------------------------------------------------------------
@app.get("/api/clinicians")
def get_clinicians(
    hospitalId: str = Query("", description="医院 ID"),
    workbenchRole: str = Query("", description="角色"),
):
    key = _filter_key(hospitalId, workbenchRole)
    return clinicians_map.get(key) or clinicians_map.get("all|all", [])


# ---------------------------------------------------------------------------
# 患者工作空间
# ---------------------------------------------------------------------------
@app.get("/api/patients/{patient_id}/workspace")
def get_patient_workspace(
    patient_id: str,
    workbenchRole: str = Query("", description="角色"),
):
    key = _workspace_key(patient_id, workbenchRole)
    ws = workspaces.get(key) or workspaces.get(_workspace_key(patient_id, "all"))
    if ws is None:
        raise HTTPException(status_code=404, detail=f"未找到患者 {patient_id} 的工作空间数据")
    return ws


# ---------------------------------------------------------------------------
# MedClaw 工作空间
# ---------------------------------------------------------------------------
@app.get("/api/medclaw/patients/{patient_id}/workspace")
def get_medclaw_workspace(
    patient_id: str,
    workbenchRole: str = Query("", description="角色"),
):
    key = _workspace_key(patient_id, workbenchRole)
    ws = medclaw_workspaces.get(key) or medclaw_workspaces.get(_workspace_key(patient_id, "all"))
    if ws is None:
        raise HTTPException(status_code=404, detail=f"未找到患者 {patient_id} 的 MedClaw 工作空间数据")
    return ws


# ---------------------------------------------------------------------------
# MedClaw 概览
# ---------------------------------------------------------------------------
@app.get("/api/medclaw/overview")
def get_medclaw_overview():
    return seed.get("medclawOverview", {})


# ---------------------------------------------------------------------------
# 生态系统概览
# ---------------------------------------------------------------------------
@app.get("/api/ecosystem/overview")
def get_ecosystem_overview():
    return seed.get("ecosystemOverview", {})


# ---------------------------------------------------------------------------
# 患者生态旅程
# ---------------------------------------------------------------------------
@app.get("/api/ecosystem/patients/{patient_id}/journey")
def get_ecosystem_journey(patient_id: str):
    journey = ecosystem_journeys.get(patient_id)
    if journey is None:
        raise HTTPException(status_code=404, detail=f"未找到患者 {patient_id} 的生态旅程数据")
    return journey


# ---------------------------------------------------------------------------
# GitHub 能力概览
# ---------------------------------------------------------------------------
@app.get("/api/github-capabilities/overview")
def get_github_capabilities_overview():
    return seed.get("githubOverview", {})


# ---------------------------------------------------------------------------
# 患者 GitHub 能力计划
# ---------------------------------------------------------------------------
@app.get("/api/github-capabilities/patients/{patient_id}/plan")
def get_github_plan(patient_id: str):
    plan = github_plans.get(patient_id)
    if plan is None:
        raise HTTPException(status_code=404, detail=f"未找到患者 {patient_id} 的 GitHub 能力计划")
    return plan


# ---------------------------------------------------------------------------
# 集成适配
# ---------------------------------------------------------------------------
@app.get("/api/integrations/patients/{patient_id}/adapted")
def get_integration_adapted(patient_id: str):
    adapter = integrations.get(patient_id)
    if adapter is None:
        raise HTTPException(status_code=404, detail=f"未找到患者 {patient_id} 的集成适配数据")
    return adapter


# ---------------------------------------------------------------------------
# 预测数据
# ---------------------------------------------------------------------------
@app.get("/api/predictions/patients/{patient_id}")
def get_predictions(patient_id: str):
    pred = predictions.get(patient_id)
    if pred is None:
        raise HTTPException(status_code=404, detail=f"未找到患者 {patient_id} 的预测数据")
    return pred


# ---------------------------------------------------------------------------
# 人群队列
# ---------------------------------------------------------------------------
@app.get("/api/population/cohort")
def get_population_cohort(
    hospitalId: str = Query("", description="医院 ID, 为空则返回全区数据"),
):
    if not hospitalId:
        return population_cohort

    # 如果 population_cohort 是列表, 按 hospitalId 过滤
    if isinstance(population_cohort, list):
        return [p for p in population_cohort if p.get("hospitalId") == hospitalId]

    # 如果是字典, 尝试从 patients 字段过滤
    if isinstance(population_cohort, dict):
        patients = population_cohort.get("patients", [])
        filtered = [p for p in patients if p.get("hospitalId") == hospitalId]
        return {**population_cohort, "patients": filtered}

    return population_cohort


# ---------------------------------------------------------------------------
# 公开数据源 (栖霞区)
# ---------------------------------------------------------------------------
@app.get("/api/public-sources/qixia")
def get_public_sources_qixia():
    return public_source_data


# ---------------------------------------------------------------------------
# 运行慢病管理工作流
# ---------------------------------------------------------------------------
@app.post("/api/workflows/chronic-care/run/{patient_id}")
def run_chronic_care_workflow(patient_id: str):
    """
    模拟执行慢病管理工作流.
    实际项目中, 此端点会调用 risk_engine / follow_up / medication_tracker 等模块.
    """
    workflow_id = f"wf-{uuid.uuid4().hex[:12]}"
    return {
        "workflowId": workflow_id,
        "patientId": patient_id,
        "status": "completed",
        "startedAt": _now_iso(),
        "completedAt": _now_iso(),
        "steps": [
            {"name": "风险评估", "status": "completed", "duration_ms": 320},
            {"name": "用药审核", "status": "completed", "duration_ms": 180},
            {"name": "随访计划生成", "status": "completed", "duration_ms": 250},
            {"name": "通知发送", "status": "completed", "duration_ms": 90},
        ],
        "summary": f"患者 {patient_id} 的慢病管理工作流已成功执行",
    }


# ---------------------------------------------------------------------------
# MDT 会议 — 创建
# ---------------------------------------------------------------------------
@app.post("/api/patients/{patient_id}/mdt-meetings", status_code=201)
def create_mdt_meeting(patient_id: str, body: MdtMeetingCreate):
    meeting_id = f"mdt-{uuid.uuid4().hex[:12]}"
    meeting = {
        "id": meeting_id,
        "patientId": patient_id,
        "topic": body.topic,
        "status": "open",
        "createdAt": _now_iso(),
        "messages": [],
        "decision": None,
        "followUpActions": [],
    }
    mdt_meetings_store[meeting_id] = meeting
    return meeting


# ---------------------------------------------------------------------------
# MDT 会议 — 发送消息
# ---------------------------------------------------------------------------
@app.post("/api/mdt-meetings/{meeting_id}/messages")
def add_mdt_message(meeting_id: str, body: MdtMessageCreate):
    meeting = mdt_meetings_store.get(meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail=f"未找到会议 {meeting_id}")
    if meeting["status"] != "open":
        raise HTTPException(status_code=400, detail="会议已关闭, 无法发送消息")
    message = {
        "id": f"msg-{uuid.uuid4().hex[:8]}",
        "clinicianId": body.clinicianId,
        "message": body.message,
        "timestamp": _now_iso(),
    }
    meeting["messages"].append(message)
    return {"ok": True, "message": message}


# ---------------------------------------------------------------------------
# MDT 会议 — 关闭
# ---------------------------------------------------------------------------
@app.post("/api/mdt-meetings/{meeting_id}/close")
def close_mdt_meeting(meeting_id: str, body: MdtMeetingClose):
    meeting = mdt_meetings_store.get(meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail=f"未找到会议 {meeting_id}")
    if meeting["status"] != "open":
        raise HTTPException(status_code=400, detail="会议已经关闭")
    meeting["status"] = "closed"
    meeting["decision"] = body.decision
    meeting["followUpActions"] = body.followUpActions
    meeting["closedAt"] = _now_iso()
    return {"ok": True, "meeting": meeting}


# ---------------------------------------------------------------------------
# 业务数据端点 (对应 data/ 目录下的 JSON)
# ---------------------------------------------------------------------------

@app.get("/api/data/patients")
def get_patient_records():
    """返回 data/patient-records.json 的内容."""
    return patient_records


@app.get("/api/data/medications")
def get_medication_data():
    """返回 data/medication-data.json 的内容."""
    return medication_data


@app.get("/api/data/health-metrics")
def get_health_metrics():
    """返回 data/health-metrics.json 的内容."""
    return health_metrics


@app.get("/api/data/disease-models")
def get_disease_models():
    """返回 data/disease-models.json 的内容."""
    return disease_models


@app.get("/api/data/follow-up-templates")
def get_follow_up_templates():
    """返回 data/follow-up-templates.json 的内容."""
    return follow_up_templates


@app.get("/api/data/emergency-contacts")
def get_emergency_contacts():
    """返回 data/emergency-contacts.json 的内容."""
    return emergency_contacts


# ---------------------------------------------------------------------------
# 快照元数据
# ---------------------------------------------------------------------------

@app.get("/api/snapshot/meta")
def get_snapshot_meta():
    return snapshot.get("meta", {})


# ---------------------------------------------------------------------------
# 跟进数据 (followups)
# ---------------------------------------------------------------------------

@app.get("/api/followups")
def get_followups():
    return snapshot.get("followups", {})


# ---------------------------------------------------------------------------
# 入口
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
