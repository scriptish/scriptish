var EXPORTED_SYMBOLS = ["Scriptish_config"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/config/config.js", ["Config"]);
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);

const Scriptish_config = new Config("scriptish_scripts");
Scriptish_config.load(function() {
  Scriptish_log("Scriptish config loaded"); // TODO: force & l10n
});
