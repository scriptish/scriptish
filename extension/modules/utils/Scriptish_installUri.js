var EXPORTED_SYMBOLS = ["Scriptish_installUri"];

Components.utils.import("resource://scriptish/third-party/Timer.js");
Components.utils.import("resource://scriptish/config/configdownloader.js");

var gTimer = new Timer();
function Scriptish_installUri(aURI, aWin) {
  // docs for nsicontentpolicy say we're not supposed to block, so short timer.
  gTimer.setTimeout(function() {
    Scriptish_configDownloader.startInstall(aURI, aWin);
  }, 0);
}
