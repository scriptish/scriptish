
QUnit.url = function(params) {
  var querystring = "";
  for (var key in params) {
    if (!params[key]) continue;
    querystring += "&" + encodeURIComponent(key) + "=" +
        encodeURIComponent(params[key]);
  }
  return "about:scriptish?test" + querystring;
}

function importModule(m, ctx) {
  var _ = ctx || {};
  Cu.import(m, _);
  return _;
}

function checkExports(m, exports) {
  deepEqual(
    Object.keys(importModule(m)),
    exports,
    "Correct exports"
    );
}

function runTests() {
  var tools = {};
  Q.chain(
    function() include("tests/testAvailability.js"),
    function() include("tests/testCachedResource.js"),
    function() include("tests/testCryptoHash.js"),
    function() include("tests/testToolsMenuItem.js"),
    function() include("tests/testIsGMable.js"),
    function() include("tests/testGetConfig.js"),
    function() include("tests/testScriptishConvert2RegExp.js"),
    function() include("tests/testScriptishCreateUserScriptSource.js"),
    function() include("tests/testScriptishEnabled.js"),
    function() include("tests/testScriptishUpdateSecurely.js"),
    function() include("tests/testScriptishMemoize.js"),
    function() include("tests/testScriptishLogger.js"),
    function() include("tests/testTimeout.js"),
    function() include("tests/endTests.js")).then(function() {
      QUnit.start(); // once all tests have been loaded run them
    });
}
