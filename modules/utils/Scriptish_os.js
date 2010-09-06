
// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_os"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

const Scriptish_os = Cc["@mozilla.org/xre/app-info;1"]
      .getService(Ci.nsIXULRuntime).OS;
