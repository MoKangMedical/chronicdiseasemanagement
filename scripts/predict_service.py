#!/usr/bin/env python3
from __future__ import annotations
import argparse
import shutil
import inspect
import importlib.util
import json
import os
import platform
import statistics
import sys
import types
from collections import Counter
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from importlib import metadata

os.environ.setdefault("MPLBACKEND", "Agg")

try:
    import numpy as np
except Exception:  # pragma: no cover - optional at runtime
    np = None

try:
    import pandas as pd
except Exception:  # pragma: no cover - optional at runtime
    pd = None

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
except Exception:  # pragma: no cover - optional at runtime
    TfidfVectorizer = None
    LogisticRegression = None


def package_version(name: str) -> str | None:
    try:
        return metadata.version(name)
    except metadata.PackageNotFoundError:
        return None


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
STORAGE_ROOT = os.path.join(PROJECT_ROOT, "storage")
MODEL_ARTIFACT_ROOT = os.path.join(STORAGE_ROOT, "model-artifacts")


def ensure_dir(path: str) -> str:
    os.makedirs(path, exist_ok=True)
    return path


def ensure_storage_root() -> str:
    return ensure_dir(STORAGE_ROOT)


def persist_json(relative_path: str, value: dict) -> str:
    file_path = os.path.join(ensure_storage_root(), relative_path)
    ensure_dir(os.path.dirname(file_path))
    with open(file_path, "w", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2, allow_nan=False)
    return file_path


def persist_model_artifact(source_path: str, *segments: str) -> str | None:
    if not os.path.isfile(source_path):
        return None
    target_dir = ensure_dir(os.path.join(MODEL_ARTIFACT_ROOT, *segments[:-1]))
    target_path = os.path.join(target_dir, segments[-1])
    shutil.copy2(source_path, target_path)
    return target_path


def load_tempor_runtime() -> dict:
    installed_version = package_version("temporai")
    try:
        import tempor
        from tempor import plugin_loader

        plugins = plugin_loader.list()
        if isinstance(plugins, dict):
            plugin_count = sum(len(items) for items in plugins.values())
        elif isinstance(plugins, (list, tuple, set)):
            plugin_count = len(plugins)
        else:
            plugin_count = 0

        return {
            "available": True,
            "version": installed_version or getattr(tempor, "__version__", None),
            "note": f"tempor runtime loaded; discovered {plugin_count} plugins",
            "pluginCount": plugin_count
        }
    except Exception as exc:  # pragma: no cover - package is optional
        return {
            "available": installed_version is not None,
            "version": installed_version,
            "note": f"tempor package installed; runtime probe incomplete: {exc}" if installed_version else f"tempor unavailable: {exc}"
        }


def risk_level(score: float) -> str:
    if score >= 0.8:
        return "critical"
    if score >= 0.6:
        return "high"
    if score >= 0.4:
        return "medium"
    return "low"


def safe_float(value, fallback: float = 0.0) -> float:
    if isinstance(value, (int, float)):
        numeric = float(value)
        if numeric != numeric or numeric in (float("inf"), float("-inf")):
            return fallback
        return numeric
    return fallback


def mean_or_default(values: list[float], default: float = 0.0) -> float:
    if not values:
        return default
    return float(statistics.fmean(values))


def slope(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    return float((values[-1] - values[0]) / max(1, len(values) - 1))


def risk_from_score(score: float) -> float:
    score = max(0.01, min(0.99, score))
    return float(score)


def extract_condition_tokens(conditions: list[dict]) -> list[str]:
    return [item.get("code") for item in conditions if item.get("code")] + [
        item.get("name") for item in conditions if item.get("name")
    ]


def infer_condition_domain(condition: dict) -> str:
    code = str(condition.get("code", "")).upper()
    name = str(condition.get("name", ""))
    text = f"{code} {name}"
    if any(token in text for token in ["I10", "I11", "I20", "I25", "I50", "高血压", "心", "冠", "房颤", "心衰"]):
        return "cardiovascular"
    if any(token in text for token in ["E10", "E11", "E13", "糖尿病", "控糖", "胰岛"]):
        return "diabetes"
    if any(token in text for token in ["F00", "F01", "F03", "G30", "痴呆", "认知", "阿尔茨海默"]):
        return "dementia"
    if any(token in text for token in ["J44", "J45", "J96", "慢阻肺", "哮喘", "呼吸"]):
        return "respiratory"
    if any(token in text for token in ["N18", "肾"]):
        return "renal"
    if any(token in text for token in ["睡眠", "失眠", "OSA", "呼吸暂停"]):
        return "sleep"
    return "metabolic"


def infer_patient_domains(patient: dict) -> list[str]:
    conditions = patient.get("chronicConditions", [])
    domains = sorted({infer_condition_domain(condition) for condition in conditions if condition})
    return domains or ["metabolic"]


def build_condition_metrics(tokens: list[str]) -> dict:
    unique_tokens = sorted(set(str(token) for token in tokens if token))
    return {
        "condition_token_count": float(len(tokens)),
        "condition_unique_tokens": float(len(unique_tokens)),
        "condition_encoded_tokens": float(len(unique_tokens))
    }


def derive_outcome_label(patient: dict, static_features: dict | None = None) -> int:
    static_features = static_features or {}
    alerts = patient.get("alerts", [])
    severe_conditions = sum(1 for item in patient.get("chronicConditions", []) if item.get("severity") == "severe")
    vitals = patient.get("vitals", {})
    labs = patient.get("labs", {})
    lifestyle = patient.get("lifestyle", {})

    if len(alerts) >= 2:
        return 1
    if severe_conditions >= 1:
        return 1
    if safe_float(labs.get("hba1c")) >= 8.0 or safe_float(labs.get("ntProbnp")) >= 400:
        return 1
    if safe_float(vitals.get("systolicBp")) >= 160 or safe_float(vitals.get("oxygenSaturation"), 100) <= 92:
        return 1
    if safe_float(lifestyle.get("averageDailySteps")) < 2500 or safe_float(lifestyle.get("averageSleepHours")) < 5.5:
        return 1
    if safe_float(static_features.get("alert_count")) >= 2:
        return 1
    return 0


def build_prediction_cohort(payload: dict) -> list[dict]:
    current_entry = {
        "patient": payload.get("patient", {}),
        "integratedData": payload.get("integratedData", {})
    }
    seen = set()
    cohort = []

    for entry in payload.get("cohort", []):
        patient = entry.get("patient", {})
        patient_id = patient.get("id")
        if not patient_id or patient_id in seen:
            continue
        cohort.append(entry)
        seen.add(patient_id)

    current_id = current_entry["patient"].get("id")
    if current_id and current_id not in seen:
        cohort.append(current_entry)

    return augment_prediction_cohort(cohort or [current_entry])


def clone_entry(entry: dict) -> dict:
    return json.loads(json.dumps(entry))


def adjust_healthkit_feed(integrated: dict, *, steps: float, sleep_hours: float, heart_rate: float) -> dict:
    feed = clone_entry(integrated)
    healthkit = feed.setdefault("healthKit", {})
    observations = list(healthkit.get("rawObservations", []))
    seen = set()

    for item in observations:
        kind = item.get("kind")
        if kind == "step_count":
            item["value"] = steps
            seen.add(kind)
        elif kind == "sleep_analysis":
            item["value"] = sleep_hours
            seen.add(kind)
        elif kind == "heart_rate":
            item["value"] = heart_rate
            seen.add(kind)

    base_time = "2026-03-21T08:00:00+08:00"
    if "step_count" not in seen:
        observations.append(
            {
                "id": f"synthetic-step-{len(observations)+1}",
                "patientId": feed.get("patientId"),
                "kind": "step_count",
                "effectiveAt": "2026-03-21T20:00:00+08:00",
                "value": steps,
                "unit": "count",
                "source": "healthkit"
            }
        )
    if "sleep_analysis" not in seen:
        observations.append(
            {
                "id": f"synthetic-sleep-{len(observations)+1}",
                "patientId": feed.get("patientId"),
                "kind": "sleep_analysis",
                "effectiveAt": "2026-03-21T07:00:00+08:00",
                "value": sleep_hours,
                "unit": "h",
                "source": "healthkit"
            }
        )
    if "heart_rate" not in seen:
        observations.append(
            {
                "id": f"synthetic-hr-{len(observations)+1}",
                "patientId": feed.get("patientId"),
                "kind": "heart_rate",
                "effectiveAt": base_time,
                "value": heart_rate,
                "unit": "bpm",
                "source": "healthkit"
            }
        )

    healthkit["rawObservations"] = observations
    return feed


def build_synthetic_cohort_entry(entry: dict, variant: str, index: int) -> dict:
    synthetic = clone_entry(entry)
    patient = synthetic.get("patient", {})
    integrated = synthetic.get("integratedData", {})
    patient_id = patient.get("id", f"synthetic-{index}")

    if variant == "stable":
        patient["id"] = f"{patient_id}-stable-{index}"
        patient["name"] = f"{patient.get('name', '患者')} 稳定对照"
        patient["alerts"] = []
        patient["chronicConditions"] = [
            {
                **condition,
                "severity": "mild" if condition.get("severity") == "severe" else condition.get("severity", "mild")
            }
            for condition in patient.get("chronicConditions", [])
        ]
        patient.setdefault("vitals", {}).update(
            {
                "systolicBp": 126,
                "diastolicBp": 78,
                "restingHeartRate": 68,
                "oxygenSaturation": 98,
                "bmi": max(22.0, safe_float(patient.get("vitals", {}).get("bmi"), 24.0) - 1.5),
            }
        )
        patient.setdefault("labs", {}).update({"hba1c": 6.1, "ntProbnp": 120, "egfr": 86, "ldl": 2.1})
        patient.setdefault("lifestyle", {}).update(
            {"averageDailySteps": 7800, "weeklyExerciseMinutes": 180, "averageSleepHours": 7.4}
        )
        synthetic["integratedData"] = adjust_healthkit_feed(integrated, steps=7800, sleep_hours=7.4, heart_rate=68)
    else:
        patient["id"] = f"{patient_id}-acute-{index}"
        patient["name"] = f"{patient.get('name', '患者')} 恶化对照"
        patient["alerts"] = list(dict.fromkeys([*patient.get("alerts", []), "夜间症状加重", "急性失代偿风险"]))
        patient.setdefault("vitals", {}).update(
            {
                "systolicBp": max(168, safe_float(patient.get("vitals", {}).get("systolicBp"), 150) + 14),
                "diastolicBp": max(96, safe_float(patient.get("vitals", {}).get("diastolicBp"), 88) + 8),
                "restingHeartRate": max(98, safe_float(patient.get("vitals", {}).get("restingHeartRate"), 84) + 10),
                "oxygenSaturation": min(91, safe_float(patient.get("vitals", {}).get("oxygenSaturation"), 95) - 4),
            }
        )
        patient.setdefault("labs", {}).update(
            {"hba1c": max(8.8, safe_float(patient.get("labs", {}).get("hba1c"), 7.1) + 1.0), "ntProbnp": 860, "egfr": 42}
        )
        patient.setdefault("lifestyle", {}).update(
            {"averageDailySteps": 1200, "weeklyExerciseMinutes": 10, "averageSleepHours": 4.9}
        )
        synthetic["integratedData"] = adjust_healthkit_feed(integrated, steps=1200, sleep_hours=4.9, heart_rate=102)

    synthetic["patient"] = patient
    return synthetic


def augment_prediction_cohort(cohort_entries: list[dict]) -> list[dict]:
    augmented = list(cohort_entries)
    seed_entries = cohort_entries
    for index, entry in enumerate(seed_entries, start=1):
        augmented.append(build_synthetic_cohort_entry(entry, "stable", index))
        augmented.append(build_synthetic_cohort_entry(entry, "acute", index))
    return augmented


def rounded_metrics(metrics: dict) -> dict:
    return {key: round(safe_float(value), 4) for key, value in metrics.items()}


def domain_adjusted_event_time(base_time: float, domains: list[str], label: int) -> float:
    adjusted = float(base_time)
    if "cardiovascular" in domains:
        adjusted = min(adjusted, 14.0 if label == 1 else 75.0)
    if "diabetes" in domains:
        adjusted = min(adjusted + (4.0 if label == 1 else 12.0), 90.0)
    if "dementia" in domains:
        adjusted = min(adjusted + (10.0 if label == 1 else 18.0), 120.0)
    if "respiratory" in domains:
        adjusted = min(adjusted + (2.0 if label == 1 else 8.0), 60.0)
    return max(3.0, adjusted)


def build_feature_context(patient: dict, integrated: dict) -> dict:
    condition_tokens = extract_condition_tokens(patient.get("chronicConditions", []))
    temporal_frame = build_temporal_frame(patient, integrated)
    temporal_summary, temporal_series_points, temporal_signals = summarize_temporal_features(temporal_frame)
    static_features = build_static_features(patient, build_condition_metrics(condition_tokens), temporal_summary)
    text_corpus = build_text_corpus(patient)
    return {
        "condition_tokens": condition_tokens,
        "temporal_frame": temporal_frame,
        "temporal_summary": temporal_summary,
        "temporal_series_points": temporal_series_points,
        "temporal_signals": temporal_signals,
        "static_features": static_features,
        "text_corpus": text_corpus,
    }


def build_temporal_frame(patient: dict, integrated: dict):
    observations = integrated.get("healthKit", {}).get("rawObservations", [])
    rows = []
    for item in observations:
        rows.append(
            {
                "kind": item.get("kind", "unknown"),
                "effective_at": item.get("effectiveAt"),
                "value": safe_float(item.get("value")),
                "unit": item.get("unit") or ""
            }
        )

    for encounter in patient.get("recentEncounters", []):
        rows.append(
            {
                "kind": "encounter",
                "effective_at": encounter.get("date"),
                "value": 1.0,
                "unit": "visit"
            }
        )

    if pd is None:
        return None

    if not rows:
        return pd.DataFrame(columns=["kind", "effective_at", "value", "unit"])

    frame = pd.DataFrame(rows)
    frame["effective_at"] = pd.to_datetime(frame["effective_at"], errors="coerce", utc=True)
    frame = frame.sort_values("effective_at").reset_index(drop=True)
    return frame


def summarize_temporal_features(frame) -> tuple[dict, int, list[str]]:
    if pd is None or frame is None or frame.empty:
        return {"series_points": 0.0}, 0, []

    summary = {"series_points": float(len(frame))}
    signals = []
    for kind, bucket in frame.groupby("kind"):
        values = [safe_float(item) for item in bucket["value"].tolist()]
        prefix = kind.replace("-", "_")
        summary[f"{prefix}_latest"] = values[-1] if values else 0.0
        summary[f"{prefix}_mean"] = mean_or_default(values)
        summary[f"{prefix}_delta"] = (values[-1] - values[0]) if len(values) >= 2 else 0.0
        summary[f"{prefix}_slope"] = slope(values)
        signals.append(kind)

    return summary, int(len(frame)), sorted(signals)


def build_text_corpus(patient: dict) -> list[str]:
    conditions = patient.get("chronicConditions", [])
    alerts = patient.get("alerts", [])
    encounters = patient.get("recentEncounters", [])
    lifestyle = patient.get("lifestyle", {})
    medications = patient.get("medications", [])

    patient_text = " ".join(
        [
            " ".join(item.get("name", "") for item in conditions),
            " ".join(item.get("code", "") for item in conditions),
            " ".join(alerts),
            " ".join(item.get("reason", "") for item in encounters),
            lifestyle.get("dietPattern", ""),
            " ".join(item.get("name", "") for item in medications)
        ]
    ).strip()

    archetypes = [
        "气促 心衰 再入院 下肢水肿 低步数 利尿剂依从性差",
        "糖尿病 高血压 肥胖 血糖不达标 饮食失衡 缺乏运动",
        "认知下降 记忆减退 睡眠紊乱 走失风险 家属照护负担",
        "慢阻肺 咳嗽 夜间憋醒 低氧 吸烟 睡眠呼吸暂停",
        "体检复查 指标稳定 运动规律 睡眠充足 无明显不适"
    ]
    return [patient_text, *archetypes]


def extract_top_terms(texts: list[str]) -> tuple[list[str], object | None]:
    if TfidfVectorizer is None:
        return [], None

    vectorizer = TfidfVectorizer(max_features=24, ngram_range=(1, 2))
    matrix = vectorizer.fit_transform(texts)
    current_vector = matrix[0].toarray()[0]
    features = vectorizer.get_feature_names_out()
    ranked = sorted(
        [(features[index], current_vector[index]) for index in range(len(features))],
        key=lambda item: item[1],
        reverse=True
    )
    top_terms = [term for term, weight in ranked if weight > 0][:8]
    return top_terms, vectorizer


def build_static_features(patient: dict, token_metrics: dict, temporal_summary: dict) -> dict:
    conditions = patient.get("chronicConditions", [])
    vitals = patient.get("vitals", {})
    labs = patient.get("labs", {})
    lifestyle = patient.get("lifestyle", {})
    meds = patient.get("medications", [])
    alerts = patient.get("alerts", [])
    encounters = patient.get("recentEncounters", [])

    features = {
        "age": safe_float(patient.get("age")),
        "condition_count": float(len(conditions)),
        "severe_condition_count": float(sum(1 for item in conditions if item.get("severity") == "severe")),
        "alert_count": float(len(alerts)),
        "medication_count": float(len(meds)),
        "encounter_count": float(len(encounters)),
        "systolic_bp": safe_float(vitals.get("systolicBp")),
        "diastolic_bp": safe_float(vitals.get("diastolicBp")),
        "resting_heart_rate": safe_float(vitals.get("restingHeartRate")),
        "bmi": safe_float(vitals.get("bmi")),
        "oxygen_saturation": safe_float(vitals.get("oxygenSaturation")),
        "hba1c": safe_float(labs.get("hba1c")),
        "ldl": safe_float(labs.get("ldl")),
        "egfr": safe_float(labs.get("egfr")),
        "nt_probnp": safe_float(labs.get("ntProbnp")),
        "fasting_glucose": safe_float(labs.get("fastingGlucose")),
        "average_daily_steps": safe_float(lifestyle.get("averageDailySteps")),
        "weekly_exercise_minutes": safe_float(lifestyle.get("weeklyExerciseMinutes")),
        "average_sleep_hours": safe_float(lifestyle.get("averageSleepHours")),
        "smoking_current": 1.0 if lifestyle.get("smokingStatus") == "current" else 0.0,
        "smoking_former": 1.0 if lifestyle.get("smokingStatus") == "former" else 0.0
    }
    features.update(token_metrics)
    features.update(temporal_summary)
    return features


def build_pyhealth_dataset_pipeline(payload: dict, current_patient_id: str) -> tuple[dict, dict, dict]:
    installed_version = package_version("pyhealth")
    fallback_metrics = {"condition_token_count": 0.0, "condition_unique_tokens": 0.0, "condition_encoded_tokens": 0.0}
    try:
        import pyhealth
        from pyhealth.datasets import SampleEHRDataset

        cohort_entries = build_prediction_cohort(payload)
        samples = []
        current_sample = None
        label_counter = Counter()

        for entry in cohort_entries:
            patient = entry.get("patient", {})
            conditions = patient.get("chronicConditions", [])
            medications = patient.get("medications", [])
            encounters = patient.get("recentEncounters", [])
            sample = {
                "patient_id": patient.get("id"),
                "visit_id": f"{patient.get('id', 'patient')}-latest-visit",
                "conditions": [item.get("code") or item.get("name") for item in conditions if item.get("code") or item.get("name")],
                "procedures": [item.get("department") for item in encounters if item.get("department")],
                "drugs": [item.get("name") for item in medications if item.get("name")],
                "label": derive_outcome_label(patient),
            }
            samples.append(sample)
            label_counter.update([sample["label"]])
            if sample["patient_id"] == current_patient_id:
                current_sample = sample

        if not samples or current_sample is None:
            raise ValueError("no valid EHR samples available for PyHealth dataset pipeline")

        dataset = SampleEHRDataset(
            samples=samples,
            dataset_name="virtual-chronic-ehr",
            task_name="chronic_multimodal_risk"
        )

        condition_vocab = dataset.get_all_tokens("conditions")
        procedure_vocab = dataset.get_all_tokens("procedures")
        drug_vocab = dataset.get_all_tokens("drugs")
        current_conditions = [str(token) for token in current_sample.get("conditions", []) if token]
        current_condition_set = set(current_conditions)

        metrics = {
            "condition_token_count": float(len(current_conditions)),
            "condition_unique_tokens": float(len(current_condition_set)),
            "condition_encoded_tokens": float(len(current_condition_set.intersection(set(condition_vocab))) or len(current_condition_set))
        }

        positive_count = int(label_counter.get(1, 0))
        pipeline = {
            "datasetName": "virtual-chronic-ehr",
            "taskName": "chronic_multimodal_risk",
            "sampleCount": len(samples),
            "patientCount": len(dataset.patient_to_index),
            "visitCount": len(dataset.visit_to_index),
            "positiveLabelRate": round(positive_count / max(1, len(samples)), 4),
            "conditionVocabularySize": len(condition_vocab),
            "procedureVocabularySize": len(procedure_vocab),
            "drugVocabularySize": len(drug_vocab),
            "currentSample": {
                "conditionCount": len(current_conditions),
                "procedureCount": len(current_sample.get("procedures", [])),
                "drugCount": len(current_sample.get("drugs", [])),
                "label": int(current_sample.get("label", 0))
            }
        }
        status = {
            "available": True,
            "version": installed_version or getattr(pyhealth, "__version__", None),
            "note": f"PyHealth SampleEHRDataset pipeline ready with {len(samples)} cohort samples"
        }
        return metrics, status, pipeline
    except Exception as exc:  # pragma: no cover - optional at runtime
        patient = payload.get("patient", {})
        fallback_tokens = extract_condition_tokens(patient.get("chronicConditions", []))
        fallback_metrics.update(build_condition_metrics(fallback_tokens))
        return fallback_metrics, {
            "available": installed_version is not None,
            "version": installed_version,
            "note": f"pyhealth package installed; dataset pipeline incomplete: {exc}" if installed_version else f"pyhealth unavailable: {exc}"
        }, {
            "error": str(exc)
        }


def load_pyhealth_rnn_class():
    import pyhealth
    import pyhealth.datasets

    base_path = os.path.join(os.path.dirname(pyhealth.datasets.__file__), "..", "models")
    base_path = os.path.abspath(base_path)

    def load_module(module_name: str, filename: str):
        sys.modules.pop(module_name, None)
        spec = importlib.util.spec_from_file_location(module_name, os.path.join(base_path, filename))
        if spec is None or spec.loader is None:
            raise ImportError(f"unable to load {module_name} from {filename}")
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)
        return module

    load_module("pyhealth.models.utils", "utils.py")
    base_module = load_module("pyhealth.models.base_model", "base_model.py")
    if not hasattr(base_module, "BaseModel"):
        raise ImportError("BaseModel not available after loading pyhealth.models.base_model")

    package_module = types.ModuleType("pyhealth.models")
    package_module.BaseModel = base_module.BaseModel
    package_module.__path__ = [base_path]
    sys.modules["pyhealth.models"] = package_module

    rnn_module = load_module("pyhealth.models.rnn", "rnn.py")
    return rnn_module.RNN


def build_pyhealth_model_prediction(payload: dict, current_patient_id: str) -> tuple[float | None, dict]:
    installed_version = package_version("pyhealth")
    try:
        from torch.utils.data import Subset
        from pyhealth.datasets import SampleEHRDataset, get_dataloader
        from pyhealth.trainer import Trainer

        RNN = load_pyhealth_rnn_class()
        cohort_entries = build_prediction_cohort(payload)
        samples = []

        for entry in cohort_entries:
            patient = entry.get("patient", {})
            patient_id = patient.get("id")
            if not patient_id:
                continue
            samples.append(
                {
                    "patient_id": patient_id,
                    "visit_id": f"{patient_id}-latest-visit",
                    "conditions": [item.get("code") or item.get("name") for item in patient.get("chronicConditions", []) if item.get("code") or item.get("name")],
                    "procedures": [item.get("department") for item in patient.get("recentEncounters", []) if item.get("department")],
                    "drugs": [item.get("name") for item in patient.get("medications", []) if item.get("name")],
                    "label": derive_outcome_label(patient),
                }
            )

        if len(samples) < 4:
            return None, {"error": "pyhealth cohort too small for trainer pipeline"}

        dataset = SampleEHRDataset(
            samples=samples,
            dataset_name="virtual-chronic-ehr",
            task_name="chronic_multimodal_risk"
        )
        positive_indices = [index for index, sample in enumerate(samples) if sample["label"] == 1]
        negative_indices = [index for index, sample in enumerate(samples) if sample["label"] == 0]
        ordered_indices = positive_indices + negative_indices
        train_count = max(4, len(samples) // 2)
        val_count = max(2, len(samples) // 4)
        remaining = len(samples) - train_count - val_count
        test_count = max(2, remaining)

        def take(indexes: list[int], offset: int, count: int) -> tuple[list[int], int]:
            selected = []
            while len(selected) < count and indexes:
                selected.append(indexes[offset % len(indexes)])
                offset += 1
            return selected, offset

        pos_offset = 0
        neg_offset = 0
        train_pos, pos_offset = take(positive_indices, pos_offset, max(1, train_count // 2))
        train_neg, neg_offset = take(negative_indices, neg_offset, max(1, train_count - len(train_pos)))
        val_pos, pos_offset = take(positive_indices, pos_offset, 1)
        val_neg, neg_offset = take(negative_indices, neg_offset, 1)
        test_pos, pos_offset = take(positive_indices, pos_offset, 1)
        test_neg, neg_offset = take(negative_indices, neg_offset, 1)

        train_indices = list(dict.fromkeys(train_pos + train_neg))
        val_indices = [index for index in dict.fromkeys(val_pos + val_neg) if index not in train_indices]
        test_indices = [index for index in dict.fromkeys(test_pos + test_neg) if index not in train_indices and index not in val_indices]
        leftover_indices = [index for index in ordered_indices if index not in train_indices and index not in val_indices and index not in test_indices]
        for index in leftover_indices:
            if len(train_indices) < train_count:
                train_indices.append(index)
            elif len(val_indices) < val_count:
                val_indices.append(index)
            else:
                test_indices.append(index)

        train_dataset = Subset(dataset, train_indices)
        val_dataset = Subset(dataset, val_indices)
        test_dataset = Subset(dataset, test_indices)
        batch_size = min(4, len(samples))
        train_loader = get_dataloader(train_dataset, batch_size=batch_size, shuffle=True)
        val_loader = get_dataloader(val_dataset, batch_size=batch_size, shuffle=False)
        test_loader = get_dataloader(test_dataset, batch_size=batch_size, shuffle=False)
        full_loader = get_dataloader(dataset, batch_size=batch_size, shuffle=False)
        model = RNN(
            dataset=dataset,
            feature_keys=["conditions", "procedures", "drugs"],
            label_key="label",
            mode="binary",
            embedding_dim=32,
            hidden_dim=32
        )
        exp_name = f"pyhealth-chronic-{current_patient_id}"
        output_path = "/tmp/pyhealth-runtime"
        trainer = Trainer(
            model=model,
            enable_logging=True,
            output_path=output_path,
            exp_name=exp_name
        )
        trainer.train(
            train_dataloader=train_loader,
            val_dataloader=val_loader,
            test_dataloader=test_loader,
            epochs=2,
            monitor="pr_auc",
            monitor_criterion="max",
            load_best_model_at_last=True
        )
        val_scores = rounded_metrics(trainer.evaluate(val_loader))
        test_scores = rounded_metrics(trainer.evaluate(test_loader))
        y_true, y_prob, loss_mean, patient_ids = trainer.inference(full_loader, return_patient_ids=True)

        if current_patient_id not in patient_ids:
            return None, {"error": f"current patient {current_patient_id} missing from pyhealth inference"}

        current_index = patient_ids.index(current_patient_id)
        current_probability = float(y_prob[current_index][0] if getattr(y_prob[current_index], "__len__", None) else y_prob[current_index])
        artifact_dir = os.path.join("model-artifacts", "pyhealth", current_patient_id)
        best_checkpoint_source = os.path.join(output_path, exp_name, "best.ckpt")
        last_checkpoint_source = os.path.join(output_path, exp_name, "last.ckpt")
        best_checkpoint_path = persist_model_artifact(best_checkpoint_source, "pyhealth", current_patient_id, "best.ckpt")
        last_checkpoint_path = persist_model_artifact(last_checkpoint_source, "pyhealth", current_patient_id, "last.ckpt")
        metrics_payload = {
            "patientId": current_patient_id,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "datasetName": "virtual-chronic-ehr",
            "taskName": "chronic_multimodal_risk",
            "model": "RNN",
            "trainer": "pyhealth.trainer.Trainer",
            "monitor": "pr_auc",
            "split": {
                "train": len(train_dataset),
                "val": len(val_dataset),
                "test": len(test_dataset),
            },
            "validationMetrics": val_scores,
            "testMetrics": test_scores,
            "loss": round(float(loss_mean), 4),
            "currentProbability": round(current_probability, 4),
            "artifacts": {
                "bestCheckpoint": best_checkpoint_path,
                "lastCheckpoint": last_checkpoint_path,
            },
        }
        metrics_manifest = persist_json(os.path.join(artifact_dir, "metrics.json"), metrics_payload)

        return risk_from_score(current_probability), {
            "model": "RNN",
            "trainer": "pyhealth.trainer.Trainer",
            "batchSize": batch_size,
            "epochs": 2,
            "featureKeys": ["conditions", "procedures", "drugs"],
            "sampleCount": len(samples),
            "loss": round(float(loss_mean), 4),
            "currentProbability": round(current_probability, 4),
            "positiveLabels": int(sum(sample["label"] for sample in samples)),
            "split": {
                "train": len(train_dataset),
                "val": len(val_dataset),
                "test": len(test_dataset),
            },
            "monitor": "pr_auc",
            "bestCheckpoint": best_checkpoint_path,
            "lastCheckpoint": last_checkpoint_path,
            "metricsManifest": metrics_manifest,
            "validationMetrics": val_scores,
            "testMetrics": test_scores,
        }
    except Exception as exc:  # pragma: no cover - optional at runtime
        return None, {
            "error": str(exc),
            "available": installed_version is not None,
        }


def build_tempor_time_to_event_prediction(payload: dict, current_patient_id: str) -> tuple[float | None, dict]:
    runtime = load_tempor_runtime()
    if not runtime.get("available"):
        return None, {"error": runtime.get("note", "tempor runtime unavailable")}

    try:
        import pandas as pd
        from tempor import plugin_loader
        from tempor.data.dataset import TimeToEventAnalysisDataset

        cohort_entries = build_prediction_cohort(payload)
        cohort_order = []
        sample_rows_by_patient = []
        static_rows = []
        event_rows = []
        horizons = [7, 30, 90]

        for index, entry in enumerate(cohort_entries):
            patient = entry.get("patient", {})
            integrated = entry.get("integratedData", {})
            patient_id = patient.get("id")
            if not patient_id:
                continue
            context = build_feature_context(patient, integrated)
            static_features = context["static_features"]
            label = derive_outcome_label(patient, static_features)
            domains = infer_patient_domains(patient)
            event_time = 7.0 if label == 1 else 90.0
            if "-acute-" in patient_id:
                event_time = 5.0
            elif "-stable-" in patient_id:
                event_time = 120.0
                label = 0
            event_time = domain_adjusted_event_time(event_time, domains, label)

            cohort_order.append(patient_id)
            sample_rows_by_patient.append(build_tempor_time_series_rows(context["temporal_frame"], patient_id))
            static_rows.append(
                {
                    "age": safe_float(static_features.get("age")),
                    "bmi": safe_float(static_features.get("bmi")),
                    "condition_count": safe_float(static_features.get("condition_count")),
                    "alert_count": safe_float(static_features.get("alert_count")),
                    "nt_probnp": safe_float(static_features.get("nt_probnp")),
                    "average_daily_steps": safe_float(static_features.get("average_daily_steps")),
                    "average_sleep_hours": safe_float(static_features.get("average_sleep_hours")),
                }
            )
            event_rows.append((float(event_time), bool(label)))

        if len(cohort_order) < 6:
            return None, {"error": "time-to-event cohort too small"}

        feature_names = sorted(
            {
                key
                for rows in sample_rows_by_patient
                for row in rows
                for key in row.keys()
                if key not in {"sample_idx", "time_idx"}
            }
        ) or ["encounter"]
        max_steps = max(len(rows) for rows in sample_rows_by_patient)
        time_series_tensor = np.full((len(sample_rows_by_patient), max_steps, len(feature_names)), np.nan, dtype=float)
        for sample_index, rows in enumerate(sample_rows_by_patient):
            for step_index, row in enumerate(rows):
                for feature_index, feature_name in enumerate(feature_names):
                    time_series_tensor[sample_index, step_index, feature_index] = safe_float(
                        row.get(feature_name), float("nan")
                    )

        static_matrix = np.array(
            [
                [
                    row["age"],
                    row["bmi"],
                    row["condition_count"],
                    row["alert_count"],
                    row["nt_probnp"],
                    row["average_daily_steps"],
                    row["average_sleep_hours"],
                ]
                for row in static_rows
            ],
            dtype=float,
        )
        target_frame = pd.DataFrame({"status": event_rows})

        dataset = TimeToEventAnalysisDataset(
            time_series=time_series_tensor,
            static=static_matrix,
            targets=target_frame
        )
        imputer = plugin_loader.get("preprocessing.imputation.temporal.ffill")
        scaler = plugin_loader.get("preprocessing.scaling.temporal.ts_standard_scaler")
        transformed = scaler.fit_transform(imputer.fit_transform(dataset))
        plugin = plugin_loader.get(
            "time_to_event.ts_xgb",
            random_state=11,
            n_iter=5,
            xgb_n_estimators=20,
            xgb_bce_n_iter=20,
            val_size=0.2,
            patience=3
        )
        plugin.fit(transformed)
        prediction_frame = plugin.predict(transformed, horizons=horizons).dataframe()
        current_index = cohort_order.index(current_patient_id)
        current_predictions = prediction_frame.loc[current_index]
        horizon_scores = {str(horizon): round(float(current_predictions.loc[horizon].iloc[0]), 4) for horizon in horizons}
        current_probability = float(current_predictions.loc[90].iloc[0])

        domain_results = {}
        current_patient = next((entry.get("patient", {}) for entry in cohort_entries if entry.get("patient", {}).get("id") == current_patient_id), {})
        current_domains = infer_patient_domains(current_patient)
        for domain in current_domains:
            domain_indices = [
                sample_index
                for sample_index, entry in enumerate(cohort_entries)
                if domain in infer_patient_domains(entry.get("patient", {}))
            ]
            if len(domain_indices) < 4:
                continue

            domain_time_series = time_series_tensor[domain_indices]
            domain_static = static_matrix[domain_indices]
            domain_targets = pd.DataFrame({"status": [event_rows[index] for index in domain_indices]})
            domain_sample_ids = [cohort_order[index] for index in domain_indices]
            domain_dataset = TimeToEventAnalysisDataset(
                time_series=domain_time_series,
                static=domain_static,
                targets=domain_targets
            )
            domain_transformed = scaler.fit_transform(imputer.fit_transform(domain_dataset))
            domain_plugin = plugin_loader.get(
                "time_to_event.ts_xgb",
                random_state=17,
                n_iter=5,
                xgb_n_estimators=20,
                xgb_bce_n_iter=20,
                val_size=0.25,
                patience=3
            )
            domain_plugin.fit(domain_transformed)
            domain_frame = domain_plugin.predict(domain_transformed, horizons=horizons).dataframe()
            domain_current_index = domain_sample_ids.index(current_patient_id)
            domain_prediction = domain_frame.loc[domain_current_index]
            domain_results[domain] = {
                "sampleCount": len(domain_sample_ids),
                "eventCount": int(sum(1 for index in domain_indices if event_rows[index][1])),
                "horizonScores": {
                    str(horizon): round(float(domain_prediction.loc[horizon].iloc[0]), 4)
                    for horizon in horizons
                }
            }

        persist_json(
            os.path.join("model-artifacts", "temporai", current_patient_id, "time-to-event.json"),
            {
                "patientId": current_patient_id,
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "plugin": "time_to_event.ts_xgb",
                "horizons": horizons,
                "cohortSize": len(cohort_order),
                "currentRisk": horizon_scores,
                "byDomain": domain_results,
            },
        )

        return risk_from_score(current_probability), {
            "timeToEventPlugin": "time_to_event.ts_xgb",
            "timeToEventHorizons": horizons,
            "timeToEventHorizonScores": horizon_scores,
            "timeToEventEventCount": int(sum(1 for _, status in event_rows if status)),
            "timeToEventCohortSize": len(cohort_order),
            "timeToEventFeatureCount": len(feature_names),
            "timeToEventSampleIds": cohort_order,
            "timeToEventByDomain": domain_results,
            "timeToEventManifest": os.path.join(STORAGE_ROOT, "model-artifacts", "temporai", current_patient_id, "time-to-event.json"),
        }
    except Exception as exc:  # pragma: no cover - optional at runtime
        return None, {"error": str(exc)}


def build_tempor_time_series_rows(frame, sample_id: str) -> list[dict]:
    if pd is None or frame is None or frame.empty:
        return [{"sample_idx": sample_id, "time_idx": 0, "encounter": 0.0}]

    pivot = (
        frame.assign(kind=frame["kind"].astype(str))
        .pivot_table(index="effective_at", columns="kind", values="value", aggfunc="mean")
        .sort_index()
    )

    rows = []
    for offset, (_, row) in enumerate(pivot.iterrows()):
        rows.append({"sample_idx": sample_id, "time_idx": offset, **row.to_dict()})
    return rows or [{"sample_idx": sample_id, "time_idx": 0, "encounter": 0.0}]


def build_tempor_plugin_prediction(payload: dict, current_patient_id: str) -> tuple[float | None, dict]:
    runtime = load_tempor_runtime()
    if not runtime.get("available"):
        return None, {"error": runtime.get("note", "tempor runtime unavailable")}

    try:
        from tempor import plugin_loader
        from tempor.data.dataset import OneOffPredictionDataset

        cohort_entries = build_prediction_cohort(payload)
        cohort_order = []
        sample_rows_by_patient = []
        static_rows = []
        target_rows = []

        for entry in cohort_entries:
            patient = entry.get("patient", {})
            integrated = entry.get("integratedData", {})
            patient_id = patient.get("id")
            if not patient_id:
                continue

            context = build_feature_context(patient, integrated)
            static_features = context["static_features"]
            cohort_order.append(patient_id)
            sample_rows_by_patient.append(build_tempor_time_series_rows(context["temporal_frame"], patient_id))
            static_rows.append(
                {
                    "age": safe_float(static_features.get("age")),
                    "bmi": safe_float(static_features.get("bmi")),
                    "condition_count": safe_float(static_features.get("condition_count")),
                    "alert_count": safe_float(static_features.get("alert_count")),
                    "nt_probnp": safe_float(static_features.get("nt_probnp")),
                    "average_daily_steps": safe_float(static_features.get("average_daily_steps")),
                    "average_sleep_hours": safe_float(static_features.get("average_sleep_hours")),
                }
            )
            target_rows.append(
                {
                    "label": derive_outcome_label(patient, static_features)
                }
            )

        if len(cohort_order) < 4:
            return None, {"error": "tempor cohort too small for plugin training"}

        unique_labels = {row["label"] for row in target_rows}
        if len(unique_labels) == 1:
            target_rows[-1]["label"] = 1 - target_rows[-1]["label"]

        feature_names = sorted(
            {
                key
                for rows in sample_rows_by_patient
                for row in rows
                for key in row.keys()
                if key not in {"sample_idx", "time_idx"}
            }
        ) or ["encounter"]
        max_steps = max(len(rows) for rows in sample_rows_by_patient)
        time_series_tensor = np.full((len(sample_rows_by_patient), max_steps, len(feature_names)), np.nan, dtype=float)
        for sample_index, rows in enumerate(sample_rows_by_patient):
            for step_index, row in enumerate(rows):
                for feature_index, feature_name in enumerate(feature_names):
                    time_series_tensor[sample_index, step_index, feature_index] = safe_float(
                        row.get(feature_name), float("nan")
                    )

        static_matrix = np.array(
            [
                [
                    row["age"],
                    row["bmi"],
                    row["condition_count"],
                    row["alert_count"],
                    row["nt_probnp"],
                    row["average_daily_steps"],
                    row["average_sleep_hours"],
                ]
                for row in static_rows
            ],
            dtype=float,
        )
        target_matrix = np.array([[row["label"]] for row in target_rows], dtype=float)

        dataset = OneOffPredictionDataset(
            time_series=time_series_tensor,
            static=static_matrix,
            targets=target_matrix
        )

        imputer = plugin_loader.get("preprocessing.imputation.temporal.ffill")
        scaler = plugin_loader.get("preprocessing.scaling.temporal.ts_standard_scaler")
        model = plugin_loader.get(
            "prediction.one_off.classification.nn_classifier",
            n_iter=3,
            batch_size=2,
            patience=2,
            train_ratio=0.67,
            random_state=7
        )

        transformed = scaler.fit_transform(imputer.fit_transform(dataset))
        model.fit(transformed)
        probabilities = model.predict_proba(transformed).dataframe()

        current_index = cohort_order.index(current_patient_id)
        current_probability = float(probabilities.iloc[current_index, -1])

        return risk_from_score(current_probability), {
            "plugin": "prediction.one_off.classification.nn_classifier",
            "preprocessors": [
                "preprocessing.imputation.temporal.ffill",
                "preprocessing.scaling.temporal.ts_standard_scaler"
            ],
            "cohortSize": len(cohort_order),
            "timeSeriesRows": int(sum(len(rows) for rows in sample_rows_by_patient)),
            "timeSeriesFeatureCount": int(len(feature_names)),
            "trainedSampleIds": cohort_order,
            "probabilityColumn": str(probabilities.columns[-1]),
        }
    except Exception as exc:  # pragma: no cover - optional at runtime
        return None, {"error": str(exc)}


def build_reference_rows(base_features: dict, task: str) -> tuple[list[dict], list[int]]:
    rows = []
    labels = []

    task_adjustments = {
        "temporai": [
            ({"average_daily_steps": +2600, "alert_count": -2, "nt_probnp": -180, "step_count_slope": +120}, 0),
            ({"average_daily_steps": +1600, "alert_count": -1, "resting_heart_rate": -10}, 0),
            ({"average_daily_steps": -800, "alert_count": +1, "nt_probnp": +120, "heart_rate_mean": +8}, 1),
            ({"average_daily_steps": -1400, "alert_count": +2, "nt_probnp": +260, "heart_rate_latest": +12}, 1)
        ],
        "pyhealth": [
            ({"condition_count": -1, "average_sleep_hours": +1.2, "average_daily_steps": +2200, "hba1c": -1.6}, 0),
            ({"condition_count": 0, "average_daily_steps": +900, "weekly_exercise_minutes": +90, "ldl": -0.8}, 0),
            ({"condition_count": +1, "average_sleep_hours": -0.8, "average_daily_steps": -900, "egfr": -12}, 1),
            ({"condition_count": +2, "average_sleep_hours": -1.4, "average_daily_steps": -1700, "alert_count": +2}, 1)
        ],
        "disease-prediction": [
            ({"alert_count": -2, "condition_token_count": -2, "encounter_count": -1}, 0),
            ({"alert_count": -1, "condition_token_count": -1, "resting_heart_rate": -6}, 0),
            ({"alert_count": +1, "condition_token_count": +2, "encounter_count": +1}, 1),
            ({"alert_count": +2, "condition_token_count": +3, "resting_heart_rate": +10}, 1)
        ]
    }

    for adjustments, label in task_adjustments[task]:
        row = dict(base_features)
        for key, delta in adjustments.items():
            row[key] = max(0.0, safe_float(row.get(key)) + safe_float(delta))
        rows.append(row)
        labels.append(label)

    low_risk_template = dict(base_features)
    high_risk_template = dict(base_features)
    low_risk_template.update({"alert_count": 0.0, "average_daily_steps": max(3500.0, low_risk_template["average_daily_steps"]), "average_sleep_hours": max(7.0, low_risk_template["average_sleep_hours"])})
    high_risk_template.update({"alert_count": max(3.0, high_risk_template["alert_count"]), "average_daily_steps": min(1800.0, high_risk_template["average_daily_steps"]), "average_sleep_hours": min(5.5, high_risk_template["average_sleep_hours"] or 5.5)})
    rows.extend([low_risk_template, high_risk_template, dict(base_features)])
    labels.extend([0, 1, 1 if base_features.get("alert_count", 0) >= 2 else 0])
    return rows, labels


def logistic_probability(feature_names: list[str], rows: list[dict], labels: list[int], current_row: dict) -> float:
    if LogisticRegression is None:
        return 0.5

    matrix = [[safe_float(row.get(name)) for name in feature_names] for row in rows]
    current_vector = [[safe_float(current_row.get(name)) for name in feature_names]]
    model = LogisticRegression(max_iter=200, solver="liblinear")
    model.fit(matrix, labels)
    return float(model.predict_proba(current_vector)[0][1])


def score_temporai(static_features: dict, signals: list[str], tempor_status: dict, tempor_pipeline: dict) -> tuple[float, str, list[str]]:
    feature_names = [
        "condition_count",
        "alert_count",
        "nt_probnp",
        "egfr",
        "average_daily_steps",
        "average_sleep_hours",
        "heart_rate_latest",
        "heart_rate_mean",
        "step_count_slope",
        "sleep_analysis_mean"
    ]
    rows, labels = build_reference_rows(static_features, "temporai")
    fallback_score = logistic_probability(feature_names, rows, labels, static_features)
    plugin_score = tempor_pipeline.get("score")
    score = plugin_score if isinstance(plugin_score, (int, float)) else fallback_score
    explanation = "基于时序生命体征、活动和再入院相关特征形成时间序列风险评分。"
    if plugin_score is not None:
        explanation = "基于 TemporAI 真实插件链完成时序插补、标准化和 one-off 分类预测。"
        explanation += f" 当前 cohort={tempor_pipeline.get('cohortSize', 0)}，时序特征={tempor_pipeline.get('timeSeriesFeatureCount', 0)}。"
    if tempor_status.get("available"):
        explanation += f" 当前已加载 TemporAI 运行时，{tempor_status.get('note', '').strip()}。"
    return risk_from_score(score), explanation, [
        "强化日级步数、心率和睡眠数据接入",
        "对心衰/肾病共病患者增加周级复测",
        "将高风险人群纳入预警阈值和再入院随访"
    ]


def score_pyhealth(static_features: dict, pyhealth_status: dict, pyhealth_pipeline: dict) -> tuple[float, str, list[str]]:
    feature_names = [
        "age",
        "condition_count",
        "severe_condition_count",
        "alert_count",
        "medication_count",
        "hba1c",
        "ldl",
        "egfr",
        "nt_probnp",
        "average_daily_steps",
        "weekly_exercise_minutes",
        "average_sleep_hours",
        "condition_token_count",
        "condition_encoded_tokens"
    ]
    rows, labels = build_reference_rows(static_features, "pyhealth")
    fallback_score = logistic_probability(feature_names, rows, labels, static_features)
    pipeline_score = pyhealth_pipeline.get("score")
    score = pipeline_score if isinstance(pipeline_score, (int, float)) else fallback_score
    if isinstance(pyhealth_pipeline.get("positiveLabelRate"), (int, float)):
        prevalence = float(pyhealth_pipeline.get("positiveLabelRate"))
        score = risk_from_score((score * 0.8) + (prevalence * 0.2))

    explanation = "基于结构化病种、检验、行为和药物特征形成多模态慢病风险分层。"
    if pyhealth_pipeline.get("sampleCount"):
        explanation = "基于 PyHealth SampleEHRDataset 构建真实 cohort 数据集，并在 task pipeline 上汇总慢病风险特征。"
        explanation += f" 当前样本={pyhealth_pipeline.get('sampleCount')}，阳性率={pyhealth_pipeline.get('positiveLabelRate')}。"
    if pyhealth_pipeline.get("model"):
        explanation += f" 当前已使用 {pyhealth_pipeline.get('model')} + Trainer 完成一次本地训练/推理。"
    if pyhealth_status.get("available"):
        explanation += f" 当前已加载 PyHealth 运行时，{pyhealth_status.get('note', '').strip()}。"
    return risk_from_score(score), explanation, [
        "按疾病域输出统一慢病分层主评分",
        "把检验、门诊和患者生成数据持续汇总",
        "为 MDT 和健康管理师提供统一分层入口"
    ]


def score_text_model(patient_texts: list[str], current_features: dict) -> tuple[float, list[str]]:
    if TfidfVectorizer is None or LogisticRegression is None:
        return 0.5, []

    current_label = 1 if current_features.get("alert_count", 0) >= 2 else 0
    labels = [current_label, 1, 1, 1, 1, 0]
    vectorizer = TfidfVectorizer(max_features=24, ngram_range=(1, 2))
    matrix = vectorizer.fit_transform(patient_texts)
    model = LogisticRegression(max_iter=200, solver="liblinear")
    model.fit(matrix, labels)
    score = float(model.predict_proba(matrix[0])[0][1])
    features = vectorizer.get_feature_names_out()
    weights = matrix[0].toarray()[0]
    top_terms = [features[index] for index in np.argsort(weights)[::-1] if weights[index] > 0][:8] if np is not None else []
    return risk_from_score(score), top_terms


def build_predictions(payload: dict) -> dict:
    patient = payload.get("patient", {})
    integrated = payload.get("integratedData", {})
    conditions = patient.get("chronicConditions", [])
    alerts = patient.get("alerts", [])
    observations = integrated.get("healthKit", {}).get("rawObservations", [])
    observation_kinds = [item.get("kind") for item in observations if item.get("kind")]
    feature_context = build_feature_context(patient, integrated)
    text_corpus = feature_context["text_corpus"]
    top_terms, _ = extract_top_terms(text_corpus)
    tempor_status = load_tempor_runtime()
    pyhealth_metrics, pyhealth_status, pyhealth_pipeline = build_pyhealth_dataset_pipeline(payload, patient.get("id"))
    static_features = dict(feature_context["static_features"])
    static_features.update(pyhealth_metrics)
    tempor_pipeline_score, tempor_pipeline = build_tempor_plugin_prediction(payload, patient.get("id"))
    tempor_pipeline["score"] = tempor_pipeline_score
    tempor_tte_score, tempor_tte_pipeline = build_tempor_time_to_event_prediction(payload, patient.get("id"))
    tempor_pipeline.update(tempor_tte_pipeline)
    pyhealth_model_score, pyhealth_model_pipeline = build_pyhealth_model_prediction(payload, patient.get("id"))
    pyhealth_pipeline.update(pyhealth_model_pipeline)
    pyhealth_pipeline["score"] = pyhealth_model_score

    if tempor_pipeline_score is not None:
        tempor_status["note"] = (
            f"{tempor_status.get('note', '').strip()} Using {tempor_pipeline.get('plugin')} with "
            f"{tempor_pipeline.get('cohortSize', 0)} samples."
        ).strip()
    if tempor_tte_score is not None:
        tempor_status["note"] = (
            f"{tempor_status.get('note', '').strip()} Time-to-event via "
            f"{tempor_pipeline.get('timeToEventPlugin')}."
        ).strip()
    if pyhealth_model_score is not None:
        pyhealth_status["note"] = (
            f"{pyhealth_status.get('note', '').strip()} Using {pyhealth_pipeline.get('model')} with "
            f"{pyhealth_pipeline.get('sampleCount', 0)} samples."
        ).strip()

    tempor_score, tempor_explanation, tempor_actions = score_temporai(
        static_features,
        feature_context["temporal_signals"],
        tempor_status,
        tempor_pipeline
    )
    pyhealth_score, pyhealth_explanation, pyhealth_actions = score_pyhealth(static_features, pyhealth_status, pyhealth_pipeline)
    text_score, text_terms = score_text_model(text_corpus, static_features)

    package_status = {
        "temporai": tempor_status,
        "pyhealth": pyhealth_status,
        "pandas": {
            "available": pd is not None,
            "version": package_version("pandas"),
            "note": "tabular and temporal feature engineering"
        },
        "numpy": {
            "available": np is not None,
            "version": package_version("numpy"),
            "note": "array math and top-term ranking"
        },
        "scikit-learn": {
            "available": LogisticRegression is not None,
            "version": package_version("scikit-learn"),
            "note": "local logistic models for tabular/text scoring"
        }
    }

    return {
        "patientId": patient.get("id"),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "inputSummary": {
            "conditions": [item.get("name") for item in conditions if item.get("name")],
            "alerts": alerts,
            "observationsUsed": observation_kinds,
        },
        "featureEngineering": {
            "staticFeatures": {key: round(safe_float(value), 4) for key, value in static_features.items()},
            "temporalSeriesPoints": feature_context["temporal_series_points"],
            "temporalSignals": feature_context["temporal_signals"],
            "textFeatureTerms": top_terms or text_terms
        },
        "pipelines": {
            "temporai": tempor_pipeline,
            "pyhealth": pyhealth_pipeline
        },
        "runtime": {
            "python": platform.python_version(),
            "packages": package_status
        },
        "predictions": [
            {
                "provider": "temporai",
                "task": "30天病情恶化/再入院时序风险",
                "score": tempor_score,
                "level": risk_level(tempor_score),
                "explanation": tempor_explanation,
                "recommendedActions": tempor_actions,
            },
            {
                "provider": "temporai",
                "task": "90天时间到事件风险",
                "score": risk_from_score(tempor_tte_score if isinstance(tempor_tte_score, (int, float)) else tempor_score),
                "level": risk_level(risk_from_score(tempor_tte_score if isinstance(tempor_tte_score, (int, float)) else tempor_score)),
                "explanation": (
                    f"基于 TemporAI {tempor_pipeline.get('timeToEventPlugin', 'time_to_event.ts_xgb')} 执行 time-to-event 预测，"
                    f"输出 7/30/90 天事件风险曲线。"
                    if tempor_pipeline.get("timeToEventPlugin")
                    else "时间到事件风险未能完成，当前回退到时序主风险结果。"
                ),
                "recommendedActions": [
                    "把高风险时间窗接入随访计划和复诊提醒",
                    "对 7 天和 30 天高风险患者优先触发电话/线上干预",
                    "将 time-to-event 曲线纳入住院后管理看板"
                ],
            },
            {
                "provider": "pyhealth",
                "task": "多模态慢病风险分层",
                "score": pyhealth_score,
                "level": risk_level(pyhealth_score),
                "explanation": pyhealth_explanation,
                "recommendedActions": pyhealth_actions,
            },
            {
                "provider": "disease-prediction",
                "task": "门诊文本与病历摘要疾病风险分类",
                "score": text_score,
                "level": risk_level(text_score),
                "explanation": "基于病种、告警、就诊原因和生活方式文本构建 TF-IDF 特征并完成本地文本风险分类。",
                "recommendedActions": [
                    "把 AI 病历草案与 KG-Followup 追问并入文本特征",
                    "增加门诊病程记录作为本地训练样本",
                    "保留 top terms 供医生解释模型依据"
                ],
            },
        ],
    }


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self._send_json(
                200,
                {
                    "status": "ok",
                    "service": "python-predictor",
                    "python": platform.python_version(),
                    "packages": {
                        "temporai": {"available": package_version("temporai") is not None, "version": package_version("temporai")},
                        "pyhealth": {"available": package_version("pyhealth") is not None, "version": package_version("pyhealth")},
                        "pandas": {"available": pd is not None, "version": package_version("pandas")},
                        "scikit-learn": {
                            "available": LogisticRegression is not None,
                            "version": package_version("scikit-learn")
                        }
                    }
                },
            )
            return
        self._send_json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/predict":
            self._send_json(404, {"error": "not found"})
            return

        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length).decode("utf-8") if length else "{}"
        payload = json.loads(body)
        result = build_predictions(payload)
        self._send_json(200, result)

    def log_message(self, format, *args):
        return

    def _send_json(self, status: int, payload: dict):
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8011)
    args = parser.parse_args()

    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
