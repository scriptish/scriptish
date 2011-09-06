var EXPORTED_SYMBOLS = ["Scriptish_installUri"];
Components.utils.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);
lazyImport(this, "resource://scriptish/config/configdownloader.js", ["Scriptish_configDownloader"]);

function Scriptish_installUri(aURI) {
  aURI = (typeof aURI == "string") ? NetUtil.newURI(aURI) : aURI;

  // docs for nsicontentpolicy say we're not supposed to block, so short timer.
  timeout(function() {
    Scriptish_configDownloader.startInstall(aURI);
  });
}
