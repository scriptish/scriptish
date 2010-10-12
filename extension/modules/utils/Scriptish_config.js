var EXPORTED_SYMBOLS = ["Scriptish_config"];
Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyGetter(this, "Scriptish_config", function() {
  return Services.scriptish.config;
});
