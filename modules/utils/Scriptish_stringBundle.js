
// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_stringBundle"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

const Scriptish_stringBundle = Cc["@mozilla.org/intl/stringbundle;1"]
    .getService(Ci.nsIStringBundleService)
    .createBundle("chrome://scriptish/locale/scriptish-browser.properties");
