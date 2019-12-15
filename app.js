    var errorMsg=window.ipc.sendSync('status',"hello");
    const konsole = document.getElementById('konsole');
    errorMsg = errorMsg.replace(";","<br>")
    errorMsg = errorMsg.replace("&","&amp;")

    konsole.innerHTML=errorMsg+" <br> Reloading in 5 seconds";
