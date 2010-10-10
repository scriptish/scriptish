var EXPORTED_SYMBOLS = ["Scriptish_configDownloader"];
Components.utils.import("resource://scriptish/script/scriptdownloader.js");
Components.utils.import("resource://gre/modules/NetUtil.jsm");

var Scriptish_configDownloader = {
  startInstall: function(aURI, aWin) {
    new ScriptDownloader(aURI, aWin).startInstall();
  },
  startViewScript: function(aURI) {
    new ScriptDownloader(aURI).startViewScript();
  },
  startUpdateScript: function(aURL, aScriptInstaller)
    new ScriptDownloader(NetUtil.newURI(aURL)).startUpdateScript(aScriptInstaller),
  refetchDependencies: function(aScript) {
    var sd = new ScriptDownloader();
    sd.script = aScript;
    sd.updateScript = true;
    sd.fetchDependencies();
  }
}
