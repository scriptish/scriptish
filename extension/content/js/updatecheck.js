// Checks if Scriptish was updated/installed
(function() {
  var tools = {};
  Components.utils.import("resource://scriptish/prefmanager.js", tools);
  Components.utils.import("resource://gre/modules/AddonManager.jsm", tools);

  // check if this is the first launch
  if ("0.0" == tools.Scriptish_prefRoot.getValue("version", "0.0"))
    tools.Scriptish_prefRoot.setValue("version", "0.0.1");

  // update the currently initialized version so we don't do this work again.
  tools.AddonManager.getAddonByID("scriptish@erikvold.com", function(aAddon) {
    tools.Scriptish_prefRoot.setValue("version", aAddon.version);
  });
})()
