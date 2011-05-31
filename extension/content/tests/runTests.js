function runTests() {
  var tools = {};
  include("tests/testAvailability.js");
  include("tests/testCryptoHash.js");
  include("tests/testToolsMenuItem.js");
  include("tests/testTimeout.js");
}
