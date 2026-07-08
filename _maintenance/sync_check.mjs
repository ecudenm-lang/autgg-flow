/**
 * sync_check.mjs — HERRAMIENTA DEL OWNER (no es parte del kit portable).
 *
 * Detecta cuando un script de PRODUCCIÓN (D:\videos-kling, D:\Iteracionking, D:\Apify) cambió
 * DESPUÉS de haberse sincronizado al repo, para que el kit/manual no describa algo que el repo no trae
 * (el problema que cazó el usuario de prueba en la 3ª ronda con gen_vo.mjs).
 *
 * Cómo: el manifest guarda el hash de cada archivo de producción EN EL MOMENTO del último sync ("baseline").
 * En cada corrida compara el hash actual de producción contra ese baseline:
 *   - hash igual        → ✅ sin cambios en prod desde el último sync
 *   - hash distinto     → 🔴 PROD CAMBIÓ — re-sincroniza ese archivo al repo (o revisa el patch)
 *   - sin baseline      → ❓ corre --bless para fijarlo
 *   - prod no existe    → ⚠  ruta de producción no encontrada
 *   - repo no existe    → ❌ el archivo falta en el repo
 *
 * USO
 *   node _maintenance/sync_check.mjs            # reporta divergencias
 *   node _maintenance/sync_check.mjs --bless    # fija el baseline = estado actual de prod (correr TRAS sincronizar)
 *
 * Las rutas de producción salen del manifest, y se pueden override por env:
 *   PROD_VIDEOS_KLING, PROD_ITERACIONKING, PROD_APIFY
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const MANIFEST = join(HERE, "sync_manifest.json");
const BLESS = process.argv.includes("--bless");

const G = "\x1b[32m", Y = "\x1b[33m", R = "\x1b[31m", B = "\x1b[1m", X = "\x1b[0m";
const hash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 16);

if (!existsSync(MANIFEST)) { console.error(`\n❌  No existe ${MANIFEST}\n`); process.exit(1); }
const man = JSON.parse(readFileSync(MANIFEST, "utf-8"));

// Resolver roots de producción (env override > manifest)
const roots = { ...man.roots };
if (process.env.PROD_VIDEOS_KLING) roots["videos-kling"] = process.env.PROD_VIDEOS_KLING;
if (process.env.PROD_ITERACIONKING) roots["iteracionking"] = process.env.PROD_ITERACIONKING;
if (process.env.PROD_APIFY) roots["apify"] = process.env.PROD_APIFY;

let drift = 0, missingRepo = 0, missingProd = 0, noBase = 0, ok = 0;
console.log(`\n${B}SYNC-CHECK${X}   repo vs producción   ${BLESS ? "(--bless: fijando baseline)" : ""}\n`);

for (const f of man.files) {
  const root = roots[f.root];
  const prodPath = root ? join(root, f.prod) : null;
  const repoPath = join(REPO, f.repo);
  const tag = f.patched ? `${Y}[patched]${X}` : "";

  if (!existsSync(repoPath)) { console.log(`  ${R}❌ falta en repo${X}   ${f.repo}`); missingRepo++; continue; }
  if (!prodPath || !existsSync(prodPath)) { console.log(`  ${Y}⚠  prod no existe${X} ${f.root}/${f.prod}`); missingProd++; continue; }

  const now = hash(prodPath);
  if (BLESS) { f.prodHash = now; f.blessedAt = man._stamp || "manual"; ok++; continue; }

  if (!f.prodHash) { console.log(`  ${Y}❓ sin baseline${X}   ${f.repo}  (corre --bless)`); noBase++; continue; }
  if (now !== f.prodHash) {
    console.log(`  ${R}${B}🔴 PROD CAMBIÓ${X}   ${f.repo} ${tag}\n       prod ${f.root}/${f.prod}  (baseline ${f.prodHash} → ahora ${now}) — re-sincroniza`);
    drift++;
  } else { ok++; }
}

if (BLESS) {
  writeFileSync(MANIFEST, JSON.stringify(man, null, 2), "utf-8");
  console.log(`  ${G}baseline fijado para ${ok} archivos.${X}\n`);
  process.exit(0);
}

console.log(`\n  ${B}Resumen:${X} ${G}${ok} sin cambios${X} · ${R}${drift} cambiaron en prod${X} · ${R}${missingRepo} faltan en repo${X} · ${Y}${missingProd} sin prod${X} · ${Y}${noBase} sin baseline${X}`);
if (drift || missingRepo) {
  console.log(`  ${R}${B}Acción:${X} re-copia al repo los archivos marcados 🔴/❌ y corre --bless.\n`);
  process.exitCode = 1;
} else if (noBase) {
  console.log(`  ${Y}Corre  node _maintenance/sync_check.mjs --bless  para fijar el baseline inicial.${X}\n`);
} else {
  console.log(`  ${G}${B}Todo sincronizado.${X}\n`);
}
