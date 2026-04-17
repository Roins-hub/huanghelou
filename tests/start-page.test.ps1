$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$html = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $root "index.html")
$css = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $root "style.css")
$js = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $root "script.js")
$posterTitle = -join ([char[]](0x6D77, 0x62A5, 0x5C55, 0x793A))
$cardBackLabels = @(
  [char]0x9E64,
  [char]0x697C,
  [char]0x6C5F,
  [char]0x57CE,
  [char]0x793C
)

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

Assert-Contains $html 'id="startPage"' "index.html should include a start page shell."
Assert-Contains $html 'style.css?v=20260417-cultural-poster-title' "index.html should cache-bust the latest cultural poster title CSS."
Assert-Contains $html 'id="startVideo"' "index.html should include the start page background video."
Assert-Contains $html 'id="startScanVideo"' "index.html should include a start page camera scanner video."
Assert-Contains $html 'id="startHandCursor"' "index.html should include a realtime gesture-controlled cursor."
Assert-Contains $html 'start-hand-cursor__halo' "gesture cursor should include a liquid halo layer."
Assert-Contains $html 'start-hand-cursor__core' "gesture cursor should include a refined core layer."
Assert-NotContains $html 'id="startTraceCanvas"' "start page should not use a drawing trace canvas."
Assert-Contains $html 'src="./%E5%BC%80%E5%A7%8B.mp4"' "start page should use the encoded 寮€濮?mp4 video path."
Assert-Contains $html "autoplay" "start video should request autoplay."
Assert-Contains $html "playsinline" "start video should play inline on mobile."
$startVideoTag = [regex]::Match($html, '<video\s+[^>]*id="startVideo"[^>]*>', 'Singleline').Value
if (-not $startVideoTag) {
  throw "start video tag should be present."
}
Assert-NotContains $startVideoTag "muted" "start video should not be muted in markup."
Assert-NotContains $html "01 VR" "start page links should not use numeric prefixes."
Assert-Contains $html 'href="https://www.720yun.com/vr/e03jertOev3"' "VR 鍏ㄦ櫙 should link to the 720yun panorama."
Assert-NotContains $html 'href="https://3d.hunyuan.tencent.com/assets"' "全息系统 should no longer use the old external link."
Assert-NotContains $html 'href="https://baidu.com"' "文创设计 should no longer use the old external link."
Assert-Contains $html 'data-start-action="hologram"' "全息系统 should open the local hologram page."
Assert-Contains $html 'data-start-action="cultural"' "文创设计 should open the local cultural page."
Assert-Contains $html 'data-start-action="gesture"' "鎵嬪娍浜や簰 should enter the current gesture experience."
Assert-Contains $html 'id="backToStartButton"' "experience page should include a button that returns to the start page."
Assert-Contains $html 'data-start-action="return"' "return button should be wired as a start page action."
Assert-Contains $html 'id="hologramPage"' "index.html should include a local hologram system page."
Assert-Contains $html 'id="culturalPage"' "index.html should include a local cultural design page."
Assert-Contains $html 'src="./%E5%85%A8%E6%81%AF/%E5%85%A8%E6%81%AF.mp4"' "hologram page should use the local 全息 video."
Assert-Contains $html 'id="culturalScanVideo"' "cultural page should include a camera video for gesture draw-card interaction."
Assert-Contains $html 'id="culturalPointer"' "cultural page should include a realtime gesture pointer."
Assert-Contains $html 'cultural-poster-stage' "cultural page should include a large poster reveal stage."
Assert-Contains $html 'id="culturalPosterImage"' "cultural page should expose the drawn poster image for large viewing."
Assert-Contains $html 'type="button" class="cultural-poster-close"' "cultural poster should be clickable to collapse."
Assert-Contains $html 'cultural-rotor' "cultural page should include a rotor-style sliding card control."
Assert-Contains $html 'class="cultural-card"' "cultural page should render draw-card items."
Assert-Contains $html $posterTitle "cultural page title should use the requested poster display label."
foreach ($label in $cardBackLabels) {
  Assert-Contains $html ">$label</span>" "cultural card backs should use the requested single-character labels."
}
Assert-Contains $html 'data-card-index="4"' "cultural page should include the newly added fifth cultural image."
Assert-Contains $html './%E6%96%87%E5%88%9B/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260403195442_77_953.jpg' "cultural page should use the newly added image."
Assert-Contains $html 'class="cultural-slide is-active"' "cultural page should include the first active carousel slide."
Assert-Contains $html 'cultural-slide' "cultural page should include cultural carousel slides."
Assert-Contains $html "start-nav__dot" "start page entries should use hotspot-style dot markers."
Assert-Contains $css ".start-page" "style.css should include start page styling."
Assert-Contains $css "place-items: start center" "start page content should be centered and biased upward."
Assert-Contains $css "text-align: center" "start page title block should be centered."
Assert-Contains $css "padding: clamp(16vh, 20vh, 22vh) 0 0" "start page title block should sit slightly lower than the previous top-biased layout."
Assert-Contains $css "margin: 20px auto 58px" "start page buttons should have more spacing below the title copy."
Assert-Contains $css "white-space: nowrap" "start page title should stay on one line."
Assert-Contains $css "font-size: min(6.2vw, 6rem)" "start page title should scale to fit one line."
Assert-Contains $css ".start-hand-cursor" "style.css should render the gesture-controlled cursor."
Assert-Contains $css ".start-hand-cursor__halo" "style.css should style the liquid cursor halo."
Assert-Contains $css ".start-hand-cursor__core" "style.css should style the liquid cursor core."
Assert-Contains $css ".back-to-start" "style.css should style the return-to-start button."
Assert-Contains $css ".feature-page" "style.css should include the shared standalone feature page styling."
Assert-Contains $css ".hologram-video" "style.css should style the hologram video as the main visual."
Assert-Contains $css ".feature-page--hologram .feature-shell" "hologram page should use its own Apple-like vertical layout."
Assert-Contains $css "grid-template-rows: auto 1fr" "hologram page should place text above the video stage."
Assert-Contains $css ".feature-page--hologram .feature-copy h2" "hologram title should have dedicated one-line styling."
Assert-Contains $css "white-space: nowrap" "hologram title and labels should stay on one line."
Assert-Contains $css ".feature-page--hologram .hologram-stage" "hologram video stage should be enlarged separately."
Assert-Contains $css "min-height: min(76vh, 820px)" "hologram video window should be larger in the Apple-style layout."
Assert-Contains $css "object-fit: contain" "hologram video should fit fully without clipping top or bottom."
Assert-Contains $css "object-position: center top" "hologram video should sit higher inside the stage."
Assert-Contains $css "inset: -7% 0 7%" "hologram video should be nudged upward to show the bottom content."
Assert-Contains $css ".cultural-card" "style.css should style draw-card items."
Assert-Contains $css ".cultural-card.is-drawn" "style.css should style the selected drawn card."
Assert-Contains $css ".cultural-pointer" "style.css should style the cultural gesture pointer."
Assert-Contains $css ".feature-page--cultural .feature-shell" "cultural page should override the framed feature layout."
Assert-Contains $css ".feature-page--cultural .feature-copy" "cultural page should remove the boxed copy panel."
Assert-Contains $css "grid-template-rows: auto 1fr" "cultural page should put compact text above a full-screen stage."
Assert-Contains $css "min-height: 100svh" "cultural page should fill the viewport with modern viewport sizing."
Assert-Contains $css "linear-gradient(180deg, #f5f7f6" "cultural page should use an Apple-like bright premium background."
Assert-Contains $css "#277fbd" "cultural cards should use the requested blue color direction."
Assert-Contains $css "border-radius: 28px" "cultural cards should have a larger rounded blue poster-card shape."
Assert-Contains $css "white-space: nowrap" "cultural card poster label should stay on one line."
Assert-Contains $css "height: min(78vh, calc(100svh - 184px))" "cultural card stage should reserve enough vertical room for full cards."
Assert-NotContains $css "translateX(10vw) scale(1.26)" "drawn cultural card should not fly out of the visible card row."
Assert-Contains $css "animation: drawCardReveal 520ms var(--ease-out)" "draw-card motion should be softened and avoid large spring wobble."
Assert-Contains $css ".cultural-rotor" "style.css should style the card rotor."
Assert-Contains $css "rotateY(var(--card-tilt" "cards should tilt like a rotating knob/cover-flow control."
Assert-Contains $css ".cultural-card-row" "style.css should style the sliding card row."
Assert-Contains $css "overflow-x: auto" "cultural card row should slide horizontally like the reference video."
Assert-Contains $css ".cultural-poster-stage" "style.css should style the enlarged poster reveal stage."
Assert-Contains $css ".cultural-poster-stage.is-visible" "drawn poster should become visibly enlarged."
Assert-Contains $css ".cultural-poster-close" "style.css should style the poster collapse affordance."
Assert-Contains $css "max-height: min(74vh, 760px)" "enlarged poster should fit within the viewport."
Assert-Contains $css "position: fixed;" "enlarged poster should be fixed to the viewport instead of clipped by the stage."
Assert-Contains $css "top: max(92px, 9vh)" "enlarged poster should reserve a safe top area."
Assert-Contains $css "height: min(72vh, calc(100vh - 150px))" "enlarged poster should fit below the top controls."
Assert-Contains $css ".cultural-slide.is-active" "style.css should animate the active cultural carousel slide."
Assert-Contains $css "@keyframes drawCardReveal" "style.css should include draw-card reveal motion."
Assert-Contains $css "@keyframes posterReveal" "style.css should include enlarged poster reveal motion."
Assert-Contains $css "@keyframes culturalSlideIn" "style.css should include eased cultural carousel motion."
Assert-Contains $css ".start-nav__link.is-gesture-hover" "style.css should show which entry the gesture cursor is hovering."
Assert-Contains $css ".start-nav__link" "style.css should include liquid navigation link styling."
Assert-Contains $css ".start-nav__dot" "style.css should style hotspot-style dot markers."
Assert-Contains $css ".start-nav__link:hover .start-nav__dot" "hover should animate the dot like the gesture hotspot active state."
Assert-Contains $css "grid-template-columns: repeat(4, minmax(0, 1fr));" "start page entries should be arranged in one horizontal row on desktop."
Assert-Contains $css "rgba(255, 255, 255, 0.08)" "start page buttons should use darker SpaceX-style translucent surfaces."
Assert-Contains $css "color: #ffffff;" "start page buttons should use high-contrast white SpaceX-style text."
Assert-Contains $css "@keyframes liquidBounce" "style.css should include Q寮?liquid glass motion."
Assert-NotContains $css ".start-nav__link:hover::before" "hover should not use a sweeping overlay that can make cards look like they disappear."
Assert-Contains $css ".start-nav__link:hover .start-nav__surface" "hover should animate an inner liquid surface instead of hiding text."
Assert-Contains $css "@keyframes softJellyPulse" "hover should use a soft Q寮?pulse."
Assert-Contains $css "opacity: 1;" "hover and Q弹 animations should keep start page entries visible."
Assert-Contains $js "function initStartPage" "script.js should initialize start page interactions."
Assert-Contains $js "function returnToStartPage" "script.js should return from the experience to the start page."
Assert-Contains $js "function openFeaturePage" "script.js should open local standalone feature pages."
Assert-Contains $js "function startCulturalCarousel" "script.js should run the cultural image carousel."
Assert-Contains $js "function stopCulturalCarousel" "script.js should stop the cultural image carousel when leaving."
Assert-Contains $js "function initCulturalDrawScanner" "script.js should initialize cultural draw-card gesture scanning."
Assert-Contains $js "function updateCulturalPointer" "script.js should move the cultural gesture pointer."
Assert-Contains $js "function drawCulturalCard" "script.js should reveal the selected cultural card."
Assert-Contains $js "function collapseCulturalCard" "script.js should collapse the drawn cultural card."
Assert-Contains $js "culturalPosterImage" "script.js should update the enlarged cultural poster."
Assert-Contains $js "culturalPosterStage?.addEventListener" "poster stage should collapse when clicked."
Assert-Contains $js 'closest?.(".cultural-poster-close")' "cultural gesture pointer should target the poster close control."
Assert-Contains $js 'closest?.(".cultural-poster-stage.is-visible")' "cultural gesture pointer should target the visible poster stage."
Assert-Contains $js 'closest?.(''[data-start-action="return"]'')' "cultural gesture pointer should be able to target the return button."
Assert-Contains $js "triggerCulturalPointerClick" "cultural gesture pointer should simulate clicks on non-card controls."
Assert-Contains $js "function updateCulturalRotor" "script.js should update card tilt for the rotor-style slider."
Assert-Contains $js "const tilt = normalized * -18" "cultural rotor tilt should be restrained to reduce shaking."
Assert-Contains $js "const lift = -12 * (1 - distance)" "cultural rotor lift should be restrained to reduce shaking."
Assert-Contains $js "function stopCulturalDrawScanner" "script.js should stop cultural draw-card gesture scanning."
Assert-Contains $js "function initStartPointerScanner" "script.js should initialize the start page gesture pointer scanner."
Assert-Contains $js "function updateStartPointer" "script.js should move the gesture cursor in realtime."
Assert-Contains $js "function triggerStartPointerClick" "script.js should simulate a click with the gesture cursor."
Assert-Contains $js "document.elementFromPoint" "gesture clicking should target the element under the cursor."
Assert-NotContains $js "function recognizeStartGlyph" "script.js should not use handwritten glyph recognition."
Assert-NotContains $js "startTraceCanvas" "script.js should not keep drawing trace canvas logic."
Assert-Contains $js "https://www.720yun.com/vr/e03jertOev3" "script.js should keep the panorama URL."
Assert-NotContains $js "https://3d.hunyuan.tencent.com/assets" "script.js should no longer keep the holographic external URL."
Assert-NotContains $js "https://baidu.com" "script.js should no longer keep the cultural external URL."
Assert-Contains $js "stopStartBackgroundAudio()" "external routes should stop the start page background music."
Assert-Contains $js "startVideo.play()" "script.js should try to autoplay the video with sound."
Assert-Contains $js 'document.body.classList.add("has-entered-experience")' "gesture entry should reveal the current experience."
Assert-Contains $js 'document.body.classList.remove("has-entered-experience")' "return action should reveal the start page again."
Assert-Contains $js 'querySelector(''[data-start-action="return"]'')' "return button should be registered by script.js."
Assert-NotContains $js "startVideo?.pause()" "background music should continue after entering the experience."

"Start page checks passed."
