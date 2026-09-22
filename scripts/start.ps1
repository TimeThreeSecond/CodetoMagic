param([switch]$NoBrowser, [ValidateRange(1024,65525)][int]$Port = 5173)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$viteEntry = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
if (-not (Test-Path -LiteralPath $viteEntry)) {
    throw 'Dependencies are missing. Run npm install once in the project folder.'
}
function Test-MagicPage([string]$Url) {
    try {
        $page = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
        return $page.StatusCode -eq 200 -and $page.Content -match '<title>Code to Magic'
    } catch { return $false }
}
$selectedPort = $null
foreach ($candidatePort in $Port..($Port + 10)) {
    $candidateUrl = "http://127.0.0.1:$candidatePort/"
    if (Test-MagicPage $candidateUrl) {
        Write-Host "Opening existing Code to Magic: $candidateUrl"
        if (-not $NoBrowser) { Start-Process $candidateUrl }
        exit 0
    }
    if ($null -eq $selectedPort) {
        $probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $candidatePort)
        try { $probe.Start(); $selectedPort = $candidatePort } catch { } finally { $probe.Stop() }
        if ($null -ne $selectedPort) { break }
    }
}
if ($null -eq $selectedPort) { throw "No available local port between $Port and $($Port + 10)." }
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$runtimeDir = Join-Path $projectRoot '.runtime'
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$url = "http://127.0.0.1:$selectedPort/"
$serverArgs = '"{0}" --host 127.0.0.1 --port {1} --strictPort' -f $viteEntry, $selectedPort
$server = Start-Process -FilePath $nodePath -ArgumentList $serverArgs -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDir "vite-$selectedPort.log") -RedirectStandardError (Join-Path $runtimeDir "vite-$selectedPort-error.log")
for ($attempt = 0; $attempt -lt 40; $attempt++) {
    if (Test-MagicPage $url) {
        Write-Host "Code to Magic ready: $url"
        if (-not $NoBrowser) { Start-Process $url }
        exit 0
    }
    if ($server.HasExited) { throw "Local server stopped. See $runtimeDir" }
    Start-Sleep -Milliseconds 250
}
throw "Server did not become ready. See $runtimeDir"
