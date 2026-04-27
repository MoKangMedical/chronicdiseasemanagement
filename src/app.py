"""
🏥 慢康智枢 — Streamlit 原型界面
慢病管理平台 · 风险评估 · 随访管理 · 数据分析

使用方式：
    pip install streamlit
    streamlit run src/app.py
"""

import streamlit as st
import json
import sys
from pathlib import Path
from datetime import datetime

# 添加 src 到路径
sys.path.insert(0, str(Path(__file__).parent))

st.set_page_config(
    page_title="🏥 慢康智枢 — 慢病管理平台",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 自定义 CSS
st.markdown("""
<style>
    .main { background: linear-gradient(180deg, #f0f4f8 0%, #e8edf2 100%); }
    .metric-card {
        background: white; border-radius: 12px; padding: 1.2rem;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06); text-align: center;
    }
    .metric-value { font-size: 2rem; font-weight: bold; color: #1a73e8; }
    .metric-label { color: #666; font-size: 0.9rem; }
    .risk-high { color: #d32f2f; font-weight: bold; }
    .risk-medium { color: #f57c00; font-weight: bold; }
    .risk-low { color: #388e3c; font-weight: bold; }
    .stTabs [data-baseweb="tab-list"] { gap: 8px; }
    .stTabs [data-baseweb="tab"] { border-radius: 8px; padding: 8px 16px; }
</style>
""", unsafe_allow_html=True)


# ============================================================
# 数据加载
# ============================================================

@st.cache_data
def load_disease_models():
    path = Path(__file__).parent.parent / "data" / "disease-models.json"
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


# ============================================================
# 页面：首页概览
# ============================================================

def page_dashboard():
    st.markdown("## 📊 管理概览")

    # 核心指标
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown('<div class="metric-card"><div class="metric-value">1,280</div><div class="metric-label">管理患者数</div></div>', unsafe_allow_html=True)
    with col2:
        st.markdown('<div class="metric-card"><div class="metric-value">89.2%</div><div class="metric-label">随访完成率</div></div>', unsafe_allow_html=True)
    with col3:
        st.markdown('<div class="metric-card"><div class="metric-value">76.5%</div><div class="metric-label">血压控制率</div></div>', unsafe_allow_html=True)
    with col4:
        st.markdown('<div class="metric-card"><div class="metric-value">68.3%</div><div class="metric-label">血糖控制率</div></div>', unsafe_allow_html=True)

    st.markdown("---")

    # 风险分布
    col_a, col_b = st.columns(2)
    with col_a:
        st.markdown("### 🎯 风险等级分布")
        risk_data = {"低危": 520, "中危": 480, "高危": 280}
        st.bar_chart(risk_data)

    with col_b:
        st.markdown("### 🏥 疾病类型分布")
        disease_data = {"高血压": 450, "2型糖尿病": 380, "冠心病": 220, "COPD": 130, "慢性肾病": 100}
        st.bar_chart(disease_data)

    # 待办事项
    st.markdown("### 📋 今日待办")
    st.info("🔔 12 名高危患者待随访 | ⚠️ 3 名患者逾期未随访 | 📊 月度报告待生成")


# ============================================================
# 页面：风险评估
# ============================================================

def page_risk_assessment():
    st.markdown("## 🎯 风险评估")

    models = load_disease_models()
    disease_options = {m["name"]: m["id"] for m in models}

    with st.form("risk_form"):
        col1, col2 = st.columns(2)
        with col1:
            patient_name = st.text_input("患者姓名", "张三")
            age = st.number_input("年龄", 30, 100, 62)
            gender = st.selectbox("性别", ["男", "女"])
            disease_name = st.selectbox("疾病类型", list(disease_options.keys()))

        with col2:
            sbp = st.number_input("收缩压 (mmHg)", 80, 250, 145)
            dbp = st.number_input("舒张压 (mmHg)", 40, 150, 92)
            bmi = st.number_input("BMI", 15.0, 50.0, 26.5)
            hba1c = st.number_input("HbA1c (%)", 4.0, 15.0, 7.2)

        col3, col4 = st.columns(2)
        with col3:
            smoking = st.checkbox("吸烟")
            family_history = st.checkbox("家族史")
        with col4:
            exercise = st.selectbox("运动习惯", ["规律运动", "偶尔运动", "久坐不动"])

        submitted = st.form_submit_button("🔍 评估风险", use_container_width=True)

    if submitted:
        # 模拟评分
        score = 0
        details = []
        if sbp >= 160:
            score += 30
            details.append(f"收缩压 {sbp} mmHg（偏高）")
        elif sbp >= 140:
            score += 15
            details.append(f"收缩压 {sbp} mmHg（临界）")
        if bmi >= 28:
            score += 15
            details.append(f"BMI {bmi}（肥胖）")
        elif bmi >= 24:
            score += 8
            details.append(f"BMI {bmi}（超重）")
        if hba1c > 7:
            score += 20
            details.append(f"HbA1c {hba1c}%（控制不佳）")
        if smoking:
            score += 10
            details.append("吸烟")
        if family_history:
            score += 10
            details.append("家族史")
        if exercise == "久坐不动":
            score += 8
            details.append("缺乏运动")

        score = min(score, 100)
        if score >= 60:
            level = "高危"
            level_class = "risk-high"
        elif score >= 30:
            level = "中危"
            level_class = "risk-medium"
        else:
            level = "低危"
            level_class = "risk-low"

        st.markdown("---")
        st.markdown(f"### 评估结果：{patient_name}")
        c1, c2, c3 = st.columns(3)
        with c1:
            st.metric("风险评分", f"{score}/100")
        with c2:
            st.markdown(f'<p class="{level_class}" style="font-size:1.5rem;">风险等级：{level}</p>', unsafe_allow_html=True)
        with c3:
            st.metric("评估置信度", "85%")

        st.markdown("**风险因子：**")
        for d in details:
            st.markdown(f"- ⚠️ {d}")

        st.markdown("**干预建议：**")
        if level == "高危":
            st.error("🏥 建议尽快专科就诊，联合用药+强化管理")
            st.warning("📋 缩短随访周期至 1-2 周")
        elif level == "中危":
            st.warning("💊 药物治疗 + 生活方式干预")
            st.info("📅 定期随访，周期 2-4 周")
        else:
            st.success("🏃 生活方式干预为主")
            st.info("📅 常规随访，周期 3 个月")


# ============================================================
# 页面：随访管理
# ============================================================

def page_follow_up():
    st.markdown("## 📋 随访管理")

    tab1, tab2, tab3 = st.tabs(["待办随访", "随访记录", "新建计划"])

    with tab1:
        st.markdown("### 今日待办")
        tasks = [
            {"患者": "张三", "疾病": "高血压", "类型": "电话随访", "时间": "2026-04-26", "状态": "待完成"},
            {"患者": "李四", "疾病": "糖尿病", "类型": "门诊随访", "时间": "2026-04-26", "状态": "待完成"},
            {"患者": "王五", "疾病": "冠心病", "类型": "线上随访", "时间": "2026-04-25", "状态": "逾期"},
        ]
        st.dataframe(tasks, use_container_width=True)

    with tab2:
        st.markdown("### 随访历史")
        st.info("共完成 328 次随访，本月完成 42 次")
        records = [
            {"患者": "赵六", "疾病": "高血压", "日期": "2026-04-20", "结果": "血压控制良好"},
            {"患者": "钱七", "疾病": "糖尿病", "日期": "2026-04-19", "结果": "HbA1c 降至 6.8%"},
        ]
        st.dataframe(records, use_container_width=True)

    with tab3:
        st.markdown("### 新建随访计划")
        with st.form("plan_form"):
            col1, col2 = st.columns(2)
            with col1:
                p_name = st.text_input("患者姓名")
                p_disease = st.selectbox("疾病", ["高血压", "2型糖尿病", "冠心病", "COPD", "慢性肾病"])
            with col2:
                p_risk = st.selectbox("风险等级", ["高危（2周）", "中危（1月）", "低危（3月）"])
                p_duration = st.selectbox("计划时长", ["3个月", "6个月", "12个月"])
            if st.form_submit_button("📋 生成计划"):
                st.success("✅ 随访计划已生成！")


# ============================================================
# 页面：数据分析
# ============================================================

def page_data_analysis():
    st.markdown("## 📈 数据分析")

    tab1, tab2, tab3 = st.tabs(["控制率分析", "趋势分析", "质量报告"])

    with tab1:
        st.markdown("### 慢病控制率")
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("高血压控制率", "76.5%", "↑2.3%")
        with col2:
            st.metric("血糖控制率", "68.3%", "↑1.5%")
        with col3:
            st.metric("血脂控制率", "58.2%", "↓0.8%")

    with tab2:
        st.markdown("### 人群趋势")
        st.line_chart({
            "血压达标率": [72, 74, 75, 76, 76.5, 77],
            "血糖达标率": [65, 66, 67, 67.5, 68, 68.3],
        })

    with tab3:
        st.markdown("### 月度质量报告")
        st.json({
            "随访完成率": "89.2%",
            "按时完成率": "82.5%",
            "逾期率": "5.8%",
            "患者满意度": "4.2/5.0",
        })


# ============================================================
# 页面：疾病知识
# ============================================================

def page_disease_knowledge():
    st.markdown("## 📚 疾病知识库")
    models = load_disease_models()

    for m in models:
        with st.expander(f"🏥 {m['name']} ({m.get('name_en', '')})"):
            st.markdown(f"**风险因素：** {', '.join(m.get('risk_factors', []))}")

            st.markdown("**风险分层：**")
            for level in m.get("risk_levels", []):
                level_name = level.get("level", "")
                criteria = {k: v for k, v in level.items() if k not in ("level", "intervention")}
                intervention = level.get("intervention", "")
                criteria_str = ", ".join(f"{k}: {v}" for k, v in criteria.items())
                st.markdown(f"- **{level_name}** ({criteria_str}) → {intervention}")

            st.markdown(f"**干预规则：** {', '.join(m.get('intervention_rules', []))}")


# ============================================================
# 主程序
# ============================================================

def main():
    with st.sidebar:
        st.markdown("## 🏥 慢康智枢")
        st.markdown("慢病管理智慧平台")
        page = st.radio("导航", [
            "📊 管理概览",
            "🎯 风险评估",
            "📋 随访管理",
            "📈 数据分析",
            "📚 疾病知识",
        ], label_visibility="collapsed")

    if "管理概览" in page:
        page_dashboard()
    elif "风险评估" in page:
        page_risk_assessment()
    elif "随访管理" in page:
        page_follow_up()
    elif "数据分析" in page:
        page_data_analysis()
    elif "疾病知识" in page:
        page_disease_knowledge()


if __name__ == "__main__":
    main()
