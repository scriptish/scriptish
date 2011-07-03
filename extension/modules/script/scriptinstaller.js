var EXPORTED_SYMBOLS = ["ScriptInstall"];
Components.utils.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/config/configdownloader.js", ["Scriptish_configDownloader"]);

// Implements https://developer.mozilla.org/en/Addons/Add-on_Manager/AddonInstall
function ScriptInstall(aScript) {
  this._listeners = [];
  this._script = aScript;
}
ScriptInstall.prototype = {
  changed: function(aType) {
    let self = this;
    switch (aType) {
      case "DownloadStarted":
        this.state = AddonManager.STATE_DOWNLOADING;
        break;
      case "DownloadEnded":
        this.state = AddonManager.STATE_DOWNLOADED;
        timeout(function() {
          self.changed("InstallStarted");
          self.scriptDownloader.installScript();
        });
        break;
      case "DownloadCancelled":
        this.state = AddonManager.STATE_CANCELLED;
        break;
      case "DownloadFailed":
        this.state = AddonManager.STATE_DOWNLOAD_FAILED;
        break;
      case "InstallStarted":
        this.state = AddonManager.STATE_INSTALLING;
        break;
      case "InstallEnded":
        this.state = AddonManager.STATE_INSTALLED;
        break;
      default:
        return;
    }
    AddonManagerPrivate.callAddonListeners("on"+aType, this, this._script);
    if (!this._listeners.length) return;
    var listeners = this._listeners;
    for (var i = 0, listener; listener = listeners[i]; i++) {
      if (listener["on"+aType]) {
        listener["on"+aType](this, this._script);
      }
    }
  },
  get name() this._script.name,
  get version() this._script.version,
  get iconURL() this._script.iconURL,
  get icon64URL() this._script.icon64URL,
  releaseNotesURI: null,
  type: "userscript",
  state: AddonManager.STATE_DOWNLOADING,
  error: null,
  sourceURI: null,
  file: null,
  progress: -1,
  maxProgress: -1,
  //certificate
  //certName
  get existingAddon() this._script,
  addon: null,
  install: function() {
    this.changed("DownloadStarted");
    this.scriptDownloader =
        Scriptish_configDownloader.startUpdateScript(
            this._script.cleanUpdateURL, this);
  },
  cancel: function() {
    switch (this.state) {
      case "DownloadStarted":
        // TODO: Implement ability to cancel
        //this.changed("DownloadCancelled");
      default:
        return;
    }
  },
  addListener: function(aInstallListener) {
    this._listeners.push(aInstallListener);
  },
  removeListener: function(aInstallListener) {
    for (var i = 0, listener; listener = this._listeners[i]; i++)
      if (listener === aInstallListener) this._listeners.splice(i, 1)
  }
}
