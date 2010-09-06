
// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_getEnabled"];

const Cu = Components.utils;
Cu.import("resource://scriptish/prefmanager.js");

const Scriptish_getEnabled = function () {
  return Scriptish_prefRoot.getValue("enabled", true);
}
