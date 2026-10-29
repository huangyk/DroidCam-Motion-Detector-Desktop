import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  closeSettings: () => ipcRenderer.invoke('close-settings'),
  showDialog: () => ipcRenderer.invoke('show-dialog'),
  goToLink: (url:string) => ipcRenderer.invoke("go-to-link", url),
  getWindowSize: () => ipcRenderer.invoke('get-window-size'),
  setWindowSize: (width:number, height:number) => ipcRenderer.invoke('set-window-size', width, height),
  getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
  setWindowPosition: (x:number, y:number) => ipcRenderer.invoke('set-window-position', x, y),
  changeTrayIcon:(state: 'none' | 'motion' | 'person', tip?: string)=>
    ipcRenderer.invoke('update-tray-icon', state, tip),
});

