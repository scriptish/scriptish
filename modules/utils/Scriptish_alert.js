
// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_alert"];

Components.utils.import("resource://scriptish/constants.js");

const promptServ = Cc["@mozilla.org/embedcomp/prompt-service;1"]
    .getService(Ci.nsIPromptService);

function Scriptish_alert(msg) {
  promptServ.alert(null, "Scriptish", msg);
}
