import json, sys, time, urllib.request, os
# Lanzador Apify completo en Python (POST + poll + download). Robusto en background (urllib, no PowerShell).
# Uso: python apify_run.py <tokenfile> <actor user/name> <inputfile> <outfile> [timeoutMin]
TOKF, ACTOR, INP, OUT = sys.argv[1:5]
TMIN = int(sys.argv[5]) if len(sys.argv) > 5 else 25
TOK = open(TOKF, encoding='utf-8').read().strip()
actor = ACTOR.replace('/', '~')
body = open(INP, 'rb').read()

def post(url, data):
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json; charset=utf-8'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url), timeout=60) as r:
        return json.load(r)

run = post(f"https://api.apify.com/v2/acts/{actor}/runs?token={TOK}", body)['data']
rid, ds = run['id'], run['defaultDatasetId']
print(f"[{ACTOR}] runId={rid} dataset={ds}", flush=True)

deadline = time.time() + TMIN*60
while True:
    d = get(f"https://api.apify.com/v2/actor-runs/{rid}?token={TOK}")['data']
    st = d['status']
    print(f"  {st} items={d['stats'].get('outputItemCount')} usd={d.get('usageTotalUsd')}", flush=True)
    if st not in ('READY', 'RUNNING'): break
    if time.time() > deadline:
        print("TIMEOUT — run sigue en Apify:", rid); sys.exit(2)
    time.sleep(12)

items = get(f"https://api.apify.com/v2/datasets/{ds}/items?token={TOK}&format=json&clean=true")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(items, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
print(f"OK status={st} -> {OUT} ({len(items)} items)")
