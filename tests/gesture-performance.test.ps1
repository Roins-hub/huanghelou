$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$js = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $root "script.js")

function Assert-Contains {
  param(
    [string] $Content,
    [string] $Needle,
    [string] $Message
  )

  if (-not $Content.Contains($Needle)) {
    throw $Message
  }
}

Assert-Contains $js "const POINTER_MODEL_COMPLEXITY = 0" "pointer gesture scanners should use the faster MediaPipe hand model."
Assert-Contains $js "const POINTER_MISS_GRACE_MS = 650" "pointer cursors should tolerate brief hand-tracking misses instead of disappearing immediately."
Assert-Contains $js "const POINTER_PINCH_DISTANCE = 0.07" "pointer pinch threshold should be forgiving enough for fast entry interactions."
Assert-Contains $js "let startScanInFlight = false" "start page scan loop should avoid overlapping MediaPipe send calls."
Assert-Contains $js "let culturalScanInFlight = false" "cultural page scan loop should avoid overlapping MediaPipe send calls."
Assert-Contains $js "let startScannerSession = 0" "start scanner should guard against stale async camera startup."
Assert-Contains $js "let culturalScannerSession = 0" "cultural scanner should guard against stale async camera startup."
Assert-Contains $js "function isStartScannerSessionActive" "start scanner should reject sessions that finish after navigation."
Assert-Contains $js "function isCulturalScannerSessionActive" "cultural scanner should reject sessions that finish after navigation."
Assert-Contains $js "stopMediaStream(startScanStream)" "stale start scanner sessions should release their camera stream."
Assert-Contains $js "stopMediaStream(culturalScanStream)" "stale cultural scanner sessions should release their camera stream."
Assert-Contains $js "startPointerState.lastSeenAt = now" "start page pointer should remember the last successful detection timestamp."
Assert-Contains $js "culturalDrawState.lastSeenAt = now" "cultural pointer should remember the last successful detection timestamp."
Assert-Contains $js "now - startPointerState.lastSeenAt > POINTER_MISS_GRACE_MS" "start pointer should only hide after the miss grace period."
Assert-Contains $js "now - culturalDrawState.lastSeenAt > POINTER_MISS_GRACE_MS" "cultural pointer should only hide after the miss grace period."
Assert-Contains $js "modelComplexity: POINTER_MODEL_COMPLEXITY" "pointer scanners should share the optimized model complexity constant."
Assert-Contains $js "minDetectionConfidence: POINTER_DETECTION_CONFIDENCE" "pointer scanners should share the faster detection confidence constant."
Assert-Contains $js "minTrackingConfidence: POINTER_TRACKING_CONFIDENCE" "pointer scanners should share the faster tracking confidence constant."
Assert-Contains $js "const CULTURAL_HOVER_DRAW_MS = 520" "cultural cards should auto-draw quickly after a stable hover."
Assert-Contains $js "now - culturalDrawState.hoverStartedAt > CULTURAL_HOVER_DRAW_MS" "cultural card auto-draw should use the fast hover threshold constant."

"Gesture performance checks passed."
