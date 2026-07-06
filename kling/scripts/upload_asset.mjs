/**
 * upload_asset.mjs — sube una imagen local a fal storage y muestra la URL CDN.
 * USO:  node upload_asset.mjs <ruta_local>   (default: assets/packaging.png)
 * Necesario porque nano-banana (PiAPI y fal) NO acepta base64.
 * VARIABLE DE ENTORNO: FAL_KEY
 */
import { fal } from "@fal-ai/client";
import { readFileSync, existsSync } from "fs";
import { resolve, extname } from "path";

if (!process.env.FAL_KEY) {
  console.error('\n❌  FAL_KEY no encontrado.\n    $env:FAL_KEY = "tu-clave"\n');
  process.exit(1);
}
fal.config({ credentials: process.env.FAL_KEY });

const filePath = resolve(process.argv[2] ?? "assets/packaging.png");
if (!existsSync(filePath)) {
  console.error(`\n❌  No se encontró: ${filePath}\n`);
  process.exit(1);
}

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
const type = MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream";

const blob = new Blob([readFileSync(filePath)], { type });
const url = await fal.storage.upload(blob);
console.log(url);
