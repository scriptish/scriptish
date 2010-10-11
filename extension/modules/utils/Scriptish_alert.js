var EXPORTED_SYMBOLS = ["Scriptish_alert"];
Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/third-party/Timer.js");
const gTimer = new Timer();
function Scriptish_alert(aMsg, aWait) {
  if (typeof aWait == "number")
    return gTimer.setTimeout(function() Scriptish_alert(aMsg), aWait);
  Services.prompt.alert(null, "Scriptish", aMsg+"");
}
