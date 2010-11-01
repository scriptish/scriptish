var EXPORTED_SYMBOLS = ["GM_API", "GM_apiSafeCallback"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/logging.js");
Cu.import("resource://scriptish/utils/Scriptish_getUriFromFile.js");
Cu.import("resource://scriptish/utils/Scriptish_notification.js");

const moduleFilename = Components.stack.filename;

// Examines the stack to determine if an API should be callable.
function GM_apiLeakCheck(apiName) {
  let stack = Components.stack;

  do {
    // Valid stack frames for GM api calls are: native and js when coming from
    // chrome:// URLs and any file name listed in _apiAcceptedFiles.
    if (2 == stack.language &&
        stack.filename != moduleFilename &&
        stack.filename != Services.scriptish.filename &&
        stack.filename.substr(0, 6) != "chrome") {
      Scriptish_logError(new Error(
          "Scriptish access violation: unsafeWindow cannot call " +
          apiName + "."));
      return false;
    }
  } while (stack = stack.caller);
  return true;
}

function GM_apiSafeCallback(aWin, aThis, aCb, aArgs) {
  // Pop back onto browser scope and call event handler.
  // Have to use nested function here instead of Scriptish_hitch because
  // otherwise aCallback.apply can point to window.setTimeout, which
  // can be abused to get increased privileges.
  new XPCNativeWrapper(aWin, "setTimeout()")
      .setTimeout(function() { aCb.apply(aThis, aArgs); }, 0);
}

function GM_API(aScript, aURL, aSafeWin, aUnsafeContentWin, aChromeWin) {
  var document = aSafeWin.document;
  var _xmlhttpRequester = null;
  var _storage = null;
  var _resources = null;
  var _logger = null;
  var workers = [];

  // terminate workers
  aSafeWin.addEventListener("unload", function() {
    for (var i = 0, worker; worker = workers[i++];) worker.terminate();
  }, true);

  function getXmlhttpRequester() {
    if (!_xmlhttpRequester) {
      var tools = {};
      Cu.import("resource://scriptish/api/GM_xmlhttpRequester.js", tools);
      _xmlhttpRequester = new tools.GM_xmlhttpRequester(
          aUnsafeContentWin, aChromeWin, aURL);
    }
    return _xmlhttpRequester;
  }
  function getStorage() {
    if (!_storage) {
      var tools = {};
      Cu.import("resource://scriptish/api/GM_ScriptStorage.js", tools);
      _storage = new tools.GM_ScriptStorage(aScript);
    }
    return _storage;
  }
  function getResources() {
    if (!_resources) {
      var tools = {};
      Cu.import("resource://scriptish/api/GM_Resources.js", tools);
      _resources = new tools.GM_Resources(aScript);
    }
    return _resources;
  }
  function getLogger() {
    if (!_logger) {
      var tools = {};
      Cu.import("resource://scriptish/api/GM_ScriptLogger.js", tools);
      _logger = new tools.GM_ScriptLogger(aScript);
    }
    return _logger;
  }

  this.GM_addStyle = function GM_addStyle(css) {
    var head = document.getElementsByTagName("head")[0];
    if (head) {
      var style = document.createElement("style");
      style.textContent = css;
      style.type = "text/css";
      head.appendChild(style);
    }
    return style;
  }

  this.GM_log = function GM_log() getLogger().log.apply(getLogger(), arguments)

  this.GM_notification =
      function GM_notification(aMsg, aTitle, aIcon, aCallback) {
    if (!GM_apiLeakCheck("GM_notification")) return;
    if (typeof aTitle != "string") aTitle = aScript.name;
    if (typeof aIcon != "string") aIcon = aScript.iconURL;
    var callback = null;
    if (typeof aCallback == "function")
      callback = function() GM_apiSafeCallback(aSafeWin, null, aCallback);
    Scriptish_notification(aMsg, aTitle, aIcon, callback);
  }

  this.GM_setValue = function GM_setValue() {
    if (!GM_apiLeakCheck("GM_setValue")) return;
    return getStorage().setValue.apply(getStorage(), arguments);
  }
  this.GM_getValue = function GM_getValue() {
    if (!GM_apiLeakCheck("GM_getValue")) return;
    return getStorage().getValue.apply(getStorage(), arguments);
  }
  this.GM_deleteValue = function GM_deleteValue() {
    if (!GM_apiLeakCheck("GM_deleteValue")) return;
    return getStorage().deleteValue.apply(getStorage(), arguments);
  }
  this.GM_listValues = function GM_listValues() {
    if (!GM_apiLeakCheck("GM_listValues")) return;
    return getStorage().listValues.apply(getStorage(), arguments);
  }

  this.GM_setClipboard = function GM_setClipboard() {
    if (!GM_apiLeakCheck("GM_setClipboard")) return;
    var tools = {};
    Cu.import("resource://scriptish/api/GM_setClipboard.js", tools);
    tools.GM_setClipboard.apply(null, arguments);
  }

  this.GM_getResourceURL = function GM_getResourceURL() {
    if (!GM_apiLeakCheck("GM_getResourceURL")) return;
    return getResources().getResourceURL.apply(getResources(), arguments)
  }
  this.GM_getResourceText = function GM_getResourceText() {
    if (!GM_apiLeakCheck("GM_getResourceText")) return;
    return getResources().getResourceText.apply(getResources(), arguments)
  }

  this.GM_openInTab = function GM_openInTab(aURL) {
    if (!GM_apiLeakCheck("GM_openInTab")) return;
    // http://mxr.mozilla.org/mozilla-central/source/browser/base/content/browser.js#4448
    return aChromeWin.gBrowser
        .getBrowserForTab(aChromeWin.openNewTabWith(aURL, document)).docShell
        .QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);
  }

  this.GM_xmlhttpRequest = function GM_xmlhttpRequest() {
    if (!GM_apiLeakCheck("GM_xmlhttpRequest")) return;
    let xhr = getXmlhttpRequester();
    return xhr.contentStartRequest.apply(xhr, arguments);
  }

  this.GM_registerMenuCommand = function GM_registerMenuCommand(
      aCmdName, aCmdFunc, aAccelKey, aAccelModifiers, aAccessKey) {
    if (!GM_apiLeakCheck("GM_registerMenuCommand")) return;

    aChromeWin.Scriptish_BrowserUI.registerMenuCommand({
      name: aCmdName,
      accelKey: aAccelKey,
      accelModifiers: aAccelModifiers,
      accessKey: aAccessKey,
      doCommand: aCmdFunc,
      window: aSafeWin});
  }

  this.GM_worker = function GM_worker(resourceName) {
    if (!GM_apiLeakCheck("GM_worker")) return;

    var tools = {};
    Cu.import("resource://scriptish/api/GM_worker.js", tools);
    var worker = new tools.GM_worker(getResources().getDep(resourceName), aURL);
    workers.push(worker)
    return worker;
  }

  this.GM_updatingEnabled = true;
}
