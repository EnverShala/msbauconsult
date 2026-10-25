# Ein-Befehl-Build (Windows): laedt den gepinnten Tailwind-Standalone-CLI und baut assets/css/main.css
param([switch]$Watch)
$ErrorActionPreference = 'Stop'
# Push/Pop: das Arbeitsverzeichnis des Aufrufers bleibt unveraendert
Push-Location $PSScriptRoot
try {

$Version = 'v3.4.17'
$Sha = '67f1c5e3f5a03406a7bf5badf5ada09b79f3ae78ec43450c15f7e983068da346'
$Bin = Join-Path $PSScriptRoot 'tailwindcss.exe'
$Part = "$Bin.part"

# Vorhandene Binaerdatei vor jeder Nutzung pruefen; bei Abweichung verwerfen und neu laden
if (Test-Path $Bin) {
    if ((Get-FileHash -Algorithm SHA256 $Bin).Hash -ine $Sha) {
        Write-Warning 'Vorhandenes tailwindcss.exe hat falschen Hash - wird verworfen.'
        Remove-Item $Bin -Force
    }
}

if (-not (Test-Path $Bin)) {
    $Url = "https://github.com/tailwindlabs/tailwindcss/releases/download/$Version/tailwindcss-windows-x64.exe"
    Write-Host "Lade tailwindcss-windows-x64.exe ($Version) ..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $ProgressPreference = 'SilentlyContinue'
    try {
        Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Part
        $Actual = (Get-FileHash -Algorithm SHA256 $Part).Hash
        if ($Actual -ine $Sha) {
            throw "Pruefsumme stimmt nicht (erwartet $Sha, erhalten $Actual)"
        }
        Move-Item -Force $Part $Bin
    } finally {
        if (Test-Path $Part) { Remove-Item $Part -Force }
    }
}

$argsList = @('-i', 'src/input.css', '-o', 'assets/css/main.css', '--minify')
if ($Watch) { $argsList += '--watch' }
& $Bin @argsList
if ($LASTEXITCODE -ne 0) { throw "tailwindcss beendet mit Code $LASTEXITCODE" }

# Cache-Busting: ?v=<sha256[0:8]> von main.css/main.js in index.html eintragen (idempotent, UTF-8 ohne BOM)
if (-not $Watch) {
    $cssV = (Get-FileHash -Algorithm SHA256 (Join-Path $PSScriptRoot 'assets/css/main.css')).Hash.Substring(0, 8).ToLower()
    $jsV = (Get-FileHash -Algorithm SHA256 (Join-Path $PSScriptRoot 'assets/js/main.js')).Hash.Substring(0, 8).ToLower()
    $idx = Join-Path $PSScriptRoot 'index.html'
    $html = [IO.File]::ReadAllText($idx)
    $html = [regex]::Replace($html, '/assets/css/main\.css(\?v=[0-9a-f]{8})?"', "/assets/css/main.css?v=$cssV`"")
    $html = [regex]::Replace($html, '/assets/js/main\.js(\?v=[0-9a-f]{8})?"', "/assets/js/main.js?v=$jsV`"")
    [IO.File]::WriteAllText($idx, $html, (New-Object Text.UTF8Encoding $false))
}
} finally {
    Pop-Location
}
