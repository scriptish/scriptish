var EXPORTED_SYMBOLS = [ "Cc", "Ci", "XPCOMUtils", "Services", "Scriptish_Services"];

const Cc = Components.classes;
const Ci = Components.interfaces;
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

var Scriptish_Services = {
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

XPCOMUtils.defineLazyGetter(Scriptish_Services, "scriptish", function() {
  return Cc["@scriptish.erikvold.com/scriptish-service;1"]
      .getService().wrappedJSObject;
});

XPCOMUtils.defineLazyServiceGetter(
    Scriptish_Services, "as", "@mozilla.org/alerts-service;1",
    "nsIAlertsService");

XPCOMUtils.defineLazyServiceGetter(
  Scriptish_Services, "ass", "@mozilla.org/appshell/appShellService;1",
    "nsIAppShellService");

XPCOMUtils.defineLazyServiceGetter(
    Scriptish_Services, "cb", "@mozilla.org/widget/clipboardhelper;1",
    "nsIClipboardHelper");

XPCOMUtils.defineLazyServiceGetter(
    Scriptish_Services, "eps",
    "@mozilla.org/uriloader/external-protocol-service;1",
    "nsIExternalProtocolService");

XPCOMUtils.defineLazyServiceGetter(
    Scriptish_Services, "pbs", "@mozilla.org/privatebrowsing;1",
    "nsIPrivateBrowsingService");

XPCOMUtils.defineLazyServiceGetter(
    Scriptish_Services, "sis", "@mozilla.org/scriptableinputstream;1",
    "nsIScriptableInputStream");
