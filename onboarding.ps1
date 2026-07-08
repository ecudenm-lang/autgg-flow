# onboarding.ps1 - Arranque guiado del AutGG Flow en una maquina nueva.
#
# USO:
#   powershell -ExecutionPolicy Bypass -File .\onboarding.ps1
#   powershell -ExecutionPolicy Bypass -File .\onboarding.ps1 -Etapas kling,pegasus   (scripteable, sin preguntar etapas)
#
# Reglas de diseno (mismas del repo):
#   - GASTA $0: instala/verifica/configura; producir o scrapear es un acto aparte.
#   - Nada se instala sin confirmacion (S/n).
#   - Las claves JAMAS se piden por consola ni se muestran: se abren las paginas
#     y el Bloc de notas; tu pegas; el script solo verifica PRESENCIA.
#   - Idempotente: correlo las veces que quieras; lo que ya esta, lo salta.
#   - PowerShell 5.1, sin acentos (mismo gotcha del repo).

param(
  [string]$Etapas = ""   # opcional: "market,scraping,videos". Si se omite, se pregunta.
)

$root = $PSScriptRoot
Set-Location $root
$envPath = Join-Path $root ".env"

function Paso($n, $txt) { Write-Host ""; Write-Host "[$n/6] $txt" -ForegroundColor Cyan }
function Ok($txt)    { Write-Host "  OK  $txt" -ForegroundColor Green }
function Falta($txt) { Write-Host "  --  $txt" -ForegroundColor Yellow }

function Refresh-Path {
  # Recarga el PATH del proceso desde el registro (Machine + User) para ver lo recien instalado por winget
  # sin tener que reabrir PowerShell.
  $m = [System.Environment]::GetEnvironmentVariable("Path","Machine")
  $u = [System.Environment]::GetEnvironmentVariable("Path","User")
  $env:Path = (@($m,$u) | Where-Object { $_ }) -join ';'
}

function Write-EnvUtf8($lines) {
  # UTF-8 sin BOM: preserva los acentos de los comentarios del .env sin ensuciar el archivo.
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines($envPath, $lines, $enc)
}

Write-Host ""
Write-Host "AUTGG-FLOW . ONBOARDING  (1.Market Research  2.Scraping Competencia  3.Fabrica de Videos  4.Growth Guide - no gasta creditos)" -ForegroundColor Green

# ---------- 1/6 : Prerequisitos ----------
Paso 1 "Prerequisitos (Node, ffmpeg, Python)"
$instaladoAlgo = $false

if (Get-Command node -ErrorAction SilentlyContinue) { Ok "Node.js $(node --version)" }
else {
  Falta "Node.js no encontrado (obligatorio para Pegasus y Kling)"
  $r = Read-Host "  Instalar Node.js LTS con winget ahora? (S/n)"
  if ($r -ne 'n') { winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent; $instaladoAlgo = $true }
}

function Find-Exe($nombre) {
  try { $c = Get-Command $nombre -ErrorAction Stop; return $c.Source } catch {}
  $hit = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter "$nombre.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($hit) { return $hit.FullName }
  return $null
}

$ffmpegPath = Find-Exe "ffmpeg"
if (-not $ffmpegPath) {
  Falta "ffmpeg no encontrado (obligatorio para el Paso 3 - Fabrica de Videos / Kling)"
  $r = Read-Host "  Instalar ffmpeg con winget ahora? (S/n)"
  if ($r -ne 'n') {
    winget install Gyan.FFmpeg --accept-package-agreements --accept-source-agreements --silent
    $instaladoAlgo = $true
    $ffmpegPath = Find-Exe "ffmpeg"
  }
}
if ($ffmpegPath) { Ok "ffmpeg: $ffmpegPath" } else { Falta "ffmpeg sigue faltando (el Paso 3 no podra montar video)" }
$ffprobePath = $null
if ($ffmpegPath) { $ffprobePath = Join-Path (Split-Path $ffmpegPath) "ffprobe.exe" }

# Python real (el alias de la Microsoft Store NO cuenta). Guardamos el interprete que funciona.
$pyCmd = $null
try { $pv = py --version 2>$null; if ($pv -match 'Python') { $pyCmd = 'py'; Ok "Python: $pv" } } catch {}
if (-not $pyCmd) {
  try { $pv = python --version 2>$null; if ($pv -match 'Python' -and $pv -notmatch 'Microsoft Store') { $pyCmd = 'python'; Ok "Python: $pv" } } catch {}
}
if (-not $pyCmd) {
  Falta "Python no encontrado (lo usan el Market Research y los subtitulos de la Fabrica de Videos)"
  $r = Read-Host "  Instalar Python 3.12 con winget ahora? (S/n)"
  if ($r -ne 'n') { winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements --silent; $instaladoAlgo = $true }
}

# Si acabamos de instalar algo, recargar el PATH para verlo en esta misma sesion.
if ($instaladoAlgo) {
  Refresh-Path
  if (-not $pyCmd) {
    if (Get-Command py -ErrorAction SilentlyContinue) { $pyCmd = 'py' }
    elseif (Get-Command python -ErrorAction SilentlyContinue) { $pyCmd = 'python' }
  }
  if (-not $ffmpegPath) { $ffmpegPath = Find-Exe "ffmpeg"; if ($ffmpegPath) { $ffprobePath = Join-Path (Split-Path $ffmpegPath) "ffprobe.exe" } }
}

# Guard: si Node se instalo recien y AUN no es visible, hay que reabrir PowerShell.
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host ""
  Write-Host "  Node se instalo pero aun no es visible en esta sesion." -ForegroundColor Yellow
  Write-Host "  CIERRA y REABRE PowerShell, y vuelve a correr onboarding.ps1 (es idempotente)." -ForegroundColor Yellow
  return
}

# ---------- 2/6 : Dependencias ----------
Paso 2 "Dependencias"
if (Test-Path (Join-Path $root "kling\node_modules\@fal-ai\client")) { Ok "kling: npm ya instalado" }
else {
  Write-Host "  Corriendo npm install en kling\ ..." -ForegroundColor Gray
  Push-Location (Join-Path $root "kling"); npm install --no-audit --no-fund | Out-Null; Pop-Location
  Ok "kling: npm install listo"
}
if ($pyCmd) {
  $r = Read-Host "  Instalar paquetes Python de post-produccion (subtitulos/banner)? (S/n)"
  if ($r -ne 'n') { & $pyCmd -m pip install -r (Join-Path $root "kling\requirements.txt") --quiet; Ok "faster-whisper + Pillow instalados" }
}
# (Pegasus y Market Research/Scraping no necesitan npm install: fetch nativo y Python stdlib)

# ---------- 3/6 : Archivo .env ----------
Paso 3 "Archivo .env (raiz, unico para las 3 etapas)"
if (-not (Test-Path $envPath)) { Copy-Item (Join-Path $root ".env.example") $envPath; Ok ".env creado desde .env.example" }
else { Ok ".env ya existe (no se toca lo que tenga)" }

if ($ffmpegPath -and $ffprobePath -and (Test-Path $ffprobePath)) {
  $lineas = Get-Content $envPath
  $cambio = $false
  $lineas = $lineas | ForEach-Object {
    if ($_ -match '^\s*FFMPEG=\s*$')      { $cambio = $true; "FFMPEG=$ffmpegPath" }
    elseif ($_ -match '^\s*FFPROBE=\s*$') { $cambio = $true; "FFPROBE=$ffprobePath" }
    else { $_ }
  }
  if ($cambio) { Write-EnvUtf8 $lineas; Ok "Rutas de ffmpeg escritas en el .env automaticamente" }
}

# ---------- 4/6 : Que procesos correras en esta maquina ----------
Paso 4 "Procesos que usaras en esta maquina"
if ($Etapas) {
  $tok = ($Etapas.ToLower() -split '[,\s]+')
  $usaMR = ($tok -contains 'market') -or ($tok -contains 'mr') -or ($tok -contains 'research') -or ($tok -contains 'apify')
  $usaSC = ($tok -contains 'scraping') -or ($tok -contains 'sc') -or ($tok -contains 'competencia') -or ($tok -contains 'trendtrack')
  $usaFV = ($tok -contains 'videos') -or ($tok -contains 'fv') -or ($tok -contains 'kling') -or ($tok -contains 'pegasus') -or ($tok -contains 'fabrica')
  Ok ("Procesos por parametro -> MarketResearch={0}  ScrapingCompetencia={1}  FabricaVideos={2}" -f $usaMR,$usaSC,$usaFV)
} else {
  $rMR = Read-Host "  Paso 1 - MARKET RESEARCH (Apify) aqui? (s/N)"
  $rSC = Read-Host "  Paso 2 - SCRAPING COMPETENCIA (TrendTrack) aqui? (s/N)"
  $rFV = Read-Host "  Paso 3 - FABRICA DE VIDEOS (Pegasus + Kling) aqui? (S/n)"
  $usaMR = ($rMR -eq 's'); $usaSC = ($rSC -eq 's'); $usaFV = ($rFV -ne 'n')
}
# (Paso 4 - Growth Guide: aun por definir, no requiere setup)

# ---------- 5/6 : Claves API (solo de las etapas elegidas) ----------
Paso 5 "Claves API (cuentas propias; nunca se muestran)"

function Valor-Env($nombre) {
  $linea = (Get-Content $envPath) | Where-Object { $_ -match "^\s*$nombre=" } | Select-Object -First 1
  if (-not $linea) { return "" }
  $v = ($linea -replace "^\s*$nombre=", "") -replace '(^|\s)#.*$', '$1'
  return $v.Trim()
}

# Claves OBLIGATORIAS por proceso. En Paso 3, solo KIE+FAL (producir) son obligatorias;
# TL_API_KEY (Pegasus, analisis de video) es OPCIONAL - igual que lo trata el doctor.
$requeridas = @()
if ($usaMR) { $requeridas += 'APIFY_TOKEN' }                              # Paso 1
if ($usaSC) { $requeridas += 'TRENDTRACK_TOKEN' }                         # Paso 2
if ($usaFV) { $requeridas += 'KIE_API_KEY'; $requeridas += 'FAL_KEY' }    # Paso 3 (producir con Kling)

$faltan = @($requeridas | Where-Object { -not (Valor-Env $_) })
if ($requeridas.Count -eq 0) { Falta "No elegiste ningun proceso que necesite claves" }
elseif ($faltan.Count -eq 0) { Ok "Todas las claves obligatorias de tus procesos ya estan puestas" }
else {
  Write-Host "  Faltan: $($faltan -join ', '). Te abro las paginas y el .env para resolverlo AHORA:" -ForegroundColor Yellow
  # NOTA: paginas de claves (verificar si alguna cambia). fal/apify/elevenlabs confiables; kie/trendtrack al dashboard.
  if ($faltan -contains 'APIFY_TOKEN')     { Start-Process "https://console.apify.com/settings/integrations" }  # Paso 1
  if ($faltan -contains 'TRENDTRACK_TOKEN'){ Start-Process "https://app.trendtrack.io/" }                       # Paso 2 (dashboard)
  if ($faltan -contains 'KIE_API_KEY')     { Start-Process "https://kie.ai/api-key" }                           # Paso 3 Kling
  if ($faltan -contains 'FAL_KEY')         { Start-Process "https://fal.ai/dashboard/keys" }                    # Paso 3 Kling
  # OPCIONALES del Paso 3 (no bloquean): Pegasus y voz IA
  if ($usaFV -and -not (Valor-Env 'TL_API_KEY')) {
    $r = Read-Host "  Analizaras videos de competencia con Pegasus (TwelveLabs)? Te abro su pagina (s/N)"
    if ($r -eq 's') { Start-Process "https://playground.twelvelabs.io/" }
  }
  if ($usaFV) {
    $r = Read-Host "  Usaras voz con IA (ElevenLabs)? Te abro su pagina tambien (s/N)"
    if ($r -eq 's') { Start-Process "https://elevenlabs.io/app/settings/api-keys" }
  }
  Start-Process notepad $envPath
  Write-Host "  En cada pagina: crea la cuenta, agrega saldo si aplica, copia la clave." -ForegroundColor Gray
  Write-Host "  En el Bloc de notas: pega cada clave despues del = (sin comillas) y GUARDA." -ForegroundColor Gray

  do {
    $null = Read-Host "  Cuando hayas pegado y GUARDADO, presiona Enter para verificar"
    $faltan = @($requeridas | Where-Object { -not (Valor-Env $_) })
    if ($faltan.Count -gt 0) {
      Write-Host "  Aun faltan: $($faltan -join ', ') (revisa que guardaste el archivo)" -ForegroundColor Yellow
      $r = Read-Host "  Reintentar? (S/n)"
      if ($r -eq 'n') { break }
    }
  } while ($faltan.Count -gt 0)
  if ($faltan.Count -eq 0) { Ok "Claves de tus procesos detectadas (nunca se muestran)" }
}

# ---------- 6/6 : Chequeo final ----------
Paso 6 "Chequeo de salud final (doctor + smoke, gasta `$0)"
node doctor.mjs --smoke
Write-Host ""
Write-Host "Siguientes pasos por proceso (cada uno es un acto aparte y consciente):" -ForegroundColor Cyan
if ($usaMR) { Write-Host "  PASO 1 Market Research   : powershell -File fase0-apify\tools\apify_run.ps1 -Name reddit_diabetes   (PAGA poco por run)" }
if ($usaSC) { Write-Host "  PASO 2 Scraping Compet.  : python fase0-apify\scripts\trendtrack_ads.py <token> <out>  ->  score_prep + dossier  (PAGA por run)" }
if ($usaFV) { Write-Host "  PASO 3 Fabrica de Videos : node pegasus\pegasus_analyze.mjs <video> <id>  +  kling\README-ARRANQUE.md sec.5   (PAGA al generar)" }
Write-Host "  PASO 4 Growth Guide      : (por definir)" -ForegroundColor DarkGray
