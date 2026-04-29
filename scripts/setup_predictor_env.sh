#!/bin/sh
set -eu

python3 -m venv .venv-predictor
.venv-predictor/bin/pip install --upgrade pip
.venv-predictor/bin/pip install -r requirements-predictor.txt
.venv-predictor/bin/pip install --no-deps pyhealth==1.1.6 temporai==0.0.3
