
// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_newUserScript"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

function GM_newUserScript(parentWindow) {
  var windowWatcher = Cc["@mozilla.org/embedcomp/window-watcher;1"]
    .getService(Ci.nsIWindowWatcher);

  windowWatcher.openWindow(
    parentWindow, "chrome://scriptish/content/newscript.xul", null,
    "chrome,dependent,centerscreen,resizable,dialog", null
  );
};
