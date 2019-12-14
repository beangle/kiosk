// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron')
const path = require('path')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let homeURL

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame:false, //没有边框，没有标题栏，没有菜单
    kiosk: true,  //服务亭模式
    fullscreen: true,  //全屏窗口
    backgroundColor: '#fff',
    resizable: false,  //不可更改窗口尺寸
    maximizable: true, //支持最大化
    autoHideMenuBar:true,//自动隐藏菜单
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    mainWindow = null
  })

  // 禁用缩放
  let webContents = mainWindow.webContents;
  webContents.on('did-finish-load', () => {
    webContents.zoomFactor=1;
    webContents.setVisualZoomLevelLimits(1, 1);
    webContents.setLayoutZoomLevelLimits(0, 0);
  });

  //加载地址
  if(homeURL){
    mainWindow.loadURL(homeURL);
  }
}


if(process.argv.length<2){
   console.log('Usage:spa.exe url');
   app.quit();
}else{
  let argStartIndex=1;
  if(process.argv[1]=='main.js'){
    argStartIndex=2;
  }
  process.argv.slice(argStartIndex).forEach(function(val,index, array) {
    if(index==0){
      homeURL = val;
    }
  }); 
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.