
// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_os"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

const GM_os = Cc["@mozilla.org/xre/app-info;1"]
      .getService(Ci.nsIXULRuntime).OS;
