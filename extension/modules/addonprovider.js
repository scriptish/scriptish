var EXPORTED_SYMBOLS = [];
Components.utils.import("resource://scriptish/scriptish.js");
Components.utils.import("resource://gre/modules/AddonManager.jsm");

AddonManagerPrivate.registerProvider({
  getAddonByID: function(aId, aCallback) {
    aCallback(Scriptish.config.getScriptById(aId));
  },
  getAddonsByTypes: function(aTypes, aCallback) {
    if (aTypes && aTypes.indexOf("userscript") < 0) aCallback([]);
    else aCallback(Scriptish.config.scripts);
  }
});
