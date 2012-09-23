var EXPORTED_SYMBOLS = ["Scriptish_windowUnloader"];
Components.utils.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log", "Scriptish_logError"]);

const winUnloaders = {};

const observer = {
  observe: function(aSubject, aTopic, aData) {
    var innerID = aSubject.QueryInterface(Ci.nsISupportsPRUint64).data;
    var unloaders = winUnloaders[innerID];
    if (!unloaders) return;

    for (var i = unloaders.length - 1; ~i; i--) {
      try {
        unloaders[i]();
      }
      catch(e) {
        Scriptish_logError(e);
      }
    }

    winUnloaders[innerID] = null;
  }
};
Services.obs.addObserver(observer, "inner-window-destroyed", false);

const Scriptish_windowUnloader = function(aUnloader, aInnerID) {
  if (!winUnloaders[aInnerID])
    winUnloaders[aInnerID] = [];

  winUnloaders[aInnerID].push(aUnloader);
};
