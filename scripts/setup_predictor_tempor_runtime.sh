#!/bin/sh
set -eu

export MPLBACKEND=Agg

if [ ! -x ".venv-predictor/bin/python" ]; then
  echo "missing .venv-predictor, run sh scripts/setup_predictor_env.sh first" >&2
  exit 1
fi

.venv-predictor/bin/pip install -r requirements-tempor-runtime.txt
.venv-predictor/bin/pip install --no-deps \
  clairvoyance2==0.0.2 \
  hyperimpute==0.1.17 \
  matplotlib==3.9.4 \
  torch==2.8.0 \
  torchvision==0.23.0 \
  optuna==4.8.0 \
  cmaes==0.12.0 \
  seaborn==0.13.2 \
  lifelines==0.28.0 \
  dask==2024.8.0 \
  geomloss==0.2.6 \
  torchcde==0.2.5 \
  torchdiffeq==0.2.5 \
  torchsde==0.2.6 \
  torchlaplace==0.0.4 \
  xgbse==0.3.3 \
  tsai==0.4.1
