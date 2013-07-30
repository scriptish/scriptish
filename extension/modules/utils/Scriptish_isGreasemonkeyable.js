var EXPORTED_SYMBOLS = ["Scriptish_isGreasemonkeyable"];

Components.utils.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);

function Scriptish_isGreasemonkeyable(aURL) {
  if (!aURL)
    return false;

  // if the url provide is not a valid url, then an error could be thrown
  try {
    var scheme = Services.io.extractScheme(aURL);
    if (!scheme) {
      return false;
    }
  }
  catch (e) {
    return false;
  }

  switch (scheme) {
    case "http":
    case "https":
      return Scriptish_prefRoot.getBoolValue("enabledSchemes.http", true);

    case "ftp":
    case "data":
      return Scriptish_prefRoot.getBoolValue("enabledSchemes." + scheme, true);

    case "about":
      // Always allow "about:blank".
      if (/^about:blank(?:[#?].*)?$/.test(aURL))
        return true;
      // no break
    default:
      return Scriptish_prefRoot.getBoolValue("enabledSchemes." + scheme, false);
  }
};
