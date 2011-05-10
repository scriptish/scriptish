var EXPORTED_SYMBOLS = [];
Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/scriptish.js");
Components.utils.import("resource://scriptish/logging.js");
Components.utils.import("resource://scriptish/utils/Scriptish_notification.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");

const Scriptish_ScriptProvider = {
  observe: function(aSubject, aTopic, aData) Scriptish.getConfig(function(config) {
    aData = JSON.parse(aData);
    let script = config.getScriptById(aData.id);
    switch(aTopic){
    case "scriptish-script-installed":
      AddonManagerPrivate.callInstallListeners(
          "onExternalInstall", null, script, null, false);

      // notification that install is complete
      var msg = "'" + script.name;
      if (script.version) msg += " " + script.version;
      msg += "' " + Scriptish_stringBundle("statusbar.installed");
      Scriptish_notification(msg, null, null, function() Scriptish.openManager());
      break;
    case "scriptish-script-edit-enabling":
      AddonManagerPrivate.callAddonListeners(
          aData.enabling ? "onEnabling" : "onDisabling", script, false);
      break;
    case "scriptish-script-edit-enabled":
      AddonManagerPrivate.callAddonListeners(
          aData.enabling ? "onEnabled" : "onDisabled", script);
      break;
    case "scriptish-script-modified":
    case "scriptish-script-updated":
      if (aData.reloadUI) {
        AddonManagerPrivate.callAddonListeners("onUninstalled", this);
        AddonManagerPrivate.callInstallListeners(
            "onExternalInstall", null, this, null, false);
      }

      // notification
      var msg = "'" + script.name;
      if (script.version) msg += " " + script.version;
      msg += "' " + (("scriptish-script-updated" == aTopic)
          ? Scriptish_stringBundle("statusbar.updated")
          : Scriptish_stringBundle("statusbar.modified"));
      Scriptish_notification(msg, null, null, function() Scriptish.openManager());
      break;
    case "scriptish-script-uninstalling":
      AddonManagerPrivate.callAddonListeners("onUninstalling", script, false);
      break;
    case "scriptish-script-uninstalled":
      AddonManagerPrivate.callAddonListeners("onUninstalled", script);
      break;
    }
  }),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsISupports, Ci.nsIObserver])
};



AddonManagerPrivate.registerProvider({
  getAddonByID: function(aId, aCallback) {
    Scriptish.getConfig(function(config) {
      aCallback(config.getScriptById(aId));
    });
  },
  getAddonsByTypes: function(aTypes, aCallback) {
    if (aTypes && aTypes.indexOf("userscript") < 0) aCallback([]);
    else Scriptish.getConfig(function(config) {
      aCallback(config.scripts);
    });
  }
});
[
  "scriptish-script-installed",
  "scriptish-script-edit-enabling",
  "scriptish-script-edit-enabled",
  "scriptish-script-modified",
  "scriptish-script-updated",
  "scriptish-script-uninstalling",
  "scriptish-script-uninstalled"
].forEach(function(i)(
    Services.obs.addObserver(Scriptish_ScriptProvider, i, false)));
