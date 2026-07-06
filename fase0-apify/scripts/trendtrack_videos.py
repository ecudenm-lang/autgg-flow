import json, sys, urllib.parse, urllib.request, time, hashlib, re
# TrendTrack — recolecta 100+ ADS DE VIDEO del nicho (competidores + ángulos), rankea por imitabilidad,
# enriquece el top con link real + hook + transcript. Uso: python trendtrack_videos.py <token> <out_dir>
TOKF, OUT = sys.argv[1], sys.argv[2]
TOK = open(TOKF, encoding='utf-8').read().strip()
B="https://api.trendtrack.io/v1"
def api(path, **p):
    q=urllib.parse.urlencode({k:v for k,v in p.items() if v is not None})
    req=urllib.request.Request(f"{B}/{path}"+(f"?{q}" if q else ""),headers={"Authorization":f"Bearer {TOK}"})
    for a in range(3):
        try:
            with urllib.request.urlopen(req,timeout=45) as r: return json.load(r)
        except Exception as e:
            if a==2: return {"data":[],"_err":str(e)}
            time.sleep(2)

SEARCHES=["Primal Remedies","Virelia","Fling","Valley Point","Nixulin","Glucora","Nutrissa",
 "ceylon cinnamon blood sugar","insulin resistance","insulin resistance symptoms","blood sugar cravings belly fat",
 "cinnamon blood sugar","reverse prediabetes","dark neck insulin","prediabetes coach","metformin blood sugar",
 "resistencia a la insulina","azucar en sangre","diabetes canela","bajar azucar natural","revertir prediabetes","ovario poliquistico insulina"]
TRACKERS={"Primal":"10e62a2a-e1dd-4d60-9361-646e82cc7c03","Niam PCOS":"3cd31b23-f2be-4667-ac24-1852f3e577cb",
 "Bray Nathan":"105bcdea-cd4a-486e-a536-44cf868376a3","Fling":"a8176ef7-64e1-4afe-aed3-83e8b48a5414","Olivia Harper":"8b64ef57-9cef-4974-8460-d6d524b19f08"}
ANGLES={'mecanismo':['insulin resistance','resistencia a la insulina','your cells','pull sugar','root cause','causa raiz','puerta','glucose into','insulina alta'],
 'des-culpar':['not lack of discipline','not discipline','no es disciplina','not your fault','no es tu culpa','willpower','effort'],
 'sintomas':['cravings','antojos','belly fat','grasa','tired after','after meals','sueño','cansancio','dark neck','cuello','skin tag','manchas','constant hunger','hambre'],
 'ceilan-cassia':['ceylon','ceilan','cassia','coumarin','cumarina','wrong cinnamon','liver'],
 'reversion':['reverse','revertir','stabilize','steady','back in control','recuper','prevent diabetes','normal']}
COMPETS=['primal','virelia','fling','valley point','valleypoint','nixulin','glucora','nutrissa','sugar guard','roots & remedies']
NICHE=re.compile(r'(blood sugar|insulin|diabet|cinnamon|canela|glucos|azucar|azúcar|prediab|metformin|a1c|resistencia|berberine|berberina|pcos|ovario)',re.I)
NOISE=re.compile(r'(audio|plugin|compression|harmonic|mixland|cellulite|hashimoto|thyroid|tiroid)',re.I)

def hook_of(b):
    for ln in (b or '').split('\n'):
        s=re.sub(r'^[\s\W_]+','',ln).strip()
        if len(s)>=12: return s[:170]
    return (b or '')[:170]
def tags(t):
    t=(t or '').lower(); return [n for n,kw in ANGLES.items() if any(k in t for k in kw)]
def compet(name,dom): s=((name or '')+' '+(dom or '')).lower(); return any(c in s for c in COMPETS)
def norm(a,via,boost=0):
    c=a.get('content') or {}; adv=a.get('advertiser') or {}; m=a.get('media') or {}; met=a.get('metrics') or {}; au=a.get('audience') or {}
    return {"id":a.get('id'),"advertiser":adv.get('name'),"pageId":adv.get('facebookPageId'),"domain":c.get('landingPageDomain'),
      "adv_r30":adv.get('reach30d') or 0,"adv_live":adv.get('liveAdsCount') or 0,"status":a.get('status'),"days":a.get('daysRunning') or 0,
      "reach":met.get('reach') or 0,"media":m.get('mediaUrl'),"country":au.get('mainCountry'),"cta":c.get('callToAction'),
      "landing":c.get('landingPageUrl'),"body":c.get('body') or "","hook":hook_of(c.get('body')),"via":via,"boost":boost}

pool={}
def add(a,via,boost=0):
    if (a.get('media') or {}).get('type')!='video': return
    r=norm(a,via,boost)
    if not r["id"] or len(r["body"])<20: return
    if not NICHE.search(r["body"]) or NOISE.search(r["body"]): return
    key=hashlib.md5(r["body"][:140].encode()).hexdigest()
    prev=pool.get(key)
    if (not prev) or (r["days"],r["reach"])>(prev["days"],prev["reach"]):
        r["boost"]=max(boost,prev["boost"] if prev else 0); pool[key]=r

for q in SEARCHES:
    for pg in (1,2):
        for a in api("ads",search=q,mediaType="video",sortBy="longestRunning",status="all",page=pg,limit=50).get("data",[]):
            add(a,q)
for name,bid in TRACKERS.items():
    for row in api(f"brandtrackers/{bid}/top-ads",mediaType="video",sortBy="daysRunning",limit=25).get("data",[]):
        if isinstance(row,dict) and row.get("ad"): add(row["ad"],f"{name} top",boost=20)

def score(r):
    s=r["days"]*1.4+min(r["reach"],300000)/2500+min(r["adv_r30"],400000)/4000
    s+=len(tags(r["hook"]+' '+r["body"]))*9+(18 if compet(r["advertiser"],r["domain"]) else 0)
    s+=10 if r["status"]=="active" else 0
    s+=r["adv_live"]/6+r["boost"]; return round(s,1)
for r in pool.values(): r["tags"]=tags(r["hook"]+' '+r["body"]); r["score"]=score(r)
ranked=sorted(pool.values(),key=lambda x:-x["score"])

# transcripts disponibles por adId (de los trackers)
txmap={}
for name,bid in TRACKERS.items():
    for t in api(f"brandtrackers/{bid}/transcripts",limit=20).get("data",[]):
        sa=t.get("sampleAd") or {}
        if sa.get("adId"): txmap[sa["adId"]]={"fullText":t.get("fullText"),"impr":t.get("totalImpressions"),"days":t.get("longestRunning")}

# enriquecer top 30: link real Ad Library + hook extraído + transcript
for r in ranked[:30]:
    d=api(f"ads/{r['id']}").get("data",{})
    if isinstance(d,dict):
        r["adlib"]=(d.get("links") or {}).get("adLibraryUrl")
        h=((d.get("creativeAnalysis") or {}).get("hook") or {}).get("text")
        if h: r["hook"]=h[:180]
        tx=d.get("transcript")
        if isinstance(tx,dict) and tx.get("fullText"): r["transcript"]=tx["fullText"]
    if r.get("id") in txmap and not r.get("transcript"): r["transcript"]=txmap[r["id"]]["fullText"]
for r in ranked:
    if not r.get("adlib") and r["id"] and "_" in r["id"]: r["adlib"]=f"https://www.facebook.com/ads/library/?id={r['id'].split('_',1)[1]}"
    r["transcript"]=r.get("transcript")

json.dump(ranked,open(f"{OUT}/trendtrack_videos.json","w",encoding='utf-8'),ensure_ascii=False,indent=1)
with_tx=sum(1 for r in ranked if r.get("transcript"))
print(f"VIDEOS únicos del nicho: {len(ranked)} | con transcript: {with_tx}")
print("TOP 20:")
for i,r in enumerate(ranked[:20],1):
    print(f" #{i} [{r['score']}] {r['advertiser']} · {r['country']} · {r['status']} · {r['days']}d · reach {r['reach']} · [{'/'.join(r['tags']) or '—'}] tx:{'sí' if r.get('transcript') else 'no'}")
    print(f"    {r['hook']}")
    print(f"    {r['adlib']}")
