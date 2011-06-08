
Components.utils.import("resource://scriptish/scriptish.js");
Components.utils.import("resource://scriptish/config/config.js");

module("Scriptish.getConfig");

asyncTest("returns config", function() {
  expect(3);

  var gotConfig = false, config1;
  Scriptish.getConfig(function(config) {
    ok(config instanceof Config, "typeof config is right");
    gotConfig = true;
    config1 = config;
  });
  Scriptish.getConfig(function(config) {
    ok(config === config1, "Scriptish.getConfig returns the same config");
  });
  ok(gotConfig, "should have got config synchronously despite the asynchronously signature of Scriptish.getConfig");
  start();
});
