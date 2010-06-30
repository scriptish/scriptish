// JSM exported symbols
var EXPORTED_SYMBOLS = [
    "Cc",
    "Ci",
    "gmService",
    "ioService",
    "windowMediatorService"];

const Cc = Components.classes;
const Ci = Components.interfaces;

const gmService = Cc["@greasemonkey.mozdev.org/greasemonkey-service;1"]
    .getService().wrappedJSObject;
const ioService = Cc["@mozilla.org/network/io-service;1"]
    .getService(Ci.nsIIOService);
const windowMediatorService = Cc['@mozilla.org/appshell/window-mediator;1']
    .getService(Ci.nsIWindowMediator);
