import {
  UIShowMotionIndicator,
  UIHideMotionIndicator,
  UIShowPersonApproachIndicator,
} from './uiHelpers';
import { telegramSnapshotAlert } from '../services/telegramSendAlert';
import { discordSnapshotAlert } from '../services/discordSendAlert';

import { settings } from '../settings/settings';

import beepSound from '../assets/beep.mp3?asset';

/** 1 none=原色  2 motion=绿(未达阈值)  3 person=红(≥阈值) */
type AlertKind = 'none' | 'motion' | 'person';

type HandleMotionEvents = (
    trackedObjectsLength: number,
    alertVolume: number,
    alertInterval: number,
    personApproaching?: boolean
) => void;

let lastSoundTime = 0;
let audio: HTMLAudioElement | null = null;
let lastTelegramAlertTime = 0;
let lastDiscordAlertTime = 0;
let lastAlertKind: AlertKind = 'none';

export const handleMotionEvents: HandleMotionEvents = (
  trackedObjectsLength,
  alertVolume,
  alertInterval,
  personApproaching = false
) => {
  const kind: AlertKind = personApproaching
    ? 'person'
    : trackedObjectsLength > 0
      ? 'motion'
      : 'none';

  if (kind !== lastAlertKind) {
    if (kind === 'person') {
      UIShowPersonApproachIndicator();
      window.electronAPI.changeTrayIcon('person', '有人靠近！');
    } else if (kind === 'motion') {
      UIShowMotionIndicator();
      window.electronAPI.changeTrayIcon('motion', '检测到运动');
    } else {
      UIHideMotionIndicator();
      window.electronAPI.changeTrayIcon('none', '工位后方监测');
    }
    lastAlertKind = kind;
  }

  if (kind === 'person' || kind === 'motion') {
    if (alertVolume > 0) handleAudioAlert(alertVolume, alertInterval);
    if (settings.integrations.telegram.isEnabled) handleTelegramAlert();
    if (settings.integrations.discord.isEnabled) handleDiscordAlert();
  }
};

const handleAudioAlert = (alertVolume:number, alertInterval:number): void => {
    const currentTime = Date.now();

    if(currentTime - lastSoundTime >= alertInterval){
      lastSoundTime = currentTime;
      
      if(!audio) audio = new Audio(beepSound);
      
      audio.volume = alertVolume / 100;
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    }
};

const handleTelegramAlert = (): void => {
  const currentTime = Date.now();
  const { interval, botToken, chatID } = settings.integrations.telegram;

  if(botToken && chatID){   
    if(currentTime - lastTelegramAlertTime >= interval){
      lastTelegramAlertTime = currentTime;
      telegramSnapshotAlert(botToken, chatID);
    }
  }else console.error('Error: botToken or chatID is empty');
};

const handleDiscordAlert = (): void => {
  const currentTime = Date.now();
  const { interval, webhook } = settings.integrations.discord;
  
  if(currentTime - lastDiscordAlertTime >= interval){
    lastDiscordAlertTime = currentTime;
    discordSnapshotAlert(webhook);
  }
};
