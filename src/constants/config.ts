import type { CameraSettingsFunctions, InitialSettings } from "src/types";

export const WIDTH = 357;
export const HEIGHT = 270;
export const BASE_BOX_SIZE = 15;
export const MAX_TRACKED_OBJECTS = 30;
export const EXCLUDE_HEIGHT_PERCENT = 0.025;
export const LIMIT_WINDOWS_SIZE = 310;
export const BASE_DURATION_BORDER = 100;

export const BASE_SETTINGS:CameraSettingsFunctions = {
    getVideoSourceUrl: () => localStorage.getItem('camera-url'),
    setVideoSourceUrl: (url: string) => localStorage.setItem('camera-url', url)
};
  
export const DEFAULT_SETTINGS: InitialSettings = {
    movementThreshold: 1,
    // Keep boxes from merging too aggressively so multi-box approach works
    distanceThreshold: 10,
    frameSkip: 2,
    alertInterval: 1000,
    alertVolume: 100,
    brightness: 0,
    contrast: 0,
    sharpness: 0,
    borderColor: [0, 255, 0, 255],
    borderThickness:2,
    detectionRegion: null,
    approachBoxThreshold: 3,
    integrations: {
        discord: {
            isEnabled: false,
            webhook: '',
            interval: 1000,
        },
        telegram: {
            isEnabled: false,
            botToken: '',
            chatID: '',
            interval: 1000,
        }
    }
};