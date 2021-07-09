const { app, BrowserWindow, Menu, screen } = require('electron')
require('update-electron-app')()
const ipcMain = require('electron').ipcMain;

let menuTemplate = [
];

let origin = "https://walruslabs.com";
let openDevTools = true;

let mainWindow;
let screenWidth, screenHeight;


function createWindow() {

  mainWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    titleBarStyle: 'hiddenInset',
    icon: __dirname + "/icon.png",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  })

  mainWindow.setResizable(true);

  mainWindow.loadURL(origin+"/dashboard");

  // Open the DevTools.
  if(openDevTools){
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', function () {
    mainWindow = null
  })

  mainWindow.once('ready-to-show', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });

  mainWindow.webContents.setWindowOpenHandler(details => {
    console.log("New window:", details)
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


    let width = 250;
    let height = 110; //450;

    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: width,
        height: height,
        x: 0,
        y: 0,
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
        if(size == 'chat'){
          win.setSize(250, 450);
        }else{
          win.setSize(250, 110);
        }
      }
    })
  });



  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

}

app.whenReady().then(createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})

app.whenReady().then(() => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  screenWidth = width
  screenHeight = height
})
