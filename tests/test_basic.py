"""
基础测试 — 验证项目结构和导入
"""
import os
import json
import pytest


def test_project_structure():
    """测试项目基本结构"""
    assert os.path.exists("README.md"), "README.md 不存在"
    assert os.path.exists("requirements.txt"), "requirements.txt 不存在"


def test_data_files():
    """测试数据文件有效性"""
    data_dir = "data"
    if os.path.exists(data_dir):
        for filename in os.listdir(data_dir):
            if filename.endswith(".json"):
                filepath = os.path.join(data_dir, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    json.load(f)  # 验证 JSON 有效


def test_python_syntax():
    """测试 Python 文件语法"""
    src_dir = "src"
    if os.path.exists(src_dir):
        for root, dirs, files in os.walk(src_dir):
            for file in files:
                if file.endswith(".py"):
                    filepath = os.path.join(root, file)
                    with open(filepath, "r", encoding="utf-8") as f:
                        compile(f.read(), filepath, "exec")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
