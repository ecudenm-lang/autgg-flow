#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# FABRICA END-TO-END de un batch — fire-and-forget, un solo comando de fondo.
# Encadena: VO -> keyframes -> Grok (con auto-retry de tomas faltantes) -> post-pro.
# Yo (Claude) armo antes los configs creativos por ad:
#     config/<ad>.json      (VO: {ad,batch,voices,tomas})
#     config/kf_<ad>.json   (keyframes: [{n,kf_ref_urls,kf_prompt,anim_prompt,duration}])
#     assets/headline_<ad>.png  (opcional; si falta, se monta sin headline)
# USO: bash run_batch.sh <BATCH> <ad1> [ad2 ...]
#   ej: bash run_batch.sh SO1 so1_1 so1_3 so1_26 so1_31 so1_36
# ═══════════════════════════════════════════════════════════════════════════
cd /d/videos-kling
BATCH=$1; shift
ADS="$@"
RES=720p
echo "=== BATCH $BATCH : $ADS ==="

# 1) VOZ (rapido, marca el timing)
for ad in $ADS; do
  echo "### VO $ad"
  node gen_vo.mjs config/$ad.json || { echo "VO FALLO $ad"; exit 1; }
done

# 2) KEYFRAMES (nano-banana kie) — escribe batch_input_<ad>.json
for ad in $ADS; do
  echo "### KF $ad"
  echo OK | node batch_keyframes_kie.mjs config/kf_$ad.json $ad 2>&1 | grep -E "Exitosos|Fallidos|Créditos"
done

# 3) GROK i2v + auto-retry (hasta 2x) de las tomas que no bajaron
for ad in $ADS; do
  echo "### GROK $ad"
  echo OK | node batch_grok_kie.mjs config/batch_input_$ad.json clips/$ad $RES normal 2>&1 | grep -E "Exitosos|Créditos totales"
  for try in 1 2; do
    node -e "
      const fs=require('fs');
      const bi=require('./config/batch_input_$ad.json');
      const miss=bi.filter(s=>!fs.existsSync('clips/$ad/raw_'+s.n+'.mp4'));
      if(miss.length){fs.writeFileSync('config/_miss_$ad.json',JSON.stringify(miss,null,2));console.log(miss.length)}
      else{try{fs.unlinkSync('config/_miss_$ad.json')}catch(e){};console.log(0)}
    " > /tmp/miss_$ad 2>/dev/null
    n=$(cat /tmp/miss_$ad)
    [ "$n" = "0" ] && break
    echo "### GROK retry$try $ad ($n faltan)"
    echo OK | node batch_grok_kie.mjs config/_miss_$ad.json clips/$ad $RES normal 2>&1 | grep -E "Exitosos"
  done
done

# 4) POST-PRO (assemble + subs + headline + musica) — de a uno
echo "### FINISH"
bash finish_batch.sh $BATCH $ADS

echo "=== BATCH $BATCH LISTO -> output/$BATCH/ ==="
