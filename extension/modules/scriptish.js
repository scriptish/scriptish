var EXPORTED_SYMBOLS = ["Scriptish"];
Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/prefmanager.js");

const Scriptish = {
  notify: function(aSubject, aTopic, aData) {
    if (true === aData) {
      aData = {saved: true};
    } else if (null !== aData) {
      if (!aData) {
        aData = {saved: false};
      } else if (!aData.saved) {
        aData.saved = false;
      }
    }
    if (aData && aSubject) aData.id = aSubject.id;
    Services.obs.notifyObservers(null, aTopic, JSON.stringify(aData));
  },
  get config() Services.scriptish.config,
  get enabled() Scriptish_prefRoot.getValue("enabled", true),
  set enabled(aVal) {
    let val = !!aVal;
    this.notify(null, "scriptish-enabled", {enabling: val});
    Scriptish_prefRoot.setValue("enabled", val)
  },
  openManager: function Scriptish_openManager() {
    var browserWin = Services.wm.getMostRecentWindow("navigator:browser");
    if (browserWin.BrowserOpenAddonsMgr)
      browserWin.BrowserOpenAddonsMgr("addons://list/userscript");
    else if (browserWin.toEM)
      browserWin.toEM("addons://list/userscript");
  },
  isGreasemonkeyable: function Scriptish_isGreasemonkeyable(aURL) {
    // if the url provide is not a valid url, then an error could be thrown
    try {
      var scheme = Services.io.extractScheme(aURL);
    } catch (e) {
      return false;
    }

    switch (scheme) {
      case "http":
      case "https":
      case "ftp":
      case "data":
        return true;
      case "about":
        // Always allow "about:blank".
        if (/^about:blank/.test(aURL)) return true;
        // Conditionally allow the rest of "about:".
        return Scriptish_prefRoot.getValue('aboutIsGreaseable');
      case "file":
        return Scriptish_prefRoot.getValue('fileIsGreaseable');
      case "unmht":
        return Scriptish_prefRoot.getValue('unmhtIsGreaseable');
    }
    return false;
  },
  getMostRecentWindow: function() Service.wm.getMostRecentWindow("navigator:browser"),
  getWindows: function() Services.wm.getEnumerator("navigator:browser")
}
