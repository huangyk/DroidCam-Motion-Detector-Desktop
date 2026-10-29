import { BASE_SETTINGS,DEFAULT_SETTINGS } from "../constants/config";

import type { InitialSettings,Settings, CameraSettingsFunctions} from "../types";

export function loadSettingsFromLocalStorage(): Partial<Settings> {
    const storedSettings = localStorage.getItem('app-settings');
  
    if(storedSettings) {
      const parsed = JSON.parse(storedSettings);
      const merged = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        detectionRegion: parsed.detectionRegion ?? null,
        integrations: {
          discord: {
            ...DEFAULT_SETTINGS.integrations.discord,
            ...(parsed.integrations?.discord || {}),
          },
          telegram: {
            ...DEFAULT_SETTINGS.integrations.telegram,
            ...(parsed.integrations?.telegram || {}),
          },
        },
      };
      return mergeSettings(BASE_SETTINGS, merged);
    }

    const baseAndDefaultSettings = mergeSettings(BASE_SETTINGS,DEFAULT_SETTINGS);
    saveSettingsToLocalStorage(baseAndDefaultSettings);
    return baseAndDefaultSettings;
}

export function saveSettingsToLocalStorage(settings: Settings): void { 
    localStorage.setItem('app-settings', JSON.stringify(settings)); 
}

export const mergeSettings = (baseSettings:CameraSettingsFunctions, settingsSource:InitialSettings)=>{
    return Object.assign(Object.create(baseSettings), settingsSource); 
}

export function resetSettings (settings:Settings):void {
    const newSettings = { ...DEFAULT_SETTINGS, integrations: settings.integrations };

    const mergedNewSettings:Settings = mergeSettings(BASE_SETTINGS,newSettings);

    saveSettingsToLocalStorage(mergedNewSettings)
}