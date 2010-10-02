var EXPORTED_SYMBOLS = ["Scriptish_openManager"];
Components.utils.import("resource://gre/modules/Services.jsm");
function Scriptish_openManager() {
  Services.wm.getMostRecentWindow("navigator:browser")
      .BrowserOpenAddonsMgr("addons://list/userscript");
}
