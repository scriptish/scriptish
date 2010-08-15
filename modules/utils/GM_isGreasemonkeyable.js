
// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_isGreasemonkeyable"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/prefmanager.js");

const GM_isGreasemonkeyable = function(url) {
  // if the url provide is not a valid url, then an error could be thrown
  try {
    var scheme = ioService.extractScheme(url);
  } catch (e) {
    return false;
  }

  switch (scheme) {
    case "http":
    case "https":
    case "ftp":
    case "data":
      return true;
    case "about":
      // Always allow "about:blank".
      if (/^about:blank/.test(url)) return true;
      // Conditionally allow the rest of "about:".
      return GM_prefRoot.getValue('aboutIsGreaseable');
    case "file":
      return GM_prefRoot.getValue('fileIsGreaseable');
    case "unmht":
      return GM_prefRoot.getValue('unmhtIsGreaseable');
  }

  return false;
}
