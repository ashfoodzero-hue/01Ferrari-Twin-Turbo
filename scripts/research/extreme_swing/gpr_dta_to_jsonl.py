# gpr_dta_to_jsonl.py — EXTREME SWING spec §3 C6 input (2026-11-01): the Caldara-Iacoviello daily Geopolitical Risk index
# (matteoiacoviello.com/gpr_files/data_gpr_daily_recent.dta, downloaded 2026-11-01; the .xls copy needs a reader we do not have).
# Usage: python gpr_dta_to_jsonl.py <in.dta> <out.jsonl>. Single current snapshot, no vintages → HIST class; known_t = date + 1 day (spec C6).
import json, sys
import pandas as pd

d = pd.read_stata(sys.argv[1])
with open(sys.argv[2], 'w', encoding='utf8') as f:
    for r in d.itertuples(index=False):
        if pd.isna(r.GPRD):
            continue
        f.write(json.dumps({'date': r.date.strftime('%Y-%m-%d'), 'gprd': round(float(r.GPRD), 3), 'act': round(float(r.GPRD_ACT), 3), 'threat': round(float(r.GPRD_THREAT), 3)}) + '\n')
print(len(d), 'rows')
