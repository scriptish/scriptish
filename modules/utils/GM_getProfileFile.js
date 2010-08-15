
// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_getProfileFile"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

const GM_getProfileFile = function(aFilename) {
  var file = Cc["@mozilla.org/file/directory_service;1"]
      .getService(Ci.nsIProperties)
      .get("ProfD", Ci.nsILocalFile);

  file.append(aFilename);

  return file;
}
