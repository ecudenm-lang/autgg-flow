import json, sys, re, urllib.parse, urllib.request, time
# 110 fichas + transcripts (timePeriod=last1y) adjuntos + sección de transcripciones ganadoras.
# Uso: python build_ads_doc.py <token_file> <V31_dir>
TOKF, V31 = sys.argv[1], sys.argv[2]
TOK=open(TOKF,encoding='utf-8').read().strip()
def api(path,method="GET",body=None,**p):
    q=urllib.parse.urlencode({k:v for k,v in p.items() if v is not None})
    url=f"https://api.trendtrack.io/v1/{path}"+(f"?{q}" if q else "")
    data=json.dumps(body).encode() if body is not None else None
    req=urllib.request.Request(url,data=data,method=method,headers={"Authorization":f"Bearer {TOK}","Content-Type":"application/json"})
    for a in range(2):
        try:
            with urllib.request.urlopen(req,timeout=40) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            try: return json.load(e)
            except: return {"data":[]}
        except Exception:
            if a==1: return {"data":[]}
            time.sleep(1)

ads=json.load(open(f"{V31}/trendtrack_videos.json",encoding='utf-8'))
DROP=re.compile(r'(cookie|galleta|juice|jugo|shampoo|perfume|hyperpigment|brightening|skincare|paneer doda|diabe choice|pigmentaci|acné|cera |depila)',re.I)
BSUGAR=re.compile(r'(blood sugar|insulin|diabet|cinnamon|canela|glucos|azucar|azúcar|prediab|metformin|a1c|resistencia a la insulina|berberine|berberina|pcos|\bsop\b|ovario poli)',re.I)
# transcript se considera del nicho si habla de azúcar/insulina/diabetes/canela; se descarta tiroides/cortisol-diet/celulitis
TXNICHE=re.compile(r'(blood sugar|insulin|diabet|cinnamon|canela|glucos|azúcar|azucar|prediab|metformin|a1c|resistencia|berberine|berberina|pcos|ovario|sop)',re.I)
TXDROP=re.compile(r'(levothyroxine|thyroid|hashimoto|tiroid|cortisol diet|cellulite|celulitis|menopaus)',re.I)
RISK=re.compile(r'(stop taking metformin|metformin is bringing|amputation|deja la metformina|dejar la metformina|reverse (your )?diabetes|revertir la diabetes|\bcure\b|curar la diabetes|\b\d{1,2}%\b|3x absorption|3x more|5x more)',re.I)
ANGLE={'mecanismo':'Causa raíz / resistencia a la insulina (tu espina)','des-culpar':'Des-culpar ("no es tu esfuerzo")',
 'sintomas':'Cluster de síntomas','ceilan-cassia':'Ceilán vs Cassia / seguridad','reversion':'Reversión / recuperar el control'}
COMPETS=['primal','virelia','fling','valley point','nixulin','glucora','nutrissa','sugar guard','roots & remedies','super botanic','nutral']
def relevant(r):
    b=r['body']; return len(r['hook'])>=15 and BSUGAR.search(b) and not DROP.search(b)
def is_comp(r): s=((r['advertiser'] or '')+' '+(r['domain'] or '')).lower(); return any(c in s for c in COMPETS)
def rescore(r):
    s=len(r['tags'])*14+min(r['reach'],300000)/2000+min(r['adv_r30'],400000)/5000+r['days']*0.6
    s+=20 if is_comp(r) else 0; s+=8 if r['status']=='active' else 0
    es=1 if (r['country'] in ('ES','MX') or re.search(r'[¿¡ñ]|resistencia a la insulina|azúcar',r['body'])) else 0
    return round(s+12*es,1),es
rel=[r for r in ads if relevant(r)]
for r in rel: r['rescore'],r['es']=rescore(r); r['comp']=is_comp(r); r['risk']=bool(RISK.search(r['body']))
rel.sort(key=lambda x:-x['rescore']); rel=rel[:110]

# --- crear trackers para top anunciantes de video del nicho (por pageId) + los ya creados ---
TRACKERS={"Primal":"10e62a2a-e1dd-4d60-9361-646e82cc7c03","Niam PCOS":"3cd31b23-f2be-4667-ac24-1852f3e577cb",
 "Bray Nathan":"105bcdea-cd4a-486e-a536-44cf868376a3","Fling":"a8176ef7-64e1-4afe-aed3-83e8b48a5414","Olivia Harper":"8b64ef57-9cef-4974-8460-d6d524b19f08"}
# candidatos por pageId de las fichas del nicho (los de más reach de anunciante)
seen_pid=set()
for r in sorted(rel,key=lambda x:-x['adv_r30']):
    pid=r.get('pageId')
    if pid and pid not in seen_pid and is_comp(r) or (pid and r['adv_r30']>50000 and r.get('es')):
        seen_pid.add(pid)
    if len(seen_pid)>=10: break
for pid in list(seen_pid)[:10]:
    resp=api("brandtrackers","POST",{"facebookPageId":pid})
    d=resp.get("data",resp); bid=d.get("id") if isinstance(d,dict) else None
    if bid and bid not in TRACKERS.values(): TRACKERS[f"page_{pid}"]=bid

# --- jalar transcripts con timePeriod=last1y (el fix) ---
txmap={}; niche_tx=[]
for name,bid in TRACKERS.items():
    for t in api(f"brandtrackers/{bid}/transcripts",timePeriod="last1y",sortBy="totalImpressions",limit=25).get("data",[]):
        ft=t.get("fullText"); sa=t.get("sampleAd") or {}
        if not ft: continue
        if sa.get("adId"): txmap[sa["adId"]]=ft
        if TXNICHE.search(ft) and not TXDROP.search(ft):
            niche_tx.append({"brand":name,"fullText":ft,"impr":t.get("totalImpressions"),"days":t.get("longestRunning"),
                             "adId":sa.get("adId"),"media":sa.get("mediaUrl")})
# dedup transcripts del nicho por texto
seen=set(); nd=[]
for t in sorted(niche_tx,key=lambda x:-(x['impr'] or 0)):
    k=(t['fullText'] or '')[:80]
    if k in seen: continue
    seen.add(k); nd.append(t)
niche_tx=nd

# enriquecer 110: link real + hook + transcript
for r in rel:
    d=api(f"ads/{r['id']}").get("data",{})
    if isinstance(d,dict):
        r["adlib"]=(d.get("links") or {}).get("adLibraryUrl") or r.get("adlib")
        h=((d.get("creativeAnalysis") or {}).get("hook") or {}).get("text")
        if h: r["hook"]=h[:180]
    if r["id"] in txmap: r["transcript"]=txmap[r["id"]]
    if not r.get("adlib") and r["id"] and "_" in r["id"]: r["adlib"]=f"https://www.facebook.com/ads/library/?id={r['id'].split('_',1)[1]}"
json.dump(rel,open(f"{V31}/trendtrack_videos.json","w",encoding='utf-8'),ensure_ascii=False,indent=1)
json.dump(niche_tx,open(f"{V31}/trendtrack_transcripts_niche.json","w",encoding='utf-8'),ensure_ascii=False,indent=1)

def angle_str(t): return " · ".join(ANGLE.get(x,x) for x in t) or "—"
def clip(t,n): return re.sub(r'\s+',' ',(t or '')).strip()[:n]
L=[]
L.append("# ADS DE VIDEO PARA IMITAR — Nicho azúcar/insulina (TrendTrack)")
L.append(f"> **{len(rel)} anuncios de VIDEO** con ficha completa (Ad Library + .mp4 + landing + hook + copy + transcript + ángulo). Más abajo, **{len(niche_tx)} TRANSCRIPCIONES ganadoras del nicho** (guiones completos de video).")
L.append("**Leyenda:** ⭐ competidor/gemelo · 🇪🇸 español · ⚠️ claim de compliance a evitar.")
L.append("\n---\n")
L.append(f"# 🎬 TRANSCRIPCIONES GANADORAS DEL NICHO ({len(niche_tx)})\n")
L.append("> Guiones de video reales (los de más impresiones), filtrados al tema azúcar/insulina/diabetes. Son el molde literal de qué se DICE en los videos que funcionan.\n")
for i,t in enumerate(niche_tx,1):
    L.append(f"### T{i} · {t['brand']} · {t['days']}d · impresiones {t['impr']:,}")
    if t.get('media'): L.append(f"- Video: {t['media']}")
    if t.get('adId'): L.append(f"- Ad Library: https://www.facebook.com/ads/library/?id={t['adId'].split('_',1)[1] if '_' in (t['adId'] or '') else t['adId']}")
    L.append(f"- **GUION:** {clip(t['fullText'],2000)}")
    L.append("")
L.append("\n---\n")
L.append("# 📇 LAS 110 FICHAS\n")
for i,r in enumerate(rel,1):
    badges=(" ⭐" if r['comp'] else "")+(" 🇪🇸" if r['es'] else "")+(" ⚠️" if r['risk'] else "")
    L.append(f"## #{i} · {r['advertiser'] or '—'}{badges}")
    L.append(f"- **Señal:** {r['status']} · {r['days']} días · reach {r['reach']:,} · anunciante/30d {r['adv_r30']:,} · {r['country'] or '—'}")
    L.append(f"- **Ángulo:** {angle_str(r['tags'])}")
    L.append(f"- **Ad Library:** {r.get('adlib')}")
    L.append(f"- **Video (.mp4):** {r.get('media')}")
    L.append(f"- **Landing:** {r.get('landing') or '—'}")
    L.append(f"- **HOOK:** *{clip(r['hook'],180)}*")
    L.append(f"- **Copy:** {clip(r['body'],420)}")
    if r.get('transcript'): L.append(f"- **TRANSCRIPT:** {clip(r['transcript'],1400)}")
    else: L.append("- **Transcript:** _(no disponible para este ad)_")
    if r['risk']: L.append("- ⚠️ **Compliance:** copiar la estructura/ángulo, NO el claim. Ver dossier §9.")
    L.append("")
open(f"{V31}/ADS DE VIDEO PARA IMITAR (TrendTrack).md","w",encoding='utf-8').write("\n".join(L))
print(f"fichas: {len(rel)} | fichas con transcript: {sum(1 for r in rel if r.get('transcript'))} | transcripciones-nicho: {len(niche_tx)}")
