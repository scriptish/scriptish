
// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_alert"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

function Scriptish_alert(msg) {
  Cc["@mozilla.org/embedcomp/prompt-service;1"]
      .getService(Ci.nsIPromptService)
      .alert(null, "Scriptish alert", msg);
}
