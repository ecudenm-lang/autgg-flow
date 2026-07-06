/**
 * gen_qty_v2.mjs — regenera 1/3/5 pouches sobre fondo VERDE chroma (contraste),
 * y quita el fondo con BiRefNet (bordes limpios). Guarda raw_qtyN.png transparente.
 * ENV: KIE_API_KEY, FAL_KEY
 */
import { fal } from "@fal-ai/client";
import { readFileSync, createWriteStream, mkdirSync } from "fs";
import { join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

const KIE = process.env.KIE_API_KEY;
fal.config({ credentials: process.env.FAL_KEY });
const BASE = "https://api.kie.ai/api/v1/jobs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const outDir = "D:/videos-kling/swapped/qty2"; mkdirSync(outDir, { recursive: true });

const POUCH = await fal.storage.upload(new Blob([readFileSync("D:/videos-kling/assets/pouch/kf_01.png")], { type: "image/png" }));
console.log("pouch ref:", POUCH);

async function gen(count) {
  const grp = count === 1
    ? `exactly ONE single stand-up pouch of the product in the reference image, centered, front-facing`
    : `exactly ${count} identical stand-up pouches of the product in the reference image, arranged as a neat overlapping retail group, all front-facing`;
  const prompt = `Product photography: ${grp}. Every pouch label identical and fully legible like the reference (BioZentra "CANELA DE CEILAN con Aceite MCT"). Place them on a SOLID FLAT CHROMA GREEN background color #00B140 filling the entire frame, even soft studio lighting, no other props, no shadow on the floor. Photorealistic, sharp, high detail.`;
  const r = await fetch(`${BASE}/createTask`, {
    method: "POST", headers: { Authorization: `Bearer ${KIE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nano-banana-2", input: { prompt, image_input: [POUCH], aspect_ratio: "1:1", resolution: "1K", output_format: "png" } }),
  });
  const taskId = (await r.json())?.data?.taskId;
  if (!taskId) throw new Error("sin taskId");
  const t0 = Date.now();
  while (Date.now() - t0 < 360000) {
    await sleep(4000);
    const d = (await (await fetch(`${BASE}/recordInfo?taskId=${taskId}`, { headers: { Authorization: `Bearer ${KIE}` } })).json())?.data ?? {};
    if (d.state === "success") { process.stdout.write(`\r  q${count}: gen ok (${d.creditsConsumed}cr)        \n`); return JSON.parse(d.resultJson||"{}")?.resultUrls?.[0]; }
    if (d.state === "fail") throw new Error(`q${count} fail: ${d.failMsg}`);
    process.stdout.write(`\r  q${count}: ${d.state} (${Math.round((Date.now()-t0)/1000)}s)   `);
  }
  throw new Error("timeout");
}

async function birefnet(url, count) {
  const res = await fal.subscribe("fal-ai/birefnet", { input: { image_url: url } });
  const out = res?.data ?? res;
  const u = out?.image?.url ?? out?.images?.[0]?.url;
  if (!u) throw new Error(`q${count} birefnet sin url: ${JSON.stringify(out).slice(0,200)}`);
  const dest = join(outDir, `raw_qty${count}.png`);
  await pipeline(Readable.fromWeb((await fetch(u)).body), createWriteStream(dest));
  console.log(`  q${count}: fondo removido -> ${dest}`);
}

for (const count of [1, 3, 5]) {
  const g = await gen(count);
  await birefnet(g, count);
}
console.log("\nLISTO raw transparentes en swapped/qty2/");
