# Ein-Befehl-Build (Windows): laedt den gepinnten Tailwind-Standalone-CLI und baut assets/css/main.css
param([switch]$Watch)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$Version = 'v3.4.17'
$Sha = '67f1c5e3f5a03406a7bf5badf5ada09b79f3ae78ec43450c15f7e983068da346'
$Bin = Join-Path $PSScriptRoot 'tailwindcss.exe'

if (-not (Test-Path $Bin)) {
    $Url = "https://github.com/tailwindlabs/tailwindcss/releases/download/$Version/tailwindcss-windows-x64.exe"
    Write-Host "Lade tailwindcss-windows-x64.exe ($Version) ..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Bin
    $Actual = (Get-FileHash -Algorithm SHA256 $Bin).Hash
    if ($Actual -ine $Sha) {
        Remove-Item $Bin -Force
        throw "Prüfsumme stimmt nicht (erwartet $Sha, erhalten $Actual)"
    }
}

$argsList = @('-i', 'src/input.css', '-o', 'assets/css/main.css', '--minify')
if ($Watch) { $argsList += '--watch' }
& $Bin @argsList
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
