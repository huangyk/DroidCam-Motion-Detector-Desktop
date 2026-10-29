import { domElements } from "../../utils/domElements";
import { settings } from "../../settings/settings";
import { updateSettingValue } from "../../settings/settingsUtils";
import type { DetectionRegion } from "../../types";

const MIN_SIZE_RATIO = 0.04;

let drawing = false;
let drawMode = false;
let startX = 0;
let startY = 0;

function getOverlay(): HTMLDivElement {
  return document.getElementById("detection-region-overlay") as HTMLDivElement;
}

function getBox(): HTMLDivElement {
  return document.getElementById("detection-region-box") as HTMLDivElement;
}

function getVideoElement(): HTMLElement {
  return domElements.canvasOutput.style.display !== "none"
    ? domElements.canvasOutput
    : domElements.img;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Keep overlay aligned with the visible video/canvas, not the full window. */
function syncOverlayToVideo() {
  const overlay = getOverlay();
  if (!overlay) return;

  const container = domElements.container;
  const video = getVideoElement();
  const cRect = container.getBoundingClientRect();
  const vRect = video.getBoundingClientRect();

  overlay.style.left = `${vRect.left - cRect.left}px`;
  overlay.style.top = `${vRect.top - cRect.top}px`;
  overlay.style.width = `${vRect.width}px`;
  overlay.style.height = `${vRect.height}px`;
}

function normalizeRect(px: number, py: number, pw: number, ph: number, width: number, height: number): DetectionRegion | null {
  if (width <= 0 || height <= 0) return null;

  const x = clamp(Math.min(px, px + pw) / width, 0, 1);
  const y = clamp(Math.min(py, py + ph) / height, 0, 1);
  const w = clamp(Math.abs(pw) / width, 0, 1 - x);
  const h = clamp(Math.abs(ph) / height, 0, 1 - y);

  if (w < MIN_SIZE_RATIO || h < MIN_SIZE_RATIO) return null;
  return { x, y, width: w, height: h };
}

export function syncDetectionRegionBox() {
  syncOverlayToVideo();
  const box = getBox();
  const region = settings.detectionRegion;

  if (!box) return;

  if (!region) {
    box.style.display = "none";
    return;
  }

  box.style.display = "block";
  box.style.left = `${region.x * 100}%`;
  box.style.top = `${region.y * 100}%`;
  box.style.width = `${region.width * 100}%`;
  box.style.height = `${region.height * 100}%`;
}

export function setDetectionRegion(region: DetectionRegion | null) {
  updateSettingValue(settings, "detectionRegion", region);
  syncDetectionRegionBox();
  updateRegionStatusLabel();
}

export function clearDetectionRegion() {
  setDetectionRegion(null);
  exitDrawMode();
}

function updateRegionStatusLabel() {
  const label = document.getElementById("detection-region-status");
  if (!label) return;
  label.textContent = settings.detectionRegion
    ? "已设置检测区域（仅框内报警）"
    : "未设置（全画面检测）";
}

export function exitDrawMode() {
  drawMode = false;
  drawing = false;
  const overlay = getOverlay();
  const btn = document.getElementById("draw-region-btn");
  if (overlay) {
    overlay.classList.remove("drawing");
    overlay.style.pointerEvents = "none";
  }
  if (btn) btn.classList.remove("active");
}

export function enterDrawMode() {
  drawMode = true;
  syncOverlayToVideo();
  const overlay = getOverlay();
  const btn = document.getElementById("draw-region-btn");
  if (overlay) {
    overlay.classList.add("drawing");
    overlay.style.pointerEvents = "auto";
  }
  if (btn) btn.classList.add("active");
}

function toggleDrawMode() {
  if (drawMode) exitDrawMode();
  else enterDrawMode();
}

function pointerInOverlay(e: MouseEvent) {
  const overlay = getOverlay();
  const rect = overlay.getBoundingClientRect();
  return {
    x: clamp(e.clientX - rect.left, 0, rect.width),
    y: clamp(e.clientY - rect.top, 0, rect.height),
    width: rect.width,
    height: rect.height,
  };
}

export function initializeDetectionRegion() {
  const overlay = getOverlay();
  const box = getBox();
  if (!overlay || !box) return;

  // Ensure legacy settings objects get the field
  if (settings.detectionRegion === undefined) {
    (settings as { detectionRegion: DetectionRegion | null }).detectionRegion = null;
  }

  syncDetectionRegionBox();
  updateRegionStatusLabel();

  document.getElementById("draw-region-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDrawMode();
  });

  document.getElementById("clear-region-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    clearDetectionRegion();
  });

  document.getElementById("clear-region-settings-btn")?.addEventListener("click", () => {
    clearDetectionRegion();
  });

  overlay.addEventListener("mousedown", (e) => {
    if (!drawMode) return;
    e.preventDefault();
    e.stopPropagation();

    const p = pointerInOverlay(e);
    startX = p.x;
    startY = p.y;
    drawing = true;

    box.style.display = "block";
    box.style.left = `${startX}px`;
    box.style.top = `${startY}px`;
    box.style.width = "0px";
    box.style.height = "0px";
  });

  overlay.addEventListener("mousemove", (e) => {
    if (!drawing || !drawMode) return;
    e.preventDefault();

    const p = pointerInOverlay(e);
    box.style.left = `${Math.min(startX, p.x)}px`;
    box.style.top = `${Math.min(startY, p.y)}px`;
    box.style.width = `${Math.abs(p.x - startX)}px`;
    box.style.height = `${Math.abs(p.y - startY)}px`;
  });

  const finishDraw = (e: MouseEvent) => {
    if (!drawing || !drawMode) return;
    drawing = false;
    e.preventDefault();

    const p = pointerInOverlay(e);
    const region = normalizeRect(startX, startY, p.x - startX, p.y - startY, p.width, p.height);

    if (region) setDetectionRegion(region);
    else syncDetectionRegionBox();

    exitDrawMode();
  };

  overlay.addEventListener("mouseup", finishDraw);
  overlay.addEventListener("mouseleave", (e) => {
    if (drawing) finishDraw(e);
  });

  window.addEventListener("resize", () => {
    syncDetectionRegionBox();
  });

  domElements.img.addEventListener("load", () => {
    syncDetectionRegionBox();
  });
}
