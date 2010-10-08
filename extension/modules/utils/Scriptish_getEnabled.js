
var EXPORTED_SYMBOLS = ["Scriptish_getEnabled"];

Components.utils.import("resource://scriptish/prefmanager.js");

const Scriptish_getEnabled = function () {
  return Scriptish_prefRoot.getValue("enabled", true);
}
