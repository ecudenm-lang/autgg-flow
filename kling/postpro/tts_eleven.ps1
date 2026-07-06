# tts_eleven.ps1 — Genera VO con ElevenLabs desde texto.
# Uso:
#   .\tts_eleven.ps1 -Text "Hola, soy el narrador..." -Out "voz.mp3"
#   .\tts_eleven.ps1 -TextFile "guion.txt" -Out "voz.mp3"
param(
  [string]$Text,
  [string]$TextFile,
  [Parameter(Mandatory=$true)][string]$Out,
  [string]$VoiceId,                      # opcional; si no, usa config/api_config.json
  [string]$ConfigDir                     # opcional; por defecto <kit>/config
)

$ErrorActionPreference = "Stop"
# Rutas PORTABLES: config por defecto en <kit>/config (relativo a este script).
if (-not $ConfigDir) { $ConfigDir = Join-Path (Split-Path $PSScriptRoot -Parent) "config" }

# Clave: prioridad a la variable de entorno ELEVENLABS_API_KEY; si no, config/elevenlabs_key.txt.
$key = $env:ELEVENLABS_API_KEY
if (-not $key) {
  $keyFile = Join-Path $ConfigDir "elevenlabs_key.txt"
  if (Test-Path $keyFile) { $key = (Get-Content $keyFile -Raw).Trim() }
}
if (-not $key) { throw "Falta la clave: define `$env:ELEVENLABS_API_KEY o crea config/elevenlabs_key.txt" }
$cfg = Get-Content (Join-Path $ConfigDir "api_config.json") -Raw | ConvertFrom-Json

if ($TextFile) { $Text = Get-Content $TextFile -Raw -Encoding UTF8 }
if (-not $Text) { throw "Falta -Text o -TextFile" }
if (-not $VoiceId) { $VoiceId = $cfg.elevenlabs.voice_id }
if ($VoiceId -like "PASTE_*") { throw "Falta el voice_id del Dr. Salas en api_config.json" }

$body = @{
  text     = $Text
  model_id = $cfg.elevenlabs.model_id
  voice_settings = @{
    stability         = $cfg.elevenlabs.voice_settings.stability
    similarity_boost  = $cfg.elevenlabs.voice_settings.similarity_boost
    style             = $cfg.elevenlabs.voice_settings.style
    use_speaker_boost = $cfg.elevenlabs.voice_settings.use_speaker_boost
  }
} | ConvertTo-Json -Depth 6

$dir = Split-Path $Out -Parent
if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }

# Enviar el body como bytes UTF-8 para no perder tildes/ñ
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/text-to-speech/$VoiceId" `
  -Method Post `
  -Headers @{ "xi-api-key" = $key } `
  -ContentType "application/json; charset=utf-8" `
  -Body $bodyBytes -OutFile $Out

$sz = (Get-Item $Out).Length
Write-Host ("VO OK -> {0} ({1:N0} bytes)" -f $Out, $sz)
