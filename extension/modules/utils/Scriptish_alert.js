var EXPORTED_SYMBOLS = ["Scriptish_alert"];
Components.utils.import("resource://scriptish/constants.js");

function Scriptish_alert(aMsg, aWait) {
  if (typeof aWait == "number")
    return timeout(function() Scriptish_alert(aMsg), aWait);
  Services.prompt.alert(null, "Scriptish", aMsg+"");
}
