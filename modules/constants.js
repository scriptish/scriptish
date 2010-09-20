
var EXPORTED_SYMBOLS = [
    "Cc",
    "Ci",
    "gmService",
    "ioService"];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyServiceGetter(
    this, "ioService", "@mozilla.org/network/io-service;1",
    "nsIIOService");

const gmService = Cc["@scriptish.erikvold.com/scriptish-service;1"]
    .getService().wrappedJSObject;
