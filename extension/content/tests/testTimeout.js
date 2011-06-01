
Components.utils.import("resource://scriptish/constants.js");

module("Timeout");

asyncTest("Default Works", function() {
  expect(1);

  try {
    var t2;
    timeout(function() {
      if (typeof t2 == "number") clearTimeout(t2);
      ok(true, "timeout succeeded");
      start();
    });
    t2 = setTimeout(function() {
      ok(false, "timeout error: second timeout function called");
      start();
    }, 500);
  } catch (e) {
    ok(false, "timeout error: " + e);
    start();
  }
});
