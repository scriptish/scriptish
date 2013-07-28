var EXPORTED_SYMBOLS = ["Scriptish"];
const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);
lazyImport(this, "resource://scriptish/config.js", ["Scriptish_config"]);

function setStatus() (enabled = Scriptish_prefRoot.getValue("enabled", true));
function notifyStatusChg(aVal) (
    Scriptish.notify(null, "scriptish-enabled", {enabling: aVal}));

var ignoreEnable = false, enabled = setStatus();
Scriptish_prefRoot.watch("enabled", function() {
  if (ignoreEnable) return ignoreEnable = false;
  notifyStatusChg(setStatus());
});

let enableInstallDetection = true;
function setEnableInstallDetection() {
  enableInstallDetection = Scriptish_prefRoot.getValue("enableInstallDetection", true);
}
setEnableInstallDetection();
Scriptish_prefRoot.watch("enableInstallDetection", setEnableInstallDetection);

var global = this;

const Scriptish = {
  updateSecurely: Scriptish_prefRoot.getBoolValue("update.requireSecured"),
  notify: function(aSubject, aTopic, aData) {
    if (true === aData) {
      aData = {saved: true};
    }
    else if (null !== aData) {
      if (!aData) {
        aData = {saved: false};
      }
      else if (!aData.saved) {
        aData.saved = false;
      }
    }
    if (aData && aSubject) aData.id = aSubject.id;
    Services.obs.notifyObservers(null, aTopic, JSON.stringify(aData));
  },
  get enableInstallDetection() enableInstallDetection,
  get enabled() enabled,
  set enabled(aVal) {
    ignoreEnable = true;
    enabled = !!aVal;
    notifyStatusChg(enabled);
    Scriptish_prefRoot.setValue("enabled", enabled);
  },
  getMostRecentWindow: function() Services.wm.getMostRecentWindow("navigator:browser"),
  getWindows: function() Services.wm.getEnumerator("navigator:browser")
}

// Watch for the required secure updates pref being modified
Scriptish_prefRoot.watch("update.requireSecured", function() {
  Scriptish.updateSecurely = Scriptish_prefRoot.getValue("update.requireSecured");
});
