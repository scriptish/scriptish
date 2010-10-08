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
  get se() Cc["@mozilla.org/scripterror;1"].createInstance(Ci.nsIScriptError),
  get ss() Cc["@mozilla.org/supports-string;1"]
      .createInstance(Ci.nsISupportsString),
  get suc() Cc["@mozilla.org/intl/scriptableunicodeconverter"]
      .createInstance(Ci.nsIScriptableUnicodeConverter)
};

XPCOMUtils.defineLazyGetter(Scriptish_Services, "scriptish", function() {
  return Cc["@scriptish.erikvold.com/scriptish-service;1"]
      .getService().wrappedJSObject;
});

XPCOMUtils.defineLazyServiceGetter(
    Scriptish_Services, "pbs", "@mozilla.org/privatebrowsing;1",
    "nsIPrivateBrowsingService");

XPCOMUtils.defineLazyServiceGetter(
    Scriptish_Services, "cb", "@mozilla.org/widget/clipboardhelper;1",
    "nsIClipboardHelper");

XPCOMUtils.defineLazyServiceGetter(
    Scriptish_Services, "as", "@mozilla.org/alerts-service;1",
    "nsIAlertsService");

XPCOMUtils.defineLazyServiceGetter(
  Scriptish_Services, "ass", "@mozilla.org/appshell/appShellService;1",
    "nsIAppShellService");
