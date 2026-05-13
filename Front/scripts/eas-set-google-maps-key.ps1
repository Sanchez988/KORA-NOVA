# Crea o actualiza EXPO_PUBLIC_GOOGLE_MAPS_API_KEY en EAS (production, preview, development).
# La clave termina en el cliente y en el manifiesto nativo (Maps); usá restricciones en Google Cloud.
#
# Uso (PowerShell), desde la carpeta Front:
#   .\scripts\eas-set-google-maps-key.ps1 -Key "AIza..."

param(
  [Parameter(Mandatory = $true)]
  [string] $Key
)

$ErrorActionPreference = "Stop"
$trim = $Key.Trim()
if ($trim.Length -lt 10) {
  Write-Error "La clave parece vacía o demasiado corta."
  exit 1
}

$envs = @("production", "preview", "development")
Set-Location $PSScriptRoot\..

foreach ($e in $envs) {
  Write-Host "EAS: EXPO_PUBLIC_GOOGLE_MAPS_API_KEY -> $e ..."
  npx eas-cli env:create `
    --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY `
    --value $trim `
    --environment $e `
    --visibility plaintext `
    --non-interactive `
    --force
}

Write-Host "Listo. Verificá con: npx eas-cli env:list --environment production"
