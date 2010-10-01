var EXPORTED_SYMBOLS = [ "Cc", "Ci", "gmService", "pbs"];

const Cc = Components.classes;
const Ci = Components.interfaces;
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const gmService = Cc["@scriptish.erikvold.com/scriptish-service;1"]
    .getService().wrappedJSObject;

XPCOMUtils.defineLazyServiceGetter(
    this, "pbs", "@mozilla.org/privatebrowsing;1",
    "nsIPrivateBrowsingService");
