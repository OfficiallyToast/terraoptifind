python -m pip install -r requirements.txt && ^
python -m mypy . --check-untyped-defs && ^
python -m ruff check . --fix && ^
python -m ruff format . && ^
python generate.py