var EXPORTED_SYMBOLS = ["Scriptish_alert"];
Components.utils.import("resource://scriptish/constants.js");
function Scriptish_alert(aMsg) Services.prompt.alert(null, "Scriptish", aMsg);
