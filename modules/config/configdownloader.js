var EXPORTED_SYMBOLS = ["Config_downloader"];

const Cu = Components.utils;
Cu.import("resource://scriptish/script/scriptdownloader.js");

var Config_downloader = {
  startInstall: function(aURI, aWin) {
    new ScriptDownloader(aURI, aWin).startInstall();
  },
  startViewScript: function(aURI) {
    new ScriptDownloader(aURI).startViewScript();
  },
  refetchDependencies: function(aScript) {
    var sd = new ScriptDownloader();
    sd.script = aScript;
    sd.updateScript = true;
    sd.fetchDependencies();
  }
}
