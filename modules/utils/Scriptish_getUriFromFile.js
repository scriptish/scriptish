
// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_getUriFromFile"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

const Scriptish_getUriFromFile = function (aFile) {
  return ioService.newFileURI(aFile);
}
