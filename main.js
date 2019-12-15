// Modules to control application life and create native browser window
const {app, BrowserWindow,ipcMain} = require('electron')
const path = require('path')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
let homeURL
let errorStatus="initializing..."
let refreshInterval=15*1000;
let devMode=false

// 解析HomeURL和是否开发模式
if(process.argv.length<2){
   console.log('Usage:spa.exe url');
   app.quit();
}else{
  let argStartIndex=1;
  if(process.argv[1]=='main.js'){
    argStartIndex=2;
  }
  process.argv.slice(argStartIndex).forEach(function(val,index, array) {
      if("dev"==val){
        devMode=new Boolean(val)
      }else if(val.startsWith("http")){
        homeURL = val;
      }
  });
}

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    backgroundColor: '#fff',
    resizable: false,  //不可更改窗口尺寸
    maximizable: true, //支持最大化
    frame:devMode, //没有边框，没有标题栏，没有菜单
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools :devMode,
      nodeIntegration: false  //不要启用node集成，防止加载未知代码对本地的潜在危险
    }
  })

  // Emitted when the window is closed.
  win.on('closed', function () {
    win = null;
  })

  if(!devMode){
    //不允许失去焦点，一旦失去马上夺回
    win.on('blur', () => {
      win.restore();
      win.focus();
      win.setKiosk(true);
    });
    win.setKiosk(true);//服务亭模式
    win.setFullScreen(true);//全屏窗口
    win.autoHideMenuBar=true;//自动隐藏菜单
  }

  // 禁用缩放
  let contents = win.webContents;
  contents.on('did-finish-load', (e) => {
    contents.zoomFactor = 1;
    contents.setVisualZoomLevelLimits(1, 1);
    contents.setLayoutZoomLevelLimits(0, 0);
  });

  //链接不上时，显示出错界面，有错误界面调用刷新逻辑
  contents.on('did-fail-load', (e,errorCode,errorDescription,validatedURL,isMainFrame) => {
    if(isMainFrame){
      displayError("Loading error:"+validatedURL +";Cause:"+errorDescription+"("+errorCode+")")
    }
  });

  contents.session.webRequest.onHeadersReceived({urls:[]},(details,callback)=>{
    if(details.resourceType == "mainFrame" && details.statusCode != 200){
       displayError("Loading error:"+details.url +";Status:"+details.statusCode)
    }
    callback(details);
  });

  // 如果询问状态则返回，5秒后重新打开首页
  ipcMain.on('status', (event, arg) => {
    event.returnValue = errorStatus
    if(errorStatus){
      errorStatus = "";
      setTimeout(loadHome,5000);
    }
  });

  if(devMode)contents.openDevTools();
  loadHome();
}

/**
 * 延迟显示错误
 * 1. webRequest.onHeadersReceived detect http code != 200
 * 2. record error message and log it.
 * 3. delay display error page(5s)
 */
function displayError(msg){
  errorStatus =msg;
  console.log(errorStatus);
  setTimeout(loadErrorPage,5000);
}

function loadErrorPage(){
  win.loadFile('error.html');
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
if(!devMode){
  setInterval(checkStatus,refreshInterval);
}
