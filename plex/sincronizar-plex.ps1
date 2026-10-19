<#
  Sincronización Plex -> tienda online de Purafarma.

  Toma el listado de artículos que exporta Plex (CSV o TXT con columnas de código, precio y stock)
  y lo envía a la tienda. La tienda actualiza precio y stock de los productos que ya tiene cargados,
  buscándolos por código. No crea productos ni cambia nombres, fotos o descripciones.

  Uso (una vez, para probar):
    powershell -ExecutionPolicy Bypass -File sincronizar-plex.ps1

  Para que corra solo, ver plex\LEEME.md (Programador de tareas de Windows).
#>

# ---- Configuración: completar estos tres valores ----
$Archivo = "C:\Plex\Exportaciones\articulos.csv"   # donde Plex deja el listado exportado
$Clave   = "PEGAR_ACA_LA_CLAVE_DE_SINCRONIZACION"  # la clave que te pasaron junto con este script
$Api     = "https://br-bold-surf-ae4ctdc9-api.compute.c-2.us-east-2.aws.neon.tech"
# ------------------------------------------------------

$ErrorActionPreference = "Stop"
$Carpeta = Split-Path -Parent $MyInvocation.MyCommand.Path
$Log = Join-Path $Carpeta "sincronizar-plex.log"
$Ultimo = Join-Path $Carpeta ".ultimo-envio"

function Anotar($texto) {
  $linea = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $texto
  Add-Content -Path $Log -Value $linea -Encoding UTF8
  Write-Host $linea
}

try {
  if (-not (Test-Path $Archivo)) { Anotar "No encontré el archivo $Archivo. Revisá la ruta en la configuración."; exit 1 }

  # Si el listado no cambió desde el último envío, no hace falta mandarlo de nuevo
  $hash = (Get-FileHash -Path $Archivo -Algorithm SHA256).Hash
  if ((Test-Path $Ultimo) -and ((Get-Content $Ultimo -Raw).Trim() -eq $hash)) { exit 0 }

  $bytes = [System.IO.File]::ReadAllBytes($Archivo)
  $resp = Invoke-RestMethod -Uri "$Api/v1/sincronizar?modo=precios" -Method Post -Body $bytes `
    -ContentType "text/csv" -Headers @{ Authorization = "Bearer $Clave" } -TimeoutSec 300

  Anotar ("OK: {0} filas, {1} actualizados, {2} sin cambios, {3} que no están en la tienda" -f $resp.filas, $resp.actualizados, $resp.sin_cambios, $resp.ignorados)
  Set-Content -Path $Ultimo -Value $hash
}
catch {
  $detalle = $_.ErrorDetails.Message
  if (-not $detalle) { $detalle = $_.Exception.Message }
  Anotar "ERROR: $detalle"
  exit 1
}
