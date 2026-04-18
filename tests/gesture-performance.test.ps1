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

function Assert-NotContains {
  param(
    [string] $Content,
    [string] $Needle,
    [string] $Message
  )

  if ($Content.Contains($Needle)) {
    throw $Message
  }
}

Assert-Contains $js "const POINTER_MODEL_COMPLEXITY = 0" "pointer gesture scanners should use the faster MediaPipe hand model."
Assert-Contains $js "const POINTER_MISS_GRACE_MS = 650" "pointer cursors should tolerate brief hand-tracking misses instead of disappearing immediately."
Assert-Contains $js "const POINTER_PINCH_DISTANCE = 0.07" "pointer pinch threshold should be forgiving enough for fast entry interactions."
Assert-NotContains $js "let startScanInFlight = false" "start page should no longer run a MediaPipe scan loop."
Assert-Contains $js "let culturalScanInFlight = false" "cultural page scan loop should avoid overlapping MediaPipe send calls."
Assert-NotContains $js "let startScannerSession = 0" "start page should no longer keep scanner session state."
Assert-Contains $js "let culturalScannerSession = 0" "cultural scanner should guard against stale async camera startup."
Assert-NotContains $js "function isStartScannerSessionActive" "start page should no longer have scanner session logic."
Assert-Contains $js "function isCulturalScannerSessionActive" "cultural scanner should reject sessions that finish after navigation."
Assert-NotContains $js "stopMediaStream(startScanStream)" "start page should no longer open camera streams."
Assert-Contains $js "stopMediaStream(culturalScanStream)" "stale cultural scanner sessions should release their camera stream."
Assert-NotContains $js "startPointerState.lastSeenAt = now" "start page pointer should no longer track hand detections."
Assert-Contains $js "culturalDrawState.lastSeenAt = now" "cultural pointer should remember the last successful detection timestamp."
Assert-NotContains $js "now - startPointerState.lastSeenAt > POINTER_MISS_GRACE_MS" "start pointer miss grace logic should be removed."
Assert-Contains $js "now - culturalDrawState.lastSeenAt > POINTER_MISS_GRACE_MS" "cultural pointer should only hide after the miss grace period."
Assert-Contains $js "modelComplexity: POINTER_MODEL_COMPLEXITY" "pointer scanners should share the optimized model complexity constant."
Assert-Contains $js "minDetectionConfidence: POINTER_DETECTION_CONFIDENCE" "pointer scanners should share the faster detection confidence constant."
Assert-Contains $js "minTrackingConfidence: POINTER_TRACKING_CONFIDENCE" "pointer scanners should share the faster tracking confidence constant."
Assert-Contains $js "const CULTURAL_HOVER_DRAW_MS = 520" "cultural cards should auto-draw quickly after a stable hover."
Assert-Contains $js "now - culturalDrawState.hoverStartedAt > CULTURAL_HOVER_DRAW_MS" "cultural card auto-draw should use the fast hover threshold constant."

"Gesture performance checks passed."
