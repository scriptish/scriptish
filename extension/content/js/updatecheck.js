// Checks if Scriptish was updated/installed
(function(import, tools) {
  import("resource://scriptish/prefmanager.js", tools);
  import("resource://scriptish/constants.js", tools);
  var pref = tools.Scriptish_prefRoot;

  // check if this is the first launch
  if ("0.0" == pref.getValue("version", "0.0"))
    pref.setValue("version", "0.0.1");

  // update the currently initialized version so we don't do this work again.
  tools.AddonManager.getAddonByID("scriptish@erikvold.com", function(aAddon) {
    pref.setValue("version", aAddon.version);
  });
})(Components.utils.import, {})
