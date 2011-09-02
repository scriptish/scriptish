var EXPORTED_SYMBOLS = [
    "Cc", "Ci", "Cr", "NetUtil", "XPCOMUtils", "extend",
    "Services", "Instances", "lazyImport", "lazyUtil", "timeout", "e10s"];

const {classes: Cc, interfaces: Ci, results: Cr} = Components;
const e10s = !!Cc["@mozilla.org/globalmessagemanager;1"];
const global = this;
var Services = {};
(function(inc, tools){
  inc("resource://gre/modules/XPCOMUtils.jsm");
  inc("resource://gre/modules/NetUtil.jsm");
  inc("resource://gre/modules/Services.jsm", tools);

  Services.__proto__ = tools.Services;
})(Components.utils.import, {})

var Instances = {
  get bis() Cc["@mozilla.org/binaryinputstream;1"]
      .createInstance(Ci.nsIBinaryInputStream),
  get ch() Cc["@mozilla.org/security/hash;1"]
      .createInstance(Ci.nsICryptoHash),
  get dp() Cc["@mozilla.org/xmlextras/domparser;1"]
      .createInstance(Ci.nsIDOMParser),
  get ds() Cc["@mozilla.org/xmlextras/xmlserializer;1"]
      .createInstance(Ci.nsIDOMSerializer),
  get fos() Cc["@mozilla.org/network/file-output-stream;1"]
      .createInstance(Ci.nsIFileOutputStream),
  get ftc() Cc["@mozilla.org/feed-textconstruct;1"]
      .createInstance(Ci.nsIFeedTextConstruct),
  get sfos() Cc["@mozilla.org/network/safe-file-output-stream;1"]
      .createInstance(Ci.nsIFileOutputStream)
      .QueryInterface(Ci.nsISafeOutputStream),
  get fp() Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker),
  get lf() Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile),
  get process() Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess),
  get se() Cc["@mozilla.org/scripterror;1"].createInstance(Ci.nsIScriptError)
      .QueryInterface(Ci.nsIScriptError2),
  get ss() Cc["@mozilla.org/supports-string;1"]
      .createInstance(Ci.nsISupportsString),
  get suc() Cc["@mozilla.org/intl/scriptableunicodeconverter"]
      .createInstance(Ci.nsIScriptableUnicodeConverter),
  get timer() Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer),
  get wbp() Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
      .createInstance(Ci.nsIWebBrowserPersist),
  get xfr() Cc["@mozilla.org/widget/transferable;1"]
      .createInstance(Ci.nsITransferable),
  get xhr() Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(Ci.nsIXMLHttpRequest)
};

XPCOMUtils.defineLazyServiceGetter(
     Services, "as", "@mozilla.org/alerts-service;1", "nsIAlertsService");

XPCOMUtils.defineLazyServiceGetter(
    Services, "ass", "@mozilla.org/appshell/appShellService;1",
    "nsIAppShellService");

XPCOMUtils.defineLazyServiceGetter(
    Services, "cb", "@mozilla.org/widget/clipboardhelper;1",
    "nsIClipboardHelper");

XPCOMUtils.defineLazyServiceGetter(
    Services, "cbs", "@mozilla.org/widget/clipboard;1", "nsIClipboard");

XPCOMUtils.defineLazyServiceGetter(
    Services, "cs", "@mozilla.org/consoleservice;1", "nsIConsoleService");

XPCOMUtils.defineLazyServiceGetter(
    Services, "eps", "@mozilla.org/uriloader/external-protocol-service;1",
    "nsIExternalProtocolService");

if (Cc["@mozilla.org/privatebrowsing;1"]) {
  XPCOMUtils.defineLazyServiceGetter(
      Services, "pbs", "@mozilla.org/privatebrowsing;1",
      "nsIPrivateBrowsingService");
} else {
  Services.pbs = {privateBrowsingEnabled: false};
}

if (e10s) {
  XPCOMUtils.defineLazyServiceGetter(
      Services, "mm", "@mozilla.org/globalmessagemanager;1",
      "nsIChromeFrameMessageManager");
}

XPCOMUtils.defineLazyServiceGetter(
    Services, "sis", "@mozilla.org/scriptableinputstream;1",
    "nsIScriptableInputStream");

XPCOMUtils.defineLazyServiceGetter(
    Services, "suhtml", "@mozilla.org/feed-unescapehtml;1",
    "nsIScriptableUnescapeHTML");

XPCOMUtils.defineLazyServiceGetter(
    Services, "tld", "@mozilla.org/network/effective-tld-service;1",
    "nsIEffectiveTLDService");

XPCOMUtils.defineLazyServiceGetter(
    Services, "uuid", "@mozilla.org/uuid-generator;1",
    "nsIUUIDGenerator");

const _lazyModules = {};
function lazyImport(obj, resource, symbols) {
  if (!(resource in _lazyModules)) {
    XPCOMUtils.defineLazyGetter(
      _lazyModules,
      resource,
      function() {
        let _m = {};
        try {
          Components.utils.import(resource, _m);
        }
        catch (ex) {
          Components.utils.reportError("Failed to import resource: " + resource);
          throw ex;
        }
        return _m;
      });
  }
  for (let i = symbols.length; ~--i;) {
    let s = symbols[i];
    XPCOMUtils.defineLazyGetter(obj, s, function() _lazyModules[resource][s]);
  }
}
function lazyUtil(obj, name) lazyImport(obj,
                                        "resource://scriptish/utils/Scriptish_" + name + ".js",
                                        ["Scriptish_" + name]
                                        );

lazyImport(this, "resource://scriptish/third-party/Timer.js", ["Timer"]);
function timeout(cb, delay) {
  var callback = function() cb.call(null);
  delay = delay || 0;
  if (0 >= delay) {
    Services.tm.currentThread.dispatch(callback, Ci.nsIThread.DISPATCH_NORMAL);
    return;
  }

  if (!global.setTimeout) {
    global.setTimeout = (new Timer()).setTimeout; // see bug #252
  }

  setTimeout(callback, delay);
}

function extend(a, o) {
  for (var k in a) {
    o[k] = a[k];
  }
  return o;
}
