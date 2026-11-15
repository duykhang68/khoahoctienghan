#!/usr/bin/env python3
"""Optional reproducible proxy tokenizer; never label this GPT-6 telemetry."""
import importlib.metadata
import json
from pathlib import Path
import subprocess

PIN = "0.9.0"
ENCODING = "o200k_base"
if importlib.metadata.version("tiktoken") != PIN:
    raise SystemExit(f"Use a separate environment with tiktoken=={PIN}")
import tiktoken

manifest = json.loads(Path("docs/architecture/context-benchmark.json").read_bytes())
encoding = tiktoken.get_encoding(ENCODING)

def serialize(task, records, shared):
    parts = ["TASK: " + task["prompt"] + "\n"]
    for path, data in [*shared, *records]:
        parts.append("\nFILE: " + path + "\n" + data.decode("utf-8") + "\nEND FILE\n")
    return "".join(parts)

def count(text):
    return len(encoding.encode(text, disallowed_special=()))

shared = [(path, Path(path).read_bytes()) for path in manifest["shared"]]
rows = []
for task in manifest["tasks"]:
    old = []
    for item in task["baseline"]:
        data = subprocess.check_output(["git", "show", manifest["baseline"]["sha"] + ":" + item["path"]])
        if len(data) != item["bytes"]:
            raise SystemExit("Baseline size mismatch: " + item["path"])
        old.append((item["path"], data))
    new = [(path, Path(path).read_bytes()) for path in task["candidate"]]
    rows.append({"id": task["id"], "baseline_tokens": count(serialize(task, old, [])),
                 "candidate_tokens": count(serialize(task, new, [])),
                 "baseline_with_shared": count(serialize(task, old, shared)),
                 "candidate_with_shared": count(serialize(task, new, shared))})
print(json.dumps({"tokenizer": f"tiktoken {PIN} {ENCODING}", "note": "Selected readsets, not GPT-6 input telemetry or cost", "tasks": rows}, indent=2))
