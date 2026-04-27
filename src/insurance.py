"""慢康智枢 — 医保对接模块"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class InsuranceCard:
    """医保卡信息"""
    card_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str = ""
    card_number: str = ""
    insurance_type: str = ""  # 城镇职工 / 城镇居民 / 新农合 / 商业保险
    insured_area: str = ""
    account_balance: float = 0.0
    status: str = "active"
    expiry_date: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class InsuranceClaim:
    """医保报销申请"""
    claim_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str = ""
    card_id: str = ""
    order_id: str = ""
    total_amount: float = 0.0
    reimbursable_amount: float = 0.0
    reimbursement_amount: float = 0.0
    self_pay_amount: float = 0.0
    reimbursement_rate: float = 0.0
    status: str = "pending"  # pending / approved / rejected / paid
    reject_reason: str = ""
    processed_at: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


class InsuranceService:
    """医保对接服务"""

    # 模拟报销比例
    REIMBURSEMENT_RATES = {
        "城镇职工": {"门诊": 0.70, "住院": 0.85, "慢病": 0.80},
        "城镇居民": {"门诊": 0.50, "住院": 0.70, "慢病": 0.60},
        "新农合":   {"门诊": 0.45, "住院": 0.65, "慢病": 0.55},
    }

    # 慢病药品医保目录（示例）
    DRUG_FORMULARY = {
        "二甲双胍": {"reimbursable": True, "category": "甲类"},
        "阿卡波糖": {"reimbursable": True, "category": "乙类"},
        "缬沙坦":   {"reimbursable": True, "category": "甲类"},
        "氨氯地平": {"reimbursable": True, "category": "甲类"},
        "阿托伐他汀": {"reimbursable": True, "category": "乙类"},
        "阿司匹林": {"reimbursable": True, "category": "甲类"},
        "胰岛素":   {"reimbursable": True, "category": "甲类"},
    }

    def __init__(self):
        self._cards: Dict[str, InsuranceCard] = {}
        self._claims: Dict[str, InsuranceClaim] = {}

    def bind_card(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """绑定医保卡"""
        card = InsuranceCard(
            patient_id=data["patient_id"],
            card_number=data["card_number"],
            insurance_type=data["insurance_type"],
            insured_area=data.get("insured_area", ""),
            account_balance=data.get("account_balance", 0.0),
            expiry_date=data.get("expiry_date", ""),
        )
        self._cards[card.card_id] = card
        return asdict(card)

    def get_patient_cards(self, patient_id: str) -> List[Dict[str, Any]]:
        return [asdict(c) for c in self._cards.values() if c.patient_id == patient_id]

    def check_drug_coverage(self, drug_name: str, insurance_type: str) -> Dict[str, Any]:
        """查询药品医保覆盖情况"""
        formulary = self.DRUG_FORMULARY.get(drug_name)
        if not formulary:
            return {"drug_name": drug_name, "reimbursable": False, "reason": "不在医保目录内"}
        rates = self.REIMBURSEMENT_RATES.get(insurance_type, {})
        return {
            "drug_name": drug_name,
            "reimbursable": formulary["reimbursable"],
            "category": formulary["category"],
            "reimbursement_rate": rates.get("慢病", 0),
        }

    def submit_claim(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """提交报销申请"""
        card = self._cards.get(data.get("card_id", ""))
        if not card:
            return {"error": "医保卡不存在"}

        insurance_type = card.insurance_type
        visit_type = data.get("visit_type", "慢病")
        total_amount = float(data.get("total_amount", 0))
        items = data.get("items", [])

        # 计算可报销金额
        reimbursable = 0.0
        for item in items:
            drug = item.get("drug_name", "")
            amount = float(item.get("amount", 0))
            formulary = self.DRUG_FORMULARY.get(drug, {})
            if formulary.get("reimbursable", False):
                reimbursable += amount

        rate = self.REIMBURSEMENT_RATES.get(insurance_type, {}).get(visit_type, 0)
        reimbursement = round(reimbursable * rate, 2)
        self_pay = round(total_amount - reimbursement, 2)

        claim = InsuranceClaim(
            patient_id=data["patient_id"],
            card_id=data["card_id"],
            order_id=data.get("order_id", ""),
            total_amount=total_amount,
            reimbursable_amount=reimbursable,
            reimbursement_amount=reimbursement,
            self_pay_amount=self_pay,
            reimbursement_rate=rate,
        )
        self._claims[claim.claim_id] = claim
        return asdict(claim)

    def process_claim(self, claim_id: str, approved: bool, reason: str = "") -> Optional[Dict[str, Any]]:
        claim = self._claims.get(claim_id)
        if not claim:
            return None
        claim.status = "approved" if approved else "rejected"
        claim.reject_reason = reason if not approved else ""
        claim.processed_at = datetime.utcnow().isoformat()
        return asdict(claim)

    def get_claim(self, claim_id: str) -> Optional[Dict[str, Any]]:
        claim = self._claims.get(claim_id)
        return asdict(claim) if claim else None

    def get_patient_claims(self, patient_id: str) -> List[Dict[str, Any]]:
        claims = [c for c in self._claims.values() if c.patient_id == patient_id]
        claims.sort(key=lambda c: c.created_at, reverse=True)
        return [asdict(c) for c in claims]

    def get_reimbursement_summary(self, patient_id: str) -> Dict[str, Any]:
        claims = [c for c in self._claims.values() if c.patient_id == patient_id]
        total_claimed = sum(c.total_amount for c in claims)
        total_reimbursed = sum(c.reimbursement_amount for c in claims if c.status == "approved")
        return {
            "patient_id": patient_id,
            "total_claims": len(claims),
            "total_claimed_amount": round(total_claimed, 2),
            "total_reimbursed_amount": round(total_reimbursed, 2),
            "self_pay_total": round(total_claimed - total_reimbursed, 2),
        }
