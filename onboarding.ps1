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
  [string]$Etapas = ""   # opcional: "kling,pegasus,fase0". Si se omite, se pregunta.
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
Write-Host "AUTGG-FLOW . ONBOARDING  (Fase 0 . Pegasus . Kling - no gasta creditos)" -ForegroundColor Green

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
  Falta "ffmpeg no encontrado (obligatorio para la Etapa 4 - Kling)"
  $r = Read-Host "  Instalar ffmpeg con winget ahora? (S/n)"
  if ($r -ne 'n') {
    winget install Gyan.FFmpeg --accept-package-agreements --accept-source-agreements --silent
    $instaladoAlgo = $true
    $ffmpegPath = Find-Exe "ffmpeg"
  }
}
if ($ffmpegPath) { Ok "ffmpeg: $ffmpegPath" } else { Falta "ffmpeg sigue faltando (la Etapa 4 no podra montar video)" }
$ffprobePath = $null
if ($ffmpegPath) { $ffprobePath = Join-Path (Split-Path $ffmpegPath) "ffprobe.exe" }

# Python real (el alias de la Microsoft Store NO cuenta). Guardamos el interprete que funciona.
$pyCmd = $null
try { $pv = py --version 2>$null; if ($pv -match 'Python') { $pyCmd = 'py'; Ok "Python: $pv" } } catch {}
if (-not $pyCmd) {
  try { $pv = python --version 2>$null; if ($pv -match 'Python' -and $pv -notmatch 'Microsoft Store') { $pyCmd = 'python'; Ok "Python: $pv" } } catch {}
}
if (-not $pyCmd) {
  Falta "Python no encontrado (lo usan la Fase 0 y los subtitulos de Kling)"
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
# (Pegasus y Fase 0 no necesitan npm install: fetch nativo y Python stdlib)

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

# ---------- 4/6 : Que etapas correras en esta maquina ----------
Paso 4 "Etapas que usaras en esta maquina"
if ($Etapas) {
  $tok = ($Etapas.ToLower() -split '[,\s]+')
  $usaF0 = ($tok -contains 'fase0') -or ($tok -contains 'f0') -or ($tok -contains 'research')
  $usaP  = ($tok -contains 'pegasus') -or ($tok -contains 'p3')
  $usaK  = ($tok -contains 'kling') -or ($tok -contains 'k4')
  Ok ("Etapas por parametro -> Fase0={0}  Pegasus={1}  Kling={2}" -f $usaF0,$usaP,$usaK)
} else {
  $rF0 = Read-Host "  Correras la FASE 0 (research: Apify/TrendTrack) aqui? (s/N)"
  $rP  = Read-Host "  Correras la ETAPA 3 (Pegasus: analisis visual TwelveLabs) aqui? (s/N)"
  $rK  = Read-Host "  Correras la ETAPA 4 (Kling: produccion de video) aqui? (S/n)"
  $usaF0 = ($rF0 -eq 's'); $usaP = ($rP -eq 's'); $usaK = ($rK -ne 'n')
}

# ---------- 5/6 : Claves API (solo de las etapas elegidas) ----------
Paso 5 "Claves API (cuentas propias; nunca se muestran)"

function Valor-Env($nombre) {
  $linea = (Get-Content $envPath) | Where-Object { $_ -match "^\s*$nombre=" } | Select-Object -First 1
  if (-not $linea) { return "" }
  $v = ($linea -replace "^\s*$nombre=", "") -replace '(^|\s)#.*$', '$1'
  return $v.Trim()
}

$requeridas = @()
if ($usaK)  { $requeridas += 'KIE_API_KEY'; $requeridas += 'FAL_KEY' }
if ($usaF0) { $requeridas += 'APIFY_TOKEN' }
if ($usaP)  { $requeridas += 'TL_API_KEY' }

$faltan = @($requeridas | Where-Object { -not (Valor-Env $_) })
if ($requeridas.Count -eq 0) { Falta "No elegiste ninguna etapa que necesite claves" }
elseif ($faltan.Count -eq 0) { Ok "Todas las claves de tus etapas ya estan puestas" }
else {
  Write-Host "  Faltan: $($faltan -join ', '). Te abro las paginas y el .env para resolverlo AHORA:" -ForegroundColor Yellow
  # NOTA: paginas de claves (verificar si alguna cambia). Las 3 marcadas [ok] son confiables.
  if ($faltan -contains 'KIE_API_KEY') { Start-Process "https://kie.ai/api-key" }                          # verificar
  if ($faltan -contains 'FAL_KEY')     { Start-Process "https://fal.ai/dashboard/keys" }                    # [ok]
  if ($faltan -contains 'APIFY_TOKEN') { Start-Process "https://console.apify.com/settings/integrations" }  # [ok]
  if ($faltan -contains 'TL_API_KEY')  { Start-Process "https://playground.twelvelabs.io/" }                # dashboard (la key esta dentro)
  if ($usaF0) {
    $r = Read-Host "  Usaras TrendTrack? Te abro su pagina tambien (s/N)"
    if ($r -eq 's') { Start-Process "https://app.trendtrack.io/" }
  }
  if ($usaK) {
    $r = Read-Host "  Usaras voz con IA (ElevenLabs)? Te abro su pagina tambien (s/N)"
    if ($r -eq 's') { Start-Process "https://elevenlabs.io/app/settings/api-keys" }                         # [ok]
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
  if ($faltan.Count -eq 0) { Ok "Claves de tus etapas detectadas (nunca se muestran)" }
}

# ---------- 6/6 : Chequeo final ----------
Paso 6 "Chequeo de salud final (doctor + smoke, gasta `$0)"
node doctor.mjs --smoke
Write-Host ""
Write-Host "Siguientes pasos por etapa (cada uno es un acto aparte y consciente):" -ForegroundColor Cyan
if ($usaF0) { Write-Host "  FASE 0 : powershell -File fase0-apify\tools\apify_run.ps1 -Name reddit_diabetes   (PAGA poco por run)" }
if ($usaP)  { Write-Host "  ETAPA 3: node pegasus\pegasus_analyze.mjs <video> <nombre>                        (PAGA al subir video)" }
if ($usaK)  { Write-Host "  ETAPA 4: ver kling\README-ARRANQUE.md seccion 5 (flujo voz-primero)               (PAGA en pasos 4-6)" }
