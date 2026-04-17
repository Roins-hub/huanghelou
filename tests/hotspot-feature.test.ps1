$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$html = Get-Content -Raw -Path (Join-Path $root "index.html")
$css = Get-Content -Raw -Path (Join-Path $root "style.css")
$js = Get-Content -Raw -Path (Join-Path $root "script.js")

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

Assert-Contains $html 'id="hotspotLayer"' "index.html should include the projected hotspot overlay layer."
Assert-Contains $css ".model-hotspot" "style.css should include model hotspot styling."
Assert-Contains $css ".scene-section.is-floor-switching" "style.css should include a floor switching animation state."
Assert-Contains $js "const floorHotspots" "script.js should define floor hotspot anchor data."
Assert-Contains $js "function activateFloor" "script.js should expose one shared floor activation path."
Assert-Contains $js "updateHotspotPositions" "script.js should project 3D hotspot anchors into the overlay."
Assert-Contains $js "function getFallbackHotspotPosition" "script.js should keep hotspots visible even when 3D projection is outside the camera view."
Assert-Contains $js "isProjectionUsable" "script.js should validate projected hotspot coordinates before using them."
Assert-Contains $js 'button.classList.add("is-visible")' "hotspot buttons should have a visible fallback instead of depending entirely on projection."
Assert-Contains $js "showFloorPopup(floorNumber);" "activateFloor should continue to show the existing floor popup."

"Hotspot feature checks passed."
