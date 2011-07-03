var EXPORTED_SYMBOLS = ["GM_API", "GM_apiSafeCallback"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/logging.js");
Cu.import("resource://scriptish/utils/Scriptish_notification.js");
Cu.import("resource://scriptish/utils/Scriptish_stringBundle.js");
Cu.import("resource://scriptish/utils/Scriptish_openInTab.js");

const moduleFilename = Components.stack.filename;
const NS_XHTML = "http://www.w3.org/1999/xhtml";
const DOLITTLE = function(){};

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
          Scriptish_stringBundle("error.api.unsafeAccess") + ": " + apiName));
      return false;
    }
  } while (stack = stack.caller);
  return true;
}

function GM_apiSafeCallback(aWin, aThis, aCb, aArgs) {
  // Pop back onto browser scope and call event handler.
  // Have to use nested function here otherwise aCallback.apply can point to
  // window.setTimeout, which can be abused to get increased privileges.
  new XPCNativeWrapper(aWin, "setTimeout()")
      .setTimeout(function() aCb.apply(aThis, aArgs), 0);
}

function GM_API(aScript, aURL, aWinID, aSafeWin, aUnsafeContentWin, aChromeWin) {
  var document = aSafeWin.document;
  var _xmlhttpRequester = null;
  var _storage = null;
  var _resources = null;
  var _logger = null;
  var menuCmdIDs = [];
  var Scriptish_BrowserUI = aChromeWin.Scriptish_BrowserUI;
  var windowID = aWinID;

  function getXmlhttpRequester() {
    if (!_xmlhttpRequester) {
      var tools = {};
      Cu.import("resource://scriptish/api/GM_xmlhttpRequester.js", tools);
      _xmlhttpRequester = new tools.GM_xmlhttpRequester(
          aUnsafeContentWin, aURL, aScript);
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

  this.GM_safeHTMLParser = function GM_safeHTMLParser(aHTMLStr) {
    if (!GM_apiLeakCheck("GM_safeHTMLParser")) return;
    let doc = document.implementation.createDocument(NS_XHTML, "html", null);
    let body = document.createElementNS(NS_XHTML, "body");
    doc.documentElement.appendChild(body);
    body.appendChild(Services.suhtml.parseFragment(aHTMLStr, false, null, body));
    return doc;
  }

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

  this.GM_getResourceURL = function GM_getResourceURL() {
    if (!GM_apiLeakCheck("GM_getResourceURL")) return;
    return getResources().getResourceURL.apply(getResources(), arguments)
  }
  this.GM_getResourceText = function GM_getResourceText() {
    if (!GM_apiLeakCheck("GM_getResourceText")) return;
    return getResources().getResourceText.apply(getResources(), arguments)
  }

  this.GM_getMetadata = function(aKey, aLocalVal) {
    let key = aKey.toLowerCase().trim();
    if (aLocalVal) {
      switch (key) {
      case "id":
      case "name":
      case "namespace":
      case "creator":
      case "author":
      case "description":
      case "version":
      case "jsversion":
      case "delay":
      case "noframes":
        return aScript[key];
      case "homepage":
      case "homepageurl":
        return aScript.homepageURL;
      case "updateurl":
        return aScript.updateURL;
      case "contributor":
      case "include":
      case "exclude":
      case "screenshot":
        return aScript[key + "s"];
      case "match":
        return aScript[key + "es"];
      }
    }

    return aScript.getScriptHeader(key);
  }

  this.GM_openInTab = function GM_openInTab(aURL, aLoadInBackground, aReuse) {
    if (!GM_apiLeakCheck("GM_openInTab")) return;
    return Scriptish_openInTab(aURL, aLoadInBackground, aReuse, aChromeWin);
  }

  this.GM_xmlhttpRequest = function GM_xmlhttpRequest() {
    if (!GM_apiLeakCheck("GM_xmlhttpRequest")) return;
    let xhr = getXmlhttpRequester();
    return xhr.contentStartRequest.apply(xhr, arguments);
  }

  if (aSafeWin !== aSafeWin.top) {
    this.GM_unregisterMenuCommand = this.GM_registerMenuCommand
        = this.GM_disableMenuCommand = this.GM_enableMenuCommand = DOLITTLE;
  } else {
    this.GM_registerMenuCommand = function GM_registerMenuCommand(
        aCmdName, aCmdFunc, aAccelKey, aAccelModifiers, aAccessKey) {
      if (!GM_apiLeakCheck("GM_registerMenuCommand")) return;
      var uuid = Scriptish_BrowserUI.registerMenuCommand({
        name: aCmdName,
        accelKey: aAccelKey,
        accelModifiers: aAccelModifiers,
        accessKey: aAccessKey,
        doCommand: aCmdFunc,
        winID: windowID});
      menuCmdIDs.push(uuid);
      return uuid;
    }

    this.GM_unregisterMenuCommand = function GM_unregisterMenuCommand(aUUID) {
      var i = menuCmdIDs.indexOf(aUUID);
      if (!~i) return false; // check the uuid is for a cmd made by the same script
      menuCmdIDs.splice(i, 1);
      return Scriptish_BrowserUI.unregisterMenuCommand(aUUID, windowID);
    }

    this.GM_enableMenuCommand = function GM_enableMenuCommand(aUUID) {
      var i = menuCmdIDs.indexOf(aUUID);
      if (!~i) return false; // check the uuid is for a cmd made by the same script
      return Scriptish_BrowserUI.enableMenuCommand(aUUID, windowID);
    }

    this.GM_disableMenuCommand = function GM_disableMenuCommand(aUUID) {
      var i = menuCmdIDs.indexOf(aUUID);
      if (!~i) return false; // check the uuid is for a cmd made by the same script
      return Scriptish_BrowserUI.disableMenuCommand(aUUID, windowID);
    }
  }

  this.GM_cryptoHash = function GM_cryptoHash() {
    if (!GM_apiLeakCheck("GM_cryptoHash")) return;
    var tools = {};
    Cu.import("resource://scriptish/utils/Scriptish_cryptoHash.js", tools);
    return tools.Scriptish_cryptoHash.apply(null, arguments);
  }
}

GM_API.prototype.GM_generateUUID = function GM_generateUUID() (
    Services.uuid.generateUUID().toString());

GM_API.prototype.GM_updatingEnabled = true;

GM_API.prototype.GM_setClipboard = function GM_setClipboard() {
  if (!GM_apiLeakCheck("GM_setClipboard")) return;
  var tools = {};
  Cu.import("resource://scriptish/api/GM_setClipboard.js", tools);
  tools.GM_setClipboard.apply(null, arguments);
}
