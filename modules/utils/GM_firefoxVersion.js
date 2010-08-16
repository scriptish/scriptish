
// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_firefoxVersion"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

const GM_firefoxVersion = (function() {
  var version = Cc["@mozilla.org/xre/app-info;1"]  
      .getService(Ci.nsIXULAppInfo).version;
  var versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Ci.nsIVersionComparator);

  // Detect fixed possible compatible Firefox versions.
  if (versionChecker.compare(version, '3.5') < 0) return '3.0';
  else if (versionChecker.compare(version, '3.6') < 0) return '3.5';
  else if (versionChecker.compare(version, '3.7') < 0) return '3.6';
  else return '4.0';
})();
