const { app, BrowserWindow, Menu, screen } = require('electron')
const ipcMain = require('electron').ipcMain;
const { autoUpdater } = require('electron-updater');

let menuTemplate = [
];

let homepage = "https://walruslabs.com/dashboard";
let openDevTools = true;

let mainWindow;
var display, dimensions, scaleFactor;

function createWindow() {

  display = screen.getPrimaryDisplay()
  dimensions = display.workArea
  scaleFactor = display.scaleFactor

  mainWindow = new BrowserWindow({
    width: dimensions.width / scaleFactor,
    height: dimensions.height / scaleFactor,
    titleBarStyle: 'hiddenInset',
    icon: __dirname + "/icon.png",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  })

  mainWindow.setResizable(true);

  mainWindow.loadURL(homepage);

  // Open the DevTools.
  if(openDevTools){
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', function () {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(details => {
    let wins = BrowserWindow.getAllWindows();
    let url = details.url;

    //double check that window doesn't already exist
    wins.forEach(win => {
      if (win.webContents.getURL() == url) {
        console.log("Window exists - not opening again");
        return {
          action: 'deny',
        }
      }
    })

    let position = null;
    if(url.indexOf('/workflow/checkinsummary') >= 0){
      position = 'bottom-right';
    }else if(url.indexOf('/summons') >= 0){
      position = 'top-center';
    }

    let coords = getWindowCoordinates(null, position);

    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: coords.width,
        height: coords.height,
        x: coords.x,
        y: coords.y,
        alwaysOnTop: true,
        skipTaskbar: true,
        frame: false,
        roundedCorners: true,
      }
    }
  })

  ipcMain.on('resize-window', (event, url, size) => {
    console.log(event)
    console.log(url)
    let wins = BrowserWindow.getAllWindows();
    wins.forEach(win => {
      if (win.webContents.getURL() == url) {
        console.log("Window exists and setting size", size);
        let coords = getWindowCoordinates(size);
        win.setSize(coords.width, coords.height);
      }
    })
  });

  function getWindowCoordinates(size, position){
    let offset = 10
    let startingWidth = 500 / scaleFactor
    let startingHeight = 110 / scaleFactor
    let output = {
      x: dimensions.width - startingWidth - offset,
      y: 0+offset,
      width: startingWidth,
      height: startingHeight
    }
    if(size == 'chat'){
      output.height = 450 / scaleFactor;
    }

    if(position == 'bottom-right'){
      output.y = dimensions.height - output.height - offset
    }else if(position == 'top-center'){
      output.x = (dimensions.width - output.width)/2
    }
    return output;

  }


  mainWindow.once('ready-to-show', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})

app.whenReady().then(() => {
  createWindow();
})

autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update_available');
});
autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update_downloaded');
});
ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});
