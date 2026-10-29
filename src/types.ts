export interface TrackedObject {
    x: number;
    y: number;
    lastSeen: number;
    // size: number;
    width: number;
    height: number;
    createdAt: number;
}

/** Normalized 0–1 rectangle relative to the video frame. */
export interface DetectionRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BaseSettings {
  movementThreshold: number;
  distanceThreshold: number;
  frameSkip: number;
  alertInterval: number;
  alertVolume: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  borderColor: number[];
  borderThickness:number;
  /** null = detect full frame */
  detectionRegion: DetectionRegion | null;
  /** Motion box count ≥ this → red approach alert + tray */
  approachBoxThreshold: number;
  getVideoSourceUrl: () => string;
  setVideoSourceUrl: (url: string) => void;
}

export interface DiscordSettings {
  isEnabled: boolean;
  webhook: string;
  interval: number;
}

export interface TelegramSettings {
  isEnabled: boolean;
  botToken: string;
  chatID: string;
  interval: number;
}

export interface IntegrationsSettings {
  discord: DiscordSettings;
  telegram: TelegramSettings;
}

export interface Settings extends BaseSettings {
  integrations: IntegrationsSettings;
}

export type InitialSettings = Omit<Settings, 'getVideoSourceUrl' | 'setVideoSourceUrl'>;
export type CameraSettingsFunctions = Pick<Settings, 'getVideoSourceUrl' | 'setVideoSourceUrl'>

export type SettingsKeys = Exclude<keyof Settings, 'getVideoSourceUrl' | 'setVideoSourceUrl'>;

export type NestedKeys = 
  | SettingsKeys 
  | `integrations.${keyof IntegrationsSettings}` 
  | `integrations.discord.${keyof DiscordSettings}` 
  | `integrations.telegram.${keyof TelegramSettings}`;

export type PathValue<T, P extends string> = 
  P extends keyof T ? T[P] :
  P extends `${infer Key}.${infer Rest}` 
    ? Key extends keyof T 
      ? PathValue<T[Key], Rest>
      : never
    : never;

export type SettingValue = string | number | boolean | DetectionRegion | null;