"""慢康智枢 — 健康教育模块"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class EducationContent:
    """教育内容"""
    content_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    category: str = ""  # disease / medication / lifestyle / nutrition / exercise
    condition: str = ""  # 适用病种
    content_type: str = "article"  # article / video / infographic / quiz
    content: str = ""
    summary: str = ""
    author: str = ""
    tags: List[str] = field(default_factory=list)
    view_count: int = 0
    status: str = "published"
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class LearningRecord:
    """学习记录"""
    record_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str = ""
    content_id: str = ""
    progress: float = 0.0  # 0-100
    quiz_score: int = 0
    completed: bool = False
    completed_at: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


class HealthEducationService:
    """健康教育服务"""

    # 内置教育内容
    BUILTIN_CONTENT = [
        {
            "title": "糖尿病基础知识",
            "category": "disease",
            "condition": "糖尿病",
            "content_type": "article",
            "summary": "了解糖尿病的类型、症状和日常管理方法",
            "content": "糖尿病是一种以高血糖为特征的代谢性疾病...",
            "tags": ["糖尿病", "基础知识", "血糖"],
        },
        {
            "title": "高血压的自我管理",
            "category": "disease",
            "condition": "高血压",
            "content_type": "article",
            "summary": "学习如何通过生活方式和药物控制血压",
            "content": "高血压是最常见的慢性病之一...",
            "tags": ["高血压", "血压管理", "生活方式"],
        },
        {
            "title": "合理膳食指南",
            "category": "nutrition",
            "condition": "",
            "content_type": "article",
            "summary": "中国居民膳食指南要点解读",
            "content": "合理膳食是健康的基础...",
            "tags": ["营养", "膳食", "健康饮食"],
        },
        {
            "title": "运动与慢性病",
            "category": "exercise",
            "condition": "",
            "content_type": "article",
            "summary": "适合慢性病患者的运动方式和注意事项",
            "content": "适量运动对慢性病管理至关重要...",
            "tags": ["运动", "有氧运动", "慢性病"],
        },
        {
            "title": "正确认识药物副作用",
            "category": "medication",
            "condition": "",
            "content_type": "article",
            "summary": "如何识别和应对常见药物副作用",
            "content": "药物副作用是患者最关心的问题之一...",
            "tags": ["药物", "副作用", "安全用药"],
        },
    ]

    def __init__(self):
        self._contents: Dict[str, EducationContent] = {}
        self._records: List[LearningRecord] = []
        self._init_builtin_content()

    def _init_builtin_content(self):
        for item in self.BUILTIN_CONTENT:
            content = EducationContent(**item)
            self._contents[content.content_id] = content

    def list_contents(self, category: str = "", condition: str = "",
                      content_type: str = "", page: int = 1, size: int = 20) -> Dict[str, Any]:
        items = list(self._contents.values())
        if category:
            items = [c for c in items if c.category == category]
        if condition:
            items = [c for c in items if c.condition == condition or not c.condition]
        if content_type:
            items = [c for c in items if c.content_type == content_type]
        total = len(items)
        start = (page - 1) * size
        page_items = [asdict(c) for c in items[start:start + size]]
        return {"total": total, "page": page, "size": size, "items": page_items}

    def get_content(self, content_id: str) -> Optional[Dict[str, Any]]:
        content = self._contents.get(content_id)
        if content:
            content.view_count += 1
            return asdict(content)
        return None

    def add_content(self, data: Dict[str, Any]) -> Dict[str, Any]:
        content = EducationContent(
            title=data["title"],
            category=data.get("category", ""),
            condition=data.get("condition", ""),
            content_type=data.get("content_type", "article"),
            content=data.get("content", ""),
            summary=data.get("summary", ""),
            author=data.get("author", ""),
            tags=data.get("tags", []),
        )
        self._contents[content.content_id] = content
        return asdict(content)

    def get_recommendations(self, patient_id: str, conditions: List[str]) -> List[Dict[str, Any]]:
        """根据患者疾病推荐教育内容"""
        recommended = []
        for c in self._contents.values():
            if c.condition in conditions or not c.condition:
                recommended.append(asdict(c))
        recommended.sort(key=lambda x: x["view_count"], reverse=True)
        return recommended[:10]

    def record_learning(self, patient_id: str, content_id: str,
                        progress: float = 0, quiz_score: int = 0) -> Dict[str, Any]:
        completed = progress >= 100
        record = LearningRecord(
            patient_id=patient_id,
            content_id=content_id,
            progress=progress,
            quiz_score=quiz_score,
            completed=completed,
            completed_at=datetime.utcnow().isoformat() if completed else "",
        )
        self._records.append(record)
        return asdict(record)

    def get_learning_progress(self, patient_id: str) -> Dict[str, Any]:
        records = [r for r in self._records if r.patient_id == patient_id]
        completed = sum(1 for r in records if r.completed)
        total_score = sum(r.quiz_score for r in records if r.quiz_score > 0)
        avg_score = total_score / completed if completed else 0
        return {
            "patient_id": patient_id,
            "total_started": len(records),
            "total_completed": completed,
            "average_quiz_score": round(avg_score, 1),
        }

    def get_popular_content(self, limit: int = 10) -> List[Dict[str, Any]]:
        contents = sorted(self._contents.values(), key=lambda c: c.view_count, reverse=True)
        return [asdict(c) for c in contents[:limit]]
