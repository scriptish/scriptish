// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_API"];

const Cu = Components.utils;
Cu.import("resource://greasemonkey/constants.js");
Cu.import("resource://greasemonkey/utils.js");
Cu.import("resource://greasemonkey/miscapis.js");
Cu.import("resource://greasemonkey/xmlhttprequester.js");

const moduleFilename = Components.stack.filename;

// Examines the stack to determine if an API should be callable.
function GM_apiLeakCheck(apiName) {
  var stack = Components.stack;
  apiName = apiName || arguments.callee.caller.name;

  do {
    // Valid stack frames for GM api calls are: native and js when coming from
    // chrome:// URLs and any file name listed in _apiAcceptedFiles.
    if (2 == stack.language &&
        stack.filename != moduleFilename &&
        stack.filename != gmService.filename &&
        stack.filename.substr(0, 6) != "chrome") {
      GM_logError(new Error(
          "Greasemonkey access violation: unsafeWindow cannot call " +
          apiName + "."));
      return false;
    }
  } while (stack = stack.caller);

  return true;
};

function GM_API(aScript, aURL, aDocument, aUnsafeContentWin, aChromeWindow, aChromeWin, aGmBrowser) {
  var _xmlhttpRequester = null;
  var _storage = null;
  var _resources = null;
  var _logger = null;

  function getXmlhttpRequester() {
    return _xmlhttpRequester || (_xmlhttpRequester = new GM_xmlhttpRequester(
      aUnsafeContentWin, aChromeWin, aURL));
  }
  function getStorage() {
    return _storage ||( _storage = new GM_ScriptStorage(aScript));
  }
  function getResources() {
   return _resources || (_resources = new GM_Resources(aScript));
  }
  function getLogger() {
    return _logger || (_logger = new GM_ScriptLogger(aScript));
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
  };

  this.GM_log = function GM_log(){
    return getLogger().log.apply(getLogger(), arguments)
  };


  this.GM_setValue = function GM_setValue() {
    if (!GM_apiLeakCheck()) return;
    return getStorage().setValue.apply(getStorage(), arguments);
  };
  this.GM_getValue = function GM_getValue() {
    if (!GM_apiLeakCheck()) return undefined;
    return getStorage().getValue.apply(getStorage(), arguments);
  };
  this.GM_deleteValue = function GM_deleteValue() {
    if (!GM_apiLeakCheck()) return undefined;
    return getStorage().deleteValue.apply(getStorage(), arguments);
  };
  this.GM_listValues = function GM_listValues() {
    if (!GM_apiLeakCheck()) return undefined;
    return getStorage().listValues.apply(getStorage(), arguments);
  };

  this.GM_getResourceURL = function GM_getResourceURL() {
    if (!GM_apiLeakCheck()) return undefined;
    return getResources().getResourceURL.apply(getResources(), arguments)
  };
  this.GM_getResourceText = function GM_getResourceText() {
    if (!GM_apiLeakCheck()) return undefined;
    return getResources().getResourceText.apply(getResources(), arguments)
  };

  this.GM_openInTab = function GM_openInTab(aURL) {
    if (!GM_apiLeakCheck()) return undefined;

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
    if (!GM_apiLeakCheck()) return;

    return getXmlhttpRequester().contentStartRequest.apply(
        getXmlhttpRequester(), arguments);
  };

  this.GM_registerMenuCommand = function GM_registerMenuCommand(
      aCommandName,
      aCommandFunc,
      aAccelKey,
      aAccelModifiers,
      aAccessKey) {
    if (!GM_apiLeakCheck()) return;

    aGmBrowser.registerMenuCommand({
      name: aCommandName,
      accelKey: aAccelKey,
      accelModifiers: aAccelModifiers,
      accessKey: aAccessKey,
      doCommand: aCommandFunc,
      window: aUnsafeContentWin});
  };

  this.GM_worker = function GM_worker(resourceName) {
    if (!GM_apiLeakCheck()) return undefined;

    // Worker was introduced in FF 3.5
    // https://developer.mozilla.org/En/DOM/Worker
    if (!aChromeWin.Worker) return undefined;

    var worker = new aChromeWin.Worker(getResources().getFileURL(resourceName));
    var fakeWorker = {
      onmessage: function() {},
      onerror: function() {},
      terminate: function() {
        worker.terminate();
      },
      postMessage: function(msg) {
        worker.postMessage(msg);
      }
    };

    function doLater(func) {
      // Pop back onto browser thread and call event handler.
      new XPCNativeWrapper(aUnsafeContentWin, "setTimeout()")
        .setTimeout(func, 0);
    }

    worker.onmessage = function(evt) {
      doLater(function() {
        fakeWorker.onmessage({
          data: evt.data+''
        });
      });
    };
    worker.onerror = function(evt) {
      doLater(function() {
        fakeWorker.onerror({
          message: evt.message+'',
          filename: evt.filename+'',
          lineno: evt.lineno,
          preventDefault: function() {
            evt.preventDefault();
          }
        });
      });
    };

    return fakeWorker;
  };
}
