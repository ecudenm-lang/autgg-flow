import json, sys, urllib.parse, urllib.request, time, hashlib, re
# TrendTrack — reúne ~100+ ads del nicho/competidores, compara HOOKS, y rankea los mejores para IMITAR.
# Enriquece el top con detalle (link real a Ad Library + hook extraído + transcript si existe).
# Uso: python trendtrack_ads.py <token_file> <out_dir>
TOKF, OUT = sys.argv[1], sys.argv[2]
TOK = open(TOKF, encoding='utf-8').read().strip()
BASE = "https://api.trendtrack.io/v1"

def api(path, **params):
    q = urllib.parse.urlencode({k:v for k,v in params.items() if v is not None})
    url = f"{BASE}/{path}" + (f"?{q}" if q else "")
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOK}"})
    for a in range(3):
        try:
            with urllib.request.urlopen(req, timeout=45) as r: return json.load(r)
        except Exception as e:
            if a==2: return {"data":[], "_err":str(e)}
            time.sleep(2)

# --- búsquedas: competidores directos + ángulos validados por nuestra VoC (EN y ES) ---
SEARCHES = [
 ("Primal Remedies",None),("Virelia",None),("Fling sugar guard",None),("Valley Point blood sugar",None),
 ("Nixulin",None),("Glucora",None),("Nutrissa",None),("ceylon cinnamon blood sugar","US"),
 ("ceylon cinnamon insulin","US"),("insulin resistance","US"),("insulin resistance symptoms","US"),
 ("blood sugar cravings belly fat","US"),("cinnamon blood sugar gummies","US"),("reverse prediabetes","US"),
 ("dark neck insulin","US"),("resistencia a la insulina","ES"),("resistencia a la insulina","MX"),
 ("azucar en sangre canela","MX"),("diabetes canela","MX"),("bajar azucar natural","MX"),
]

# léxico de NUESTROS ángulos ganadores (para puntuar relevancia y comparar hooks)
ANGLES = {
 'mecanismo/resistencia':['insulin resistance','resistencia a la insulina','your cells','pull sugar','root cause','causa raiz','puerta','door','glucose into','insulin high','insulina alta'],
 'des-culpar':['not lack of discipline','not discipline','no es disciplina','not your fault','no es tu culpa','willpower','fuerza de voluntad','lazy'],
 'cluster-sintomas':['cravings','antojos','belly fat','grasa abdominal','tired after','after meals','sueño','cansancio','dark neck','cuello','skin tag','manchas','fatigue','constant hunger','hambre'],
 'ceilan-vs-cassia':['ceylon','ceilan','cassia','coumarin','cumarina','wrong cinnamon','liver','higado'],
 'reversion/control':['reverse','revertir','stabilize','steady','back in control','recuper','normal readings','prevent diabetes'],
}
COMPETS = ['primal','virelia','fling','valley point','valleypoint','nixulin','glucora','nutrissa','zanust','sugar guard','shopvirelia','hellofling','tryvalleypoint']

def hook_of(body):
    for ln in (body or '').split('\n'):
        s=re.sub(r'^[\s\W_]+','',ln).strip()
        if len(s)>=12: return s[:160]
    return (body or '')[:160]
def angle_tags(text):
    t=(text or '').lower(); return [n for n,kw in ANGLES.items() if any(k in t for k in kw)]
def is_compet(name,domain):
    s=((name or '')+' '+(domain or '')).lower(); return any(c in s for c in COMPETS)
def norm_ad(a, via, boost=0):
    c=a.get('content') or {}; adv=a.get('advertiser') or {}; m=a.get('media') or {}; met=a.get('metrics') or {}; au=a.get('audience') or {}
    body=c.get('body') or ''
    return {"id":a.get('id'),"advertiser":adv.get('name'),"domain":c.get('landingPageDomain'),
      "adv_live":adv.get('liveAdsCount') or 0,"adv_reach30":adv.get('reach30d') or 0,"adv_total":adv.get('totalReach') or 0,
      "status":a.get('status'),"days":a.get('daysRunning') or 0,"reach":met.get('reach') or 0,"spend":met.get('estimatedSpend') or 0,
      "type":m.get('type'),"media":m.get('mediaUrl'),"country":au.get('mainCountry'),"cta":c.get('callToAction'),
      "landing":c.get('landingPageUrl'),"hook":hook_of(body),"body":body,"via":via,"boost":boost}

# --- recolección ---
pool={}
def add(a, via, boost=0):
    r=norm_ad(a,via,boost)
    if not r["id"] or len(r["body"])<25: return
    key=hashlib.md5(r["body"][:140].encode()).hexdigest()
    prev=pool.get(key)
    if (not prev) or (r["days"],r["reach"])>(prev["days"],prev["reach"]):
        r["boost"]=max(boost, prev["boost"] if prev else 0); pool[key]=r

for q,cc in SEARCHES:
    for a in api("ads",search=q,countryCode=cc,limit=35).get("data",[]): add(a,q)
# competidor gemelo: sus TOP ADS (ganadores con métricas reales)
for row in api("brandtrackers/10e62a2a-e1dd-4d60-9361-646e82cc7c03/top-ads",limit=25).get("data",[]):
    if isinstance(row,dict) and row.get("ad"): add(row["ad"],"Primal top-ads",boost=25)

# --- score preliminar ---
def score(r):
    s=r["days"]*1.5                      # longevidad = señal #1 de ganador
    s+=min(r["reach"],300000)/2500
    s+=min(r["adv_reach30"],300000)/4000 # el anunciante mueve reach
    s+=len(angle_tags(r["hook"]+' '+r["body"]))*9   # match con nuestros ángulos
    s+=18 if is_compet(r["advertiser"],r["domain"]) else 0
    s+=10 if r["status"]=="active" else 0
    s+=r["adv_live"]/6 + r["boost"]
    return round(s,1)
for r in pool.values(): r["tags"]=angle_tags(r["hook"]+' '+r["body"]); r["score"]=score(r)
ranked=sorted(pool.values(),key=lambda x:-x["score"])

# --- enriquecer el TOP con detalle: link real Ad Library + hook extraído + transcript ---
for r in ranked[:22]:
    d=api(f"ads/{r['id']}").get("data",{})
    if isinstance(d,dict):
        r["adlib"]=((d.get("links") or {}).get("adLibraryUrl"))
        ca=(d.get("creativeAnalysis") or {}).get("hook") or {}
        if ca.get("text"): r["hook"]=ca["text"][:180]
        tx=d.get("transcript")
        r["transcript"]=(tx.get("fullText") if isinstance(tx,dict) else None)
# fallback link para el resto
for r in ranked:
    if not r.get("adlib") and r["id"] and "_" in r["id"]:
        r["adlib"]=f"https://www.facebook.com/ads/library/?id={r['id'].split('_',1)[1]}"

json.dump(ranked, open(f"{OUT}/trendtrack_ads_raw.json","w",encoding='utf-8'), ensure_ascii=False, indent=1)
tx_avail=sum(1 for r in ranked if r.get("transcript"))
print(f"ads únicos con copy: {len(ranked)} | con transcript: {tx_avail}")
print("TOP para imitar (resumen):")
for i,r in enumerate(ranked[:15],1):
    print(f" #{i} [{r['score']}] {r['advertiser']} · {r['country']} · {r['status']} · {r['days']}d · reach {r['reach']} · {'/'.join(r['tags']) or '—'}")
    print(f"    HOOK: {r['hook']}")
    print(f"    {r['adlib']}")
