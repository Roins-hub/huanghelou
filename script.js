import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

const sceneContainer = document.getElementById("sceneContainer");
const gestureLayer = document.getElementById("gestureLayer");
const hotspotLayer = document.getElementById("hotspotLayer");
const sceneSection = document.getElementById("sceneSection");
const startPage = document.getElementById("startPage");
const startVideo = document.getElementById("startVideo");
const hologramPage = document.getElementById("hologramPage");
const culturalSlides = Array.from(document.querySelectorAll(".cultural-slide"));
const culturalScanVideo = document.getElementById("culturalScanVideo");
const culturalPointer = document.getElementById("culturalPointer");
const culturalDrawStatus = document.getElementById("culturalDrawStatus");
const culturalCards = Array.from(document.querySelectorAll(".cultural-card"));
const culturalCardRow = document.querySelector(".cultural-card-row");
const culturalPosterStage = document.querySelector(".cultural-poster-stage");
const culturalPosterImage = document.getElementById("culturalPosterImage");
const statusBar = document.getElementById("statusBar");
const statusText = document.getElementById("statusText");
const loadingOverlay = document.getElementById("loadingOverlay");
const fallbackCard = document.getElementById("fallbackCard");
const fallbackText = document.getElementById("fallbackText");
const retryButton = document.getElementById("retryButton");
const popupHost = document.getElementById("popupHost");
const inputVideo = document.getElementById("inputVideo");
const videoOverlay = document.getElementById("videoOverlay");
const cameraHint = document.getElementById("cameraHint");
const trackingBadge = document.getElementById("trackingBadge");
const fontScaleRange = document.getElementById("fontScaleRange");
const fontScaleValue = document.getElementById("fontScaleValue");
const fontScaleDown = document.getElementById("fontScaleDown");
const fontScaleUp = document.getElementById("fontScaleUp");
const cameraSizeRange = document.getElementById("cameraSizeRange");
const cameraSizeValue = document.getElementById("cameraSizeValue");
const cameraSizeDown = document.getElementById("cameraSizeDown");
const cameraSizeUp = document.getElementById("cameraSizeUp");

const floorContent = {
  1: {
    title: "第一层 · 楼阁初识",
    body:
      "黄鹤楼的起源、形制与千年沿革在这一层被集中呈现。"
  },
  2: {
    title: "第二层 · 建筑史话",
    body:
      "碑刻、楼记与史料在这里梳理黄鹤楼屡毁屡建的建筑脉络。"
  },
  3: {
    title: "第三层 · 诗赋留痕",
    body:
      "这一层聚焦诗词题咏与文人墨迹，是黄鹤楼最具文学气息的空间。"
  },
  4: {
    title: "第四层 · 江汉胜景",
    body:
      "这一层对应登楼远眺的江汉景观，也映照黄鹤楼与山水城市的关系。"
  },
  5: {
    title: "第五层 · 城市象征",
    body:
      "最高层强调黄鹤楼作为武汉地标与文化象征的当代意义。"
  }
};

const floorHotspots = [
  { floor: 1, label: "一层", yRatio: 0.14 },
  { floor: 2, label: "二层", yRatio: 0.32 },
  { floor: 3, label: "三层", yRatio: 0.5 },
  { floor: 4, label: "四层", yRatio: 0.68 },
  { floor: 5, label: "五层", yRatio: 0.86 }
];

const appState = {
  modelLoaded: false,
  modelLoading: false,
  modelError: false,
  cameraReady: false,
  cameraDenied: false,
  handsReady: false,
  sceneReady: false
};

const gestureState = {
  baseModelScale: 1,
  currentScale: 1,
  targetScale: 1,
  currentVelX: 0,
  currentVelY: 0,
  targetVelX: 0,
  targetVelY: 0,
  baseTwoHandDistance: null,
  prevDualCenter: null,
  prevDualAngle: null,
  gestureEnabled: false,
  lastSeenAt: 0,
  activeMode: "idle"
};

const popupState = {
  stableCount: null,
  stableSince: 0,
  cooldownUntil: 0,
  lastTriggeredCount: null,
  activePopup: null,
  activeTimeout: null
};

const hotspotState = {
  anchors: new Map(),
  elements: new Map(),
  activeFloor: null,
  switchingUntil: 0,
  switchTimer: null,
  targetRotationX: 0.08,
  targetRotationY: 0.2
};

let scene;
let camera;
let renderer;
let controls;
let modelRoot;
let modelPivot;
let resizeObserver;
let hands;
let mediaCamera;
let gestureHandsStarted = false;
let gestureScanInFlight = false;
let culturalCarouselTimer = null;
let culturalSlideIndex = 0;
let culturalHands;
let culturalScanStream;
let culturalScanFrame = null;
let culturalScanInFlight = false;
let culturalScannerStarting = false;
let culturalScannerSession = 0;

const videoCtx = videoOverlay.getContext("2d");
const gestureCtx = gestureLayer.getContext("2d");
const FONT_SCALE_KEY = "huanghelou-font-scale";
const CAMERA_SIZE_KEY = "huanghelou-camera-size";
const HAND_MODEL_COMPLEXITY = 1;
const HAND_DETECTION_CONFIDENCE = 0.45;
const HAND_TRACKING_CONFIDENCE = 0.34;
const POINTER_MODEL_COMPLEXITY = 1;
const POINTER_DETECTION_CONFIDENCE = 0.42;
const POINTER_TRACKING_CONFIDENCE = 0.3;
const POINTER_PINCH_START_DISTANCE = 0.055;
const POINTER_PINCH_END_DISTANCE = 0.075;
const POINTER_MISS_GRACE_MS = 650;
const POINTER_CLICK_COOLDOWN_MS = 520;
const VIEW_QUERY_PARAM = "view";
const ROUTED_VIEWS = new Set(["gesture", "hologram", "cultural"]);

const culturalDrawState = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  hoveredCard: null,
  hoverStartedAt: 0,
  isPinching: false,
  cooldownUntil: 0,
  lastSeenAt: 0,
  handVisible: false
};

const PANORAMA_URL = "https://www.720yun.com/vr/e03jertOev3";

function setStatus(message, tone = "default") {
  statusText.textContent = message;
  statusBar.classList.remove("is-warning", "is-error", "is-success");

  if (tone === "warning") {
    statusBar.classList.add("is-warning");
  } else if (tone === "error") {
    statusBar.classList.add("is-error");
  } else if (tone === "success") {
    statusBar.classList.add("is-success");
  }
}

function setTrackingState(label, tone = "muted") {
  trackingBadge.textContent = label;
  trackingBadge.classList.remove("is-active", "is-muted", "is-error");

  if (tone === "active") {
    trackingBadge.classList.add("is-active");
  } else if (tone === "error") {
    trackingBadge.classList.add("is-error");
  } else {
    trackingBadge.classList.add("is-muted");
  }
}

function stopStartBackgroundAudio() {
  if (startVideo) {
    startVideo.pause();
  }
}

function playStartBackgroundAudio() {
  if (!startVideo) {
    return;
  }

  startVideo.muted = true;
  startVideo.defaultMuted = true;
  startVideo.volume = 0;
  startVideo.play().catch((error) => {
    console.warn("开始页背景视频自动播放被浏览器拦截。", error);
  });
}

function stopMediaStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}

function isCulturalScannerSessionActive(sessionId) {
  return (
    sessionId === culturalScannerSession &&
    document.body.classList.contains("has-open-feature") &&
    document.body.classList.contains("feature-cultural")
  );
}

function enterGestureExperience() {
  stopCulturalCarousel();
  stopCulturalDrawScanner();
  document.body.classList.remove("has-open-feature", "feature-hologram", "feature-cultural");
  document.body.classList.add("has-entered-experience");
  startGestureHands();
}

function setRouteView(viewName, mode = "push") {
  const url = new URL(window.location.href);

  if (viewName && ROUTED_VIEWS.has(viewName)) {
    url.searchParams.set(VIEW_QUERY_PARAM, viewName);
  } else {
    url.searchParams.delete(VIEW_QUERY_PARAM);
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;

  if (nextUrl === `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    return;
  }

  if (mode === "replace") {
    window.history.replaceState({ view: viewName || "start" }, "", nextUrl);
  } else {
    window.history.pushState({ view: viewName || "start" }, "", nextUrl);
  }
}

function getRouteView() {
  const viewName = new URLSearchParams(window.location.search).get(VIEW_QUERY_PARAM);
  return ROUTED_VIEWS.has(viewName) ? viewName : "";
}

function openGestureRoute(mode = "push") {
  setRouteView("gesture", mode);
  enterGestureExperience();
}

function setCulturalSlide(index) {
  if (!culturalSlides.length || !culturalCards.length) {
    return;
  }

  culturalSlideIndex = (index + culturalCards.length) % culturalCards.length;
  const activeCard = culturalCards[culturalSlideIndex];
  const activeImage = activeCard?.querySelector("img");

  culturalSlides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === culturalSlideIndex);
    const slideImage = slide.querySelector("img");
    if (slideImage && activeImage) {
      slideImage.src = activeImage.src;
      slideImage.alt = activeImage.alt;
    }
  });
}

function startCulturalCarousel() {
  if (!culturalSlides.length) {
    return;
  }

  stopCulturalCarousel();
  setCulturalSlide(0);
  culturalCarouselTimer = window.setInterval(() => {
    setCulturalSlide(culturalSlideIndex + 1);
  }, 4800);
}

function stopCulturalCarousel() {
  if (culturalCarouselTimer) {
    window.clearInterval(culturalCarouselTimer);
    culturalCarouselTimer = null;
  }
}

function updateCulturalRotor() {
  if (!culturalCardRow || !culturalCards.length) {
    return;
  }

  const rowRect = culturalCardRow.getBoundingClientRect();
  const rowCenter = rowRect.left + rowRect.width / 2;
  const maxDistance = Math.max(rowRect.width * 0.5, 1);

  culturalCards.forEach((card) => {
    const cardRect = card.getBoundingClientRect();
    const cardCenter = cardRect.left + cardRect.width / 2;
    const normalized = clamp((cardCenter - rowCenter) / maxDistance, -1, 1);
    const distance = Math.abs(normalized);
    const tilt = normalized * -18;
    const lift = -12 * (1 - distance);
    const scale = 0.92 + (1 - distance) * 0.1;
    const fade = 0.62 + (1 - distance) * 0.38;

    card.style.setProperty("--card-tilt", `${tilt}deg`);
    card.style.setProperty("--card-lift", `${lift}px`);
    card.style.setProperty("--card-scale", String(scale));
    card.style.setProperty("--card-fade", String(fade));
  });
}

function setCulturalDrawStatus(message) {
  if (culturalDrawStatus) {
    culturalDrawStatus.textContent = message;
  }
}

function clearCulturalCardHover() {
  if (culturalDrawState.hoveredCard) {
    culturalDrawState.hoveredCard.classList.remove("is-gesture-hover");
    culturalDrawState.hoveredCard = null;
  }
}

function getCulturalPointerTarget() {
  const element = document.elementFromPoint(culturalDrawState.x, culturalDrawState.y);
  return (
    element?.closest?.(".cultural-poster-close") ||
    element?.closest?.(".cultural-poster-stage.is-visible") ||
    element?.closest?.(".cultural-card") ||
    element?.closest?.('[data-start-action="return"]') ||
    null
  );
}

function setCulturalCardHover(card) {
  if (culturalDrawState.hoveredCard === card) {
    return;
  }

  clearCulturalCardHover();
  culturalDrawState.hoverStartedAt = performance.now();

  if (card) {
    card.classList.add("is-gesture-hover");
    culturalDrawState.hoveredCard = card;
    if (card.matches(".cultural-card")) {
      setCulturalDrawStatus("已锁定卡牌，捏合即可抽取。");
    } else if (card.matches(".cultural-poster-close, .cultural-poster-stage")) {
      setCulturalDrawStatus("已锁定海报，捏合即可收回。");
    } else {
      setCulturalDrawStatus("已锁定返回，捏合回到开始页。");
    }
  } else {
    setCulturalDrawStatus("手掌移到卡牌上，捏合抽取。");
  }
}

function triggerCulturalPointerClick(target) {
  if (!target) {
    return;
  }

  culturalDrawState.cooldownUntil = performance.now() + POINTER_CLICK_COOLDOWN_MS;

  if (target.matches(".cultural-card")) {
    drawCulturalCard(target);
    return;
  }

  if (target.matches(".cultural-poster-close, .cultural-poster-stage")) {
    collapseCulturalCard();
    return;
  }

  target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }));
  target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" }));
  target.click();
}

function isCulturalPinching(indexTip, thumbTip) {
  const threshold = culturalDrawState.isPinching
    ? POINTER_PINCH_END_DISTANCE
    : POINTER_PINCH_START_DISTANCE;

  return distance2D(indexTip, thumbTip) < threshold;
}

function drawCulturalCard(card) {
  if (!card) {
    return;
  }

  if (card.classList.contains("is-drawn") && culturalPosterStage?.classList.contains("is-visible")) {
    collapseCulturalCard();
    return;
  }

  const image = card.querySelector("img");
  const activeSlide = culturalSlides[0];
  const activeImage = activeSlide?.querySelector("img");

  culturalCards.forEach((item) => item.classList.remove("is-drawn"));
  card.classList.add("is-drawn");

  if (activeSlide && activeImage && image) {
    activeImage.src = image.src;
    activeImage.alt = image.alt;
    activeSlide.classList.remove("is-active");
    window.requestAnimationFrame(() => {
      activeSlide.classList.add("is-active");
    });
  }

  if (culturalPosterStage && culturalPosterImage && image) {
    culturalPosterImage.src = image.src;
    culturalPosterImage.alt = image.alt;
    culturalPosterStage.classList.remove("is-visible");
    window.requestAnimationFrame(() => {
      culturalPosterStage.classList.add("is-visible");
    });
  }

  culturalSlideIndex = Number(card.dataset.cardIndex || 0);
  culturalDrawState.cooldownUntil = performance.now() + 1200;
  setCulturalDrawStatus(`已抽中第 ${culturalSlideIndex + 1} 张文创卡。`);
  card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  window.requestAnimationFrame(updateCulturalRotor);
}

function collapseCulturalCard() {
  culturalCards.forEach((item) => item.classList.remove("is-drawn"));
  culturalPosterStage?.classList.remove("is-visible");
  culturalDrawState.cooldownUntil = performance.now() + 420;
  setCulturalDrawStatus("已收回海报，继续滑动或抽取卡牌。");
  window.requestAnimationFrame(updateCulturalRotor);
}

function updateCulturalPointer(indexTip, thumbTip) {
  const now = performance.now();
  const targetX = clamp(indexTip.x * window.innerWidth, 0, window.innerWidth);
  const targetY = clamp(indexTip.y * window.innerHeight, 0, window.innerHeight);
  culturalDrawState.x = lerp(culturalDrawState.x, targetX, 0.5);
  culturalDrawState.y = lerp(culturalDrawState.y, targetY, 0.5);
  culturalDrawState.lastSeenAt = now;

  if (!culturalDrawState.handVisible) {
    culturalDrawState.handVisible = true;
    setCulturalDrawStatus("已识别手势，移动到卡牌上即可抽取。");
  }

  if (culturalPointer) {
    culturalPointer.style.left = `${culturalDrawState.x}px`;
    culturalPointer.style.top = `${culturalDrawState.y}px`;
    culturalPointer.classList.add("is-visible");
  }

  const targetCard = getCulturalPointerTarget();
  setCulturalCardHover(targetCard);

  const isPinching = isCulturalPinching(indexTip, thumbTip);
  culturalPointer?.classList.toggle("is-clicking", isPinching);

  if (
    targetCard &&
    now > culturalDrawState.cooldownUntil &&
    isPinching &&
    !culturalDrawState.isPinching
  ) {
    triggerCulturalPointerClick(targetCard);
  }

  culturalDrawState.isPinching = isPinching;
}

function handleCulturalDrawResults(results) {
  const landmarks = results.multiHandLandmarks?.[0];

  if (!landmarks) {
    const now = performance.now();
    if (now - culturalDrawState.lastSeenAt > POINTER_MISS_GRACE_MS) {
      culturalPointer?.classList.remove("is-visible", "is-clicking");
      clearCulturalCardHover();
      if (culturalDrawState.handVisible) {
        culturalDrawState.handVisible = false;
        setCulturalDrawStatus("未检测到手掌，请把手完整放入摄像头画面。");
      }
    }
    culturalDrawState.isPinching = false;
    return;
  }

  updateCulturalPointer(landmarks[8], landmarks[4]);
}

async function initCulturalDrawScanner() {
  if (!culturalScanVideo || !culturalPointer || culturalHands || culturalScannerStarting) {
    return;
  }

  if (!window.Hands) {
    setCulturalDrawStatus("MediaPipe 未加载，海报可先用鼠标点击抽取。");
    return;
  }

  culturalScannerStarting = true;
  const sessionId = ++culturalScannerSession;

  try {
    culturalScanStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 640,
        height: 480,
        facingMode: "user"
      },
      audio: false
    });

    if (!isCulturalScannerSessionActive(sessionId)) {
      stopMediaStream(culturalScanStream);
      culturalScanStream = null;
      return;
    }

    culturalScanVideo.srcObject = culturalScanStream;
    await culturalScanVideo.play();

    if (!isCulturalScannerSessionActive(sessionId)) {
      stopMediaStream(culturalScanStream);
      culturalScanStream = null;
      culturalScanVideo.srcObject = null;
      return;
    }

    culturalHands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    culturalHands.setOptions({
      maxNumHands: 1,
      selfieMode: true,
      modelComplexity: POINTER_MODEL_COMPLEXITY,
      minDetectionConfidence: POINTER_DETECTION_CONFIDENCE,
      minTrackingConfidence: POINTER_TRACKING_CONFIDENCE
    });
    culturalHands.onResults(handleCulturalDrawResults);

    const scanFrame = async () => {
      if (!isCulturalScannerSessionActive(sessionId) || !culturalHands) {
        return;
      }

      if (culturalScanVideo.readyState < 2) {
        culturalScanFrame = requestAnimationFrame(scanFrame);
        return;
      }

      if (!culturalScanInFlight) {
        culturalScanInFlight = true;
        try {
          await culturalHands.send({ image: culturalScanVideo });
        } catch (error) {
          console.warn("文创抽卡手势帧处理失败。", error);
        } finally {
          culturalScanInFlight = false;
        }
      }

      if (isCulturalScannerSessionActive(sessionId) && culturalHands) {
        culturalScanFrame = requestAnimationFrame(scanFrame);
      }
    };

    setCulturalDrawStatus("摄像头已开启，手掌移到卡牌上抽取。");
    scanFrame();
  } catch (error) {
    console.warn("文创抽卡摄像头不可用。", error);
    stopMediaStream(culturalScanStream);
    culturalScanStream = null;
    if (culturalScanVideo) {
      culturalScanVideo.srcObject = null;
    }
    setCulturalDrawStatus("摄像头不可用，可直接点击卡牌抽取。");
  } finally {
    culturalScannerStarting = false;
  }
}

function stopCulturalDrawScanner() {
  if (culturalScanFrame) {
    cancelAnimationFrame(culturalScanFrame);
    culturalScanFrame = null;
  }

  culturalScannerSession += 1;

  if (culturalScanStream) {
    stopMediaStream(culturalScanStream);
    culturalScanStream = null;
  }

  if (culturalScanVideo) {
    culturalScanVideo.srcObject = null;
  }

  if (culturalHands?.close) {
    culturalHands.close();
  }

  culturalHands = null;
  culturalScanInFlight = false;
  culturalScannerStarting = false;
  culturalPointer?.classList.remove("is-visible", "is-clicking");
  culturalDrawState.isPinching = false;
  culturalDrawState.lastSeenAt = 0;
  culturalDrawState.handVisible = false;
  clearCulturalCardHover();
}

function openFeaturePage(pageName, mode = "push") {
  setRouteView(pageName, mode);
  stopGestureHands();
  stopCulturalCarousel();
  stopCulturalDrawScanner();
  document.body.classList.remove("has-entered-experience", "feature-hologram", "feature-cultural");
  document.body.classList.add("has-open-feature", `feature-${pageName}`);

  if (pageName === "cultural") {
    startCulturalCarousel();
    initCulturalDrawScanner();
    window.requestAnimationFrame(updateCulturalRotor);
  }

  if (pageName === "hologram") {
    hologramPage?.querySelector("video")?.play().catch((error) => {
      console.warn("全息系统视频自动播放被浏览器拦截。", error);
    });
  }
}

function returnToStartPage() {
  setRouteView("", "push");
  document.body.classList.remove("has-entered-experience");
  document.body.classList.remove("has-open-feature", "feature-hologram", "feature-cultural");
  stopGestureHands();
  stopCulturalCarousel();
  collapseCulturalCard();
  stopCulturalDrawScanner();
  playStartBackgroundAudio();
}

function restoreRoutedView(mode = "replace") {
  const viewName = getRouteView();

  if (viewName === "gesture") {
    openGestureRoute(mode);
    return;
  }

  if (viewName) {
    openFeaturePage(viewName, mode);
    return;
  }

  returnToStartPage();
}

function initStartPage() {
  playStartBackgroundAudio();

  startPage?.querySelectorAll(".start-nav__link.is-pending").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
    });
  });

  startPage?.querySelector('[data-start-action="gesture"]')?.addEventListener("click", () => {
    openGestureRoute();
  });

  startPage?.querySelector('[data-start-action="hologram"]')?.addEventListener("click", () => {
    openFeaturePage("hologram");
  });

  startPage?.querySelector('[data-start-action="cultural"]')?.addEventListener("click", () => {
    openFeaturePage("cultural");
  });

  startPage?.querySelector('[data-start-action="assistant"]')?.addEventListener("click", () => {
    stopStartBackgroundAudio();
    window.location.href = "assistant/";
  });

  document.querySelector('[data-start-action="return"]')?.addEventListener("click", () => {
    returnToStartPage();
  });

  window.addEventListener("popstate", () => {
    restoreRoutedView("replace");
  });

  startPage?.querySelectorAll('a.start-nav__link[href^="http"]').forEach((link) => {
    link.addEventListener("click", () => {
      stopStartBackgroundAudio();
    });
  });

  culturalCards.forEach((card) => {
    card.addEventListener("click", () => {
      drawCulturalCard(card);
    });
  });

  culturalPosterStage?.addEventListener("click", (event) => {
    if (event.target === culturalPosterImage || event.target.closest?.(".cultural-poster-close")) {
      collapseCulturalCard();
    }
  });

  culturalCardRow?.addEventListener("scroll", () => {
    window.requestAnimationFrame(updateCulturalRotor);
  });
  window.addEventListener("resize", updateCulturalRotor);
  updateCulturalRotor();
}

function updateLoadingVisibility() {
  const shouldHide =
    appState.sceneReady &&
    (appState.modelLoaded || appState.modelError) &&
    (appState.cameraReady || appState.cameraDenied || appState.handsReady);

  loadingOverlay.classList.toggle("is-hidden", shouldHide);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(current, target, alpha) {
  return current + (target - current) * alpha;
}

function applyFontScale(percent) {
  const clampedPercent = clamp(percent, 85, 135);
  const scale = clampedPercent / 100;
  document.documentElement.style.setProperty("--font-scale", String(scale));
  document.documentElement.style.fontSize = `${clampedPercent}%`;

  if (fontScaleRange) {
    fontScaleRange.value = String(clampedPercent);
  }

  if (fontScaleValue) {
    fontScaleValue.textContent = `${clampedPercent}%`;
  }

  window.localStorage.setItem(FONT_SCALE_KEY, String(clampedPercent));
}

function initFontScaleControls() {
  const stored = Number(window.localStorage.getItem(FONT_SCALE_KEY));
  const initialValue = Number.isFinite(stored) && stored >= 85 && stored <= 135 ? stored : 100;
  applyFontScale(initialValue);

  fontScaleRange?.addEventListener("input", (event) => {
    applyFontScale(Number(event.target.value));
  });

  fontScaleDown?.addEventListener("click", () => {
    applyFontScale(Number(fontScaleRange.value || 100) - 5);
  });

  fontScaleUp?.addEventListener("click", () => {
    applyFontScale(Number(fontScaleRange.value || 100) + 5);
  });
}

function applyCameraFrameSize(sizePx) {
  const clampedSize = clamp(sizePx, 320, 620);
  document.documentElement.style.setProperty("--camera-panel-size", `${clampedSize}px`);

  if (cameraSizeRange) {
    cameraSizeRange.value = String(clampedSize);
  }

  if (cameraSizeValue) {
    cameraSizeValue.textContent = `${clampedSize}px`;
  }

  window.localStorage.setItem(CAMERA_SIZE_KEY, String(clampedSize));
}

function initCameraSizeControls() {
  const stored = Number(window.localStorage.getItem(CAMERA_SIZE_KEY));
  const initialValue = Number.isFinite(stored) && stored >= 320 && stored <= 620 ? stored : 420;
  applyCameraFrameSize(initialValue);

  cameraSizeRange?.addEventListener("input", (event) => {
    applyCameraFrameSize(Number(event.target.value));
  });

  cameraSizeDown?.addEventListener("click", () => {
    applyCameraFrameSize(Number(cameraSizeRange.value || 420) - 20);
  });

  cameraSizeUp?.addEventListener("click", () => {
    applyCameraFrameSize(Number(cameraSizeRange.value || 420) + 20);
  });
}

function showFallback(message) {
  appState.modelError = true;
  fallbackText.textContent = message;
  fallbackCard.classList.remove("hidden");
  setStatus("模型加载失败，请检查资源路径或静态服务器。", "error");
  updateLoadingVisibility();
}

function hideFallback() {
  fallbackCard.classList.add("hidden");
}

function createScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0d111d, 10, 28);

  camera = new THREE.PerspectiveCamera(
    45,
    sceneContainer.clientWidth / sceneContainer.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.8, 5.2);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  sceneContainer.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const directionalLight = new THREE.DirectionalLight(0xfff4d9, 1.0);
  directionalLight.position.set(3.5, 5, 4.5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const fillLight = new THREE.DirectionalLight(0x8bb4ff, 0.45);
  fillLight.position.set(-4.5, 2.5, -2);
  scene.add(fillLight);

  scene.add(new THREE.HemisphereLight(0xc8d7ff, 0x12131d, 0.42));

  modelPivot = new THREE.Group();
  scene.add(modelPivot);

  const groundDisc = new THREE.Mesh(
    new THREE.CircleGeometry(4.6, 64),
    new THREE.MeshBasicMaterial({
      color: 0x6f5f42,
      transparent: true,
      opacity: 0.08
    })
  );
  groundDisc.rotation.x = -Math.PI / 2;
  groundDisc.position.y = -1.25;
  scene.add(groundDisc);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.minDistance = 2.6;
  controls.maxDistance = 8.6;
  controls.target.set(0, 0.8, 0);
  controls.update();

  appState.sceneReady = true;
  updateLoadingVisibility();
}

function applyMaterialTuning(root) {
  root.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material) {
        return;
      }
      if (material.map) {
        material.map.colorSpace = THREE.SRGBColorSpace;
      }
      material.needsUpdate = true;
    });
  });
}

function frameModel(root) {
  const initialBox = new THREE.Box3().setFromObject(root);
  const initialSize = initialBox.getSize(new THREE.Vector3());
  const initialCenter = initialBox.getCenter(new THREE.Vector3());
  const maxDim = Math.max(initialSize.x, initialSize.y, initialSize.z) || 1;

  root.position.sub(initialCenter);

  const uniformScale = 2.4 / maxDim;
  root.scale.setScalar(uniformScale);
  gestureState.baseModelScale = uniformScale;

  const framedBox = new THREE.Box3().setFromObject(root);
  const framedSize = framedBox.getSize(new THREE.Vector3());
  const framedCenter = framedBox.getCenter(new THREE.Vector3());

  root.position.sub(framedCenter);
  root.position.y -= framedSize.y * 0.24;
  root.position.x -= framedSize.x * 0.16;
  root.position.y += framedSize.y * 0.08;

  controls.target.set(-framedSize.x * 0.1, framedSize.y * 0.28, 0);
  camera.position.set(framedSize.x * 0.92, framedSize.y * 1.04, framedSize.z * 2.6 + 2.4);
  controls.update();

  gestureState.currentScale = 1;
  gestureState.targetScale = 1;
}

function loadModel() {
  appState.modelLoading = true;
  appState.modelLoaded = false;
  appState.modelError = false;
  hideFallback();
  setStatus("正在载入黄鹤楼模型与材质...", "default");

  if (modelRoot) {
    modelPivot.remove(modelRoot);
    modelRoot = null;
  }

  const manager = new THREE.LoadingManager();
  const mtlLoader = new MTLLoader(manager);
  mtlLoader.setPath("./lou/");
  mtlLoader.setResourcePath("./lou/");

  mtlLoader.load(
    "material.mtl",
    (materials) => {
      materials.preload();

      const objLoader = new OBJLoader(manager);
      objLoader.setMaterials(materials);
      objLoader.setPath("./lou/");

      objLoader.load(
        "huanghelou.obj",
        (object) => {
          modelRoot = object;
          applyMaterialTuning(modelRoot);
          modelPivot.add(modelRoot);
          frameModel(modelRoot);
          calculateHotspotAnchors();
          updateHotspotPositions();

          appState.modelLoaded = true;
          appState.modelLoading = false;
          updateLoadingVisibility();
          setStatus("模型已加载，等待手势追踪完成。", "success");
        },
        undefined,
        (error) => {
          appState.modelLoading = false;
          console.error(error);
          showFallback(
            "无法读取 `lou/huanghelou.obj` 或相关材质。请通过本地静态服务器访问，并确认 `lou/` 目录存在 OBJ、MTL 与贴图文件。"
          );
        }
      );
    },
    undefined,
    (error) => {
      appState.modelLoading = false;
      console.error(error);
      showFallback(
        "无法加载 `lou/material.mtl`。如果你是直接双击打开页面，请改用本地静态服务器，例如 `python -m http.server`。"
      );
    }
  );
}

function resizeCanvases() {
  const width = sceneContainer.clientWidth;
  const height = sceneContainer.clientHeight;

  if (renderer && width && height) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  if (gestureLayer.width !== width || gestureLayer.height !== height) {
    gestureLayer.width = width;
    gestureLayer.height = height;
  }

  updateHotspotPositions();
}

function clearVideoOverlay() {
  videoCtx.clearRect(0, 0, videoOverlay.width, videoOverlay.height);
}

function syncVideoOverlaySize() {
  const width = inputVideo.videoWidth || inputVideo.clientWidth || 320;
  const height = inputVideo.videoHeight || inputVideo.clientHeight || 240;

  if (videoOverlay.width !== width || videoOverlay.height !== height) {
    videoOverlay.width = width;
    videoOverlay.height = height;
  }
}

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getPalm(landmarks) {
  return landmarks[9];
}

function getCenterPoint(points) {
  const count = points.length || 1;
  const sum = points.reduce(
    (acc, point) => {
      acc.x += point.x;
      acc.y += point.y;
      return acc;
    },
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / count,
    y: sum.y / count
  };
}

function isThumbExtended(landmarks) {
  const wrist = landmarks[0];
  const thumbMcp = landmarks[2];
  const thumbIp = landmarks[3];
  const thumbTip = landmarks[4];
  const indexMcp = landmarks[5];
  const pinkyMcp = landmarks[17];
  const palmCenter = getCenterPoint([wrist, indexMcp, pinkyMcp]);
  const palmWidth = distance2D(indexMcp, pinkyMcp);
  const thumbSpread = distance2D(thumbTip, indexMcp);
  const thumbReach = distance2D(thumbTip, palmCenter);
  const thumbSegment = distance2D(thumbTip, thumbMcp);
  const thumbBaseSegment = distance2D(thumbIp, thumbMcp);

  return (
    thumbSpread > palmWidth * 0.52 &&
    thumbReach > palmWidth * 0.7 &&
    thumbSegment > thumbBaseSegment * 1.2
  );
}

function countExtendedFingers(landmarks) {
  let count = 0;
  const fingerPairs = [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18]
  ];

  fingerPairs.forEach(([tip, pip]) => {
    if (landmarks[tip].y < landmarks[pip].y) {
      count += 1;
    }
  });

  if (isThumbExtended(landmarks)) {
    count += 1;
  }

  return clamp(count, 0, 5);
}

function isFist(landmarks) {
  const fingerCount = countExtendedFingers(landmarks);
  const wrist = landmarks[0];
  const tipIndices = [4, 8, 12, 16, 20];
  const averageTipDistance =
    tipIndices.reduce((sum, index) => sum + distance2D(wrist, landmarks[index]), 0) /
    tipIndices.length;

  return fingerCount === 0 || averageTipDistance < 0.16;
}

function isOpenHand(landmarks) {
  const fingerCount = countExtendedFingers(landmarks);
  const wrist = landmarks[0];
  const tipIndices = [4, 8, 12, 16, 20];
  const averageTipDistance =
    tipIndices.reduce((sum, index) => sum + distance2D(wrist, landmarks[index]), 0) /
    tipIndices.length;

  return fingerCount >= 4 && averageTipDistance > 0.22;
}

function drawGestureAura(points, color) {
  points.forEach((point) => {
    const x = (1 - point.x) * gestureLayer.width;
    const y = point.y * gestureLayer.height;
    const radius = 24 + Math.sin(Date.now() / 220) * 3;
    const gradient = gestureCtx.createRadialGradient(x, y, 4, x, y, radius * 2.4);

    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(240, 211, 160, 0)");

    gestureCtx.fillStyle = gradient;
    gestureCtx.beginPath();
    gestureCtx.arc(x, y, radius * 2.2, 0, Math.PI * 2);
    gestureCtx.fill();
  });
}

function clearGestureLayer() {
  gestureCtx.clearRect(0, 0, gestureLayer.width, gestureLayer.height);
}

function createHotspotButtons() {
  if (!hotspotLayer) {
    return;
  }

  hotspotLayer.innerHTML = "";
  hotspotState.elements.clear();

  floorHotspots.forEach((hotspot) => {
    const button = document.createElement("button");
    button.className = "model-hotspot";
    button.type = "button";
    button.dataset.floor = String(hotspot.floor);
    button.setAttribute("aria-label", `${floorContent[hotspot.floor].title}热点`);
    button.innerHTML = `<span class="model-hotspot__text">${hotspot.label}</span>`;
    const fallbackPosition = getFallbackHotspotPosition(hotspot);
    button.style.left = fallbackPosition.x;
    button.style.top = fallbackPosition.y;
    button.classList.add("is-visible");
    button.addEventListener("click", () => {
      activateFloor(hotspot.floor, "hotspot");
    });

    hotspotLayer.appendChild(button);
    hotspotState.elements.set(hotspot.floor, button);
  });
}

function getFallbackHotspotPosition(hotspot) {
  return {
    x: "72%",
    y: `${THREE.MathUtils.lerp(70, 28, hotspot.yRatio)}%`
  };
}

function calculateHotspotAnchors() {
  if (!modelRoot) {
    return;
  }

  const modelBox = new THREE.Box3().setFromObject(modelRoot);
  const size = modelBox.getSize(new THREE.Vector3());
  const sideOffset = Math.max(size.x * 0.18, 0.12);
  const zOffset = Math.max(size.z * 0.12, 0.08);

  hotspotState.anchors.clear();

  floorHotspots.forEach((hotspot, index) => {
    const y = THREE.MathUtils.lerp(modelBox.min.y, modelBox.max.y, hotspot.yRatio);
    const worldAnchor = new THREE.Vector3(
      modelBox.max.x + sideOffset,
      y,
      modelBox.max.z - zOffset - index * 0.01
    );
    const localAnchor = modelRoot.worldToLocal(worldAnchor.clone());
    hotspotState.anchors.set(hotspot.floor, localAnchor);
  });
}

function isProjectionUsable(projected) {
  return (
    Number.isFinite(projected.x) &&
    Number.isFinite(projected.y) &&
    Number.isFinite(projected.z) &&
    projected.z > -1 &&
    projected.z < 1 &&
    Math.abs(projected.x) <= 1.35 &&
    Math.abs(projected.y) <= 1.35
  );
}

function updateHotspotPositions() {
  if (!hotspotLayer) {
    return;
  }

  const width = sceneContainer.clientWidth;
  const height = sceneContainer.clientHeight;

  floorHotspots.forEach((hotspot) => {
    const button = hotspotState.elements.get(hotspot.floor);
    if (!button) {
      return;
    }

    const anchor = hotspotState.anchors.get(hotspot.floor);
    const fallbackPosition = getFallbackHotspotPosition(hotspot);
    let x = fallbackPosition.x;
    let y = fallbackPosition.y;

    if (modelRoot && camera && anchor && width && height) {
      const projected = modelRoot.localToWorld(anchor.clone()).project(camera);

      if (isProjectionUsable(projected)) {
        x = `${clamp((projected.x * 0.5 + 0.5) * width, 52, width - 52)}px`;
        y = `${clamp((-projected.y * 0.5 + 0.5) * height, 34, height - 34)}px`;
      }
    }

    button.style.left = x;
    button.style.top = y;
    button.classList.add("is-visible");
  });
}

function setActiveHotspot(floorNumber) {
  hotspotState.activeFloor = floorNumber;

  hotspotState.elements.forEach((button, floor) => {
    const isActive = floor === floorNumber;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function triggerFloorSwitchAnimation(floorNumber) {
  const floorIndex = floorNumber - 1;
  hotspotState.switchingUntil = performance.now() + 780;
  hotspotState.targetRotationX = THREE.MathUtils.lerp(0.16, -0.1, floorIndex / 4);
  hotspotState.targetRotationY = 0.36 - floorIndex * 0.18;
  sceneSection?.classList.add("is-floor-switching");

  if (hotspotState.switchTimer) {
    window.clearTimeout(hotspotState.switchTimer);
  }

  hotspotState.switchTimer = window.setTimeout(() => {
    sceneSection?.classList.remove("is-floor-switching");
    hotspotState.switchTimer = null;
  }, 780);
}

function activateFloor(floorNumber, source = "gesture") {
  const content = floorContent[floorNumber];
  if (!content) {
    return;
  }

  setActiveHotspot(floorNumber);
  triggerFloorSwitchAnimation(floorNumber);
  showFloorPopup(floorNumber);

  const sourceLabel = source === "hotspot" ? "热点" : "手势";
  setStatus(`${sourceLabel}已切换到${content.title}。`, "success");
}

function hidePopup() {
  if (!popupState.activePopup) {
    return;
  }

  const popup = popupState.activePopup;
  popup.classList.add("is-leaving");
  popupState.activePopup = null;

  if (popupState.activeTimeout) {
    window.clearTimeout(popupState.activeTimeout);
    popupState.activeTimeout = null;
  }

  window.setTimeout(() => {
    popup.remove();
  }, 260);
}

function showFloorPopup(floorNumber) {
  const content = floorContent[floorNumber];
  if (!content) {
    return;
  }

  hidePopup();

  const popup = document.createElement("article");
  popup.className = "floor-popup";
  popup.innerHTML = `
    <div class="popup-topline">
      <div>
        <p class="eyebrow">Floor Insight</p>
        <h3>${content.title}</h3>
      </div>
      <button class="popup-close" type="button" aria-label="关闭弹窗">×</button>
    </div>
    <p class="popup-body">${content.body}</p>
    <div class="popup-meter" aria-hidden="true"><span></span></div>
  `;

  popup.querySelector(".popup-close").addEventListener("click", () => {
    hidePopup();
  });

  popupHost.appendChild(popup);
  popupState.activePopup = popup;
  popupState.activeTimeout = window.setTimeout(() => {
    hidePopup();
  }, 2200);
}

function updateFloorRecognition(count, timestamp) {
  if (count < 1 || count > 5) {
    popupState.stableCount = null;
    popupState.stableSince = 0;
    popupState.lastTriggeredCount = null;
    return;
  }

  if (timestamp < popupState.cooldownUntil) {
    return;
  }

  if (popupState.stableCount !== count) {
    popupState.stableCount = count;
    popupState.stableSince = timestamp;
    return;
  }

  if (popupState.lastTriggeredCount === count) {
    return;
  }

  if (timestamp - popupState.stableSince >= 260) {
    popupState.cooldownUntil = timestamp + 900;
    popupState.stableSince = timestamp;
    popupState.lastTriggeredCount = count;
    activateFloor(count, "gesture");
  }
}

function handleDualHandScale(handA, handB) {
  const palmA = getPalm(handA);
  const palmB = getPalm(handB);
  const palmDistance = distance2D(palmA, palmB);

  if (!gestureState.baseTwoHandDistance) {
    gestureState.baseTwoHandDistance = palmDistance;
    return;
  }

  const ratio = palmDistance / gestureState.baseTwoHandDistance;
  const emphasizedRatio = 1 + (ratio - 1) * 1.85;
  gestureState.targetScale = clamp(emphasizedRatio, 0.4, 3.2);
  gestureState.baseTwoHandDistance = lerp(gestureState.baseTwoHandDistance, palmDistance, 0.12);
}

function handleSingleFistRotation(hand) {
  const palm = getPalm(hand);

  if (!gestureState.prevSinglePalm) {
    gestureState.prevSinglePalm = { x: palm.x, y: palm.y };
    return;
  }

  const dx = palm.x - gestureState.prevSinglePalm.x;
  const dy = palm.y - gestureState.prevSinglePalm.y;

  gestureState.targetVelY = clamp(-dx * 2.8, -0.14, 0.14);
  gestureState.targetVelX = clamp(dy * 2.2, -0.1, 0.1);
  gestureState.prevSinglePalm = { x: palm.x, y: palm.y };
}

function handleDualCloseRotation(handA, handB) {
  const center = getCenterPoint([getPalm(handA), getPalm(handB)]);
  const angle = Math.atan2(center.y - 0.5, center.x - 0.5);

  if (!gestureState.prevDualCenter) {
    gestureState.prevDualCenter = center;
    gestureState.prevDualAngle = angle;
    return;
  }

  const dx = center.x - gestureState.prevDualCenter.x;
  const dy = center.y - gestureState.prevDualCenter.y;
  let dAngle = angle - (gestureState.prevDualAngle ?? angle);

  if (dAngle > Math.PI) {
    dAngle -= Math.PI * 2;
  } else if (dAngle < -Math.PI) {
    dAngle += Math.PI * 2;
  }

  // Close two-hand mode reacts to circular motion around the screen center.
  // Angle change carries most of the yaw rotation, while center drift still
  // contributes a smaller pitch/yaw cue so the interaction feels responsive.
  gestureState.targetVelY = clamp((-dx * 2.4) + dAngle * 1.6, -0.24, 0.24);
  gestureState.targetVelX = clamp((dy * 2.2) + dAngle * 0.55, -0.16, 0.16);
  gestureState.prevDualCenter = center;
  gestureState.prevDualAngle = angle;
}

function resetGestureTracking() {
  gestureState.baseTwoHandDistance = null;
  gestureState.prevDualCenter = null;
  gestureState.prevDualAngle = null;
  gestureState.targetVelX = 0;
  gestureState.targetVelY = 0;
  gestureState.activeMode = "idle";
  popupState.stableCount = null;
  popupState.stableSince = 0;
  popupState.lastTriggeredCount = null;
  clearGestureLayer();
}

function resetModeState(nextMode) {
  if (gestureState.activeMode === nextMode) {
    return;
  }

  gestureState.baseTwoHandDistance = null;
  gestureState.prevDualCenter = null;
  gestureState.prevDualAngle = null;
  gestureState.targetVelX = 0;
  gestureState.targetVelY = 0;
  gestureState.activeMode = nextMode;
}

function drawHandFeedback(results) {
  syncVideoOverlaySize();
  clearVideoOverlay();

  if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) {
    return;
  }

  results.multiHandLandmarks.forEach((landmarks) => {
    window.drawConnectors(videoCtx, landmarks, window.HAND_CONNECTIONS, {
      color: "#ffd59b",
      lineWidth: 2.4
    });
    window.drawLandmarks(videoCtx, landmarks, {
      color: "#87e0c3",
      lineWidth: 1.5,
      radius: 3.2
    });
  });
}

function onHandsResults(results) {
  drawHandFeedback(results);

  const handsList = results.multiHandLandmarks || [];
  const now = performance.now();

  if (!handsList.length) {
    if ((gestureState.gestureEnabled || appState.cameraReady) && now - gestureState.lastSeenAt > 300) {
      setTrackingState("未检测到手部", "muted");
      cameraHint.textContent = "请将一只或两只手完整置于画面中，保持适度光照。";
      setStatus("摄像头已连接，但暂未识别到完整手部。", "warning");
    }
    resetGestureTracking();
    return;
  }

  gestureState.gestureEnabled = true;
  gestureState.lastSeenAt = now;
  appState.handsReady = true;
  updateLoadingVisibility();

  const handCount = handsList.length;
  const fingerCounts = handsList.map((hand) => countExtendedFingers(hand));
  const palms = handsList.map((hand) => getPalm(hand));

  clearGestureLayer();
  drawGestureAura(
    palms,
    handCount === 2 ? "rgba(135, 224, 195, 0.24)" : "rgba(240, 211, 160, 0.26)"
  );

  if (handCount === 2) {
    const palmDistance = distance2D(palms[0], palms[1]);
    const dualCloseRotationMode = palmDistance < 0.18;
    const dualScaleMode = palmDistance >= 0.18;

    if (dualCloseRotationMode) {
      resetModeState("dual-close-rotate");
      handleDualCloseRotation(handsList[0], handsList[1]);
      setTrackingState("双手合拢旋转", "active");
      cameraHint.textContent = "双手合拢后做圆周运动，可旋转黄鹤楼模型。";
      setStatus("双手模式：合拢旋转模型。", "success");
      return;
    }

    if (dualScaleMode) {
      resetModeState("dual-scale");
      handleDualHandScale(handsList[0], handsList[1]);
      setTrackingState("双手缩放", "active");
      cameraHint.textContent = "双手靠近可缩小，双手扩散可放大模型。";
      setStatus("双手模式：正在缩放黄鹤楼模型。", "success");
      return;
    }

    return;
  }

  resetModeState("single-finger-info");
  updateFloorRecognition(fingerCounts[0], now);
  setTrackingState("单手识别", "active");
  cameraHint.textContent = "单手比出 1 到 5 指并稳定保持，可触发对应楼层信息弹窗。";

  if (appState.modelLoaded) {
    setStatus("单手数字识别已启用，可查看楼层信息。", "success");
  }
}

async function initHands() {
  if (!window.Hands || !window.Camera) {
    throw new Error("MediaPipe 资源未正确加载。");
  }

  hands = new window.Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 2,
    selfieMode: true,
    modelComplexity: HAND_MODEL_COMPLEXITY,
    minDetectionConfidence: HAND_DETECTION_CONFIDENCE,
    minTrackingConfidence: HAND_TRACKING_CONFIDENCE
  });

  hands.onResults(onHandsResults);

  mediaCamera = new window.Camera(inputVideo, {
    onFrame: async () => {
      if (gestureScanInFlight || !hands || inputVideo.readyState < 2) {
        return;
      }

      gestureScanInFlight = true;
      try {
        await hands.send({ image: inputVideo });
      } catch (error) {
        const message = String(error?.message || error || "");
        const isFrameBusy = message.includes("Graph has errors") || message.includes("already") || message.includes("busy");
        if (!isFrameBusy) {
          console.warn("手势识别帧处理失败。", error);
        }
      } finally {
        gestureScanInFlight = false;
      }
    },
    width: 640,
    height: 480
  });

  try {
    await mediaCamera.start();
    appState.cameraReady = true;
    setTrackingState("待识别", "muted");
    cameraHint.textContent = "摄像头已连接，请将一只或两只手置于右上角预览区中。";
    setStatus("摄像头已准备就绪，正在等待手势。", "default");
  } catch (error) {
    appState.cameraDenied = true;
    setTrackingState("不可用", "error");
    cameraHint.textContent = "摄像头不可用，已自动切换为鼠标拖拽与滚轮缩放模式。";
    setStatus("摄像头权限被拒绝，已启用鼠标控制作为降级方案。", "warning");
  }

  updateLoadingVisibility();
}

function stopGestureHands() {
  if (mediaCamera?.stop) {
    mediaCamera.stop();
  }

  const inputStream = inputVideo?.srcObject;
  if (inputStream?.getTracks) {
    inputStream.getTracks().forEach((track) => track.stop());
  }

  if (inputVideo) {
    inputVideo.srcObject = null;
  }

  if (hands?.close) {
    hands.close();
  }

  mediaCamera = null;
  hands = null;
  gestureHandsStarted = false;
  gestureScanInFlight = false;
  appState.cameraReady = false;
  clearVideoOverlay();
  clearGestureLayer();
  setTrackingState("待启动", "muted");
}

async function startGestureHands() {
  if (gestureHandsStarted) {
    return;
  }

  gestureHandsStarted = true;

  try {
    await initHands();
  } catch (error) {
    console.error(error);
    appState.cameraDenied = true;
    setTrackingState("不可用", "error");
    cameraHint.textContent = "手势识别初始化失败，已保留鼠标控制模式。";
    setStatus("MediaPipe 初始化失败，已保留 Three.js 鼠标控制。", "warning");
    updateLoadingVisibility();
  }
}

function animate() {
  requestAnimationFrame(animate);

  if (modelRoot) {
    gestureState.currentScale = lerp(gestureState.currentScale, gestureState.targetScale, 0.24);
    const now = performance.now();
    const switchRemaining = Math.max(0, hotspotState.switchingUntil - now);
    const switchProgress = switchRemaining > 0 ? switchRemaining / 780 : 0;
    const switchBoost = 1 + Math.sin(switchProgress * Math.PI) * 0.08;
    const modelScale = gestureState.baseModelScale * gestureState.currentScale * switchBoost;
    modelRoot.scale.setScalar(modelScale);

    gestureState.currentVelX = lerp(gestureState.currentVelX, gestureState.targetVelX, 0.28);
    gestureState.currentVelY = lerp(gestureState.currentVelY, gestureState.targetVelY, 0.28);

    modelPivot.rotation.y += gestureState.currentVelY;
    modelPivot.rotation.x = clamp(modelPivot.rotation.x + gestureState.currentVelX, -0.6, 0.42);

    if (switchRemaining > 0) {
      modelPivot.rotation.y = lerp(modelPivot.rotation.y, hotspotState.targetRotationY, 0.055);
      modelPivot.rotation.x = lerp(modelPivot.rotation.x, hotspotState.targetRotationX, 0.06);
    }

    gestureState.targetVelX *= 0.72;
    gestureState.targetVelY *= 0.72;
    updateHotspotPositions();
  }

  controls.update();
  renderer.render(scene, camera);
}

function attachEvents() {
  window.addEventListener("resize", resizeCanvases);

  resizeObserver = new ResizeObserver(() => {
    resizeCanvases();
  });
  resizeObserver.observe(sceneContainer);

  retryButton.addEventListener("click", () => {
    loadModel();
  });
}

async function init() {
  initStartPage();
  initFontScaleControls();
  initCameraSizeControls();
  createHotspotButtons();
  createScene();
  resizeCanvases();
  attachEvents();
  loadModel();
  animate();
  restoreRoutedView("replace");
}

init();
