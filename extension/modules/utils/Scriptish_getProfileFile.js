"use strict";
var EXPORTED_SYMBOLS = ["Scriptish_getProfileFile"];
Components.utils.import("resource://scriptish/constants.js");

const Scriptish_getProfileFile = function(aFilename) {
  var file = Services.dirsvc.get("ProfD", Ci.nsIFile);
  file.append(aFilename);
  return file;
}
