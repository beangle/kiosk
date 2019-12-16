// Modules to control application life and create native browser window
const {app, BrowserWindow,ipcMain} = require('electron')
const path = require('path')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
let homeURL
let baseURL
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
        baseURL = getBase(homeURL);
      }
  });
}

function getBase(url){
  let firstSlashIdx=url.indexOf("://")+3;
  let urlAfterHttp=url.substring(firstSlashIdx);
  let lastSlashIdx=urlAfterHttp.lastIndexOf("/");
  if(lastSlashIdx<0){
    lastSlashIdx=urlAfterHttp.length;
  }
  return url.substring(0,firstSlashIdx+lastSlashIdx);
}

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    backgroundColor: '#fff',
    resizable: false,  //不可更改窗口尺寸
    maximizable: true, //支持最大化
    kiosk:true,
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

  //链接不上时，显示出错界面，由错误界面调用刷新逻辑
  contents.on('did-fail-load', (e,errorCode,errorDescription,validatedURL,isMainFrame) => {
    if(isMainFrame){
      displayError("Loading error:"+validatedURL +";Cause:"+errorDescription+"("+errorCode+")")
    }
  });

  //http状态不对也显示错误界面
  contents.session.webRequest.onHeadersReceived({urls:[]},(details,callback)=>{
    if(details.resourceType == "mainFrame" && details.statusCode != 200 && details.statusCode != 302 && details.statusCode != 301){
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

/**
 * 检查kiosk状态
 * 1. 是否全屏
 * 2. 当前窗口是baseURL
 * 3. 是否只有一个窗口
 */
function checkStatus(){
   if(!win.isFullScreen()){
     win.setFullScreen(true)
   }
   if(!win.isFocused()){
     win.focus();
   }

   if(baseURL !=  getBase(win.webContents.getURL())){
      console.log(baseURL)
      console.log("Incorrect url:"+getBase(win.webContents.getURL()));
      loadHome();
   }

   let wins=BrowserWindow.getAllWindows();
   if(wins.length>1){
     try{
       console.log("Closing "+(wins.length - 1)+" windows");
       for(w of wins){
         if(w != win){
           w.close();
         }
       }
     }catch(e){
     }
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
