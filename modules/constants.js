// JSM exported symbols
var EXPORTED_SYMBOLS = [
    "Cc",
    "Ci",
    "gmService",
    "ioService",
    "GM_os"];

const Cc = Components.classes;
const Ci = Components.interfaces;

const gmService = Cc["@scriptish.erikvold.com/scriptish-service;1"]
    .getService().wrappedJSObject;
const ioService = Cc["@mozilla.org/network/io-service;1"]
    .getService(Ci.nsIIOService);

var GM_os = function() { return getOS(); };
function getOS() {
  var os = Cc["@mozilla.org/xre/app-info;1"]
      .getService(Ci.nsIXULRuntime).OS;

  getOS = function() { return os; };

  return os;
}
