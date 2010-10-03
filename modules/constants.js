var EXPORTED_SYMBOLS = [ "Cc", "Ci", "Scriptish_Services"];

const Cc = Components.classes;
const Ci = Components.interfaces;
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

var Scriptish_Services = {
  get dp() Cc["@mozilla.org/xmlextras/domparser;1"]
      .createInstance(Ci.nsIDOMParser),
  get se() Cc["@mozilla.org/scripterror;1"].createInstance(Ci.nsIScriptError)
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
