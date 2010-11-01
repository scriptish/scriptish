var EXPORTED_SYMBOLS = [
    "Cc", "Ci", "AddonManager", "AddonManagerPrivate", "NetUtil", "XPCOMUtils",
    "Services", "Instances", "timeout"];

const {classes: Cc, interfaces: Ci} = Components;
const ONE_SHOT = Ci.nsITimer.TYPE_ONE_SHOT;
var Services = {};
(function(inc, tools){
  inc("resource://gre/modules/XPCOMUtils.jsm");
  inc("resource://gre/modules/NetUtil.jsm");
  inc("resource://gre/modules/AddonManager.jsm");
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
  get fp() Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker),
  get lf() Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile),
  get process() Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess),
  get se() Cc["@mozilla.org/scripterror;1"].createInstance(Ci.nsIScriptError),
  get ss() Cc["@mozilla.org/supports-string;1"]
      .createInstance(Ci.nsISupportsString),
  get suc() Cc["@mozilla.org/intl/scriptableunicodeconverter"]
      .createInstance(Ci.nsIScriptableUnicodeConverter),
  get timer() Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer),
  get wbp() Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
      .createInstance(Ci.nsIWebBrowserPersist),
  get xhr() Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(Ci.nsIXMLHttpRequest)
};

XPCOMUtils.defineLazyGetter(Services, "scriptish", function() (
    Cc["@scriptish.erikvold.com/scriptish-service;1"]
        .getService().wrappedJSObject));

XPCOMUtils.defineLazyServiceGetter(
     Services, "as", "@mozilla.org/alerts-service;1", "nsIAlertsService");

XPCOMUtils.defineLazyServiceGetter(
    Services, "ass", "@mozilla.org/appshell/appShellService;1",
    "nsIAppShellService");

XPCOMUtils.defineLazyServiceGetter(
    Services, "cb", "@mozilla.org/widget/clipboardhelper;1",
    "nsIClipboardHelper");

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

XPCOMUtils.defineLazyServiceGetter(
    Services, "sis", "@mozilla.org/scriptableinputstream;1",
    "nsIScriptableInputStream");

XPCOMUtils.defineLazyServiceGetter(
    Services, "suhtml", "@mozilla.org/feed-unescapehtml;1",
    "nsIScriptableUnescapeHTML");

function timeout(cb, delay) {
  Instances.timer.initWithCallback(
      { notify: function(){ cb.call(null) } }, delay, ONE_SHOT);
}
