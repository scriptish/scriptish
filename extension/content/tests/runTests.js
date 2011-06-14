function runTests() {
  var tools = {};
  Q.chain(
    function() include("tests/testAvailability.js"),
    function() include("tests/testCryptoHash.js"),
    function() include("tests/testToolsMenuItem.js"),
    function() include("tests/testIsGMable.js"),
    function() include("tests/testGetConfig.js"),
    function() include("tests/testScriptishEnabled.js"),
    function() include("tests/testScriptishUpdateSecurely.js"),
    function() include("tests/testScriptishConvert2RegExp.js"),
    function() include("tests/testScriptishLogger.js"),
    function() include("tests/testTimeout.js"),
    function() include("tests/endTests.js")).then(function() {
      QUnit.start(); // once all tests have been loaded run them
    });
}
