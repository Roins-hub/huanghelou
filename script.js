import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

const sceneContainer = document.getElementById("sceneContainer");
const gestureLayer = document.getElementById("gestureLayer");
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

let scene;
let camera;
let renderer;
let controls;
let modelRoot;
let modelPivot;
let resizeObserver;
let hands;
let mediaCamera;

const videoCtx = videoOverlay.getContext("2d");
const gestureCtx = gestureLayer.getContext("2d");
const FONT_SCALE_KEY = "huanghelou-font-scale";
const CAMERA_SIZE_KEY = "huanghelou-camera-size";

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

  if (Math.abs(landmarks[4].x - landmarks[0].x) > 0.05) {
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
    showFloorPopup(count);
    setStatus(`已识别 ${count} 指手势，正在展示对应楼层信息。`, "success");
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
    if (gestureState.gestureEnabled && now - gestureState.lastSeenAt > 300) {
      setTrackingState("未检测到手部", "muted");
      cameraHint.textContent = "请将一只或两只手完整置于画面中，保持适度光照。";
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
    modelComplexity: 1,
    minDetectionConfidence: 0.65,
    minTrackingConfidence: 0.45
  });

  hands.onResults(onHandsResults);

  mediaCamera = new window.Camera(inputVideo, {
    onFrame: async () => {
      await hands.send({ image: inputVideo });
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

function animate() {
  requestAnimationFrame(animate);

  if (modelRoot) {
    gestureState.currentScale = lerp(gestureState.currentScale, gestureState.targetScale, 0.24);
    const modelScale = gestureState.baseModelScale * gestureState.currentScale;
    modelRoot.scale.setScalar(modelScale);

    gestureState.currentVelX = lerp(gestureState.currentVelX, gestureState.targetVelX, 0.28);
    gestureState.currentVelY = lerp(gestureState.currentVelY, gestureState.targetVelY, 0.28);

    modelPivot.rotation.y += gestureState.currentVelY;
    modelPivot.rotation.x = clamp(modelPivot.rotation.x + gestureState.currentVelX, -0.6, 0.42);

    gestureState.targetVelX *= 0.72;
    gestureState.targetVelY *= 0.72;
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
  initFontScaleControls();
  initCameraSizeControls();
  createScene();
  resizeCanvases();
  attachEvents();
  loadModel();
  animate();

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

init();
