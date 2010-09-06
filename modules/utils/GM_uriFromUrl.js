
// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_uriFromUrl"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

const GM_uriFromUrl = function(aUrl, aBaseUrl) {
  var baseUri = null;
  if (aBaseUrl) baseUri = GM_uriFromUrl(aBaseUrl);
  try {
    return ioService.newURI(aUrl, null, baseUri);
  } catch (e) {
    return null;
  }
}
