var EXPORTED_SYMBOLS = ["Scriptish_isGreasemonkeyable"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/prefmanager.js");

const Scriptish_isGreasemonkeyable = function(aURL) {
  // if the url provide is not a valid url, then an error could be thrown
  try {
    var scheme = Services.io.extractScheme(aURL);
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
      if (/^about:blank/.test(aURL)) return true;
      // Conditionally allow the rest of "about:".
      return Scriptish_prefRoot.getValue('aboutIsGreaseable');
    case "file":
      return Scriptish_prefRoot.getValue('fileIsGreaseable');
    case "unmht":
      return Scriptish_prefRoot.getValue('unmhtIsGreaseable');
  }
  return false;
}
