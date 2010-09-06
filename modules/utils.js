
// JSM exported symbols
var EXPORTED_SYMBOLS = [
  "GM_getConfig",
  "GM_getUriFromFile"
];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

function GM_getConfig() {
  return gmService.config;
}

function GM_getUriFromFile(file) {
  return ioService.newFileURI(file);
}
