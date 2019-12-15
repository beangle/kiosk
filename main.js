// Modules to control application life and create native browser window
const {app, BrowserWindow,ipcMain} = require('electron')
const path = require('path')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
let homeURL
let errorStatus="initializing..."
let refreshInterval=15*1000;

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    frame:false, //没有边框，没有标题栏，没有菜单
    kiosk: true,  //服务亭模式
    fullscreen: true,  //全屏窗口
    autoHideMenuBar:true,//自动隐藏菜单
    alwaysOnTop:true,
    backgroundColor: '#fff',
    resizable: false,  //不可更改窗口尺寸
    maximizable: true, //支持最大化

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools :false,
      nodeIntegration: false  //不要启用node集成，防止加载未知代码对本地的潜在危险
    }
  })

  // Emitted when the window is closed.
  win.on('closed', function () {
    win = null;
  })

  //不允许失去焦点，一旦失去马上夺回
  win.on('blur', () => {
    win.restore();
    win.focus();
    win.setKiosk(true);
  });

  // 禁用缩放
  let contents = win.webContents;
  contents.on('did-finish-load', (e) => {
    contents.zoomFactor = 1;
    contents.setVisualZoomLevelLimits(1, 1);
    contents.setLayoutZoomLevelLimits(0, 0);
  });

  contents.on('did-fail-load', (e,errorCode,errorDescription,validatedURL,isMainFrame) => {
    if(isMainFrame){
      win.loadFile('error.html');
      errorStatus ="Loading error:"+validatedURL +";Cause:"+errorDescription+"("+errorCode+")";
      console.log(errorStatus);
    }
  });

  // 如果询问状态则返回，5秒后重新打开首页
  ipcMain.on('status', (event, arg) => {
    event.returnValue = errorStatus
    if(errorStatus){
      errorStatus = "";
      setTimeout(loadHome,5000);
    }
  });

  loadHome();
}

//加载首页地址
function loadHome(){
  if(homeURL){
    win.loadURL(homeURL);
  }
}

//检查是否全屏
function checkStatus(){
   if(!win.isFullScreen()){
     win.setFullScreen(true)
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
  if (win === null) createWindow()
})

//定期检查全屏
setInterval(checkStatus,refreshInterval);
