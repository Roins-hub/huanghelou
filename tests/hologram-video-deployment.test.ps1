$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$html = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $root "index.html")
$hologramName = -join ([char[]](0x5168, 0x606F))
$videoPath = Join-Path $root (Join-Path $hologramName "$hologramName.mp4")
$cloudflarePagesAssetLimitBytes = 25 * 1024 * 1024
$hologramVideoVersion = "20260417-h264"

if (-not (Test-Path -LiteralPath $videoPath)) {
  throw "hologram video should exist at the local hologram mp4 path."
}

$videoFile = Get-Item -LiteralPath $videoPath
if ($videoFile.Length -ge $cloudflarePagesAssetLimitBytes) {
  $sizeMiB = [math]::Round($videoFile.Length / 1MB, 2)
  throw "hologram video should be smaller than Cloudflare Pages' 25 MiB asset limit; current size is $sizeMiB MiB."
}

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$ffmpegInfo = & ffmpeg -hide_banner -i $videoPath -map 0:v:0 -frames:v 1 -f null NUL 2>&1 | Out-String
$ffmpegExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference

if ($ffmpegExitCode -ne 0) {
  throw "hologram video should be readable by ffmpeg; exit code was $ffmpegExitCode."
}

if ($ffmpegInfo -notmatch "Video:\s*h264\b") {
  throw "hologram video should use browser-friendly H.264 video encoding."
}

if ($html -notmatch "%E5%85%A8%E6%81%AF/%E5%85%A8%E6%81%AF\.mp4\?v=$hologramVideoVersion") {
  throw "hologram page should cache-bust the video URL so proxy domains cannot reuse a stale failed video response."
}

"Hologram video deployment checks passed."
