var EXPORTED_SYMBOLS = ["Scriptish_installUri"];

Components.utils.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);
lazyImport(this, "resource://scriptish/config/configdownloader.js", ["Scriptish_configDownloader"]);

let { isPrivate } = jetpack('sdk/private-browsing');

function Scriptish_installUri(aURI, aWin) {
  // docs for nsicontentpolicy say we're not supposed to block, so short timer.
  timeout(function() {
    aURI = (typeof aURI == "string") ? NetUtil.newURI(aURI) : aURI;
    Scriptish_configDownloader.startInstall(aURI, (aWin && isPrivate(aWin)));
  });
}
