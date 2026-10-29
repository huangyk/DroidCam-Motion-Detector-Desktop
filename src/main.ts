
import { app, BrowserWindow,ipcMain,dialog,shell,Tray,Menu,nativeImage,globalShortcut} from 'electron';
import path from 'path';

import { Buffer } from 'buffer';

import { WIDTH, HEIGHT } from './constants/config';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

import normalIconPath from '../src/assets/icons/tray_icon.png?asset'
import alertIconPath from '../src/assets/icons/tray_icon_alert.png?asset'


function createImageFromPath(base64Path:string) {
  const base64Data = base64Path.replace(/^data:image\/png;base64,/, ''); 
  const buffer = Buffer.from(base64Data, 'base64');

  return nativeImage.createFromBuffer(buffer);
} 

const normalIcon = createImageFromPath(normalIconPath); 
const alertIcon = createImageFromPath(alertIconPath);

let mainWindow: BrowserWindow;
let tray: Tray;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    icon: 'src/assets/icons/droidcam-motion-detector-icon.ico',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      // Keep motion detection timers/rAF alive when window is hidden to tray
      backgroundThrottling: false,
    },
    show: false,
    skipTaskbar: true,
    alwaysOnTop:true,
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
  
  mainWindow.setMenu(null);
  createTray();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  globalShortcut.register('Control+Shift+I', () => { 
    mainWindow.webContents.openDevTools(); 
  });
  
  ipcMain.handle('toggle-always-on-top', () => {
    const currentState = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!currentState);
    return !currentState;
  }),
  
  ipcMain.handle('show-dialog', async () => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['重启应用', '取消'],
      title: '连接已断开',
      message: '摄像头连接丢失。请检查手机端 DroidCam，然后重启本应用。'
    });
    return result.response === 0; // 0 - Restart, 1 - Cancel
  });

  ipcMain.handle('get-window-size', async () => {
    const size = mainWindow.getSize();
    console.log('Get window size:', size);
    return size;
  });

  ipcMain.handle('set-window-size', async (event, width, height) => {
    mainWindow.setSize(width, height);
    console.log('Set window size:', width, height);
  });

  ipcMain.handle('get-window-position', async () => {
    const position = mainWindow.getPosition();
    console.log('Get window position:', position);
    return position;
  });

  ipcMain.handle('set-window-position', async (event, x, y) => {
    mainWindow.setPosition(x, y !== null ? y : mainWindow.getPosition()[1]);
    console.log('Set window position:', x, y);
  });

  ipcMain.handle('go-to-link', (event, url) => {shell.openExternal(url)});

  ipcMain.handle('update-tray-icon', (event, alert) => {
    if(alert) tray.setImage(alertIcon);
    else tray.setImage(normalIcon);
  });
};

function createTray() {
  tray = new Tray(normalIcon);
  const contextMenu = Menu.buildFromTemplate([
    { label: '打开窗口', click: () => mainWindow.show() },
    { label: '退出', click: () => app.quit() },
  ]);

  tray.setToolTip('工位后方监测');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

app.commandLine.appendSwitch('disable-gpu')
app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if(process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

