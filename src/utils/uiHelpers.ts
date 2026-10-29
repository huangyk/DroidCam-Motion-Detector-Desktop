import { domElements } from "../utils/domElements";
import { formatInterval } from "../settings/settingsUtils";

export const UIShowLoader = () => {
    domElements.loaderImg.style.display = "block";
};
export const UIHideLoader = () => {
    domElements.loaderImg.style.display = "none";
};

export const UIShowEmptyUrlMessage = ()=>{
    domElements.emptyUrlMessage.style.display = "block";
}

export const UIEnableMotionButton = () => {
    domElements.switchMotion.style.cursor = 'pointer';
    domElements.switchMotion.style.pointerEvents = 'auto';
    domElements.switchMotion.style.opacity = '.8';
};
export const UIDisableMotionButton = () => {
    domElements.switchMotion.style.pointerEvents = 'none';
    domElements.switchMotion.style.opacity = '.3';
};
export const UISetConnectingText = (text: string) => {
    domElements.connecting.textContent = '正在连接 ' + text;
};
export const UIShowConnectionLost = () => {
    domElements.connectingLost.style.display = "block";
};
export const UIHideConnectionLost = () => {
    domElements.connectingLost.style.display = "none"
}
export const UIShowMotionIndicator = ()=>{
    domElements.motionIndicator.style.backgroundColor = '#05f805';
    domElements.motionIndicator.classList.remove('person-alert');
    UIHidePersonApproachBanner();
}
export const UIShowPersonApproachIndicator = ()=>{
    domElements.motionIndicator.style.backgroundColor = '#ff2a2a';
    domElements.motionIndicator.classList.add('person-alert');
    UIShowPersonApproachBanner();
}
export const UIHideMotionIndicator = ()=>{
    domElements.motionIndicator.style.backgroundColor = 'transparent';
    domElements.motionIndicator.classList.remove('person-alert');
    UIHidePersonApproachBanner();
}
export const UIShowPersonApproachBanner = ()=>{
    const banner = document.getElementById('person-approach-banner');
    if (banner) banner.style.display = 'block';
}
export const UIHidePersonApproachBanner = ()=>{
    const banner = document.getElementById('person-approach-banner');
    if (banner) banner.style.display = 'none';
}
export const UIShowCanvasOutput = ()=>{
    domElements.canvasOutput.style.display = "block";
}
export const UIHideCanvasOutput = ()=>{
    domElements.canvasOutput.style.display = "none";
}

export const UIUpdateValue = (settingName: string, value: number | string) => {
    const displayElement = document.getElementById(`${settingName}-value`);

    if(settingName === 'alertInterval' || settingName === 'discord-interval' || settingName ==='telegram-interval'){
        const formattedValue = formatInterval(value as number);

        if(displayElement) displayElement.innerText = formattedValue;
        else console.error('displayElement Interval in not defined');
    }else if(displayElement){
        displayElement.innerText = value as string;
    }else console.error('displayElement in not defined')
}

export const UIBorderColorTracking = (borderColor: number[]) => {
    const [red, green, blue] = borderColor;
    domElements.borderColorTracking.style.border = `3px solid rgb(${red}, ${green}, ${blue})`;
};
  
export const UIOpenSettings =()=>{
    domElements.settingsContainer.classList.add('show');
}
export const UICloseSettings =()=>{
    domElements.settingsContainer.classList.remove('show');
}
export const UIAlwaysOnTop =()=>{
    domElements.pinButton.style.opacity ='1';
}
export const UINotAlwaysOnTop =()=>{
    domElements.pinButton.style.opacity ='.5'
}
export const UIUpdateBatteryLevel = (level: number) => {
    domElements.batteryLevel.style.width = `${level}%`;
    domElements.batteryText.textContent = `${level}`;
};
export const UIUpdateBatteryColor = (level: number) => {
    if(level > 50) domElements.batteryLevel.style.backgroundColor = 'green';
    else if(level > 20) domElements.batteryLevel.style.backgroundColor = 'yellow';
    else{
        if(level<=10) domElements.batteryContainer.style.display="block";
        domElements.batteryLevel.style.backgroundColor = 'red';
    }
}
export const UIToggleFlashlight =()=>{
    domElements.flashlightButton.classList.toggle("flashlight-active");
}
export const UIToggleCameraFlash = () => {
     domElements.screenshotButton.classList.add("screenshot-flash"); 
     setTimeout(()=>{ 
        domElements.screenshotButton.classList.remove("screenshot-flash")
    },300); 
};

export const UIToggleIntegrationBody = (name: string, checked: boolean) => {
    if(name === 'discord'){
      domElements.bodyDiscord.classList.toggle('active-discord-wrapper', checked);
    }
  
    if(name === 'telegram'){
      domElements.bodyTelegram.classList.toggle('active-telegram-wrapper', checked);
    }
};

export const UIToggleCameraUrlButtonDisabled = (boolean:boolean)=>{
    domElements.applyNewUrlButton.disabled = boolean;
}

export const UIToggleTelegramButtonDisabled = (boolean: boolean) => {
    domElements.telegramApplyButton.disabled  = boolean;
}

export const UIToggleDiscordButtonDisabled = (boolean: boolean) => {
    domElements.discordApplyButton.disabled = boolean;
}

export const UIApplyButtonSettings = (element: HTMLButtonElement)=>{
    const text = element.textContent;
    const color = element.style.color;

    element.textContent = "DONE!";
    element.style.color='#00f722'

    setTimeout(()=>{
        element.textContent = text;
        element.style.color=color;
    },600)
}
