
var EXPORTED_SYMBOLS = ["Scriptish_setEnabled"];

Components.utils.import("resource://scriptish/prefmanager.js");

const Scriptish_setEnabled = function (enabled) {
  Scriptish_prefRoot.setValue("enabled", enabled);
}
