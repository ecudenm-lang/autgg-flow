import json, sys, urllib.parse, urllib.request, time
# TrendTrack discovery — competidores DTC + anunciantes + muestra de copy + tabla de sofisticación.
# Uso: python trendtrack_discover.py <token_file> <V31_out_dir>
# Salidas: <V31>/trendtrack_raw.json  +  <V31>/COMPETITOR_DISCOVERY.md
TOKF, V31 = sys.argv[1], sys.argv[2]
TOK = open(TOKF, encoding='utf-8').read().strip()
BASE = "https://api.trendtrack.io/v1"

def get(path, **params):
    q = urllib.parse.urlencode({k:v for k,v in params.items() if v is not None})
    url = f"{BASE}/{path}?{q}" if q else f"{BASE}/{path}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOK}"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:
            if attempt == 2: return {"error": str(e)}
            time.sleep(2)

out = {"shops": {}, "advertisers": [], "ads_sample": [], "sophistication": []}

# 1) competidores DTC: nombres conocidos + términos de nicho
SHOP_QUERIES = ["Primal Remedies","Nutrissa","Glucora","blood sugar support","cinnamon blood sugar",
                "berberine","ceylon cinnamon","glucose supplement","control glucosa","azucar en sangre"]
for q in SHOP_QUERIES:
    d = get("shops", search=q, limit=6).get("data", [])
    for s in d:
        dom = s.get("domain")
        if dom and dom not in out["shops"]:
            out["shops"][dom] = {"domain":dom,"name":s.get("name"),
                "country":(s.get("profile") or {}).get("countryCode"),
                "category":(s.get("catalog") or {}).get("mainCategory"),
                "products":(s.get("catalog") or {}).get("productsCount"),
                "found_via":q}

# 2) anunciantes activos del nicho (quién pauta fuerte)
for q in ["blood sugar","glucose","diabetes","insulin resistance","cinnamon"]:
    d = get("advertisers", search=q, limit=5).get("data", [])
    for a in d:
        out["advertisers"].append({"name":a.get("name"),"activeAds":(a.get("advertising") or {}).get("activeAds"),
            "reach30d":(a.get("advertising") or {}).get("reach30d"),
            "ig":(a.get("profile") or {}).get("instagramFollowers"),"via":q})

# 3) muestra de copy real de ads por idioma (semilla del pool competidor + lectura de mensaje)
for cc,q,lang in [("US","cinnamon blood sugar","EN"),("US","insulin resistance","EN"),
                  ("ES","diabetes","ES"),("MX","diabetes","ES"),("ES","azucar","ES")]:
    d = get("ads", search=q, countryCode=cc, limit=8).get("data", [])
    for ad in d:
        c = ad.get("content") or {}
        out["ads_sample"].append({"lang":lang,"country":cc,"query":q,
            "advertiser":(ad.get("advertiser") or {}).get("name"),
            "status":ad.get("status"),"daysRunning":ad.get("daysRunning"),
            "cta":c.get("callToAction"),"landing":c.get("landingPageUrl"),
            "body":(c.get("body") or "")[:600]})

# 4) tabla de sofisticación (conteo de ads por país/término — lectura direccional de arbitraje)
for cc,q in [("US","blood sugar"),("US","insulin resistance"),("US","cinnamon"),
             ("MX","diabetes"),("ES","diabetes"),("ES","resistencia a la insulina"),("MX","azucar en sangre")]:
    tot = get("ads", search=q, countryCode=cc, limit=1).get("pagination",{}).get("total")
    out["sophistication"].append({"country":cc,"query":q,"ads_total":tot})

json.dump(out, open(f"{V31}/trendtrack_raw.json","w",encoding='utf-8'), ensure_ascii=False, indent=1)

# ---------- reporte markdown ----------
m=["# COMPETITOR DISCOVERY (TrendTrack) — Biozentra / nicho diabetes","*Descubrimiento automático de competidores DTC + anunciantes + sofisticación. Peso 0 en PI de deseo (pool competidor).*\n",
"## 1. Tiendas DTC candidatas (competidor)","| Dominio | Nombre | País | Categoría | #Prod | Vía |","|---|---|---|---|---|---|"]
for s in sorted(out["shops"].values(), key=lambda x:(x['country'] or 'zz')):
    m.append(f"| {s['domain']} | {s['name'] or ''} | {s['country'] or '?'} | {s['category'] or ''} | {s['products'] or ''} | {s['found_via']} |")
m+=["\n## 2. Anunciantes activos del nicho (quién pauta)","| Anunciante | Ads activos | Reach 30d | IG followers | Vía |","|---|---|---|---|---|"]
seen=set()
for a in sorted(out["advertisers"], key=lambda x:-(x['activeAds'] or 0)):
    k=a['name'];
    if k in seen: continue
    seen.add(k)
    m.append(f"| {a['name']} | {a['activeAds']} | {a['reach30d']} | {a['ig']} | {a['via']} |")
m+=["\n## 3. Tabla de sofisticación (conteo direccional de ads por país)","| País | Término | Ads en TrendTrack |","|---|---|---|"]
for s in out["sophistication"]:
    m.append(f"| {s['country']} | {s['query']} | {s['ads_total']} |")
m+=["\n> Lectura: EN (US) muestra volumen de ads mucho mayor que ES → mercado maduro más sofisticado → **arbitraje disponible** (mecanismo quemado en inglés = fresco en español). El search es amplio; usar como dirección, confirmar con la VoC.",
"\n## 4. Muestra de copy real de ads (semilla del pool competidor)"]
for ad in out["ads_sample"][:20]:
    m.append(f"\n**[{ad['lang']}·{ad['country']}] {ad['advertiser']}** ({ad['status']}, {ad['daysRunning']}d) → {ad['cta']}")
    m.append(f"> {ad['body']}")
    if ad['landing']: m.append(f"> landing: {ad['landing']}")
open(f"{V31}/COMPETITOR_DISCOVERY.md","w",encoding='utf-8').write("\n".join(m))
print(f"Tiendas: {len(out['shops'])} | anunciantes: {len(seen)} | ads muestra: {len(out['ads_sample'])}")
print("-> COMPETITOR_DISCOVERY.md + trendtrack_raw.json")
