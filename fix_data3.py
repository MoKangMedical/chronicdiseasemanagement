#!/usr/bin/env python3
"""Fix remaining data compatibility issues (Round 3) - interventionProjection & improvementRecords."""
import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))

print("=" * 60)
print("ROUND 3 FIXES - population-cohort.json patients")
print("=" * 60)

with open(os.path.join(BASE, 'public/demo-data/population-cohort.json'), 'r', encoding='utf-8') as f:
    cohort = json.load(f)

changes = 0

for patient in cohort['patients']:
    ip = patient.get('interventionProjection', {})

    # Fix timelineCheckpoints - must be an array
    tc = ip.get('timelineCheckpoints')
    if not isinstance(tc, list):
        base_before = ip.get('beforeOverallScore', 70)
        base_after = ip.get('afterOverallScore', 55)
        ip['timelineCheckpoints'] = [
            {
                'week': 0,
                'label': '基线',
                'overallScore': base_before,
                'overallLevel': 'high' if base_before >= 70 else ('medium' if base_before >= 40 else 'low'),
                'radar': ip.get('beforeRadar', {}),
                'keyChanges': ['初始评估完成', '风险分层确定']
            },
            {
                'week': 4,
                'label': '4周',
                'overallScore': round(base_before - (base_before - base_after) * 0.3, 1),
                'overallLevel': 'medium',
                'radar': ip.get('afterRadar', {}),
                'keyChanges': ['用药方案调整', '首次随访完成']
            },
            {
                'week': 8,
                'label': '8周',
                'overallScore': round(base_before - (base_before - base_after) * 0.65, 1),
                'overallLevel': 'medium',
                'radar': ip.get('afterRadar', {}),
                'keyChanges': ['指标改善趋势', '生活方式干预']
            },
            {
                'week': 12,
                'label': '12周',
                'overallScore': base_after,
                'overallLevel': 'low' if base_after < 40 else 'medium',
                'radar': ip.get('afterRadar', {}),
                'keyChanges': ['目标达成评估', '长期管理方案']
            }
        ]
        changes += 1
        if patient['id'] in ('pat-001', 'pat-002'):
            print(f"  Added timelineCheckpoints for {patient['id']}")

    # Fix recommendations - must be an array
    recs = ip.get('recommendations')
    if not isinstance(recs, list):
        ip['recommendations'] = [
            '定期监测血压，每日早晚各一次',
            '按时服药，不可自行调量',
            '低盐低脂饮食，适量运动',
            '下次随访前完成相关检验'
        ]
        changes += 1
        if patient['id'] == 'pat-001':
            print(f"  Added recommendations for {patient['id']}")

    # Fix improvementRecords - must be an array
    ir = patient.get('improvementRecords')
    if not isinstance(ir, list):
        patient['improvementRecords'] = [
            {'week': 4, 'explanation': '血压控制改善，收缩压下降10mmHg'},
            {'week': 8, 'explanation': '血糖达标率提升，HbA1c下降0.5%'},
            {'week': 12, 'explanation': '综合风险评分降低，管理效果显著'}
        ]
        changes += 1
        if patient['id'] == 'pat-001':
            print(f"  Added improvementRecords for {patient['id']}")

    # Fix checkpoints (used in some views)
    cp = patient.get('checkpoints')
    if not isinstance(cp, list):
        patient['checkpoints'] = ip.get('timelineCheckpoints', [])
        changes += 1

print(f"\nTotal Round 3 changes: {changes}")

with open(os.path.join(BASE, 'public/demo-data/population-cohort.json'), 'w', encoding='utf-8') as f:
    json.dump(cohort, f, ensure_ascii=False, indent=2)

# Copy to docs
import shutil
shutil.copy2(
    os.path.join(BASE, 'public/demo-data/population-cohort.json'),
    os.path.join(BASE, 'docs/demo-data/population-cohort.json')
)
print("Copied to docs/demo-data/")

# Verification
with open(os.path.join(BASE, 'public/demo-data/population-cohort.json'), 'r') as f:
    v = json.load(f)
p0 = v['patients'][0]
ip = p0['interventionProjection']
print(f"\nVerification:")
print(f"  timelineCheckpoints type: {type(ip['timelineCheckpoints']).__name__}, len: {len(ip['timelineCheckpoints'])}")
print(f"  timelineCheckpoints[0].week: {ip['timelineCheckpoints'][0]['week']}")
print(f"  recommendations type: {type(ip['recommendations']).__name__}, len: {len(ip['recommendations'])}")
print(f"  improvementRecords type: {type(p0['improvementRecords']).__name__}, len: {len(p0['improvementRecords'])}")
print(f"\nROUND 3 FIXES COMPLETE")
