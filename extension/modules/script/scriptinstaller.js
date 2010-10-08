var EXPORTED_SYMBOLS = ["ScriptInstall"];
Components.utils.import("resource://scriptish/script/scriptdownloader.js");
Components.utils.import("resource://gre/modules/AddonManager.jsm");

// Implements the AddonInstall interface https://developer.mozilla.org/en/Addons/Add-on_Manager/AddonInstall
function ScriptInstall(aScript) {
  this._listeners = [];
  this._script = aScript;
}
ScriptInstall.prototype = {
  get name() this._script.name,
  get version() this._script.version,
  get iconURL() this._script.iconURL,
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
  install: function() {},
  cancel: function() {},
  addListener: function(aInstallListener) {
    this._listeners.push(aInstallListener);
  },
  removeListener: function(aInstallListener) {
    for (var i = 0, listener; listener = this._listeners[i]; i++)
      if (listener === aInstallListener) this._listeners.splice(i, 1)
  }
}
