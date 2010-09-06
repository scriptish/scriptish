
// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_showUserscriptList"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

const Scriptish_showUserscriptList = function() {
  var chromeWin = Cc['@mozilla.org/appshell/window-mediator;1']
      .getService(Ci.nsIWindowMediator)
      .getMostRecentWindow("navigator:browser");

  chromeWin.BrowserOpenAddonsMgr('addons://list/userscripts');
}
