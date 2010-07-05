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
  var _document = aDocument;
  var _unsafeContentWin = aUnsafeContentWin;
  var _chromeWin = aChromeWin;
  var _gmBrowser = aGmBrowser;

  var _xmlhttpRequester = new GM_xmlhttpRequester(
      aUnsafeContentWin, aChromeWindow, aURL);
  var _storage = new GM_ScriptStorage(aScript);
  var _resources = new GM_Resources(aScript);
  var _logger = new GM_ScriptLogger(aScript);

  this.GM_addStyle = function GM_addStyle(css) {
    var head = _document.getElementsByTagName("head")[0];
    if (head) {
      var style = _document.createElement("style");
      style.textContent = css;
      style.type = "text/css";
      head.appendChild(style);
    }
    return style;
  };

  this.GM_log = function GM_log(){
    return _logger.log.apply(_logger, arguments)
  };


  this.GM_setValue = function GM_setValue() {
    if (!GM_apiLeakCheck()) return;
    return _storage.setValue.apply(_storage, arguments);
  };
  this.GM_getValue = function GM_getValue() {
    if (!GM_apiLeakCheck()) return undefined;
    return _storage.getValue.apply(_storage, arguments);
  };
  this.GM_deleteValue = function GM_deleteValue() {
    if (!GM_apiLeakCheck()) return undefined;
    return _storage.deleteValue.apply(_storage, arguments);
  };
  this.GM_listValues = function GM_listValues() {
    if (!GM_apiLeakCheck()) return undefined;
    return _storage.listValues.apply(_storage, arguments);
  };

  this.GM_getResourceURL = function GM_getResourceURL() {
    if (!GM_apiLeakCheck()) return undefined;
    return _resources.getResourceURL.apply(_resources, arguments)
  };
  this.GM_getResourceText = function GM_getResourceText() {
    if (!GM_apiLeakCheck()) return undefined;
    return _resources.getResourceText.apply(_resources, arguments)
  };

  this.GM_openInTab = function GM_openInTab(aURL) {
    if (!GM_apiLeakCheck()) return undefined;

    var newTab = _chromeWin.openNewTabWith(
        aURL, _document, null, null, null, null);
    // Source:
    // http://mxr.mozilla.org/mozilla-central/source/browser/base/content/browser.js#4448
    var newWindow = _chromeWin.gBrowser
        .getBrowserForTab(newTab)
        .docShell
        .QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIDOMWindow);
    return newWindow;
  };

  this.GM_xmlhttpRequest = function GM_xmlhttpRequest() {
    if (!GM_apiLeakCheck()) return;

    return _xmlhttpRequester.contentStartRequest.apply(
        _xmlhttpRequester, arguments);
  };

  this.GM_registerMenuCommand = function GM_registerMenuCommand(
      aCommandName,
      aCommandFunc,
      aAccelKey,
      aAccelModifiers,
      aAccessKey) {
    if (!GM_apiLeakCheck()) return;

    _gmBrowser.registerMenuCommand({
      name: aCommandName,
      accelKey: aAccelKey,
      accelModifiers: aAccelModifiers,
      accessKey: aAccessKey,
      doCommand: aCommandFunc,
      window: _unsafeContentWin});
  };

  this.GM_worker = function GM_worker(resourceName) {
    if (!GM_apiLeakCheck()) return undefined;

    // Worker was introduced in FF 3.5
    // https://developer.mozilla.org/En/DOM/Worker
    if (!aChromeWin.Worker) return undefined;

    var worker = new aChromeWin.Worker(_resources.getFileURL(resourceName));
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
  }
}
