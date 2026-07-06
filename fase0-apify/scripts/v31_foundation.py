import json, os, re, sys, hashlib, math, csv, bisect
from collections import defaultdict, Counter
try:
    from langdetect import detect, DetectorFactory; DetectorFactory.seed=0
    HAVE_LD=True
except Exception:
    HAVE_LD=False

SC = sys.argv[1]; V31 = sys.argv[2]
RAW = f"{SC}/raw"

# ---------- source-type mapping ----------
# nature of the source (per v3.1 hierarchy); market pool is separate
TAG_TYPE = {
 'reddit-ES':'RAW_CONFESSION','reddit-EN':'RAW_CONFESSION',
 'tiktok-comments-ES':'RAW_CONFESSION','tiktok-comments-EN':'RAW_CONFESSION',
 'youtube-comments-ES':'RAW_CONFESSION','youtube-comments-EN':'RAW_CONFESSION',
 'amazon-US':'REVIEW','mercadolibre-MX':'REVIEW',
 'tiktok-ES':'CREATOR_CONTENT','tiktok-EN':'CREATOR_CONTENT',   # captions -> creator (or competitor claim)
 'instagram-ES':'CREATOR_CONTENT','instagram-EN':'CREATOR_CONTENT',
}
TAG_POOL = {t:('venta_MX' if t.endswith('ES') or t.endswith('MX') else 'intel_US') for t in TAG_TYPE}
TAG_PLAT = {'reddit-ES':'reddit','reddit-EN':'reddit','tiktok-ES':'tiktok','tiktok-EN':'tiktok',
 'instagram-ES':'instagram','instagram-EN':'instagram','tiktok-comments-ES':'tiktok','tiktok-comments-EN':'tiktok',
 'youtube-comments-ES':'youtube','youtube-comments-EN':'youtube','amazon-US':'amazon','mercadolibre-MX':'mercadolibre'}

PROMO = ['link en bio','disponible en','cómpralo','comprালo','pídelo','pidelo','descuento','envío gratis','envio gratis',
 'oferta','shop now','order now','% off','swipe up','dm para','escríbenos','patrocinado','#ad','sponsored','use code',
 'código','codigo','cupón','cupon','añade al carrito','agota','www.','.com','.mx','tienda','promoción','promocion',
 'compra el','adquiere','pedidos','whatsapp','envíos','envios']

TEXT_KEYS=['text','body','comment','content','caption','selftext','reviewText','message','title']
ENG_KEYS=['diggCount','upVotes','score','voteCount','likes','likesCount','numberOfHelpful','helpfulCount','repliesCount','replyCommentTotal','numberOfComments','commentsCount']
URL_KEYS=['url','webVideoUrl','videoWebUrl','postUrl','permalink','link','submittedVideoUrl']

def pick(d,keys):
    for k in keys:
        v=d.get(k)
        if v not in (None,'',0): return v
    return None
def text_of(d):
    t=pick(d,['text','body','comment','content','caption','selftext','reviewText','message'])
    title=d.get('title')
    if title and t and str(title).lower() not in str(t).lower(): return f"{title}. {t}"
    return t or title
def eng_of(d):
    tot=0
    for k in ENG_KEYS:
        v=d.get(k)
        if isinstance(v,(int,float)): tot+=v
    return int(tot)
def norm(t):
    t=re.sub(r'http\S+','',t.lower()); t=re.sub(r'[^\w\sáéíóúñ]',' ',t); return re.sub(r'\s+',' ',t).strip()
def lang_of(txt,pool):
    if HAVE_LD:
        try:
            l=detect(txt[:200]); return l
        except Exception: pass
    return 'es' if pool=='venta_MX' else 'en'

THEMES={
'bloating':['bloat','hincha','inflama','distension','distensión','panza','barriga','vientre','gases','gassy','puffy','embarazada','desabroch'],
'energy_crash_2pm':['2pm','2 pm','bajón','bajon','de la tarde','afternoon','crash','después de comer me da sueño','sleepy'],
'chronic_fatigue':['cansad','fatiga','agotad','sin energía','sin energia','tired','exhausted','fatigue','no energy','sin pilas'],
'brain_fog':['niebla','atarantad','concentrar','brain fog','foggy','memoria','se me olvida'],
'fatty_liver':['hígado graso','higado graso','fatty liver','nafld','masld','grasa en el h','esteatosis','grado 2'],
'liver_enzymes':['enzimas','transaminasas',' alt ','ast','liver enzyme','bloodwork','análisis de sangre','hepatic'],
'heavy_digestion':['digestión','digestion','cae mal','cae pesad','pesad','sits like','indigest','digiero','como piedra'],
'constipation':['estreñi','estreñid','ir al baño','evacuar','constipat','bowel','irregular'],
'gas_pain':['retortij','cólico','colico','cramp','dolor abdominal','me duele','ache'],
'bile_flow':['bilis','biliar','vesícula','vesicula','bile','gallbladder','grasosa','fatty food'],
'toxin_detox':['toxina','intoxicad','desintoxica','detox','toxic','cleanse','limpiar el h','poison','depurar'],
'weight_stubborn':['engord','adelgaz','subir de peso','subo de peso','weight','gain weight','lose weight','bajar de peso','dieta'],
'alcohol_liver':['alcohol','cerveza','trago','cruda','resaca','beber','drinking','hangover','chelas','borrach'],
'skin_dull':['granitos','ojeras','cutis','acne','acné','complexion','breakout','la piel'],
'desire_flat_stomach':['vientre plano','panza plana','flat stomach','debloat','deshinchar','desinflamar'],
'desire_feel_myself':['sentirme yo','feel like myself','me reconozco','myself again','volver a ser'],
'obj_does_it_work':['funciona','sí sirve','does it work','really work','hype','puro cuento'],
'obj_scam':['estafa','scam','milagro','snake oil','waste of money','fraude'],
'obj_price':['muy caro','carísimo','precio','expensive','no me alcanza'],
'obj_taste':['sabor','amarg','taste','gag','sabe feo','sabe horrible'],
'obj_tried_everything':['probé de todo','probe de todo','tried everything','nada funciona','nothing works','nada me sirve'],
'belief_self_blame':['mi culpa','me lo busqué','my fault','me lo merezco','por comer mal'],
'belief_its_age':['la edad','es normal','getting older','el metabolismo','ya no es el mismo'],
'belief_natural':['natural','hierbas','químicos','quimicos','pharmaceutical','herbal','sin químicos'],
'belief_doctor_dismissed':['el doctor me dijo','el médico','baje de peso','dismissed','doctor said','no me tomó'],
'identity_lost_self':['antes era','ya no soy','used to be','no me reconozco','extraño a la'],
'identity_ashamed':['vergüenza','me escondo','embarrassed','ashamed','esconder','avoid photos'],
}

# ---------- ingest ----------
rows=[]; raw_total=0; short=0; dup=0
seen=set()
for tag in TAG_TYPE:
    try: items=json.load(open(f"{RAW}/{tag}.json",encoding='utf-8'))
    except Exception as e: print('skip',tag,e); continue
    for d in items:
        raw_total+=1
        txt=text_of(d)
        if not txt or len(str(txt).split())<4: short+=1; continue
        txt=str(txt).strip(); n=norm(txt)
        if len(n.split())<4: short+=1; continue
        plat=TAG_PLAT[tag]
        key=(plat,hashlib.md5(n[:200].encode()).hexdigest())
        if key in seen: dup+=1; continue
        seen.add(key)
        stype=TAG_TYPE[tag]
        promo=bool(d.get('isAd') or d.get('isSponsored'))
        if stype=='CREATOR_CONTENT':
            tl=txt.lower()
            if promo or sum(1 for p in PROMO if p in tl)>=2:
                stype='COMPETITOR_CLAIM'
        market=TAG_POOL[tag]
        rid=hashlib.md5((tag+str(d.get('id') or d.get('reviewId') or d.get('cid') or d.get('commentId') or n[:60])).encode()).hexdigest()[:12]
        rows.append({'id':'EV'+rid,'platform':plat,'source_tag':tag,'source_type':stype,'market':market,
            'text':txt[:1500],'engagement':eng_of(d),'rating':d.get('rating'),
            'url':pick(d,URL_KEYS) or '','lang':lang_of(txt,market),'is_competitor':stype=='COMPETITOR_CLAIM'})

# lang + themes + resonance percentile
byplat=defaultdict(list)
for r in rows: byplat[r['platform']].append(r['engagement'])
sortedplat={p:sorted(v) for p,v in byplat.items()}
def pct(p,v):
    a=sortedplat[p]; i=bisect.bisect_left(a,v); return round(i/max(1,len(a)-1),4)
for r in rows:
    r['res_pct']=pct(r['platform'],r['engagement'])
    tl=r['text'].lower()
    r['themes']=[t for t,kw in THEMES.items() if any(k in tl for k in kw)]
    r['cluster']=r['themes'][0] if r['themes'] else 'unclustered'

# ---------- write evidence_bank.csv ----------
cols=['id','platform','source_tag','source_type','market','lang','engagement','res_pct','rating','is_competitor','cluster','themes','url','text']
with open(f"{V31}/evidence_bank.csv","w",encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f); w.writerow(cols)
    for r in rows:
        w.writerow([r['id'],r['platform'],r['source_tag'],r['source_type'],r['market'],r['lang'],r['engagement'],
            r['res_pct'],r['rating'] if r['rating'] is not None else '',r['is_competitor'],r['cluster'],
            '|'.join(r['themes']),r['url'],r['text'].replace('\n',' ')])

# ---------- PI (transparent, source-weighted) ----------
SW={'RAW_CONFESSION':1.0,'REVIEW':1.0,'CREATOR_CONTENT':0.25,'COMPETITOR_CLAIM':0.0}
def compute_pi(market):
    cs=[r for r in rows if r['market']==market]
    freq_raw=defaultdict(int); freq_w=defaultdict(float); reson=defaultdict(float)
    top_single=defaultdict(float); nsrc=defaultdict(lambda:Counter())
    for r in cs:
        w=SW[r['source_type']]
        for t in r['themes']:
            freq_raw[t]+=1; freq_w[t]+=w; reson[t]+=r['res_pct']*w
            top_single[t]=max(top_single[t], r['res_pct']*w)
            nsrc[t][r['source_type']]+=1
    if not freq_w: return {}
    fmax=math.log1p(max(freq_w.values())); rmax=math.log1p(max(reson.values()) or 1)
    out={}
    for t in freq_w:
        fn=math.log1p(freq_w[t])/fmax*100 if fmax else 0
        rn=math.log1p(reson[t])/rmax*100 if rmax else 0
        viral_share=round(top_single[t]/reson[t],3) if reson[t] else 0
        penalty=0.85 if viral_share>0.6 else 1.0
        pi=round((0.6*fn+0.4*rn)*penalty,1)
        out[t]={'freq_raw':freq_raw[t],'freq_w':round(freq_w[t],1),'resonance':round(reson[t],2),
            'freq_norm':round(fn,1),'reson_norm':round(rn,1),'viral_share':viral_share,
            'penalty':penalty,'PI':pi,'by_source':dict(nsrc[t])}
    return out
pi_v=compute_pi('venta_MX'); pi_i=compute_pi('intel_US')

with open(f"{V31}/PI_SCORES.csv","w",encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f)
    w.writerow(['pool','cluster','PI','freq_raw','freq_weighted','resonance','freq_norm','reson_norm','viral_share','penalty','n_raw_confession','n_review','n_creator'])
    for pool,pi in [('venta_MX',pi_v),('intel_US',pi_i)]:
        for t,d in sorted(pi.items(),key=lambda x:-x[1]['PI']):
            bs=d['by_source']
            w.writerow([pool,t,d['PI'],d['freq_raw'],d['freq_w'],d['resonance'],d['freq_norm'],d['reson_norm'],
                d['viral_share'],d['penalty'],bs.get('RAW_CONFESSION',0),bs.get('REVIEW',0),bs.get('CREATOR_CONTENT',0)])

# ---------- stats for reports ----------
stats={'raw_total':raw_total,'short':short,'dup':dup,'clean':len(rows),
 'by_platform':dict(Counter(r['platform'] for r in rows)),
 'by_market':dict(Counter(r['market'] for r in rows)),
 'by_source_type':dict(Counter(r['source_type'] for r in rows)),
 'by_lang':dict(Counter(r['lang'] for r in rows)),
 'competitor_rows':sum(1 for r in rows if r['is_competitor'])}
json.dump(stats,open(f"{V31}/_stats.json","w"),ensure_ascii=False,indent=1)
json.dump({'venta':pi_v,'intel':pi_i},open(f"{V31}/_pi.json","w"),ensure_ascii=False,indent=1)
# top evidence IDs per cluster (RAW_CONFESSION+REVIEW only, by res_pct) for DOC 14
bank=defaultdict(list)
for r in sorted(rows,key=lambda x:-x['res_pct']):
    if r['source_type'] in ('RAW_CONFESSION','REVIEW'):
        for t in r['themes']:
            if len(bank[t])<6: bank[t].append({'id':r['id'],'text':r['text'][:220],'platform':r['platform'],'market':r['market'],'eng':r['engagement'],'type':r['source_type']})
json.dump(bank,open(f"{V31}/_bank.json","w"),ensure_ascii=False,indent=1)

print("=== FUNDACIÓN v3.1 ===")
print("raw:",raw_total,"| clean:",len(rows),"| short:",short,"| dup:",dup)
print("por tipo de fuente:",stats['by_source_type'])
print("por mercado:",stats['by_market'])
print("competidor rows:",stats['competitor_rows'])
print("\nTop PI VENTA (real confession+review weighted):")
for t,d in sorted(pi_v.items(),key=lambda x:-x[1]['PI'])[:10]:
    print(f"  {d['PI']:5} {t:22} freq_raw={d['freq_raw']:4} freq_w={d['freq_w']:6} viral={d['viral_share']} src={d['by_source']}")
