var EXPORTED_SYMBOLS = [];
Components.utils.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/config.js", ["Scriptish_config"]);
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);
lazyImport(this, "resource://gre/modules/AddonManager.jsm", ["AddonManager", "AddonManagerPrivate"]);

lazyUtil(this, "notification");
lazyUtil(this, "openManager");
lazyUtil(this, "popupNotification");
lazyUtil(this, "stringBundle");

const Scriptish_ScriptProvider = {
  observe: function(aSubject, aTopic, aData) {
    aData = JSON.parse(aData);
    let script = Scriptish_config.getScriptById(aData.id);

    switch(aTopic){
    case "scriptish-script-installed":
      AddonManagerPrivate.callInstallListeners(
          "onExternalInstall", null, script, null, false);

      // notification that install is complete
      var msg = "'" + script.name;
      if (script.version) msg += " " + script.version;
      msg += "' " + Scriptish_stringBundle("statusbar.installed");
      var callback = Scriptish_openManager;

      var showedMsg = Scriptish_popupNotification({
        id: "scriptish-install-popup-notification",
        message: msg,
        mainAction: {
          label: Scriptish_stringBundle("openUserScriptsManager"),
          accessKey: Scriptish_stringBundle("openUserScriptsManager.ak"),
          callback: callback
        },
        options: {
          removeOnDismissal: true,
          persistWhileVisible: true
        }
      });

      if (!showedMsg) {
        Scriptish_notification(msg, null, null, callback);
      }

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
      var callback = Scriptish_openManager;

      var showedMsg = Scriptish_popupNotification({
        id: "scriptish-install-popup-notification",
        message: msg,
        mainAction: {
          label: Scriptish_stringBundle("openUserScriptsManager"),
          accessKey: Scriptish_stringBundle("openUserScriptsManager.ak"),
          callback: callback
        },
        options: {
          removeOnDismissal: true,
          persistWhileVisible: true
        }
      });

      if (!showedMsg) {
        Scriptish_notification(msg, null, null, callback);
      }

      break;
    case "scriptish-script-uninstalling":
      AddonManagerPrivate.callAddonListeners("onUninstalling", script, false);
      break;
    case "scriptish-script-uninstalled":
      AddonManagerPrivate.callAddonListeners("onUninstalled", script);
      break;
    }
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsISupports, Ci.nsIObserver])
};

var types = null;
if (AddonManagerPrivate.AddonType) {
  types = [new AddonManagerPrivate.AddonType(
      "userscript",
      "chrome://scriptish/locale/scriptish.properties",
      "userscripts",
      AddonManager.VIEW_TYPE_LIST,
      7000)];
}

AddonManagerPrivate.registerProvider({
  getAddonByID: function(aId, aCallback) {
    aCallback(Scriptish_config.getScriptById(aId));
  },
  getAddonsByTypes: function(aTypes, aCallback) {
    if (aTypes && aTypes.indexOf("userscript") < 0) {
      aCallback([]);
    } else {
      aCallback(Scriptish_config.scripts);
    }
  },

  getInstallsByTypes: function(aTypes, aCallback) {
    if (aTypes && aTypes.indexOf("userscript") < 0) {
      aCallback([]);
    } else {
      let updates = [];
      Scriptish_config.scripts.forEach(function(script) {
        if (script.updateAvailable
            && script.updateAvailable.state == AddonManager.STATE_AVAILABLE)
          updates.push(script.updateAvailable);
      });
      aCallback(updates);
    }
  }
}, types);
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
