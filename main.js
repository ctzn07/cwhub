import { app, BrowserWindow, dialog, nativeImage } from 'electron';
import { access, constants } from 'node:fs';
import { spawn } from 'child_process';
import path from 'path';

const RULE_PATH = "/run/udev/rules.d/70-CWHub-corsair.rules";
const RULE = `KERNEL=="hidraw*", ATTRS{idVendor}=="1b1c", TAG+="uaccess"`;   // 1b1c is Corsair Vendor ID
const RULE_RELOAD = `udevadm control --reload-rules && udevadm trigger --subsystem-match=hidraw --action=change`;
const UDEV = ['sh', '-c', `mkdir -p /run/udev/rules.d/ && touch ${RULE_PATH} && echo '${RULE}' | tee ${RULE_PATH} > /dev/null && ${RULE_RELOAD}`];
const targetOrigin = 'https://www.corsair.com';
const mainUrl = path.join(targetOrigin, 'web-hub/index.html');

const browserWindowSettings = {
  width: 1600, 
  height: 1000,  
  webPreferences: {
    nodeIntegration: false, 
    contextIsolation: true, 
  }
}

function createWindow() {
  const win = new BrowserWindow(browserWindowSettings);
  win.removeMenu();

  // Force links to open in same window
  win.webContents.setWindowOpenHandler(({ url }) => {
    if(url.startsWith(targetOrigin))win.loadURL(url);
    return { action: 'deny' };
  });
  
  // Filter device permissions requests to 'hid' only from targetOrigin
  win.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    return Boolean(permission === 'hid' && requestingOrigin.startsWith(targetOrigin));
  });

  win.webContents.session.setDevicePermissionHandler((details) => {
    return Boolean(details.deviceType === 'hid' && details.origin.startsWith(targetOrigin));
  });

  // Create a dialogue to select hid device
  win.webContents.session.on('select-hid-device', async (event, details, callback) => {
    event.preventDefault();
    const { deviceList } = details;
    
    // Build button labels from device names
    const buttons = deviceList.map((device) => device.name);
    
    // Add cancel option at the end and get the index of it
    const cancelIndex = buttons.push('Cancel') - 1;

    const response = dialog.showMessageBoxSync(win, {
      type: 'question',
      title: 'Corsair Web Hub - Select Device',
      buttons: buttons,
      cancelId: cancelIndex, 
    });

    // Only do callback if something was selected (Cancel handling is automatic)
    if(response >= 0 && response < cancelIndex)callback(deviceList[response].deviceId);
  });

  // Check if udev rule file exists on page load
  win.webContents.once('dom-ready', () => {
    access(RULE_PATH, constants.F_OK, (err) => {
      if(err){  // Error, file does not exists
        const child = spawn('pkexec', UDEV, { stdio: 'inherit', detached: true });

        // If child process is still open on exit, force kill it
        app.on('will-quit', () => child?.kill('SIGTERM'));

        // If child process doesn't exit gracefully, quit
        child.on('exit', (sigint) => (sigint) ? app.quit() : null);

        // If child process encounters other error, show it to user and quit
        child.on('error', (err) => {
          dialog.showErrorBox('Error', `${err}`);
          app.quit();
        })
      }
    });
  })

  win.webContents.on('did-finish-load', async () => { 
    // Inject CSS to hide cookie popup
    win.webContents.insertCSS(`#onetrust-banner-sdk { display: none; };`)

    // Capture app icon from the page
    const imageData = await win.webContents.executeJavaScript(`
        (() => {
          const sourceElement = document.querySelector('.chakra-image');
          const canvas = document.createElement('canvas');
          if (!sourceElement) return null;
          canvas.width = 512;
          canvas.height = 512;
          canvas.getContext('2d').drawImage(sourceElement, 0, 0, 512, 512);
          return canvas.toDataURL();
        })();
      `) || '';

      win.setIcon(nativeImage.createFromDataURL(imageData));
  })

  // Clear cache and data on exit
  win.on('close', () => {
    win.webContents.session.clearCache();
    win.webContents.session.clearData();
  });

  // Load the main page
  win.loadURL(mainUrl);
}

app.on('ready', () => createWindow());
app.on('window-all-closed', () => app.quit());