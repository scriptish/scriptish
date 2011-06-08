
Components.utils.import("resource://scriptish/scriptish.js");

module("Scriptish.updateSecurely");
var PREF_BRANCH = Services.prefs.getBranch("extensions.scriptish.");

test("get updateSecurely", function() {
  expect(2);
  try {
    var prefVal = PREF_BRANCH.getBoolPref("update.requireSecured");
    ok(true, "no error getting pref")
  } catch (e) {
    var prefVal = false; // default
    ok(false, "failed to get pref")
  }

  equal(Scriptish.updateSecurely, prefVal,
      "Scriptish.updateSecurely does not match extensions.scriptish.update.requireSecured");
});
