
// Import QUnit
(function() {
  var fakeWindow = {
    window: fakeWindow,
    document: document,
    get location() {return {
      href: window.location.href,
      "search": window.location.href.split("?")[1],
      protocol: window.location.protocol
    }},
    navigator: window.navigator,
    set location(loc) window.location = loc,
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
    addEventListener: window.addEventListener.bind(window)
  };
  var fakeWindowKeys = [];
  for (var key in fakeWindow) fakeWindowKeys.push(key);

  // Load QUnit
  Services.scriptloader.loadSubScript(
      "chrome://scriptish/content/js/third-party/qunit/qunit.js", fakeWindow);

  var {QUnit} = fakeWindow;

  QUnit.config.urlbase = "about:scriptish";
  QUnit.config.autostart = false; // prevents QUnit from auto starting onload

  QUnit.url = function(params) {
    var querystring = "";
    for (var key in params) {
      if (!params[key]) continue;
      querystring += "&" + encodeURIComponent(key) + "=" +
          encodeURIComponent(params[key]);
    }
    return "about:scriptish?test" + querystring;
  }

  // export QUnit variables
  for (var key in fakeWindow) {
    if (~fakeWindowKeys.indexOf(key)) continue;
    window[key] = fakeWindow[key];
  }
})();

function importModule(m, ctx) {
  var _ = ctx || {};
  Cu.import(m, _);
  return _;
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
    function() include("tests/testScriptishGetTLDURL.js"),
    function() include("tests/testScriptishUpdateSecurely.js"),
    function() include("tests/testScriptishMemoize.js"),
    function() include("tests/testScriptishLogger.js"),
    function() include("tests/testTimeout.js"),
    function() include("tests/endTests.js")).then(function() {
      QUnit.start(); // once all tests have been loaded run them
    });
}
