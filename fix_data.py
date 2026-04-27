#!/usr/bin/env python3
"""Fix data compatibility issues in chronic disease management demo data."""
import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))

print("=" * 60)
print("FIXING population-cohort.json")
print("=" * 60)

with open(os.path.join(BASE, 'public/demo-data/population-cohort.json'), 'r', encoding='utf-8') as f:
    cohort = json.load(f)

changes = []

# Fix 1: domainPrevalence - add 'label' field
print("\n--- Fix 1: domainPrevalence ---")
for item in cohort['domainPrevalence']:
    if 'label' not in item:
        item['label'] = item.get('domain', '未知')
        changes.append(f"domainPrevalence: added label={item['label']}")
        print(f"  Added label={item['label']} to domainPrevalence item")

# Fix 2: coordinationFunnel - wrap as {stages: [...]} with label and rate
print("\n--- Fix 2: coordinationFunnel ---")
old_funnel = cohort['coordinationFunnel']
if isinstance(old_funnel, list):
    stages = []
    for item in old_funnel:
        stage = {
            'stage': item.get('stage', '未知'),
            'label': item.get('stage', '未知'),
            'count': item.get('count', 0),
            'rate': item.get('rate', '0%')
        }
        stages.append(stage)
    cohort['coordinationFunnel'] = {'stages': stages}
    changes.append(f"coordinationFunnel: wrapped list as {{stages: [...]}} with label/rate")
    print(f"  Wrapped {len(stages)} items into coordinationFunnel.stages")
    for s in stages:
        print(f"    stage={s['stage']}, label={s['label']}, count={s['count']}, rate={s['rate']}")

# Fix 3: hospitalPerformanceRanking - add 'label' to topDomains
print("\n--- Fix 3: hospitalPerformanceRanking topDomains ---")
for item in cohort['hospitalPerformanceRanking']:
    for td in item.get('topDomains', []):
        if 'label' not in td:
            td['label'] = td.get('name', '未知')
            changes.append(f"hospitalPerformanceRanking[{item['hospitalId']}].topDomains: added label={td['label']}")
            print(f"  Added label={td['label']} to topDomains in {item['hospitalName']}")

# Fix 4: summary - add missing fields
print("\n--- Fix 4: summary ---")
s = cohort['summary']
if 'criticalRiskCount' not in s:
    s['criticalRiskCount'] = s.get('criticalCount', 0)
    changes.append(f"summary: added criticalRiskCount={s['criticalRiskCount']}")
    print(f"  Added criticalRiskCount={s['criticalRiskCount']}")
if 'intensiveManagementCount' not in s:
    s['intensiveManagementCount'] = round(s.get('totalPatients', 0) * 0.15)
    changes.append(f"summary: added intensiveManagementCount={s['intensiveManagementCount']}")
    print(f"  Added intensiveManagementCount={s['intensiveManagementCount']}")
if 'closedLoopRate' not in s:
    s['closedLoopRate'] = 72.5
    changes.append(f"summary: added closedLoopRate={s['closedLoopRate']}")
    print(f"  Added closedLoopRate={s['closedLoopRate']}")

# Fix 5: patients - convert predictions dict to array, add evidenceSources
print("\n--- Fix 5: patients predictions & evidenceSources ---")
disease_map = {
    'oneYearRisk': ('高血压', 'Disease-Text-BERT'),
    'threeYearRisk': ('2型糖尿病', 'TemporAI-v2'),
    'readmissionRisk': ('冠心病', 'PyHealth-Surv'),
    'deteriorationRisk': ('COPD', 'RiskNet-v3'),
}
for patient in cohort['patients']:
    preds = patient.get('predictions', {})
    if isinstance(preds, dict) and not isinstance(preds, list):
        new_preds = []
        for key, score in preds.items():
            disease, model = disease_map.get(key, (key, 'Unknown'))
            level = 'high' if score >= 0.6 else ('medium' if score >= 0.3 else 'low')
            new_preds.append({
                'model': model,
                'target': disease,
                'score': round(score * 100, 1),
                'level': level,
                'horizon': '12个月' if 'oneYear' in key else ('36个月' if 'threeYear' in key else '风险'),
                'explanation': f'{disease}风险预测，基于{model}模型',
                'evidenceIds': ['ev-001', 'ev-002']
            })
        patient['predictions'] = new_preds
        changes.append(f"patient[{patient['id']}]: converted predictions dict to array ({len(new_preds)} items)")
        if patient['id'] in ('pat-001', 'pat-002'):
            print(f"  Converted predictions for {patient['id']}: {len(new_preds)} items")
            for p in new_preds:
                print(f"    {p['model']}: {p['target']} score={p['score']} level={p['level']}")

    # Add evidenceSources if missing or not a list
    es = patient.get('evidenceSources')
    if not isinstance(es, list):
        patient['evidenceSources'] = [
            {'id': 'ev-001', 'title': '临床指南', 'detail': '基于最新诊疗指南评估'},
            {'id': 'ev-002', 'title': '患者数据', 'detail': '近6个月指标趋势分析'},
            {'id': 'ev-003', 'title': '检验报告', 'detail': '最近一次检验结果'}
        ]
        changes.append(f"patient[{patient['id']}]: added evidenceSources array")
        if patient['id'] == 'pat-001':
            print(f"  Added evidenceSources for {patient['id']}")

print(f"\nTotal changes to population-cohort.json: {len(changes)}")

with open(os.path.join(BASE, 'public/demo-data/population-cohort.json'), 'w', encoding='utf-8') as f:
    json.dump(cohort, f, ensure_ascii=False, indent=2)

# ============================================================
print("\n" + "=" * 60)
print("FIXING pages-snapshot.json")
print("=" * 60)

with open(os.path.join(BASE, 'public/demo-data/pages-snapshot.json'), 'r', encoding='utf-8') as f:
    snapshot = json.load(f)

changes2 = []

# Fix 6: predictions - convert dict-keyed-by-disease to proper predictionSuite format
print("\n--- Fix 6: predictions per patient ---")
for pid, pdata in snapshot['predictions'].items():
    if isinstance(pdata, dict) and 'predictions' in pdata:
        old_preds = pdata['predictions']
        if isinstance(old_preds, dict):
            new_preds = []
            for disease, info in old_preds.items():
                new_preds.append({
                    'provider': info.get('model', 'Unknown'),
                    'task': f'{disease}风险预测',
                    'target': disease,
                    'level': 'high' if info.get('currentRisk', 0) >= 0.6 else ('medium' if info.get('currentRisk', 0) >= 0.3 else 'low'),
                    'score': round(info.get('currentRisk', 0) * 100, 1),
                    'explanation': f'{disease}当前风险{info.get("currentRisk", 0):.0%}，趋势{info.get("trend", "未知")}，置信度{info.get("confidence", 0):.0%}',
                    'recommendedActions': [
                        f'定期监测{disease}相关指标',
                        f'根据{info.get("model", "模型")}建议调整方案',
                        '加强患者教育与随访'
                    ],
                    'evidence': info.get('evidence', [])
                })
            pdata['predictions'] = new_preds
            changes2.append(f"predictions[{pid}]: converted dict to array ({len(new_preds)} items)")
            if pid in ('pat-001', 'pat-002'):
                print(f"  Converted predictions for {pid}: {len(new_preds)} items")
                for p in new_preds:
                    print(f"    {p['provider']}: {p['target']} score={p['score']}")

            # Add predictionSuite fields
            if 'inputSummary' not in pdata:
                pdata['inputSummary'] = {
                    'conditions': list(old_preds.keys()),
                    'alerts': ['指标波动', '用药依从性下降'],
                    'observationsUsed': ['血压', '血糖', '血脂', '体重']
                }
                changes2.append(f"predictions[{pid}]: added inputSummary")

            if 'featureEngineering' not in pdata:
                pdata['featureEngineering'] = {
                    'temporalSeriesPoints': 180,
                    'temporalSignals': ['血压', '心率', '血糖', '体重'],
                    'textFeatureTerms': ['头晕', '胸闷', '乏力', '多饮多尿']
                }
                changes2.append(f"predictions[{pid}]: added featureEngineering")

            if 'pipelines' not in pdata:
                pdata['pipelines'] = {
                    'temporai': {
                        'plugin': 'TemporAI-v2.3',
                        'preprocessors': ['时间序列对齐', '缺失值插补', '特征标准化'],
                        'cohortSize': 4440,
                        'timeSeriesRows': 180,
                        'timeSeriesFeatureCount': 12,
                        'timeToEventPlugin': 'Cox-PH-v1',
                        'timeToEventHorizons': ['6个月', '12个月', '24个月'],
                        'timeToEventHorizonScores': {'6个月': 0.35, '12个月': 0.55, '24个月': 0.72},
                        'timeToEventByDomain': {'高血压': 0.45, '糖尿病': 0.62},
                        'timeToEventManifest': '风险分层报告已生成',
                    },
                    'pyhealth': {
                        'datasetName': 'Qixia-CDM-v1',
                        'taskName': 'mortality-prediction',
                        'model': 'AdaCare',
                        'trainer': 'PyHealth-Trainer-v2',
                        'sampleCount': 4440,
                        'patientCount': 4440,
                        'visitCount': 12680,
                        'positiveLabelRate': 0.08,
                        'epochs': 50,
                        'batchSize': 64,
                        'loss': 0.23,
                        'split': {'train': 0.7, 'val': 0.15, 'test': 0.15},
                        'monitor': 'val_auc',
                        'bestCheckpoint': 'epoch-42',
                        'lastCheckpoint': 'epoch-50',
                        'metricsManifest': 'AUC, AUPRC, F1, Recall',
                        'validationMetrics': {'auc': 0.87, 'auprc': 0.45, 'f1': 0.62, 'recall': 0.71},
                    }
                }
                changes2.append(f"predictions[{pid}]: added pipelines")

            if 'runtime' not in pdata:
                pdata['runtime'] = {
                    'python': '3.11.5',
                    'packages': {
                        'torch': {'available': True, 'version': '2.1.0'},
                        'pyhealth': {'available': True, 'version': '1.1.4'},
                        'lifelines': {'available': True, 'version': '0.27.7'},
                        'scikit-learn': {'available': True, 'version': '1.3.1'},
                    }
                }
                changes2.append(f"predictions[{pid}]: added runtime")

# Fix 7: workspace diagnosisSupport - add predictions array
print("\n--- Fix 7: workspace diagnosisSupport.predictions ---")
for ws_key, ws in snapshot['workspaces'].items():
    ds = ws.get('diagnosisSupport', {})
    if isinstance(ds, dict):
        if 'predictions' not in ds or not isinstance(ds.get('predictions'), list) or len(ds.get('predictions', [])) == 0:
            # Get patient conditions from workspace patient data
            patient = ws.get('patient', {})
            conditions = patient.get('conditions', patient.get('diagnoses', ['高血压']))
            ds['predictions'] = [
                {
                    'metric': f'{c} 12个月风险',
                    'value': f'{round(45 + i * 12, 1)}%',
                    'explanation': f'基于TemporAI模型预测，{c}相关指标呈稳定趋势'
                }
                for i, c in enumerate(conditions[:3])
            ] if conditions else [
                {'metric': '高血压 12个月风险', 'value': '57.0%', 'explanation': '基于TemporAI模型预测，血压指标呈稳定趋势'},
                {'metric': '2型糖尿病 12个月风险', 'value': '43.2%', 'explanation': '基于PyHealth模型预测，血糖指标需关注'},
            ]
            changes2.append(f"workspaces[{ws_key}].diagnosisSupport: added predictions array")
            if 'pat-001' in ws_key:
                print(f"  Added predictions to {ws_key}: {len(ds['predictions'])} items")
                for p in ds['predictions']:
                    print(f"    {p['metric']}: {p['value']}")

        # Also ensure suggestedDiagnoses is a list
        if 'suggestedDiagnoses' not in ds:
            ds['suggestedDiagnoses'] = []
        if 'differentialDiagnoses' not in ds:
            ds['differentialDiagnoses'] = []

# Fix 8: also fix medclawWorkspaces diagnosisSupport
print("\n--- Fix 8: medclawWorkspaces diagnosisSupport.predictions ---")
for ws_key, ws in snapshot.get('medclawWorkspaces', {}).items():
    ds = ws.get('diagnosisSupport', {})
    if isinstance(ds, dict):
        if 'predictions' not in ds or not isinstance(ds.get('predictions'), list) or len(ds.get('predictions', [])) == 0:
            patient = ws.get('patient', {})
            conditions = patient.get('conditions', patient.get('diagnoses', ['高血压']))
            ds['predictions'] = [
                {
                    'metric': f'{c} 12个月风险',
                    'value': f'{round(45 + i * 12, 1)}%',
                    'explanation': f'基于TemporAI模型预测，{c}相关指标呈稳定趋势'
                }
                for i, c in enumerate(conditions[:3])
            ] if conditions else [
                {'metric': '高血压 12个月风险', 'value': '57.0%', 'explanation': '基于TemporAI模型预测'},
            ]
            changes2.append(f"medclawWorkspaces[{ws_key}].diagnosisSupport: added predictions array")

print(f"\nTotal changes to pages-snapshot.json: {len(changes2)}")

with open(os.path.join(BASE, 'public/demo-data/pages-snapshot.json'), 'w', encoding='utf-8') as f:
    json.dump(snapshot, f, ensure_ascii=False, indent=2)

# ============================================================
print("\n" + "=" * 60)
print("COPYING to docs/demo-data/")
print("=" * 60)

import shutil
docs_dir = os.path.join(BASE, 'docs/demo-data')
os.makedirs(docs_dir, exist_ok=True)

for fname in ['population-cohort.json', 'pages-snapshot.json', 'qixia-public-data.json']:
    src = os.path.join(BASE, 'public/demo-data', fname)
    dst = os.path.join(docs_dir, fname)
    shutil.copy2(src, dst)
    print(f"  Copied {fname}")

# ============================================================
print("\n" + "=" * 60)
print("VERIFICATION")
print("=" * 60)

with open(os.path.join(BASE, 'public/demo-data/population-cohort.json'), 'r', encoding='utf-8') as f:
    v = json.load(f)

print(f"\ndomainPrevalence[0].label = {v['domainPrevalence'][0].get('label', 'MISSING')}")
print(f"coordinationFunnel type = {type(v['coordinationFunnel']).__name__}")
if isinstance(v['coordinationFunnel'], dict):
    print(f"coordinationFunnel.stages[0] = {v['coordinationFunnel']['stages'][0]}")
print(f"hospitalPerformanceRanking[0].topDomains[0].label = {v['hospitalPerformanceRanking'][0]['topDomains'][0].get('label', 'MISSING')}")
print(f"summary.criticalRiskCount = {v['summary'].get('criticalRiskCount', 'MISSING')}")
print(f"summary.intensiveManagementCount = {v['summary'].get('intensiveManagementCount', 'MISSING')}")
print(f"summary.closedLoopRate = {v['summary'].get('closedLoopRate', 'MISSING')}")
print(f"patients[0].predictions type = {type(v['patients'][0]['predictions']).__name__}")
if isinstance(v['patients'][0]['predictions'], list):
    print(f"patients[0].predictions[0].score = {v['patients'][0]['predictions'][0].get('score', 'MISSING')}")
    print(f"patients[0].predictions[0].model = {v['patients'][0]['predictions'][0].get('model', 'MISSING')}")
    print(f"patients[0].predictions[0].target = {v['patients'][0]['predictions'][0].get('target', 'MISSING')}")
print(f"patients[0].evidenceSources type = {type(v['patients'][0].get('evidenceSources')).__name__}")

with open(os.path.join(BASE, 'public/demo-data/pages-snapshot.json'), 'r', encoding='utf-8') as f:
    v2 = json.load(f)

pred001 = v2['predictions']['pat-001']['predictions']
print(f"\npredictions[pat-001].predictions type = {type(pred001).__name__}")
if isinstance(pred001, list):
    print(f"  predictions[0].provider = {pred001[0].get('provider', 'MISSING')}")
    print(f"  predictions[0].target = {pred001[0].get('target', 'MISSING')}")
    print(f"  predictions[0].score = {pred001[0].get('score', 'MISSING')}")

ws_preds = v2['workspaces']['pat-001|specialist-doctor']['diagnosisSupport'].get('predictions', [])
print(f"workspaces[pat-001|specialist-doctor].diagnosisSupport.predictions type = {type(ws_preds).__name__}, len={len(ws_preds) if isinstance(ws_preds, list) else 'N/A'}")
if isinstance(ws_preds, list) and ws_preds:
    print(f"  predictions[0] = {ws_preds[0]}")

print(f"\npredictions[pat-001].inputSummary = {json.dumps(v2['predictions']['pat-001'].get('inputSummary', 'MISSING'), ensure_ascii=False)}")
print(f"predictions[pat-001].pipelines keys = {list(v2['predictions']['pat-001'].get('pipelines', {}).keys())}")
print(f"predictions[pat-001].runtime.python = {v2['predictions']['pat-001'].get('runtime', {}).get('python', 'MISSING')}")

print("\n" + "=" * 60)
print("ALL FIXES COMPLETE")
print("=" * 60)
