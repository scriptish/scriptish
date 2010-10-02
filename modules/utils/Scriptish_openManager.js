var EXPORTED_SYMBOLS = ["Scriptish_openManager"];
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
XPCOMUtils.defineLazyGetter(this, "Scriptish_openManager", function() {
  return function Scriptish_openManager() {
    Services.wm.getMostRecentWindow("navigator:browser")
        .BrowserOpenAddonsMgr("addons://list/userscript");
  }
});
