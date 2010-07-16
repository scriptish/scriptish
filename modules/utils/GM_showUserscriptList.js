
// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_showUserscriptList"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/utils/GM_firefoxVersion.js");

function GM_showUserscriptList() {
  var chromeWin = Cc['@mozilla.org/appshell/window-mediator;1']
      .getService(Ci.nsIWindowMediator)
      .getMostRecentWindow("navigator:browser");
  chromeWin.BrowserOpenAddonsMgr(
      GM_firefoxVersion == '4.0' ? 'addons://list/userscripts' : 'userscripts');
}
