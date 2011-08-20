var EXPORTED_SYMBOLS = ["Scriptish_getTLDURL"];
Components.utils.import("resource://scriptish/constants.js");
lazyUtil(this, "memoize");

const Scriptish_getTLDURL = Scriptish_memoize(function(aURL) {
  try {
    let uri = NetUtil.newURI(aURL);
    uri.host = uri.host.slice(0, -Services.tld.getPublicSuffix(uri).length) + "tld";
    return uri.spec;
  } catch (e) {}

  return aURL;
}, 200);
