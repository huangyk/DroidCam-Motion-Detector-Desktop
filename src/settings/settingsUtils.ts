import { saveSettingsToLocalStorage } from "./settingsStorage";

import { debounce } from "../utils/helpers";

import type { 
    Settings,
    NestedKeys,
    PathValue,
    IntegrationsSettings,
    DiscordSettings,
    TelegramSettings
} from "../types"

type DebouncedUpdateSetting = <Path extends NestedKeys>(
    settings:Settings,
    settingName:Path,
    value: PathValue<Settings, Path>
) => void;

export function updateSettingValue<Path extends NestedKeys,Value extends PathValue<Settings,Path>>(
    settings:Settings,
    settingName:Path,
    value:Value
):void{

    const keys = settingName.split('.');
    let current: Settings|IntegrationsSettings|DiscordSettings|TelegramSettings = settings;

    if(keys.length > 1){
        for (let i = 0; i < keys.length - 1; i++){
            const key = keys[i] as keyof typeof current;
            if(!(key in current)) return;

            const nextCurrent = current[key];
            
            if(typeof nextCurrent !== 'object') return;

            current = nextCurrent as IntegrationsSettings | DiscordSettings | TelegramSettings;
        }

        const lastKey = keys[keys.length - 1] as keyof typeof current;
        if(lastKey in current) (current[lastKey] as Value) = value;

    }else if(keys.length === 1){
        const key = keys[0] as keyof Settings;
        if(key in settings && typeof settings[key] !== 'function'){
            (settings[key] as Value) = value;
        }
    }

    saveSettingsToLocalStorage(settings);
}

export const debouncedUpdateSetting:DebouncedUpdateSetting = debounce((settings,settingName,value) => {
    updateSettingValue(settings, settingName, value);
}, 150);

  
export function formatInterval(milliseconds:number):string{
    const seconds = Math.floor(milliseconds / 1000);
    let humanReadable;
  
    if(seconds < 60) humanReadable = `${seconds} 秒`;
    else {

      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;

      if(remainingSeconds === 0) humanReadable = `${minutes} 分钟`;
      else humanReadable = `${minutes} 分 ${remainingSeconds} 秒`;
    }
  
    return humanReadable;
}

export function parseUrl(url: string) {
    const urlParts = url.replace('http://', '').split(':');
    const baseUrl = urlParts[0];
    const port = urlParts[1]?.split('/')[0];
    
    return {
        baseUrl: baseUrl,
        port: port
    };
}