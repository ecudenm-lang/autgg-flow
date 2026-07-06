import json, sys, time, urllib.request, os
# Poll + descarga robusta de un run de Apify (reemplaza el polling de PowerShell que falla en background).
# Uso: python apify_dl.py <tokenfile> <runId> <outfile>
TOKF, RUNID, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
TOK = open(TOKF, encoding='utf-8').read().strip()

def api(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)

deadline = time.time() + 25*60
while True:
    d = api(f"https://api.apify.com/v2/actor-runs/{RUNID}?token={TOK}")['data']
    st = d['status']; ds = d['defaultDatasetId']
    print(f"[{RUNID}] {st} items={d['stats'].get('outputItemCount')} usd={d.get('usageTotalUsd')}", flush=True)
    if st not in ('READY','RUNNING'): break
    if time.time() > deadline:
        print("TIMEOUT"); sys.exit(2)
    time.sleep(12)

items = api(f"https://api.apify.com/v2/datasets/{ds}/items?token={TOK}&format=json&clean=true")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(items, open(OUT,'w',encoding='utf-8'), ensure_ascii=False)
print(f"OK status={st} -> {OUT} ({len(items)} items)")
