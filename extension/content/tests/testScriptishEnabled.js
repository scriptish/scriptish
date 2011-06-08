
Components.utils.import("resource://scriptish/scriptish.js");

module("Scriptish.enabled");
var PREF_BRANCH = Services.prefs.getBranch("extensions.scriptish.");

test("get enabled", function() {
  expect(2);
  try {
    var enabled = PREF_BRANCH.getBoolPref("enabled");
    ok(true, "no error getting pref")
  } catch (e) {
    var enabled = false; // default
    ok(false, "failed to get pref")
  }

  equal(Scriptish.enabled, enabled,
      "Scriptish should be " + ((enabled) ? "enabled" : "disabled"));
});
