var EXPORTED_SYMBOLS = ["Scriptish_getTLDURL"];
Components.utils.import("resource://scriptish/constants.js");

function Scriptish_getTLDURL(aURL) {
  let tldURL = aURL;
  try {
    let uri = NetUtil.newURI(aURL);
    let host = uri.host;
    let tld = Services.tld.getPublicSuffixFromHost(host);
    uri.host = uri.host.replace(new RegExp(tld + "$"), "tld");
    tldURL = uri.spec;
  } catch (e) {}

  return tldURL;
}
