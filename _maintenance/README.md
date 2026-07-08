# _maintenance — Herramientas del OWNER (no son parte del kit portable)

Los usuarios finales del kit **no necesitan esta carpeta**. Es para quien mantiene el repo sincronizado
con producción (`D:\videos-kling`, `D:\Iteracionking`, `D:\Apify`).

## sync_check.mjs — evita el "el manual describe algo que el kit no trae"

Guarda el hash de cada script de producción **en el momento del último sync** (`sync_manifest.json`) y avisa
cuando producción cambió después — que fue exactamente el bug que el usuario de prueba cazó con `gen_vo.mjs`
(el repo tenía una versión vieja mientras el manual describía la nueva).

### Flujo de uso
```powershell
# 1) ver si algo de producción cambió desde el último sync:
node _maintenance\sync_check.mjs
#    🔴 PROD CAMBIÓ  → re-copia ese archivo de prod al repo (re-aplicando el patch de portabilidad si aplica)
#    ❌ falta en repo → agregar el archivo
#    ❓ sin baseline  → correr --bless

# 2) tras re-sincronizar (o al agregar archivos nuevos al manifest), fija el nuevo baseline:
node _maintenance\sync_check.mjs --bless
```

### Cómo agregar un archivo al seguimiento
Añade una entrada en `sync_manifest.json`:
```json
{ "repo": "kling/scripts/NUEVO.mjs", "root": "videos-kling", "prod": "NUEVO.mjs", "patched": false, "prodHash": null }
```
`patched: true` = el repo tiene ediciones de portabilidad intencionales (se espera que difiera del contenido de prod;
el check igual detecta si prod cambió, para revisar si el patch necesita re-aplicarse). Luego corre `--bless`.

### Rutas de producción
Salen de `sync_manifest.json > roots`. Se pueden override por variable de entorno sin editar el manifest:
`PROD_VIDEOS_KLING`, `PROD_ITERACIONKING`, `PROD_APIFY`.

> Recordatorio del flujo sano: **producción evoluciona, el repo es una foto.** Corre `sync_check` antes de
> publicar una versión del kit; si algo salió 🔴, re-sincroniza y `--bless`.
