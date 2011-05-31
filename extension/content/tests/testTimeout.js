
Components.utils.import("resource://scriptish/constants.js");

module("Timeout");

test("Default Works", function() {
  expect(1);
  stop();

  try {
    var success = false;
    timeout(function() {
      ok((success = true), "timeout success");
      start();
    });
    setTimeout(function() {
      ok(false, "timeout error: timeout");
      start();
    }, 500);
  } catch (e) {
    ok(false, "timeout error: " + e);
    start();
  }
});
