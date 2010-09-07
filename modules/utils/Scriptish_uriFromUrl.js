
// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_uriFromUrl"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

const Scriptish_uriFromUrl = function(aUrl, aBaseUri) {
  var baseUri = null;
  if (aBaseUri) baseUri = Scriptish_uriFromUrl(aBaseUri);
  try {
    return ioService.newURI(aUrl, null, baseUri);
  } catch (e) {
    return null;
  }
}
