// Expande el shot-plan A3 a nivel de PLANO: escribe config/scuts_<ad>.json (para assemble)
// y config/kf_<ad>.json (keyframes_input para batch_keyframes_kie).
import { readFileSync, writeFileSync } from "fs";

const POUCH = "https://v3b.fal.media/files/b/0aa0ec73/h0MQp8lCgKkrv-NPlvZTY_1783184510836.png";
const M = JSON.parse(readFileSync("config/kf_map_a3masters.json", "utf-8"));
const SHOTS = JSON.parse(readFileSync("config/a3_shots.json", "utf-8"));
const STYLE = ", Pixar-style 3D animated film still, warm cinematic lighting, soft volumetric light, shallow depth of field, expressive believable characters, 9:16 vertical, high detail";
const POUCH_STYLE = ", photorealistic product photography, keep the real pouch label and text exactly as in the reference, sharp realistic product, do NOT stylize, do not cartoonify, 9:16 vertical";

function refUrls(r) {
  if (r == null) return null;
  const arr = Array.isArray(r) ? r : [r];
  return arr.map(k => k === "pouch" ? POUCH : M[k]).filter(Boolean);
}

for (const ad of Object.keys(SHOTS)) {
  const tomas = JSON.parse(readFileSync(`config/cuts_${ad}.json`, "utf-8"));
  const plan = SHOTS[ad];
  if (plan.length !== tomas.length) { console.error(`⚠️  ${ad}: ${plan.length} tomas en plan vs ${tomas.length} en cuts`); }
  const scuts = [], kfin = [];
  let idx = 0;
  for (let t = 0; t < tomas.length; t++) {
    const toma = tomas[t];
    const shots = plan[t].tomashots;
    const seg = (toma.end - toma.start) / shots.length;
    for (let s = 0; s < shots.length; s++) {
      idx++;
      const n = String(idx).padStart(2, "0");
      const start = +(toma.start + s * seg).toFixed(3);
      const end   = +(toma.start + (s + 1) * seg).toFixed(3);
      const sh = shots[s];
      const isPouch = sh.r === "pouch";
      const kf_prompt = sh.k + (isPouch ? POUCH_STYLE : STYLE);
      const dur = Math.max(6, Math.ceil(end - start));
      scuts.push({ n, start, end, guion: toma.guion });
      kfin.push({ n, kf_prompt, kf_ref_urls: refUrls(sh.r), anim_prompt: sh.a, duration: String(dur) });
    }
  }
  writeFileSync(`config/scuts_${ad}.json`, JSON.stringify(scuts, null, 2));
  writeFileSync(`config/kf_${ad}.json`, JSON.stringify(kfin, null, 2));
  console.log(`${ad}: ${scuts.length} planos → scuts_${ad}.json + kf_${ad}.json`);
}
