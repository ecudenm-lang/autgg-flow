/**
 * gen_qty_nobg.mjs — genera el pouch nuevo en grupos de 3 y 5 (Nano Banana 2 / kie),
 * sobre blanco, y luego quita el fondo con fal (rembg) -> PNG transparente.
 * ENV: KIE_API_KEY, FAL_KEY
 */
import { fal } from "@fal-ai/client";
import { readFileSync, writeFileSync, createWriteStream, mkdirSync } from "fs";
import { join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

const KIE = process.env.KIE_API_KEY; if (!KIE) { console.error("falta KIE_API_KEY"); process.exit(1); }
if (!process.env.FAL_KEY) { console.error("falta FAL_KEY"); process.exit(1); }
fal.config({ credentials: process.env.FAL_KEY });

const BASE = "https://api.kie.ai/api/v1/jobs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const outDir = "D:/videos-kling/swapped/qty"; mkdirSync(outDir, { recursive: true });

// 1) subir pouch ref a fal
const pouchBlob = new Blob([readFileSync("D:/videos-kling/assets/pouch/kf_01.png")], { type: "image/png" });
const POUCH = await fal.storage.upload(pouchBlob);
console.log("pouch ref:", POUCH);

async function genGroup(n, count) {
  const prompt = `Product photography of exactly ${count} identical stand-up pouches of the product in the reference image (BioZentra "CANELA DE CEILAN con Aceite MCT" pouch). Arrange the ${count} pouches as a neat overlapping retail group, all front-facing, every label identical and fully legible like the reference, consistent size. Pure solid white seamless background (#FFFFFF), even soft studio lighting, subtle soft contact shadow under the group. Photorealistic, sharp, high detail.`;
  const r = await fetch(`${BASE}/createTask`, {
    method: "POST", headers: { Authorization: `Bearer ${KIE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nano-banana-2", input: { prompt, image_input: [POUCH], aspect_ratio: "1:1", resolution: "1K", output_format: "png" } }),
  });
  const j = await r.json();
  const taskId = j?.data?.taskId ?? j?.data?.task_id;
  if (!taskId) throw new Error(`createTask sin taskId: ${JSON.stringify(j).slice(0,200)}`);
  const t0 = Date.now();
  while (Date.now() - t0 < 360000) {
    await sleep(4000);
    const d = (await (await fetch(`${BASE}/recordInfo?taskId=${encodeURIComponent(taskId)}`, { headers: { Authorization: `Bearer ${KIE}` } })).json())?.data ?? {};
    if (d.state === "success") { const u = JSON.parse(d.resultJson||"{}")?.resultUrls?.[0]; process.stdout.write(`\r  ${n}: listo (${d.creditsConsumed} cr)        \n`); return u; }
    if (d.state === "fail") throw new Error(`${n} fail: ${d.failMsg}`);
    process.stdout.write(`\r  ${n}: ${d.state} (${Math.round((Date.now()-t0)/1000)}s)   `);
  }
  throw new Error(`${n} timeout`);
}

async function removeBg(url, n) {
  // rembg fal -> PNG transparente
  const res = await fal.subscribe("fal-ai/imageutils/rembg", { input: { image_url: url } });
  const out = res?.data ?? res;
  const tUrl = out?.image?.url ?? out?.images?.[0]?.url;
  if (!tUrl) throw new Error(`${n} rembg sin url: ${JSON.stringify(out).slice(0,200)}`);
  const dest = join(outDir, `pouch_qty${n}.png`);
  const dl = await fetch(tUrl);
  await pipeline(Readable.fromWeb(dl.body), createWriteStream(dest));
  console.log(`  ${n} -> ${dest} (transparente)`);
  return dest;
}

for (const count of [3, 5]) {
  const whiteUrl = await genGroup(count, count);
  await removeBg(whiteUrl, count);
}
console.log("\nLISTO: pouch_qty3.png y pouch_qty5.png (sin fondo).");
