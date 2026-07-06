<#
  apify_run.ps1  - Motor generico para correr cualquier actor de Apify por API.

  Lanza el actor (async), hace polling hasta que termina, y descarga el dataset
  completo a raw\<name>_<YYYYMMDD>.json.

  Uso:
    powershell -File tools\apify_run.ps1 -Actor "trudax/reddit-scraper" -InputFile config\inputs\reddit_diabetes.json -Name reddit_diabetes
    powershell -File tools\apify_run.ps1 -Name reddit_diabetes        # toma actor+input de config\sources.json

  Token: lee la env var APIFY_TOKEN, o config\apify_token.txt (1 linea).
#>
param(
  [string]$Actor,                       # "username/actor-name" o "username~actor-name"
  [string]$InputFile,                   # ruta al JSON de input del actor
  [Parameter(Mandatory=$true)][string]$Name,  # nombre logico de la fuente (para el archivo de salida)
  [string]$OutFile,                     # ruta de salida explicita; si se da, ignora el nombrado con fecha
  [int]$PollSeconds = 10,               # cada cuanto consultar el estado
  [int]$TimeoutMin  = 30                # corte de seguridad
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent   # carpeta fase0-apify

# --- token (prioridad a la variable de entorno) ---
$token = $env:APIFY_TOKEN
if (-not $token) {
  $tokenFile = Join-Path $root 'config\apify_token.txt'
  if (Test-Path $tokenFile) { $token = (Get-Content $tokenFile -Raw).Trim() }
}
if (-not $token) { throw "No hay token. Pon tu API token en `$env:APIFY_TOKEN o en config\apify_token.txt" }

# --- resolver actor + input desde sources.json si no se pasaron ---
if (-not $Actor -or -not $InputFile) {
  $sourcesFile = Join-Path $root 'config\sources.json'
  if (Test-Path $sourcesFile) {
    $sources = Get-Content $sourcesFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $src = $sources | Where-Object { $_.name -eq $Name } | Select-Object -First 1
    if ($src) {
      if (-not $Actor)     { $Actor = $src.actor }
      if (-not $InputFile) { $InputFile = Join-Path $root $src.inputFile }
    }
  }
}
if (-not $Actor)     { throw "Falta -Actor (o una entrada '$Name' en config\sources.json)" }
if (-not $InputFile) { throw "Falta -InputFile (o 'inputFile' en config\sources.json para '$Name')" }
if (-not (Test-Path $InputFile)) { throw "No existe el input: $InputFile" }

$actorPath = $Actor -replace '/', '~'
$inputJson = Get-Content $InputFile -Raw -Encoding UTF8

Write-Host "[apify_run] Actor: $Actor" -ForegroundColor Cyan
Write-Host "[apify_run] Input: $InputFile"

# --- 1) lanzar run ---
$runResp = Invoke-RestMethod -Method Post `
  -Uri "https://api.apify.com/v2/acts/$actorPath/runs?token=$token" `
  -ContentType 'application/json; charset=utf-8' `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($inputJson))

$runId     = $runResp.data.id
$datasetId = $runResp.data.defaultDatasetId
Write-Host "[apify_run] runId=$runId  datasetId=$datasetId" -ForegroundColor DarkGray

# --- 2) polling (tolera el 'record-not-found' de los primeros segundos) ---
$deadline = (Get-Date).AddMinutes($TimeoutMin)
do {
  Start-Sleep -Seconds $PollSeconds
  try {
    $st = Invoke-RestMethod -Method Get -Uri "https://api.apify.com/v2/actor-runs/$runId?token=$token"
    $status = $st.data.status
    Write-Host ("[apify_run] estado: {0}  (items: {1}  costo USD: {2})" -f $status, $st.data.stats.outputItemCount, $st.data.usageTotalUsd)
  } catch {
    # El endpoint /actor-runs/{id} tiene lag de consistencia (a veces >1 min). El run existe;
    # 'not found' NUNCA es fatal: seguimos consultando hasta el deadline global.
    $status = 'READY'; Write-Host "[apify_run] run aun no visible (lag de la API), reintento..."
  }
  if ((Get-Date) -gt $deadline) { throw "Timeout tras $TimeoutMin min (estado=$status). Run sigue en Apify: $runId" }
} while ($status -in @('READY','RUNNING'))

if ($status -ne 'SUCCEEDED') {
  Write-Warning "El run termino en estado '$status'. Descargo lo que haya."
}

# --- 3) descargar dataset ---
if ($OutFile) {
  $outFile = if ([System.IO.Path]::IsPathRooted($OutFile)) { $OutFile } else { Join-Path $root $OutFile }
  $outDir = Split-Path $outFile -Parent
  if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }
} else {
  $stamp = (Get-Date -Format 'yyyyMMdd')
  $outDir = Join-Path $root 'raw'
  $outFile = Join-Path $outDir ("{0}_{1}.json" -f $Name, $stamp)
}
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }
$items = Invoke-RestMethod -Method Get `
  -Uri "https://api.apify.com/v2/datasets/$datasetId/items?token=$token&format=json&clean=true"

$items | ConvertTo-Json -Depth 20 | Out-File $outFile -Encoding utf8
$count = @($items).Count
Write-Host "[apify_run] OK -> $outFile  ($count items)" -ForegroundColor Green
