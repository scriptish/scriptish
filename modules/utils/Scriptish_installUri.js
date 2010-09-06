
// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_installUri"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

function Scriptish_installUri(uri) {
  var win = Cc['@mozilla.org/appshell/window-mediator;1']
      .getService(Ci.nsIWindowMediator)
      .getMostRecentWindow("navigator:browser");

  if (win && win.Scriptish_BrowserUI) {
    win.Scriptish_BrowserUI.startInstallScript(uri);
    return true;
  }
  return false;
}
