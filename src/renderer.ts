import { domElements } from "./utils/domElements";
import { isOpenCvReady,initializeTracking } from "./services/opencv";

import { initializeVideoFrame } from "./components/videoFrame";
import { settings } from "./settings/settings";

import { appVersionCheck } from "./settings/appVersionCheck";

import { UIAlwaysOnTop, UIShowEmptyUrlMessage} from './utils/uiHelpers';

import { saveSettingsWindowSizeAndPosition} from "./utils/settingsWindowManager";

import { initializeMainButtons } from "./components/navigation/mainButtons";
import { initializeControlsPanel } from "./components/controlsPanel/controlsPanel";
import { initializeDetectionRegion } from "./components/detectionRegion/detectionRegion";

import '@zkreations/tooltips/tooltips.min.css';

import './index.css';

(async () => {

    await isOpenCvReady();
    
    UIAlwaysOnTop();
    if (!settings.getVideoSourceUrl()) {
        saveSettingsWindowSizeAndPosition()
        UIShowEmptyUrlMessage();
    }

    await initializeVideoFrame();

    initializeTracking();
    initializeMainButtons();
    initializeControlsPanel();
    initializeDetectionRegion();

    const appVersion = await appVersionCheck();
    
    if(appVersion){
        const currentAppVersion = domElements.appVersion.textContent;
        if(currentAppVersion !== appVersion){
            domElements.availableNewVersionApp.style.display = "block";        
        }
    }
})()