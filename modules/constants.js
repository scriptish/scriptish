// JSM exported symbols
var EXPORTED_SYMBOLS = [
    "Cc",
    "Ci",
    "gmService",
    "ioService",
    "GM_os",
    "GM_firefoxVersion"];

const Cc = Components.classes;
const Ci = Components.interfaces;

const gmService = Cc["@scriptish.erikvold.com/scriptish-service;1"]
    .getService().wrappedJSObject;
const ioService = Cc["@mozilla.org/network/io-service;1"]
    .getService(Ci.nsIIOService);

const GM_os = Cc["@mozilla.org/xre/app-info;1"]
    .getService(Ci.nsIXULRuntime).OS;
const GM_firefoxVersion = (function() {
var version = Cc["@mozilla.org/xre/app-info;1"]  
    .getService(Ci.nsIXULAppInfo).version;
var versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"]
    .getService(Ci.nsIVersionComparator);

// Detect fixed possible compatible Firefox versions.
if (versionChecker.compare(version, '3.5') < 0) return '3.0';
else if (versionChecker.compare(version, '3.6') < 0) return '3.5';
else return '3.6';
})();
