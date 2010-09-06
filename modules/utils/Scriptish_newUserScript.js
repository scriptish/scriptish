
// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_newUserScript"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

const Scriptish_newUserScript = function(parentWindow) {
  var windowWatcher = Cc["@mozilla.org/embedcomp/window-watcher;1"]
    .getService(Ci.nsIWindowWatcher);

  windowWatcher.openWindow(
    parentWindow, "chrome://scriptish/content/newscript.xul", null,
    "chrome,dependent,centerscreen,resizable,dialog", null
  );
};
