"""慢康智枢 — 生活方式指导模块"""
from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class LifestyleGoal:
    """生活方式目标"""
    goal_id: str = ""
    patient_id: str = ""
    category: str = ""  # diet / exercise / sleep / smoking / drinking
    target: str = ""
    current_value: str = ""
    target_value: str = ""
    unit: str = ""
    deadline: str = ""
    status: str = "in_progress"
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


class LifestyleCoach:
    """生活方式指导服务"""

    # ── 饮食建议规则 ──
    DIET_RULES = {
        "糖尿病": [
            "控制每日碳水化合物摄入量，建议占总热量的45%-60%",
            "选择低GI食物，如全谷物、豆类",
            "定时定量进餐，避免暴饮暴食",
            "限制精制糖和含糖饮料",
        ],
        "高血压": [
            "每日食盐摄入量控制在6克以内",
            "增加钾的摄入（香蕉、菠菜、土豆）",
            "减少饱和脂肪和反式脂肪摄入",
            "适量摄入富含钙和镁的食物",
        ],
        "高血脂": [
            "减少动物内脏和蛋黄摄入",
            "增加膳食纤维（燕麦、豆类、蔬菜）",
            "选择不饱和脂肪酸（橄榄油、深海鱼）",
            "限制反式脂肪食品（油炸、糕点）",
        ],
        "痛风": [
            "限制高嘌呤食物（内脏、海鲜、浓汤）",
            "避免饮酒，尤其是啤酒",
            "多饮水，每日2000ml以上",
            "增加碱性食物摄入（蔬菜、水果）",
        ],
    }

    # ── 运动建议规则 ──
    EXERCISE_RULES = {
        "糖尿病": [
            ("有氧运动", "每周150分钟中等强度", "快走、游泳、骑自行车"),
            ("抗阻训练", "每周2-3次", "弹力带、哑铃"),
            ("注意事项", "运动前后监测血糖", "避免空腹运动"),
        ],
        "高血压": [
            ("有氧运动", "每周150分钟中等强度", "快走、太极拳、游泳"),
            ("等长运动", "每周3次", "握力训练"),
            ("注意事项", "避免憋气和高强度运动", "循序渐进"),
        ],
        "冠心病": [
            ("有氧运动", "每周150分钟低-中等强度", "步行、骑自行车"),
            ("注意事项", "运动前后热身和放松", "随身携带硝酸甘油"),
        ],
    }

    def __init__(self):
        self._goals: Dict[str, LifestyleGoal] = {}

    def get_diet_advice(self, conditions: List[str]) -> Dict[str, Any]:
        """根据疾病获取饮食建议"""
        advice = {}
        for cond in conditions:
            if cond in self.DIET_RULES:
                advice[cond] = self.DIET_RULES[cond]
        if not advice:
            advice["通用"] = [
                "均衡饮食，多样化食物",
                "每日蔬果摄入不少于500克",
                "控制油盐糖摄入",
                "适量饮水，每日1500-1700ml",
            ]
        return {"conditions": conditions, "diet_advice": advice}

    def get_exercise_plan(self, conditions: List[str], age: int = 50) -> Dict[str, Any]:
        """根据疾病和年龄生成运动方案"""
        plans = {}
        for cond in conditions:
            if cond in self.EXERCISE_RULES:
                plans[cond] = [
                    {"type": t, "frequency": f, "examples": e}
                    for t, f, e in self.EXERCISE_RULES[cond]
                ]
        if not plans:
            intensity = "低强度" if age > 65 else "中等强度"
            plans["通用"] = [
                {"type": "有氧运动", "frequency": f"每周150分钟{intensity}", "examples": "快走、游泳、太极拳"},
                {"type": "柔韧性训练", "frequency": "每日10-15分钟", "examples": "拉伸、瑜伽"},
            ]
        return {"conditions": conditions, "age": age, "exercise_plans": plans}

    def get_sleep_advice(self) -> List[str]:
        return [
            "保持规律作息，每晚7-8小时睡眠",
            "睡前避免使用电子设备",
            "保持卧室安静、黑暗、适宜温度",
            "避免睡前饮酒和咖啡因",
            "如有失眠持续超过2周，建议就医",
        ]

    def create_goal(self, data: Dict[str, Any]) -> Dict[str, Any]:
        goal = LifestyleGoal(
            goal_id=data.get("goal_id", ""),
            patient_id=data["patient_id"],
            category=data["category"],
            target=data.get("target", ""),
            current_value=data.get("current_value", ""),
            target_value=data.get("target_value", ""),
            unit=data.get("unit", ""),
            deadline=data.get("deadline", ""),
        )
        self._goals[goal.goal_id] = goal
        return asdict(goal)

    def update_goal_progress(self, goal_id: str, current_value: str) -> Optional[Dict[str, Any]]:
        goal = self._goals.get(goal_id)
        if not goal:
            return None
        goal.current_value = current_value
        return asdict(goal)

    def get_patient_goals(self, patient_id: str) -> List[Dict[str, Any]]:
        return [asdict(g) for g in self._goals.values() if g.patient_id == patient_id]

    def generate_daily_plan(self, patient_id: str, conditions: List[str]) -> Dict[str, Any]:
        """生成每日健康计划"""
        return {
            "patient_id": patient_id,
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "morning": [
                "07:00 起床，测量血压/血糖",
                "07:30 早餐（低GI食物为主）",
                "08:00 服药",
            ],
            "noon": [
                "12:00 午餐（控制盐分摄入）",
                "12:30 服药（如需）",
                "13:00 午休30分钟",
            ],
            "afternoon": [
                "15:00 适量运动（30分钟快走）",
                "16:00 加餐（水果/坚果）",
            ],
            "evening": [
                "18:00 晚餐（清淡为主）",
                "19:00 服药",
                "21:00 记录当日健康数据",
                "22:00 准备入睡",
            ],
            "conditions": conditions,
        }
