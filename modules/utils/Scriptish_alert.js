var EXPORTED_SYMBOLS = ["Scriptish_alert"];
Components.utils.import("resource://gre/modules/Services.jsm");
function Scriptish_alert(aMsg) Services.prompt.alert(null, "Scriptish", aMsg);
