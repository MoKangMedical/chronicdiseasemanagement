"""
随访管理模块 (Follow-up)
慢病患者随访计划生成、执行跟踪、提醒管理
"""

import json
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# ============================================================
# 数据模型
# ============================================================

@dataclass
class FollowUpTask:
    """单次随访任务"""
    task_id: str
    patient_id: str
    patient_name: str
    disease_id: str
    follow_up_type: str       # 门诊随访 | 电话随访 | 上门随访 | 线上随访
    scheduled_date: str       # ISO date
    status: str = "pending"   # pending | completed | cancelled | overdue
    items: List[Dict] = field(default_factory=list)    # 随访项目
    notes: str = ""
    result: Dict = field(default_factory=dict)
    created_at: str = ""
    completed_at: str = ""

    def to_dict(self) -> Dict:
        return {
            "task_id": self.task_id,
            "patient_id": self.patient_id,
            "patient_name": self.patient_name,
            "disease_id": self.disease_id,
            "follow_up_type": self.follow_up_type,
            "scheduled_date": self.scheduled_date,
            "status": self.status,
            "items": self.items,
            "notes": self.notes,
            "result": self.result,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
        }


@dataclass
class FollowUpPlan:
    """随访计划"""
    plan_id: str
    patient_id: str
    patient_name: str
    disease_id: str
    risk_level: str           # 决定随访频率
    start_date: str
    end_date: str
    tasks: List[FollowUpTask] = field(default_factory=list)
    status: str = "active"    # active | completed | paused

    def to_dict(self) -> Dict:
        return {
            "plan_id": self.plan_id,
            "patient_id": self.patient_id,
            "patient_name": self.patient_name,
            "disease_id": self.disease_id,
            "risk_level": self.risk_level,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "tasks": [t.to_dict() for t in self.tasks],
            "status": self.status,
        }


# ============================================================
# 随访管理器
# ============================================================

class FollowUpManager:
    """随访计划生成与管理"""

    # 风险等级 -> 随访周期（天）
    INTERVAL_MAP = {
        "高危": 14,
        "中危": 30,
        "低危": 90,
    }

    # 疾病 -> 随访项目模板
    ITEM_TEMPLATES: Dict[str, List[Dict]] = {
        "hypertension": [
            {"name": "血压测量", "type": "vital", "required": True},
            {"name": "用药依从性评估", "type": "questionnaire", "required": True},
            {"name": "生活方式评估", "type": "questionnaire", "required": True},
            {"name": "不良反应询问", "type": "questionnaire", "required": False},
            {"name": "心电图", "type": "lab", "required": False, "frequency": "quarterly"},
        ],
        "diabetes": [
            {"name": "血糖监测", "type": "vital", "required": True},
            {"name": "HbA1c 检测", "type": "lab", "required": True, "frequency": "quarterly"},
            {"name": "足部检查", "type": "physical", "required": True},
            {"name": "饮食评估", "type": "questionnaire", "required": True},
            {"name": "运动评估", "type": "questionnaire", "required": True},
            {"name": "眼底检查", "type": "lab", "required": False, "frequency": "yearly"},
        ],
        "coronary": [
            {"name": "心电图", "type": "lab", "required": True},
            {"name": "血脂检测", "type": "lab", "required": True, "frequency": "quarterly"},
            {"name": "胸痛评估", "type": "questionnaire", "required": True},
            {"name": "运动耐量评估", "type": "physical", "required": False},
            {"name": "用药依从性", "type": "questionnaire", "required": True},
        ],
        "copd": [
            {"name": "肺功能检测", "type": "lab", "required": True, "frequency": "quarterly"},
            {"name": "呼吸困难评分", "type": "questionnaire", "required": True},
            {"name": "吸烟状态评估", "type": "questionnaire", "required": True},
            {"name": "急性加重史", "type": "questionnaire", "required": True},
        ],
        "ckd": [
            {"name": "肾功能(eGFR)", "type": "lab", "required": True},
            {"name": "尿蛋白检测", "type": "lab", "required": True},
            {"name": "血压测量", "type": "vital", "required": True},
            {"name": "电解质检测", "type": "lab", "required": False, "frequency": "quarterly"},
        ],
    }

    def __init__(self, templates_path: Optional[str] = None):
        self.templates: Dict = {}
        self.plans: Dict[str, FollowUpPlan] = {}
        self.tasks: Dict[str, FollowUpTask] = {}

        if templates_path:
            self.load_templates(templates_path)
        else:
            self.templates = self.ITEM_TEMPLATES

        logger.info("FollowUpManager 初始化完成")

    def load_templates(self, path: str) -> None:
        """加载随访模板"""
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        for tmpl in data.get("disease_templates", []):
            self.templates[tmpl["disease_id"]] = tmpl.get("items", [])
        logger.info(f"随访模板加载: {len(self.templates)} 种疾病")

    # ----------------------------------------------------------
    # 计划生成
    # ----------------------------------------------------------

    def generate_plan(self, patient_id: str, patient_name: str,
                      disease_id: str, risk_level: str,
                      start_date: Optional[str] = None,
                      duration_months: int = 6) -> FollowUpPlan:
        """生成随访计划"""
        now = datetime.now()
        start = datetime.fromisoformat(start_date) if start_date else now
        end = start + timedelta(days=duration_months * 30)

        interval = self.INTERVAL_MAP.get(risk_level, 30)
        items = self.templates.get(disease_id, [])

        plan_id = f"PLAN-{patient_id}-{now.strftime('%Y%m%d%H%M%S')}"
        tasks: List[FollowUpTask] = []

        current = start + timedelta(days=interval)
        task_idx = 0
        while current <= end:
            task_idx += 1
            task = FollowUpTask(
                task_id=f"FU-{patient_id}-{task_idx:03d}",
                patient_id=patient_id,
                patient_name=patient_name,
                disease_id=disease_id,
                follow_up_type=self._determine_type(risk_level, task_idx),
                scheduled_date=current.strftime("%Y-%m-%d"),
                items=items,
                created_at=now.isoformat(),
            )
            tasks.append(task)
            self.tasks[task.task_id] = task
            current += timedelta(days=interval)

        plan = FollowUpPlan(
            plan_id=plan_id,
            patient_id=patient_id,
            patient_name=patient_name,
            disease_id=disease_id,
            risk_level=risk_level,
            start_date=start.strftime("%Y-%m-%d"),
            end_date=end.strftime("%Y-%m-%d"),
            tasks=tasks,
        )
        self.plans[plan_id] = plan
        logger.info(f"随访计划生成: {plan_id}, {len(tasks)} 次随访, 周期 {interval} 天")
        return plan

    def _determine_type(self, risk_level: str, task_idx: int) -> str:
        """确定随访方式"""
        if risk_level == "高危":
            # 高危：交替门诊和电话
            return "门诊随访" if task_idx % 2 == 1 else "电话随访"
        elif risk_level == "中危":
            # 中危：首次门诊，后续电话为主
            if task_idx == 1:
                return "门诊随访"
            return "电话随访" if task_idx % 3 != 0 else "门诊随访"
        else:
            # 低危：线上为主
            return "线上随访" if task_idx % 4 != 1 else "门诊随访"

    # ----------------------------------------------------------
    # 任务执行
    # ----------------------------------------------------------

    def complete_task(self, task_id: str, result: Dict, notes: str = "") -> Optional[FollowUpTask]:
        """完成随访任务"""
        task = self.tasks.get(task_id)
        if not task:
            logger.warning(f"任务不存在: {task_id}")
            return None

        task.status = "completed"
        task.result = result
        task.notes = notes
        task.completed_at = datetime.now().isoformat()
        logger.info(f"随访完成: {task_id}")
        return task

    def cancel_task(self, task_id: str, reason: str = "") -> Optional[FollowUpTask]:
        """取消随访任务"""
        task = self.tasks.get(task_id)
        if not task:
            return None
        task.status = "cancelled"
        task.notes = f"取消原因: {reason}"
        return task

    # ----------------------------------------------------------
    # 查询
    # ----------------------------------------------------------

    def get_pending_tasks(self, patient_id: Optional[str] = None) -> List[FollowUpTask]:
        """获取待办随访"""
        tasks = [t for t in self.tasks.values() if t.status == "pending"]
        if patient_id:
            tasks = [t for t in tasks if t.patient_id == patient_id]
        tasks.sort(key=lambda t: t.scheduled_date)
        return tasks

    def get_overdue_tasks(self) -> List[FollowUpTask]:
        """获取逾期随访"""
        today = datetime.now().strftime("%Y-%m-%d")
        tasks = [t for t in self.tasks.values()
                 if t.status == "pending" and t.scheduled_date < today]
        for t in tasks:
            t.status = "overdue"
        return tasks

    def get_patient_history(self, patient_id: str) -> List[FollowUpTask]:
        """获取患者随访历史"""
        tasks = [t for t in self.tasks.values()
                 if t.patient_id == patient_id and t.status == "completed"]
        tasks.sort(key=lambda t: t.completed_at or "", reverse=True)
        return tasks

    # ----------------------------------------------------------
    # 统计
    # ----------------------------------------------------------

    def statistics(self) -> Dict:
        """随访管理统计"""
        status_counts: Dict[str, int] = {}
        for t in self.tasks.values():
            status_counts[t.status] = status_counts.get(t.status, 0) + 1

        return {
            "total_plans": len(self.plans),
            "total_tasks": len(self.tasks),
            "task_status": status_counts,
            "completion_rate": round(
                status_counts.get("completed", 0) / max(len(self.tasks), 1) * 100, 1
            ),
        }


# ============================================================
# CLI 入口
# ============================================================

def main():
    base = Path(__file__).parent.parent / "data"
    templates_path = base / "follow-up-templates.json"
    mgr = FollowUpManager(str(templates_path) if templates_path.exists() else None)

    plan = mgr.generate_plan(
        patient_id="P001",
        patient_name="张三",
        disease_id="hypertension",
        risk_level="高危",
        duration_months=6,
    )
    print(json.dumps(plan.to_dict(), ensure_ascii=False, indent=2))
    print(json.dumps(mgr.statistics(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
