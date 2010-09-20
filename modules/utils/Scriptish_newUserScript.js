
var EXPORTED_SYMBOLS = ["Scriptish_newUserScript"];

const Scriptish_newUserScript = function(aWindow) {
  Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
    .getService(Components.interfaces.nsIWindowWatcher)
    .openWindow(
        aWindow, "chrome://scriptish/content/newscript.xul", null,
        "chrome,dependent,centerscreen,resizable,dialog", null);
};
