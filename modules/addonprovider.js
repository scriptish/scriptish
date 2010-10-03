var EXPORTED_SYMBOLS = [];
Components.utils.import("resource://scriptish/utils/Scriptish_config.js");
Components.utils.import("resource://gre/modules/AddonManager.jsm");

AddonManagerPrivate.registerProvider({
  getAddonByID: function(aId, aCallback) {
    aCallback(Scriptish_config.getScriptById(aId));
  },
  getAddonsByTypes: function(aTypes, aCallback) {
    if (aTypes && aTypes.indexOf("userscript") < 0) aCallback([]);
    else aCallback(Scriptish_config.scripts);
  }
});
