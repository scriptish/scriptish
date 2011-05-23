function runTests() {
  const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
  var tools = {};

  /**
   * MODULE: Scriptish Service
   */
  module("Scriptish Service");
  Cu.import("resource://scriptish/constants.js", tools);

  test("Availability", function() {
    expect(2);
    equals(typeof(tools.Services.scriptish), "object", "Scriptish service is available");
    equals(typeof(tools.Services.scriptish.shouldLoad), "function", "shouldLoad is available");
  });

  // TODO: generate fake requests to test
  test("shouldLoad", function() {
    expect(0);
  });


  /**
   * MODULE: Scriptish Utilities
   */
  module("Scriptish Utilities");
  Cu.import("resource://scriptish/utils/Scriptish_alert.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_convert2RegExp.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_createUserScriptSource.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_cryptoHash.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_ExtendedStringBundle.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_findError.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_getBinaryContents.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_getBrowserForContentWindow.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_getContents.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_getEditor.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_getFirebugConsole.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_getProfileFile.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_getTempFile.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_getTLDURL.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_getUriFromFile.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_getURLsForContentWindow.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_getWindowIDs.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_getWriteStream.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_installUri.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_launchApplicationWithDoc.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_memoize.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_notification.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_openInEditor.js", tools);
  Cu.import("resource://scriptish/utils/Scriptish_stringBundle.js", tools);

  test("Availability", function() {
    expect(24);

    equals(typeof(tools.Scriptish_alert), "function", "has Scriptish_alert");
    equals(typeof(tools.Scriptish_convert2RegExp), "function", "has Scriptish_convert2RegExp");
    equals(typeof(tools.Scriptish_createUserScriptSource), "function", "has Scriptish_createUserScriptSource");
    equals(typeof(tools.Scriptish_cryptoHash), "function", "has Scriptish_cryptoHash");
    equals(typeof(tools.Scriptish_ExtendedStringBundle), "function", "has Scriptish_ExtendedStringBundle");
    equals(typeof(tools.Scriptish_findError), "function", "has Scriptish_findError");
    equals(typeof(tools.Scriptish_getBinaryContents), "function", "has Scriptish_getBinaryContents");
    equals(typeof(tools.Scriptish_getBrowserForContentWindow), "function", "has Scriptish_getBrowserForContentWindow");
    equals(typeof(tools.Scriptish_getContents), "function", "has Scriptish_getContents");
    equals(typeof(tools.Scriptish_getEditor), "function", "has Scriptish_getEditor");
    equals(typeof(tools.Scriptish_getFirebugConsole), "function", "has Scriptish_getFirebugConsole");
    equals(typeof(tools.Scriptish_getProfileFile), "function", "has Scriptish_getProfileFile");
    equals(typeof(tools.Scriptish_getTempFile), "function", "has Scriptish_getTempFile");
    equals(typeof(tools.Scriptish_getTLDURL), "function", "has Scriptish_getTLDURL");
    equals(typeof(tools.Scriptish_getUriFromFile), "function", "has Scriptish_getUriFromFile");
    equals(typeof(tools.Scriptish_getURLsForContentWindow), "function", "has Scriptish_getURLsForContentWindow");
    equals(typeof(tools.Scriptish_getWindowIDs), "function", "has Scriptish_getWindowIDs");
    equals(typeof(tools.Scriptish_getWriteStream), "function", "has Scriptish_getWriteStream");
    equals(typeof(tools.Scriptish_installUri), "function", "has Scriptish_installUri");
    equals(typeof(tools.Scriptish_launchApplicationWithDoc), "function", "has Scriptish_launchApplicationWithDoc");
    equals(typeof(tools.Scriptish_memoize), "function", "has Scriptish_memoize");
    equals(typeof(tools.Scriptish_notification), "function", "has Scriptish_notification");
    equals(typeof(tools.Scriptish_openInEditor), "function", "has Scriptish_openInEditor");
    equals(typeof(tools.Scriptish_stringBundle), "function", "has Scriptish_stringBundle");
  });

  test("Scriptish_cryptoHash", function() {
    expect(2);

    var str = "Hello World!";
    var str_DEF_SHA1 = tools.Scriptish_cryptoHash(str);
    var str_SHA1 = tools.Scriptish_cryptoHash(str, "SHA1");

    equal(str_DEF_SHA1, "2ef7bde608ce5404e97d5f042f95f89f1c232871", "Default hashing algorithm is SHA1");
    equal(str_SHA1, "2ef7bde608ce5404e97d5f042f95f89f1c232871", "Specifying an algorithm (SHA1) works");
  });


  /**
   * MODULE: Scriptish Utilities (third party)
   */
  module("Scriptish Utilities (third party)");
  Cu.import("resource://scriptish/third-party/MatchPattern.js", tools);
  Cu.import("resource://scriptish/third-party/Scriptish_openFolder.js", tools);
  Cu.import("resource://scriptish/third-party/Timer.js", tools);

  test("Availability", function() {
    expect(3);

    equals(typeof(tools.MatchPattern), "function", "has MatchPattern");
    equals(typeof(tools.MatchPattern), "function", "has Scriptish_openFolder");
    equals(typeof(tools.Timer), "function", "has Timer");
  });
}
