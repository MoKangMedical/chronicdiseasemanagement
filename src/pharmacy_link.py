"""慢康智枢 — 药房对接模块"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class PharmacyOrder:
    """药房订单"""
    order_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str = ""
    prescription_id: str = ""
    pharmacy_id: str = ""
    items: List[Dict[str, Any]] = field(default_factory=list)
    total_amount: float = 0.0
    status: str = "pending"  # pending / confirmed / dispensing / delivered / cancelled
    delivery_method: str = "self_pickup"  # self_pickup / delivery
    delivery_address: str = ""
    notes: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


class PharmacyLinkService:
    """药房对接服务"""

    # 模拟药房药品目录
    DRUG_CATALOG = {
        "二甲双胍": {"spec": "500mg*20片", "price": 12.5, "stock": 500},
        "阿卡波糖": {"spec": "50mg*30片", "price": 35.0, "stock": 300},
        "缬沙坦": {"spec": "80mg*7片", "price": 28.0, "stock": 200},
        "氨氯地平": {"spec": "5mg*14片", "price": 22.0, "stock": 400},
        "阿托伐他汀": {"spec": "20mg*7片", "price": 42.0, "stock": 350},
        "阿司匹林": {"spec": "100mg*30片", "price": 15.0, "stock": 600},
        "华法林": {"spec": "2.5mg*100片", "price": 18.0, "stock": 150},
        "胰岛素": {"spec": "3ml*1支", "price": 68.0, "stock": 100},
    }

    def __init__(self):
        self._orders: Dict[str, PharmacyOrder] = {}

    def search_drug(self, keyword: str) -> List[Dict[str, Any]]:
        """搜索药品"""
        results = []
        for name, info in self.DRUG_CATALOG.items():
            if keyword in name:
                results.append({"drug_name": name, **info})
        return results

    def check_availability(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """检查药品库存"""
        available = []
        unavailable = []
        for item in items:
            drug_name = item.get("drug_name", "")
            quantity = item.get("quantity", 1)
            catalog = self.DRUG_CATALOG.get(drug_name)
            if catalog and catalog["stock"] >= quantity:
                available.append({
                    "drug_name": drug_name,
                    "quantity": quantity,
                    "unit_price": catalog["price"],
                    "subtotal": catalog["price"] * quantity,
                })
            else:
                unavailable.append({"drug_name": drug_name, "quantity": quantity})
        return {"available": available, "unavailable": unavailable}

    def create_order(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """创建药房订单"""
        items = data.get("items", [])
        availability = self.check_availability(items)
        if availability["unavailable"]:
            return {"error": "部分药品库存不足", "unavailable": availability["unavailable"]}

        total = sum(item["subtotal"] for item in availability["available"])
        order = PharmacyOrder(
            patient_id=data["patient_id"],
            prescription_id=data.get("prescription_id", ""),
            pharmacy_id=data.get("pharmacy_id", ""),
            items=availability["available"],
            total_amount=total,
            delivery_method=data.get("delivery_method", "self_pickup"),
            delivery_address=data.get("delivery_address", ""),
            notes=data.get("notes", ""),
        )
        self._orders[order.order_id] = order
        return asdict(order)

    def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        order = self._orders.get(order_id)
        return asdict(order) if order else None

    def get_patient_orders(self, patient_id: str) -> List[Dict[str, Any]]:
        orders = [o for o in self._orders.values() if o.patient_id == patient_id]
        orders.sort(key=lambda o: o.created_at, reverse=True)
        return [asdict(o) for o in orders]

    def update_order_status(self, order_id: str, status: str) -> Optional[Dict[str, Any]]:
        order = self._orders.get(order_id)
        if not order:
            return None
        order.status = status
        return asdict(order)

    def cancel_order(self, order_id: str, reason: str = "") -> Optional[Dict[str, Any]]:
        order = self._orders.get(order_id)
        if not order:
            return None
        order.status = "cancelled"
        order.notes = f"取消原因: {reason}" if reason else order.notes
        return asdict(order)

    def get_drug_info(self, drug_name: str) -> Optional[Dict[str, Any]]:
        """获取药品详细信息"""
        catalog = self.DRUG_CATALOG.get(drug_name)
        if not catalog:
            return None
        return {
            "drug_name": drug_name,
            "spec": catalog["spec"],
            "price": catalog["price"],
            "stock": catalog["stock"],
            "manufacturer": "示例药厂",
            "category": "处方药",
            "storage": "密封，阴凉处保存",
        }

    def get_order_statistics(self) -> Dict[str, Any]:
        orders = list(self._orders.values())
        status_count = {}
        total_revenue = 0.0
        for o in orders:
            status_count[o.status] = status_count.get(o.status, 0) + 1
            if o.status not in ("cancelled",):
                total_revenue += o.total_amount
        return {
            "total_orders": len(orders),
            "by_status": status_count,
            "total_revenue": round(total_revenue, 2),
        }
