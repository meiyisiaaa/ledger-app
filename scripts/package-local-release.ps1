param(
  [string]$Version
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

if (-not $Version) {
  $AppJson = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $Root "mobile/app.json") | ConvertFrom-Json
  $Version = $AppJson.expo.version
}

$ReleaseDir = Join-Path $Root "release"
$WebZip = Join-Path $ReleaseDir "ledger-journal-web-$Version.zip"
$ApkSource = Join-Path $Root "mobile/android/app/build/outputs/apk/release/app-release.apk"
$AabSource = Join-Path $Root "mobile/android/app/build/outputs/bundle/release/app-release.aab"

if (Test-Path -LiteralPath $ReleaseDir) {
  Remove-Item -LiteralPath $ReleaseDir -Recurse -Force
}
New-Item -ItemType Directory -Path $ReleaseDir | Out-Null

Push-Location $Root
try {
  npm run build
}
finally {
  Pop-Location
}

Compress-Archive -Path (Join-Path $Root "dist/*") -DestinationPath $WebZip -Force

if (Test-Path -LiteralPath $ApkSource) {
  Copy-Item -LiteralPath $ApkSource -Destination (Join-Path $ReleaseDir "ledger-journal-android-$Version.apk")
}

if (Test-Path -LiteralPath $AabSource) {
  Copy-Item -LiteralPath $AabSource -Destination (Join-Path $ReleaseDir "ledger-journal-android-$Version.aab")
}

$ChecksumPath = Join-Path $ReleaseDir "SHA256SUMS.txt"
Get-ChildItem -LiteralPath $ReleaseDir -File |
  Where-Object { $_.Name -ne "SHA256SUMS.txt" } |
  ForEach-Object {
    $Stream = [IO.File]::OpenRead($_.FullName)
    try {
      $Sha = [Security.Cryptography.SHA256]::Create()
      $Bytes = $Sha.ComputeHash($Stream)
      $Hash = -join ($Bytes | ForEach-Object { $_.ToString("x2") })
      "$Hash  $($_.Name)"
    }
    finally {
      $Stream.Dispose()
    }
  } |
  Set-Content -Encoding UTF8 -LiteralPath $ChecksumPath

Write-Host "Release files written to $ReleaseDir"
