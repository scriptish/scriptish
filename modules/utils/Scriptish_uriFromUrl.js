
// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_uriFromUrl"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

const Scriptish_uriFromUrl = function(aUrl, aBaseUrl) {
  var baseUri = null;
  if (aBaseUrl) baseUri = Scriptish_uriFromUrl(aBaseUrl);
  try {
    return ioService.newURI(aUrl, null, baseUri);
  } catch (e) {
    return null;
  }
}
