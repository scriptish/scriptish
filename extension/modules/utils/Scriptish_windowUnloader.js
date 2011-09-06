var EXPORTED_SYMBOLS = ["Scriptish_windowUnloader"];
Components.utils.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);

const winUnloaders = {};

function Unloader(aFunc, aInnerID) {
  this.unload = aFunc;
  this.innerID = aInnerID;
}

const observer = {
  observe: function(aSubject, aTopic, aData) {
    var innerID = aSubject.QueryInterface(Ci.nsISupportsPRUint64).data;
    var unloaders = winUnloaders[innerID];

    if (!unloaders) return;

    for (var i = 0, e = unloaders.length - 1; ~i; i--) {
      unloaders[i].unload();
    }

    delete winUnloaders[innerID];
  }
};
Services.obs.addObserver(observer, "inner-window-destroyed", false);

const Scriptish_windowUnloader = function(aUnloader, aInnerID) {
  if (!winUnloaders[aInnerID])
    winUnloaders[aInnerID] = [];

  winUnloaders[aInnerID].push(new Unloader(aUnloader, aInnerID));
};
