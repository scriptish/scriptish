var EXPORTED_SYMBOLS = ["GM_API", "GM_apiSafeCallback"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/logging.js");
Cu.import("resource://scriptish/utils/Scriptish_config.js");
Cu.import("resource://scriptish/utils/Scriptish_getUriFromFile.js");

const moduleFilename = Components.stack.filename;

// Examines the stack to determine if an API should be callable.
function GM_apiLeakCheck(apiName) {
  var stack = Components.stack;
  apiName = apiName;

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
};

function GM_apiSafeCallback(aWindow, aThis, aCallback, aArgs) {
  // Pop back onto browser scope and call event handler.
  // Have to use nested function here instead of Scriptish_hitch because
  // otherwise aCallback.apply can point to window.setTimeout, which
  // can be abused to get increased privileges.
  new XPCNativeWrapper(aWindow, "setTimeout()")
      .setTimeout(function() { aCallback.apply(aThis, aArgs); }, 0);
}

function GM_API(aScript, aURL, aDocument, aUnsafeContentWin, aChromeWindow, aChromeWin, aGmBrowser) {
  var _xmlhttpRequester = null;
  var _storage = null;
  var _resources = null;
  var _logger = null;

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
    var head = aDocument.getElementsByTagName("head")[0];
    if (head) {
      var style = aDocument.createElement("style");
      style.textContent = css;
      style.type = "text/css";
      head.appendChild(style);
    }
    return style;
  }

  this.GM_log = function GM_log(){
    return getLogger().log.apply(getLogger(), arguments)
  }

  this.GM_notification = function GM_notification(aMsg) {
    var tools = {};
    Cu.import("resource://scriptish/utils/Scriptish_notification.js", tools);
    tools.Scriptish_notification(aMsg, aScript.name, aScript.iconURL);
  }

  this.GM_setValue = function GM_setValue() {
    if (!GM_apiLeakCheck("GM_setValue")) return;
    return getStorage().setValue.apply(getStorage(), arguments);
  }
  this.GM_getValue = function GM_getValue() {
    if (!GM_apiLeakCheck("GM_getValue")) return undefined;
    return getStorage().getValue.apply(getStorage(), arguments);
  }
  this.GM_deleteValue = function GM_deleteValue() {
    if (!GM_apiLeakCheck("GM_deleteValue")) return undefined;
    return getStorage().deleteValue.apply(getStorage(), arguments);
  }
  this.GM_listValues = function GM_listValues() {
    if (!GM_apiLeakCheck("GM_listValues")) return undefined;
    return getStorage().listValues.apply(getStorage(), arguments);
  }

  this.GM_setClipboard = function GM_setClipboard() {
    if (!GM_apiLeakCheck("GM_setClipboard")) return undefined;
    var tools = {};
    Cu.import("resource://scriptish/api/GM_setClipboard.js", tools);
    tools.GM_setClipboard.apply(null, arguments);
  }

  this.GM_getResourceURL = function GM_getResourceURL() {
    if (!GM_apiLeakCheck("GM_getResourceURL")) return undefined;
    return getResources().getResourceURL.apply(getResources(), arguments)
  }
  this.GM_getResourceText = function GM_getResourceText() {
    if (!GM_apiLeakCheck("GM_getResourceText")) return undefined;
    return getResources().getResourceText.apply(getResources(), arguments)
  }

  this.GM_openInTab = function GM_openInTab(aURL) {
    if (!GM_apiLeakCheck("GM_openInTab")) return undefined;

    var newTab = aChromeWin.openNewTabWith(
        aURL, aDocument, null, null, null, null);
    // Source:
    // http://mxr.mozilla.org/mozilla-central/source/browser/base/content/browser.js#4448
    var newWindow = aChromeWin.gBrowser
        .getBrowserForTab(newTab)
        .docShell
        .QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIDOMWindow);
    return newWindow;
  };

  this.GM_xmlhttpRequest = function GM_xmlhttpRequest() {
    if (!GM_apiLeakCheck("GM_xmlhttpRequest")) return;

    return getXmlhttpRequester().contentStartRequest.apply(
        getXmlhttpRequester(), arguments);
  };

  this.GM_registerMenuCommand = function GM_registerMenuCommand(
      aCommandName,
      aCommandFunc,
      aAccelKey,
      aAccelModifiers,
      aAccessKey) {
    if (!GM_apiLeakCheck("GM_registerMenuCommand")) return;

    aGmBrowser.registerMenuCommand({
      name: aCommandName,
      accelKey: aAccelKey,
      accelModifiers: aAccelModifiers,
      accessKey: aAccessKey,
      doCommand: aCommandFunc,
      window: aUnsafeContentWin});
  };

  this.GM_worker = function GM_worker(resourceName) {
    if (!GM_apiLeakCheck("GM_worker")) return undefined;

    var tools = {};
    Cu.import("resource://scriptish/api/GM_worker.js", tools);

    return new tools.GM_worker(getResources().getDep(resourceName), aURL);
  };

  this.GM_updatingEnabled = true;
}
