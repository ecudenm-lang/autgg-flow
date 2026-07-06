import { readFileSync, createWriteStream } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { fal } from "@fal-ai/client";
fal.config({ credentials: process.env.FAL_KEY });
const creds = JSON.parse(readFileSync("C:/Users/Unda/shopify_data/creds.json", "utf-8"));
const shop = creds.shop, ver = creds.api_version, gql = `https://${shop}/admin/api/${ver}/graphql.json`;
const tok = (await (await fetch(`https://${shop}/admin/oauth/access_token`, {
  method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "client_credentials", client_id: creds.client_id, client_secret: creds.client_secret }),
})).json()).access_token;
const H = { "X-Shopify-Access-Token": tok };

// 1) subir pouch a fal + rembg
const url = await fal.storage.upload(new Blob([readFileSync("D:/videos-kling/assets/pouch/kf_01.png")], { type: "image/png" }));
const res = await fal.subscribe("fal-ai/imageutils/rembg", { input: { image_url: url } });
const out = res?.data ?? res;
const tUrl = out?.image?.url ?? out?.images?.[0]?.url;
if (!tUrl) { console.log("rembg sin url", JSON.stringify(out).slice(0,200)); process.exit(1); }
// guardar local
await pipeline(Readable.fromWeb((await fetch(tUrl)).body), createWriteStream("D:/videos-kling/swapped/qty/pouch_qty1.png"));
console.log("transparente local: swapped/qty/pouch_qty1.png");

// 2) fileCreate a Shopify desde la url transparente
const mut = 'mutation($files:[FileCreateInput!]!){fileCreate(files:$files){files{id} userErrors{field message}}}';
const fc = await (await fetch(gql, { method: "POST", headers: { ...H, "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ query: mut, variables: { files: [{ originalSource: tUrl, contentType: "IMAGE", filename: "biozentra-qty-1.png", alt: "Biozentra Canela de Ceilan - qty 1 (sin fondo)" }] } }) })).json();
const ue = fc.data.fileCreate.userErrors; if (ue.length) { console.log("ERR", JSON.stringify(ue)); process.exit(1); }
const id = fc.data.fileCreate.files[0].id;
const q = 'query($ids:[ID!]!){nodes(ids:$ids){... on MediaImage{fileStatus image{url}}}}';
for (let i = 0; i < 20; i++) {
  const r = await (await fetch(gql, { method: "POST", headers: { ...H, "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ query: q, variables: { ids: [id] } }) })).json();
  const nd = r.data.nodes[0];
  if (nd.fileStatus === "READY" && nd.image?.url) {
    const fname = (nd.image.url.split("/files/").pop()).split("?")[0];
    console.log(`LISTA EN SHOPIFY:\n  CDN: ${nd.image.url}\n  ref: shopify://shop_images/${fname}`);
    process.exit(0);
  }
  await new Promise(r => setTimeout(r, 3000));
}
console.log("timeout READY");
