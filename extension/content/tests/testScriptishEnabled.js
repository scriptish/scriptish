
Components.utils.import("resource://scriptish/scriptish.js");

module("Scriptish.enabled");
var PREF_BRANCH = Services.prefs.getBranch("extensions.scriptish.");

test("get enabled", 2, function() {
  try {
    var enabled = PREF_BRANCH.getBoolPref("enabled");
    ok(true, "no error getting pref")
  } catch (e) {
    var enabled = true; // default
    ok(false, "failed to get pref")
  }

  equal(Scriptish.enabled, enabled,
      "Scriptish should be " + ((enabled) ? "enabled" : "disabled"));
});
