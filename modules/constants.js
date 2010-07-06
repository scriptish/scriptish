// JSM exported symbols
var EXPORTED_SYMBOLS = [
    "Cc",
    "Ci",
    "gmService",
    "ioService"];

const Cc = Components.classes;
const Ci = Components.interfaces;

const gmService = Cc["@scriptish.erikvold.com/scriptish-service;1"]
    .getService().wrappedJSObject;
const ioService = Cc["@mozilla.org/network/io-service;1"]
    .getService(Ci.nsIIOService);
