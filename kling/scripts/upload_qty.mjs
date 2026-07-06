import { readFileSync } from "fs";
import { fal } from "@fal-ai/client";
fal.config({ credentials: process.env.FAL_KEY });
const creds = JSON.parse(readFileSync("C:/Users/Unda/shopify_data/creds.json", "utf-8"));
const shop = creds.shop, ver = creds.api_version, gql = `https://${shop}/admin/api/${ver}/graphql.json`;
const tok = (await (await fetch(`https://${shop}/admin/oauth/access_token`, {
  method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "client_credentials", client_id: creds.client_id, client_secret: creds.client_secret }),
})).json()).access_token;
const H = { "X-Shopify-Access-Token": tok };

const items = [
  { n: "3", file: "D:/videos-kling/swapped/qty/pouch_qty3.png", name: "biozentra-qty-3.png" },
  { n: "5", file: "D:/videos-kling/swapped/qty/pouch_qty5.png", name: "biozentra-qty-5.png" },
];
const files = [];
for (const it of items) {
  const url = await fal.storage.upload(new Blob([readFileSync(it.file)], { type: "image/png" }));
  files.push({ originalSource: url, contentType: "IMAGE", filename: it.name, alt: `Biozentra Canela de Ceilan - qty ${it.n} (sin fondo)` });
}
const mut = 'mutation($files:[FileCreateInput!]!){fileCreate(files:$files){files{id alt fileStatus ... on MediaImage{image{url}}} userErrors{field message}}}';
const res = await (await fetch(gql, { method: "POST", headers: { ...H, "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ query: mut, variables: { files } }) })).json();
const ue = res.data.fileCreate.userErrors; if (ue.length) { console.log("ERR", JSON.stringify(ue)); process.exit(1); }
const ids = res.data.fileCreate.files.map(f => f.id);
const q = 'query($ids:[ID!]!){nodes(ids:$ids){... on MediaImage{id alt fileStatus image{url}}}}';
for (let i = 0; i < 20; i++) {
  const r = await (await fetch(gql, { method: "POST", headers: { ...H, "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ query: q, variables: { ids } }) })).json();
  const nodes = r.data.nodes;
  if (nodes.every(n => n.fileStatus === "READY" && n.image?.url)) {
    console.log("LISTAS EN SHOPIFY FILES:");
    for (const nd of nodes) {
      const fname = (nd.image.url.split("/files/")[1] || "").split("?")[0];
      console.log(`  ${nd.alt}\n     CDN: ${nd.image.url}\n     ref: shopify://shop_images/${fname}`);
    }
    process.exit(0);
  }
  await new Promise(r => setTimeout(r, 3000));
}
console.log("timeout esperando READY");
