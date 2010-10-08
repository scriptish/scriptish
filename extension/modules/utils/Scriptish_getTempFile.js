
// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_getTempFile"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

const tempFilename = "scriptish-temp";

const Scriptish_getTempFile = function() {
  var file = Cc["@mozilla.org/file/directory_service;1"]
      .getService(Ci.nsIProperties)
      .get("TmpD", Ci.nsILocalFile);

  file.append(tempFilename);
  file.createUnique(
      Ci.nsILocalFile.NORMAL_FILE_TYPE, 0640 );

  return file;
}