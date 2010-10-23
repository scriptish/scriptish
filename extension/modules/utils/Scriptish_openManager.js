var EXPORTED_SYMBOLS = ["Scriptish_openManager"];
Components.utils.import("resource://scriptish/constants.js");
function Scriptish_openManager() {
  var browserWin = Services.wm.getMostRecentWindow("navigator:browser");
  if (browserWin.BrowserOpenAddonsMgr)
    browserWin.BrowserOpenAddonsMgr("addons://list/userscript");
  else if (browserWin.toEM)
    browserWin.toEM("addons://list/userscript")
}
