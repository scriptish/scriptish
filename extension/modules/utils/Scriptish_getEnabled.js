var EXPORTED_SYMBOLS = ["Scriptish_getEnabled"];
Components.utils.import("resource://scriptish/prefmanager.js");
function Scriptish_getEnabled() Scriptish_prefRoot.getValue("enabled", true)
