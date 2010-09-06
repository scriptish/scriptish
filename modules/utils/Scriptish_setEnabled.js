Scriptish_setEnabled

// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_setEnabled"];

const Cu = Components.utils;
Cu.import("resource://scriptish/prefmanager.js");

const Scriptish_setEnabled = function (enabled) {
  Scriptish_prefRoot.setValue("enabled", enabled);
}
