const { app, BrowserWindow, Menu, screen } = require('electron')
const ipcMain = require('electron').ipcMain;
const { autoUpdater } = require('electron-updater');


let menuTemplate = [
];

let origin = "https://walruslabs.com"
let homepage = origin+"/dashboard";
let openDevTools = false;

let mainWindow;
var display, dimensions, scaleFactor;

function createWindow() {

  display = screen.getPrimaryDisplay()
  dimensions = display.workArea
  scaleFactor = display.scaleFactor

  let basicWindowOptions = {
    width: dimensions.width / scaleFactor,
    height: dimensions.height / scaleFactor,
    titleBarStyle: 'hiddenInset',
    icon: __dirname + "/icon.png",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      zoomFactor: 1.0 / scaleFactor
    },
    show: false // don't show the main window
  }

  let splashWindowOptions = {...basicWindowOptions}
  let size = 400
  splashWindowOptions.width = size
  splashWindowOptions.height = size
  splashWindowOptions.x = dimensions.width / 2 - size/2
  splashWindowOptions.y = dimensions.height / 2 - size/2
  splashWindowOptions.frame = false
  splashWindowOptions.alwaysOnTop = true
  splashWindowOptions.show = true
  splashWindowOptions.webPreferences = {
    preload: __dirname + '/splash.js',
    enableRemoteModule: true
  }

  let popupWindowOptions = {...basicWindowOptions}
  popupWindowOptions.alwaysOnTop = true;
  popupWindowOptions.skipTaskbar= true;
  popupWindowOptions.frame = false;
  popupWindowOptions.show = true



  //clear session data
  mainWindow = new BrowserWindow(basicWindowOptions)

  splashWindow = new BrowserWindow(splashWindowOptions)
  splashWindow.loadURL('file:/'+__dirname+'/splash.html');
  if(openDevTools){
    splashWindow.webContents.openDevTools()
  }

  // if main window is ready to show, then destroy the splash window and show up the main window
  mainWindow.once('ready-to-show', () => {
    setTimeout(loadMainWindow, 1500);
  });

  function loadMainWindow(){
    splashWindow.destroy();
    mainWindow.show();
  }

  //mainWindow.maximize();
  mainWindow.setResizable(true);

  mainWindow.loadURL(homepage,  {"extraHeaders" : "pragma: no-cache\n"});

  // Open the DevTools.
  if(openDevTools){
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', function () {
    mainWindow = null
  })

  function doesWindowExist(url){
    let wins = BrowserWindow.getAllWindows();
    let output = false
    //double check that window doesn't already exist
    wins.forEach(win => {
      if (win.webContents.getURL() == url) {
        output = true;
      }
    })
    return output;
  }

  mainWindow.webContents.setWindowOpenHandler(details => {
    let url = details.url;
    if(doesWindowExist(url)){
      console.log("Window exists - not opening again");
      return {
        action: 'deny',
      }
    }

    let position = null;
    //if blob - just open normal window
    if(url.startsWith('blob')){
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: dimensions.width,
          height: dimensions.height,
          x: 0,
          y: 0,
          alwaysOnTop: false,
          skipTaskbar: false,
          titleBarStyle: 'hidden-inset',
          openDevTools: openDevTools
        }
      }
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
      }
    }
  })

  ipcMain.on('resize-window', (event, url, size) => {
    let wins = BrowserWindow.getAllWindows();
    wins.forEach(win => {
      if (win.webContents.getURL() == url) {
        console.log("Window exists and setting size", size);
        let coords = getWindowCoordinates(size);
        win.setSize(coords.width, coords.height);
      }
    })
  });

  ipcMain.on('open-window', (event, url, size, position) => {
    if(!url.startsWith("https://")){
      url = origin + url
    }
    console.log("Does win exist", doesWindowExist(url))
    if(doesWindowExist(url)){
      console.log("Window exists - not reopening");
    }else{
      console.log("Opening popup", url)
      if(url.indexOf("/workflow/checkinsummary") >= 0){
        position = "bottom-right"
      }else if(url.indexOf("/summon") >= 0){
        position = "top-center"
      }

      console.log("Opening at position", position)
      console.log("Opening with size", size)
      let coord = getWindowCoordinates(size, position);
      popupWindowOptions.x = coord.x
      popupWindowOptions.y = coord.y
      popupWindowOptions.width = coord.width
      popupWindowOptions.height = coord.height
      console.log("Popup window options:",popupWindowOptions)
      //content size is too large
      //popupWindowOptions.useContentSize = false
      const popup = new BrowserWindow(popupWindowOptions)

      popup.loadURL(url,  {"extraHeaders" : "pragma: no-cache\n"})
      if(openDevTools){
        popup.webContents.openDevTools()
      }
    }
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
      output.height = 650 / scaleFactor;
    }

    if(position == 'bottom-right'){
      output.y = dimensions.height - output.height - offset
    }else if(position == 'top-center'){
      output.y = offset
      output.x = dimensions.width / 2 - output.width / 2 + offset / 2
    }
    let toRound = ['x','y','width', 'height']
    toRound.forEach(x =>{
      output[x] = Math.round(output[x])
    })
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

