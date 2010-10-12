var EXPORTED_SYMBOLS = ["Scriptish_config"];
Components.utils.import("resource://scriptish/constants.js");
XPCOMUtils.defineLazyGetter(
    this, "Scriptish_config", function() Services.scriptish.config);
