#!/usr/bin/env python3
"""Fix remaining data compatibility issues (Round 2)."""
import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))

print("=" * 60)
print("ROUND 2 FIXES - population-cohort.json")
print("=" * 60)

with open(os.path.join(BASE, 'public/demo-data/population-cohort.json'), 'r', encoding='utf-8') as f:
    cohort = json.load(f)

changes = []

# Fix A: publicProfile - add totalPopulation
print("\n--- Fix A: publicProfile.totalPopulation ---")
pp = cohort.get('publicProfile', {})
if 'totalPopulation' not in pp:
    pp['totalPopulation'] = cohort.get('population', 680000)
    changes.append(f"publicProfile: added totalPopulation={pp['totalPopulation']}")
    print(f"  Added totalPopulation={pp['totalPopulation']}")

# Fix B: referralMetrics - add missing fields
print("\n--- Fix B: referralMetrics ---")
rm = cohort.get('referralMetrics', {})
if 'closedLoopRate' not in rm:
    rm['closedLoopRate'] = '72.5%'
    changes.append(f"referralMetrics: added closedLoopRate={rm['closedLoopRate']}")
    print(f"  Added closedLoopRate={rm['closedLoopRate']}")
if 'referralCompletedCount' not in rm:
    rm['referralCompletedCount'] = rm.get('completed', 180)
    changes.append(f"referralMetrics: added referralCompletedCount={rm['referralCompletedCount']}")
    print(f"  Added referralCompletedCount={rm['referralCompletedCount']}")
if 'referralSuggestedCount' not in rm:
    rm['referralSuggestedCount'] = rm.get('total', 220)
    changes.append(f"referralMetrics: added referralSuggestedCount={rm['referralSuggestedCount']}")
    print(f"  Added referralSuggestedCount={rm['referralSuggestedCount']}")

# Fix C: modelGovernance - restructure to match code expectations
print("\n--- Fix C: modelGovernance ---")
mg = cohort.get('modelGovernance', {})
old_mg = dict(mg)
cohort['modelGovernance'] = {
    'modelCount': 6,
    'consensusScore': 82.3,
    'disagreementRate': '8.5%',
    'stableModelCount': 4,
    'watchModelCount': 1,
    'investigateModelCount': 1,
    'items': [
        {
            'model': 'Disease-Text-BERT',
            'governanceStatus': 'stable',
            'note': '文本特征提取模型，AUC 0.91，持续稳定',
            'averageScore': 89.2,
            'sampleCount': 4440,
            'features': ['病历文本', '检验报告', '用药记录']
        },
        {
            'model': 'TemporAI-v2',
            'governanceStatus': 'stable',
            'note': '时序风险预测模型，AUC 0.87，表现稳定',
            'averageScore': 85.6,
            'sampleCount': 4440,
            'features': ['血压时序', '血糖时序', '用药依从性']
        },
        {
            'model': 'PyHealth-Surv',
            'governanceStatus': 'stable',
            'note': '生存分析模型，C-index 0.78',
            'averageScore': 78.4,
            'sampleCount': 3200,
            'features': ['年龄', '合并症', '治疗方案']
        },
        {
            'model': 'RiskNet-v3',
            'governanceStatus': 'stable',
            'note': '深度风险网络，AUC 0.84',
            'averageScore': 81.0,
            'sampleCount': 4440,
            'features': ['多模态融合', '图神经网络']
        },
        {
            'model': 'AdaCare-OLD',
            'governanceStatus': 'watch',
            'note': '旧版注意力模型，性能下降趋势',
            'averageScore': 68.5,
            'sampleCount': 2200,
            'features': ['诊断编码', '检验值']
        },
        {
            'model': 'Legacy-Rule-Engine',
            'governanceStatus': 'investigate',
            'note': '规则引擎，与ML模型分歧率高',
            'averageScore': 55.2,
            'sampleCount': 4440,
            'features': ['临床规则', '阈值判断']
        }
    ]
}
changes.append("modelGovernance: restructured with modelCount, items, etc.")
print(f"  Restructured modelGovernance with 6 items")

# Fix D: roleWorkload - restructure to match code expectations
print("\n--- Fix D: roleWorkload ---")
old_rw = cohort.get('roleWorkload', [])
new_rw = []
role_map = {
    'specialist': {'roleLabel': '专科医生', 'role': 'specialist'},
    'gp': {'roleLabel': '全科医生', 'role': 'general-practitioner'},
    'nurse': {'roleLabel': '护理团队', 'role': 'nurse'},
    'manager': {'roleLabel': '健康管理师', 'role': 'health-manager'},
    'pharmacist': {'roleLabel': '药师团队', 'role': 'pharmacist'},
}
for i, item in enumerate(old_rw):
    role = item.get('role', f'role-{i}')
    mapping = role_map.get(role, {'roleLabel': role, 'role': role})
    new_item = {
        'role': mapping['role'],
        'roleLabel': mapping['roleLabel'],
        'clinicianCount': item.get('totalStaff', max(3, round(item.get('totalPatients', 100) / 150))),
        'patientCount': item.get('totalPatients', 500),
        'overdueTaskCount': max(0, round(item.get('totalPatients', 500) * 0.05)),
        'atRiskTaskCount': max(0, round(item.get('totalPatients', 500) * 0.08)),
        'averagePatientsPerClinician': round(item.get('avgPatientsPerDay', 15) * 10),
        'pressureIndex': round(item.get('avgPatientsPerDay', 15) / 10, 1),
        'topClinicians': [
            {'clinicianName': '张伟', 'patientCount': round(item.get('totalPatients', 500) * 0.3)},
            {'clinicianName': '李明', 'patientCount': round(item.get('totalPatients', 500) * 0.25)},
        ]
    }
    new_rw.append(new_item)
    if i < 2:
        print(f"  {new_item['roleLabel']}: {new_item['patientCount']} patients, {new_item['clinicianCount']} clinicians")

cohort['roleWorkload'] = new_rw
changes.append(f"roleWorkload: restructured {len(new_rw)} items with roleLabel, clinicianCount, etc.")

print(f"\nTotal Round 2 changes: {len(changes)}")

with open(os.path.join(BASE, 'public/demo-data/population-cohort.json'), 'w', encoding='utf-8') as f:
    json.dump(cohort, f, ensure_ascii=False, indent=2)

# Copy to docs
import shutil
docs_dir = os.path.join(BASE, 'docs/demo-data')
os.makedirs(docs_dir, exist_ok=True)
shutil.copy2(os.path.join(BASE, 'public/demo-data/population-cohort.json'), os.path.join(docs_dir, 'population-cohort.json'))
print("\nCopied to docs/demo-data/")

# Verification
print("\n" + "=" * 60)
print("VERIFICATION")
print("=" * 60)
with open(os.path.join(BASE, 'public/demo-data/population-cohort.json'), 'r') as f:
    v = json.load(f)
print(f"publicProfile.totalPopulation = {v['publicProfile'].get('totalPopulation', 'MISSING')}")
print(f"referralMetrics.closedLoopRate = {v['referralMetrics'].get('closedLoopRate', 'MISSING')}")
print(f"modelGovernance.modelCount = {v['modelGovernance'].get('modelCount', 'MISSING')}")
print(f"modelGovernance.items type = {type(v['modelGovernance'].get('items')).__name__}, len = {len(v['modelGovernance'].get('items', []))}")
print(f"roleWorkload[0].roleLabel = {v['roleWorkload'][0].get('roleLabel', 'MISSING')}")
print(f"roleWorkload[0].topClinicians type = {type(v['roleWorkload'][0].get('topClinicians')).__name__}")
print(f"roleWorkload[0].clinicianCount = {v['roleWorkload'][0].get('clinicianCount', 'MISSING')}")

print("\nROUND 2 FIXES COMPLETE")
