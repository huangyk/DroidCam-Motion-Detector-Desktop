import cv from "@techstark/opencv-js"

import { domElements } from "../utils/domElements";
import { debounce, calculateExcludeHeight} from "../utils/helpers";
import { UIHideMotionIndicator,UIShowCanvasOutput,UIHideCanvasOutput} from "../utils/uiHelpers";
import { handleMotionEvents } from "../utils/motionEvents";

import { WIDTH, HEIGHT,BASE_BOX_SIZE,BASE_DURATION_BORDER,MAX_TRACKED_OBJECTS,EXCLUDE_HEIGHT_PERCENT } from "../constants/config";

import { settings } from "../settings/settings";

import { brightnessAndContrast } from "../filters/brightnessAndContrast";
import { sharpnessFilter } from "../filters/sharpnessFilter";

import { img } from "../components/videoFrame";

import { TrackedObject } from "../types";

type Rect = {
    x: number
    y: number
    width: number
    height: number
}

let openCvReady = false;

export let streaming = false;
export let videoPlaying = false;

let trackedObjects: TrackedObject[] = [];

let EXCLUDE_HEIGHT = calculateExcludeHeight(EXCLUDE_HEIGHT_PERCENT);
let frameCount = 0;
let currentWidth = WIDTH; 
let currentHeight = HEIGHT;

let frame: cv.Mat;
let prevFrame: cv.Mat;
let diffFrame: cv.Mat;
let grayFrame: cv.Mat;
let blurredFrame: cv.Mat;
let threshFrame: cv.Mat;
let contours: cv.MatVector;

let processTimer: ReturnType<typeof setTimeout> | null = null;
let processRaf: number | null = null;
const HIDDEN_FRAME_INTERVAL_MS = 100; // ~10fps while window is hidden

function clearProcessSchedule() {
    if (processTimer !== null) {
        clearTimeout(processTimer);
        processTimer = null;
    }
    if (processRaf !== null) {
        cancelAnimationFrame(processRaf);
        processRaf = null;
    }
}

/** rAF pauses when the window is hidden; use setTimeout so tray/background still detects motion. */
function scheduleNextFrame() {
    clearProcessSchedule();
    if (!videoPlaying || !streaming) return;

    if (document.hidden) {
        processTimer = setTimeout(() => {
            processTimer = null;
            processImage();
        }, HIDDEN_FRAME_INTERVAL_MS);
    } else {
        processRaf = requestAnimationFrame(() => {
            processRaf = null;
            processImage();
        });
    }
}


const initializeOpenCV = (): Promise<boolean> => {
  return new Promise((resolve) => {

    cv.onRuntimeInitialized = () => {
      console.log('OpenCV.js is ready');
      openCvReady = true;
      resolve(true);
    };

    setTimeout(() => { 
      resolve(openCvReady);
    }, 1000); 
  })
}

export const isOpenCvReady = async (): Promise<boolean> => {
    return openCvReady ? Promise.resolve(true) : initializeOpenCV()
}

export function initializeTracking() {
    if (!openCvReady) {
        console.error('OpenCV is not ready yet');
        return;
    }

    clearMatrix();
    
    frame = new cv.Mat();
    prevFrame = new cv.Mat();
    diffFrame = new cv.Mat();
    grayFrame = new cv.Mat();
    blurredFrame = new cv.Mat();
    threshFrame = new cv.Mat();
    contours = new cv.MatVector();

    updateCanvasSize();
}

function clearMatrix () {

    if (frame) frame.delete();
    if (prevFrame) prevFrame.delete();
    if (diffFrame) diffFrame.delete();
    if (grayFrame) grayFrame.delete();
    if (blurredFrame) blurredFrame.delete();
    if (threshFrame) threshFrame.delete();
    if (contours) contours.delete();
}

function processImage() {
    if (!videoPlaying || !streaming) return;
    
    const HIGHLIGHT_DURATION = BASE_DURATION_BORDER * (settings.frameSkip + 1);

    try {
        if (frameCount < settings.frameSkip) {
            frameCount++;
            scheduleNextFrame();
            return;
        }
        
        frameCount = 0;

        if (!frame || frame.empty()) {
            frame = new cv.Mat();
        }
        const tempFrame = cv.imread(img);
        cv.resize(tempFrame, frame, new cv.Size(currentWidth, currentHeight));

        if (settings.brightness > 0 || settings.contrast > 0) {
            brightnessAndContrast(frame, settings.brightness, settings.contrast, EXCLUDE_HEIGHT);
        }
        if (settings.sharpness > 0) {
            frame = sharpnessFilter(frame, settings.sharpness, EXCLUDE_HEIGHT);
        }

        cv.cvtColor(frame, grayFrame, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(grayFrame, blurredFrame, new cv.Size(5, 5), 0);

        if (prevFrame.empty()) {
            blurredFrame.copyTo(prevFrame);
            tempFrame.delete();
            scheduleNextFrame();
            return;
        }

        cv.absdiff(prevFrame, blurredFrame, diffFrame);
        // Lower threshold = more sensitive to small pixel changes
        cv.threshold(diffFrame, threshFrame, 10, 255, cv.THRESH_BINARY);
        maskOutsideDetectionRegion(threshFrame);
        cv.findContours(threshFrame, contours, new cv.Mat(), cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        const newObjects = [];

        for (let i = 0; i < contours.size(); i++) {
            const cnt = contours.get(i);
            const area = cv.contourArea(cnt);
            if (area > settings.movementThreshold) {
                const rect = cv.boundingRect(cnt);

                if (rect.y >= EXCLUDE_HEIGHT && isRectInDetectionRegion(rect)) {
                    const width = Math.max(BASE_BOX_SIZE, rect.width);
                    const height = Math.max(BASE_BOX_SIZE, rect.height);
                    const x = rect.width < BASE_BOX_SIZE ? rect.x - (BASE_BOX_SIZE - rect.width) / 2 : rect.x;
                    const y = rect.height < BASE_BOX_SIZE ? rect.y - (BASE_BOX_SIZE - rect.height) / 2 : rect.y;

                    newObjects.push({
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                        lastSeen: Date.now(),
                        createdAt: Date.now()
                    });
                }
            }
            cnt.delete();
        }

        trackedObjects = trackedObjects.map(obj => {
            try {
                const roi = safeRoi(threshFrame, {
                    x: obj.x,
                    y: obj.y,
                    width: obj.width,
                    height: obj.height
                });

                if (!roi) return null;

                const nonZero = cv.countNonZero(roi);
                if (nonZero === 0) {
                    roi.delete();
                    return null;
                }

                let newX = obj.x;
                let newY = obj.y;
                let newWidth = obj.width;
                let newHeight = obj.height;

                const safeGetRow = (idx:number) => {
                    try {
                        return roi.row(idx);
                    } catch (e) {
                        return null;
                    }
                };

                const safeGetCol = (idx:number) => {
                    try {
                        return roi.col(idx);
                    } catch (e) {
                        return null;
                    }
                };

                for (let y = 0; y < roi.rows; y++) {
                    const row = safeGetRow(y);
                    if (!row || cv.countNonZero(row) > 0) break;
                    newY++;
                    newHeight--;
                    if (row) row.delete();
                }

                for (let y = roi.rows - 1; y >= 0; y--) {
                    const row = safeGetRow(y);
                    if (!row || cv.countNonZero(row) > 0) break;
                    newHeight--;
                    if (row) row.delete();
                }

                for (let x = 0; x < roi.cols; x++) {
                    const col = safeGetCol(x);
                    if (!col || cv.countNonZero(col) > 0) break;
                    newX++;
                    newWidth--;
                    if (col) col.delete();
                }

                for (let x = roi.cols - 1; x >= 0; x--) {
                    const col = safeGetCol(x);
                    if (!col || cv.countNonZero(col) > 0) break;
                    newWidth--;
                    if (col) col.delete();
                }

                roi.delete();

                if (newWidth > 0 && newHeight > 0) {
                    newWidth = Math.max(BASE_BOX_SIZE, newWidth);
                    newHeight = Math.max(BASE_BOX_SIZE, newHeight);
                    
                    newX = Math.max(0, Math.min(newX, currentWidth - newWidth));
                    newY = Math.max(EXCLUDE_HEIGHT, Math.min(newY, currentHeight - newHeight));
                    
                    return {
                        x: newX,
                        y: newY,
                        width: newWidth,
                        height: newHeight,
                        lastSeen: obj.lastSeen,
                        createdAt: obj.createdAt
                    };
                }
                return null;
            } catch (error) {
                console.error('Error during object processing:', error);
                return null;
            }
        }).filter(obj => obj !== null);

        trackedObjects = trackedObjects.filter((obj1, index1) => {
            return !trackedObjects.some((obj2, index2) => 
                index1 !== index2 && isInsideBox(obj1, obj2)
            );
        });

        newObjects.forEach(newObj => {
            const isInside = trackedObjects.some(obj => isInsideBox(newObj, obj));
            if (isInside) return;

            const closestObj = trackedObjects.find(obj => {
                const center1X = newObj.x + newObj.width / 2;
                const center1Y = newObj.y + newObj.height / 2;
                const center2X = obj.x + obj.width / 2;
                const center2Y = obj.y + obj.height / 2;
                
                const distance = Math.sqrt(
                    Math.pow(center1X - center2X, 2) + 
                    Math.pow(center1Y - center2Y, 2)
                );

                return distance <= settings.distanceThreshold;
            });

            if (closestObj) {
                const minX = Math.max(0, Math.min(closestObj.x, newObj.x));
                const minY = Math.max(EXCLUDE_HEIGHT, Math.min(closestObj.y, newObj.y));
                const maxX = Math.min(currentWidth, Math.max(closestObj.x + closestObj.width, newObj.x + newObj.width));
                const maxY = Math.min(currentHeight, Math.max(closestObj.y + closestObj.height, newObj.y + newObj.height));

                closestObj.x = minX;
                closestObj.y = minY;
                closestObj.width = maxX - minX;
                closestObj.height = maxY - minY;
                closestObj.lastSeen = newObj.lastSeen;
            } else {
                trackedObjects.push(newObj);
            }
        });

        trackedObjects = trackedObjects
            .filter(obj => (Date.now() - obj.createdAt) <= HIGHLIGHT_DURATION)
            .slice(0, MAX_TRACKED_OBJECTS);

        trackedObjects.forEach(obj => {
            const lifetime = Date.now() - obj.createdAt;
            if (lifetime <= HIGHLIGHT_DURATION) {
                const color = new cv.Scalar(
                    settings.borderColor[0],
                    settings.borderColor[1],
                    settings.borderColor[2],
                    255
                );

                cv.rectangle(
                    frame,
                    new cv.Point(obj.x, obj.y),
                    new cv.Point(obj.x + obj.width, obj.y + obj.height),
                    color,
                    settings.borderThickness
                );
            }
        });

        drawDetectionRegionOverlay(frame);

        handleMotionEvents(trackedObjects.length, settings.alertVolume, settings.alertInterval);

        blurredFrame.copyTo(prevFrame);
        cv.imshow('canvasOutput', frame);
        tempFrame.delete();

    } catch (error) {
        console.error('Error during image processing:', error);
        clearMatrix();
    }

    scheduleNextFrame();
}

function getDetectionRegionPixels() {
    const region = settings.detectionRegion;
    if (!region || currentWidth <= 0 || currentHeight <= 0) return null;

    const x = Math.round(region.x * currentWidth);
    const y = Math.round(region.y * currentHeight);
    const width = Math.round(region.width * currentWidth);
    const height = Math.round(region.height * currentHeight);

    const safeX = Math.max(0, Math.min(x, currentWidth - 1));
    const safeY = Math.max(0, Math.min(y, currentHeight - 1));
    const safeW = Math.max(1, Math.min(width, currentWidth - safeX));
    const safeH = Math.max(1, Math.min(height, currentHeight - safeY));

    return { x: safeX, y: safeY, width: safeW, height: safeH };
}

function maskOutsideDetectionRegion(mat: cv.Mat) {
    const roi = getDetectionRegionPixels();
    if (!roi) return;

    const masked = cv.Mat.zeros(mat.rows, mat.cols, mat.type());
    const srcRoi = mat.roi(new cv.Rect(roi.x, roi.y, roi.width, roi.height));
    const dstRoi = masked.roi(new cv.Rect(roi.x, roi.y, roi.width, roi.height));
    srcRoi.copyTo(dstRoi);
    srcRoi.delete();
    dstRoi.delete();
    masked.copyTo(mat);
    masked.delete();
}

function isRectInDetectionRegion(rect: Rect): boolean {
    const roi = getDetectionRegionPixels();
    if (!roi) return true;

    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    return cx >= roi.x && cx <= roi.x + roi.width && cy >= roi.y && cy <= roi.y + roi.height;
}

function drawDetectionRegionOverlay(mat: cv.Mat) {
    const roi = getDetectionRegionPixels();
    if (!roi) return;

    cv.rectangle(
        mat,
        new cv.Point(roi.x, roi.y),
        new cv.Point(roi.x + roi.width, roi.y + roi.height),
        new cv.Scalar(0, 200, 255, 255),
        2
    );
}

function isInsideBox(inner:TrackedObject, outer:TrackedObject, threshold = 0.8) {
    const innerArea = inner.width * inner.height;
    const intersectX = Math.max(0, 
        Math.min(inner.x + inner.width, outer.x + outer.width) - 
        Math.max(inner.x, outer.x)
    );
    const intersectY = Math.max(0, 
        Math.min(inner.y + inner.height, outer.y + outer.height) - 
        Math.max(inner.y, outer.y)
    );
    const intersectArea = intersectX * intersectY;
    return intersectArea / innerArea > threshold;
}

function safeRoi(mat:cv.Mat, rect:Rect) {
    const x = Math.max(0, Math.min(rect.x, mat.cols - 1));
    const y = Math.max(0, Math.min(rect.y, mat.rows - 1));
    const width = Math.min(rect.width, mat.cols - x);
    const height = Math.min(rect.height, mat.rows - y);
    
    if (width <= 0 || height <= 0) return null;
    try {
        return mat.roi(new cv.Rect(x, y, width, height));
    } catch (e) {
        return null;
    }
}

function updateCanvasSize() {

    const imgWidth = img.clientWidth;
    const imgHeight = img.clientHeight;

    if (imgWidth > 0 && imgHeight > 0 && (domElements.canvasOutput.width !== imgWidth || domElements.canvasOutput.height !== imgHeight)) {
        currentWidth = imgWidth;
        currentHeight = imgHeight;
        domElements.canvasOutput.width = currentWidth;
        domElements.canvasOutput.height = currentHeight;

        if (streaming && frame && !frame.empty()) {
            const resizedFrame = new cv.Mat();
            cv.resize(frame, resizedFrame, new cv.Size(currentWidth, currentHeight));
            cv.imshow('canvasOutput', resizedFrame);
            resizedFrame.delete();
        } else if (!streaming) {
            const ctx = domElements.canvasOutput.getContext('2d');
            ctx.clearRect(0, 0, domElements.canvasOutput.width, domElements.canvasOutput.height);
        }
    }
}

export function waitForCanvasUpdate():Promise<void> {
    return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
            const imgWidth = img.clientWidth;
            const imgHeight = img.clientHeight;
            
            if (domElements.canvasOutput.width === imgWidth && domElements.canvasOutput.height === imgHeight) {
                resolve();
            } else {
                updateCanvasSize();
                waitForCanvasUpdate().then(resolve);
            }
        })
    })
}

export function startMotionTracking():Promise<void> {
    if (!openCvReady) {
        console.error('OpenCV is not ready yet');
        return Promise.reject('OpenCV not ready');
    }
    
    return new Promise((resolve) => {
        videoPlaying = true;
        initializeTracking();
        if (!streaming) {
            streaming = true;

            img.style.display = "none";
            UIShowCanvasOutput();
        }
        scheduleNextFrame();
        domElements.toggleCheckbox.checked = true;
        resolve();
    });
}

export function stopMotionTracking():Promise<void> {
    if(streaming){
        return new Promise((resolve) => {
            streaming = false;
            videoPlaying = false;
            clearProcessSchedule();

            img.style.display = "block";

            UIHideCanvasOutput();
            UIHideMotionIndicator();
            clearMatrix();
    
            frame = prevFrame = diffFrame = grayFrame = blurredFrame = threshFrame = contours = null;

            window.removeEventListener('resize', updateCanvasSize);
            
            resolve();
        })
    }
}

function handleWindowResizeForMotionTracking() {
    if(streaming){
        EXCLUDE_HEIGHT = calculateExcludeHeight(EXCLUDE_HEIGHT_PERCENT);
        stopMotionTracking()
            .then(waitForCanvasUpdate)
            .then(startMotionTracking)
            .catch(error => console.error('Error during resize handling:', error));
    }
}

window.addEventListener('resize', debounce(handleWindowResizeForMotionTracking, 500));
