# load_env.ps1 - Carga las variables del .env (raiz) en la sesion actual de PowerShell.
# USO (ojo con el punto y el espacio al inicio = "dot-source"):
#     . .\load_env.ps1
# Despues, los scripts de las 3 etapas ven tus claves en esta ventana.

$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
  Write-Host "No existe .env - copia .env.example como .env y pon tus claves." -ForegroundColor Yellow
  return
}
$count = 0
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
    $idx = $line.IndexOf("=")
    $name = $line.Substring(0, $idx).Trim()
    $val  = $line.Substring($idx + 1)
    $val  = ($val -replace '(^|\s)#.*$', '$1').Trim().Trim('"').Trim("'")
    if ($name -and $val) {
      Set-Item -Path "Env:$name" -Value $val
      $count++
    }
  }
}
Write-Host "Cargadas $count variables de .env en esta sesion." -ForegroundColor Green
